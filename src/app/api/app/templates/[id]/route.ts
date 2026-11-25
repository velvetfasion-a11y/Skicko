import { z } from "zod"
import { sessionRoute } from "@/lib/api/guard"
import { HttpError, json } from "@/lib/http"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  html: z.string().min(1).optional(),
  category: z.enum(["marketing", "transactional"]).optional(),
  description: z.string().max(240).optional(),
})

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  return sessionRoute(req, async (session) => {
    const { id } = await context.params
    const body = schema.parse(await req.json())
    const existing = await prisma.template.findFirst({ where: { id, workspaceId: session.workspace.id } })
    if (!existing) throw new HttpError("Template not found.", 404)
    await prisma.template.update({ where: { id }, data: body })
    return json({ ok: true })
  })
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  return sessionRoute(req, async (session) => {
    const { id } = await context.params
    await prisma.template.deleteMany({ where: { id, workspaceId: session.workspace.id } })
    return json({ ok: true })
  })
}
