import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { starterTemplates } from "../src/lib/email/starters"
import { hashApiKey } from "../src/lib/api/keys"
import { recommendedRecords } from "../src/lib/dns/records"
import { BRAND } from "../src/lib/brand"

if (!process.env.DATABASE_URL_UNPOOLED?.trim() && process.env.DATABASE_URL) {
  process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL
}

const prisma = new PrismaClient()
const demoKey = process.env.DEMO_API_KEY || "sk_live_demo_skicko_local_dev_key"

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)

async function main() {
  await prisma.webhookEvent.deleteMany()
  await prisma.apiLog.deleteMany()
  await prisma.idempotencyKey.deleteMany()
  await prisma.confirmToken.deleteMany()
  await prisma.campaignRecipient.deleteMany()
  await prisma.message.deleteMany()
  await prisma.campaign.deleteMany()
  await prisma.listMember.deleteMany()
  await prisma.signupForm.deleteMany()
  await prisma.contactEvent.deleteMany()
  await prisma.suppression.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.list.deleteMany()
  await prisma.template.deleteMany()
  await prisma.sendingDomain.deleteMany()
  await prisma.apiKey.deleteMany()
  await prisma.session.deleteMany()
  await prisma.magicLink.deleteMany()
  await prisma.workspaceMember.deleteMany()
  await prisma.workspace.deleteMany()
  await prisma.user.deleteMany()

  const user = await prisma.user.create({
    data: {
      id: "usr_anna",
      email: "anna@linden.studio",
      name: "Anna Lindström",
      passwordHash: await bcrypt.hash("skicko-demo", 10),
    },
  })

  const workspace = await prisma.workspace.create({
    data: {
      id: "ws_linden",
      name: "Linden Studio",
      senderName: "Linden Studio",
      replyTo: "anna@linden.studio",
      companyAddress: "Linden Studio\nHornsgatan 82\n118 21 Stockholm\nSweden",
    },
  })
  await prisma.workspaceMember.create({ data: { userId: user.id, workspaceId: workspace.id, role: "owner" } })

  await prisma.sendingDomain.createMany({
    data: [
      {
        id: "dom_mail",
        workspaceId: workspace.id,
        domain: "mail.linden.test",
        status: "verified",
        provider: "resend",
        recordsJson: JSON.stringify(recommendedRecords("mail.linden.test")),
        detail: "Console transport trusts .test domains.",
        lastChecked: daysAgo(2),
      },
      {
        id: "dom_news",
        workspaceId: workspace.id,
        domain: "news.linden.test",
        status: "pending",
        provider: "resend",
        recordsJson: JSON.stringify(recommendedRecords("news.linden.test")),
        detail: "Publish the records, then verify.",
      },
    ],
  })

  for (const starter of starterTemplates()) {
    await prisma.template.create({
      data: {
        id: `tpl_${starter.slug}`,
        workspaceId: workspace.id,
        name: starter.name,
        description: starter.description,
        category: starter.category,
        html: starter.html,
      },
    })
  }

  await prisma.list.createMany({
    data: [
      { id: "list_notes", workspaceId: workspace.id, name: "Studio notes", description: "People who asked for the occasional letter." },
      { id: "list_workshops", workspaceId: workspace.id, name: "Workshop guests", description: "People who came to a workshop." },
    ],
  })

  const people = [
    ["ctc_01", "elsa@linden.studio", "Elsa", "Berg", "Linden Studio", "subscribed", "granted"],
    ["ctc_02", "noah@example.com", "Noah", "Ek", "Ek Form", "subscribed", "granted"],
    ["ctc_03", "mira@example.com", "Mira", "Holm", "", "subscribed", "granted"],
    ["ctc_04", "jonas@example.com", "Jonas", "Ahl", "Ahl & Co", "subscribed", "granted"],
    ["ctc_05", "sara@example.com", "Sara", "Lind", "", "subscribed", "granted"],
    ["ctc_06", "leo@example.com", "Leo", "Nyman", "", "subscribed", "granted"],
    ["ctc_07", "freja@example.com", "Freja", "Dahl", "", "subscribed", "granted"],
    ["ctc_08", "omar@example.com", "Omar", "Said", "", "subscribed", "granted"],
    ["ctc_09", "typo@gmial.com", "Sam", "Typo", "", "subscribed", "granted"],
    ["ctc_10", "pending@example.com", "Pia", "Pending", "", "pending", "granted"],
    ["ctc_11", "left@example.com", "Ida", "Left", "", "unsubscribed", "withdrawn"],
    ["ctc_12", "bounce@example.com", "Bo", "Bounce", "", "bounced", "granted"],
    ["ctc_13", "complaint@example.com", "Kim", "Complaint", "", "subscribed", "granted"],
  ] as const

  for (const [id, email, firstName, lastName, company, status, consent] of people) {
    await prisma.contact.create({
      data: {
        id,
        workspaceId: workspace.id,
        email,
        firstName,
        lastName,
        company,
        properties: id === "ctc_02" ? JSON.stringify({ city: "Stockholm" }) : "{}",
        status,
        consentStatus: consent,
        consentedAt: daysAgo(20),
        consentSource: consent === "granted" ? "form:form_notes" : consent === "withdrawn" ? "unsubscribe" : "",
        consentTextVersion: consent === "granted" || consent === "withdrawn" ? BRAND.consentVersion : "",
        createdAt: daysAgo(21),
      },
    })
    await prisma.contactEvent.create({
      data: {
        workspaceId: workspace.id,
        contactId: id,
        type: status === "pending" ? "pending" : "subscribed",
        detail: "seed",
        createdAt: daysAgo(21),
      },
    })
  }

  const notes = ["ctc_01", "ctc_02", "ctc_03", "ctc_04", "ctc_05", "ctc_06", "ctc_07", "ctc_08", "ctc_09", "ctc_10", "ctc_11", "ctc_12", "ctc_13"]
  const workshops = ["ctc_01", "ctc_03", "ctc_05", "ctc_07"]
  await prisma.listMember.createMany({
    data: [
      ...notes.map((contactId) => ({ listId: "list_notes", contactId })),
      ...workshops.map((contactId) => ({ listId: "list_workshops", contactId })),
    ],
  })

  await prisma.suppression.createMany({
    data: [
      { workspaceId: workspace.id, email: "left@example.com", reason: "unsubscribe", source: "seed" },
      { workspaceId: workspace.id, email: "bounce@example.com", reason: "hard_bounce", source: "webhook:email.bounced" },
      { workspaceId: workspace.id, email: "complaint@example.com", reason: "complaint", source: "webhook:email.complained" },
    ],
  })

  await prisma.signupForm.create({
    data: {
      id: "form_notes",
      workspaceId: workspace.id,
      listId: "list_notes",
      name: "Studio notes",
      headline: "Notes from Linden Studio",
      description: "A short letter when there is something worth opening. No noise.",
      buttonLabel: "Subscribe",
      doubleOptIn: true,
      consentText: BRAND.defaultConsentText,
      consentVersion: BRAND.consentVersion,
    },
  })

  await prisma.campaign.create({
    data: {
      id: "cmp_november",
      workspaceId: workspace.id,
      name: "Studio notes — November",
      subject: "A few things worth keeping",
      preheader: "The short version from the studio.",
      fromName: "Linden Studio",
      fromLocalPart: "hello",
      replyTo: "anna@linden.studio",
      domainId: "dom_mail",
      templateId: "tpl_notes",
      listId: "list_notes",
      status: "sent",
      step: 3,
      testSentAt: daysAgo(7),
      startedAt: daysAgo(6),
      finishedAt: daysAgo(6),
    },
  })
  await prisma.campaign.create({
    data: {
      id: "cmp_winter",
      workspaceId: workspace.id,
      name: "Winter workshop",
      subject: "A quiet afternoon in the studio",
      preheader: "A handful of seats, nothing noisy.",
      fromName: "Linden Studio",
      fromLocalPart: "hello",
      replyTo: "anna@linden.studio",
      domainId: "dom_mail",
      templateId: "tpl_welcome",
      listId: "list_workshops",
      status: "draft",
      step: 3,
    },
  })

  const outcomes = [
    ["ctc_01", "delivered"],
    ["ctc_02", "delivered"],
    ["ctc_03", "delivered"],
    ["ctc_04", "delivered"],
    ["ctc_05", "delivered"],
    ["ctc_06", "delivered"],
    ["ctc_07", "delivered"],
    ["ctc_08", "delivered"],
    ["ctc_12", "bounced"],
    ["ctc_13", "complained"],
    ["ctc_11", "unsubscribed"],
  ] as const

  for (const [contactId, status] of outcomes) {
    const contact = people.find((person) => person[0] === contactId)
    const message = await prisma.message.create({
      data: {
        id: `msg_${contactId}`,
        workspaceId: workspace.id,
        providerId: `console_seed_${contactId}`,
        toEmail: contact?.[1] || "",
        fromEmail: "hello@mail.linden.test",
        subject: "A few things worth keeping",
        category: "marketing",
        source: "campaign",
        campaignId: "cmp_november",
        contactId,
        status: status === "unsubscribed" ? "delivered" : status,
        html: "<p>Studio notes</p>",
        createdAt: daysAgo(6),
      },
    })
    await prisma.campaignRecipient.create({
      data: {
        campaignId: "cmp_november",
        contactId,
        status,
        messageId: message.id,
      },
    })
  }

  await prisma.contactEvent.create({
    data: { workspaceId: workspace.id, contactId: "ctc_11", type: "unsubscribed", detail: "campaign:cmp_november", createdAt: daysAgo(4) },
  })
  await prisma.webhookEvent.createMany({
    data: [
      { workspaceId: workspace.id, type: "email.delivered", email: "elsa@linden.studio", payload: "{}", createdAt: daysAgo(6) },
      { workspaceId: workspace.id, type: "email.bounced", email: "bounce@example.com", payload: "{}", createdAt: daysAgo(6) },
      { workspaceId: workspace.id, type: "email.complained", email: "complaint@example.com", payload: "{}", createdAt: daysAgo(5) },
    ],
  })

  const key = hashApiKey(demoKey)
  await prisma.apiKey.create({
    data: {
      id: "key_demo",
      workspaceId: workspace.id,
      name: "Local demo",
      prefix: demoKey.slice(0, 16),
      hash: key,
      lastUsedAt: daysAgo(1),
    },
  })
  await prisma.apiLog.createMany({
    data: [
      {
        workspaceId: workspace.id,
        apiKeyId: "key_demo",
        method: "POST",
        path: "/api/v1/send",
        status: 200,
        idempotencyKey: "seed-receipt-1",
        requestBody: JSON.stringify({ to: "elsa@linden.studio", templateId: "tpl_receipt", category: "transactional" }),
        responseBody: JSON.stringify({ id: "msg_api_1", status: "sent" }),
        createdAt: daysAgo(1),
      },
      {
        workspaceId: workspace.id,
        apiKeyId: "key_demo",
        method: "POST",
        path: "/api/v1/lists/list_notes/contacts",
        status: 200,
        requestBody: JSON.stringify({ email: "noah@example.com" }),
        responseBody: JSON.stringify({ id: "ctc_02" }),
        createdAt: daysAgo(2),
      },
    ],
  })
  await prisma.message.create({
    data: {
      id: "msg_api_1",
      workspaceId: workspace.id,
      providerId: "console_seed_api_1",
      toEmail: "elsa@linden.studio",
      fromEmail: "hello@mail.linden.test",
      subject: "Payment received.",
      category: "transactional",
      source: "api",
      contactId: "ctc_01",
      status: "delivered",
      html: "<p>Receipt</p>",
      createdAt: daysAgo(1),
    },
  })

  console.log(`Seeded ${BRAND.name}. Sign in as anna@linden.studio / skicko-demo`)
  console.log(`Demo API key: ${demoKey}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
