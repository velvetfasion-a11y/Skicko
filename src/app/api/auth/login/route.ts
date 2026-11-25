import { z } from "zod"
import { loginWithPassword } from "@/lib/auth"
import { json, readBody, toErrorResponse } from "@/lib/http"
import { assertSameOrigin } from "@/lib/origin"

const schema = z.object({ email: z.string().min(3), password: z.string().min(1) })

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
    const body = schema.parse(await readBody(req))
    await loginWithPassword(body.email, body.password)
    return json({ ok: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
