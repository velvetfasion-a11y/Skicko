"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api } from "@/lib/client"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StatusPill } from "@/components/status-pill"
import { CopyButton } from "@/components/copy-button"
import { BRAND } from "@/lib/brand"
import { formatDate } from "@/lib/format"
import type { AudienceData } from "@/lib/data"
import type { MessageKey } from "@/lib/i18n/messages"
import type { ColumnField } from "@/lib/audience/csv"

type Preview = {
  headers: string[]
  mapping: ColumnField[]
  sample: { email: string; suggestion: string | null; suppressed: boolean; duplicateInFile: boolean }[]
  counts: { ready: number; invalid: number; duplicates: number; suppressed: number; typos: number }
}

export function AudienceView({
  data,
  origin,
  initialContact,
  openImport,
}: {
  data: AudienceData
  origin: string
  initialContact?: string
  openImport?: boolean
}) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [contactId, setContactId] = useState(initialContact || "")
  const [importOpen, setImportOpen] = useState(Boolean(openImport))
  const [csv, setCsv] = useState("")
  const [preview, setPreview] = useState<Preview | null>(null)
  const [consent, setConsent] = useState(false)
  const [applyTypos, setApplyTypos] = useState(false)
  const [listId, setListId] = useState(data.lists[0]?.id || "")
  const [history, setHistory] = useState<{ type: string; detail: string; at: string }[]>([])
  const [formId, setFormId] = useState(data.forms[0]?.id || "")

  const contacts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data.contacts
    return data.contacts.filter((contact) => `${contact.email} ${contact.firstName} ${contact.lastName}`.toLowerCase().includes(q))
  }, [data.contacts, query])
  const active = data.contacts.find((contact) => contact.id === contactId)
  const form = data.forms.find((item) => item.id === formId) || data.forms[0]

  useEffect(() => {
    if (!contactId) return
    api<{ events: { type: string; detail: string; at: string }[] }>(`/api/app/contacts/${contactId}`)
      .then((result) => setHistory(result.events))
      .catch(() => setHistory([]))
  }, [contactId])

  async function runPreview(text: string, mapping?: ColumnField[]) {
    const result = await api<Preview>("/api/app/import/preview", {
      method: "POST",
      body: JSON.stringify({ csv: text, mapping }),
    })
    setPreview(result)
  }

  async function commit() {
    if (!preview) return
    try {
      const result = await api<{ imported: number }>("/api/app/import/commit", {
        method: "POST",
        body: JSON.stringify({ csv, mapping: preview.mapping, listId, consent, applyTypos }),
      })
      toast.success(`${result.imported}`)
      setImportOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed")
    }
  }

  const publicUrl = form ? `${origin}/f/${form.id}` : ""
  const iframe = `<iframe src="${publicUrl}" title="Subscribe" style="width:100%;max-width:420px;height:560px;border:0;border-radius:24px;"></iframe>`
  const script = `<script src="${origin}/embed/${form?.id}.js" async></script>`

  return (
    <div className="grid gap-3">
      <header className="glass flex flex-wrap items-end justify-between gap-3 rounded-3xl px-6 py-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("audience.title")}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{t("audience.lead")}</p>
        </div>
        <Button className="h-10 rounded-full" onClick={() => setImportOpen(true)}>{t("audience.import")}</Button>
      </header>
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">{t("audience.contacts")}</TabsTrigger>
          <TabsTrigger value="lists">{t("audience.lists")}</TabsTrigger>
          <TabsTrigger value="forms">{t("audience.forms")}</TabsTrigger>
        </TabsList>
        <TabsContent value="contacts" className="glass rounded-3xl p-4">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("audience.search")} className="mb-3 max-w-sm bg-white/50" />
          <form className="mb-4 grid gap-2 rounded-2xl bg-white/40 p-3 dark:bg-white/5 md:grid-cols-5" onSubmit={async (event) => {
            event.preventDefault()
            const formData = new FormData(event.currentTarget)
            try {
              await api("/api/app/contacts", { method: "POST", body: JSON.stringify({
                email: formData.get("email"),
                firstName: formData.get("firstName"),
                lastName: formData.get("lastName"),
                listId,
                consent: true,
              }) })
              event.currentTarget.reset()
              router.refresh()
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not add")
            }
          }}>
            <Input name="email" type="email" required placeholder={t("audience.email")} />
            <Input name="firstName" placeholder={t("audience.first")} />
            <Input name="lastName" placeholder={t("audience.last")} />
            <select name="list" value={listId} onChange={(event) => setListId(event.target.value)} className="h-8 rounded-lg border bg-transparent px-2 text-sm">
              <option value="">{t("forms.list")}</option>
              {data.lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
            </select>
            <Button type="submit" className="rounded-full">{t("audience.addContact")}</Button>
          </form>
          {contacts.length === 0 ? <p className="text-sm text-muted-foreground">{t("audience.empty")}</p> : null}
          <ul className="divide-y divide-foreground/8">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <button type="button" onClick={() => setContactId(contact.id)} className="flex w-full items-center justify-between gap-3 py-3 text-left">
                  <div>
                    <div className="text-sm font-medium">{contact.firstName || contact.lastName ? `${contact.firstName} ${contact.lastName}`.trim() : contact.email}</div>
                    <div className="text-xs text-muted-foreground">{contact.email}{contact.lists.length ? ` · ${contact.lists.join(", ")}` : ""}</div>
                    {contact.suggestion ? <div className="text-xs text-amber-700 dark:text-amber-200">{t("audience.typo", { suggestion: contact.suggestion })}</div> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {contact.suppression ? <StatusPill status="suppressed" label={t("audience.suppressed")} /> : null}
                    <StatusPill status={contact.status} label={t(`status.${contact.status}` as MessageKey)} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="lists" className="glass rounded-3xl p-4">
          <form className="mb-4 flex gap-2" onSubmit={async (event) => {
            event.preventDefault()
            const formData = new FormData(event.currentTarget)
            await api("/api/app/lists", { method: "POST", body: JSON.stringify({ name: formData.get("name") }) })
            event.currentTarget.reset()
            router.refresh()
          }}>
            <Input name="name" required placeholder={t("audience.lists")} />
            <Button className="rounded-full">{t("common.create")}</Button>
          </form>
          <ul className="grid gap-2">
            {data.lists.map((list) => (
              <li key={list.id} className="flex items-center justify-between rounded-2xl bg-white/50 px-4 py-3 dark:bg-white/5">
                <div>
                  <div className="font-medium">{list.name}</div>
                  <div className="text-xs text-muted-foreground">{list.count}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={async () => {
                  await api(`/api/app/lists/${list.id}`, { method: "DELETE" })
                  router.refresh()
                }}>{t("common.delete")}</Button>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="forms" className="grid gap-3 lg:grid-cols-[1fr_360px]">
          <div className="glass rounded-3xl p-4">
            <div className="mb-3 flex gap-2">
              <Button variant="outline" className="rounded-full" onClick={async () => {
                const created = await api<{ id: string }>("/api/app/forms", { method: "POST", body: JSON.stringify({ name: "Signup" }) })
                setFormId(created.id)
                router.refresh()
              }}>{t("forms.new")}</Button>
              <select value={form?.id || ""} onChange={(event) => setFormId(event.target.value)} className="h-9 rounded-full border bg-transparent px-3 text-sm">
                {data.forms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            {form ? (
              <form className="grid gap-3" onSubmit={async (event) => {
                event.preventDefault()
                const formData = new FormData(event.currentTarget)
                await api(`/api/app/forms/${form.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({
                    name: formData.get("name"),
                    headline: formData.get("headline"),
                    description: formData.get("description"),
                    buttonLabel: formData.get("buttonLabel"),
                    consentText: formData.get("consentText"),
                    listId: formData.get("listId"),
                    doubleOptIn: formData.get("doubleOptIn") === "on",
                  }),
                })
                toast.success(t("common.saved"))
                router.refresh()
              }}>
                <Input name="name" defaultValue={form.name} />
                <Input name="headline" defaultValue={form.headline} placeholder={t("forms.headline")} />
                <Textarea name="description" defaultValue={form.description} placeholder={t("forms.description")} />
                <Input name="buttonLabel" defaultValue={form.buttonLabel} placeholder={t("forms.button")} />
                <Textarea name="consentText" defaultValue={form.consentText} placeholder={t("forms.consent")} />
                <select name="listId" defaultValue={form.listId || ""} className="h-9 rounded-lg border bg-transparent px-2 text-sm">
                  <option value="">{t("forms.list")}</option>
                  {data.lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="doubleOptIn" defaultChecked={form.doubleOptIn} />
                  {t("forms.double")}
                </label>
                <Button className="w-fit rounded-full">{t("common.save")}</Button>
              </form>
            ) : null}
            {form ? (
              <div className="mt-4 grid gap-3 text-sm">
                <Embed label={t("forms.url")} value={publicUrl} />
                <Embed label={t("forms.iframe")} value={iframe} />
                <Embed label={t("forms.script")} value={script} />
              </div>
            ) : null}
          </div>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">{t("forms.preview")}</p>
            {form ? <iframe title={form.name} src={publicUrl} className="h-[560px] w-full rounded-3xl border-0 bg-transparent" /> : null}
          </div>
        </TabsContent>
      </Tabs>
      <Sheet open={Boolean(active)} onOpenChange={(open) => { if (!open) setContactId("") }}>
        <SheetContent className="glass w-full overflow-auto border-0 sm:max-w-md">
          {active ? (
            <>
              <SheetHeader>
                <SheetTitle>{active.email}</SheetTitle>
              </SheetHeader>
              <div className="grid gap-4 px-4 pb-8 text-sm">
                <div className="flex gap-2">
                  <StatusPill status={active.status} label={t(`status.${active.status}` as MessageKey)} />
                  {active.suppression ? <StatusPill status="suppressed" label={active.suppression} /> : null}
                </div>
                <p>{active.firstName} {active.lastName}</p>
                <div className="rounded-2xl bg-white/50 p-3 dark:bg-white/5">
                  <div className="text-xs text-muted-foreground">{t("contact.consent")}</div>
                  <div>{active.consentStatus}</div>
                  <div className="mt-2 text-xs text-muted-foreground">{t("contact.when")}: {formatDate(active.consentedAt, locale)}</div>
                  <div className="text-xs text-muted-foreground">{t("contact.source")}: {active.consentSource || "—"}</div>
                  <div className="text-xs text-muted-foreground">{t("contact.version")}: {active.consentTextVersion || "—"}</div>
                </div>
                <div>
                  <div className="mb-2 font-medium">{t("contact.history")}</div>
                  {history.length === 0 ? <p className="text-muted-foreground">{t("contact.noHistory")}</p> : null}
                  <ul className="grid gap-1">
                    {history.map((event, index) => (
                      <li key={`${event.at}-${index}`} className="text-xs text-muted-foreground">{formatDate(event.at, locale)} · {event.type} {event.detail}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="rounded-full" onClick={() => act(active.id, "unsubscribe")}>{t("contact.unsubscribe")}</Button>
                  <Button variant="outline" className="rounded-full" onClick={() => act(active.id, "suppress")}>{t("contact.suppress")}</Button>
                </div>
                <details>
                  <summary className="cursor-pointer text-xs text-muted-foreground">{t("contact.restore")}</summary>
                  <p className="mt-2 text-xs text-muted-foreground">{t("contact.restoreHint")}</p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => act(active.id, "restore")}>{t("contact.restore")}</Button>
                </details>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("import.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("import.help")}</p>
          <Input type="file" accept=".csv,text/csv" onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) return
            const text = await file.text()
            setCsv(text)
            try {
              await runPreview(text)
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not read CSV")
            }
          }} />
          {preview ? (
            <div className="grid gap-2">
              {preview.headers.map((header, index) => (
                <label key={`${header}-${index}`} className="flex items-center justify-between gap-2 text-sm">
                  <span>{header}</span>
                  <select
                    value={preview.mapping[index]}
                    className="h-8 rounded-lg border bg-transparent px-2"
                    onChange={async (event) => {
                      const mapping = [...preview.mapping]
                      mapping[index] = event.target.value as ColumnField
                      await runPreview(csv, mapping)
                    }}
                  >
                    {["email", "first_name", "last_name", "company", "ignore"].map((field) => <option key={field} value={field}>{field}</option>)}
                  </select>
                </label>
              ))}
              <p className="text-xs text-muted-foreground">
                {t("import.ready", { count: preview.counts.ready })} · {t("import.invalid", { count: preview.counts.invalid })} · {t("import.dupes", { count: preview.counts.duplicates })} · {t("import.suppressed", { count: preview.counts.suppressed })}
              </p>
              {preview.sample.filter((row) => row.suggestion).slice(0, 3).map((row) => (
                <p key={row.email} className="text-xs text-amber-700">{row.email} → {row.suggestion}</p>
              ))}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={applyTypos} onChange={(event) => setApplyTypos(event.target.checked)} />{t("import.apply")}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />{t("import.consent")}</label>
              <select value={listId} onChange={(event) => setListId(event.target.value)} className="h-9 rounded-lg border bg-transparent px-2 text-sm">
                <option value="">{t("forms.list")}</option>
                {data.lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
              </select>
              <Button className="rounded-full" onClick={commit}>{t("import.commit")}</Button>
            </div>
          ) : null}
          <p className="text-[11px] text-muted-foreground">{BRAND.name}</p>
        </DialogContent>
      </Dialog>
    </div>
  )

  async function act(id: string, action: "unsubscribe" | "suppress" | "restore") {
    await api(`/api/app/contacts/${id}`, { method: "PATCH", body: JSON.stringify({ action }) })
    router.refresh()
  }
}

function Embed({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between"><span>{label}</span><CopyButton value={value} /></div>
      <pre className="overflow-auto rounded-xl bg-white/60 p-2 text-[11px] dark:bg-black/30">{value}</pre>
    </div>
  )
}
