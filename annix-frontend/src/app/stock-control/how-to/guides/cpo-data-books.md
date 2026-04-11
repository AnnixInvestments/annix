---
title: CPO Data Books
slug: cpo-data-books
category: Quality
roles: [quality, manager, admin]
order: 5
tags: [cpo, data book, quality, pdf, traceability, compilation]
lastUpdated: 2026-04-11
summary: Compile a combined data book for CPOs that includes all QC documents from child job cards with a traceability matrix.
readingMinutes: 3
relatedPaths: [annix-frontend/src/app/stock-control/portal/purchase-orders/[id]/components/CpoDataBookSection.tsx, annix-frontend/src/app/stock-control/portal/purchase-orders/[id]/components/CpoBatchAssignmentSection.tsx, annix-backend/src/stock-control/services/certificate.service.ts, annix-backend/src/stock-control/services/data-book-pdf.service.ts]
---

## What is a CPO data book

A CPO data book is a combined quality document that merges all QC records from all child job cards into a single PDF. It gives the customer one complete package covering the entire purchase order.

## What it includes

For each child job card:
- Cover page
- Quality Control Plans
- Blast Profile reports
- DFT reading reports (grouped by coat)
- Shore Hardness reports
- Items Release documents
- Release Certificates
- Supplier certificates
- Calibration certificates
- PosiTector PDF reports (original instrument reports)

At the end:
- **Traceability Matrix** showing every item and its batch numbers per measurement type

## Compiling a CPO data book

1. Go to **Purchase Orders > [CPO] > Quality tab**
2. Scroll to the **Data Book** section
3. Click **Compile Data Book**
4. The system generates the PDF and opens a preview
5. Use **Download** or **Open in New Tab** from the preview toolbar

Use **Force Recompile** if QC data has been updated since the last compilation.

## Traceability matrix

The traceability matrix at the back of the data book maps each item to its QC batch numbers:

| Item # | Item Code | Description | Blast Paint | DFT Primer | DFT Final | Blast Rubber | Shore |
|--------|-----------|-------------|-------------|------------|-----------|--------------|-------|
| 1 | PAINT | 200NB Pipe | B241 | B243 | B245 | - | - |
| 2 | PAINT | 200NB Bend | B241 | B244 | B246 | - | - |

## Standalone job cards

Job cards not linked to a CPO still get their own individual data books compiled from the job card's Quality tab.
