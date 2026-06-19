import { ApiProperty } from "@nestjs/swagger";
import { User } from "../../user/entities/user.entity";
import { NixExtraction } from "./nix-extraction.entity";

/**
 * Lifecycle of a NixExtractionSession.
 *
 * - draft: user is still uploading documents into the session.
 * - reviewing: all uploads complete, user is on the draft review page
 *   editing extracted items.
 * - promoted: items have been turned into a real domain entity (an RFQ,
 *   an ASCA quote, a job card etc.) — the session is closed.
 * - archived: the user discarded the session without promoting.
 */
export enum NixExtractionSessionStatus {
  DRAFT = "draft",
  REVIEWING = "reviewing",
  PROMOTED = "promoted",
  ARCHIVED = "archived",
}

/**
 * Groups multiple Nix extractions that belong to the same upload event so
 * they can be processed and reviewed as a single quote pack.
 *
 * The session is the cornerstone of #253 task B's cross-document linker —
 * drawings extracted first inside the session, then specs extracted with
 * the drawings' items as Gemini context, so paint codes / material classes
 * referenced on the drawings get matched to the spec clauses that define
 * them.
 *
 * Design notes
 * ------------
 * - sourceModule + sourceId let any host app own a session ("asca" for the
 *   ASCA quoting flow today; "rfq" for the RFQ wizard tomorrow). Keeps
 *   Nix host-app-agnostic, mirrors the polymorphic source linkage already
 *   on NixExtraction.
 * - status is a small enum so the UI can drive the user through draft →
 *   reviewing → promoted without per-app state tables.
 * - title is optional — populated either by Nix from the first extracted
 *   document's project metadata, or by the user on the review page.
 * - promotedRef captures the natural-key reference of the entity the
 *   session was promoted into (e.g. "QUO-2026-0193"). This is durable
 *   even if FKs to the host-app table aren't desirable from the Nix module.
 */
export class NixExtractionSession {
  @ApiProperty()
  id: number;

  @ApiProperty({
    description: "Owning module key — 'asca', 'rfq', etc.",
  })
  sourceModule: string;

  @ApiProperty({
    description:
      "Source entity ID within the owning module — e.g. ASCA quote draft id or future RFQ session id. Null until the host app links it back.",
    required: false,
  })
  sourceId?: number;

  @ApiProperty({
    description: "Profile that drives prompts and post-extract logic for this session.",
  })
  extractionProfile: string;

  @ApiProperty({ enum: NixExtractionSessionStatus })
  status: NixExtractionSessionStatus;

  @ApiProperty({
    description:
      "Human-readable title — usually the project name pulled from the first extraction.",
    required: false,
  })
  title?: string;

  @ApiProperty({
    description: "Optional reference (e.g. customer's RFQ number).",
    required: false,
  })
  externalReference?: string;

  @ApiProperty({
    description:
      "Natural-key reference of the host-app entity the session was promoted to (e.g. 'QUO-2026-0193').",
    required: false,
  })
  promotedRef?: string;

  ownerUser?: User;

  ownerUserId?: number;

  extractions?: NixExtraction[];

  @ApiProperty({
    description:
      "Persisted state of the QuoteSpecsEditor for this session: supplier-row overrides (custom brands / descriptions / data-sheet library links), per-spec rates (R/m², R/Rm), and the customer-facing supplier selection. Loaded on mount and debounce-saved (1 s) on every edit so a refresh / re-open lands the quoter back where they left off. Shape mirrors the frontend's { overrides, rates, attachments } bundle.",
    required: false,
  })
  quoteEditorState?: Record<string, unknown>;

  @ApiProperty({
    description:
      "FK to companies.id when the quoter picks an existing customer from the master list (or saves a freshly typed one with 'Save for future use'). Null for one-off customers that exist only on this quote's snapshot. Resolved by GET /stock-control/customers.",
    required: false,
  })
  customerCompanyId?: number;

  @ApiProperty({
    description:
      "Customer details as they were when this quote was issued — captured for the PDF header so a later edit to the master Company row doesn't retroactively change a quote that's already been sent. Shape: { name, contactPerson, email, phone, vatNumber, registrationNumber, streetAddress, city, province, postalCode, country }.",
    required: false,
  })
  customerSnapshot?: Record<string, unknown>;

  @ApiProperty({
    description:
      "Customer's PO / order reference as printed on the quote (e.g. 'STEEL AFRICA - 32452E'). Maps to the 'Order No' column on the customer-facing PDF header.",
    required: false,
  })
  customerOrderNumber?: string;

  @ApiProperty({
    description:
      "Delivery-note reference for this quote — usually blank at quote time but the column exists on the customer-facing PDF template (Polymer Liners style).",
    required: false,
  })
  deliveryNoteRef?: string;

  @ApiProperty({
    description:
      "Free-text notes that appear between item sections on the customer-facing PDF (banding instructions, special-spool callouts, etc.). Shape: { perPool: { [poolKey]: string }, generalAfterItems: string }.",
    required: false,
  })
  quoteNotes?: Record<string, unknown>;

  @ApiProperty({
    description:
      "Timestamp when the quoter clicked the 'Submit Quote' button on the working quote page. Display-only — the session stays in 'promoted' status and remains editable via auto-save after submission. Shown on the Quotations hub as 'Submitted YYYY/MM/DD' when set.",
    required: false,
  })
  submittedAt?: Date;

  @ApiProperty({
    description:
      "FK to the JobCard that was created from this quote via the 'Convert to Job Card' action. Null until the quote is converted; non-null afterwards, which locks the convert button and replaces it with a 'View Job Card' link. Lock-after-first-convert is intentional (per project decision) to prevent duplicate JCs from accidental double-clicks.",
    required: false,
  })
  jobCardId?: number;

  @ApiProperty({
    description:
      "Quote grand total incl VAT, snapshotted when the quoter clicks Submit. Lets the Quotations hub render a Value column without re-running every quote's pooled m² x rate maths. Null until first submit; refreshed on each subsequent submit.",
    required: false,
  })
  quoteTotalIncVat?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
