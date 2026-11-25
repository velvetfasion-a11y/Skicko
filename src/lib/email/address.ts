export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value))
}

export function domainOf(email: string) {
  return normalizeEmail(email).split("@")[1] ?? ""
}

export function isLocalPart(value: string) {
  return /^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?$/i.test(value) && !value.includes("..")
}

export function parseAddress(input: string) {
  const trimmed = input.trim()
  const angled = trimmed.match(/^(.*)<([^>]+)>$/)
  if (angled) {
    const email = normalizeEmail(angled[2] ?? "")
    const name = (angled[1] ?? "").trim().replace(/^"|"$/g, "")
    if (!isEmail(email)) return null
    return { name, email }
  }
  const email = normalizeEmail(trimmed)
  if (!isEmail(email)) return null
  return { name: "", email }
}

export function formatAddress(name: string, email: string) {
  const clean = name.replace(/[<>"]/g, "").trim()
  return clean ? `${clean} <${email}>` : email
}
