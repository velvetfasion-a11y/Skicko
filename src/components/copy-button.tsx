"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/i18n-provider"

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const { t } = useI18n()
  const [done, setDone] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full bg-white/50 dark:bg-white/5"
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setDone(true)
        window.setTimeout(() => setDone(false), 1400)
      }}
    >
      {done ? t("common.copied") : label || t("common.copy")}
    </Button>
  )
}
