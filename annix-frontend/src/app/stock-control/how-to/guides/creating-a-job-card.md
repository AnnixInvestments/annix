---
title: Creating a Job Card
slug: creating-a-job-card
category: Jobs & Workflow
roles: [storeman, accounts, manager, admin]
order: 1
tags: [jobs, intake]
lastUpdated: 2026-04-05
summary: Capture a new job from customer order through to workflow assignment.
readingMinutes: 4
relatedPaths: [annix-frontend/src/app/stock-control/portal/jobs, annix-backend/src/stock-control/job-cards]
---

## When to create a job card

Create a new job card whenever a customer places an order that involves receiving, processing, or dispatching stock. A job card is the single source of truth for everything that happens to that order.

## Steps

1. Open **Jobs** from the top toolbar
2. Click **New Job Card** in the top-right
3. Pick the customer from the searchable dropdown. If the customer does not exist, an admin must add them first via Settings → Companies.
4. Fill in the PO number, expected delivery date, and job description
5. Add line items — you can paste from the customer's PO or add them manually
6. Choose the workflow template that matches the job type (Standard, Fast-Track, or Custom)
7. Click **Create** — the job enters the first workflow step automatically

## Assigning team members

After creation, open the job card and use the **Assignees** panel to tag the people responsible for each step. Assignees get notified when their step becomes active.

## Tips

- Attach customer PDFs to the job card so everything lives in one place
- The job card number is auto-generated based on your company's prefix pattern
- You can clone a previous job card if the new one is similar — use **Actions → Clone**
