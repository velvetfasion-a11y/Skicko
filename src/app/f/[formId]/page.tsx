import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PublicForm } from "@/components/public/public-form"

export const instant = false

export default async function FormPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params
  const form = await prisma.signupForm.findUnique({ where: { id: formId }, include: { workspace: true } })
  if (!form) notFound()
  return (
    <PublicForm
      form={{
        id: form.id,
        headline: form.headline || form.name,
        description: form.description,
        buttonLabel: form.buttonLabel,
        consentText: form.consentText,
        workspace: form.workspace.senderName || form.workspace.name,
      }}
    />
  )
}
