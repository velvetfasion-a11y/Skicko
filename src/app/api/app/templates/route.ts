import { z } from "zod"
import { sessionRoute } from "@/lib/api/guard"
import { json } from "@/lib/http"
import { prisma } from "@/lib/prisma"
import { starterBySlug } from "@/lib/email/starters"

const schema = z.object({ starter: z.string().optional() })

export async function POST(req: Request) {
  return sessionRoute(req, async (session) => {
    const body = schema.parse(await req.json().catch(() => ({})))
    const starter = body.starter ? starterBySlug(body.starter) : null
    const template = await prisma.template.create({
      data: {
        workspaceId: session.workspace.id,
        name: starter?.name || "Untitled",
        description: starter?.description || "",
        category: starter?.category || "marketing",
        html: starter?.html || "<!DOCTYPE html><html><head><style>body{font-family:-apple-system,sans-serif;color:#1d1d1f}</style></head><body><p>Hello {{first_name | \"there\"}}.</p></body></html>",
      },
    })
    return json({ id: template.id })
  })
}
