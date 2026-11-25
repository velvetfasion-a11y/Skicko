import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function newToken() {
  const raw = randomBytes(32).toString("base64url")
  return { raw, hash: sha256(raw) }
}

export function hmac(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url")
}

export function authSecret() {
  return process.env.AUTH_SECRET || "dev-only-skicko-secret"
}
