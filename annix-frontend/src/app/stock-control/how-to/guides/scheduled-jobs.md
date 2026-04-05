---
title: Monitoring Scheduled Background Jobs
slug: scheduled-jobs
category: Admin
roles: [admin]
order: 8
tags: [cron, automation, monitoring]
lastUpdated: 2026-04-05
summary: See which background jobs are running, when they last ran, and override their schedules.
readingMinutes: 3
relatedPaths: [annix-backend/src/scheduled-jobs, annix-frontend/src/app/admin]
---

## What runs in the background

The system runs several housekeeping jobs on a schedule: calibration alerts, stock reports, inbound email polling, backup snapshots, and cleanup tasks.

## Viewing the job list

1. Open **Admin Panel → Scheduled Jobs**
2. Each job shows its cron expression, last run time, and last status
3. Click a job to see the last 50 executions and any error messages

## Overriding a schedule

If a default schedule does not suit your company, click the job and **Override Cron**. Your override takes precedence without affecting other companies.

## Pausing a job

For maintenance windows, click **Pause** — the job skips its next runs until you click **Resume**.
