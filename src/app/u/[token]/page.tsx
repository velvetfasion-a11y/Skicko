import { verifyUnsubscribe } from "@/lib/email/unsubscribe"
import { prisma } from "@/lib/prisma"
import { UnsubscribeCard } from "@/components/public/lifecycle"

export const instant = false

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (token === "test") return <UnsubscribeCard email="" token="test" />
  const parsed = verifyUnsubscribe(decodeURIComponent(token))
  const contact = parsed ? await prisma.contact.findUnique({ where: { id: parsed.contactId } }) : null
  return <UnsubscribeCard email={contact?.email || "this address"} token={token} />
}
