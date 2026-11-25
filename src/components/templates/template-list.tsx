"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { starterTemplates } from "@/lib/email/starters"
import { api } from "@/lib/client"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { StatusPill } from "@/components/status-pill"
import type { MessageKey } from "@/lib/i18n/messages"

const starters = starterTemplates()

export function TemplateList({
  templates,
}: {
  templates: { id: string; name: string; description: string; category: string; html: string }[]
}) {
  const { t } = useI18n()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function create(slug?: string) {
    setPending(true)
    try {
      const created = await api<{ id: string }>("/api/app/templates", {
        method: "POST",
        body: JSON.stringify({ starter: slug || "" }),
      })
      router.push(`/templates/${created.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create")
      setPending(false)
    }
  }

  return (
    <div className="grid gap-3">
      <header className="glass flex flex-wrap items-end justify-between gap-3 rounded-3xl px-6 py-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("templates.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("templates.lead")}</p>
        </div>
        <Button className="h-10 rounded-full px-4" onClick={() => setOpen((value) => !value)}>{t("templates.new")}</Button>
      </header>
      {open ? (
        <div className="glass grid gap-2 rounded-3xl p-4 sm:grid-cols-2 xl:grid-cols-4">
          <button type="button" disabled={pending} onClick={() => create()} className="rounded-2xl bg-white/55 p-4 text-left text-sm hover:bg-white/80 dark:bg-white/5">Blank</button>
          {starters.map((starter) => (
            <button key={starter.slug} type="button" disabled={pending} onClick={() => create(starter.slug)} className="rounded-2xl bg-white/55 p-4 text-left hover:bg-white/80 dark:bg-white/5">
              <div className="text-sm font-medium">{starter.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{starter.description}</div>
            </button>
          ))}
        </div>
      ) : null}
      {templates.length === 0 ? <p className="text-sm text-muted-foreground">{t("templates.empty")}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((template) => (
          <button key={template.id} type="button" onClick={() => router.push(`/templates/${template.id}`)} className="glass overflow-hidden rounded-3xl text-left transition-transform duration-200 hover:-translate-y-0.5">
            <div className="h-44 overflow-hidden bg-[#e7ebf0]">
              <iframe title="" sandbox="" srcDoc={template.html} className="pointer-events-none h-[680px] w-[760px] origin-top-left scale-[0.28]" />
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="font-medium">{template.name}</div>
                <div className="text-xs text-muted-foreground">{template.description}</div>
              </div>
              <StatusPill status={template.category} label={t(`templates.${template.category}` as MessageKey)} />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
