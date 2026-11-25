import { z } from "zod"
import { sessionRoute } from "@/lib/api/guard"
import { HttpError, json } from "@/lib/http"
import { prisma } from "@/lib/prisma"
import { loadCampaign } from "@/lib/data"
import { tickCampaign } from "@/lib/campaigns/process"
import { originFromRequest } from "@/lib/origin"

const schema = z.object({
  name: z.string().min(1).max(120).optional(),
  subject: z.string().max(200).optional(),
  preheader: z.string().max(200).optional(),
  fromName: z.string().max(80).optional(),
  fromLocalPart: z.string().max(64).optional(),
  replyTo: z.string().max(180).optional(),
  domainId: z.string().nullable().optional(),
  templateId: z.string().nullable().optional(),
  listId: z.string().nullable().optional(),
  step: z.number().int().min(1).max(3).optional(),
})

async function load(workspaceId: string, id: string) {
  const data = await loadCampaign(workspaceId, id)
  if (!data) throw new HttpError("Campaign not found.", 404)
  return data
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  return sessionRoute(req, async (session) => {
    const { id } = await context.params
    const current = await prisma.campaign.findFirst({ where: { id, workspaceId: session.workspace.id } })
    if (!current) throw new HttpError("Campaign not found.", 404)
    if (current.status === "sending") await tickCampaign(id, originFromRequest(req))
    return json(await load(session.workspace.id, id))
  })
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  return sessionRoute(req, async (session) => {
    const { id } = await context.params
    const body = schema.parse(await req.json())
    const current = await prisma.campaign.findFirst({ where: { id, workspaceId: session.workspace.id } })
    if (!current) throw new HttpError("Campaign not found.", 404)
    if (current.status !== "draft") throw new HttpError("This campaign can no longer be edited.", 409)
    await prisma.campaign.update({
      where: { id },
      data: {
        name: body.name ?? current.name,
        subject: body.subject ?? current.subject,
        preheader: body.preheader ?? current.preheader,
        fromName: body.fromName ?? current.fromName,
        fromLocalPart: body.fromLocalPart ?? current.fromLocalPart,
        replyTo: body.replyTo ?? current.replyTo,
        domainId: body.domainId === undefined ? current.domainId : body.domainId || null,
        templateId: body.templateId === undefined ? current.templateId : body.templateId || null,
        listId: body.listId === undefined ? current.listId : body.listId || null,
        step: body.step ?? current.step,
      },
    })
    return json(await load(session.workspace.id, id))
  })
}
