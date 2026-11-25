"use client"

import { Component, useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { interpolate, extractVariables } from "@/lib/email/variables"
import { api } from "@/lib/client"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { TemplateDetail } from "@/lib/data"
import type { MessageKey } from "@/lib/i18n/messages"

function FallbackEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const lines = Math.max(value.split("\n").length, 24)
  return (
    <div data-editor="fallback" className="flex h-[640px] overflow-hidden rounded-2xl bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div aria-hidden className="w-12 shrink-0 select-none overflow-hidden border-r border-black/5 py-4 pr-2 text-right font-mono text-[12px] leading-6 text-zinc-400">
        {Array.from({ length: lines }, (_, index) => (
          <div key={index}>{index + 1}</div>
        ))}
      </div>
      <textarea
        value={value}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        className="h-full w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-6 text-inherit outline-none"
      />
    </div>
  )
}

class EditorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function HtmlEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [Editor, setEditor] = useState<typeof import("./template-editor").TemplateEditor | null>(null)
  useEffect(() => {
    let alive = true
    import("./template-editor")
      .then((mod) => {
        if (alive) setEditor(() => mod.TemplateEditor)
      })
      .catch((error) => {
        console.error(error)
      })
    return () => {
      alive = false
    }
  }, [])
  const fallback = <FallbackEditor value={value} onChange={onChange} />
  if (!Editor) return fallback
  return (
    <EditorBoundary fallback={fallback}>
      <div data-editor="cm" className="h-[640px] overflow-hidden rounded-2xl bg-white dark:bg-zinc-950">
        <Editor value={value} onChange={onChange} />
      </div>
    </EditorBoundary>
  )
}

