import { z } from "zod"
import { sessionRoute } from "@/lib/api/guard"
import { json } from "@/lib/http"
import { prisma } from "@/lib/prisma"
import { isEmail, normalizeEmail } from "@/lib/email/address"

const schema = z.object({
  name: z.string().min(1).max(80),
  senderName: z.string().min(1).max(80),
  replyTo: z.string().min(3),
  companyAddress: z.string().max(500),
})

export async function PATCH(req: Request) {
  return sessionRoute(req, async (session) => {
    const body = schema.parse(await req.json())
    const replyTo = normalizeEmail(body.replyTo)
    if (!isEmail(replyTo)) return json({ error: "Reply-to must be an email address." }, 400)
    const workspace = await prisma.workspace.update({
      where: { id: session.workspace.id },
      data: {
        name: body.name.trim(),
        senderName: body.senderName.trim(),
        replyTo,
        companyAddress: body.companyAddress.trim(),
      },
    })
    return json({ ok: true, id: workspace.id })
  })
}
