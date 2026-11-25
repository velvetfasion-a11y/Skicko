import { requireUser } from "@/lib/auth"
import { loadCampaigns } from "@/lib/data"
import { CampaignList } from "@/components/campaigns/campaign-wizard"

export const instant = false

export default async function CampaignsPage() {
  const session = await requireUser()
  const campaigns = await loadCampaigns(session.workspace.id)
  return <CampaignList campaigns={campaigns} />
}
