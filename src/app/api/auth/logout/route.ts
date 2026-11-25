import { destroySession } from "@/lib/auth"
import { json, toErrorResponse } from "@/lib/http"
import { assertSameOrigin } from "@/lib/origin"

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
    await destroySession()
    return json({ ok: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
