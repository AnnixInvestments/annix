---
title: Using Quality Control Plans (QCPs)
slug: using-qcps
category: Quality
roles: [quality, manager, admin]
order: 1
tags: [qcp, inspection]
lastUpdated: 2026-04-05
summary: Create a QCP from a template, record inspection results, and route it for sign-off.
readingMinutes: 5
relatedPaths: [annix-frontend/src/app/stock-control/portal/quality, annix-backend/src/stock-control/qcp]
---

## What is a QCP

A Quality Control Plan (QCP) is a checklist of inspection points that must be completed and signed off before a job can be closed. Each point may require a measurement, a photo, or a document upload.

## Creating a QCP from a template

1. Open **Quality → QCPs**
2. Click **New QCP**
3. Pick the job card to attach it to
4. Pick a QCP template (your admin maintains these)
5. Click **Create**

## Recording results

Each inspection point has its own row. Click a row to:

- Enter a numeric measurement — the system flags it red if outside tolerance
- Upload a photo of the item being measured
- Attach a supporting document (material cert, NDT report)
- Record a pass/fail result and add a comment

## Sign-off

Once every inspection point is complete, click **Submit for Review**. The QCP routes to the reviewer (usually the quality manager or the customer if 3rd-party witnessing applies). The reviewer either signs it off or rejects specific lines for rework.

## Closing a QCP from client side

Clients can finalize their own QCP without 3rd party review when no witnessing is required. The option appears on the client's review page only when 3rd-party review is not configured for that QCP.
