import { describe, expect, it } from "vitest"
import { extractVariables, interpolate } from "./email/variables"
import { composeEmail } from "./email/compose"
import { signUnsubscribe, verifyUnsubscribe } from "./email/unsubscribe"
import { suggestEmail } from "./audience/typos"
import { analyzeImport, guessMapping, parseCsv } from "./audience/csv"
import { marketingEligible, transactionalEligible, classifyProviderEvent, suppressionReasonFor } from "./audience/eligibility"
import { hashApiKey, generateApiKey } from "./api/keys"
import { hashRequestBody, redactForLog } from "./api/idempotency"
import { apiSnippets } from "./api/snippets"
import { canTrustWithoutDns, displayHost, evaluateDns, recommendedRecords } from "./dns/records"
import { listUnsubscribeHeaders } from "./email/footer"
import { isLocalPart, parseAddress } from "./email/address"

describe("variables", () => {
  it("uses the fallback when the value is missing", () => {
    expect(interpolate('Hello {{first_name | "there"}}', {})).toBe("Hello there")
  })

  it("prefers a real value and escapes html", () => {
    expect(interpolate("{{first_name}}", { first_name: "<Ann>" }, { escapeHtml: true })).toBe("&lt;Ann&gt;")
  })

  it("keeps ampersands in subjects", () => {
    expect(interpolate("{{company}}", { company: "Anna & Bo" })).toBe("Anna & Bo")
  })

  it("turns address newlines into breaks only when escaping", () => {
    expect(interpolate("{{company_address}}", { company_address: "A\nB" }, { escapeHtml: true })).toBe("A<br>B")
  })

  it("lists each variable once", () => {
    const found = extractVariables('{{first_name | "there"}} {{first_name}} {{company}}')
    expect(found.map((item) => item.key)).toEqual(["first_name", "company"])
    expect(found[0]?.fallback).toBe("there")
  })
})

describe("compose", () => {
  it("inlines css and adds one-click headers for marketing", () => {
    const result = composeEmail({
      html: `<html><head><style>.h{color:#111}</style></head><body><p class="h">Hi {{first_name | "there"}}</p></body></html>`,
      subject: 'Hello {{first_name | "there"}}',
      preheader: "A note",
      category: "marketing",
      unsubscribeUrl: "https://example.com/u/token",
      oneClickUrl: "https://example.com/api/unsubscribe?token=token",
      companyAddress: "1 Street\nStockholm",
      senderName: "Linden",
    })
    expect(result.subject).toBe("Hello there")
    expect(result.html).toContain("color: #111")
    expect(result.html).not.toContain("<style>")
    expect(result.html).toContain("https://example.com/u/token")
    expect(result.html).toContain("1 Street<br>Stockholm")
    expect(result.headers).toEqual(listUnsubscribeHeaders("https://example.com/api/unsubscribe?token=token"))
    expect(result.text).toContain("Hi there")
  })

  it("does not add unsubscribe headers to transactional mail", () => {
    const result = composeEmail({
      html: "<html><body><p>Receipt {{amount | \"10 SEK\"}}</p></body></html>",
      subject: "Receipt",
      category: "transactional",
    })
    expect(result.headers).toEqual({})
    expect(result.html).not.toContain("Unsubscribe")
    expect(result.html).toContain("10 SEK")
  })
})

describe("unsubscribe tokens", () => {
  it("round-trips a contact and campaign", () => {
    process.env.AUTH_SECRET = "test-secret"
    const token = signUnsubscribe("ctc_1", "cmp_1")
    expect(verifyUnsubscribe(token)).toEqual({ contactId: "ctc_1", campaignId: "cmp_1" })
    expect(verifyUnsubscribe(`${token}x`)).toBeNull()
  })
})

