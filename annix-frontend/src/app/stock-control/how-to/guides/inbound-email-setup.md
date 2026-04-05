---
title: Configuring Inbound Email
slug: inbound-email-setup
category: Admin
roles: [admin]
order: 5
tags: [email, inbound, automation]
lastUpdated: 2026-04-05
summary: Route supplier emails into the portal so delivery notes auto-extract.
readingMinutes: 4
relatedPaths: [annix-backend/src/inbound-email, annix-backend/src/email]
---

## How it works

Inbound email lets suppliers send delivery notes, invoices, and CoCs to a dedicated address (e.g. `stock@yourcompany.annix.co.za`). The system classifies each message and routes it to the right module automatically.

## Steps

1. Open **Settings → Integrations → Inbound Email**
2. Copy your company's unique inbound address
3. Share it with your suppliers and ask them to CC or forward documents
4. Messages arrive in the portal within a few minutes

## Classification

The classifier reads subject, body, and attachments to decide whether an email is a delivery note, invoice, CoC, or unknown. You can review the classifier's decisions in **Settings → Integrations → Inbound Email → Log**.

## Failed classifications

Messages that cannot be classified land in a review queue. Open the queue and click **Assign** on each message to manually route it. Your decision trains the classifier for next time.
