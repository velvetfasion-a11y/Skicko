import { requireUser } from "@/lib/auth"
import { loadTemplates } from "@/lib/data"
import { TemplateList } from "@/components/templates/template-list"

export const instant = false

export default async function TemplatesPage() {
  const session = await requireUser()
  const templates = await loadTemplates(session.workspace.id)
  return <TemplateList templates={templates} />
}
