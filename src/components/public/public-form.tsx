"use client"

import { useState } from "react"
import { BRAND } from "@/lib/brand"

export function PublicForm({
  form,
}: {
  form: {
    id: string
    headline: string
    description: string
    buttonLabel: string
    consentText: string
    workspace: string
  }
}) {
  const [status, setStatus] = useState<"idle" | "subscribed" | "pending" | "already" | "blocked">("idle")
  const [devLink, setDevLink] = useState("")
  const [error, setError] = useState("")

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError("")
    const response = await fetch(`/api/public/forms/${form.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: data.get("email"),
        firstName: data.get("firstName"),
        consent: data.get("consent") === "on",
        company_website: data.get("company_website"),
      }),
    })
    const body = (await response.json()) as { status?: typeof status; error?: string; devLink?: string }
    if (!response.ok) {
      setError(body.error || "Could not subscribe")
      return
    }
    setStatus(body.status || "subscribed")
    setDevLink(body.devLink || "")
  }

  const message = {
    idle: "",
    subscribed: "You are on the list.",
    pending: "Check your inbox to confirm.",
    already: "You are already subscribed.",
    blocked: "This address cannot be subscribed.",
  }[status]

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <form onSubmit={onSubmit} className="glass w-full max-w-md rounded-3xl p-7">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">{form.workspace}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{form.headline}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{form.description}</p>
        {status === "idle" ? (
          <div className="mt-5 grid gap-3">
            <input name="firstName" placeholder="First name" className="h-10 rounded-xl border bg-white/60 px-3 text-sm dark:bg-white/5" />
            <input name="email" type="email" required placeholder="Email" className="h-10 rounded-xl border bg-white/60 px-3 text-sm dark:bg-white/5" />
            <input name="company_website" tabIndex={-1} autoComplete="off" className="hidden" />
            <label className="flex items-start gap-2 text-sm leading-5">
              <input name="consent" type="checkbox" required className="mt-1" />
              <span>{form.consentText}</span>
            </label>
            <button className="h-10 rounded-full bg-primary text-sm font-medium text-primary-foreground">{form.buttonLabel}</button>
          </div>
        ) : (
          <p className="mt-5 text-sm">{message}</p>
        )}
        {devLink ? <a className="mt-3 block text-sm text-primary" href={devLink}>Open confirmation</a> : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <p className="mt-6 text-[11px] text-muted-foreground">Powered by {BRAND.name}</p>
      </form>
    </main>
  )
}
