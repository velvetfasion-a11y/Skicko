import { resendApiKey } from "../email/transport"
import { recommendedRecords, type DnsRecord } from "./records"

type ResendRecord = {
  record?: string
  name?: string
  type?: string
  value?: string
  priority?: number
}

function keyFor(record: string): DnsRecord["key"] {
  const name = record.toLowerCase()
  if (name.includes("dkim")) return "dkim"
  if (name.includes("dmarc")) return "dmarc"
  if (name.includes("spf")) return "spf"
  if (name.includes("mx")) return "mx"
  return "other"
}

export function mapResendRecords(records: ResendRecord[]): DnsRecord[] {
  return records
    .filter((record) => record.value && record.type)
    .map((record) => ({
      key: keyFor(`${record.record || ""} ${record.name || ""}`),
      type: String(record.type).toUpperCase(),
      host: record.name || "",
      value: record.value || "",
      priority: record.priority,
    }))
}

async function resend(path: string, init?: RequestInit) {
  const key = resendApiKey()
  if (!key) return null
  const response = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })
  const data = (await response.json().catch(() => ({}))) as {
    id?: string
    name?: string
    status?: string
    records?: ResendRecord[]
    message?: string
  }
  if (!response.ok) throw new Error(data.message || `Resend error ${response.status}`)
  return data
}

export async function provisionDomain(domain: string, provider: "resend" | "ses") {
  if (provider === "resend" && resendApiKey()) {
    const created = await resend("/domains", { method: "POST", body: JSON.stringify({ name: domain }) })
    if (created) {
      const records = mapResendRecords(created.records || [])
      const withDmarc = records.some((record) => record.key === "dmarc")
        ? records
        : [...records, ...recommendedRecords(domain, "resend").filter((record) => record.key === "dmarc")]
      return { providerDomainId: created.id || "", records: withDmarc, detail: "Records fetched from Resend." }
    }
  }
  return {
    providerDomainId: "",
    records: recommendedRecords(domain, provider),
    detail:
      provider === "ses"
        ? "Replace the DKIM selectors with the three CNAMEs from Amazon SES."
        : "Connect RESEND_API_KEY to fetch the live DKIM key. Until then, SPF and DMARC can be published as shown.",
  }
}

export async function refreshResendDomain(providerDomainId: string) {
  if (!providerDomainId || !resendApiKey()) return null
  await resend(`/domains/${providerDomainId}/verify`, { method: "POST" }).catch(() => undefined)
  return resend(`/domains/${providerDomainId}`)
}
