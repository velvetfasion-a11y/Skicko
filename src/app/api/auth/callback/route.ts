import { consumeMagicLink, createSession } from "@/lib/auth"
import { findOrCreateUserByEmail } from "@/lib/workspace"
import { originFromRequest } from "@/lib/origin"
import { toErrorResponse } from "@/lib/http"

export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("token") || ""
    const email = await consumeMagicLink(token)
    const user = await findOrCreateUserByEmail(email)
    await createSession(user.id)
    return Response.redirect(new URL("/overview", originFromRequest(req)))
  } catch (error) {
    const response = toErrorResponse(error)
    const message = "This sign-in link is invalid or has expired."
    return new Response(message, { status: response.status, headers: { "content-type": "text/plain" } })
  }
}
