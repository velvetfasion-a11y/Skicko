export function formatDate(iso: string | null | undefined, locale: string) {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "sv" ? "sv-SE" : "en-GB").format(value)
}

export function percent(part: number, total: number) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}
