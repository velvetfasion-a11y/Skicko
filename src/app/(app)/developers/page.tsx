import { requireUser } from "@/lib/auth"
import { loadDevelopers } from "@/lib/data"
import { requestOrigin } from "@/lib/origin"
import { DevelopersView } from "@/components/developers/developers-view"

export const instant = false

export default async function DevelopersPage() {
  const session = await requireUser()
  const [data, origin] = await Promise.all([loadDevelopers(session.workspace.id), requestOrigin()])
  return <DevelopersView data={data} origin={origin} email={session.user.email} senderName={session.workspace.senderName || session.workspace.name} />
}
