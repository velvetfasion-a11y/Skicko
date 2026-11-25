import { authSecret, hmac, safeEqual } from "../crypto"

export function signUnsubscribe(contactId: string, campaignId?: string | null) {
  const payload = `${contactId}.${campaignId || "-"}`
  const body = Buffer.from(payload).toString("base64url")
  const sig = hmac(payload, authSecret())
  return `${body}.${sig}`
}

export function verifyUnsubscribe(token: string) {
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [body, sig] = parts
  if (!body || !sig) return null
  let payload = ""
  try {
    payload = Buffer.from(body, "base64url").toString("utf8")
  } catch {
    return null
  }
  const expected = hmac(payload, authSecret())
  if (!safeEqual(expected, sig)) return null
  const dot = payload.indexOf(".")
  if (dot <= 0) return null
  const contactId = payload.slice(0, dot)
  const campaign = payload.slice(dot + 1)
  return { contactId, campaignId: campaign && campaign !== "-" ? campaign : null }
}

export function unsubscribeLinks(origin: string, contactId: string, campaignId?: string | null) {
  const token = signUnsubscribe(contactId, campaignId)
  return {
    token,
    pageUrl: `${origin}/u/${token}`,
    oneClickUrl: `${origin}/api/unsubscribe?token=${encodeURIComponent(token)}`,
  }
}
