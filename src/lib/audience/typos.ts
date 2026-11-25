const TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "hotmal.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "yahooo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "outloo.com": "outlook.com",
  "outlok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "icloud.co": "icloud.com",
  "icoud.com": "icloud.com",
}

export function suggestEmail(email: string) {
  const normalized = email.trim().toLowerCase()
  const at = normalized.lastIndexOf("@")
  if (at <= 0) return null
  const local = normalized.slice(0, at)
  const domain = normalized.slice(at + 1)
  const fix = TYPOS[domain]
  if (!fix) return null
  return `${local}@${fix}`
}
