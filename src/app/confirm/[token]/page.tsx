import { ConfirmCard } from "@/components/public/lifecycle"

export const instant = false

export default async function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <ConfirmCard token={token} />
}
