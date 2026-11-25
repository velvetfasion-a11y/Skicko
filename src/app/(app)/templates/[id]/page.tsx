import { notFound } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { loadTemplate } from "@/lib/data"
import { TemplateStudio } from "@/components/templates/template-studio"

export const instant = false

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser()
  const { id } = await params
  const data = await loadTemplate(session.workspace.id, id)
  if (!data) notFound()
  return <TemplateStudio data={data} email={session.user.email} />
}
