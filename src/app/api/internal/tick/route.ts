import { prisma } from "@/lib/prisma"
import { tickCampaign } from "@/lib/campaigns/process"
import { error, json } from "@/lib/http"
import { appUrl } from "@/lib/origin"

async function run(req: Request) {
  const secret = process.env.CRON_SECRET
  const header = req.headers.get("authorization")
  if (!secret || header !== `Bearer ${secret}`) return error("Unauthorized.", 401)
  const campaigns = await prisma.campaign.findMany({ where: { status: "sending" }, select: { id: true } })
  for (const campaign of campaigns) await tickCampaign(campaign.id, appUrl())
  return json({ processed: campaigns.length })
}

export async function GET(req: Request) {
  return run(req)
}

export async function POST(req: Request) {
  return run(req)
}
