import { z } from "zod"
import { confirmSignup } from "@/lib/audience/signup"
import { json, toErrorResponse } from "@/lib/http"

const schema = z.object({ token: z.string().min(10) })

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json())
    const contact = await confirmSignup(body.token)
    return json({ ok: true, email: contact.email })
  } catch (error) {
    return toErrorResponse(error)
  }
}
