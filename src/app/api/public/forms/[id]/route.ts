import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { submitSignup } from "@/lib/audience/signup"
import { HttpError, json, toErrorResponse } from "@/lib/http"
import { originFromRequest } from "@/lib/origin"

const schema = z.object({
  email: z.string().optional(),
  firstName: z.string().optional(),
  consent: z.boolean().optional(),
  company_website: z.string().optional(),
})

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const form = await prisma.signupForm.findUnique({ where: { id }, include: { workspace: true } })
    if (!form) throw new HttpError("Form not found.", 404)
    const body = schema.parse(await req.json())
    const result = await submitSignup({
      form,
      email: body.email || "",
      firstName: body.firstName || "",
      consent: Boolean(body.consent),
      honeypot: body.company_website || "",
      origin: originFromRequest(req),
    })
    return json(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}
