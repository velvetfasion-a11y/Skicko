import { BRAND } from "../brand"
import { escapeHtml } from "./variables"

export function marketingFooter(companyAddress: string, unsubscribeUrl: string) {
  const address = escapeHtml(companyAddress || "").replace(/\n/g, "<br>")
  const href = escapeHtml(unsubscribeUrl)
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
<tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#6e6e73;">
${address ? `<p style="margin:0 0 8px;">${address}</p>` : ""}
<p style="margin:0;">You received this because you subscribed. <a href="${href}" style="color:#0071e3;">Unsubscribe</a>.</p>
<p style="margin:8px 0 0;">Sent with ${escapeHtml(BRAND.name)}.</p>
</td></tr></table>`
}

export function listUnsubscribeHeaders(oneClickUrl: string) {
  return {
    "List-Unsubscribe": `<${oneClickUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  }
}
