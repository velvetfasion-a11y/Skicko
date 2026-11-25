import { requireUser } from "@/lib/auth"
import { loadSettings } from "@/lib/data"
import { SettingsView } from "@/components/settings/settings-view"

export const instant = false

export default async function SettingsPage() {
  const session = await requireUser()
  const data = await loadSettings(session.workspace.id)
  return <SettingsView data={data} />
}
