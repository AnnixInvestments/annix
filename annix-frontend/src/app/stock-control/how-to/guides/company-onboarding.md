---
title: Setting up your company (onboarding)
slug: company-onboarding
category: Getting Started
roles: [admin]
order: 0
tags: [onboarding, getting-started, company-details, admin]
lastUpdated: 2026-05-05
summary: First-time setup wizard that captures your company's legal details before you can start running jobs.
readingMinutes: 3
relatedPaths:
  - annix-frontend/src/app/stock-control/portal/onboarding/page.tsx
  - annix-frontend/src/app/stock-control/portal/layout.tsx
  - annix-backend/src/stock-control/controllers/auth.controller.ts
  - annix-backend/src/stock-control/services/auth.service.ts
  - annix-backend/src/stock-control/guards/stock-control-onboarding.guard.ts
  - annix-backend/src/stock-control/dto/complete-onboarding.dto.ts
---

## What is onboarding

When you sign up as a new ASCA Stock Control customer, your company is created with `onboardingComplete = false`. Until you submit the onboarding form, you can't create job cards, allocate stock, raise invoices, or do anything else that writes data — those actions return `403 ONBOARDING_REQUIRED` from the API. The frontend redirects you straight to the onboarding wizard after login.

This is a one-off — once you've submitted the form, the gate clears and you (and any team-mates you invite) work as normal.

## When you'll see it

- Right after registering and verifying your email, the moment you hit the portal
- If an admin invited you, you skip onboarding entirely (the company is already onboarded — you inherit it)

## What you need to fill in

Required:

- **Legal company name** — the registered name on your CIPC certificate. This appears on invoices and certificates.
- **Registration number** — e.g. `2020/123456/07`
- **Street address**, **city**, **postal code**
- **Phone**
- **Primary contact email** — pre-filled from your signup email; change it if billing should go elsewhere

Optional:

- **Trading name** — if you trade under a different name (e.g. legal "ABC Engineering (Pty) Ltd", trading "ABC")
- **VAT number** — leave blank if you're not VAT-registered
- **Province**

## Steps

1. Log in. The portal automatically redirects you to **Setup**.
2. Fill in every required field (marked with *).
3. Click **Complete setup**.
4. You're redirected to the dashboard. From this point on, every page works normally.

## Editing later

Everything you entered during onboarding can be changed afterwards under **Settings → Company Details**. Onboarding only collects the minimum needed to unlock the app — branding, SMTP, Sage credentials, QCPs, and the rest are all set up later from Settings.

## Rules and constraints

- Only the **admin** of a new company sees the onboarding wizard. Invited team-mates inherit the onboarded company and go straight to the dashboard.
- The wizard cannot be skipped — you must submit it before performing any write action. This is enforced both by the frontend redirect and a backend guard, so even direct API calls are blocked.
- You can re-edit any field later under **Settings → Company Details**; the only thing onboarding does specially is flip the `onboardingComplete` flag.

## Tips

- If you're not sure of your registration number yet, you can put a placeholder, complete onboarding to unlock the app, and update it under Settings later — the field accepts any non-empty string.
- The legal name you enter here is what appears on customer-facing PDFs by default. If you want a different name shown on invoices, set the **Trading name** during onboarding (or under Settings later) — PDFs prefer trading name when present.
