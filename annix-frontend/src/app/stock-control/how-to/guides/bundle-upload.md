---
title: PosiTector Bundle Upload
slug: bundle-upload
category: Quality
roles: [quality, manager, admin]
order: 45
tags: [positector, upload, bundle, pdf, dft, blast, hardness, environmental, qc]
lastUpdated: 2026-04-09
summary: Split and import a multi-report PosiTector PDF into individual QC measurement records.
readingMinutes: 2
relatedPaths:
  - annix-frontend/src/app/stock-control/portal/quality/positector/bundle-upload/page.tsx
  - annix-backend/src/stock-control/qc/services/positector-bundle-splitter.service.ts
  - annix-backend/src/stock-control/qc/controllers/positector.controller.ts
---

## What is Bundle Upload?

PosiSoft Desktop can export all measurement data from a PosiTector device into a single PDF file containing many individual reports (e.g. 60+ reports across 128 pages). The Bundle Upload feature splits this combined PDF into individual reports and imports each one separately into the QC system.

## Supported Report Types

The splitter identifies four instrument types automatically:

- **DFT (Coating Thickness)** — PosiTector 6000 readings
- **Surface Profile** — PosiTector SPG/RTR blast profile readings
- **Shore Hardness** — PosiTector SHD-A rubber hardness readings
- **Environmental** — PosiTector DPM dew point/climate readings

## Step-by-Step

1. Navigate to **Quality > Bundle Upload** from the quality hub.
2. Drag and drop a PosiTector bundle PDF onto the drop zone, or click to browse for the file.
3. The system analyzes the PDF and identifies individual reports by scanning for report boundaries.
4. Review the results: a summary shows how many reports of each type were found, with a table listing page ranges and timestamps.
5. Click **Import All** to split the PDF and store each report as a separate upload.
6. Reports that match a batch number assigned to a job card are automatically linked. Unlinked reports can be manually linked later from the PosiTector uploads list.

## Rules and Constraints

- The first pages of the PDF (combined summary) are automatically excluded from individual imports.
- Only PDF files are accepted for bundle upload.
- Duplicate detection uses fingerprinting — re-uploading the same bundle will skip reports that were already imported.
- Large PDFs (100+ pages) may take 30-60 seconds to process.

## Tips

- Export your PosiTector data from PosiSoft Desktop as a single PDF for the easiest workflow.
- Assign batch numbers to your PosiTector batches before exporting so auto-linking to job cards works.
- You can use the regular **File Upload** page for single-report files (JSON, CSV, or single-report PDFs).
