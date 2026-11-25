import { sha256 } from "../crypto"

export function hashRequestBody(body: string) {
  return sha256(body)
}

export function redactForLog(body: string, limit = 4000) {
  const trimmed = body.length > limit ? `${body.slice(0, limit)}…` : body
  return trimmed.replace(/sk_live_[A-Za-z0-9_-]+/g, "sk_live_redacted")
}
