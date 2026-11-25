import { listUnsubscribeHeaders, marketingFooter } from "./footer"
import { inlineCss } from "./inline"
import { htmlToText } from "./text"
import { interpolate } from "./variables"

export type MailCategory = "marketing" | "transactional"

export type ComposeInput = {
  html: string
  subject: string
  preheader?: string
  variables?: Record<string, string | undefined>
  category: MailCategory
  unsubscribeUrl?: string
  oneClickUrl?: string
  companyAddress?: string
  senderName?: string
}

export function composeEmail(input: ComposeInput) {
  const variables: Record<string, string | undefined> = {
    ...input.variables,
    unsubscribe_url: input.unsubscribeUrl ?? "",
    company_address: input.companyAddress ?? "",
    preheader: input.preheader ?? "",
    sender_name: input.senderName ?? "",
  }

  let html = input.html
  const hasPreheaderSlot = html.includes("{{preheader")
  if (input.preheader && !hasPreheaderSlot) {
    const hidden = `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${interpolate(input.preheader, variables)}</div>`
    if (/<body[^>]*>/i.test(html)) html = html.replace(/<body[^>]*>/i, (tag) => `${tag}${hidden}`)
    else html = hidden + html
  }

  if (input.category === "marketing" && !html.includes("{{unsubscribe_url}}")) {
    const footer = marketingFooter(input.companyAddress ?? "", "{{unsubscribe_url}}")
    if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${footer}</body>`)
    else html += footer
  }

  html = interpolate(html, variables, { escapeHtml: true })
  html = inlineCss(html)
  const subject = interpolate(input.subject, variables).trim()
  const headers =
    input.category === "marketing" && input.oneClickUrl
      ? listUnsubscribeHeaders(input.oneClickUrl)
      : {}

  return { html, text: htmlToText(html), subject, headers }
}
