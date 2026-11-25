import { z } from "zod"
import { sessionRoute } from "@/lib/api/guard"
import { json } from "@/lib/http"
import { addContact } from "@/lib/audience/mutate"

const schema = z.object({
  email: z.string().min(3),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  listId: z.string().optional(),
  consent: z.boolean().optional(),
})

export async function POST(req: Request) {
  return sessionRoute(req, async (session) => {
    const body = schema.parse(await req.json())
    const result = await addContact({
      workspaceId: session.workspace.id,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      company: body.company,
      listId: body.listId || null,
      consent: body.consent,
      source: "manual",
    })
    return json({ id: result.contact.id, suggestion: result.suggestion, suppressed: result.suppressed })
  })
}
