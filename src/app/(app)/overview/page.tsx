import { requireUser } from "@/lib/auth"
import { loadOverview } from "@/lib/data"
import { OverviewView } from "@/components/overview/overview-view"

export const instant = false

export default async function OverviewPage() {
  const session = await requireUser()
  const data = await loadOverview(session.workspace.id)
  return <OverviewView data={data} name={session.user.name} />
}
