"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Code2, FileCode2, Inbox, LayoutDashboard, Moon, Search, Send, Settings, Sun, Users } from "lucide-react"
import { BRAND } from "@/lib/brand"
import { useI18n } from "@/components/i18n-provider"
import { api } from "@/lib/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { MessageKey } from "@/lib/i18n/messages"
import { cn } from "cn"

const NAV: { href: string; key: MessageKey; icon: typeof Send }[] = [
  { href: "/overview", key: "nav.overview", icon: LayoutDashboard },
  { href: "/campaigns", key: "nav.campaigns", icon: Send },
  { href: "/templates", key: "nav.templates", icon: FileCode2 },
  { href: "/audience", key: "nav.audience", icon: Users },
  { href: "/developers", key: "nav.developers", icon: Code2 },
]

type Contact = { id: string; email: string; firstName: string; lastName: string }

export function AppShell({
  user,
  workspace,
  transport,
  contacts,
  children,
}: {
  user: { name: string; email: string }
  workspace: { name: string }
  transport: string
  contacts: Contact[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { t, locale, setLocale } = useI18n()
  const { setTheme } = useTheme()
  const [palette, setPalette] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [inbox, setInbox] = useState(false)
  const [messages, setMessages] = useState<{ id: string; toEmail: string; subject: string; status: string; createdAt: string; html: string }[]>([])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setPalette((open) => !open)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  async function openInbox() {
    setInbox(true)
    const data = await api<{ messages: typeof messages }>("/api/app/inbox")
    setMessages(data.messages)
  }

  function go(href: string) {
    setPalette(false)
    setMobile(false)
    router.push(href)
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobile(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors duration-200",
              active
                ? "bg-white/75 text-foreground shadow-sm dark:bg-white/10"
                : "text-muted-foreground hover:bg-white/45 hover:text-foreground dark:hover:bg-white/5",
            )}
          >
            <Icon className="size-4" />
            {t(item.key)}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] gap-3 p-3 pb-24 md:pb-3">
      <aside className="glass sticky top-3 hidden h-[calc(100vh-1.5rem)] w-[228px] shrink-0 flex-col rounded-3xl p-3 md:flex">
        <Link href="/overview" className="mb-6 flex items-center gap-2.5 px-2 pt-2">
          <Mark />
          <div>
            <div className="text-sm font-semibold tracking-tight">{BRAND.name}</div>
            <div className="text-xs text-muted-foreground">{workspace.name}</div>
          </div>
        </Link>
        {nav}
        <div className="mt-auto px-2 pb-2 text-[11px] text-muted-foreground">{t("inbox.transport")}: {transport}</div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <header className="glass flex h-14 items-center gap-2 rounded-2xl px-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobile(true)} aria-label="Menu">
            <Mark />
          </Button>
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="flex h-9 flex-1 items-center gap-2 rounded-full bg-white/45 px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-white/70 dark:bg-white/5 dark:hover:bg-white/10 md:max-w-sm"
          >
            <Search className="size-4" />
            <span className="flex-1">{t("shell.placeholder")}</span>
            <kbd className="hidden rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] dark:bg-white/10 sm:inline">⌘K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1">
            {transport === "console" ? (
              <Button variant="ghost" size="icon" onClick={openInbox} aria-label={t("shell.inbox")}>
                <Inbox className="size-4" />
              </Button>
            ) : null}
            <Button variant="ghost" size="icon" onClick={() => go("/settings")} aria-label={t("shell.settings")}>
              <Settings className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-9 items-center gap-2 rounded-full bg-white/50 px-2 pr-3 text-sm dark:bg-white/10">
                <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-32 truncate sm:inline">{user.name}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5 text-xs text-muted-foreground">{user.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTheme("light")}><Sun className="size-4" />{t("shell.light")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}><Moon className="size-4" />{t("shell.dark")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>{t("shell.system")}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocale(locale === "sv" ? "en" : "sv")}>
                  {locale === "sv" ? t("shell.english") : t("shell.swedish")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => go("/settings")}>{t("shell.settings")}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await api("/api/auth/logout", { method: "POST", body: "{}" })
                    router.push("/login")
                    router.refresh()
                  }}
                >
                  {t("shell.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <nav className="glass fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-2xl px-2 py-1.5 md:hidden">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-0.5 px-2 py-1 text-[10px]", active ? "text-foreground" : "text-muted-foreground")}>
              <Icon className="size-4" />
              {t(item.key)}
            </Link>
          )
        })}
      </nav>
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="glass w-[260px] border-0">
          <SheetHeader>
            <SheetTitle>{BRAND.name}</SheetTitle>
          </SheetHeader>
          <div className="px-4">{nav}</div>
        </SheetContent>
      </Sheet>
      <Sheet open={inbox} onOpenChange={setInbox}>
        <SheetContent className="glass w-full border-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t("inbox.title")}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 overflow-auto px-4 pb-6">
            {messages.length === 0 ? <p className="text-sm text-muted-foreground">{t("inbox.empty")}</p> : null}
            {messages.map((message) => (
              <article key={message.id} className="rounded-2xl bg-white/55 p-3 dark:bg-white/5">
                <div className="text-sm font-medium">{message.subject}</div>
                <div className="text-xs text-muted-foreground">{message.toEmail} · {message.status}</div>
                <iframe title={message.subject} sandbox="" srcDoc={message.html} className="mt-2 h-40 w-full rounded-xl bg-white" />
              </article>
            ))}
          </div>
        </SheetContent>
      </Sheet>
      <CommandDialog open={palette} onOpenChange={setPalette}>
        <CommandInput placeholder={t("shell.placeholder")} />
        <CommandList>
          <CommandEmpty>{t("cmd.empty")}</CommandEmpty>
          <CommandGroup heading={t("cmd.go")}>
            {NAV.map((item) => (
              <CommandItem key={item.href} onSelect={() => go(item.href)}>{t(item.key)}</CommandItem>
            ))}
            <CommandItem onSelect={() => go("/settings")}>{t("shell.settings")}</CommandItem>
          </CommandGroup>
          <CommandGroup heading={t("cmd.actions")}>
            <CommandItem onSelect={() => go("/campaigns/new")}>{t("campaigns.new")}</CommandItem>
            <CommandItem onSelect={() => go("/audience?import=1")}>{t("audience.import")}</CommandItem>
            <CommandItem onSelect={() => go("/developers")}>{t("developers.createKey")}</CommandItem>
          </CommandGroup>
          <CommandGroup heading={t("cmd.contacts")}>
            {contacts.map((contact) => (
              <CommandItem key={contact.id} onSelect={() => go(`/audience?contact=${contact.id}`)}>
                {(contact.firstName || contact.email) + (contact.lastName ? ` ${contact.lastName}` : "")}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  )
}

function Mark() {
  return (
    <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
      <Send className="size-4" />
    </span>
  )
}
