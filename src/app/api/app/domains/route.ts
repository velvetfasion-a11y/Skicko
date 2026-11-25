import { z } from "zod"
import { sessionRoute } from "@/lib/api/guard"
import { HttpError, json } from "@/lib/http"
import { prisma } from "@/lib/prisma"
import { provisionDomain } from "@/lib/dns/resend"

const schema = z.object({
  domain: z.string().min(3).max(180),
  provider: z.enum(["resend", "ses"]).optional(),
})

export async function POST(req: Request) {
  return sessionRoute(req, async (session) => {
    const body = schema.parse(await req.json())
    const domain = body.domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) throw new HttpError("Enter a domain like mail.studio.com.", 400)
    const provider = body.provider || "resend"
    const provisioned = await provisionDomain(domain, provider)
    const created = await prisma.sendingDomain.create({
      data: {
        workspaceId: session.workspace.id,
        domain,
        provider,
        providerDomainId: provisioned.providerDomainId,
        recordsJson: JSON.stringify(provisioned.records),
        detail: provisioned.detail,
        status: "pending",
      },
    })
    return json({ id: created.id })
  })
}
