import { z } from "zod"
import { sessionRoute } from "@/lib/api/guard"
import { json } from "@/lib/http"
import { sendCampaignTest } from "@/lib/campaigns/process"
import { originFromRequest } from "@/lib/origin"

const schema = z.object({ to: z.string().min(3) })

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  return sessionRoute(req, async (session) => {
    const { id } = await context.params
    const body = schema.parse(await req.json())
    await sendCampaignTest({
      campaignId: id,
      workspaceId: session.workspace.id,
      to: body.to,
      origin: originFromRequest(req),
    })
    return json({ ok: true })
  })
}