export function TemplateStudio({
  data,
  email,
}: {
  data: TemplateDetail
  email: string
}) {
  const { t } = useI18n()
  const router = useRouter()
  const [html, setHtml] = useState(data.template.html)
  const [name, setName] = useState(data.template.name)
  const [category, setCategory] = useState(data.template.category)
  const [contactId, setContactId] = useState("")
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop")
  const [scheme, setScheme] = useState<"light" | "dark">("light")
  const [pane, setPane] = useState<"code" | "preview">("code")
  const [testTo, setTestTo] = useState(email)
  const [saved, setSaved] = useState(true)
  const [advanced, setAdvanced] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        await api(`/api/app/templates/${data.template.id}`, {
          method: "PATCH",
          body: JSON.stringify({ html, name, category }),
        })
        setSaved(true)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save")
      }
    }, 500)
    return () => window.clearTimeout(timer)
  }, [html, name, category, data.template.id])

  const contact = data.contacts.find((item) => item.id === contactId)
  const variables = useMemo(() => {
    const base: Record<string, string> = {
      first_name: contact?.firstName || "Anna",
      last_name: contact?.lastName || "Lindström",
      email: contact?.email || "anna@linden.studio",
      company: contact?.company || "Linden Studio",
      sender_name: "Linden Studio",
      company_address: "Linden Studio\nHornsgatan 82\n118 21 Stockholm",
      unsubscribe_url: "#unsubscribe",
      preheader: "A short preview of the letter.",
      cta_url: "https://example.com",
      ...(contact?.properties || {}),
    }
    return base
  }, [contact])
  const preview = useMemo(() => {
    const rendered = interpolate(html, variables, { escapeHtml: true })
    return rendered.replace("</head>", `<meta name="color-scheme" content="${scheme}"><style>:root{color-scheme:${scheme}}</style></head>`)
  }, [html, variables, scheme])
  const chips = extractVariables(html)

  async function sendTest() {
    try {
      await api(`/api/app/templates/${data.template.id}/test`, {
        method: "POST",
        body: JSON.stringify({ to: testTo, contactId, domainId: data.domains.find((item) => item.status === "verified")?.id || data.domains[0]?.id }),
      })
      toast.success(t("templates.sendTest"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Test failed")
    }
  }

  function insert(token: string) {
    setHtml((current) => `${current}\n${token}`)
    setSaved(false)
  }

  return (
    <div className="grid gap-3">
      <header className="glass flex flex-wrap items-center gap-3 rounded-3xl px-4 py-3">
        <Input value={name} onChange={(event) => { setName(event.target.value); setSaved(false) }} className="h-10 max-w-xs bg-white/50 font-medium" />
        <span className="text-xs text-muted-foreground">{saved ? t("common.saved") : t("common.saving")}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select value={contactId} onChange={(event) => setContactId(event.target.value)} className="h-9 rounded-full border bg-white/50 px-3 text-sm dark:bg-white/5">
            <option value="">{t("templates.sample")}</option>
            {data.contacts.map((item) => (
              <option key={item.id} value={item.id}>{item.firstName || item.email}</option>
            ))}
          </select>
          <Button variant={device === "desktop" ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setDevice("desktop")}>{t("templates.desktop")}</Button>
          <Button variant={device === "mobile" ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setDevice("mobile")}>{t("templates.mobile")}</Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => setScheme((value) => value === "dark" ? "light" : "dark")}>
            {scheme === "dark" ? t("shell.dark") : t("shell.light")}
          </Button>
          <Button variant="outline" size="sm" className="rounded-full lg:hidden" onClick={() => setPane((value) => value === "code" ? "preview" : "code")}>
            {pane === "code" ? t("templates.preview") : t("templates.code")}
          </Button>
        </div>
      </header>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <button key={chip.key} type="button" onClick={() => insert(`{{${chip.key}${chip.fallback != null ? ` | "${chip.fallback}"` : ""}}}`)} className="rounded-full bg-white/70 px-2.5 py-1 text-xs dark:bg-white/10">
            {chip.key}{chip.fallback != null ? ` → ${chip.fallback}` : ""}
          </button>
        ))}
        <button type="button" className="rounded-full px-2.5 py-1 text-xs text-muted-foreground" onClick={() => insert('{{first_name | "there"}}')}>{t("templates.insert")} first_name</button>
      </div>
      <div className="grid min-h-[680px] gap-3 lg:grid-cols-2">
        <section className={`glass h-[680px] overflow-hidden rounded-3xl p-2 ${pane === "preview" ? "hidden lg:block" : ""}`}>
          <HtmlEditor value={html} onChange={(value) => { setHtml(value); setSaved(false) }} />
        </section>
        <section className={`glass flex min-h-[560px] flex-col rounded-3xl p-4 ${pane === "code" ? "hidden lg:flex" : "flex"}`}>
          <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>{t("templates.previewAs")}</span>
            <span>{contact?.email || t("templates.sample")}</span>
          </div>
          <div className="flex flex-1 justify-center overflow-hidden rounded-2xl bg-[#dfe3ea] p-3 dark:bg-black/30">
            <iframe
              title="Preview"
              sandbox=""
              srcDoc={preview}
              className="h-full rounded-xl bg-white shadow-sm transition-all duration-200"
              style={{ width: device === "mobile" ? 390 : "100%" }}
            />
          </div>
        </section>
      </div>
      <footer className="glass flex flex-wrap items-end gap-2 rounded-3xl p-4">
        <label className="grid gap-1 text-sm">
          {t("templates.testTo")}
          <Input value={testTo} onChange={(event) => setTestTo(event.target.value)} className="w-64 bg-white/50" />
        </label>
        <Button className="h-10 rounded-full" onClick={sendTest}>{t("templates.sendTest")}</Button>
        <Button variant="outline" className="rounded-full" onClick={async () => {
          const copy = await api<{ id: string }>(`/api/app/templates/${data.template.id}/duplicate`, { method: "POST", body: "{}" })
          router.push(`/templates/${copy.id}`)
        }}>{t("templates.duplicate")}</Button>
        <button type="button" className="text-sm text-muted-foreground" onClick={() => setAdvanced((value) => !value)}>{t("common.advanced")}</button>
        {advanced ? (
          <label className="grid gap-1 text-sm">
            {t("templates.category")}
            <select value={category} onChange={(event) => { setCategory(event.target.value); setSaved(false) }} className="h-9 rounded-lg border bg-transparent px-2">
              <option value="marketing">{t("templates.marketing")}</option>
              <option value="transactional">{t("templates.transactional")}</option>
            </select>
          </label>
        ) : null}
        <span className="sr-only">{t(`templates.${category}` as MessageKey)}</span>
      </footer>
    </div>
  )
}
