import { sessionRoute } from "@/lib/api/guard"
import { json } from "@/lib/http"
import { queueCampaign } from "@/lib/campaigns/process"
import { originFromRequest } from "@/lib/origin"

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  return sessionRoute(req, async (session) => {
    const { id } = await context.params
    const result = await queueCampaign(id, session.workspace.id, originFromRequest(req))
    return json(result)
  })
}
