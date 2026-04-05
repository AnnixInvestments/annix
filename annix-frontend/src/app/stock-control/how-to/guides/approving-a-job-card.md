---
title: Approving a Job Card
slug: approving-a-job-card
category: Jobs & Workflow
roles: [manager, admin]
order: 2
tags: [jobs, approval]
lastUpdated: 2026-04-05
summary: Review a submitted job card and move it into production.
readingMinutes: 2
relatedPaths: [annix-frontend/src/app/stock-control/portal/jobs, annix-backend/src/stock-control/job-cards]
---

## What approval means

Approval is the manager sign-off that a job card is ready to start work. Until approved, assignees can see the job but cannot mark steps complete.

## Steps

1. Open the **Dashboard** and look for the "Pending Approval" panel
2. Click a job card to open it
3. Review the line items, customer PO, and workflow template
4. If anything is wrong, click **Request Changes** and add a comment — the creator gets notified
5. If everything looks right, click **Approve** — the first workflow step becomes active

## Bulk approval

When you have multiple simple jobs, tick them in the list view and click **Approve Selected**. Bulk approval only works for jobs that have no validation warnings.
