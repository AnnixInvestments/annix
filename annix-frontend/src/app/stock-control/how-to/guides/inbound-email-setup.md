---
title: Configuring Inbound Email
slug: inbound-email-setup
category: Admin
roles: [admin]
order: 5
tags: [email, inbound, automation]
lastUpdated: 2026-05-30
summary: Route supplier emails into the portal so delivery notes auto-extract.
readingMinutes: 4
relatedPaths: [annix-backend/src/inbound-email, annix-frontend/src/app/admin/portal/inbound-emails, annix-frontend/src/app/stock-control/portal/settings/InboundEmailConfigSection.tsx]
---

## How it works

Inbound email lets suppliers send delivery notes, invoices, and CoCs to a dedicated address (e.g. `stock@yourcompany.annix.co.za`). The system classifies each message and routes it to the right module automatically.

Each app gets its **own** mailbox so documents never cross between apps. When a customer is approved, the platform pre-creates one mailbox per subscribed app (`<company>-app@annix.co.za`, then `<company>-2-app`, `<company>-3-app`, …) and emails the credentials to the operations team.

## Admin: review and enable mailboxes

Annix admins manage every company's mailboxes at **Admin Portal → Inbox Emails** (`/admin/portal/inbound-emails`). Mailboxes are created **disabled** — once the real mailbox exists on the hosting panel, open this page (the provisioning email links straight to the right row) and click **Enable** to start polling.

## Steps

1. Open **Settings → Integrations → Inbound Email**
2. Copy your company's unique inbound address
3. Share it with your suppliers and ask them to CC or forward documents
4. Messages arrive in the portal within a few minutes

## Classification

The classifier reads subject, body, and attachments to decide whether an email is a delivery note, invoice, CoC, or unknown. You can review the classifier's decisions in **Settings → Integrations → Inbound Email → Log**.

## Failed classifications

Messages that cannot be classified land in a review queue. Open the queue and click **Assign** on each message to manually route it. Your decision trains the classifier for next time.
