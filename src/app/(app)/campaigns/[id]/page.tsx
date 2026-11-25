import { notFound } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { loadCampaign } from "@/lib/data"
import { CampaignWizard } from "@/components/campaigns/campaign-wizard"

export const instant = false

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser()
  const { id } = await params
  const data = await loadCampaign(session.workspace.id, id)
  if (!data) notFound()
  return <CampaignWizard data={data} email={session.user.email} />
}
