import { getSession } from "../auth"
import { assertSameOrigin } from "../origin"
import { error, toErrorResponse } from "../http"

export async function sessionRoute(
  req: Request,
  run: (ctx: NonNullable<Awaited<ReturnType<typeof getSession>>>) => Promise<Response>,
) {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req)
    const session = await getSession()
    if (!session) return error("Sign in required.", 401)
    return await run(session)
  } catch (err) {
    return toErrorResponse(err)
  }
}
