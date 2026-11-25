import { cookies } from "next/headers"
import type { Locale } from "./messages"

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get("sk_locale")?.value
  return value === "sv" ? "sv" : "en"
}
