---
title: Finding and Merging Duplicate Stock Items
slug: finding-and-merging-duplicate-stock-items
category: Inventory
roles: [manager, admin]
order: 42
tags: [inventory, duplicates, merge, stock codes, deduplication, GLV, out of stock]
lastUpdated: 2026-04-09
summary: Detect and consolidate duplicate stock items that were created from separate deliveries.
readingMinutes: 3
relatedPaths:
  - annix-frontend/src/app/stock-control/components/inventory/InventoryDuplicatesPanel.tsx
  - annix-frontend/src/app/stock-control/components/inventory/InventoryToolbar.tsx
  - annix-frontend/src/app/stock-control/portal/inventory/page.tsx
  - annix-backend/src/stock-control/services/inventory.service.ts
  - annix-backend/src/stock-control/controllers/inventory.controller.ts
---

## What are duplicate stock items?

When the system receives deliveries from suppliers, it tries to match each item on the delivery note to an existing stock item. If the supplier uses a different description or code for the same product across deliveries, the system may create a second stock entry instead of adding to the existing one.

This causes problems:
- The same product appears multiple times in the inventory list
- Staff issuing stock may pick the wrong entry (showing zero quantity) when the real stock is under a different code
- Stock counts and low-stock alerts become inaccurate

## How to find duplicates

1. Go to **Inventory** from the Stock Control sidebar
2. Click the **Find Duplicates** button in the toolbar (next to Import)
3. The system scans all stock items and groups potential duplicates by name and SKU similarity
4. A modal shows each group with a match confidence score (e.g. "High 85%")

Each group shows:
- The **primary** item (the one the system considers canonical)
- One or more **duplicate** items with their match scores
- The **total quantity** across all items in the group

## How to merge duplicates

1. Click **Merge Group** on any duplicate group
2. In the confirmation dialog, select which item to **keep** (the target). All other items will be merged into it.
3. Click **Merge Items** to confirm

What happens during a merge:
- The target item's quantity increases by the sum of all merged items
- All delivery history, stock movements, and issuance records are transferred to the target
- The merged (source) items are permanently removed
- A stock movement record is created for the adjustment

## How delivery matching works now

The system uses several strategies to match incoming deliveries to existing stock:
- **Learned matches** from previous deliveries (gets better over time)
- **Exact and normalised SKU matching** (ignoring hyphens, spaces, case)
- **Name similarity scoring** using word overlap (e.g. "MAGENTA ACRYLIC PAINT 5L" matches "5 Litre Magenta Acrylic")
- **Supplier recognition** (strips legal suffixes like Pty/Ltd/CC when comparing supplier names)

## Reviewing matches before adding to stock

When you click **Add to Stock** on a delivery note, a review screen shows each extracted item and its proposed match:
- Items matched to existing stock show the target item with a confidence score
- Items marked as **New** will create a new stock entry
- You can override any match by clicking **Create New** (to force a new item) or accepting the proposed match

## Tips

- Run **Find Duplicates** periodically, especially after importing deliveries from a new supplier
- After merging, the system learns the mapping so future deliveries from the same supplier will auto-match correctly
- Only managers and admins can access the duplicate detection and merge tools
