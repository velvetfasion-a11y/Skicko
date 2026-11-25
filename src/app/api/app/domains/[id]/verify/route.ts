import { sessionRoute } from "@/lib/api/guard"
import { HttpError, json } from "@/lib/http"
import { prisma } from "@/lib/prisma"
import { parseRecords } from "@/lib/dns/records"
import { verifyDomainRecords } from "@/lib/dns/verify"
import { refreshResendDomain } from "@/lib/dns/resend"
import { transportKind } from "@/lib/email/transport"

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  return sessionRoute(req, async (session) => {
    const { id } = await context.params
    const domain = await prisma.sendingDomain.findFirst({ where: { id, workspaceId: session.workspace.id } })
    if (!domain) throw new HttpError("Domain not found.", 404)
    let detail = ""
    let status = domain.status
    if (domain.providerDomainId) {
      const remote = await refreshResendDomain(domain.providerDomainId)
      if (remote?.status === "verified") status = "verified"
      else if (remote?.status === "failed") status = "failed"
      if (remote?.records) {
        await prisma.sendingDomain.update({
          where: { id },
          data: { recordsJson: JSON.stringify(remote.records) },
        })
      }
    }
    const records = parseRecords((await prisma.sendingDomain.findUniqueOrThrow({ where: { id } })).recordsJson)
    const checked = await verifyDomainRecords(domain.domain, records, transportKind())
    status = checked.ok ? "verified" : status === "verified" ? "verified" : "failed"
    detail = checked.detail
    const updated = await prisma.sendingDomain.update({
      where: { id },
      data: { status, detail, lastChecked: new Date() },
    })
    return json({ status: updated.status, detail: updated.detail })
  })
}
