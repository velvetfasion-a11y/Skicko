import { requireUser } from "@/lib/auth"
import { loadShell } from "@/lib/data"
import { AppShell } from "@/components/shell/app-shell"

export const instant = false

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser()
  const shell = await loadShell(session.workspace.id)
  return (
    <AppShell
      user={session.user}
      workspace={{ name: session.workspace.name }}
      transport={shell.transport}
      contacts={shell.contacts}
    >
      {children}
    </AppShell>
  )
}
