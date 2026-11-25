function frame(inner: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>{{sender_name | "Note"}}</title>
<style>
body{margin:0;padding:0;background:#e7ebf0;}
.bg{background:#e7ebf0;}
.card{background:#ffffff;}
.text,.h,.p{color:#1d1d1f;}
.muted,.foot,.kicker{color:#6e6e73;}
.kicker{font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:600;margin:0;}
.h{font-size:30px;line-height:1.15;font-weight:600;letter-spacing:-0.03em;margin:12px 0 0;}
.p{font-size:16px;line-height:1.65;margin:16px 0 0;}
.btn{display:inline-block;background:#0071e3;color:#ffffff;text-decoration:none;border-radius:999px;padding:12px 22px;font-size:15px;font-weight:600;}
.foot{font-size:12px;line-height:1.55;margin:0;}
.a{color:#0071e3;}
.rule{border:0;border-top:1px solid #e6e6ea;margin:28px 0;}
@media (max-width:620px){
  .container{width:100%!important;}
  .h{font-size:26px!important;}
  .pad{padding:28px 22px!important;}
}
@media (prefers-color-scheme: dark){
  body,.bg{background:#101216!important;}
  .card{background:#1c1e24!important;}
  .text,.h,.p{color:#f5f5f7!important;}
  .muted,.foot,.kicker{color:#a1a1aa!important;}
  .rule{border-top-color:#2e3138!important;}
}
</style>
</head>
<body class="bg" style="margin:0;padding:0;background:#e7ebf0;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{{preheader | ""}}</div>
<table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" style="background:#e7ebf0;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" class="container card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:18px;">
<tr><td class="pad text" style="padding:40px 44px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
${inner}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

const addressBlock = `<hr class="rule">
<p class="foot muted">{{company_address}}</p>
<p class="foot muted" style="margin-top:8px;"><a class="a" href="{{unsubscribe_url}}">Unsubscribe</a></p>`

export type StarterTemplate = {
  slug: string
  name: string
  description: string
  category: "marketing" | "transactional"
  html: string
}

export function starterTemplates(): StarterTemplate[] {
  return [
    {
      slug: "welcome",
      name: "Welcome",
      description: "A short hello for someone who just subscribed.",
      category: "marketing",
      html: frame(`<p class="kicker">Welcome</p>
<h1 class="h">Good to meet you, {{first_name | "there"}}.</h1>
<p class="p">Thanks for asking to hear from {{sender_name | "us"}}. We write rarely, and only when it is actually worth opening.</p>
<p class="p">If you ever want to leave, the link in the footer is enough. No account, no maze.</p>
<p style="margin:28px 0 0;"><a class="btn" href="{{cta_url | "https://example.com"}}">Take a look</a></p>
${addressBlock}`),
    },
    {
      slug: "notes",
      name: "Studio notes",
      description: "A calm editorial letter with two short sections.",
      category: "marketing",
      html: frame(`<p class="kicker">{{sender_name | "Notes"}}</p>
<h1 class="h">A few things worth keeping.</h1>
<p class="p">Hello {{first_name | "there"}}, here is the short version from {{company | "the studio"}}.</p>
<p class="p"><strong>What changed.</strong> We tightened the work, kept the quiet parts, and dropped anything that felt like noise.</p>
<p class="p"><strong>What is next.</strong> One workshop, a handful of seats, and a note when the date is real.</p>
<p style="margin:28px 0 0;"><a class="btn" href="{{cta_url | "https://example.com"}}">Read the note</a></p>
${addressBlock}`),
    },
    {
      slug: "receipt",
      name: "Receipt",
      description: "A transactional payment receipt. No marketing footer.",
      category: "transactional",
      html: frame(`<p class="kicker">Receipt</p>
<h1 class="h">Payment received.</h1>
<p class="p">Thanks, {{first_name | "there"}}. This confirms a payment to {{sender_name | "us"}}.</p>
<p class="p"><strong>{{item | "Studio membership"}}</strong><br>{{amount | "420 SEK"}}</p>
<p class="muted" style="margin:8px 0 0;font-size:14px;">Reference {{order_number | "1048"}}</p>
<hr class="rule">
<p class="foot muted">{{company_address}}</p>
<p class="foot muted" style="margin-top:8px;">This is a receipt for a transaction, not a newsletter.</p>`),
    },
    {
      slug: "return",
      name: "Come back",
      description: "A gentle note for people who have been quiet.",
      category: "marketing",
      html: frame(`<p class="kicker">It has been a while</p>
<h1 class="h">Still here, {{first_name | "there"}}.</h1>
<p class="p">We have not written in some time. If you still want the occasional note from {{sender_name | "us"}}, nothing is required.</p>
<p class="p">If you would rather we stop, unsubscribe below and we will.</p>
<p style="margin:28px 0 0;"><a class="btn" href="{{cta_url | "https://example.com"}}">See what is new</a></p>
${addressBlock}`),
    },
  ]
}

export function starterBySlug(slug: string) {
  return starterTemplates().find((template) => template.slug === slug) ?? null
}
