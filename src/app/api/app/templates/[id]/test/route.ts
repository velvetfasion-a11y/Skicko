import { z } from "zod"
import { sessionRoute } from "@/lib/api/guard"
import { HttpError, json } from "@/lib/http"
import { prisma } from "@/lib/prisma"
import { assertFromDomain, contactVariables, sendRendered } from "@/lib/email/deliver"
import { isEmail, normalizeEmail } from "@/lib/email/address"
import { originFromRequest } from "@/lib/origin"

const schema = z.object({
  to: z.string().min(3),
  contactId: z.string().optional(),
  domainId: z.string().optional(),
  subject: z.string().optional(),
})

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  return sessionRoute(req, async (session) => {
    const { id } = await context.params
    const body = schema.parse(await req.json())
    const to = normalizeEmail(body.to)
    if (!isEmail(to)) throw new HttpError("Enter a valid test address.", 400)
    const template = await prisma.template.findFirst({ where: { id, workspaceId: session.workspace.id } })
    if (!template) throw new HttpError("Template not found.", 404)
    const domain = body.domainId
      ? await prisma.sendingDomain.findFirst({ where: { id: body.domainId, workspaceId: session.workspace.id } })
      : await prisma.sendingDomain.findFirst({ where: { workspaceId: session.workspace.id }, orderBy: { createdAt: "asc" } })
    if (!domain) throw new HttpError("Add a sending domain first.", 400)
    const from = await assertFromDomain(session.workspace.id, domain.domain, "hello")
    const contact = body.contactId
      ? await prisma.contact.findFirst({ where: { id: body.contactId, workspaceId: session.workspace.id } })
      : null
    const category = template.category === "transactional" ? "transactional" : "marketing"
    await sendRendered({
      workspace: session.workspace,
      to,
      fromEmail: from.email,
      fromName: session.workspace.senderName || session.workspace.name,
      replyTo: session.workspace.replyTo,
      subject: body.subject || template.name,
      html: template.html,
      category,
      variables: contact
        ? contactVariables(contact)
        : { first_name: "Anna", last_name: "Lindström", email: to, company: session.workspace.name },
      origin: originFromRequest(req),
      source: "test",
      requireConsent: false,
    })
    return json({ ok: true })
  })
}
