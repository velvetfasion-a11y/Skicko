import { z } from "zod"
import { sessionRoute } from "@/lib/api/guard"
import { json } from "@/lib/http"
import { prisma } from "@/lib/prisma"
import { generateApiKey } from "@/lib/api/keys"

const schema = z.object({ name: z.string().min(1).max(80) })

export async function POST(req: Request) {
  return sessionRoute(req, async (session) => {
    const body = schema.parse(await req.json())
    const key = generateApiKey()
    await prisma.apiKey.create({
      data: {
        workspaceId: session.workspace.id,
        name: body.name.trim(),
        prefix: key.prefix,
        hash: key.hash,
      },
    })
    return json({ token: key.raw, prefix: key.prefix })
  })
}
