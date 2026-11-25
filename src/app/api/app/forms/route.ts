import { z } from "zod"
import { sessionRoute } from "@/lib/api/guard"
import { json } from "@/lib/http"
import { prisma } from "@/lib/prisma"
import { BRAND } from "@/lib/brand"

const schema = z.object({ name: z.string().min(1).max(80) })

export async function POST(req: Request) {
  return sessionRoute(req, async (session) => {
    const body = schema.parse(await req.json())
    const form = await prisma.signupForm.create({
      data: {
        workspaceId: session.workspace.id,
        name: body.name,
        headline: `Notes from ${session.workspace.name}`,
        description: "Occasional letters. Unsubscribe whenever you like.",
        buttonLabel: "Subscribe",
        doubleOptIn: true,
        consentText: BRAND.defaultConsentText,
        consentVersion: BRAND.consentVersion,
      },
    })
    return json({ id: form.id })
  })
}
