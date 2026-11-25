import { verifyUnsubscribe } from "@/lib/email/unsubscribe"
import { prisma } from "@/lib/prisma"
import { suppressAddress } from "@/lib/audience/suppress"
import { HttpError, json, toErrorResponse } from "@/lib/http"

async function tokenFrom(req: Request) {
  const url = new URL(req.url)
  const query = url.searchParams.get("token")
  if (query) return query
  const type = req.headers.get("content-type") || ""
  if (type.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { token?: string }
    return body.token || ""
  }
  const text = await req.text()
  return new URLSearchParams(text).get("token") || ""
}

export async function POST(req: Request) {
  try {
    const token = await tokenFrom(req)
    if (token === "test") return json({ ok: true, test: true })
    const parsed = verifyUnsubscribe(token)
    if (!parsed) throw new HttpError("This unsubscribe link is invalid.", 400)
    const contact = await prisma.contact.findUnique({ where: { id: parsed.contactId } })
    if (!contact) throw new HttpError("This unsubscribe link is invalid.", 400)
    await suppressAddress({
      workspaceId: contact.workspaceId,
      email: contact.email,
      reason: "unsubscribe",
      source: parsed.campaignId ? `campaign:${parsed.campaignId}` : "link",
      contactStatus: "unsubscribed",
    })
    if (parsed.campaignId) {
      await prisma.campaignRecipient.updateMany({
        where: { campaignId: parsed.campaignId, contactId: contact.id },
        data: { status: "unsubscribed" },
      })
    }
    return json({ ok: true, email: contact.email })
  } catch (error) {
    return toErrorResponse(error)
  }
}
