import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { authSecret, newToken, sha256 } from "./crypto"
import { HttpError } from "./http"
import { normalizeEmail } from "./email/address"

const COOKIE = "sk_session"
const THIRTY_DAYS = 60 * 60 * 24 * 30

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  }
}

export async function createSession(userId: string) {
  const token = newToken()
  await prisma.session.create({
    data: {
      userId,
      tokenHash: token.hash,
      expiresAt: new Date(Date.now() + THIRTY_DAYS * 1000),
    },
  })
  const jar = await cookies()
  jar.set(COOKIE, token.raw, cookieOptions())
}

export async function destroySession() {
  const jar = await cookies()
  const raw = jar.get(COOKIE)?.value
  if (raw) await prisma.session.deleteMany({ where: { tokenHash: sha256(raw) } })
  jar.delete(COOKIE)
}

export async function getSession() {
  const jar = await cookies()
  const raw = jar.get(COOKIE)?.value
  if (!raw) return null
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(raw) },
    include: { user: { include: { membership: { include: { workspace: true } } } } },
  })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
    return null
  }
  const membership = session.user.membership
  if (!membership) return null
  return {
    sessionId: session.id,
    user: { id: session.user.id, email: session.user.email, name: session.user.name },
    workspace: membership.workspace,
  }
}

export async function requireUser() {
  const session = await getSession()
  if (!session) redirect("/login")
  return session
}

export async function loginWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } })
  if (!user?.passwordHash) throw new HttpError("Email or password is incorrect.", 401)
  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) throw new HttpError("Email or password is incorrect.", 401)
  await createSession(user.id)
  return user
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function issueMagicLink(email: string) {
  const token = newToken()
  await prisma.magicLink.create({
    data: {
      email: normalizeEmail(email),
      tokenHash: token.hash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  })
  return token.raw
}

export async function consumeMagicLink(raw: string) {
  const link = await prisma.magicLink.findUnique({ where: { tokenHash: sha256(raw) } })
  if (!link || link.usedAt || link.expiresAt.getTime() < Date.now()) {
    throw new HttpError("This sign-in link is invalid or has expired.", 400)
  }
  await prisma.magicLink.update({ where: { id: link.id }, data: { usedAt: new Date() } })
  return link.email
}

export function devSecretsEnabled() {
  return process.env.EMAIL_TRANSPORT !== "resend" && process.env.EMAIL_TRANSPORT !== "ses" && process.env.NODE_ENV !== "production"
}

export function sessionSecretLabel() {
  return authSecret() === "dev-only-skicko-secret" ? "dev" : "custom"
}
