export type EligibilityContact = {
  status: string
  consentStatus: string
}

export function marketingEligible(contact: EligibilityContact, suppressed: boolean) {
  if (suppressed) return false
  if (contact.status !== "subscribed") return false
  if (contact.consentStatus !== "granted") return false
  return true
}

export function transactionalEligible(suppressed: boolean) {
  return !suppressed
}

export type ProviderEvent = "delivered" | "bounced" | "complained" | "other"

export function classifyProviderEvent(type: string, bounceType?: string | null): ProviderEvent {
  const name = type.toLowerCase()
  if (name.includes("complain")) return "complained"
  if (name.includes("bounce")) {
    if ((bounceType || "").toLowerCase() === "soft" || (bounceType || "").toLowerCase() === "temporary") return "other"
    return "bounced"
  }
  if (name.includes("deliver")) return "delivered"
  return "other"
}

export function suppressionReasonFor(event: ProviderEvent) {
  if (event === "bounced") return "hard_bounce"
  if (event === "complained") return "complaint"
  return null
}
