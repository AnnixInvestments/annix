---
title: Issue Stock (Unified)
slug: unified-issue-stock
category: Inventory
roles: [storeman, manager, admin]
order: 15
tags: [issuing, stock, consumable, paint, rubber, CPO, job card, QR scan]
lastUpdated: 2026-04-19
summary: Issue consumables, paint, rubber rolls, or solutions against job cards or CPOs in a single unified flow with per-product spec selection and coat-level tracking.
readingMinutes: 4
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
4. **Select Product Spec (CPO only)** — when a CPO is selected, you must choose one specific product to issue per session (e.g. "PENGUARD EXPRESS RED OXIDE RAL 3009A (primer)" or "JOTAMASTIC 90 BEIGE RAL 1001 (final)"). Only that product's coat rows, quantities, and allocation plan are shown. This prevents issuing multiple coats simultaneously since each coat needs drying time before the next can be applied. Create another session for additional products.
5. **Items** — search for products, click Add to put them in the cart. For paint products linked to a CPO with multiple job cards, a pro-rata split editor appears below the cart row. For multi-part paints, use the "Same batch for all" checkbox to quickly fill batch numbers across all tins. For rubber rolls, a sub-editor for weight and dimensions appears. Photo identification is available via a camera button.
6. **Confirm** — review issuer, recipient, target, and cart contents. Click Submit to create the issuance session.

## Coat status indicators

Each line item shows colour-coded coat rows beneath it:
- **Green** — not yet issued, full quantity available
- **Amber** — partially issued, remaining quantity shown
- **Red** — fully issued, no remaining quantity

Each coat row also shows the DFT specification (e.g. "75–125 µm") from the coating analysis when available, so the storeman can verify they are issuing the correct product for the required film thickness.

The editable quantity field shows remaining units for the selected product spec. Items that are fully issued are automatically unchecked and disabled.

The JC header badge shows which coats have been issued (e.g. "Primer Issued", "Final + Primer Issued").

The Selection Summary at the bottom dynamically adjusts m2 and litres based on remaining quantities. It also shows the generic type (e.g. "epoxy mio", "polyurethane") and DFT range for each paint product.

## Rules

- Issuer and recipient must be different people
- At least one item must be in the cart
- Only one product spec can be issued per session (for CPO issuances)
- Paint pro-rata splits must balance (sum of splits = total litres)
- Photo identification requires the PHOTO_IDENTIFICATION feature to be enabled on your company tier

## Tips

- On mobile, the stepper pills wrap and the cart rows stack vertically for easy thumb input
- The Staff QR scanner uses the device camera and auto-detects the code from the frame
- You can skip step 3 entirely for ad-hoc issuing without a job card or CPO link
- Use the "Same batch for all" checkbox when all tins of a paint part share the same batch number
