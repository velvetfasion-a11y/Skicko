"use client"

import { createContext, useCallback, useContext } from "react"
import { useRouter } from "next/navigation"
import { translate, type Locale, type MessageKey } from "@/lib/i18n/messages"

type I18nValue = {
  locale: Locale
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
  setLocale: (locale: Locale) => void
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const router = useRouter()
  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  )
  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `sk_locale=${next};path=/;max-age=31536000;samesite=lax`
      router.refresh()
    },
    [router],
  )
  return <I18nContext.Provider value={{ locale, t, setLocale }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) throw new Error("useI18n must be used within I18nProvider")
  return value
}
