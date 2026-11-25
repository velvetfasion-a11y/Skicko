export type DnsKey = "spf" | "dkim" | "dmarc" | "mx" | "other"

export type DnsRecord = {
  key: DnsKey
  type: string
  host: string
  value: string
  priority?: number
}

export function displayHost(host: string, domain: string) {
  const clean = host.trim().replace(/\.$/, "")
  const root = domain.trim().toLowerCase().replace(/\.$/, "")
  if (!clean || clean === "@") return root
  if (clean === root || clean.endsWith(`.${root}`)) return clean
  return `${clean}.${root}`
}

export function recommendedRecords(domain: string, provider: "resend" | "ses" = "resend"): DnsRecord[] {
  const root = domain.trim().toLowerCase()
  const dmarc: DnsRecord = {
    key: "dmarc",
    type: "TXT",
    host: `_dmarc.${root}`,
    value: `v=DMARC1; p=none; rua=mailto:dmarc@${root}; adkim=s; aspf=s`,
  }
  if (provider === "ses") {
    return [
      { key: "spf", type: "TXT", host: root, value: "v=spf1 include:amazonses.com ~all" },
      { key: "dkim", type: "CNAME", host: `selector1._domainkey.${root}`, value: "selector1.dkim.amazonses.com" },
      { key: "dkim", type: "CNAME", host: `selector2._domainkey.${root}`, value: "selector2.dkim.amazonses.com" },
      { key: "dkim", type: "CNAME", host: `selector3._domainkey.${root}`, value: "selector3.dkim.amazonses.com" },
      dmarc,
    ]
  }
  return [
    { key: "spf", type: "TXT", host: root, value: "v=spf1 include:amazonses.com ~all" },
    {
      key: "dkim",
      type: "TXT",
      host: `resend._domainkey.${root}`,
      value: "p=REPLACE_WITH_PROVIDER_DKIM_KEY",
    },
    dmarc,
  ]
}

export function parseRecords(value: string): DnsRecord[] {
  try {
    const parsed = JSON.parse(value) as DnsRecord[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((row) => row && row.host && row.value && row.type)
  } catch {
    return []
  }
}

export function canTrustWithoutDns(domain: string, transport: string) {
  return transport === "console" && domain.trim().toLowerCase().endsWith(".test")
}

type Lookup = {
  txt: (host: string) => Promise<string[]>
  cname: (host: string) => Promise<string[]>
  mx: (host: string) => Promise<string[]>
}

export async function evaluateDns(records: DnsRecord[], domain: string, lookup: Lookup) {
  const failures: string[] = []
  for (const record of records) {
    const host = displayHost(record.host, domain)
    if (record.value.includes("REPLACE_WITH")) {
      failures.push(`${record.key.toUpperCase()} at ${host} still has a placeholder value`)
      continue
    }
    const expected = record.value.replace(/\.$/, "").toLowerCase()
    if (record.type.toUpperCase() === "CNAME") {
      const found = await lookup.cname(host)
      const ok = found.some((item) => item.replace(/\.$/, "").toLowerCase() === expected)
      if (!ok) failures.push(`DKIM CNAME not found at ${host}`)
    } else if (record.type.toUpperCase() === "MX") {
      const found = await lookup.mx(host)
      const ok = found.some((item) => item.replace(/\.$/, "").toLowerCase().includes(expected))
      if (!ok) failures.push(`MX not found at ${host}`)
    } else {
      const found = await lookup.txt(host)
      const ok = found.some((item) => item.toLowerCase().includes(expected))
      if (!ok) failures.push(`${record.key.toUpperCase()} TXT not found at ${host}`)
    }
  }
  if (failures.length) return { ok: false, detail: failures.join(". ") }
  return { ok: true, detail: "All published records match." }
}
