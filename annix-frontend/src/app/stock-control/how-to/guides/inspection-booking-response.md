---
title: Inspection Booking and Response
slug: inspection-booking-response
category: Quality
roles: [quality, admin]
order: 60
tags: [inspection, 3rd party, booking, email, accept, propose]
lastUpdated: 2026-04-14
summary: Book third-party inspections, email inspectors, and handle accept/propose-new-time responses.
readingMinutes: 3
relatedPaths:
  - annix-frontend/src/app/stock-control/portal/job-cards/[id]/components/InspectionBookingModal.tsx
  - annix-frontend/src/app/stock-control/portal/job-cards/[id]/components/InspectionProposalBanner.tsx
  - annix-frontend/src/app/stock-control/inspections/respond/[token]/page.tsx
  - annix-backend/src/stock-control/services/inspection-booking.service.ts
  - annix-backend/src/stock-control/controllers/inspection-public.controller.ts
---

## How it works

When a QA user books a 3rd Party Inspection from the job card's workflow actions, the system:

1. Creates an inspection booking record
2. Emails the inspector a unique response link
3. Waits for the inspector to either accept the slot or propose a different time
4. Auto-completes the `book_3rd_party_inspections` background step once the slot is confirmed

## Booking an inspection

1. Open the job card and click **Book Inspection** in Workflow Actions
2. Pick date, start/end time, inspector email, and optional notes
3. Save — an email is sent automatically to the inspector

## Inspector response

The inspector clicks the link in the email and lands on a public page at
`/stock-control/inspections/respond/<token>`. They can:

- **Accept This Slot** — confirms the inspection. The step completes and the workflow advances.
- **Propose Different Time** — submits a new date/time with optional note to the QA team.

## QA Manager approval of a proposed time

When an inspector proposes a new time, a yellow banner appears on the job card
**"Inspector proposed a new time"**. The QAM can:

- **Accept New Time** — updates the booking, confirms to the inspector, and completes the step.
- **Reject** — discards the proposal and returns to the original booked slot (status `booked`).

## Step completion rules

- The `book_3rd_party_inspections` step does **not** complete on booking — only on accept.
- If the inspector accepts directly, the step completes immediately.
- If the inspector proposes, the step stays open until the QAM accepts the proposal.

## Tips

- The response link is valid for 30 days.
- The booker email (first entry in the company's notification emails) receives a confirmation when the inspector responds.
