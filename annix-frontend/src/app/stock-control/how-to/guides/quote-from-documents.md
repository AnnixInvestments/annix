---
title: Quote from documents (Nix)
slug: quote-from-documents
category: Quotations
roles: [sales, manager, admin]
order: 50
tags: [nix, quote, drawings, specifications, ai, extraction, asca]
lastUpdated: 2026-06-12
summary: Drop the whole customer pack into one dropzone — Nix tags each file as drawing / specification / other, extracts drawings first, then cross-links applicable spec clauses from the spec docs.
readingMinutes: 3
relatedPaths:
  - annix-frontend/src/app/stock-control/portal/quotations/new-from-documents/page.tsx
  - annix-frontend/src/app/stock-control/portal/quotations/drafts/[id]/page.tsx
  - annix-backend/src/stock-control/services/asca-quote-documents-profile.handler.ts
  - annix-backend/src/nix/services/nix-extraction-session.service.ts
---

## What it does

When a customer sends a quote pack — usually a mix of workshop drawings and customer specifications (paint systems, rubber lining, fabrication standards) — Nix can extract the line items from the drawings AND match them up with the relevant clauses in the spec docs. You drop everything into a single dropzone; Nix tags each file's role automatically (fix any wrong guess with the per-file dropdown), then internally processes drawings first and specs second with the drawings' items already in context. The result lands on a draft review page where each item already has its applicable paint/lining/material-class clauses attached.

## Step-by-step

1. **Open the new flow.** Customer portal → Quotations → click **New from documents (Nix)** at the top right.
2. **Drop the whole pack into the dropzone.** Drawings, BOQ spreadsheets, paint specs, lining standards, scope docs — all in one place. Nix tags each file with a role chip (Drawing / Specification / Other) within a couple of seconds: filenames decide instantly, and an ambiguous PDF gets a quick AI glance at its content.
3. **Fix any wrong chip, then click "Send all to Nix".** Each chip is a dropdown — if Nix guessed wrong, set the right role before processing. Internally Nix still extracts drawings first, then specs (with the drawings' items and codes as context), then other documents — so the cross-linking works exactly as it did with the old two-bucket flow.
4. **Continue to draft review.** Once processing finishes, a "Continue to draft review →" link appears. The draft review page (`/stock-control/portal/quotations/drafts/{sessionId}`) shows:
   - **Drawings** — each upload as a card, with the line items table (mark, description, qty, dimensions, lining/codes).
   - **Specifications** — each upload as a card, with clause-level facts cross-linked back to the codes the drawings cited.
   - A **View original** link on every card opens the source PDF in the branded preview modal.
5. **Promote the session to a quote.** Click **Promote to quote** when you're ready, optionally enter the quote reference (e.g. `QUO-2026-0193`). The session moves to `promoted` status. The actual quote-creation step is currently a stub — when the full quote builder is plugged in, this is where the items will land in the new quote.

## Rules and constraints

- **Drop order doesn't matter — role does.** Whatever order you drop files in, Nix always extracts drawings before specifications so spec clauses can attach to the items and codes the drawings cite. What matters is each file carrying the right role chip; correct any wrong guess before sending.
- **Everything feeds into the SAME session.** Sending another batch later appends to the same session — no new draft is created until you refresh the page.
- **Source documents are kept in S3.** Every uploaded file is mirrored to `stock-control/extractions/{extractionId}/{role}/{filename}`. The "View original" link generates a 10-minute presigned URL gated to you (the owner) or any admin. If you don't see the original later, it usually means the upload predated this feature.
- **Banding is priced per band.** When Nix extracts a banded item, it captures the band count separately from the item quantity. Don't multiply.
- **Mine red-pen deviations are surfaced separately.** When a drawing has handwritten markups overriding the printed spec (e.g. "6 mm on flange face, no overlap joint" overriding the standard 3 mm spec return), Nix lists these as `deviations` on the item — quote them as variations, not as the printed default.

## Tips

- **The session lifecycle** is `draft` → `reviewing` → `promoted` (or `archived`). The page header shows the current status.
- **Reuse a session** by going back to its draft URL — anything you upload while on the new-from-documents page after navigating away creates a NEW session. Bookmark a session URL if you'll be returning to it.
- **The applicable-spec linking depends on the drawings using consistent codes** (R1, R2a, SC1 etc.). If a drawing just describes paint inline ("Carboguard 890 Aluminium 100µm") without a code, Nix will still extract the description but won't be able to link it to a specific spec clause.
