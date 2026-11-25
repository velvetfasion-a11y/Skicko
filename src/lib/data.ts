import { prisma } from "./prisma"
import { resendConfigured, transportKind } from "./email/transport"
import { hashApiKey } from "./api/keys"
import { marketingEligible } from "./audience/eligibility"
import { parseRecords } from "./dns/records"
import { suggestEmail } from "./audience/typos"

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null
}

function propertiesOf(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const [key, item] of Object.entries(parsed)) {
      if (typeof item === "string") out[key] = item
    }
    return out
  } catch {
    return {}
  }
}

export async function loadShell(workspaceId: string) {
  const contacts = await prisma.contact.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    take: 12,
    select: { id: true, email: true, firstName: true, lastName: true },
  })
  return { transport: transportKind(), contacts }
}

export async function loadOverview(workspaceId: string) {
  const [messages, unsubscribed, campaigns, domains, events, webhooks] = await Promise.all([
    prisma.message.groupBy({ by: ["status"], where: { workspaceId }, _count: { _all: true } }),
    prisma.contact.count({ where: { workspaceId, status: "unsubscribed" } }),
    prisma.campaign.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { list: { select: { name: true } } },
    }),
    prisma.sendingDomain.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
    prisma.contactEvent.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 6, include: { contact: true } }),
    prisma.webhookEvent.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 4 }),
  ])
  const count = (status: string) => messages.find((row) => row.status === status)?._count._all ?? 0
  const sent = count("sent") + count("delivered") + count("bounced") + count("complained")
  const delivered = count("delivered")
  return {
    stats: {
      sent,
      delivered,
      bounced: count("bounced"),
      complaints: count("complained"),
      unsubscribed,
      rate: sent ? Math.round((delivered / sent) * 100) : 0,
    },
    campaigns: campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      subject: campaign.subject,
      list: campaign.list?.name ?? "",
      updatedAt: campaign.updatedAt.toISOString(),
    })),
    domains: domains.map(serializeDomain),
    activity: [
      ...events.map((event) => ({
        id: event.id,
        label: `${event.contact.email} · ${event.type.replaceAll("_", " ")}`,
        at: event.createdAt.toISOString(),
      })),
      ...webhooks.map((event) => ({
        id: event.id,
        label: `${event.email || "Provider"} · ${event.type}`,
        at: event.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 8),
  }
}

function serializeDomain(domain: {
  id: string
  domain: string
  status: string
  provider: string
  detail: string
  recordsJson: string
  lastChecked: Date | null
}) {
  return {
    id: domain.id,
    domain: domain.domain,
    status: domain.status,
    provider: domain.provider,
    detail: domain.detail,
    records: parseRecords(domain.recordsJson),
    lastChecked: iso(domain.lastChecked),
  }
}

export async function loadSettings(workspaceId: string) {
  const [workspace, domains] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } }),
    prisma.sendingDomain.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
  ])
  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      senderName: workspace.senderName,
      replyTo: workspace.replyTo,
      companyAddress: workspace.companyAddress,
    },
    domains: domains.map(serializeDomain),
    transport: transportKind(),
    resendConnected: resendConfigured(),
  }
}

export async function loadTemplates(workspaceId: string) {
  const templates = await prisma.template.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" } })
  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    html: template.html,
    updatedAt: template.updatedAt.toISOString(),
  }))
}

export async function loadTemplate(workspaceId: string, id: string) {
  const [template, contacts, domains] = await Promise.all([
    prisma.template.findFirst({ where: { id, workspaceId } }),
    prisma.contact.findMany({ where: { workspaceId }, orderBy: { firstName: "asc" }, take: 100 }),
    prisma.sendingDomain.findMany({ where: { workspaceId }, orderBy: { domain: "asc" } }),
  ])
  if (!template) return null
  return {
    template: {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      html: template.html,
    },
    contacts: contacts.map((contact) => ({
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      company: contact.company,
      properties: propertiesOf(contact.properties),
    })),
    domains: domains.map((domain) => ({ id: domain.id, domain: domain.domain, status: domain.status })),
  }
}

export async function loadAudience(workspaceId: string) {
  const [contacts, lists, forms, suppressions] = await Promise.all([
    prisma.contact.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      include: { lists: { include: { list: true } } },
    }),
    prisma.list.findMany({ where: { workspaceId }, orderBy: { name: "asc" }, include: { _count: { select: { members: true } } } }),
    prisma.signupForm.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" }, include: { list: true } }),
    prisma.suppression.findMany({ where: { workspaceId } }),
  ])
  const suppressed = new Map(suppressions.map((row) => [row.email, row.reason]))
  return {
    contacts: contacts.map((contact) => ({
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      company: contact.company,
      status: contact.status,
      consentStatus: contact.consentStatus,
      consentedAt: iso(contact.consentedAt),
      consentSource: contact.consentSource,
      consentTextVersion: contact.consentTextVersion,
      suggestion: suggestEmail(contact.email),
      suppression: suppressed.get(contact.email) ?? null,
      lists: contact.lists.map((item) => item.list.name),
      createdAt: contact.createdAt.toISOString(),
    })),
    lists: lists.map((list) => ({
      id: list.id,
      name: list.name,
      description: list.description,
      count: list._count.members,
    })),
    forms: forms.map((form) => ({
      id: form.id,
      name: form.name,
      headline: form.headline,
      description: form.description,
      buttonLabel: form.buttonLabel,
      doubleOptIn: form.doubleOptIn,
      consentText: form.consentText,
      listId: form.listId,
      listName: form.list?.name ?? "",
    })),
  }
}

