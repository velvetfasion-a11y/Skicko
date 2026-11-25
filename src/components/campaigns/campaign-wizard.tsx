"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api } from "@/lib/client"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusPill } from "@/components/status-pill"
import type { CampaignDetail } from "@/lib/data"
import type { MessageKey } from "@/lib/i18n/messages"

export function CampaignList({
  campaigns,
}: {
  campaigns: { id: string; name: string; status: string; subject: string; list: string; template: string }[]
}) {
  const { t } = useI18n()
  const router = useRouter()
  return (
    <div className="grid gap-3">
      <header className="glass flex flex-wrap items-end justify-between gap-3 rounded-3xl px-6 py-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("campaigns.title")}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{t("campaigns.lead")}</p>
        </div>
        <Button className="h-10 rounded-full" onClick={() => router.push("/campaigns/new")}>{t("campaigns.new")}</Button>
      </header>
      {campaigns.length === 0 ? <p className="text-sm text-muted-foreground">{t("campaigns.empty")}</p> : null}
      <ul className="glass divide-y divide-foreground/8 rounded-3xl px-4">
        {campaigns.map((campaign) => (
          <li key={campaign.id}>
            <Link href={`/campaigns/${campaign.id}`} className="flex items-center justify-between gap-3 py-4">
              <div>
                <div className="font-medium">{campaign.name}</div>
                <div className="text-xs text-muted-foreground">{campaign.subject || campaign.template} {campaign.list ? `· ${campaign.list}` : ""}</div>
              </div>
              <StatusPill status={campaign.status} label={t(`status.${campaign.status}` as MessageKey)} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function NewCampaign() {
  const router = useRouter()
  const { t } = useI18n()
  useEffect(() => {
    if (sessionStorage.getItem("sk_new_campaign") === "1") return
    sessionStorage.setItem("sk_new_campaign", "1")
    api<{ id: string }>("/api/app/campaigns", { method: "POST", body: "{}" })
      .then((created) => router.replace(`/campaigns/${created.id}`))
      .catch(() => {
        sessionStorage.removeItem("sk_new_campaign")
        router.replace("/campaigns")
      })
  }, [router])
  return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
}

export function CampaignWizard({ data, email }: { data: CampaignDetail; email: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const [draft, setDraft] = useState(data.campaign)
  const [step, setStep] = useState(data.campaign.step || 1)
  const [live, setLive] = useState(data)
  const [pending, setPending] = useState(false)
  const sending = live.campaign.status === "sending" || live.campaign.status === "sent"

  useEffect(() => {
    sessionStorage.removeItem("sk_new_campaign")
  }, [])

  useEffect(() => {
    if (live.campaign.status !== "sending") return
    const timer = window.setInterval(async () => {
      const next = await api<CampaignDetail>(`/api/app/campaigns/${draft.id}`)
      setLive(next)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [live.campaign.status, draft.id])

  async function save(partial: Partial<typeof draft>, nextStep?: number) {
    const body = { ...partial, ...(nextStep ? { step: nextStep } : {}) }
    const updated = await api<CampaignDetail>(`/api/app/campaigns/${draft.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
    setDraft(updated.campaign)
    setLive(updated)
    if (nextStep) setStep(nextStep)
  }

  const list = live.lists.find((item) => item.id === draft.listId)
  const domain = live.domains.find((item) => item.id === draft.domainId)
  const checks = {
    domain: domain?.status === "verified",
    address: Boolean(live.address.trim()),
    audience: (list?.eligible ?? 0) > 0,
    test: Boolean(draft.testSentAt),
  }
  const ready = checks.domain && checks.address && checks.audience && checks.test && Boolean(draft.subject && draft.templateId)
  const total = Object.values(live.progress).reduce((sum, value) => sum + value, 0)
  const processed = total - (live.progress.queued || 0) - (live.progress.sending || 0)

  if (sending) {
    return (
      <section className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{draft.name}</h1>
          <StatusPill status={live.campaign.status} label={t(`status.${live.campaign.status}` as MessageKey)} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t("campaigns.progress", { sent: processed, total })}</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${total ? Math.round((processed / total) * 100) : 0}%` }} />
        </div>
        <ul className="mt-4 grid gap-1 text-sm text-muted-foreground">
          {Object.entries(live.progress).map(([status, count]) => (
            <li key={status}>{t(`status.${status}` as MessageKey)} · {count}</li>
          ))}
        </ul>
        {live.campaign.status === "sent" ? (
          <div className="mt-4 text-sm">
            <p>Simulate a provider event on a sent message from the console inbox, or use the buttons when a message exists.</p>
            <Simulate campaignId={draft.id} />
          </div>
        ) : null}
      </section>
    )
  }

  return (
    <div className="grid gap-3">
      <header className="glass rounded-3xl px-6 py-5">
        <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="h-11 max-w-md border-0 bg-transparent px-0 text-2xl font-semibold shadow-none" />
        <div className="mt-4 flex gap-2 text-sm">
          {[1, 2, 3].map((number) => (
            <button key={number} type="button" onClick={() => setStep(number)} className={`rounded-full px-3 py-1 ${step === number ? "bg-primary text-primary-foreground" : "bg-white/60 dark:bg-white/10"}`}>
              {number}
            </button>
          ))}
        </div>
      </header>
      {step === 1 ? (
        <section className="glass grid gap-3 rounded-3xl p-6">
          <label className="grid gap-1 text-sm">{t("campaigns.subject")}<Input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} /></label>
          <label className="grid gap-1 text-sm">{t("campaigns.preheader")}<Input value={draft.preheader} onChange={(event) => setDraft({ ...draft, preheader: event.target.value })} /></label>
          <label className="grid gap-1 text-sm">{t("campaigns.sender")}<Input value={draft.fromName} onChange={(event) => setDraft({ ...draft, fromName: event.target.value })} /></label>
          <label className="grid gap-1 text-sm">{t("campaigns.reply")}<Input value={draft.replyTo} onChange={(event) => setDraft({ ...draft, replyTo: event.target.value })} /></label>
          <label className="grid gap-1 text-sm">{t("campaigns.domain")}
            <select value={draft.domainId || ""} onChange={(event) => setDraft({ ...draft, domainId: event.target.value })} className="h-9 rounded-lg border bg-transparent px-2">
              <option value="">{t("campaigns.domain")}</option>
              {live.domains.map((item) => <option key={item.id} value={item.id}>{item.domain} · {item.status}</option>)}
            </select>
          </label>
          <div className="grid gap-2">
            <div className="text-sm">{t("campaigns.template")}</div>
            {live.templates.map((template) => (
              <button key={template.id} type="button" onClick={() => setDraft({ ...draft, templateId: template.id })} className={`rounded-2xl px-4 py-3 text-left ${draft.templateId === template.id ? "bg-primary text-primary-foreground" : "bg-white/55 dark:bg-white/5"}`}>
                <div className="font-medium">{template.name}</div>
                <div className="text-xs opacity-80">{template.description}</div>
              </button>
            ))}
          </div>
          <details>
            <summary className="cursor-pointer text-sm text-muted-foreground">{t("common.advanced")}</summary>
            <label className="mt-2 grid gap-1 text-sm">{t("campaigns.local")}
              <Input value={draft.fromLocalPart} onChange={(event) => setDraft({ ...draft, fromLocalPart: event.target.value })} />
            </label>
          </details>
          <div className="flex gap-2">
            <Button className="rounded-full" disabled={pending} onClick={async () => {
              setPending(true)
              try { await save(draft, 2) } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save") }
              setPending(false)
            }}>{t("common.next")}</Button>
          </div>
        </section>
      ) : null}
      {step === 2 ? (
        <section className="glass grid gap-3 rounded-3xl p-6">
          {live.lists.map((item) => (
            <button key={item.id} type="button" onClick={() => setDraft({ ...draft, listId: item.id })} className={`rounded-2xl px-4 py-3 text-left ${draft.listId === item.id ? "bg-primary text-primary-foreground" : "bg-white/55 dark:bg-white/5"}`}>
              <div className="font-medium">{item.name}</div>
              <div className="text-xs opacity-80">{t("campaigns.recipients", { count: item.eligible })} · {t("campaigns.excluded", { count: item.total - item.eligible })}</div>
            </button>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setStep(1)}>{t("common.back")}</Button>
            <Button className="rounded-full" onClick={() => save({ listId: draft.listId }, 3)}>{t("common.next")}</Button>
          </div>
        </section>
      ) : null}
      {step === 3 ? (
        <section className="glass grid gap-3 rounded-3xl p-6">
          <Check ok={checks.domain} label={t("preflight.domain")} href="/settings" />
          <Check ok={checks.address} label={t("preflight.address")} href="/settings" />
          <Check ok={checks.audience} label={t("preflight.audience")} />
          <Check ok={checks.test} label={t("preflight.test")} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-full" onClick={async () => {
              try {
                await save(draft)
                await api(`/api/app/campaigns/${draft.id}/test`, { method: "POST", body: JSON.stringify({ to: email }) })
                setDraft({ ...draft, testSentAt: new Date().toISOString() })
                toast.success(t("preflight.sendTest"))
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Test failed")
              }
            }}>{t("preflight.sendTest")}</Button>
            <Button className="rounded-full" disabled={!ready || pending} onClick={async () => {
              setPending(true)
              try {
                await save(draft)
                await api(`/api/app/campaigns/${draft.id}/send`, { method: "POST", body: "{}" })
                const next = await api<CampaignDetail>(`/api/app/campaigns/${draft.id}`)
                setLive(next)
                setDraft(next.campaign)
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not send")
              } finally {
                setPending(false)
              }
            }}>{t("campaigns.send")}</Button>
            <Button variant="ghost" onClick={() => setStep(2)}>{t("common.back")}</Button>
          </div>
          {ready ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{t("preflight.ready")}</p> : null}
        </section>
      ) : null}
      <button type="button" className="text-left text-xs text-muted-foreground" onClick={() => router.push("/campaigns")}>{t("common.back")}</button>
    </div>
  )
}

function Check({ ok, label, href }: { ok: boolean; label: string; href?: string }) {
  const body = (
    <div className="flex items-center justify-between rounded-2xl bg-white/50 px-4 py-3 text-sm dark:bg-white/5">
      <span>{label}</span>
      <span className={ok ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700"}>{ok ? "OK" : "Needed"}</span>
    </div>
  )
  return href && !ok ? <Link href={href}>{body}</Link> : body
}

function Simulate({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {["delivered", "bounced", "complained"].map((type) => (
        <Button key={type} variant="outline" size="sm" className="rounded-full" onClick={async () => {
          await api("/api/app/simulate", { method: "POST", body: JSON.stringify({ campaignId, type }) })
          router.refresh()
        }}>{type}</Button>
      ))}
    </div>
  )
}
