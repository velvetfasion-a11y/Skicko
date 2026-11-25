import { z } from "zod"
import { sessionRoute } from "@/lib/api/guard"
import { json } from "@/lib/http"
import { prisma } from "@/lib/prisma"

const schema = z.object({ name: z.string().min(1).max(80), description: z.string().max(240).optional() })

export async function POST(req: Request) {
  return sessionRoute(req, async (session) => {
    const body = schema.parse(await req.json())
    const list = await prisma.list.create({
      data: { workspaceId: session.workspace.id, name: body.name.trim(), description: body.description || "" },
    })
    return json({ id: list.id })
  })
}
