---
title: Uploading PosiTector Measurement Data
slug: positector-upload
category: Quality
roles: [quality, manager, admin]
order: 2
tags: [positector, dft, blast profile, shore hardness, environmental, quality, measurements]
lastUpdated: 2026-04-07
summary: Upload PosiTector batch files and import readings into job cards as DFT, Blast Profile, Shore Hardness, or Environmental records.
readingMinutes: 4
relatedPaths: [annix-frontend/src/app/stock-control/portal/quality/positector/upload, annix-backend/src/stock-control/qc/controllers/positector.controller.ts, annix-backend/src/stock-control/qc/services/positector-import.service.ts]
---

## Supported file formats

The upload page accepts data from PosiTector devices in several formats:

- **PosiTector JSON** batch files (exported from the device via USB)
- **PosiTector CSV** (readings.txt from the device)
- **PosiSoft Desktop CSV** exports (File > Export from PosiSoft)
- **PosiSoft Desktop PDF** reports
- **Clipboard paste** (Ctrl+V) of tab/comma-separated readings
- **Drag and drop** data directly from PosiSoft Desktop

## Step-by-step: uploading a file

1. Go to **Quality > File Upload**
2. Drop a file onto the upload area, click to browse, or paste data from clipboard
3. The system parses the file and shows a preview with:
   - Batch name, probe type, serial number
   - Detected format (JSON, CSV, PDF, etc.)
   - Suggested measurement type based on probe
   - Table of all readings

## Step-by-step: importing into a job card

1. After uploading, click **Import to Job Card**
2. Enter the **Job Card ID** for the readings
3. Confirm or change the **Measurement Type** — the system auto-detects from the probe:
   - **6000 / 200** probes map to **DFT Reading**
   - **SPG / RTR** probes map to **Blast Profile**
   - **SHD** probes map to **Shore Hardness**
   - **DPM** probes map to **Environmental**
4. Fill in type-specific fields:
   - **DFT**: coat type (Primer/Intermediate/Final), paint product, batch number, spec min/max microns
   - **Blast Profile**: spec microns, temperature, humidity
   - **Shore Hardness**: rubber spec, batch number, required shore value
   - **Environmental**: no extra fields needed — temperature, humidity, and dew point are extracted automatically from the DPM batch header
5. Click **Import** — the readings are saved to the job card

## Where imported data appears

After import, records are visible in two places:

- **On the job card** under the Quality tab (DFT Readings, Blast Profiles, Shore Hardness, or Environmental sections)
- **In the Quality hub** on the corresponding cross-job-card page:
  - Quality > Paint DFTs
  - Quality > Blast Profile
  - Quality > Shore Hardness
  - Quality > Environmental

## Duplicate warnings

If readings for the same type and date already exist on the job card, the system shows an amber warning after import. The import still succeeds — this is informational only, in case you accidentally import the same batch twice.

## Tips

- You can override the auto-detected measurement type if needed (e.g. if the probe type was not recognised)
- For DFT readings, the system tries to detect coat type from the batch name (e.g. "Primer Coat" auto-selects Primer)
- PosiSoft Desktop drag-and-drop works, but make sure you drag the actual readings — dragging just the batch name from the tree sidebar will not include readings
- If drag-and-drop fails, use File > Export in PosiSoft Desktop to save a CSV, then upload that file
