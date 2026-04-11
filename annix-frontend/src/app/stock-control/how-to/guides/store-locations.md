---
title: Managing Store Locations
slug: store-locations
category: Admin
roles: [admin]
order: 6
tags: [locations, warehouse, settings]
lastUpdated: 2026-04-11
summary: Define the physical bins, racks, and zones where stock can be stored.
readingMinutes: 3
relatedPaths: [annix-frontend/src/app/stock-control/portal/settings, annix-backend/src/stock-control/locations]
---

## Why locations matter

Every stock movement is tied to a location. Good location hygiene means accurate reports, faster picking, and less lost stock.

## Creating a location

1. Open **Settings → Locations**
2. Click **New Location**
3. Pick a parent (or leave blank for top-level)
4. Set the name, code, and type (bin, rack, zone, yard)
5. Save

## Tree structure

Locations are hierarchical. A typical layout might be:

- **Main Warehouse**
  - Rack A
    - Bin A1
    - Bin A2
  - Rack B
- **Yard**

Moving stock into a parent records the parent as the location. Reports can roll up from bin to rack to warehouse automatically.

## Deactivating

You cannot delete a location that has ever held stock. Instead, mark it **Inactive** — it disappears from pickers but remains in historical reports.
