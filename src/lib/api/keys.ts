import { randomBytes } from "node:crypto"
import { sha256 } from "../crypto"

export function generateApiKey() {
  const raw = `sk_live_${randomBytes(24).toString("base64url")}`
  return { raw, prefix: raw.slice(0, 16), hash: sha256(raw) }
}

export function hashApiKey(raw: string) {
  return sha256(raw.trim())
}

export function maskKey(prefix: string) {
  return `${prefix}…`
}
