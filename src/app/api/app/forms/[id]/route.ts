import { z } from "zod"
import { sessionRoute } from "@/lib/api/guard"
import { HttpError, json } from "@/lib/http"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  name: z.string().min(1).optional(),
  headline: z.string().optional(),
  description: z.string().optional(),
  buttonLabel: z.string().optional(),
  consentText: z.string().optional(),
  listId: z.string().nullable().optional(),
  doubleOptIn: z.boolean().optional(),
})

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  return sessionRoute(req, async (session) => {
    const { id } = await context.params
    const body = schema.parse(await req.json())
    const existing = await prisma.signupForm.findFirst({ where: { id, workspaceId: session.workspace.id } })
    if (!existing) throw new HttpError("Form not found.", 404)
    await prisma.signupForm.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        headline: body.headline ?? existing.headline,
        description: body.description ?? existing.description,
        buttonLabel: body.buttonLabel ?? existing.buttonLabel,
        consentText: body.consentText ?? existing.consentText,
        listId: body.listId === undefined ? existing.listId : body.listId || null,
        doubleOptIn: body.doubleOptIn ?? existing.doubleOptIn,
      },
    })
    return json({ ok: true })
  })
}
