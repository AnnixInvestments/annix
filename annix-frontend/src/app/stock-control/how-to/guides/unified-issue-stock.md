---
title: Issue Stock (Unified)
slug: unified-issue-stock
category: Inventory
roles: [storeman, manager, admin]
order: 15
tags: [issuing, stock, consumable, paint, rubber, CPO, job card, QR scan]
lastUpdated: 2026-04-12
summary: Issue consumables, paint, rubber rolls, or solutions against job cards or CPOs in a single unified flow.
readingMinutes: 3
relatedPaths:
  - annix-frontend/src/app/modules/stock-management/pages/IssueStockPage.tsx
  - annix-frontend/src/app/modules/stock-management/components/StaffPicker.tsx
  - annix-frontend/src/app/modules/stock-management/components/JobCardOrCpoPicker.tsx
  - annix-backend/src/stock-management/controllers/issuance.controller.ts
  - annix-backend/src/stock-management/services/issuance.service.ts
---

## What it does

The unified Issue Stock page replaces the three old stock control pages (Issue Stock, Rubber Issuing, CPO Batch Approvals issuing) with a single mobile-friendly stepper flow that handles all product types in one session.

## Step-by-step

1. **Issuer** — pick the storeman issuing the stock. Defaults to the logged-in user. Can also scan a staff QR badge.
2. **Recipient** — pick the staff member receiving the stock. Use the search field or scan a QR badge.
3. **Job Card or CPO (optional)** — link this issuance to a job card or a CPO. Tabs let you switch between Job Cards and CPOs. Search by number, customer, or job name. Can also scan a job card QR. Click Skip if issuing without a target.
4. **Items** — search for products, click Add to put them in the cart. For paint products linked to a CPO with multiple job cards, a pro-rata split editor appears below the cart row. For rubber rolls, a sub-editor for weight and dimensions appears. Photo identification is available via a camera button.
5. **Confirm** — review issuer, recipient, target, and cart contents. Click Submit to create the issuance session.

## Rules

- Issuer and recipient must be different people
- At least one item must be in the cart
- Paint pro-rata splits must balance (sum of splits = total litres)
- Photo identification requires the PHOTO_IDENTIFICATION feature to be enabled on your company tier

## Tips

- On mobile, the stepper pills wrap and the cart rows stack vertically for easy thumb input
- The Staff QR scanner uses the device camera and auto-detects the code from the frame
- You can skip step 3 entirely for ad-hoc issuing without a job card or CPO link
