---
title: Setting Up Calibration Alerts
slug: calibration-alerts
category: Admin
roles: [admin]
order: 7
tags: [calibration, quality, alerts]
lastUpdated: 2026-04-05
summary: Get notified when measurement equipment is due for recalibration.
readingMinutes: 3
relatedPaths: [annix-frontend/src/app/stock-control/portal/quality, annix-backend/src/stock-control/calibration]
---

## Background

Measurement equipment drifts over time. Calibration alerts remind you to recalibrate before the drift affects job quality.

## Adding equipment

1. Open **Quality → Equipment**
2. Click **New Equipment**
3. Enter serial number, manufacturer, and equipment type
4. Set the calibration interval (e.g. 12 months)
5. Record the last calibration date and certificate
6. Save

## Alert schedule

The system runs a scheduled job every morning and emails the equipment owner:

- **30 days before** the due date — gentle reminder
- **7 days before** — second warning
- **On the due date** — overdue notice
- **Every week after** — until resolved

## Logging a new calibration

When the equipment comes back from the lab, open it and click **Log Calibration**. Upload the new certificate and the system resets the due date.
