import { createHmac, timingSafeEqual } from "node:crypto"
import { applyWebhook } from "@/lib/webhooks/apply"
import { error, json, toErrorResponse } from "@/lib/http"

function verifySvix(payload: string, headers: Headers, secret: string) {
  const id = headers.get("svix-id")
  const timestamp = headers.get("svix-timestamp")
  const signature = headers.get("svix-signature")
  if (!id || !timestamp || !signature) return false
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64")
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest("base64")
  return signature.split(" ").some((part) => {
    const value = part.split(",")[1]
    if (!value) return false
    const left = Buffer.from(value)
    const right = Buffer.from(expected)
    return left.length === right.length && timingSafeEqual(left, right)
  })
}

export async function POST(req: Request) {
  try {
    const raw = await req.text()
    const secret = process.env.RESEND_WEBHOOK_SECRET
    if (secret && !verifySvix(raw, req.headers, secret)) return error("Invalid webhook signature.", 401)
    const result = await applyWebhook(JSON.parse(raw || "{}"))
    return json({ ok: true, ...result })
  } catch (err) {
    return toErrorResponse(err)
  }
}
