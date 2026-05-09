---
title: Importing a Sage JC Dump
slug: importing-a-sage-jc-dump
category: Jobs & Workflow
roles: [storeman, accounts, manager, admin]
order: 6
tags: [sage, cpo, job card, dump, jt, pooling]
lastUpdated: 2026-05-09
summary: Upload a Sage JC dump against a CPO to create child job cards per JT, with items on the same JT pooled into a single JC across the whole Sage Job.
readingMinutes: 4
relatedPaths: [annix-backend/src/stock-control/services/sage-jc-dump.service.ts, annix-frontend/src/app/stock-control/portal/purchase-orders/[id]/page.tsx, annix-frontend/src/app/stock-control/components/AsteriskAllocationModal.tsx]
---

## What is a Sage JC dump

A Sage JC dump is the Excel export from Sage that lists the items, JT numbers, and delivery sheets for a Sage Job. Uploading it against a CPO creates one child Job Card per JT under that CPO, with the line items pre-populated from the dump.

## How pooling works

A Sage Job (e.g. `P9945`) usually has multiple delivery sheets — each delivery has its own CPO in Annix (`CPO-P9945-JC025668`, `CPO-P9945-JC025679`, `CPO-P9945-JC025696`, etc.). The same JT (e.g. `JT80762`) can appear on more than one delivery.

Two rules govern how the dump is processed:

1. **Page filter by delivery** — when you upload the dump against `CPO-P9945-JC025696`, only the page in the dump whose Doc number is `JC025696` is ingested. Pages for other deliveries (`JC025668`, `JC025679`, …) are ignored. This prevents the same line items being created multiple times when you upload the dump for different CPOs.
2. **Pool by JT across the Sage Job** — if a JT already has a child Job Card under any CPO of the same Sage Job, the new dump's items for that JT are appended to the existing JC instead of creating a duplicate. The CPO's fulfilment counter still updates correctly. The JC keeps its first-seen parent CPO link in the header, and you'll see "Pooled into existing job cards" in the import summary.

## Steps

1. Open **Purchase Orders → [your CPO]**
2. Click **Import Sage Dump**
3. Choose the Sage Excel file
4. Annix parses the file and shows a preview:
   - **New JT groups** — JTs that don't yet exist under this Sage Job; each will become its own child JC
   - **Will be pooled into existing JCs** — JTs already present elsewhere; their items will be appended
   - **Items needing allocation** — asterisk-marked items requiring you to pick a JT in the allocation modal
   - **Undelivered items** — items without a JT, no child JC is created for these
5. If the allocation modal opens, allocate the asterisk items to JTs and click **Confirm**. Otherwise the import auto-confirms.
6. The result panel shows what was created vs. pooled

## Rules

- The dump file must contain at least one page whose **Doc** number matches the CPO's JC suffix (e.g. `JC025696` for `CPO-P9945-JC025696`). If no page matches, the upload is rejected with a clear error.
- For legacy CPOs without a `-JC…` suffix, the page filter is bypassed and all pages are ingested.
- Pooling is scoped to the same `jobNumber` (e.g. `P9945`). JTs from different Sage Jobs with the same JT number are not pooled together.
- Pooled JCs retain their original parent CPO and workflow state — only the line items grow.

## Tips

- If you want to see all line items for a pooled JT, open the JC by its number — the view shows every item that has been added across multiple dumps.
- The CPO fulfilment counter on each CPO reflects only items delivered against *that* CPO. Pooling does not double-count.
