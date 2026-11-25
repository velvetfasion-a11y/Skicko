import { HttpError } from "./http"

export function appUrl() {
  return (process.env.APP_URL || "http://127.0.0.1:4317").replace(/\/$/, "")
}

export function originFromRequest(req: Request) {
  const url = new URL(req.url)
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host")
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")
  if (host) return `${proto}://${host}`
  return appUrl()
}

export async function requestOrigin() {
  const { headers } = await import("next/headers")
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "http"
  if (host) return `${proto}://${host}`
  return appUrl()
}

export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin")
  if (!origin) return
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host")
  if (!host) return
  let originHost = ""
  try {
    originHost = new URL(origin).host
  } catch {
    throw new HttpError("Cross-origin request blocked.", 403)
  }
  if (originHost !== host) throw new HttpError("Cross-origin request blocked.", 403)
}
