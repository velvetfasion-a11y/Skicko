function appendParam(raw: string, key: string, value: string) {
  if (new RegExp(`[?&]${key}=`).test(raw)) return raw
  return `${raw}${raw.includes("?") ? "&" : "?"}${key}=${value}`
}

/** Neon’s Vercel integration puts `-pooler` in DATABASE_URL. PgBouncer needs these flags. */
export function withPoolerParams(raw: string) {
  if (!raw.includes("-pooler")) return raw
  return appendParam(appendParam(raw, "pgbouncer", "true"), "connection_limit", "1")
}

export function ensureDirectDatabaseUrl() {
  if (!process.env.DATABASE_URL_UNPOOLED?.trim() && process.env.DATABASE_URL) {
    process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL
  }
}
