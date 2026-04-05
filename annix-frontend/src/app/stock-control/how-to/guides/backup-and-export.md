---
title: Backing Up and Exporting Data
slug: backup-and-export
category: Admin
roles: [admin]
order: 10
tags: [backup, export, data]
lastUpdated: 2026-04-05
summary: Download snapshots of your data for offline archival or compliance.
readingMinutes: 3
relatedPaths: [annix-backend/src/stock-control, annix-frontend/src/app/stock-control/portal/settings]
---

## Automatic backups

Annix takes daily database snapshots of your company's data. These live on S3 with 30-day retention and are restorable on request — contact support if you need a restore.

## Manual exports

For compliance or audit purposes, you can generate an export yourself:

1. Open **Settings → Data Export**
2. Pick the modules to include (jobs, invoices, stock movements, etc.)
3. Pick the date range
4. Click **Generate** — the export runs in the background
5. You receive an email when the ZIP is ready, with a download link valid for 7 days

## Export formats

- **CSV** — one file per module, suitable for Excel
- **JSON** — one file per module, suitable for programmatic re-import

## Document attachments

Exports include metadata but not binary attachments by default. Tick **Include Attachments** if you need the original PDFs — the ZIP will be larger and take longer to generate.
