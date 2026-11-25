import { z } from "zod"
import { sessionRoute } from "@/lib/api/guard"
import { json } from "@/lib/http"
import { commitImport } from "@/lib/audience/mutate"
import { COLUMN_FIELDS } from "@/lib/audience/csv"

const schema = z.object({
  csv: z.string(),
  mapping: z.array(z.enum(COLUMN_FIELDS)),
  listId: z.string().optional(),
  consent: z.boolean(),
  applyTypos: z.boolean().optional(),
})

export async function POST(req: Request) {
  return sessionRoute(req, async (session) => {
    const body = schema.parse(await req.json())
    const result = await commitImport({
      workspaceId: session.workspace.id,
      csv: body.csv,
      mapping: body.mapping,
      listId: body.listId || null,
      consent: body.consent,
      applyTypos: Boolean(body.applyTypos),
    })
    return json(result)
  })
}
