---
title: Stock-Take Reconciliation
slug: stock-take-reconciliation
category: Inventory
roles: [manager, admin]
order: 8
tags: [reconciliation, stock take, variance, invoices, issues, deliveries, month-end]
lastUpdated: 2026-06-02
summary: Upload your full month-end stock sheet and let Nix cross-check every invoice and issue against the app, flag missing documents, and explain why counts differ.
readingMinutes: 4
relatedPaths: [annix-frontend/src/app/stock-control/portal/inventory/reconcile/page.tsx, annix-backend/src/stock-control/services/stock-take-reconciliation.service.ts, annix-backend/src/stock-control/controllers/stock-take-reconciliation.controller.ts]
---

## What it does

Stock-Take Reconciliation reads your complete month-end stock spreadsheet — the matrix with opening stock, every supplier invoice/delivery as a column, daily issues, closing stock, the physical count and the difference — and compares it against what the app actually recorded for that month.

It answers two questions you previously had to chase by hand:
1. **Which documents are missing in the app?** Every invoice/delivery number on your sheet is checked against the app's delivery notes and supplier invoices. Anything on the sheet with no match is flagged.
2. **Why do my counts differ?** For each item it compares the sheet's intake and issues against the app's recorded deliveries and issuances, so a variance can be traced to a missing invoice, a missing issue, an item that didn't match, or genuine shrinkage.

The analysis itself is read-only. From the **missing documents** list you can then create any delivery the app is missing in one click — this records the delivery and raises stock for its items (creating missing issuances is a planned follow-up).

## How the sheet is read

Nix detects the matrix layout automatically:
- The **product code** column identifies items; the column to its left is the item name.
- **Section headings** (rows with no code and no quantities, e.g. *GLOVES*, *PPE*) are treated as categories, never as items.
- Columns between **Opening** and **Total Intake** are read as supplier invoices/deliveries (grouped by the supplier band above them).
- Date columns after **Total Intake** are read as daily issues.
- **Closing**, **Stock Count**, **Diff** and **Total Value** are read for each item.

## Step-by-step

1. Go to **Stock → Reconcile**.
2. Choose the **Month-End Period** you are reconciling.
3. Drop or browse to your month-end stock spreadsheet (Excel or CSV).
4. Click **Analyse & Reconcile** and wait for the progress popup to finish.
5. Review the results:
   - **Summary cards** — items, matched/unmatched, missing documents, intake gaps, issue gaps.
   - **Missing documents** — invoices/deliveries on the sheet with no record in the app. Click **Create delivery** on any of these to record it (with confirmation); stock is increased by the quantities received against that invoice on the sheet.
   - **Item analysis** — per item, the sheet vs app intake and issues, the closing/count/diff, and flags. Tick *Show only items with discrepancies* to focus on problems.

## Reading the flags

- **Intake ≠ app** — the sheet shows more (or fewer) goods received than the app recorded; usually a delivery/invoice not captured.
- **Issues ≠ app** — the sheet shows more (or fewer) items issued than the app recorded.
- **Count variance** — the physical count differs from the sheet's expected closing.
- **Sheet maths off** — opening + intake − issues does not equal the sheet's stated closing (a spreadsheet error).
- **Unmatched** — the item could not be matched to an app stock item (check the code/name).

## Rules and constraints

- The analysis is read-only; the only action that changes data is **Create delivery**, which records a delivery note and raises stock for its items (it will not create a duplicate if that delivery number already exists).
- Deliveries and issues are compared within the selected month only.
- Document matching ignores spacing and punctuation (e.g. "INV 1338" matches "INV1338").
