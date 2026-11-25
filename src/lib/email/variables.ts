const PATTERN = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\|\s*(?:"([^"]*)"|'([^']*)'))?\s*\}\}/g

export type TemplateVariable = { key: string; fallback?: string }

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;"
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case '"':
        return "&quot;"
      default:
        return "&#39;"
    }
  })
}

function pattern() {
  return new RegExp(PATTERN.source, "g")
}

export function extractVariables(template: string): TemplateVariable[] {
  const found = new Map<string, TemplateVariable>()
  for (const match of template.matchAll(pattern())) {
    const key = match[1]
    if (!key || found.has(key)) continue
    const fallback = match[2] ?? match[3]
    found.set(key, fallback == null ? { key } : { key, fallback })
  }
  return [...found.values()]
}

export function interpolate(
  template: string,
  vars: Record<string, string | undefined>,
  options?: { escapeHtml?: boolean },
) {
  const shouldEscape = options?.escapeHtml === true
  return template.replace(pattern(), (_match, key: string, doubleQuoted?: string, singleQuoted?: string) => {
    const raw = vars[key]
    const value = raw == null || raw === "" ? (doubleQuoted ?? singleQuoted ?? "") : raw
    if (!shouldEscape) return value
    const escaped = escapeHtml(value)
    return key === "company_address" ? escaped.replace(/\n/g, "<br>") : escaped
  })
}
