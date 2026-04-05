---
title: Closing a Job Card
slug: closing-a-job-card
category: Jobs & Workflow
roles: [manager, admin]
order: 3
tags: [jobs, closure]
lastUpdated: 2026-04-05
summary: Finalize a completed job and archive it with the customer documentation pack.
readingMinutes: 3
relatedPaths: [annix-frontend/src/app/stock-control/portal/jobs, annix-backend/src/stock-control/job-cards]
---

## Prerequisites

Before you can close a job card:

- All workflow steps must be complete (or explicitly waived)
- The customer invoice must be posted
- Any open QCPs must be signed off

## Steps

1. Open the job card
2. Check the **Completion** panel on the right — any blockers are listed there
3. Resolve outstanding items, or click **Waive** with a reason if they no longer apply
4. Click **Close Job**
5. The system generates the customer document pack (delivery note, invoice, CoCs, QCPs)
6. Review the pack and click **Send** to email it to the customer

## After closure

Closed jobs move to the Archive. You can still open and print them, but you cannot make changes. If something needs correcting, an admin can re-open the job from Settings → Jobs → Archive.
