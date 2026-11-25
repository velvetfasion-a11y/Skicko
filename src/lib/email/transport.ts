import { randomBytes } from "node:crypto"
import type { MailCategory } from "./compose"

export type OutboundEmail = {
  to: string
  from: string
  subject: string
  html: string
  text: string
  replyTo?: string
  headers?: Record<string, string>
  category: MailCategory
}

export interface EmailTransport {
  readonly name: "console" | "resend" | "ses"
  send(message: OutboundEmail): Promise<{ providerId: string }>
}

export function transportKind(): EmailTransport["name"] {
  const explicit = process.env.EMAIL_TRANSPORT
  if (explicit === "resend" || explicit === "ses" || explicit === "console") return explicit
  if (process.env.RESEND_API_KEY) return "resend"
  return "console"
}

export class ConsoleTransport implements EmailTransport {
  readonly name = "console" as const
  async send(message: OutboundEmail) {
    const providerId = `console_${randomBytes(8).toString("hex")}`
    console.log(
      `[${process.env.BRAND_LOG_NAME || "Skicko"} console] ${message.category} to ${message.to} · ${message.subject} · ${providerId}`,
    )
    return { providerId }
  }
}

export class ResendTransport implements EmailTransport {
  readonly name = "resend" as const
  async send(message: OutboundEmail) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error("RESEND_API_KEY is not set.")
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: message.replyTo || undefined,
        headers: message.headers,
      }),
    })
    const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string; error?: string }
    if (!response.ok) throw new Error(data.message || data.error || `Resend error ${response.status}`)
    if (!data.id) throw new Error("Resend did not return a message id.")
    return { providerId: data.id }
  }
}

/** Adapter slot for Amazon SES. Implement with @aws-sdk/client-sesv2 when you are ready. */
export class SesTransport implements EmailTransport {
  readonly name = "ses" as const
  async send(message: OutboundEmail): Promise<{ providerId: string }> {
    throw new Error(
      `Amazon SES is not enabled yet, so “${message.subject}” was not sent to ${message.to}. Set EMAIL_TRANSPORT=resend or console. SesTransport is the place to add SESv2 SendEmail.`,
    )
  }
}

export function getTransport(): EmailTransport {
  const kind = transportKind()
  if (kind === "resend") return new ResendTransport()
  if (kind === "ses") return new SesTransport()
  return new ConsoleTransport()
}
