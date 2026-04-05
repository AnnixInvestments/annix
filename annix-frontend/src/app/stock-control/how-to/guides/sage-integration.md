---
title: Connecting Sage Accounting
slug: sage-integration
category: Admin
roles: [admin]
order: 9
tags: [sage, accounting, integration]
lastUpdated: 2026-04-05
summary: Link your Sage Accounting company so invoices and contacts stay in sync.
readingMinutes: 4
relatedPaths: [annix-backend/src/sage-export, annix-backend/src/comply-sa/comply-integrations/sage]
---

## Prerequisites

- A Sage Accounting or Sage One SA subscription
- Admin access in your Sage company
- Your Sage API credentials (Annix support provides these if needed)

## Connecting

1. Open **Settings → Integrations → Sage**
2. Click **Connect Sage**
3. Sign into Sage in the popup and authorize Annix
4. Pick the Sage company you want to link
5. Confirm the mapping of Annix customers to Sage contacts
6. Click **Save**

## What syncs

- **Customers and suppliers** — contacts push to Sage when you create them in Annix
- **Customer invoices** — post to Sage when a job card is closed
- **Supplier invoices** — post to Sage when you save them in Annix

Syncs are rate-limited to respect Sage's API limits (100 requests/minute). You can view sync status in **Settings → Integrations → Sage → Log**.

## Disconnecting

Click **Disconnect** to revoke access. Historical records remain but no new data syncs until you reconnect.
