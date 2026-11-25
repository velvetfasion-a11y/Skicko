import { ZodError } from "zod"

export class HttpError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status })
}

export function error(message: string, status = 400) {
  return json({ error: message }, status)
}

export function toErrorResponse(err: unknown) {
  if (err instanceof HttpError) return error(err.message, err.status)
  if (err instanceof ZodError) {
    return error(err.issues[0]?.message ?? "Invalid request.", 400)
  }
  console.error(err)
  return error("Something went wrong.", 500)
}

export async function readBody(req: Request) {
  const text = await req.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new HttpError("Request body must be JSON.", 400)
  }
}
