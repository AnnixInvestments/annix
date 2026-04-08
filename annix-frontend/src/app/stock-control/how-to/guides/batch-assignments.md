---
title: Item-Level Batch Assignments (Defelsko B Numbers)
slug: batch-assignments
category: Quality
roles: [quality, manager, admin]
order: 3
tags: [positector, batch, defelsko, dft, blast profile, shore hardness, quality, measurements, items, cpo]
lastUpdated: 2026-04-08
summary: Assign PosiTector batch numbers to specific items on a job card or CPO, with duplicate prevention and automatic PDF linking.
readingMinutes: 5
relatedPaths: [annix-frontend/src/app/stock-control/portal/job-cards/[id]/components/BatchAssignmentSection.tsx, annix-frontend/src/app/stock-control/portal/job-cards/[id]/components/QualityTab.tsx, annix-backend/src/stock-control/qc/services/qc-batch-assignment.service.ts, annix-backend/src/stock-control/qc/controllers/qc-measurement.controller.ts, annix-frontend/src/app/stock-control/portal/purchase-orders/[id]/components/CpoBatchAssignmentSection.tsx]
---

## What are batch assignments

When you take PosiTector readings on the factory floor, you process items in batches. For example, you might blast items 1-5 together (batch B241), then items 6-10 the next day (batch B242). Batch assignments track which items were processed together for each measurement type.

## Measurement types

The system shows measurement types based on the job card's coating analysis:

- **Blast Profile (Paint)** for external surfaces
- **DFT** per paint coat (e.g. Primer, Intermediate, Final)
- **Blast Profile (Rubber)** for internal surfaces
- **Shore Hardness** for rubber lining

Environmental readings are handled separately (auto-pulled by date).

## Adding a batch assignment on a job card

1. Go to **Job Card > Quality tab**
2. Scroll to the **Item-Level Batch Assignments** section
3. Click **+ Add Batch** next to the measurement type (e.g. Blast Profile Paint)
4. Enter the **batch number** (e.g. B241)
5. **Tick the items** that were processed in this batch
6. Click **Save**

Items already assigned to another batch for the same measurement type will not appear in the list.

## Adding from a CPO

For jobs linked to a CPO (Customer Purchase Order):

1. Go to **Purchase Orders > [CPO] > Quality tab**
2. The batch assignment section shows items from **all child job cards**
3. Click **+ Add Batch** and select items across multiple JCs
4. The system saves assignments to the correct JC automatically
5. Changes made on the CPO are immediately visible on child JCs and vice versa

## One batch at a time

The form only allows adding one batch number at a time. This matches the physical workflow — you complete one batch of items, record the readings, then move to the next batch.

## Rules

- Each item can only be assigned **once per measurement type** (enforced by the database)
- The same batch number can cover items across different measurement types
- Blast profile must be done separately for paint (external) and rubber (internal)

## PosiTector PDF linking

When a batch number matches a PosiTector upload (from the Data Dump page):
- The PDF report is automatically linked
- A **View PDF** button appears next to the batch
- If the upload happens after the batch number is entered, it auto-links retroactively

## Environmental auto-pull

Environmental readings are not assigned via batch numbers. Instead, the system automatically pulls the relevant environmental records based on the dates of other measurements:

- **Blast Profile** readings pull environmental data from the **same day**
- **DFT** readings pull from **2 days prior**
- **Shore Hardness** readings pull from **4 days prior**

This requires environmental readings to be uploaded daily via the Quality > Environmental page.
