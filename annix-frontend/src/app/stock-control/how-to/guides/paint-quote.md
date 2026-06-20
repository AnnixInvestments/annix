---
title: Quoting Paint Work
slug: paint-quote
category: Admin
roles: [admin, manager]
order: 7
tags: [paint, quoting, coating, discounts, pricing]
lastUpdated: 2026-06-20
summary: Quote a full coating system fast — pick a primer, intermediate and final coat plus blasting and a discount tier, and read off the price per square metre. Area is applied later at the quote / job-card stage.
readingMinutes: 2
relatedPaths: [annix-frontend/src/app/stock-control/portal/quote/page.tsx, annix-frontend/src/app/lib/query/hooks/stock-control/usePaintPricing.ts, annix-frontend/src/app/lib/api/stock-control-api/paintPricingMethods.ts]
---

## What it does

Paint Quote turns the price list maintained in **Paint Pricing** into a quick sell-price calculation for a whole coating system. Choose the primer, intermediate and final coats, add a blast grade and a discount tier, and it shows each coat's price per square metre plus the paint, blast and total price per square metre — using only sell prices, never your cost or markup. This page is **price-per-m² only** — there is no area input; the area is applied later at the quote / job-card stage. Prices update **live** as you change anything. On wide screens the **Your coating spec** card and the **Compare other suppliers** card sit side by side; the prices and totals live inside the spec card itself, so there is no separate result card.

Open it at **Resources → Paint Quote**.

## Start from a paint system (ISO 12944)

At the top of the page is a **Paint system (ISO 12944)** dropdown. Pick a corrosivity category — **C1** to **C5**, **CX**, etc. (each shown with a short description like "C5 — Very high corrosivity") — and the page auto-fills the three coats below from that category's **recommended** coating system: the primer, intermediate and final each get an appropriate paint and a film thickness drawn from the system specification. A muted line under the dropdown shows the chosen system (its code, the binder make-up and the total µm). The categories and their systems come from the same ISO 12944 surface-protection reference used by the RFQ module.

Because ISO 12944 lists a *family* of acceptable binders per coat, the page picks a sensible representative chemistry for each coat (for C5, for example, an epoxy/zinc primer, an epoxy intermediate and a polyurethane topcoat) and then chooses each supplier's matching **preferred** paint for it — exactly the same matching used by **Compare other suppliers**. Everything stays **editable**: after the system fills the coats you can change any paint, film thickness, blast grade or tier by hand. Leave the dropdown on **— Select a system —** to build a spec from scratch.

## Quoting a system

The **Your coating spec** card has three coat rows — **Primer**, **Intermediate** and **Final**. Each one has a paint dropdown and a film thickness, and shows that coat's live price per square metre under the film-thickness field.

1. **Coats** — for each row, choose a paint from the searchable dropdown: click it and start typing the product name (you don't need the supplier) and the matching paints filter as you type, or leave it on **— none —** if that coat isn't used. When you open the page each row is pre-selected with the paint marked **Preferred** for that coat type in Paint Pricing, so a standard system is ready to quote straight away.
2. **Supplier auto-sync** — the card's supplier follows your **primer**. When you change the primer to a paint from a different supplier, the **Intermediate** and **Final** coats automatically switch to that supplier's preferred paints for those roles (and pick up their recommended film thicknesses). If the supplier has no preferred paint for a role, that coat is cleared to **— none —**. You can still override the intermediate or final coats by hand afterwards — they only re-sync the next time you change the primer's supplier.
3. **Film thickness (µm)** — when a coat has a paint selected this defaults to its recommended film thickness if one is set. Change it to quote a thicker or thinner spec; the coverage and price recalculate from the new value.
4. **Blasting** — choose a blast grade (SA3, SA2.5, SA2, Flash blast) to add a surface-preparation line at the rate set in Paint Pricing, or leave it on **— none —**.
5. **Discount tier** — leave it on **Standard price** for list prices, or choose a named tier to apply that tier's discount to both paint and blasting.

There is no Calculate button — every change recalculates automatically. There is no area on this page; the area you are coating is applied later at the quote / job-card stage.

## The totals

The totals live at the bottom of the **Your coating spec** card itself — there is no separate result card. Each coat's price per m² sits next to its film-thickness field, and below the blasting/tier row the card shows a small **{tier}** context line, the **Paint /m²**, the **Blast /m²** (only when a blast grade is chosen) and a large, brand-accented **Total /m²** (paint plus blast). Everything updates live as you adjust the spec — changing a film thickness recomputes that coat's coverage and therefore its price per m².

## Comparing other suppliers

The **Compare other suppliers** card prices the same coating spec against each of your other suppliers, using the **same film thicknesses** you set in your spec above and mirroring the coats you have selected (if you cleared the intermediate, the comparison drops it too). For each coat it picks that supplier's **equivalent** paint by precise coating technology — it matches a zinc-rich-epoxy primer to another zinc-rich-epoxy primer, and a polyurethane topcoat to a polyurethane topcoat, never to an acrylic. If the supplier has nothing of that exact technology it falls back to the same chemistry **family** (for example any epoxy, or any polyurethane/polysiloxane), and only then to their cheapest paint of that coat role. **Within the matched technology** the supplier's **preferred** paint wins — if any of the matched paints is marked preferred on the price list, the cheapest of those preferred paints is chosen; otherwise it falls back to the cheapest of the matched set. So a supplier's preferred polyurethane topcoat is picked over a cheaper non-preferred polyurethane, while the technology match still comes first. The matched paint's technology is shown as a small muted chip next to its name (e.g. `epoxy-mio`) so you can see why it was matched, and your own selected paints show their technology under each coat picker. Each supplier block lists its coats on one line each — coat role, product and technology chip on the left (truncated if long) with the price per m² pinned to the right — and a footer showing **Paint /m²**, **Blast /m²** (when a blast grade is chosen, priced at that supplier's rate) and a prominent **Total /m²** (paint plus blast), so you can compare like-for-like totals at a glance. If a supplier genuinely doesn't sell that coat type, that coat shows as **—** and is left out of their total. This card is read-only — to change the spec, edit your coating spec above and the comparison follows. If you haven't picked a primer yet, it prompts you to pick one first.

For the technology matching to work, every paint needs its technology classified. If a paint hasn't been classified yet the comparison falls back to the older behaviour (matching on the free-text paint type, then cheapest of the coat role). Run **Find missing specs** on the **Paint Pricing** page so every paint has its coating technology filled in.

If the page shows "No paints available — add some in Paint Pricing", add or import paints on the **Paint Pricing** page first (and mark your preferred coats), then come back to quote them.
