---
title: Month-End Stock Take via Import
slug: month-end-stock-take-via-import
category: Inventory
roles: [storeman, manager, admin]
order: 7
tags: [stock take, import, month-end, count, variance, soh, spreadsheet]
lastUpdated: 2026-06-02
summary: Upload a physical stock-count spreadsheet to balance stock-on-hand for a chosen month-end, with section headers used as categories and a count date that replays later movements.
readingMinutes: 4
relatedPaths: [annix-frontend/src/app/stock-control/portal/inventory/import/page.tsx, annix-frontend/src/app/stock-control/portal/inventory/import/ImportReviewStep.tsx, annix-backend/src/stock-control/services/import.service.ts, annix-backend/src/stock-control/controllers/import.controller.ts]
---

## What it does

Stock Take Mode on the Import screen lets you upload your physical month-end count spreadsheet and align stock-on-hand (SOH) to the counted quantities. It only touches quantities — minimum stock levels, costs, locations and other settings are preserved. Items on the system that are not on your count are set to zero, and a variances spreadsheet is produced so you can trace every difference.

## How the month-end period and count date work

The system does not guess which month you are balancing — you tell it:

- **Month-End Period** — pick the month this count reconciles (e.g. *May 2026 Month-End*). Every stock movement created by the import is stamped with this label, and the variances file is named after it, so the count is a properly named record.
- **Actual Count Date** — defaults to the last day of the chosen month, but you can change it to the day you physically counted. Any deliveries and issuances recorded **after** this date are replayed on top of your counted figures, so a late or mid-month upload still balances correctly.

> Example: you count on 31 May but only upload on 2 June. Set the period to *May 2026 Month-End* and leave the count date on 31 May. Stock that arrived or was issued on 1–2 June is added/subtracted automatically.

## Section headers become categories

Spreadsheets often group items under section headings (e.g. *PAINT BRUSHES & ROLLERS*, *GLOVES*, *PPE*). Nix recognises these heading rows — a text row with no product code and no quantities — and files the items beneath them under that category instead of creating the heading as a stock item. Code-less rows that still carry stock numbers are kept as real (un-coded) products.

## Step-by-step

1. Go to **Stock → Import**.
2. Drop or browse to your count spreadsheet (Excel or CSV).
3. On the preview screen, tick **Stock Take Mode**.
4. Choose the **Month-End Period** from the dropdown.
5. Adjust the **Actual Count Date** if you counted on a day other than the month-end.
6. Click **Review & Match**. Check the matched items, categories and quantities — edit, skip or delete rows as needed.
7. Click **Confirm Import** and confirm the full-stock-take prompt.
8. On the results screen, download the **Stock Variances** spreadsheet to trace any differences.

## Rules and constraints

- Stock Take Mode only updates quantities (SOH); all other item fields are preserved.
- Confirming aligns the whole catalogue to the count — items absent from the sheet are zeroed.
- Heading rows are never imported as stock items; they are used only to categorise the items under them.
- Always set the Actual Count Date for a late upload so post-count movements are replayed.
