---
title: Processing an Incoming Delivery
slug: processing-a-delivery
category: Warehouse
roles: [storeman, manager, admin]
order: 1
tags: [receiving, delivery-note, tax-invoice, sti, sdn]
summary: Book stock into the warehouse and link it to the right job card.
readingMinutes: 4
lastUpdated: 2026-06-03
relatedPaths: [annix-frontend/src/app/stock-control/portal/deliveries, annix-backend/src/stock-control/delivery-notes]
---

## Before you start

Make sure the supplier has sent their delivery note via email, or that you have a hard copy to reference.

## Steps

1. Open **Documents → Delivery Notes**
2. Click **New Supplier DN**
3. Pick the supplier and paste the DN number from their paperwork
4. Scan or upload the PDF — the system will extract line items automatically where possible
5. Review each extracted line and correct quantities or descriptions if needed
6. Link each line to the matching job card by clicking the **Link Job** dropdown
7. Assign a stock location for each item
8. Click **Book In** — stock movements are created and the linked job cards update

## Delivery note vs tax invoice — you choose

When you use **Scan & Analyze**, pick what you're scanning at the top: **Delivery Note (SDN)** or **Tax Invoice (STI)**. Whatever you choose is exactly where the document is filed — the app never re-files it based on what the document looks like. Some suppliers deliver on their tax invoice; if you want it booked as a delivery (and added to stock) choose Delivery Note, and if you want it filed as a supplier tax invoice (no stock change) choose Tax Invoice. A document scanned as a Tax Invoice is sent to **Supplier Invoices**, not Delivery Notes.

## Multi-job deliveries

If a single delivery note covers items for several jobs, link each line separately. The system creates stock movements per line, so every job gets only the items it needs.

## What happens next

Once booked in, the items become visible in the Stock view and the linked job cards advance through their "Goods Received" workflow step automatically.
