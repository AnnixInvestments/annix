---
title: Extracting a Supplier Invoice
slug: extracting-supplier-invoice
category: Accounts
roles: [accounts, manager, admin]
order: 1
tags: [invoices, suppliers, ai-extraction]
lastUpdated: 2026-06-11
summary: Upload a supplier invoice PDF and let the AI extract line items automatically.
readingMinutes: 3
relatedPaths: [annix-frontend/src/app/stock-control/portal/invoices, annix-backend/src/stock-control/services/invoice.service.ts]
---

## Overview

Supplier invoices are extracted using AI so that you don't have to retype line items. The AI reads the PDF, identifies the supplier, and populates amounts.

## Steps

1. Open **Documents → Supplier Invoices**
2. Click **Upload Invoice**
3. Drag the PDF onto the upload zone (or click to browse)
4. Wait a few seconds for extraction to complete
5. Review the extracted fields — supplier, invoice number, date, VAT, total, line items
6. Correct any values the AI got wrong. You can click directly on a field to edit it.
7. Link each line to a delivery note or job card
8. Click **Save** to post the invoice

## Resolving clarifications

When the AI is unsure about an item match or a big price change, the invoice goes to **Needs Clarification** and a guided popup walks you through each open question — pick the right stock item, create a new one, or confirm/skip the price update. You can close the popup and instead click any line to edit it directly; **Resolve & Approve** clears whatever remains. When an invoice is **Awaiting Approval**, the Price Updates panel shows every cost change the approval will apply.

## Linked delivery notes

The Invoice Details card lists every delivery note linked to the invoice by its real delivery number. If a linked delivery note carries the wrong number, open it from the link and correct the number with the pencil icon next to **Delivery Number**.

## If extraction fails

When the AI cannot read a scan, you will see an empty form. Fill it in manually and click **Save** — future invoices from the same supplier will still benefit from AI extraction.

## Discount detection

The AI now detects early-payment discounts in the narrative and will flag them in the review panel. Accept or reject each discount before posting.
