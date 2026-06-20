---
title: Quoting Rubber Lining Work
slug: rubber-quote
category: Admin
roles: [admin, manager]
order: 9
tags: [rubber, lining, quoting, plate, pipe, pricing]
lastUpdated: 2026-06-20
summary: Quote rubber lining work fast — pick a rubber, cure type, bonding system, thickness and area (plate) or length and NB size (pipe), and read off the live sale and MPS price plus the line total. The Plate / Pipe toggle selects the pricing formula, not the rubber.
readingMinutes: 2
relatedPaths: [annix-frontend/src/app/stock-control/portal/rubber-quote/page.tsx, annix-frontend/src/app/stock-control/portal/admin/rubber-pricing/page.tsx, annix-frontend/src/app/lib/query/hooks/stock-control/useRubberPricing.ts, annix-frontend/src/app/lib/api/stock-control-api/rubberPricingMethods.ts]
---

## What it does

Rubber Quote turns the price list maintained in **Rubber Pricing** into a quick sell-price calculation. Choose a rubber, a thickness and the quantity, and it shows the live **sale price** and **MPS (minimum permissible sale) price** plus the **line total** — using only sale prices, never your cost or markup. Prices update **live** as you change anything.

Open it at **Resources → Rubber Quote**.

## Plate vs pipe

The **Plate / Running-metre Pipe** toggle at the top picks how the work is priced:

- **Plate** is priced per **square metre** — you enter the **Area (m²)**.
- **Pipe** is priced per **running metre** — you enter the **Length (m)** and the **NB size**, and the system applies that nominal bore's circumference factor.

The toggle selects the **pricing formula**, not the rubber. Every priced rubber is available under both — switching the toggle re-prices the same rubber and clears the current result.

## Quoting

1. **Supplier** — optionally narrow the rubber dropdown to one supplier, or leave it on **All suppliers**.
2. **Rubber** — pick a rubber from the dropdown. Every priced rubber is available, whichever family you picked.
3. **Cure type** — when a rubber exists in more than one cure (Steam, Pre-cured, Chemical), choose the cure variant here. If there's only one cure for the chosen rubber the dropdown is fixed.
4. **Bonding system** — defaults to the selected rubber's own bonding type. Change it to price the same compound under a different bonding system, or leave it on **Default** to use the rubber's configured bonding.
5. **Thickness (mm)** — choose the lining thickness from the rubber's available thicknesses. It defaults to the thickest option.
6. **NB size** (pipe only) — choose the nominal bore (50NB … 1000NB). This drives the per-running-metre circumference factor, so a quote isn't produced until an NB size is selected.
7. **Area (m²)** (plate) or **Length (m)** (pipe) — enter the quantity to apply.

There is no Calculate button — every change recalculates automatically once a rubber, a valid thickness, a quantity (and, for pipe, an NB size) are set.

## The totals

Once the quote is valid the card shows:

- **Sale / m²** (plate) or **Sale / metre** (pipe) — the unit sale price.
- **MPS / m²** or **MPS / metre** — the minimum permissible sale price per unit.
- **MPS total** — the MPS price across the quantity.
- **Line total** — the large, brand-accented sale total across the quantity.

If the page shows "No priced rubber available — add some in Rubber Lining Pricing", add or import rubbers on the **Rubber Pricing** page first, then come back to quote them.
