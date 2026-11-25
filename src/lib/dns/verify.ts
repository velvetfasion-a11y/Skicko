import { Resolver } from "node:dns/promises"
import { canTrustWithoutDns, evaluateDns, type DnsRecord } from "./records"

const resolver = new Resolver()
resolver.setServers(["1.1.1.1", "8.8.8.8"])

function withTimeout<T>(promise: Promise<T>, ms = 4000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("DNS lookup timed out")), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

async function safe<T>(run: () => Promise<T>, empty: T): Promise<T> {
  try {
    return await withTimeout(run())
  } catch {
    return empty
  }
}

export async function verifyDomainRecords(domain: string, records: DnsRecord[], transport: string) {
  if (canTrustWithoutDns(domain, transport)) {
    return {
      ok: true,
      detail: "Console transport trusts .test domains without a public DNS lookup.",
    }
  }
  return evaluateDns(records, domain, {
    txt: async (host) => {
      const rows = await safe(() => resolver.resolveTxt(host), [] as string[][])
      return rows.map((parts) => parts.join(""))
    },
    cname: (host) => safe(() => resolver.resolveCname(host), []),
    mx: async (host) => {
      const rows = await safe(() => resolver.resolveMx(host), [])
      return rows.map((row) => row.exchange)
    },
  })
}
