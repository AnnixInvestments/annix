---
title: Rubber Cutting Diagram (RCD)
slug: rubber-cutting-diagram
category: Jobs & Workflow
roles: [quality, manager, admin]
order: 10
tags: [rubber, lining, cutting, nesting, jigsaw, tank, panels]
lastUpdated: 2026-06-27
summary: Read the auto-generated rubber cutting plan on a job card, or override it with the drag-and-drop layout editor — arrange panels on rolls, rotate them, and cut an oversized panel in half so it fits the roll width. Tank and chute drawings contribute developed panels (shells, cones, dished heads, rings) automatically. Your layout is saved and Nix learns from it.
readingMinutes: 4
relatedPaths: [annix-frontend/src/app/stock-control/portal/job-cards/[id]/components/RubberAllocation.tsx, annix-frontend/src/app/stock-control/components/jigsaw/JigsawEditor.tsx, annix-frontend/src/app/stock-control/components/jigsaw/jigsawLayout.ts, annix-frontend/src/app/stock-control/components/jigsaw/DraggablePanel.tsx, annix-frontend/src/app/stock-control/lib/rubberCuttingCalculator.ts, annix-frontend/src/app/stock-control/lib/classifyAttachment.ts, annix-frontend/src/app/stock-control/portal/job-cards/[id]/components/DetailsTab.tsx, annix-frontend/src/app/stock-control/portal/job-cards/[id]/components/LineItemsTab.tsx, annix-frontend/src/app/stock-control/portal/job-cards/[id]/components/QualityTab.tsx, annix-frontend/src/app/stock-control/portal/job-cards/[id]/hooks/useJobCardDocuments.ts, annix-backend/src/stock-control/services/drawing-extraction.service.ts]
---

## What it does

On a rubber-lining job card, the **Rubber Cutting Diagram** turns each lined item into a panel and nests those panels onto rubber rolls, showing the cutting layout, roll count, waste and efficiency. It has two modes:

- **Auto plan** — the system lays out the panels for you and shows the diagram and offcut suggestions.
- **Manual override** — a drag-and-drop editor where you arrange panels on rolls yourself when the auto plan isn't how you want to cut.

Pipe items become rectangular (and reducer/cone) panels. **Tank and chute drawings** contribute developed panels automatically: cylindrical shells unroll to rectangles, cones develop to annular sectors, dished heads to circular blanks and rings to annuli — each drawn with its true outline so the cutter sees the real shape and the offcut.

## When to use the manual override

Use it when the auto plan wastes material, splits the wrong way, or you simply want to cut differently. Click **Override** on the cutting plan to open the editor.

## Steps

1. Open the job card and scroll to **Rubber lining**. Review the auto cutting plan (used %, new rolls, waste).
2. Click **Override** to open the manual layout editor.
3. The **Panel Tray** on the left lists every panel still to place. Each shows its size in millimetres.
4. **Drag** a panel onto a roll. Panels snap and gravity-pack against their neighbours.
5. **Rotate** a panel 90° with the rotate button when it nests better turned — both in the tray and on the roll.
6. **Cut a panel in half** with the scissors button when it is too big for the roll width. The panel is cut along its longer side; each half keeps a seam overlap and drops back into the tray for you to place. You can cut a half again for quarters.
7. **Edit a panel's size** from the tray (the "E" button) if the developed size needs adjusting — the change is remembered for similar items next time.
8. Add or remove rolls and set each roll's width, length and thickness as needed.
9. Click **Save Manual Plan**. The saved layout becomes the cutting diagram, and Nix learns from your arrangement for similar future jobs. **Reopening Override restores your exact layout** — panels return to the rolls where you placed them (splits included), not the tray.

## Drawings vs QC documents (what feeds the panels)

Only **drawings** contribute developed panels and m² to the cutting plan. When you add files to **Drawing Attachments** on the Details tab, each file is tagged automatically as either a **Drawing** or a **QC Doc** (ITP, data book, certificate, datasheet, mill cert). Nix double-checks anything it is unsure about and flags low-confidence files with an **Unsure — please confirm** badge — you cannot upload until those are confirmed with the **Drawing / QC Doc** toggle. QC documents are kept out of m² extraction (so they never distort the panel count) and appear read-only under **QC Documents** on the Quality tab, where they can be viewed or deleted. If a tank/cyclone drawing is missing panels, check it was not tagged as a QC Doc by mistake.

Click **View** on any drawing to open it in an in-app preview window (with a **Download** button) instead of bouncing out to a separate browser or PDF app. Each analysed drawing also has its own **Re-extract** button — use it to re-run AI extraction on just that one drawing when its m² looks wrong, without re-processing the whole job card.

## Re-extracting line items and m²

On the **Line Items** tab, the **Re-extract** button rebuilds the line items from the source job card and now also runs AI extraction over the uploaded tank/chute drawings to pull each item's coating and lining **m²** — so items previously flagged as **missing m²** are filled in from the drawing automatically. Tank/chute lining and paint m² are computed from the drawing's **developed panel geometry** (the same shells, cones and dished heads that feed the cutting plan), which is more reliable than the single area figure printed on the drawing. Because this analyses multiple PDFs it can take a while, so a branded progress popup (Nix analysing) shows while it runs and closes when the re-extract finishes. When it completes, the line item m² and the rubber cutting plan update together. If some items are still flagged **missing m²** afterwards, the drawing may not show usable component dimensions — re-extract that single drawing from **Drawing Attachments**, or edit the item and enter the m² manually (or add e.g. "@ 12.5m²" to the Sage item description).

## Notes

- A panel cut in half becomes two plain rectangular pieces; the cutter trims any curve from the two flat halves.
- Editing a panel's dimensions is learned per item type/size and re-suggested on the next matching panel; cutting in half is captured as part of the saved plan.
- Offcut and stock suggestions (FIFO) appear under the diagram so panels can be cut from existing material instead of a new roll.
- A saved manual layout is restored exactly when you reopen the editor; re-extracting the drawing (which changes the panels) resets the layout.
