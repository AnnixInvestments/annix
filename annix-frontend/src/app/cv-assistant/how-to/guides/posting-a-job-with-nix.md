---
title: Posting a Job with Nix
slug: posting-a-job-with-nix
category: Hiring
roles: [recruiter, admin]
order: 1
tags: [jobs, nix, ai, wizard]
lastUpdated: 2026-05-06
summary: Walk through the six-step job-posting wizard and learn when to lean on Nix.
readingMinutes: 6
relatedPaths: [annix-frontend/src/app/lib/cv-assistant/job-wizard, annix-frontend/src/app/cv-assistant/portal/jobs, annix-backend/src/cv-assistant/services/nix-job-assist.service.ts, annix-backend/src/cv-assistant/services/nix-prompts.ts]
---

## What is the wizard?

The job-posting wizard replaces the old single-screen modal with a six-step
flow. Each step focuses on one decision; Nix (the AI hiring assistant) sits
in a side panel offering live suggestions, inline warnings, and one-click
fixes. The post is saved as a draft on every blur, so you can leave and
come back without losing work.

Open it from the Dashboard ("Post a New Job") or the Jobs page ("Create
Job"). The URL is `/cv-assistant/portal/jobs/new`; the draft id is added
to the URL once the first save lands so the page is shareable / bookmarkable.

## The six steps

### 1. Job basics

Enter the title, industry, department, seniority, location, employment
type, and work mode (on-site / hybrid / remote).

When to click Nix:

- **Suggest titles** — paste a vague title (e.g. "Sales") and Nix returns
  3–5 normalised, commonly-searched alternatives ("External Sales Rep",
  "Internal Sales Consultant", "Sales Manager"). Click one to apply.
- **Vague-title warning** — if Nix flags the title as vague, fix it before
  moving on. Vague titles silently kill match quality across the rest of
  the funnel.

### 2. Role outcomes

Replace the freeform description with structured prompts:

- *Company context* — short paragraph about the team / business
- *Main purpose* — one sentence
- *Responsibilities* — repeatable list
- *Success in 3 months* — what does "going well" look like at 90 days?
- *Success in 12 months* — what does "great" look like at year one?

When to click Nix:

- **Help me write this** — Nix synthesises a polished candidate-facing
  description from your structured answers. It streams in (you'll see the
  branded progress modal) and lands as plain text you can edit.

### 3. Skills & requirements

Skills are now structured records, not comma-separated text. For each
skill you specify name, importance (required / preferred), proficiency,
years of experience, and an evidence prompt the matcher can look for in
the CV.

When to click Nix:

- **Suggest skills** — Nix proposes a starter set from the title +
  outcomes. Apply all, apply per row, or reject. Each suggestion comes
  with an evidence prompt so the candidate ranker has something concrete
  to match against.
- Required certifications stay simpler — `{name, mandatory}` per row.

### 4. Salary & benefits

Range, currency, commission structure, benefits chips.

When to click Nix:

- **Salary insights** — once title + province are set, the page shows
  p25 / median / p75 from the cached SA market data plus a competitiveness
  badge. The data is sourced from Adzuna (attribution shown inline).
- **Salary guidance** — Nix combines the cache with the rest of the
  posting context (seniority, skills, commission structure, location) and
  returns a recommended range with a confidence number and an explanation.

### 5. Screening questions

A short list of yes/no, short-text, multiple-choice, or numeric questions
candidates answer at apply-time. Mark disqualifying answers and a weight
(1–10).

When to click Nix:

- **Generate screening questions** — Nix produces 4–8 questions ranked by
  weight from the outcomes + skills. You can edit, reorder, drop, or add
  your own. Mark disqualifying answers conservatively — over-filtering is
  worse than under-filtering.

### 6. Review & publish

The final step shows the candidate-facing preview, the live job-quality
score, and the inclusivity scan results.

#### Job quality score

Score is 0–100, broken down by:

- **Clarity** — title specificity, description completeness, readability
- **Salary competitiveness** — vs the market percentile data
- **Candidate attraction** — combination of clarity + benefits + outcomes
- **Screening strength** — how well the questions distinguish candidates
- **Matching readiness** — structured skills + evidence prompts present
- **Inclusivity** — bias / loaded-language detection

Click any dimension to see specific issues and recommended fixes.

#### Inclusivity scan

Nix scans the description + responsibilities for non-inclusive terms and
suggests replacements. Examples:

| Flagged term | Why | Suggested replacement |
|---|---|---|
| "salesman", "manpower", "rockstar" | Gender-coded / culture-coded | "salesperson", "workforce", "high performer" |
| "young", "energetic", "digital native" | Age-coded | "motivated", "eager to learn", "comfortable with modern tools" |
| "must be able-bodied" | Ableist | rephrase as a specific job requirement only if essential |
| "native English speaker" | National-origin proxy | "fluent in English" |

Hover over a highlighted term to see the replacement; click "Apply Nix's
fixes" to one-shot resolve every recommended fix.

#### Predicted candidate volume

Nix estimates the lower / expected / upper number of applicants the
posting will attract over the response timeline you set, based on SA
labour-market signal. Confidence is shown as a percentage; treat it as a
sanity check, not a forecast.

#### Sourcing queries

After you publish, Nix generates Boolean search strings for LinkedIn,
Indeed, and Google so you can passively source candidates outside our
funnel. Each engine has a copy button + an "Open in new tab" link.

## Tips

- **Auto-save runs every time you leave a field** — there's no Save
  button on each step. Step transitions force-flush.
- **Move forward before all suggestions are perfect.** The quality score
  updates live; you can come back to a step at any time via the stepper.
- **Treat Nix suggestions as a starting point** — they're tuned to the
  SA SME market but won't know your domain better than you do.
- **The AI candidate ranker never sees the demographic data** that
  candidates may disclose later. The wizard is for the post itself; the
  Employment Equity disclosure flow is separate (see the EE compliance
  guide once that ships).

## What if Nix is wrong?

- Title suggestions: ignore them — your title stays whatever you typed.
- Description: the streamed output is editable; treat it as a first
  draft.
- Skill suggestions: reject per row; only structured skills you accept
  reach the matcher.
- Quality score: addresses are recommendations, not requirements.
  Critical issues block the publish button only when they're hard
  blockers (no title, no salary, etc.).
- Inclusivity: every flagged term shows the rule that triggered it. If
  Nix is wrong about your context (e.g. "speaker" in "speaker driver"),
  override it inline.

## Roadmap

- Per-skill realism red border (currently bundled into the quality score
  `criticalIssues` channel).
- Screenshots for each step in this guide (next pass).
- A second guide: "Reading the candidate ranker output" — when shipped,
  it will live alongside this one.
