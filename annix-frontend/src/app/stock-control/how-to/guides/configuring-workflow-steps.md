---
title: Configuring Workflow Steps
slug: configuring-workflow-steps
category: Admin
roles: [admin]
order: 1
tags: [workflow, settings, templates]
lastUpdated: 2026-04-11
summary: Design the foreground and background workflow steps that jobs move through.
readingMinutes: 5
relatedPaths: [annix-frontend/src/app/stock-control/portal/settings, annix-backend/src/stock-control/workflow]
---

## Foreground vs background steps

- **Foreground steps** form the main path — every job moves through them in order
- **Background steps** are optional side tasks that branch off a foreground step and rejoin later

## Creating a template

1. Open **Settings → Workflow Templates**
2. Click **New Template**
3. Drag foreground steps into the main column in the order they should execute
4. Drop background steps next to the foreground step that triggers them
5. For each background step, pick a **colour** — all background steps sharing a colour render on the same branch line in the workflow diagram
6. Configure the rejoin behaviour (rejoin-at-step or loop-back)
7. Save

## Testing before go-live

Use the simulator in **Settings → Workflow → Preview** to walk a pretend job through the template. The simulator traverses both foreground and background steps, so you can verify branch colours and rejoin logic before any real job is affected.

## Tips

- Keep foreground steps short — 6 to 10 works best
- Use background steps for parallel quality inspections that should not block the main path
- Colour branches by team (e.g. quality = blue, dispatch = amber)
