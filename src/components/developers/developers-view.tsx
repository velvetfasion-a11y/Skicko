"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { api } from "@/lib/client"
import { apiSnippets } from "@/lib/api/snippets"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CopyButton } from "@/components/copy-button"
import { formatDate } from "@/lib/format"
import type { DevelopersData } from "@/lib/data"

export function DevelopersView({ data, origin, email, senderName }: { data: DevelopersData; origin: string; email: string; senderName: string }) {
  const { t, locale } = useI18n()
  const [revealed, setRevealed] = useState("")
  const [name, setName] = useState("Production")
  const [to, setTo] = useState(email)
  const [subject, setSubject] = useState("Hello from the API")
  const [templateId, setTemplateId] = useState(data.templates[0]?.id || "")
  const [category, setCategory] = useState<"transactional" | "marketing">("transactional")
  const [result, setResult] = useState("")
  const [tab, setTab] = useState<"curl" | "node" | "python">("curl")
  const key = revealed || data.snippetKey
  const from = data.verifiedFrom ? `${senderName} <hello@${data.verifiedFrom}>` : `${senderName} <hello@example.com>`
  const snippets = useMemo(
    () => apiSnippets({ origin, apiKey: key, templateId: templateId || "TEMPLATE_ID", from }),
    [origin, key, templateId, from],
  )

  return (
    <div className="grid gap-3">
      <header className="glass rounded-3xl px-6 py-6">
        <h1 className="text-3xl font-semibold tracking-tight">{t("developers.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("developers.lead")}</p>
      </header>
      <section className="glass rounded-3xl p-5">
        <h2 className="font-medium">{t("developers.keys")}</h2>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={async (event) => {
          event.preventDefault()
          try {
            const created = await api<{ token: string }>("/api/app/keys", { method: "POST", body: JSON.stringify({ name }) })
            setRevealed(created.token)
            toast.success(t("developers.once"))
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not create a key")
          }
        }}>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("developers.keyName")} className="max-w-xs bg-white/50" />
          <Button className="rounded-full">{t("developers.createKey")}</Button>
        </form>
        {revealed ? (
          <div className="mt-3 rounded-2xl bg-amber-500/10 p-3 text-sm">
            <p>{t("developers.once")}</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="break-all font-mono text-xs">{revealed}</code>
              <CopyButton value={revealed} />
            </div>
          </div>
        ) : null}
        <ul className="mt-4 divide-y divide-foreground/8">
          {data.keys.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="font-mono text-xs text-muted-foreground">{item.prefix}…</div>
                <div className="text-xs text-muted-foreground">{t("developers.lastUsed")}: {item.lastUsedAt ? formatDate(item.lastUsedAt, locale) : t("developers.never")}</div>
              </div>
              {item.revokedAt ? <span className="text-xs text-muted-foreground">{t("developers.revoke")}</span> : (
                <Button variant="ghost" size="sm" onClick={async () => {
                  await api(`/api/app/keys/${item.id}`, { method: "DELETE" })
                  window.location.reload()
                }}>{t("developers.revoke")}</Button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="glass rounded-3xl p-5">
        <div className="mb-3 flex gap-2">
          {(["curl", "node", "python"] as const).map((item) => (
            <Button key={item} variant={tab === item ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setTab(item)}>
              {t(`developers.${item}`)}
            </Button>
          ))}
          <CopyButton value={snippets[tab]} />
        </div>
        <pre className="overflow-auto rounded-2xl bg-black/85 p-4 text-xs leading-5 text-white">{snippets[tab]}</pre>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <label className="grid gap-1 text-sm">{t("developers.to")}<Input value={to} onChange={(event) => setTo(event.target.value)} /></label>
          <label className="grid gap-1 text-sm">{t("developers.subject")}<Input value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
          <label className="grid gap-1 text-sm">{t("developers.template")}
            <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="h-9 rounded-lg border bg-transparent px-2">
              {data.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">{t("developers.category")}
            <select value={category} onChange={(event) => setCategory(event.target.value as "transactional" | "marketing")} className="h-9 rounded-lg border bg-transparent px-2">
              <option value="transactional">{t("templates.transactional")}</option>
              <option value="marketing">{t("templates.marketing")}</option>
            </select>
          </label>
        </div>
        <Button className="mt-3 rounded-full" onClick={async () => {
          try {
            const response = await api("/api/app/test-send", {
              method: "POST",
              body: JSON.stringify({ to, subject, templateId, category, variables: { first_name: "Anna" } }),
            })
            setResult(JSON.stringify(response, null, 2))
            toast.success(t("developers.run"))
          } catch (error) {
            setResult(error instanceof Error ? error.message : "Request failed")
          }
        }}>{t("developers.run")}</Button>
        {result ? <pre className="mt-3 overflow-auto rounded-2xl bg-white/60 p-3 text-xs dark:bg-black/30">{result}</pre> : null}
      </section>
      <section className="glass rounded-3xl p-5">
        <h2 className="font-medium">{t("developers.logs")}</h2>
        {data.logs.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{t("developers.emptyLogs")}</p> : null}
        <ul className="mt-2 divide-y divide-foreground/8">
          {data.logs.map((log) => (
            <li key={log.id} className="py-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs">{log.method} {log.path}</span>
                <span>{log.status} · {formatDate(log.at, locale)}</span>
              </div>
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-muted-foreground">{t("common.advanced")}</summary>
                <pre className="mt-2 overflow-auto text-[11px] text-muted-foreground">{log.request}\n{log.response}</pre>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
