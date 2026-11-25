"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api } from "@/lib/client"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { StatusPill } from "@/components/status-pill"
import { CopyButton } from "@/components/copy-button"
import { displayHost } from "@/lib/dns/records"
import type { SettingsData } from "@/lib/data"
import type { MessageKey } from "@/lib/i18n/messages"

export function SettingsView({ data }: { data: SettingsData }) {
  const { t } = useI18n()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [domain, setDomain] = useState("")
  const [provider, setProvider] = useState<"resend" | "ses">("resend")
  const [advanced, setAdvanced] = useState(false)

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    try {
      await api("/api/app/settings", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.get("name"),
          senderName: form.get("senderName"),
          replyTo: form.get("replyTo"),
          companyAddress: form.get("companyAddress"),
        }),
      })
      toast.success(t("common.saved"))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save")
    } finally {
      setPending(false)
    }
  }

  async function addDomain(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await api("/api/app/domains", { method: "POST", body: JSON.stringify({ domain, provider }) })
      setDomain("")
      toast.success(t("common.saved"))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add domain")
    } finally {
      setPending(false)
    }
  }

  async function verify(id: string) {
    setPending(true)
    try {
      const result = await api<{ status: string; detail: string }>(`/api/app/domains/${id}/verify`, { method: "POST", body: "{}" })
      toast(result.detail)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="glass rounded-3xl p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("settings.lead")}</p>
        <form onSubmit={save} className="mt-5 grid gap-3">
          <label className="grid gap-1.5 text-sm">
            {t("settings.workspace")}
            <Input name="name" defaultValue={data.workspace.name} required />
          </label>
          <label className="grid gap-1.5 text-sm">
            {t("settings.sender")}
            <Input name="senderName" defaultValue={data.workspace.senderName} required />
          </label>
          <label className="grid gap-1.5 text-sm">
            {t("settings.reply")}
            <Input name="replyTo" type="email" defaultValue={data.workspace.replyTo} required />
          </label>
          <label className="grid gap-1.5 text-sm">
            {t("settings.address")}
            <Textarea name="companyAddress" defaultValue={data.workspace.companyAddress} rows={4} />
            <span className="text-xs text-muted-foreground">{t("settings.addressHint")}</span>
          </label>
          <Button type="submit" disabled={pending} className="h-10 w-fit rounded-full px-5">{pending ? t("common.saving") : t("common.save")}</Button>
        </form>
      </section>
      <section className="glass rounded-3xl p-6">
        <h2 className="text-xl font-semibold tracking-tight">{t("domains.title")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("domains.lead")}</p>
        <form onSubmit={addDomain} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder={t("domains.placeholder")} required />
          <Button type="submit" disabled={pending} className="rounded-full">{t("domains.add")}</Button>
        </form>
        <button type="button" className="mt-2 text-xs text-muted-foreground" onClick={() => setAdvanced((value) => !value)}>{t("common.advanced")}</button>
        {advanced ? (
          <label className="mt-2 grid gap-1 text-sm">
            {t("domains.provider")}
            <select value={provider} onChange={(event) => setProvider(event.target.value as "resend" | "ses")} className="h-9 rounded-lg border bg-transparent px-2">
              <option value="resend">Resend</option>
              <option value="ses">Amazon SES</option>
            </select>
          </label>
        ) : null}
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{t("domains.note")}</p>
        <div className="mt-4 grid gap-3">
          {data.domains.length === 0 ? <p className="text-sm text-muted-foreground">{t("domains.empty")}</p> : null}
          {data.domains.map((item) => (
            <article key={item.id} className="rounded-2xl bg-white/50 p-4 dark:bg-white/5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{item.domain}</div>
                  <div className="text-xs text-muted-foreground">{item.provider}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={item.status} label={t(`status.${item.status}` as MessageKey)} />
                  <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={pending} onClick={() => verify(item.id)}>{t("domains.verify")}</Button>
                </div>
              </div>
              {item.detail ? <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p> : null}
              <div className="mt-3 grid gap-2">
                {item.records.map((record, index) => (
                  <div key={`${record.host}-${index}`} className="rounded-xl bg-background/70 p-3 text-xs">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-medium uppercase">{record.key} · {record.type}</span>
                      <CopyButton value={`${displayHost(record.host, item.domain)} ${record.type} ${record.value}`} />
                    </div>
                    <div className="font-mono break-all text-muted-foreground">{displayHost(record.host, item.domain)}</div>
                    <div className="mt-1 font-mono break-all">{record.value}</div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
