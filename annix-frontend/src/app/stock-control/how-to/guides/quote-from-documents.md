---
title: Quote from documents (Nix)
slug: quote-from-documents
category: Quotations
roles: [sales, manager, admin]
order: 50
tags: [nix, quote, drawings, specifications, ai, extraction, asca]
lastUpdated: 2026-05-07
summary: Drop customer drawings and specifications separately so Nix extracts line items from drawings, then cross-links applicable spec clauses from the spec docs.
readingMinutes: 3
relatedPaths:
  - annix-frontend/src/app/stock-control/portal/quotations/new-from-documents/page.tsx
  - annix-frontend/src/app/stock-control/portal/quotations/drafts/[id]/page.tsx
  - annix-backend/src/stock-control/services/asca-quote-documents-profile.handler.ts
  - annix-backend/src/nix/services/nix-extraction-session.service.ts
---

## What it does

When a customer sends a quote pack — usually a mix of workshop drawings and customer specifications (paint systems, rubber lining, fabrication standards) — Nix can extract the line items from the drawings AND match them up with the relevant clauses in the spec docs. You drop the documents in two separate buckets, Nix processes drawings first, then processes specs with the drawings' items already in context. The result lands on a draft review page where each item already has its applicable paint/lining/material-class clauses attached.

## Step-by-step

1. **Open the new flow.** Customer portal → Quotations → click **New from documents (Nix)** at the top right.
2. **Drop drawings into the blue bucket.** This is for workshop sheets, isometrics, BOQ documents — anything that lists items to be fabricated. Click **Send drawings to Nix**. Nix uploads each file to S3 (so you can audit later), runs Gemini extraction tuned for items + the spec codes (R1, R2a, SC1, etc.) the drawings reference.
3. **Drop specs into the purple bucket.** This is for paint specs, rubber lining standards, fabrication procedures, scope-of-work documents — anything that DEFINES the codes a drawing cites. Click **Send specs to Nix**. Because the drawings have already been processed, Nix sees the items and codes from the drawings as context and finds the matching clauses in your specs.
4. **Continue to draft review.** When at least one bucket is confirmed, a "Continue to draft review →" link appears. The draft review page (`/stock-control/portal/quotations/drafts/{sessionId}`) shows:
   - **Drawings** — each upload as a card, with the line items table (mark, description, qty, dimensions, lining/codes).
   - **Specifications** — each upload as a card, with clause-level facts cross-linked back to the codes the drawings cited.
   - A **View original** link on every card opens the source PDF in the branded preview modal.
5. **Promote the session to a quote.** Click **Promote to quote** when you're ready, optionally enter the quote reference (e.g. `QUO-2026-0193`). The session moves to `promoted` status. The actual quote-creation step is currently a stub — when the full quote builder is plugged in, this is where the items will land in the new quote.

## Rules and constraints

- **Drawings before specs gives you the best result.** You CAN drop specs first, but Nix won't know which items the spec clauses apply to without the drawings as context. The order of confirmation matters more than the order of dropping files.
- **Both buckets feed into the SAME session.** Adding documents to either bucket later (after a first confirm) appends to the same session — no new draft is created until you refresh the page.
- **Source documents are kept in S3.** Every uploaded file is mirrored to `stock-control/extractions/{extractionId}/{role}/{filename}`. The "View original" link generates a 10-minute presigned URL gated to you (the owner) or any admin. If you don't see the original later, it usually means the upload predated this feature.
- **Banding is priced per band.** When Nix extracts a banded item, it captures the band count separately from the item quantity. Don't multiply.
- **Mine red-pen deviations are surfaced separately.** When a drawing has handwritten markups overriding the printed spec (e.g. "6 mm on flange face, no overlap joint" overriding the standard 3 mm spec return), Nix lists these as `deviations` on the item — quote them as variations, not as the printed default.

## Tips

- **The session lifecycle** is `draft` → `reviewing` → `promoted` (or `archived`). The page header shows the current status.
- **Reuse a session** by going back to its draft URL — anything you upload while on the new-from-documents page after navigating away creates a NEW session. Bookmark a session URL if you'll be returning to it.
- **The applicable-spec linking depends on the drawings using consistent codes** (R1, R2a, SC1 etc.). If a drawing just describes paint inline ("Carboguard 890 Aluminium 100µm") without a code, Nix will still extract the description but won't be able to link it to a specific spec clause.
