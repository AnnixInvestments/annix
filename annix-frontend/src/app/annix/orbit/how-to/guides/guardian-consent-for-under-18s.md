---
title: Guardian consent for under-18s
slug: guardian-consent-for-under-18s
category: FuturePath
roles: [seeker, individual, student, parent]
order: 3
tags: [futurepath, consent, guardian, popia, gdpr, privacy]
lastUpdated: 2026-05-24
summary: Why under-age learners need a guardian's consent, and how to invite one.
readingMinutes: 2
relatedPaths: [annix-frontend/src/app/annix/orbit/seeker/futurepath/page.tsx, annix-frontend/src/app/lib/api/annixOrbitApi.ts]
---

## Why consent is needed

If you are under the consent age for your region, the law (POPIA in South Africa,
GDPR in the UK/EU) requires a parent or guardian to approve processing your
profile before FuturePath can run the mentor or match you to programmes. Until
that consent is recorded, those features stay locked.

## Step-by-step (learner)

1. If consent is needed, a **Guardian consent needed** banner appears at the top
   of the FuturePath page.
2. Enter your guardian's email address.
3. Click **Invite guardian**. Your guardian will be asked to confirm consent.

## Step-by-step (guardian)

- If you are the guardian and are signed in on the learner's device, you can
  click **I am the guardian — record consent** to record consent directly.

## Rules

- Your **date of birth** on the education profile determines whether consent is
  required (under 18 for POPIA, under 13 for GDPR).
- Consent can be revoked later; processing stops if it is.
- We only support POPIA and GDPR consent today. Learners in regions we don't yet
  cover can't be onboarded until those flows are added.
