---
title: Managing Rubber Lining Pricing
slug: rubber-pricing
category: Admin
roles: [admin, manager]
order: 8
tags: [rubber, lining, pricing, quoting, plate, pipe]
lastUpdated: 2026-06-21
summary: Maintain the rubber lining price list, the bonding agents list, and the global tunables — paraffin, blasting, department rates, markup, waste and MPS — used to quote rubber lining work per square metre (plate) and per running metre (pipe).
readingMinutes: 5
relatedPaths: [annix-frontend/src/app/stock-control/portal/admin/rubber-pricing/page.tsx, annix-frontend/src/app/stock-control/portal/admin/rubber-pricing/BondingAgentsCard.tsx, annix-frontend/src/app/stock-control/portal/rubber-quote/page.tsx, annix-frontend/src/app/lib/query/hooks/stock-control/useRubberPricing.ts, annix-frontend/src/app/lib/query/hooks/stock-control/useRubberBondingAgents.ts, annix-frontend/src/app/lib/api/stock-control-api/rubberPricingMethods.ts, annix-frontend/src/app/lib/api/stock-control-api/rubberBondingAgentMethods.ts]
---

## What it does

Rubber Lining Pricing keeps a price list of every rubber you buy and turns it into a sale price — per square metre for plate work and per running metre for pipe. For each rubber the system uses its specific gravity, cost per kilogram and your global tunables (blasting, curing, labour and markup) to work out the material and labour cost, then applies waste, markup and the MPS factor so you can quote rubber lining work consistently.

Open it at **Resources → Rubber Pricing**.

## Plate and pipe families

The price list and the per-family factors are split into two **families**, switched with the **Plate / Running-metre Pipe** toggle:

- **Plate** is priced per square metre.
- **Pipe** is priced per running metre, using the nominal-bore (NB) circumference factor.

Each rubber belongs to one family. The toggle controls which family's rows you see in the price list and which family's factors you edit.

## Global pricing settings

The settings panel at the top controls how every rubber is priced. Click **Save settings** after any change.

### Paraffin / curing

The paraffin (curing) inputs cover the cure step:

- **Litres per cure** — paraffin used per cure cycle.
- **Cost per litre (R)** — the price of paraffin.
- **m² per pot** — how much surface area one pot covers, which spreads the curing cost across the work.

### Blasting

The blasting inputs set the surface-preparation cost per square metre:

- **Elec avg rate** and **Elec avg kWh** — the electricity rate and consumption for the blast plant.
- **Grit bag cost (R)** and **Grit m² per bag** — grit cost and how far a bag goes.
- **m² per hour** and **Crew size** — the blast throughput and crew, which drive the labour portion.
- **Margin** — the blasting margin applied on top.
- **Consumable markup** — the markup added to consumables across the costing.

### Department average hourly rates

The **Department average hourly rates** grid lists every department that contributes labour (for example rubber lining, handling, finishing, solution). Set each department's average hourly rate; the rates feed the labour stack that makes up the per-square-metre price.

### Per-family factors

The **Per-family factors** table sets three numbers for each family (Plate and Pipe):

- **Waste %** — material wastage added to the rubber cost.
- **Markup factor** — the multiplier applied to cost to reach the sale price.
- **MPS factor** — the factor used to derive the minimum permissible sale (MPS) price shown alongside the sale price.

## The rubber price list

Each row is one rubber product for the selected family. You can edit **Cost/kg** and **Uplift %** inline — type a new value and click out of the field to save it immediately; the **Sale/m² (ref)** column (the computed sale price at the family's reference thickness) refreshes and is read-only.

### Editing, adding and deleting

- **Edit a rubber** — click **Edit** on a row, change supplier, code, name, bonding type, colour, Shore A hardness, specific gravity, cost/kg, uplift or the **Preferred** flag, then **Save** (or **Cancel** to discard). Supplier, product code and specific gravity are required. **Bonding** is a dropdown (Natural, Premium Natural, Chemical, Butyl, Nitrile, Neoprene, EPDM, Cured) — changing it re-prices the row, so the computed **Sale/m²** updates immediately.
- **Add a rubber** — fill in the blank row at the bottom of the table and click **Add**. Supplier, product code and specific gravity are required.
- **Delete a rubber** — click **Delete** and confirm. This cannot be undone.

The **Preferred** checkbox marks a rubber as a default choice; tick or untick it directly in the row and it saves immediately.

### Filtering the list

Above the table, the **Plate / Pipe** toggle picks the family and the **Supplier** dropdown narrows the list to one supplier (or all). The blank add-rubber row at the bottom stays visible whatever is filtered.

### Bulk uplift %

The **Bulk uplift %** control sets the same uplift percentage on every rubber at once. Type a percentage, click **Apply to all**, and confirm — every row's uplift is overwritten and the pricing recalculates immediately.

### Seed from product data

If the price list is empty, click **Seed from product data** and confirm to backfill it from the built-in rubber reference data. This only runs while the list is empty.

## Uploading a supplier price list

Instead of typing rubbers in one by one, you can import a supplier's price list straight from a **PDF, photo, or Excel/CSV spreadsheet**.

1. Click **Upload supplier price list** at the top of the price list and pick the file. Nix reads it and shows a branded progress popup while it works.
2. A review window opens listing every rubber it found — family, supplier, code, bonding type, colour, Shore A, specific gravity and cost/kg. Check the count and the rows.
3. Leave **Replace all existing products for this supplier** ticked to swap out that supplier's current rubbers for the imported set, or untick it to append the imported rubbers alongside what's already there.
4. Click **Import products** to save, or **Cancel** to discard the extraction without saving anything.

Nothing is saved until you confirm — the upload step is only a preview. Computed pricing refreshes as soon as the import is saved.

## Bonding agents

Below the rubber price list is a separate **Bonding agents** card for the adhesives / bonding agents used to bond rubber to steel. Each row's **spread rate** (m² per litre) drives its **Cost/m²**, and the **Sale/m²** is the cost multiplied by the consumable markup (set in **Global pricing settings → Consumable markup**). Both computed columns are read-only.

### Managing bonding agents

- **Filter** the list to one supplier with the **Supplier** dropdown, or leave it on **All suppliers**.
- **Edit** a row to change supplier, name, pack size (L), price/tin, price/L or spread rate (m²/L), then **Save**. Only the name is required. Cost/m² and Sale/m² recompute automatically.
- **Add** a bonding agent in the blank row at the bottom of the table and click **Add**.
- **Delete** a bonding agent with **Delete** and confirm. This cannot be undone.

### Seeding and importing bonding agents

- **Seed from product data** backfills the list from the built-in reference data, and only runs while the list is empty.
- **Upload supplier price list** reads a supplier's adhesive price list from a **PDF, photo, or Excel/CSV** file. Nix shows a branded progress popup while it works, then a review window lists every bonding agent it found (name, pack size, price/tin, price/L). Enter the **supplier name**, choose whether to **replace** that supplier's existing bonding agents or append, and click **Import bonding agents**. Nothing is saved until you confirm.
