"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { BRAND } from "@/lib/brand"
import { api } from "@/lib/client"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AuthCard({ mode, demo }: { mode: "login" | "signup"; demo: boolean }) {
  const { t } = useI18n()
  const router = useRouter()
  const [magic, setMagic] = useState(false)
  const [pending, setPending] = useState(false)
  const [devLink, setDevLink] = useState("")

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    try {
      if (magic) {
        const result = await api<{ devLink?: string }>("/api/auth/magic", {
          method: "POST",
          body: JSON.stringify({ email: form.get("email") }),
        })
        setDevLink(result.devLink || "")
        toast.success(t("auth.magicSent"))
      } else if (mode === "signup") {
        await api("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({
            email: form.get("email"),
            password: form.get("password"),
            name: form.get("name"),
            workspace: form.get("workspace"),
          }),
        })
        router.push("/overview")
        router.refresh()
      } else {
        await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
        })
        router.push("/overview")
        router.refresh()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not continue")
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="glass w-full max-w-[440px] rounded-3xl p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">S</span>
          <div>
            <div className="text-lg font-semibold tracking-tight">{BRAND.name}</div>
            <p className="text-sm text-muted-foreground">{BRAND.tagline}</p>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{mode === "login" ? t("auth.title", { brand: BRAND.name }) : t("auth.createAccount")}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("auth.lead")}</p>
        <form onSubmit={onSubmit} className="mt-6 grid gap-3">
          {mode === "signup" && !magic ? (
            <>
              <Field label={t("auth.name")}><Input name="name" required autoComplete="name" /></Field>
              <Field label={t("auth.workspace")}><Input name="workspace" required /></Field>
            </>
          ) : null}
          <Field label={t("auth.email")}><Input name="email" type="email" required autoComplete="email" /></Field>
          {!magic ? (
            <Field label={t("auth.password")} hint={mode === "signup" ? t("auth.passwordHint") : undefined}>
              <Input name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </Field>
          ) : null}
          <Button type="submit" disabled={pending} className="mt-2 h-10 rounded-full">
            {magic ? t("auth.magic") : mode === "login" ? t("auth.signIn") : t("auth.createAccount")}
          </Button>
        </form>
        {devLink ? (
          <a href={devLink} className="mt-3 block text-sm text-primary hover:underline">{t("auth.openLink")}</a>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setMagic((value) => !value)}>
            {magic ? t("auth.usePassword") : t("auth.useMagic")}
          </button>
          <Link href={mode === "login" ? "/signup" : "/login"} className="text-primary">
            {mode === "login" ? t("auth.needAccount") : t("auth.haveAccount")}
          </Link>
        </div>
        {demo && mode === "login" ? (
          <div className="mt-6 rounded-2xl bg-white/50 p-3 text-sm dark:bg-white/5">
            <div className="font-medium">{t("auth.demoTitle")}</div>
            <p className="mt-1 text-muted-foreground">anna@linden.studio · skicko-demo</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-9 rounded-full bg-white/70"
              onClick={async () => {
                setPending(true)
                try {
                  await api("/api/auth/demo", { method: "POST", body: "{}" })
                  router.push("/overview")
                  router.refresh()
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Demo sign-in failed")
                } finally {
                  setPending(false)
                }
              }}
            >
              {t("auth.demoButton")}
            </Button>
          </div>
        ) : null}
      </div>
    </main>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <Label className="grid gap-1.5 font-normal">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </Label>
  )
}
