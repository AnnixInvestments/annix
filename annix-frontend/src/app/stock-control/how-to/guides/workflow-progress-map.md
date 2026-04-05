---
title: Reading the Workflow Progress Map
slug: workflow-progress-map
category: Jobs & Workflow
roles: [viewer, quality, storeman, accounts, manager, admin]
order: 4
tags: [workflow, visualization]
lastUpdated: 2026-04-05
summary: Understand the visual workflow diagram on a job card.
readingMinutes: 3
relatedPaths: [annix-frontend/src/app/stock-control/components/WorkflowStatus.tsx]
---

## What the map shows

Every job card has a visual workflow map showing foreground steps (the main path) and background tasks (branches that run alongside).

## Reading the lines

- **Grey line** — main workflow path
- **Coloured lines** — background tasks grouped by colour. Admins configure which colour a background task belongs to.
- **Solid node** — step complete
- **Pulsing node** — step active
- **Hollow node** — step not yet reached

## Branches

When a background task branches off a foreground step, the connecting line shows in the task's assigned colour. Tasks sharing the same colour travel on the same line, making it easy to see parallel workstreams at a glance.

## Simulating a workflow

From Settings → Workflow, admins can preview how a job will move through the steps without running a real job. Use this when designing a new template or debugging an unexpected path.
