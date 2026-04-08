---
title: Uploading PosiTector Measurement Data
slug: positector-upload
category: Quality
roles: [quality, manager, admin]
order: 2
tags: [positector, dft, blast profile, shore hardness, environmental, quality, measurements]
lastUpdated: 2026-04-08
summary: Upload PosiTector batch files — data is permanently stored, deduplicated by fingerprint, and auto-imported to job cards when batch numbers match.
readingMinutes: 5
relatedPaths: [annix-frontend/src/app/stock-control/portal/quality/positector/upload, annix-backend/src/stock-control/qc/controllers/positector.controller.ts, annix-backend/src/stock-control/qc/services/positector-import.service.ts, annix-backend/src/stock-control/qc/services/positector-upload.service.ts, annix-frontend/src/app/stock-control/components/UnlinkedUploadsSection.tsx]
---

## How it works

Every PosiTector file you upload is **permanently stored**:

- The **original file** is saved to S3 for future reference
- The **parsed readings** are saved to the database
- Data is **never temporary** and will not be wiped

When a batch number on the upload matches a batch number on a job card, the readings are **automatically imported** into the correct QC record (DFT, Blast Profile, Shore Hardness, or Environmental). If no match is found at upload time, the data stays in the database and will be **retroactively imported when the batch number is later entered on a job card**.

## Supported file formats

- **PosiTector JSON** batch files (exported from the device via USB)
- **PosiTector CSV** (readings.txt from the device)
- **PosiSoft Desktop CSV** exports (File > Export from PosiSoft)
- **PosiSoft Desktop PDF** reports
- **Clipboard paste** (Ctrl+V) of tab/comma-separated readings
- **Drag and drop** data directly from PosiSoft Desktop

## Step-by-step: uploading (data dump)

1. Go to **Quality > File Upload**
2. Drop a file onto the upload area, click to browse, or paste data from clipboard
3. The system:
   - Saves the original file to S3 permanently
   - Parses and saves all readings to the database
   - Checks if the batch name matches any batch number on a job card
4. You see a confirmation showing:
   - **Green**: Data permanently stored (file + readings count)
   - **Teal**: Auto-imported to a job card (if batch name matched)
   - **Blue**: Not yet linked (will auto-import when batch number is entered on a JC)

## Auto-matching: how batch numbers connect

The system uses the **Defelsko Batch Numbers** section on job cards to match uploads:

1. Each job card has batch number fields (e.g. `paint_dft_0`, `paint_blast_profile`, `rubber_shore_hardness`)
2. When a PosiTector file is uploaded, the batch name in the file is compared against all entered batch numbers (case-insensitive)
3. If a match is found, readings are immediately imported into the correct QC record type
4. If no match is found now, **when someone later enters that batch number on a job card**, the system automatically finds the stored upload and imports it

## Manual linking

If auto-match doesn't apply (e.g. the batch name doesn't match, or you want to assign to a specific job card):

1. After uploading, click **Link to Job Card**
2. Enter the **Job Card ID**
3. Fill in type-specific fields:
   - **DFT**: coat type (Primer/Intermediate/Final), paint product, spec min/max microns
   - **Blast Profile**: spec microns
   - **Shore Hardness**: rubber spec, batch number, required shore value
   - **Environmental**: no extra fields — temperature, humidity, and dew point are extracted automatically
4. Click **Link & Import**

## Probe type detection

The system auto-detects the measurement type from the probe:

| Probe | Maps to |
|-------|---------|
| 6000 / 200 | DFT Reading |
| SPG / RTR | Blast Profile |
| SHD | Shore Hardness |
| DPM | Environmental |

## Where data appears

After import, records are visible in two places:

- **On the job card** under the Quality tab (DFT Readings, Blast Profiles, Shore Hardness, or Environmental sections)
- **In the Quality hub** on the corresponding cross-job-card page:
  - Quality > Paint DFTs
  - Quality > Blast Profile
  - Quality > Shore Hardness
  - Quality > Environmental

## Duplicate detection

The system automatically detects duplicate uploads using a fingerprint based on the batch name, probe type, instrument creation date, reading count, and reading values. If you upload the same file twice, the existing record is updated instead of creating a duplicate.

Different sessions with the same batch number (e.g. B243 reused after a device wipe) are kept as separate entries because the readings and creation dates differ.

## Viewing uploaded PDFs

After upload, you can view the original PosiSoft PDF report:

- **On the upload page**: Click the **PosiSoft Desktop PDF Report - View** badge
- **On quality pages** (Paint DFTs, Blast Profile, etc.): Click **View PDF** in the PosiTector Uploads table
- **On the job card quality tab**: Click **View PDF** next to the batch assignment (once linked)

The quality pages show all uploads with status badges:
- **Linked to JC #N** (green) for uploads connected to a job card
- **Unlinked** (amber) for uploads waiting to be matched

The **Reading Date** column shows the date from the PosiTector instrument, not the date uploaded to the app.

## Tips

- You can override the auto-detected measurement type if needed
- For DFT readings, the system detects coat type from the batch name (e.g. "Primer Coat" auto-selects Primer)
- PosiSoft Desktop drag-and-drop works, but make sure you drag the actual readings — dragging just the batch name from the tree sidebar will not include readings
- All uploaded files can be retrieved from S3 at any time for auditing
