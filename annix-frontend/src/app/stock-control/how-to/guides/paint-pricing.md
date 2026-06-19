---
title: Managing Paint Pricing
slug: paint-pricing
category: Admin
roles: [admin, manager]
order: 6
tags: [paint, pricing, coating, quoting, discounts]
lastUpdated: 2026-06-19
summary: Maintain the paint price list and the markup, application cost and discount tiers used to quote coating work per square metre.
readingMinutes: 4
relatedPaths: [annix-frontend/src/app/stock-control/portal/admin/paint-pricing/page.tsx, annix-frontend/src/app/lib/query/hooks/stock-control/usePaintPricing.ts, annix-frontend/src/app/lib/api/stock-control-api/paintPricingMethods.ts]
---

## What it does

Paint Pricing keeps a price list of every paint you buy and turns it into a sale price per square metre. For each paint the system uses its volume solids, cost per litre and recommended film thickness to work out how much surface area a litre covers, then applies your markup, application cost and discount tiers so you can quote coating work consistently.

Open it at **Admin → Paint Pricing**.

## Pricing settings

The settings panel at the top controls how every paint is priced:

- **Application cost (R/m²)** — labour and consumables added to every square metre on top of paint cost.
- **Markup factor** — the multiplier applied to cost to reach the standard sale price.
- **Flat-plate loss %** — editable. It reflects wastage on flat-plate work and reduces the usable coverage of each litre (default 45). Adjust it here and it recalculates every paint's coverage and pricing.

Click **Save settings** after any change.

### Discount tiers

Discount tiers are named price levels (for example a key-account tier) shown as extra columns in the price list. Use **+ Add tier** to create one, give it a name and a discount percentage, and **Remove** to delete it. Each tier produces its own per-square-metre price for every paint.

## The paint price list

Each row is one paint. You can edit the editable columns:

- Supplier, Product, Paint type (the chemistry, e.g. Epoxy or Polyurethane), Coat type (primer / intermediate / final), Pack size (L)
- Vol solids %, Cost/L, Cost/kit, Uplift %
- Recommended µm and a µm override
- Thinner, Thinner R/L and Max thin %

The remaining columns are calculated automatically and cannot be edited: flat-plate coverage (m²/L), coverage after loss, thinner cost/m², cost/m², **sale/m²**, and one column per discount tier.

The list is a **frozen-pane table**: the header row stays pinned to the top and the first two columns (Supplier and Product) stay pinned to the left while you scroll, so you never lose track of which paint a row belongs to. The table has its own scrollbars once it fills the screen — scroll inside it horizontally to reach the pricing columns and vertically through long lists without scrolling the whole page.

### Filtering the list

Above the table, three dropdowns narrow down which paints are shown:

- **Supplier** — show only paints from one supplier, or all suppliers.
- **Coat type** — show only primer, intermediate or final coats, or all coat types.
- **Paint type** — show only one chemistry (e.g. Epoxy), or all paint types.

Combine them to drill in (for example, one supplier's epoxy primers). When any filter is active the heading reads **Showing N of M paints**. The blank add-paint row at the bottom stays visible no matter what is filtered, so you can always add a new paint.

### Bulk uplift %

Above the list, the **Bulk uplift %** control sets the same uplift percentage on every paint at once. Type a percentage, click **Apply to all**, and confirm — every row's uplift is overwritten and the pricing columns recalculate immediately. Use it when a blanket increase applies across the whole price list rather than editing rows one at a time.

## Uploading a supplier price list

Instead of typing paints in one by one, you can import a supplier's price list straight from a **PDF, photo, or Excel/CSV spreadsheet** — whichever format the supplier sends.

Some price lists (like StonCor's) already include volume solids, film thickness and thinner details, so every column is filled in automatically. Others (like Jotun's spreadsheet) only list the product and the price per litre — for those, the system fills in volume solids and recommended microns from its built-in coating reference where it recognises the product. Anything it can't match is left blank for you to complete, and you can edit any imported value before or after saving.

1. Click **Upload supplier price list** at the top of the price list and pick the file. Nix reads it and shows a progress popup while it works.
2. A review window opens listing every paint it found — supplier, product, coat type, pack size, volume solids, cost per litre, thinner and max thinning. Check the **Found N paints** count and the rows.
3. Leave **Replace all existing {supplier} rows** ticked to swap out that supplier's current paints for the imported set, or untick it to add the imported paints alongside what's already there.
4. Click **Confirm import**. The paints are saved, the list refreshes with recalculated pricing, and you'll see an **Imported N paints** confirmation. Click **Cancel** to discard the extraction without saving anything.

## Filling in missing specs

When a price list only carries prices (no volume solids, film thickness, coat type or chemistry), those paints import with blank spec columns and can't show a sale price yet. Click **Find missing specs (Nix)** to fill only the blank fields — coat type (primer / intermediate / final), paint type (chemistry), volume solids, recommended microns, thinner and max thinning %. It checks the system's built-in coating reference first and uses Nix's knowledge of the published data sheets for anything the reference doesn't cover, leaving values it isn't sure of blank and never overwriting values you already have. This is a separate step from the upload so importing prices stays fast.

Because some of these values come from Nix's knowledge rather than the exact current data sheet, spot-check the filled coat type and any filled volume solids / microns against the supplier's TDS before relying on the sale prices.

Nothing is saved until you confirm — the upload step is only a preview.

## Adding, editing and deleting

- **Add a paint** — fill in the blank row at the bottom of the table and click **Add paint**. Supplier, product, vol solids and cost per litre are required.
- **Edit a paint** — click **Edit** on a row, change the values, then **Save** (or **Cancel** to discard).
- **Delete a paint** — click **Delete** and confirm. This cannot be undone.

Computed coverage and pricing columns refresh as soon as a paint is saved.
