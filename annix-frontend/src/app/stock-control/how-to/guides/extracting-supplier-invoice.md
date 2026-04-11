---
title: Extracting a Supplier Invoice
slug: extracting-supplier-invoice
category: Accounts
roles: [accounts, manager, admin]
order: 1
tags: [invoices, suppliers, ai-extraction]
lastUpdated: 2026-04-11
summary: Upload a supplier invoice PDF and let the AI extract line items automatically.
readingMinutes: 3
relatedPaths: [annix-frontend/src/app/stock-control/portal/invoices, annix-backend/src/stock-control/invoices]
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

## If extraction fails

When the AI cannot read a scan, you will see an empty form. Fill it in manually and click **Save** — future invoices from the same supplier will still benefit from AI extraction.

## Discount detection

The AI now detects early-payment discounts in the narrative and will flag them in the review panel. Accept or reject each discount before posting.
