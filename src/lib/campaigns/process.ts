import { prisma } from "../prisma"
import { HttpError } from "../http"
import { marketingEligible } from "../audience/eligibility"
import { suppressionSet } from "../audience/suppress"
import { assertFromDomain, contactVariables, sendRendered } from "../email/deliver"
import { isEmail } from "../email/address"
import { appUrl } from "../origin"

const locks = new Set<string>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()

export async function preflight(campaignId: string, workspaceId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId },
    include: { domain: true, template: true, list: true, workspace: true },
  })
  if (!campaign) throw new HttpError("Campaign not found.", 404)
  const checks = {
    content: Boolean(campaign.subject.trim() && campaign.template && campaign.template.category === "marketing"),
    domain: Boolean(campaign.domain && campaign.domain.status === "verified"),
    address: Boolean(campaign.workspace.companyAddress.trim()),
    audience: false,
    test: Boolean(campaign.testSentAt),
    recipients: 0,
    excluded: 0,
  }
  if (campaign.listId) {
    const members = await prisma.listMember.findMany({
      where: { listId: campaign.listId },
      include: { contact: true },
    })
    const suppressed = await suppressionSet(workspaceId)
    for (const member of members) {
      if (marketingEligible(member.contact, suppressed.has(member.contact.email))) checks.recipients += 1
      else checks.excluded += 1
    }
    checks.audience = checks.recipients > 0
  }
  const ready = checks.content && checks.domain && checks.address && checks.audience && checks.test
  return { campaign, checks, ready }
}

export async function queueCampaign(campaignId: string, workspaceId: string, origin = appUrl()) {
  const { campaign, ready, checks } = await preflight(campaignId, workspaceId)
  if (campaign.status === "sending") throw new HttpError("This campaign is already sending.", 409)
  if (campaign.status === "sent") throw new HttpError("This campaign has already been sent.", 409)
  if (!ready) throw new HttpError("Finish the pre-flight checks before sending.", 400)
  if (!campaign.listId || !campaign.template || !campaign.domain) {
    throw new HttpError("Choose a template, domain, and list.", 400)
  }
  const members = await prisma.listMember.findMany({
    where: { listId: campaign.listId },
    include: { contact: true },
  })
  const suppressed = await suppressionSet(workspaceId)
  await prisma.campaignRecipient.deleteMany({ where: { campaignId } })
  await prisma.campaignRecipient.createMany({
    data: members.map((member) => ({
      campaignId,
      contactId: member.contact.id,
      status: marketingEligible(member.contact, suppressed.has(member.contact.email)) ? "queued" : "suppressed",
    })),
  })
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "sending", startedAt: new Date(), finishedAt: null },
  })
  scheduleCampaign(campaignId, origin)
  return { queued: checks.recipients, excluded: checks.excluded }
}

export function scheduleCampaign(campaignId: string, origin = appUrl()) {
  if (timers.has(campaignId)) return
  const run = async () => {
    await tickCampaign(campaignId, origin)
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true } })
    if (campaign?.status === "sending") timers.set(campaignId, setTimeout(run, 450))
    else timers.delete(campaignId)
  }
  timers.set(campaignId, setTimeout(run, 200))
}

export async function tickCampaign(campaignId: string, origin = appUrl()) {
  if (locks.has(campaignId)) return { locked: true }
  locks.add(campaignId)
  try {
    return await processBatch(campaignId, origin)
  } finally {
    locks.delete(campaignId)
  }
}

async function processBatch(campaignId: string, origin: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { template: true, domain: true, workspace: true },
  })
  if (!campaign || campaign.status !== "sending" || !campaign.template || !campaign.domain) {
    return { done: true }
  }
  await prisma.campaignRecipient.updateMany({
    where: { campaignId, status: "sending" },
    data: { status: "queued" },
  })
  const batch = await prisma.campaignRecipient.findMany({
    where: { campaignId, status: "queued" },
    take: 4,
    include: { contact: true },
  })
  if (!batch.length) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "sent", finishedAt: new Date() },
    })
    return { done: true }
  }
  const from = await assertFromDomain(campaign.workspaceId, campaign.domain.domain, campaign.fromLocalPart)
  for (const recipient of batch) {
    const claimed = await prisma.campaignRecipient.updateMany({
      where: { id: recipient.id, status: "queued" },
      data: { status: "sending" },
    })
    if (claimed.count !== 1) continue
    const suppressed = await suppressionSet(campaign.workspaceId)
    if (!marketingEligible(recipient.contact, suppressed.has(recipient.contact.email))) {
      await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: "suppressed" } })
      continue
    }
    try {
      const message = await sendRendered({
        workspace: campaign.workspace,
        to: recipient.contact.email,
        fromEmail: from.email,
        fromName: campaign.fromName || campaign.workspace.senderName,
        replyTo: campaign.replyTo || campaign.workspace.replyTo,
        subject: campaign.subject,
        preheader: campaign.preheader,
        html: campaign.template.html,
        category: "marketing",
        variables: contactVariables(recipient.contact),
        origin,
        source: "campaign",
        contactId: recipient.contact.id,
        campaignId: campaign.id,
      })
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "sent", messageId: message.id, error: "" },
      })
      await prisma.contactEvent.create({
        data: {
          workspaceId: campaign.workspaceId,
          contactId: recipient.contact.id,
          type: "sent",
          detail: campaign.name,
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Send failed"
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "failed", error: message.slice(0, 300) },
      })
    }
  }
  return { done: false }
}

export async function sendCampaignTest(input: {
  campaignId: string
  workspaceId: string
  to: string
  origin: string
}) {
  if (!isEmail(input.to)) throw new HttpError("Enter a valid test address.", 400)
  const campaign = await prisma.campaign.findFirst({
    where: { id: input.campaignId, workspaceId: input.workspaceId },
    include: { template: true, domain: true, workspace: true, list: true },
  })
  if (!campaign?.template || !campaign.domain) throw new HttpError("Choose a template and a domain first.", 400)
  if (campaign.template.category !== "marketing") throw new HttpError("Campaigns use marketing templates.", 400)
  const from = await assertFromDomain(campaign.workspaceId, campaign.domain.domain, campaign.fromLocalPart)
  const sample = campaign.listId
    ? await prisma.listMember.findFirst({ where: { listId: campaign.listId }, include: { contact: true } })
    : null
  const variables = sample
    ? contactVariables(sample.contact)
    : { first_name: "Anna", last_name: "Lindström", email: input.to, company: campaign.workspace.name }
  await sendRendered({
    workspace: campaign.workspace,
    to: input.to.toLowerCase(),
    fromEmail: from.email,
    fromName: campaign.fromName || campaign.workspace.senderName,
    replyTo: campaign.replyTo || campaign.workspace.replyTo,
    subject: campaign.subject || campaign.name,
    preheader: campaign.preheader,
    html: campaign.template.html,
    category: "marketing",
    variables,
    origin: input.origin,
    source: "test",
    campaignId: campaign.id,
    requireConsent: false,
  })
  await prisma.campaign.update({ where: { id: campaign.id }, data: { testSentAt: new Date() } })
}
