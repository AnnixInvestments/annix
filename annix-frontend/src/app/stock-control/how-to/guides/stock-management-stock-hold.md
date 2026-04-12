---
title: Stock Hold Queue
slug: stock-management-stock-hold
category: Inventory
roles: [admin, accounts]
order: 18
tags: [stock hold, damaged, expired, contaminated, disposition, quarantine]
lastUpdated: 2026-04-12
summary: Quarantine damaged, expired, or contaminated stock and resolve with a disposition action.
readingMinutes: 2
relatedPaths:
  - annix-frontend/src/app/stock-control/portal/preview/stock-management/admin/stock-hold/page.tsx
  - annix-backend/src/stock-management/controllers/stock-hold.controller.ts
  - annix-backend/src/stock-management/services/stock-hold.service.ts
---

## What it does

The Stock Hold queue manages items flagged as damaged, expired, contaminated, recalled, wrong-spec, or other. Items enter the queue via the "Move to Hold" button on stock take variance lines or via the stock-hold flag endpoint.

## Flagging stock

Stock can be flagged for hold from:
- **Stock Take variance lines**: when reviewing a variance, click "Move to Hold", select a reason, and add notes. The absolute variance quantity is flagged.
- **API endpoint**: POST /stock-management/stock-hold/flag with productId, reason, and reasonNotes.

Reasons requiring photo evidence before flagging: damaged, expired, contaminated.

## Resolving held items

Navigate to Admin > Stock Hold in the preview. The queue shows all pending items with their reason, flagged date, and quantity. For each item, administrators can resolve with one of these dispositions:

- **Scrap**: write off the stock as a loss
- **Return to supplier**: send back for credit or replacement
- **Repair**: send for refurbishment and return to active stock
- **Donate**: charitable disposal
- **Other**: custom disposition with notes

## Notifications

- When an item is flagged: admin and accounts receive a notification
- After 7 days without resolution: an aging reminder fires
- When disposition is complete: the flagging user is notified

## Rules

- Stock Hold requires the **Enterprise** license tier (STOCK_HOLD_QUEUE feature)
- Permissions: `stock.hold.flag` (default: storeman and above), `stock.hold.resolve` (default: admin + accounts)
- The aging report and disposition history are available in the admin hold queue view
