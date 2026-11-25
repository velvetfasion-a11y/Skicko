import { sessionRoute } from "@/lib/api/guard"
import { json } from "@/lib/http"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  return sessionRoute(req, async (session) => {
    const campaign = await prisma.campaign.create({
      data: {
        workspaceId: session.workspace.id,
        name: "Untitled campaign",
        fromName: session.workspace.senderName || session.workspace.name,
        replyTo: session.workspace.replyTo,
        status: "draft",
        step: 1,
      },
    })
    return json({ id: campaign.id })
  })
}
