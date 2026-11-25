-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MagicLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "senderName" TEXT NOT NULL DEFAULT '',
    "replyTo" TEXT NOT NULL DEFAULT '',
    "companyAddress" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SendingDomain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'resend',
    "providerDomainId" TEXT NOT NULL DEFAULT '',
    "recordsJson" TEXT NOT NULL DEFAULT '[]',
    "detail" TEXT NOT NULL DEFAULT '',
    "lastChecked" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SendingDomain_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'marketing',
    "html" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Template_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "properties" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "consentStatus" TEXT NOT NULL DEFAULT 'unknown',
    "consentedAt" DATETIME,
    "consentSource" TEXT NOT NULL DEFAULT '',
    "consentTextVersion" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContactEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContactEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContactEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "List" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "List_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ListMember" (
    "listId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("listId", "contactId"),
    CONSTRAINT "ListMember_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ListMember_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Suppression" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Suppression_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SignupForm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "listId" TEXT,
    "name" TEXT NOT NULL,
    "headline" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "buttonLabel" TEXT NOT NULL DEFAULT 'Subscribe',
    "doubleOptIn" BOOLEAN NOT NULL DEFAULT true,
    "consentText" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SignupForm_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SignupForm_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConfirmToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactId" TEXT NOT NULL,
    "formId" TEXT NOT NULL DEFAULT '',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConfirmToken_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "preheader" TEXT NOT NULL DEFAULT '',
    "fromName" TEXT NOT NULL DEFAULT '',
    "fromLocalPart" TEXT NOT NULL DEFAULT 'hello',
    "replyTo" TEXT NOT NULL DEFAULT '',
    "domainId" TEXT,
    "templateId" TEXT,
    "listId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "step" INTEGER NOT NULL DEFAULT 1,
    "testSentAt" DATETIME,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Campaign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Campaign_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "SendingDomain" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Campaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Campaign_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "messageId" TEXT,
    "error" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignRecipient_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "providerId" TEXT,
    "toEmail" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "campaignId" TEXT,
    "contactId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "html" TEXT NOT NULL DEFAULT '',
    "error" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "lastUsedAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiKey_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "requestBody" TEXT NOT NULL DEFAULT '',
    "responseBody" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApiLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseBody" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IdempotencyKey_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "payload" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLink_tokenHash_key" ON "MagicLink"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_userId_key" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SendingDomain_workspaceId_domain_key" ON "SendingDomain"("workspaceId", "domain");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_status_idx" ON "Contact"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_workspaceId_email_key" ON "Contact"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "ContactEvent_workspaceId_createdAt_idx" ON "ContactEvent"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ContactEvent_contactId_idx" ON "ContactEvent"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Suppression_workspaceId_email_key" ON "Suppression"("workspaceId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ConfirmToken_tokenHash_key" ON "ConfirmToken"("tokenHash");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_status_idx" ON "Campaign"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "CampaignRecipient_campaignId_status_idx" ON "CampaignRecipient"("campaignId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_campaignId_contactId_key" ON "CampaignRecipient"("campaignId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_providerId_key" ON "Message"("providerId");

-- CreateIndex
CREATE INDEX "Message_workspaceId_createdAt_idx" ON "Message"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_hash_key" ON "ApiKey"("hash");

-- CreateIndex
CREATE INDEX "ApiLog_workspaceId_createdAt_idx" ON "ApiLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_workspaceId_key_key" ON "IdempotencyKey"("workspaceId", "key");

-- CreateIndex
CREATE INDEX "WebhookEvent_workspaceId_createdAt_idx" ON "WebhookEvent"("workspaceId", "createdAt");
