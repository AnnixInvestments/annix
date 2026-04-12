---
title: Stock Take
slug: stock-management-stock-take
category: Inventory
roles: [storeman, accounts, manager, admin]
order: 17
tags: [stock take, inventory count, variance, month-end, approval]
lastUpdated: 2026-04-12
summary: Run month-end stock takes with a draft-count-approve-post lifecycle and variance tracking.
readingMinutes: 3
relatedPaths:
  - annix-frontend/src/app/modules/stock-management/pages/StockTakePage.tsx
  - annix-backend/src/stock-management/controllers/stock-take.controller.ts
  - annix-backend/src/stock-management/services/stock-take.service.ts
  - annix-backend/src/stock-management/services/stock-take-cron.service.ts
---

## What it does

Stock Take provides a full lifecycle for month-end inventory reconciliation: create a draft session, capture a snapshot of expected quantities, count actual stock, review variances, get manager/admin approval, and post adjustments.

## Step-by-step

1. Click **+ New** to start a new stock take. Pick the month-end period from the dropdown (defaults to the current month).
2. The session starts in **draft** status. Click **Capture Snapshot** to freeze the expected quantities from current inventory levels.
3. Status moves to **counting**. Staff counts physical stock and records quantities per product per location.
4. When counting is complete, click **Submit for Approval**. Status moves to **pending_approval**.
5. A manager or admin reviews the variance lines. Any line with a non-zero variance can be moved to the stock hold queue via the **Move to Hold** button (select a reason and add notes).
6. Click **Approve** to accept the stock take or **Reject** with a reason to send it back for recounting.
7. After approval, click **Post Adjustments** to apply the counted quantities as the new inventory baseline.

## Variance lines

The detail view shows a dedicated "Variance lines" section listing every product where counted quantity differs from expected. Each line is colour-coded:
- Red: negative variance (shrinkage)
- Amber: positive variance (found stock)

## Automatic stock takes

A cron job runs on the 1st of every month at midnight to auto-create a draft stock take session for each company. This session sits in draft until a storeman captures the snapshot and begins counting.

## Rules

- Stock Take requires the **Enterprise** license tier
- The monthly cron job is registered in Admin > Scheduled Jobs and can be paused or frequency-adjusted
- High-value variances trigger escalation notifications to accounts and admin
- Photo evidence is required for variance categories marked as photo-mandatory (damaged, expired, contaminated)
