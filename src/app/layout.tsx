import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Inter } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { I18nProvider } from "@/components/i18n-provider"
import { getLocale } from "@/lib/i18n/locale"
import { BRAND } from "@/lib/brand"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.tagline,
}

export const instant = false

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale()
  return (
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ThemeProvider>
          <I18nProvider locale={locale}>
            <TooltipProvider>
              <div className="canvas">{children}</div>
              <Toaster position="top-center" />
            </TooltipProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
