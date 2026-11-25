import { z } from "zod"
import { sessionRoute } from "@/lib/api/guard"
import { HttpError, json } from "@/lib/http"
import { prisma } from "@/lib/prisma"
import { suppressAddress } from "@/lib/audience/suppress"
import { parsePropertyLines } from "@/lib/audience/mutate"

const schema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  properties: z.string().optional(),
  action: z.enum(["unsubscribe", "suppress", "restore"]).optional(),
})

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  return sessionRoute(req, async (session) => {
    const { id } = await context.params
    const contact = await prisma.contact.findFirst({ where: { id, workspaceId: session.workspace.id } })
    if (!contact) throw new HttpError("Contact not found.", 404)
    const events = await prisma.contactEvent.findMany({ where: { contactId: id }, orderBy: { createdAt: "desc" }, take: 30 })
    return json({
      events: events.map((event) => ({ type: event.type, detail: event.detail, at: event.createdAt.toISOString() })),
    })
  })
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  return sessionRoute(req, async (session) => {
    const { id } = await context.params
    const body = schema.parse(await req.json())
    const contact = await prisma.contact.findFirst({ where: { id, workspaceId: session.workspace.id } })
    if (!contact) throw new HttpError("Contact not found.", 404)
    if (body.action === "unsubscribe") {
      await suppressAddress({ workspaceId: session.workspace.id, email: contact.email, reason: "unsubscribe", source: "manual", contactStatus: "unsubscribed" })
    } else if (body.action === "suppress") {
      await suppressAddress({ workspaceId: session.workspace.id, email: contact.email, reason: "manual", source: "manual", contactStatus: "unsubscribed" })
    } else if (body.action === "restore") {
      await prisma.suppression.deleteMany({ where: { workspaceId: session.workspace.id, email: contact.email } })
      await prisma.contact.update({
        where: { id },
        data: { status: "subscribed", consentStatus: "granted", consentedAt: contact.consentedAt ?? new Date() },
      })
      await prisma.contactEvent.create({
        data: { workspaceId: session.workspace.id, contactId: id, type: "restored", detail: "manual override" },
      })
    }
    if (body.firstName != null || body.lastName != null || body.company != null || body.properties != null) {
      await prisma.contact.update({
        where: { id },
        data: {
          firstName: body.firstName ?? contact.firstName,
          lastName: body.lastName ?? contact.lastName,
          company: body.company ?? contact.company,
          properties: body.properties != null ? JSON.stringify(parsePropertyLines(body.properties)) : contact.properties,
        },
      })
    }
    return json({ ok: true })
  })
}
