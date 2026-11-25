# Skicko

Skicko is a small, careful email studio. It covers the path from a verified sending domain and an HTML template to a consented audience, a three-step campaign, and a developer API. The product name lives in one place, [`src/lib/brand.ts`](src/lib/brand.ts), so it can be renamed without a hunt through the interface.

The interface is English. Strings go through `translate()` in [`src/lib/i18n/messages.ts`](src/lib/i18n/messages.ts). Swedish is wired as a partial dictionary with English fallback, and the account menu switches language.

## Run it locally

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

Demo workspace (local only):

- Email: `anna@linden.studio`
- Password: `skicko-demo`
- API key: `sk_live_demo_skicko_local_dev_key`

The login screen shows a “Continue as Anna” button outside production. With `EMAIL_TRANSPORT=console` (the default), nothing is delivered to a real inbox. Sent mail is printed to the server log and kept in the console inbox in the header.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js on port 4317 |
| `npm run test` | Unit tests for variables, inlining, import, suppression, DNS, API snippets |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:setup` | Apply migrations and seed |

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma connection string. Local default is SQLite: `file:./dev.db` |
| `AUTH_SECRET` | Signs unsubscribe links. Set a long random value in production |
| `EMAIL_TRANSPORT` | `console` (default), `resend`, or `ses` |
| `RESEND_API_KEY` | Required when the transport is `resend` |
| `RESEND_WEBHOOK_SECRET` | Optional Svix secret for `POST /api/webhooks/resend`. If empty, webhooks are accepted |
| `APP_URL` | Public origin used in links when a request host is not available |
| `DEMO_API_KEY` | Local only. When it matches a stored key, the developers page prefills snippets. Ignored in production |
| `CRON_SECRET` | Bearer token for `GET /api/internal/tick`, which continues campaigns that are still sending |

If `EMAIL_TRANSPORT` is unset and `RESEND_API_KEY` is present, Skicko uses Resend. Otherwise it uses the console transport.

## Resend

1. Create an API key in Resend and set `RESEND_API_KEY`.
2. Set `EMAIL_TRANSPORT=resend`.
3. Add the sending domain in **Settings**. Skicko asks Resend for the domain and shows the SPF, DKIM, and DMARC records it returns.
4. Publish the records at your DNS host and press **Verify DNS**.
5. Point Resend webhooks at `https://YOUR_DOMAIN/api/webhooks/resend` for `email.delivered`, `email.bounced`, and `email.complained`.
6. Set `RESEND_WEBHOOK_SECRET` to the Svix signing secret.

Hard bounces and complaints are written to the workspace suppression list. Suppressed contacts are never deleted. Marketing mail requires `status = subscribed` and `consentStatus = granted`, and it skips anyone on that list. Transactional API mail skips suppressed addresses too, but it does not require marketing consent.

Domains that end in `.test` verify immediately when the console transport is selected, so the demo can run without public DNS.

## DNS records without a provider key

Until Resend is connected, Skicko shows recommended records:

- SPF TXT on the domain: `v=spf1 include:amazonses.com ~all`
- DKIM TXT on `resend._domainkey` (the value is a placeholder until Resend returns the real key)
- DMARC TXT on `_dmarc`

Choose Amazon SES under **Advanced** when adding a domain to see the three DKIM CNAMEs SES expects. The SES sender itself is an adapter stub: [`src/lib/email/transport.ts`](src/lib/email/transport.ts) exports `SesTransport`. Implement `SendEmail` with `@aws-sdk/client-sesv2` there and keep the rest of the app on the `EmailTransport` interface.

## What the product does

- **Workspace.** Sender name, reply-to, and the postal address injected into marketing footers.
- **Domains.** Copyable records and a verify button with status pills.
- **Template studio.** HTML editor, sandboxed preview, desktop and mobile widths, light and dark preview, `{{first_name | "there"}}` variables, preview as a contact, test send, four starters, and CSS inlining (via Juice) before send.
- **Audience.** Lists, CSV import with column mapping, dedupe, typo warnings such as `gmial.com`, suppression checks, a hosted signup form, iframe and script embeds, GDPR consent, optional double opt-in, and a contact drawer with consent timestamp, source, text version, status, and history.
- **Campaigns.** Content, audience, pre-flight (verified domain, address, eligible people, test send), then send. Marketing mail gets RFC 8058 `List-Unsubscribe` and `List-Unsubscribe-Post` headers, a footer unsubscribe link, and a no-login unsubscribe page. Sending continues in the background in small batches.
- **Developers.** Hashed API keys shown once, `POST /api/v1/send` with `Idempotency-Key`, list add and remove, copy-paste curl, Node, and Python snippets, a test request button, and request logs.
- **Webhooks.** Delivered, bounced, and complained events update message and campaign stats.

`POST /api/v1/send` accepts `to`, `from`, `subject`, and either `templateId` plus `variables` or raw `html`. `category` is `transactional` by default. Marketing sends require an existing subscribed contact with consent.

```bash
curl -X POST http://127.0.0.1:4317/api/v1/send \
  -H "Authorization: Bearer sk_live_demo_skicko_local_dev_key" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"to":"reader@example.com","subject":"Hello","templateId":"tpl_receipt","category":"transactional","variables":{"first_name":"Anna"}}'
```

Add or remove a list contact:

```bash
curl -X POST http://127.0.0.1:4317/api/v1/lists/list_notes/contacts \
  -H "Authorization: Bearer sk_live_demo_skicko_local_dev_key" \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","first_name":"New","consent":{"status":"granted","source":"api","text_version":"2026-11-01"}}'

curl -X DELETE "http://127.0.0.1:4317/api/v1/lists/list_notes/contacts?email=new@example.com" \
  -H "Authorization: Bearer sk_live_demo_skicko_local_dev_key"
```

Removing someone from a list does not delete the contact. Suppression is a separate table.

## Deploy on Vercel

1. Create a Postgres database (Vercel Postgres or Neon).
2. In `prisma/schema.prisma`, set `provider = "postgresql"` and point `DATABASE_URL` at the pooled connection string. Keep the models as they are. They avoid enums so the same schema runs on SQLite and Postgres.
3. Run `npx prisma migrate deploy` against that database. Do not run the demo seed in production unless you want the sample workspace.
4. Set `AUTH_SECRET`, `APP_URL`, `EMAIL_TRANSPORT=resend`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, and `CRON_SECRET`. Leave `DEMO_API_KEY` unset.
5. Deploy. `vercel.json` calls `/api/internal/tick` every minute so a campaign keeps sending after the browser tab closes. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
6. Add the Resend webhook URL for the production host.

Password accounts and magic links both work. Magic links are sent through the active transport. On the console transport, the sign-in screen also shows the link.

## GDPR notes stored on each contact

- `consentStatus` — `granted`, `pending`, `withdrawn`, or `unknown`
- `consentedAt`
- `consentSource` — for example `form:…`, `csv_import`, or `api`
- `consentTextVersion` — currently `2026-11-01` from the brand config

Signup forms require the consent checkbox. Double opt-in keeps the person `pending` until they confirm, so they are not eligible for marketing yet. Campaigns are marketing. API sends default to transactional. Unsubscribe sets `withdrawn`, adds a suppression row, and does not delete the person.