export async function loadCampaigns(workspaceId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    include: { list: true, template: true },
  })
  return campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    subject: campaign.subject,
    list: campaign.list?.name ?? "",
    template: campaign.template?.name ?? "",
    updatedAt: campaign.updatedAt.toISOString(),
  }))
}

export async function loadCampaign(workspaceId: string, id: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id, workspaceId },
    include: { workspace: true },
  })
  if (!campaign) return null
  const [templates, domains, lists, members, suppressedRows, groups] = await Promise.all([
    prisma.template.findMany({ where: { workspaceId, category: "marketing" }, orderBy: { name: "asc" } }),
    prisma.sendingDomain.findMany({ where: { workspaceId }, orderBy: { domain: "asc" } }),
    prisma.list.findMany({ where: { workspaceId }, orderBy: { name: "asc" } }),
    prisma.listMember.findMany({ where: { list: { workspaceId } }, include: { contact: true } }),
    prisma.suppression.findMany({ where: { workspaceId }, select: { email: true } }),
    prisma.campaignRecipient.groupBy({ by: ["status"], where: { campaignId: id }, _count: { _all: true } }),
  ])
  const suppressed = new Set(suppressedRows.map((row) => row.email))
  const counts = new Map<string, { total: number; eligible: number }>()
  for (const list of lists) counts.set(list.id, { total: 0, eligible: 0 })
  for (const member of members) {
    const bucket = counts.get(member.listId)
    if (!bucket) continue
    bucket.total += 1
    if (marketingEligible(member.contact, suppressed.has(member.contact.email))) bucket.eligible += 1
  }
  const progress = Object.fromEntries(groups.map((row) => [row.status, row._count._all]))
  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      subject: campaign.subject,
      preheader: campaign.preheader,
      fromName: campaign.fromName,
      fromLocalPart: campaign.fromLocalPart,
      replyTo: campaign.replyTo,
      domainId: campaign.domainId,
      templateId: campaign.templateId,
      listId: campaign.listId,
      status: campaign.status,
      step: campaign.step,
      testSentAt: iso(campaign.testSentAt),
      startedAt: iso(campaign.startedAt),
    },
    address: campaign.workspace.companyAddress,
    templates: templates.map((template) => ({ id: template.id, name: template.name, description: template.description })),
    domains: domains.map((domain) => ({ id: domain.id, domain: domain.domain, status: domain.status })),
    lists: lists.map((list) => ({
      id: list.id,
      name: list.name,
      total: counts.get(list.id)?.total ?? 0,
      eligible: counts.get(list.id)?.eligible ?? 0,
    })),
    progress,
  }
}

export async function loadDevelopers(workspaceId: string) {
  const [keys, logs, templates, domains] = await Promise.all([
    prisma.apiKey.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } }),
    prisma.apiLog.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.template.findMany({ where: { workspaceId }, orderBy: { name: "asc" } }),
    prisma.sendingDomain.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
  ])
  const demo = process.env.DEMO_API_KEY || ""
  const demoHash = demo && process.env.NODE_ENV !== "production" ? hashApiKey(demo) : ""
  const live = keys.find((key) => !key.revokedAt && key.hash === demoHash)
  const fallback = keys.find((key) => !key.revokedAt)
  return {
    keys: keys.map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      lastUsedAt: iso(key.lastUsedAt),
      revokedAt: iso(key.revokedAt),
      createdAt: key.createdAt.toISOString(),
    })),
    snippetKey: live ? demo : `${fallback?.prefix ?? "sk_live_"}…`,
    logs: logs.map((log) => ({
      id: log.id,
      method: log.method,
      path: log.path,
      status: log.status,
      at: log.createdAt.toISOString(),
      request: log.requestBody,
      response: log.responseBody,
    })),
    templates: templates.map((template) => ({ id: template.id, name: template.name })),
    from: domains[0] ? `${domains[0].domain}` : "",
    verifiedFrom: (domains.find((domain) => domain.status === "verified") ?? domains[0])?.domain ?? "",
  }
}

export type OverviewData = Awaited<ReturnType<typeof loadOverview>>
export type SettingsData = Awaited<ReturnType<typeof loadSettings>>
export type AudienceData = Awaited<ReturnType<typeof loadAudience>>
export type CampaignDetail = NonNullable<Awaited<ReturnType<typeof loadCampaign>>>
export type TemplateDetail = NonNullable<Awaited<ReturnType<typeof loadTemplate>>>
export type DevelopersData = Awaited<ReturnType<typeof loadDevelopers>>
