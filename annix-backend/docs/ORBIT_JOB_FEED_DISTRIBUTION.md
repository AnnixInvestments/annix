# Orbit job-feed distribution (P3)

How Annix Orbit exposes active jobs to external aggregators, the exact feed
schema + field mapping, and a turnkey runbook for submitting the feed to each
aggregator. Distribution status is tracked per channel in
`cv_assistant_job_posting_portal_postings` — aggregators that pull the feed are
recorded `IN_FEED`, **never `POSTED`** (we don't fabricate external reach).

## The feed endpoint

- **URL:** `GET https://cv.annix.co.za/api/annix-orbit/public/jobs.xml`
  (backend route `annix-orbit/public/jobs.xml`).
- **Format:** Indeed-style XML — `<source>` root, one `<job>` per active role.
- **Caching:** `Cache-Control: public, max-age=900, s-maxage=900` (15 min).
- **Contents:** `JobPostingService.listActiveForFeed()` →
  `JobPostingRepository.activeForFeed()`.
- **Test-mode exclusion:** `activeForFeed()` filters `status = ACTIVE` **and**
  `NOT_TEST_MODE` (`{ $or: [{ testMode: null }, { testMode: false }] }`), so
  test-mode jobs never leak into the feed (fixed in P0; locked by
  `job-posting-public-testmode.spec.ts`).
- **Companion:** `GET .../jobs-sitemap` (JSON) feeds `app/sitemap.ts` for the
  Google-for-Jobs sitemap. Google for Jobs is handled separately (server-rendered
  JSON-LD + sitemap + Indexing API — see the `GoogleForJobsChannel`), not via this
  XML feed.

## Feed schema & field mapping

Feed header:

| XML node | Source |
|---|---|
| `<publisher>` | Static: "Annix Annix Orbit" |
| `<publisherurl>` | `orbitPublicBaseUrl()` (`https://cv.annix.co.za`) |
| `<lastBuildDate>` | Request time (ISO) |

Per `<job>`:

| XML node | DTO field | Notes |
|---|---|---|
| `<title>` | `title` | CDATA |
| `<referencenumber>` | `referenceNumber` | Stable per job (`JOB-XXXXXX`) |
| `<date>` | `postedAt` | ISO; `activatedAt ?? createdAt` |
| `<expirationdate>` | `validThrough` | ISO; `expiryDate ?? postedAt + 60d`. Lets aggregators auto-drop stale roles (matches our expiry cron) |
| `<url>` | `orbitPublicJobUrl(ref)` | Canonical `https://cv.annix.co.za/jobs/{ref}` |
| `<company>` | `companyName` | Falls back to "Confidential employer" |
| `<city>` | `location` | CDATA; omitted if null |
| `<state>` | `province` | CDATA; omitted if null |
| `<country>` | Static: "South Africa" | |
| `<jobtype>` | `employmentType` | Mapped: full_time→fulltime, part_time→parttime, contract, temporary, internship, learnership→other |
| `<salary>` | `salaryMin`/`salaryMax` + `salaryCurrency` | Free text "MIN - MAX ZAR per month"; omitted if no salary |
| `<experience>` | `minExperienceYears` | "N+ years"; omitted if null |
| `<email>` | `applyByEmail` | Apply-by-email address (`jobs@annix.co.za`) |
| `<description>` | `description` | CDATA; falls back to title |

## Known schema gaps (read before submitting)

The feed is **Indeed XML** (`<source>`/`<job>`). Aggregators differ:

- **Adzuna** expects a `<jobs>` root (not `<source>`) and its own category
  taxonomy. It may auto-map or reject the Indeed-style root.
- **Jooble** publishes its own XML spec and prefers `pubdate`/`updated` tags; it
  only indexes jobs published < 45 days ago (our `<date>` + `<expirationdate>`
  cover freshness).
- **Indeed** consumes this format natively but gates organic visibility behind
  Indeed Apply / partner approval (see below).

If an aggregator rejects the shared feed, add a per-aggregator variant route
(e.g. `jobs-adzuna.xml`) rather than distorting the Indeed feed. That's a small,
well-scoped follow-up — not built yet because it should be driven by a real
rejection during submission, not guessed.

## Submission runbook (human step — cannot be automated)

Each aggregator requires a human to register and hand over the feed URL. None of
this is a code deploy; it's account setup + partner acceptance. Record each
accepted feed as a distribution row with status `IN_FEED` once confirmed.

### Jooble (free)
1. Open a ticket at the Jooble Help Center (support portal) requesting XML-feed
   / ATS publishing.
2. Provide the feed URL: `https://cv.annix.co.za/api/annix-orbit/public/jobs.xml`.
3. `JoobleBot` crawls ≥ once/24h. Confirm indexing, then mark `IN_FEED`.
   - Ref: https://help.jooble.org/en/support/solutions/articles/60000700159

### Adzuna (free for organic jobs)
1. Request integration via the Adzuna ATS-integration contact form:
   https://www.adzuna.com/hire/ats-integration/
2. Provide the feed URL. Expect a request to reshape to Adzuna's `<jobs>` root —
   if so, add the per-aggregator variant route (see gaps above).
   - XML spec: https://www.adzuna.co.uk/jobs/xml-specification.html

### JobisJob
1. Aggregator-style; contact via their employer/publisher intake and submit the
   feed URL. May also auto-discover from the public pages/sitemap.

### Indeed (free organic — gated)
1. As of 2026-03-31, free organic visibility requires **Indeed Apply** / an ATS
   partner agreement; a bare XML feed without Indeed Apply gets ~zero organic
   reach.
2. Apply through Indeed's employer/partner intake — **apply, don't promise**.
   Treat as P4-adjacent (paid/partner) if organic isn't granted.

## Status semantics

- A feed an aggregator has **confirmed consuming** → `IN_FEED`.
- Never `POSTED` for an unconfirmed feed (no fabricated external reach).
- The `OrbitXmlFeedChannel` already records `IN_FEED` on publish (the job is in
  our own feed immediately); aggregator acceptance is tracked separately by
  updating the relevant distribution row once confirmed.

## Paid channels & budget guard (P4)

Paid channels (Indeed Apply, PNet StepStone, LinkedIn) are **doubly gated** and
default to **off** — nothing is ever spent without explicit configuration:

1. **Opt-in** — a paid channel only dispatches if its code is in the job's
   `enabledPortalCodes` (never in the free default set).
2. **Budget ceiling** — `JobChannelCostGuard` refuses a paid dispatch when this
   month's spend for `(company, channel)` plus the estimated per-post cost would
   exceed the ceiling. A paid channel with **no configured ceiling is refused
   outright** and the row is recorded `SKIPPED('budget')`.
   - Set the monthly ceiling per channel: `JOB_CHANNEL_CEILING_<CODE>` (env), e.g.
     `JOB_CHANNEL_CEILING_INDEED=200`, `JOB_CHANNEL_CEILING_LINKEDIN=300`.
   - Spend is the sum of the `cost` field on this month's distribution rows for
     that `(companyId, portalCode)` — persisted, so it survives restarts.
3. **Rate limiting** — every paid dispatch passes through `JobChannelRateLimiter`
   (`src/lib/job-channel-rate-limiter.ts`): per-(channel, company) token bucket,
   per-minute + daily caps + minimum spacing (`DEFAULT_PAID_CHANNEL_LIMITS`).
   Hitting the daily cap throws → recorded as a retryable failure.

Every paid post records a **real external id + cost** on its row
(`portalJobId`, `cost`); we never fabricate a `POSTED`.

**Not wired:** the actual paid providers (Indeed Apply bidirectional sync, PNet
StepStone XML, LinkedIn ATS) require signed developer/partner agreements +
credentials. The guard/opt-in/rate-limit plumbing is in place so a real provider
adapter (postingMode `api`, costTier `paid`) drops straight in and is enforced.

## Definition of done (issue #429 P3)

- [x] Feed hardened (expirationdate + email added; caching headers; test-mode
  excluded) and documented (this file).
- [ ] At least one aggregator confirmed consuming the feed — **pending a human
  submitting the feed URL and the aggregator accepting it** (external; use the
  runbook above).
- [ ] Indeed organic intake — **apply via the runbook; partner-gated.**
