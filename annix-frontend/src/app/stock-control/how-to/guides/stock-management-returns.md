---
title: Returns (Stock Management)
slug: stock-management-returns
category: Inventory
roles: [storeman, manager, admin]
order: 16
tags: [returns, rubber offcut, paint, consumable, wastage, condition]
lastUpdated: 2026-04-12
summary: Return rubber offcuts, paint, or consumables to stock with usable/contaminated condition tracking.
readingMinutes: 2
relatedPaths:
  - annix-frontend/src/app/modules/stock-management/pages/ReturnsPage.tsx
  - annix-backend/src/stock-management/controllers/returns.controller.ts
  - annix-backend/src/stock-management/services/returns.service.ts
  - annix-backend/src/stock-management/entities/paint-return.entity.ts
  - annix-backend/src/stock-management/entities/consumable-return.entity.ts
  - annix-backend/src/stock-management/entities/rubber-offcut-return.entity.ts
---

## What it does

The Returns page provides three return flows (paint, consumable, rubber offcut) and displays outstanding returns in separate sections for easy category browsing.

## Creating a return

1. Click the button for the type of return: + New Paint Return, + New Consumable Return, or + New Rubber Offcut Return.
2. Fill in the modal form:
   - **Paint**: pick the paint product (type-ahead ComboBox), enter litres returned, select condition (usable or contaminated), optionally add batch number and notes.
   - **Consumable**: same flow but with quantity instead of litres.
   - **Rubber offcut**: enter dimensions (width, length, thickness in mm/m), pick the compound (type-ahead ComboBox with colour auto-derived), optionally add an offcut number and notes.
3. Optionally use the "Take photo" button at the top of any modal to auto-fill fields via AI image recognition. The AI analyses the photo and populates product/compound, dimensions, or batch number. All fields remain editable if the AI gets something wrong.
4. Click Create Return. The return enters "pending" status.

## Confirming or rejecting returns

Outstanding returns appear in three sections: Paint Returns, Consumable Returns, Rubber Offcut Returns. Each row shows the return details and two buttons:

- **Confirm** finalises the return and allocates the stock
- **Reject** asks for a reason, locks the return, and appends the rejection reason to the notes

## Rubber Wastage Bins

Below the returns sections, colour-coded wastage bins show accumulated rubber scrap by colour. Bins are auto-created when wastage is logged. Each bin displays current weight (kg) and value (R).

## Rules

- Usable returned stock does not yet automatically restore FIFO batch quantities (planned enhancement)
- Contaminated returns are logged but do not yet auto-feed into a wastage bin for paint/consumables (planned)
- Rubber offcut returns create a new allocatable offcut stock entry with computed weight from dimensions
