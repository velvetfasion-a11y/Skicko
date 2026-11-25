import { z } from "zod"
import { issueMagicLink } from "@/lib/auth"
import { BRAND } from "@/lib/brand"
import { getTransport, transportKind } from "@/lib/email/transport"
import { HttpError, json, readBody, toErrorResponse } from "@/lib/http"
import { assertSameOrigin, originFromRequest } from "@/lib/origin"
import { isEmail, normalizeEmail } from "@/lib/email/address"

const schema = z.object({ email: z.string().min(3) })

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
    const body = schema.parse(await readBody(req))
    const email = normalizeEmail(body.email)
    if (!isEmail(email)) throw new HttpError("Enter a valid email address.", 400)
    const raw = await issueMagicLink(email)
    const link = `${originFromRequest(req)}/api/auth/callback?token=${encodeURIComponent(raw)}`
    await getTransport().send({
      to: email,
      from: `${BRAND.name} <hello@mail.skicko.test>`,
      subject: `Sign in to ${BRAND.name}`,
      html: `<p><a href="${link}">Sign in to ${BRAND.name}</a></p>`,
      text: link,
      category: "transactional",
    }).catch((error) => {
      if (transportKind() !== "console") throw error
    })
    return json({ ok: true, devLink: transportKind() === "console" ? link : undefined })
  } catch (error) {
    return toErrorResponse(error)
  }
}
