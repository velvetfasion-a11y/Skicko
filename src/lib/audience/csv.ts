import Papa from "papaparse"
import { isEmail, normalizeEmail } from "../email/address"
import { suggestEmail } from "./typos"

export const COLUMN_FIELDS = ["email", "first_name", "last_name", "company", "ignore"] as const
export type ColumnField = (typeof COLUMN_FIELDS)[number]

export type ImportRow = {
  email: string
  firstName: string
  lastName: string
  company: string
  suggestion: string | null
  suppressed: boolean
  duplicateInFile: boolean
  alreadySaved: boolean
}

export type ImportPlan = {
  headers: string[]
  mapping: ColumnField[]
  rows: ImportRow[]
  invalid: string[]
  ready: ImportRow[]
}

export function parseCsv(text: string) {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" })
  const table = parsed.data
    .map((row) => row.map((cell) => String(cell ?? "").trim()))
    .filter((row) => row.some(Boolean))
  if (!table.length) return { headers: [] as string[], rows: [] as string[][] }
  const first = table[0] ?? []
  const headerLike = first.some((cell) => /email|name|first|last|company|e-post/i.test(cell)) && !first.some((cell) => isEmail(cell))
  if (headerLike) {
    return { headers: first.map((cell, index) => cell || `Column ${index + 1}`), rows: table.slice(1) }
  }
  return {
    headers: first.map((_, index) => `Column ${index + 1}`),
    rows: table,
  }
}

export function guessMapping(headers: string[]): ColumnField[] {
  const used = new Set<ColumnField>()
  return headers.map((header) => {
    const name = header.toLowerCase()
    let field: ColumnField = "ignore"
    if (/e-?mail|e-post/.test(name)) field = "email"
    else if (/first|förnamn|fornamn/.test(name)) field = "first_name"
    else if (/last|surname|efternamn/.test(name)) field = "last_name"
    else if (/company|organisation|organization|företag|foretag/.test(name)) field = "company"
    if (field !== "ignore" && used.has(field)) return "ignore"
    if (field !== "ignore") used.add(field)
    return field
  })
}

export function analyzeImport(input: {
  headers: string[]
  rows: string[][]
  mapping: ColumnField[]
  existing: Set<string>
  suppressed: Set<string>
  applyTypos?: boolean
}): ImportPlan {
  const seen = new Set<string>()
  const invalid: string[] = []
  const rows: ImportRow[] = []
  for (const raw of input.rows) {
    const record: Record<ColumnField, string> = { email: "", first_name: "", last_name: "", company: "", ignore: "" }
    input.mapping.forEach((field, index) => {
      if (field === "ignore") return
      const value = raw[index] ?? ""
      if (!record[field]) record[field] = value.trim()
    })
    let email = normalizeEmail(record.email)
    if (!email) continue
    const suggestion = suggestEmail(email)
    if (input.applyTypos && suggestion) email = suggestion
    if (!isEmail(email)) {
      invalid.push(record.email)
      continue
    }
    const duplicateInFile = seen.has(email)
    seen.add(email)
    rows.push({
      email,
      firstName: record.first_name,
      lastName: record.last_name,
      company: record.company,
      suggestion: suggestion && suggestion !== email ? suggestion : input.applyTypos ? null : suggestion,
      suppressed: input.suppressed.has(email),
      duplicateInFile,
      alreadySaved: input.existing.has(email),
    })
  }
  const ready = rows.filter((row) => !row.duplicateInFile)
  return { headers: input.headers, mapping: input.mapping, rows, invalid, ready }
}
