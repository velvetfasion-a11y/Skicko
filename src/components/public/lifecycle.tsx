"use client"

import { useState } from "react"
import { BRAND } from "@/lib/brand"

export function UnsubscribeCard({ email, token }: { email: string; token: string }) {
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  if (token === "test") {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="glass max-w-md rounded-3xl p-8">
          <h1 className="text-2xl font-semibold">This was a test send.</h1>
          <p className="mt-2 text-sm text-muted-foreground">Nobody was unsubscribed.</p>
        </div>
      </main>
    )
  }
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="glass max-w-md rounded-3xl p-8">
        <p className="text-xs text-muted-foreground">{BRAND.name}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Unsubscribe</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{email} will stop receiving marketing mail. Transactional receipts are a separate kind of message.</p>
        {done ? <p className="mt-4 text-sm">You are unsubscribed.</p> : (
          <button
            className="mt-5 h-10 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
            onClick={async () => {
              const response = await fetch("/api/unsubscribe", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ token }),
              })
              if (!response.ok) {
                const body = (await response.json()) as { error?: string }
                setError(body.error || "Could not unsubscribe")
                return
              }
              setDone(true)
            }}
          >
            Unsubscribe
          </button>
        )}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    </main>
  )
}

export function ConfirmCard({ token }: { token: string }) {
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="glass max-w-md rounded-3xl p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Confirm subscription</h1>
        <p className="mt-2 text-sm text-muted-foreground">One click, and you are on the list.</p>
        {done ? <p className="mt-4 text-sm">You are confirmed. Thank you.</p> : (
          <button
            className="mt-5 h-10 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
            onClick={async () => {
              const response = await fetch(`/api/public/confirm`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ token }),
              })
              if (!response.ok) {
                const body = (await response.json()) as { error?: string }
                setError(body.error || "Could not confirm")
                return
              }
              setDone(true)
            }}
          >
            Confirm subscription
          </button>
        )}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    </main>
  )
}
