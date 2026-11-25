# Skicko

Skicko is a small, careful email studio. It covers the path from a verified sending domain and an HTML template to a consented audience, a three-step campaign, and a developer API. The product name lives in one place, [`src/lib/brand.ts`](src/lib/brand.ts), so it can be renamed without a hunt through the interface.

The interface is English. Strings go through `translate()` in [`src/lib/i18n/messages.ts`](src/lib/i18n/messages.ts). Swedish is wired as a partial dictionary with English fallback, and the account menu switches language.

## Run it locally

Skicko uses Postgres. Point it at a database on your machine, or at a Neon database. The same schema is what Vercel migrates in production.

```bash
npm install
cp .env.example .env
npm run db:setup
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

For a local server, create a role and database, then set both URLs to that direct connection (there is no pooler):

```sql
CREATE USER skicko WITH PASSWORD 'skicko';
CREATE DATABASE skicko OWNER skicko;
```

```bash
DATABASE_URL="postgresql://skicko:skicko@127.0.0.1:5432/skicko?schema=public"
DATABASE_URL_UNPOOLED="postgresql://skicko:skicko@127.0.0.1:5432/skicko?schema=public"
```

For Neon, copy the pooled connection string into `DATABASE_URL` and the direct string into `DATABASE_URL_UNPOOLED`. The Vercel Marketplace Neon integration uses those exact names. If `DATABASE_URL_UNPOOLED` is unset, migrate and the app fall back to `DATABASE_URL`.

`npm run db:setup` applies migrations and loads the demo workspace. On a database you want to keep empty, run `npm run db:deploy` instead. A new account from the signup page creates its own workspace, templates, and form. It does not need the seed.

Demo workspace (local only, after `npm run db:setup`):

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
| `npm run db:deploy` | Apply Postgres migrations (`prisma migrate deploy`) |
| `npm run db:setup` | Apply migrations and seed the local demo |

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string the app uses. On Neon this is the pooled URL |
| `DATABASE_URL_UNPOOLED` | Direct Postgres URL for `prisma migrate deploy`. Same as `DATABASE_URL` when you are not using a pooler |
| `AUTH_SECRET` | Signs unsubscribe links. Set a long random value in production |
| `EMAIL_TRANSPORT` | `console` (default), `resend`, or `ses` |
| `RESEND_API_KEY` | Sends through Resend when set. If it is missing, Skicko stays on the console transport |
| `RESEND_WEBHOOK_SECRET` | Optional Svix secret for `POST /api/webhooks/resend`. If empty, webhooks are accepted |
| `APP_URL` | Public origin used in links when a request host is not available |
| `DEMO_API_KEY` | Local only. When it matches a stored key, the developers page prefills snippets. Ignored in production |
| `CRON_SECRET` | Bearer token for `GET /api/internal/tick`, which continues campaigns that are still sending |

If `EMAIL_TRANSPORT` is unset and `RESEND_API_KEY` is present, Skicko uses Resend. If `EMAIL_TRANSPORT=resend` but the key is missing or blank, Skicko falls back to the console transport instead of throwing. Settings then shows a Connect Resend notice. Signup, the workspace, and the rest of the app keep working.

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

The datasource is already Postgres. `directUrl` is `DATABASE_URL_UNPOOLED`, which is what Neon’s Vercel Marketplace integration sets for the direct connection. Prisma Migrate uses that URL. The app uses the pooled `DATABASE_URL`. A pooler host (the hostname contains `-pooler`) gets `pgbouncer=true` and `connection_limit=1` automatically.

1. Add Neon from the Vercel Marketplace so `DATABASE_URL` and `DATABASE_URL_UNPOOLED` are set for Production (and Preview, if you want it). Leave them available at build time.
2. Set `AUTH_SECRET` to a long random value and `APP_URL` to the public origin. Set `CRON_SECRET` so `/api/internal/tick` stays private. Leave `DEMO_API_KEY` unset.
3. `RESEND_API_KEY` can wait. Without it, production stays on the console transport and Settings shows Connect Resend. When you are ready, set `RESEND_API_KEY`, `EMAIL_TRANSPORT=resend`, and `RESEND_WEBHOOK_SECRET`.
4. Deploy. The build command is `prisma generate && prisma migrate deploy && next build`, so a fresh database gets the schema. Do not run the demo seed in production. The first person to sign up gets an empty workspace.
5. `vercel.json` calls `/api/internal/tick` every minute so a campaign keeps sending after the browser tab closes. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
6. When Resend is connected, add the webhook URL for the production host.

Password accounts and magic links both work. Magic links are sent through the active transport. On the console transport, the sign-in screen also shows the link.

## GDPR notes stored on each contact

- `consentStatus` — `granted`, `pending`, `withdrawn`, or `unknown`
- `consentedAt`
- `consentSource` — for example `form:…`, `csv_import`, or `api`
- `consentTextVersion` — currently `2026-11-01` from the brand config

Signup forms require the consent checkbox. Double opt-in keeps the person `pending` until they confirm, so they are not eligible for marketing yet. Campaigns are marketing. API sends default to transactional. Unsubscribe sets `withdrawn`, adds a suppression row, and does not delete the person.
