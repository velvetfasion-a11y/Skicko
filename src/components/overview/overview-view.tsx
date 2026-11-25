"use client"

import Link from "next/link"
import { useI18n } from "@/components/i18n-provider"
import { StatusPill } from "@/components/status-pill"
import { formatDate } from "@/lib/format"
import type { OverviewData } from "@/lib/data"
import type { MessageKey } from "@/lib/i18n/messages"

export function OverviewView({ data, name }: { data: OverviewData; name: string }) {
  const { t, locale } = useI18n()
  const stats = [
    ["overview.sent", data.stats.sent],
    ["overview.delivered", data.stats.delivered],
    ["overview.bounced", data.stats.bounced],
    ["overview.complaints", data.stats.complaints],
    ["overview.unsubscribed", data.stats.unsubscribed],
  ] as const
  return (
    <div className="grid gap-3">
      <header className="glass rounded-3xl px-6 py-6">
        <p className="text-sm text-muted-foreground">{formatDate(new Date().toISOString(), locale)}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t("overview.hello", { name: name.split(" ")[0] || name })}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{t("overview.lead")}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/campaigns/new" className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground">{t("overview.newCampaign")}</Link>
          <Link href="/audience?import=1" className="inline-flex h-10 items-center rounded-full bg-white/60 px-4 text-sm dark:bg-white/10">{t("overview.import")}</Link>
          <Link href="/settings" className="inline-flex h-10 items-center rounded-full bg-white/60 px-4 text-sm dark:bg-white/10">{t("overview.addDomain")}</Link>
        </div>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(([key, value]) => (
          <article key={key} className="glass rounded-2xl px-4 py-4">
            <div className="text-xs text-muted-foreground">{t(key)}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
          </article>
        ))}
      </section>
      <section className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr]">
        <article className="glass rounded-3xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">{t("overview.campaigns")}</h2>
            <span className="text-xs text-muted-foreground">{t("overview.rate")} {data.stats.rate}%</span>
          </div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${data.stats.rate}%` }} />
          </div>
          {data.campaigns.length === 0 ? <p className="text-sm text-muted-foreground">{t("overview.emptyCampaigns")}</p> : null}
          <ul className="divide-y divide-foreground/8">
            {data.campaigns.map((campaign) => (
              <li key={campaign.id}>
                <Link href={`/campaigns/${campaign.id}`} className="flex items-center justify-between gap-3 py-3 transition-colors hover:opacity-80">
                  <div>
                    <div className="text-sm font-medium">{campaign.name}</div>
                    <div className="text-xs text-muted-foreground">{campaign.subject || campaign.list}</div>
                  </div>
                  <StatusPill status={campaign.status} label={t(`status.${campaign.status}` as MessageKey)} />
                </Link>
              </li>
            ))}
          </ul>
        </article>
        <div className="grid gap-3">
          <article className="glass rounded-3xl p-5">
            <h2 className="mb-3 font-medium">{t("overview.domains")}</h2>
            {data.domains.length === 0 ? <p className="text-sm text-muted-foreground">{t("domains.empty")}</p> : null}
            <ul className="grid gap-2">
              {data.domains.map((domain) => (
                <li key={domain.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{domain.domain}</span>
                  <StatusPill status={domain.status} label={t(`status.${domain.status}` as MessageKey)} />
                </li>
              ))}
            </ul>
          </article>
          <article className="glass rounded-3xl p-5">
            <h2 className="mb-3 font-medium">{t("overview.activity")}</h2>
            {data.activity.length === 0 ? <p className="text-sm text-muted-foreground">{t("overview.emptyActivity")}</p> : null}
            <ul className="grid gap-2">
              {data.activity.map((item) => (
                <li key={item.id} className="text-sm">
                  <div>{item.label}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(item.at, locale)}</div>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </div>
  )
}
