---
title: CPO Batch Stock Issuing (Multi-JC)
slug: issue-stock-cpo-batch
category: Inventory
roles: [storeman, manager, admin]
order: 6
tags: [issue stock, cpo, batch, paint, lining, blasting, multi-jc, storeman]
lastUpdated: 2026-04-11
summary: Issue paint, blasting, and lining stock for several Job Cards under the same CPO in one go, with aggregated paint limits and per-JC splits.
readingMinutes: 4
relatedPaths: [annix-frontend/src/app/stock-control/portal/issue-stock/page.tsx, annix-frontend/src/app/stock-control/components/CpoBatchPicker.tsx, annix-frontend/src/app/stock-control/components/PerJcSplitEditor.tsx, annix-frontend/src/app/stock-control/portal/cpo-batch-approvals/page.tsx, annix-backend/src/stock-control/services/issuance.service.ts, annix-backend/src/stock-control/controllers/issuance.controller.ts, annix-backend/src/stock-control/entities/issuance-session.entity.ts]
---

## Why CPO batch issuing exists

When the shop floor blasts, paints or lines several Job Cards from the same CPO together, the storeman previously had to repeat the issuance flow for each JC one at a time. That slowed the workflow down and forced the storeman to over-issue paint per-JC because the per-JC paint limits did not reflect the reduced wastage of a combined spray session.

CPO batch issuing lets the storeman issue stock to several JCs (under the same CPO) in **one** session. The system aggregates paint limits across the selected JCs, splits the issued quantity per JC for traceability, and creates a single undo-able session.

## Turning on CPO batch mode

1. Go to **Issue Stock**.
2. Tick the **CPO Batch (multi-JC)** checkbox at the top of the page (next to Quick Issue and Batch Mode).
3. Continue with **Issuer** and **Recipient** as normal.
4. On the **Job Card** step you will see a blue **CPO Batch Mode** panel. Click **Pick a CPO + JCs**.

## Picking a CPO and its child JCs

1. Search the CPO list and click the CPO you are issuing for.
2. The picker shows all active child JCs of that CPO with their **m²**, **paint litres required**, and **coating analysis status** (PM OK / Analysed / etc.).
3. By default every child JC is ticked. Untick any JC that is not part of this batch (for example, JCs that are being processed on a different day).
4. The aggregated paint requirement appears at the bottom — total external m², internal m² and litres per coating product across the selected JCs.
5. Click **Use these N JCs**.

## Issuing stock and splitting per JC

1. Add stock items the same way as a normal issuance (QR scan, photo, browse, favourites).
2. For each item, a **split editor** appears below the quantity field. The system pre-fills the split using a **pro-rata-by-m²** distribution across the selected JCs.
3. You can edit any split manually, or click **Pro-rata by m²** to reset it.
4. The split sum must equal the total issued quantity. The status badge at the bottom of the editor turns green when balanced.
5. Click **Confirm** to submit.

## Aggregated paint limit

The system compares the total issued quantity against the **sum of allowed litres** for that paint product across all selected JCs (taken from each JC's coating analysis).

- If the request is **within** the aggregated limit, the session is created in `active` state and stock is decremented immediately.
- If the request **exceeds** the aggregated limit, the session is still created but is flagged as `pending_approval` and the manager is notified. Stock is still decremented (storeman has the paint), but the session must be approved or rejected by a manager before the data book is finalised.

## Approving / rejecting a pending session (manager / admin only)

1. Open **CPO Batch Approvals** in the navigation.
2. Click a session to expand it. You will see all issued items grouped by stock item, with a per-JC breakdown.
3. Click **Approve** to clear the pending flag and lock the session in.
4. Click **Reject & Roll Back** to reverse every issuance row in the session — stock returns to the bin and the JC allocations are deleted. You must enter a reason; the rejection is recorded on the session.

You must have your staff profile linked (Quick Issue settings) before you can approve, because the approval is recorded against your staff member.

## Undoing a session

Sessions can be undone from the storeman's session summary on the Issue Stock page within **5 minutes** of creation (same window as single-JC issuances). Pending-approval sessions can also be rolled back any time via the **Reject** action on the approvals page.

Undoing a session reverses every `StockIssuance` row in one transaction and removes the corresponding `StockAllocation` records from each child JC.

## Rules and constraints

- Every JC selected for a CPO batch must already be linked to that CPO (`cpoId` matches).
- All splits must sum exactly to the total issued quantity (within 0.01 tolerance).
- Splits cannot reference a JC that is not in the session.
- A session is bound to a single issuer and recipient — you cannot mix recipients in one session. Use Batch Mode if you need to issue to several recipients.
- Sessions show up on the **CPO detail page** under **Stock Issuance Sessions** and on each **JC detail page** under **Linked CPO Batch Sessions**.

## Tips

- If your shop floor only ever processes one JC at a time, leave CPO Batch mode off — the regular per-JC flow is unchanged.
- Pro-rata-by-m² works well for paint, but for non-paint items (consumables, tape, masking) you may want to override the split manually so one JC gets the full amount.
- Combine CPO batch with **Batch Mode** to keep the items step open between sessions when you are issuing for several CPOs in a row.
