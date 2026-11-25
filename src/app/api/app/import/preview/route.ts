import { z } from "zod"
import { sessionRoute } from "@/lib/api/guard"
import { json } from "@/lib/http"
import { previewImport } from "@/lib/audience/mutate"
import { COLUMN_FIELDS, type ColumnField } from "@/lib/audience/csv"

const schema = z.object({
  csv: z.string(),
  mapping: z.array(z.enum(COLUMN_FIELDS)).optional(),
})

export async function POST(req: Request) {
  return sessionRoute(req, async (session) => {
    const body = schema.parse(await req.json())
    const preview = await previewImport(session.workspace.id, body.csv, body.mapping as ColumnField[] | undefined)
    return json(preview)
  })
}
