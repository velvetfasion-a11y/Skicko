import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { createSession, hashPassword } from "@/lib/auth"
import { createWorkspaceForUser } from "@/lib/workspace"
import { HttpError, json, readBody, toErrorResponse } from "@/lib/http"
import { assertSameOrigin } from "@/lib/origin"
import { isEmail, normalizeEmail } from "@/lib/email/address"

const schema = z.object({
  email: z.string().min(3),
  password: z.string().min(8),
  name: z.string().min(1).max(80),
  workspace: z.string().min(1).max(80),
})

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
    const body = schema.parse(await readBody(req))
    const email = normalizeEmail(body.email)
    if (!isEmail(email)) throw new HttpError("Enter a valid email address.", 400)
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw new HttpError("An account with that email already exists.", 409)
    const user = await prisma.user.create({
      data: { email, name: body.name.trim(), passwordHash: await hashPassword(body.password) },
    })
    await createWorkspaceForUser({
      userId: user.id,
      workspaceName: body.workspace,
      senderName: body.name.trim(),
      replyTo: email,
    })
    await createSession(user.id)
    return json({ ok: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
