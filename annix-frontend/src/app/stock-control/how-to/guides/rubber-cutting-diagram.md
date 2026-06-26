---
title: Rubber Cutting Diagram (RCD)
slug: rubber-cutting-diagram
category: Jobs & Workflow
roles: [quality, manager, admin]
order: 10
tags: [rubber, lining, cutting, nesting, jigsaw, tank, panels]
lastUpdated: 2026-06-26
summary: Read the auto-generated rubber cutting plan on a job card, or override it with the drag-and-drop layout editor — arrange panels on rolls, rotate them, and cut an oversized panel in half so it fits the roll width. Tank and chute drawings contribute developed panels (shells, cones, dished heads, rings) automatically. Your layout is saved and Nix learns from it.
readingMinutes: 4
relatedPaths: [annix-frontend/src/app/stock-control/portal/job-cards/[id]/components/RubberAllocation.tsx, annix-frontend/src/app/stock-control/components/jigsaw/JigsawEditor.tsx, annix-frontend/src/app/stock-control/components/jigsaw/jigsawLayout.ts, annix-frontend/src/app/stock-control/components/jigsaw/DraggablePanel.tsx, annix-frontend/src/app/stock-control/lib/rubberCuttingCalculator.ts, annix-backend/src/stock-control/services/drawing-extraction.service.ts]
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
9. Click **Save Manual Plan**. The saved layout becomes the cutting diagram, and Nix learns from your arrangement for similar future jobs.

## Notes

- A panel cut in half becomes two plain rectangular pieces; the cutter trims any curve from the two flat halves.
- Editing a panel's dimensions is learned per item type/size and re-suggested on the next matching panel; cutting in half is captured as part of the saved plan.
- Offcut and stock suggestions (FIFO) appear under the diagram so panels can be cut from existing material instead of a new roll.