describe("audience import", () => {
  it("warns about gmial.com, dedupes, and flags suppression", () => {
    const csv = "email,first\nanna@gmial.com,Anna\nanna@gmail.com,Ann\nbad\nnope@example.com,N"
    const parsed = parseCsv(csv)
    expect(guessMapping(parsed.headers)[0]).toBe("email")
    const plan = analyzeImport({
      headers: parsed.headers,
      rows: parsed.rows,
      mapping: guessMapping(parsed.headers),
      existing: new Set(["nope@example.com"]),
      suppressed: new Set(["anna@gmail.com"]),
      applyTypos: true,
    })
    expect(plan.invalid).toContain("bad")
    expect(plan.ready.map((row) => row.email)).toEqual(["anna@gmail.com", "nope@example.com"])
    expect(plan.ready[0]?.suppressed).toBe(true)
    expect(plan.ready[1]?.alreadySaved).toBe(true)
    expect(suggestEmail("a@gmial.com")).toBe("a@gmail.com")
  })
})

describe("eligibility and provider events", () => {
  it("keeps marketing and transactional rules apart", () => {
    expect(marketingEligible({ status: "subscribed", consentStatus: "granted" }, false)).toBe(true)
    expect(marketingEligible({ status: "subscribed", consentStatus: "unknown" }, false)).toBe(false)
    expect(marketingEligible({ status: "unsubscribed", consentStatus: "granted" }, false)).toBe(false)
    expect(marketingEligible({ status: "subscribed", consentStatus: "granted" }, true)).toBe(false)
    expect(transactionalEligible(false)).toBe(true)
    expect(transactionalEligible(true)).toBe(false)
  })

  it("suppresses hard bounces and complaints, not soft bounces", () => {
    expect(classifyProviderEvent("email.bounced", "hard")).toBe("bounced")
    expect(classifyProviderEvent("email.bounced", "soft")).toBe("other")
    expect(classifyProviderEvent("email.complained")).toBe("complained")
    expect(classifyProviderEvent("email.delivered")).toBe("delivered")
    expect(suppressionReasonFor("bounced")).toBe("hard_bounce")
    expect(suppressionReasonFor("complained")).toBe("complaint")
    expect(suppressionReasonFor("delivered")).toBeNull()
  })
})

describe("api keys and snippets", () => {
  it("hashes keys and redacts them in logs", () => {
    const key = generateApiKey()
    expect(key.raw.startsWith("sk_live_")).toBe(true)
    expect(hashApiKey(key.raw)).toBe(key.hash)
    expect(key.prefix).toBe(key.raw.slice(0, 16))
    expect(redactForLog(`Bearer ${key.raw}`)).not.toContain(key.raw.slice(8))
    expect(hashRequestBody("a")).toHaveLength(64)
  })

  it("fills snippets with the real key, template, and idempotency header", () => {
    const snippets = apiSnippets({
      origin: "http://127.0.0.1:4317",
      apiKey: "sk_live_demo_skicko_local_dev_key",
      templateId: "tpl_welcome",
      from: "Linden <hello@mail.linden.test>",
    })
    for (const value of Object.values(snippets)) {
      expect(value).toContain("sk_live_demo_skicko_local_dev_key")
      expect(value).toContain("tpl_welcome")
      expect(value).toContain("Idempotency-Key")
      expect(value).toContain("/api/v1/send")
    }
  })
})

describe("dns", () => {
  it("trusts .test domains only for the console transport", () => {
    expect(canTrustWithoutDns("mail.linden.test", "console")).toBe(true)
    expect(canTrustWithoutDns("mail.linden.test", "resend")).toBe(false)
    expect(displayHost("resend._domainkey", "linden.test")).toBe("resend._domainkey.linden.test")
  })

  it("fails closed when a placeholder DKIM key is still present", async () => {
    const records = recommendedRecords("linden.test")
    const result = await evaluateDns(records, "linden.test", {
      txt: async () => [],
      cname: async () => [],
      mx: async () => [],
    })
    expect(result.ok).toBe(false)
    expect(result.detail).toContain("DKIM")
  })
})

describe("addresses", () => {
  it("parses a named from address", () => {
    expect(parseAddress('Linden Studio <hello@mail.linden.test>')).toEqual({
      name: "Linden Studio",
      email: "hello@mail.linden.test",
    })
    expect(isLocalPart("hello")).toBe(true)
    expect(isLocalPart("not a name")).toBe(false)
  })
})
