import { sessionRoute } from "@/lib/api/guard"
import { json } from "@/lib/http"
import { prisma } from "@/lib/prisma"

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  return sessionRoute(req, async (session) => {
    const { id } = await context.params
    await prisma.apiKey.updateMany({
      where: { id, workspaceId: session.workspace.id, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    return json({ ok: true })
  })
}
