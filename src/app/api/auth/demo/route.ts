import { createSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { error, json, toErrorResponse } from "@/lib/http"
import { assertSameOrigin } from "@/lib/origin"

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
    if (process.env.NODE_ENV === "production") return error("Not found.", 404)
    const user = await prisma.user.findUnique({ where: { email: "anna@linden.studio" } })
    if (!user) return error("Seed the database before using the demo sign-in.", 400)
    await createSession(user.id)
    return json({ ok: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
