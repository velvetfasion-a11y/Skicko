import { prisma } from "../prisma"
import { HttpError } from "../http"
import { isEmail, normalizeEmail } from "../email/address"
import { suggestEmail } from "./typos"
import { analyzeImport, guessMapping, parseCsv, type ColumnField } from "./csv"
import { BRAND } from "../brand"

export function parsePropertyLines(text: string) {
  const properties: Record<string, string> = {}
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed.includes("=")) continue
    const index = trimmed.indexOf("=")
    const key = trimmed.slice(0, index).trim().replace(/\s+/g, "_")
    const value = trimmed.slice(index + 1).trim()
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) properties[key] = value
  }
  return properties
}

export async function addContact(input: {
  workspaceId: string
  email: string
  firstName?: string
  lastName?: string
  company?: string
  listId?: string | null
  consent?: boolean
  source: string
}) {
  const email = normalizeEmail(input.email)
  if (!isEmail(email)) throw new HttpError("Enter a valid email address.", 400)
  const suppressed = await prisma.suppression.findUnique({
    where: { workspaceId_email: { workspaceId: input.workspaceId, email } },
  })
  const existing = await prisma.contact.findUnique({
    where: { workspaceId_email: { workspaceId: input.workspaceId, email } },
  })
  const granted = Boolean(input.consent) && !suppressed
  const contact = await prisma.contact.upsert({
    where: { workspaceId_email: { workspaceId: input.workspaceId, email } },
    create: {
      workspaceId: input.workspaceId,
      email,
      firstName: input.firstName?.trim() || "",
      lastName: input.lastName?.trim() || "",
      company: input.company?.trim() || "",
      status: suppressed ? "bounced" : granted ? "subscribed" : "pending",
      consentStatus: granted ? "granted" : "unknown",
      consentedAt: granted ? new Date() : null,
      consentSource: granted ? input.source : "",
      consentTextVersion: granted ? BRAND.consentVersion : "",
    },
    update: {
      firstName: input.firstName?.trim() || existing?.firstName || "",
      lastName: input.lastName?.trim() || existing?.lastName || "",
      company: input.company?.trim() || existing?.company || "",
      ...(granted
        ? {
            status: "subscribed",
            consentStatus: "granted",
            consentedAt: new Date(),
            consentSource: input.source,
            consentTextVersion: BRAND.consentVersion,
          }
        : {}),
    },
  })
  if (input.listId && !suppressed) {
    const list = await prisma.list.findFirst({ where: { id: input.listId, workspaceId: input.workspaceId } })
    if (!list) throw new HttpError("List not found.", 404)
    await prisma.listMember.upsert({
      where: { listId_contactId: { listId: list.id, contactId: contact.id } },
      create: { listId: list.id, contactId: contact.id },
      update: {},
    })
  }
  await prisma.contactEvent.create({
    data: { workspaceId: input.workspaceId, contactId: contact.id, type: "imported", detail: input.source },
  })
  return { contact, suppressed: Boolean(suppressed), suggestion: suggestEmail(email) }
}

export async function removeContactFromList(workspaceId: string, listId: string, email: string) {
  const list = await prisma.list.findFirst({ where: { id: listId, workspaceId } })
  if (!list) throw new HttpError("List not found.", 404)
  const contact = await prisma.contact.findUnique({
    where: { workspaceId_email: { workspaceId, email: normalizeEmail(email) } },
  })
  if (!contact) return { removed: false }
  await prisma.listMember.deleteMany({ where: { listId, contactId: contact.id } })
  return { removed: true, email: contact.email }
}

export async function previewImport(workspaceId: string, csv: string, mapping?: ColumnField[]) {
  if (csv.length > 2_000_000) throw new HttpError("CSV is larger than 2 MB.", 400)
  const parsed = parseCsv(csv)
  const chosen = mapping && mapping.length === parsed.headers.length ? mapping : guessMapping(parsed.headers)
  const [contacts, suppressions] = await Promise.all([
    prisma.contact.findMany({ where: { workspaceId }, select: { email: true } }),
    prisma.suppression.findMany({ where: { workspaceId }, select: { email: true } }),
  ])
  const plan = analyzeImport({
    headers: parsed.headers,
    rows: parsed.rows,
    mapping: chosen,
    existing: new Set(contacts.map((contact) => contact.email)),
    suppressed: new Set(suppressions.map((row) => row.email)),
  })
  return {
    headers: plan.headers,
    mapping: plan.mapping,
    invalid: plan.invalid.slice(0, 20),
    sample: plan.rows.slice(0, 8),
    counts: {
      ready: plan.ready.length,
      invalid: plan.invalid.length,
      duplicates: plan.rows.filter((row) => row.duplicateInFile).length,
      suppressed: plan.ready.filter((row) => row.suppressed).length,
      typos: plan.rows.filter((row) => row.suggestion).length,
      existing: plan.ready.filter((row) => row.alreadySaved).length,
    },
  }
}

export async function commitImport(input: {
  workspaceId: string
  csv: string
  mapping: ColumnField[]
  listId?: string | null
  consent: boolean
  applyTypos: boolean
}) {
  const parsed = parseCsv(input.csv)
  const [contacts, suppressions] = await Promise.all([
    prisma.contact.findMany({ where: { workspaceId: input.workspaceId }, select: { email: true } }),
    prisma.suppression.findMany({ where: { workspaceId: input.workspaceId }, select: { email: true } }),
  ])
  const plan = analyzeImport({
    headers: parsed.headers,
    rows: parsed.rows,
    mapping: input.mapping,
    existing: new Set(contacts.map((contact) => contact.email)),
    suppressed: new Set(suppressions.map((row) => row.email)),
    applyTypos: input.applyTypos,
  })
  let imported = 0
  for (const row of plan.ready) {
    await addContact({
      workspaceId: input.workspaceId,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      company: row.company,
      listId: row.suppressed ? null : input.listId,
      consent: input.consent && !row.suppressed,
      source: "csv_import",
    })
    imported += 1
  }
  return {
    imported,
    invalid: plan.invalid.length,
    duplicates: plan.rows.filter((row) => row.duplicateInFile).length,
    suppressed: plan.ready.filter((row) => row.suppressed).length,
  }
}
