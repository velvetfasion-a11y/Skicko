import { sessionRoute } from "@/lib/api/guard"
import { HttpError, json } from "@/lib/http"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  return sessionRoute(req, async (session) => {
    const { id } = await context.params
    const template = await prisma.template.findFirst({ where: { id, workspaceId: session.workspace.id } })
    if (!template) throw new HttpError("Template not found.", 404)
    const copy = await prisma.template.create({
      data: {
        workspaceId: session.workspace.id,
        name: `${template.name} copy`,
        description: template.description,
        category: template.category,
        html: template.html,
      },
    })
    return json({ id: copy.id })
  })
}
