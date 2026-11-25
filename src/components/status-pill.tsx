import { cn } from "cn"

const tones: Record<string, string> = {
  subscribed: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  verified: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  delivered: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  sent: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
  pending: "bg-amber-500/15 text-amber-900 dark:text-amber-100",
  queued: "bg-amber-500/15 text-amber-900 dark:text-amber-100",
  sending: "bg-amber-500/15 text-amber-900 dark:text-amber-100",
  draft: "bg-foreground/8 text-muted-foreground",
  suppressed: "bg-foreground/8 text-muted-foreground",
  unsubscribed: "bg-foreground/8 text-muted-foreground",
  bounced: "bg-red-500/12 text-red-700 dark:text-red-300",
  failed: "bg-red-500/12 text-red-700 dark:text-red-300",
  complained: "bg-red-500/12 text-red-700 dark:text-red-300",
  marketing: "bg-sky-500/12 text-sky-800 dark:text-sky-200",
  transactional: "bg-violet-500/12 text-violet-800 dark:text-violet-200",
}

export function StatusPill({ status, label }: { status: string; label: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide", tones[status] ?? tones.draft)}>
      {label}
    </span>
  )
}
