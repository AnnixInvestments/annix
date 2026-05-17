"use client";

import { keys } from "es-toolkit/compat";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type ProductDataSheetSearchHit,
  searchProductDataSheets,
  type UploadProductDataSheetResult,
  uploadProductDataSheet,
} from "@/app/lib/query/hooks";
import {
  type CoatEntry,
  coatLabel,
  countMissingDataSheets,
  type DataSheetAttachment,
  type DataSheetAttachments,
  defaultCoatBreakdown,
  effectiveSuppliers,
  newCustomEntry,
  newIntermediateCoat,
  orderedCoats,
  type SpecKind,
  type SpecListing,
  type SpecOverrides,
  type SpecRate,
  type SpecRates,
  type SupplierEntry,
  sanitiseRate,
  selectedSupplierId,
  sumCoatRates,
  withSelectedSupplier,
  withSpecSuppliers,
} from "./quoteSpecOverrides";

/**
 * Controlled, headless-state editor for the spec + pricing section at the
 * top of every quote view. Both the extracted-quote flow (Promote-to-quote
 * on a Nix session) and the manual-quote flow (Polymer / RFQ user typing
 * specs from scratch) mount the same component and pass their own state +
 * change handlers — the editor doesn't care where the data lives.
 *
 * What it does:
 *  - Renders one card per spec, with an editable supplier list (coatings
 *    have multiple suppliers; linings are single-product)
 *  - Pricing inputs per card (R / m² for coatings; R / Rm + R / m² for
 *    linings to honour the over-3-m vs. plate/fitting/short-pipe schedule)
 *  - Marks every user-edited or user-added entry with a 'Custom' badge and
 *    surfaces an 'Upload data sheet' affordance on each one
 *  - Top-of-page banner counts custom entries that still need a data sheet
 *  - Optional '+ Add coating' / '+ Add lining' buttons (manual-quote mode)
 *  - Optional delete-spec button per card (manual-only specs only)
 *
 * What it does NOT do:
 *  - Persist anything — the parent owns state and persistence
 *  - Compute cost — the parent reads back the same state and runs costing
 *  - Validate spec-code uniqueness — that's the parent's responsibility on
 *    rename / add (the editor will happily render duplicates if asked to)
 */
export interface QuoteSpecsEditorProps {
  specs: SpecListing[];
  overrides: SpecOverrides;
  rates: SpecRates;
  attachments: DataSheetAttachments;
  onOverridesChange: (next: SpecOverrides) => void;
  /**
   * Accepts a `SetStateAction<SpecRates>` so rapid keystrokes between the
   * lining card's R/Rm and R/m² inputs don't race on the closure-captured
   * `rates` value: handleRateChange below uses the functional updater form
   * to read the latest state for each call.
   */
  onRatesChange: React.Dispatch<React.SetStateAction<SpecRates>>;
  onAttachmentsChange: (next: DataSheetAttachments) => void;
  /** When provided, '+ Add coating' / '+ Add lining' buttons are shown. */
  onAddSpec?: (kind: SpecKind) => void;
  /** When provided, manually-added specs gain a delete button. */
  onDeleteSpec?: (code: string) => void;
  /** When provided, manually-added specs gain an inline rename input. */
  onRenameSpec?: (oldCode: string, newCode: string) => void;
}

export function QuoteSpecsEditor(props: QuoteSpecsEditorProps) {
  const {
    specs,
    overrides,
    rates,
    attachments,
    onOverridesChange,
    onRatesChange,
    onAttachmentsChange,
    onAddSpec,
    onDeleteSpec,
    onRenameSpec,
  } = props;

  const dataSheetCounts = countMissingDataSheets(specs, overrides, attachments);
  const showAddRow = Boolean(onAddSpec);

  if (specs.length === 0 && !showAddRow) return null;

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900">Specs &amp; pricing</h2>
        <span className="text-xs text-gray-500 text-right">
          Coatings: enter R / m². Linings: enter R / Rm (pipes ≥ 3 m) and R / m² (plate, fittings,
          short pipes).
        </span>
      </header>

      {dataSheetCounts.custom > 0 && (
        <DataSheetBanner custom={dataSheetCounts.custom} missing={dataSheetCounts.missing} />
      )}

      {specs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {specs.map((spec) => (
            <SpecCard
              key={spec.code}
              spec={spec}
              suppliers={effectiveSuppliers(spec, overrides)}
              selectedId={selectedSupplierId(spec, overrides)}
              rate={rates[spec.code]}
              attachments={attachments}
              onSuppliersChange={(transform) =>
                onOverridesChange(withSpecSuppliers(spec, overrides, transform))
              }
              onSelectSupplier={(supplierId) =>
                onOverridesChange(withSelectedSupplier(spec, overrides, supplierId))
              }
              onRateChange={(field, value) =>
                handleRateChange(onRatesChange, spec.code, field, value)
              }
              onAttachmentChange={(entryId, attachment) =>
                handleAttachmentChange(attachments, onAttachmentsChange, entryId, attachment)
              }
              onDeleteSpec={
                spec.isManuallyAdded && onDeleteSpec ? () => onDeleteSpec(spec.code) : undefined
              }
              onRenameSpec={
                spec.isManuallyAdded && onRenameSpec
                  ? (newCode) => onRenameSpec(spec.code, newCode)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {showAddRow && onAddSpec && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => onAddSpec("coating")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-dashed border-orange-400 text-orange-800 bg-orange-50 rounded-md hover:bg-orange-100"
          >
            <span aria-hidden>+</span> Add coating spec
          </button>
          <button
            type="button"
            onClick={() => onAddSpec("lining")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-dashed border-blue-400 text-blue-800 bg-blue-50 rounded-md hover:bg-blue-100"
          >
            <span aria-hidden>+</span> Add lining spec
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Bug fix 2026-05-11: lining cards have TWO rate inputs (R/Rm + R/m²) on the
 * same render. Typing in one then quickly switching focus to the other
 * caused the second call to read a closure-stale `rates` snapshot — the
 * first update hadn't propagated yet — which silently overwrote the first
 * rate with 0. Paint cards have only one input so couldn't hit the race.
 *
 * Fix: use the functional setState updater so each call reads the latest
 * state. `onChange` is now typed as `Dispatch<SetStateAction<SpecRates>>`
 * so both `setSpecRates` directly and any equivalent dispatcher work.
 */
function handleRateChange(
  onChange: React.Dispatch<React.SetStateAction<SpecRates>>,
  code: string,
  field: "perM2" | "perRm",
  raw: string,
): void {
  const parsed = raw === "" ? 0 : Number(raw);
  const safe = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  onChange((prev) => {
    const existing = prev[code] ? prev[code] : { perM2: 0, perRm: 0 };
    const nextEntry: SpecRate = {
      perM2: field === "perM2" ? safe : existing.perM2,
      perRm: field === "perRm" ? safe : existing.perRm,
    };
    const next = { ...prev };
    if (nextEntry.perM2 === 0 && nextEntry.perRm === 0) {
      delete next[code];
    } else {
      next[code] = nextEntry;
    }
    return next;
  });
}

function handleAttachmentChange(
  attachments: DataSheetAttachments,
  onChange: (next: DataSheetAttachments) => void,
  entryId: string,
  attachment: DataSheetAttachment | null,
): void {
  const next = { ...attachments };
  if (attachment) {
    next[entryId] = attachment;
  } else {
    delete next[entryId];
  }
  onChange(next);
}

function DataSheetBanner(props: { custom: number; missing: number }) {
  const { custom, missing } = props;
  const allDone = missing === 0;
  return (
    <div
      className={`rounded-md border px-3 py-2 text-xs flex items-start gap-2 ${
        allDone
          ? "bg-emerald-50 border-emerald-200 text-emerald-900"
          : "bg-amber-50 border-amber-300 text-amber-900"
      }`}
    >
      <svg
        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${allDone ? "text-emerald-600" : "text-amber-600"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>
        {allDone ? (
          <>
            <span className="font-semibold">
              {custom} custom entr{custom === 1 ? "y has" : "ies have"} a data sheet attached.
            </span>{" "}
            They&apos;ll travel with the quote when you send it.
          </>
        ) : (
          <>
            <span className="font-semibold">
              {missing} of {custom} custom {custom === 1 ? "entry needs" : "entries need"} a data
              sheet
            </span>{" "}
            — upload one for each before sending the quote so the customer has the technical specs
            of the alternative product on file.
          </>
        )}
      </span>
    </div>
  );
}

interface SpecCardProps {
  spec: SpecListing;
  suppliers: SupplierEntry[];
  selectedId: string | null;
  rate: SpecRate | undefined;
  attachments: DataSheetAttachments;
  onSuppliersChange: (transform: (suppliers: SupplierEntry[]) => SupplierEntry[]) => void;
  onSelectSupplier: (supplierId: string | null) => void;
  onRateChange: (field: "perM2" | "perRm", value: string) => void;
  onAttachmentChange: (entryId: string, attachment: DataSheetAttachment | null) => void;
  onDeleteSpec?: () => void;
  onRenameSpec?: (newCode: string) => void;
}

function SpecCard(props: SpecCardProps) {
  const {
    spec,
    suppliers,
    selectedId,
    rate,
    attachments,
    onSuppliersChange,
    onSelectSupplier,
    onRateChange,
    onAttachmentChange,
    onDeleteSpec,
    onRenameSpec,
  } = props;

  const isLining = spec.kind === "lining";
  const kindLabel = isLining ? "Lining" : "Coating";
  const kindToneClass = isLining
    ? "bg-blue-50 text-blue-800 border-blue-200"
    : "bg-orange-50 text-orange-800 border-orange-200";
  // Drawing-faceted coating: the signed drawing dictates the per-face
  // treatment (CORROSION INT. + CORROSION EXT.), so the supplier rows
  // are the contractual facets — not alternatives the quoter picks
  // between. Hides the USE THIS toggle, the '+ Add alternative' button,
  // and the per-row select affordance.
  const isDrawingFaceted =
    !isLining && suppliers.some((s) => s.brand === "Internal" || s.brand === "External");
  // When a lining spec carries a custom product (e.g. the quoter uploaded
  // a 'Weir Linacure 60' data sheet to substitute the drawing's 'Linatex
  // Linard 60'), the card should headline the product actually being
  // supplied — not the drawing's code. The code stays as a small mono
  // subtitle so the drawing linkage is still visible. Product name is the
  // text before the first comma of the custom description.
  const customLiningEntry = isLining ? suppliers.find((s) => s.isCustom) : undefined;
  const customLiningName =
    customLiningEntry && customLiningEntry.description.trim().length > 0
      ? customLiningEntry.description.split(",")[0].trim()
      : null;

  const m2Value = rate && rate.perM2 > 0 ? String(rate.perM2) : "";
  const rmValue = rate && rate.perRm > 0 ? String(rate.perRm) : "";

  // Per-coat breakdown (#295): when a coating entry has been broken into
  // coats, that entry's summed coat rate IS the spec's R/m². The selected
  // supplier's breakdown wins; otherwise the first entry that has one.
  const selectedCoatEntry =
    !isLining && selectedId
      ? suppliers.find((s) => s.id === selectedId && s.coats !== undefined)
      : undefined;
  const firstCoatEntry = isLining ? undefined : suppliers.find((s) => s.coats !== undefined);
  const coatModeEntry = selectedCoatEntry ?? firstCoatEntry;
  const coatModeCoats = coatModeEntry ? coatModeEntry.coats : undefined;
  const coatRateSum = coatModeCoats ? sumCoatRates(coatModeCoats) : null;
  const coatRateSumLabel = coatRateSum === null ? "0.00" : coatRateSum.toFixed(2);
  const currentM2 = rate ? rate.perM2 : 0;
  // Keep the persisted SpecRate.perM2 in lockstep with the coat sum, so the
  // whole cost pipeline (grand total, pool sections, customer PDF) reads
  // the right number without knowing per-coat pricing exists.
  useEffect(() => {
    if (coatRateSum === null) return;
    if (Math.abs(currentM2 - coatRateSum) > 1e-9) {
      onRateChange("perM2", String(coatRateSum));
    }
  }, [coatRateSum, currentM2, onRateChange]);

  const updateSupplier = (entryId: string, partial: Partial<SupplierEntry>) => {
    onSuppliersChange((current) =>
      current.map((s) => (s.id === entryId ? { ...s, ...partial, isCustom: true } : s)),
    );
  };
  const deleteSupplier = (entryId: string) => {
    onSuppliersChange((current) => current.filter((s) => s.id !== entryId));
    onAttachmentChange(entryId, null);
  };
  const addSupplier = () => {
    onSuppliersChange((current) => [...current, newCustomEntry("", "")]);
  };

  /**
   * For lining rows: rewrite the bore + flange-face thickness tokens in every
   * stored supplier description so they track the current merged spec summary
   * (which itself reflects drawing-derived values per the "drawings override
   * spec" rule). Touches only the thickness tokens, preserves everything else
   * the quoter typed — product name, hardness, cure method, colour — and
   * leaves data-sheet attachments intact. No-op for coating rows or when the
   * resolved summary doesn't carry thickness tokens.
   */
  const resolvedSummaryRaw = spec.resolved?.summary;
  const resolvedSummary = resolvedSummaryRaw ?? null;
  const resolvedSummaryForRefresh = isLining ? resolvedSummary : null;
  const summaryThicknesses = useMemo(
    () => parseLiningSummaryThicknesses(resolvedSummaryForRefresh),
    [resolvedSummaryForRefresh],
  );
  const canRefreshThicknesses =
    isLining &&
    suppliers.length > 0 &&
    summaryThicknesses !== null &&
    (summaryThicknesses.boreMm !== null || summaryThicknesses.flangeMm !== null);
  const refreshThicknessesFromSpec = () => {
    if (!canRefreshThicknesses || !summaryThicknesses) return;
    onSuppliersChange((current) =>
      current.map((entry) => ({
        ...entry,
        description: rewriteLiningThicknessTokens(entry.description, summaryThicknesses),
      })),
    );
  };

  return (
    <div className="flex flex-col gap-3 border border-gray-200 rounded-md p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`inline-block text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${kindToneClass}`}
          >
            {kindLabel}
          </span>
          {onRenameSpec ? (
            <input
              type="text"
              value={spec.code}
              onChange={(event) => onRenameSpec(event.target.value)}
              placeholder="Spec code (e.g. R3)"
              className="font-mono text-sm font-semibold text-gray-900 border border-gray-200 rounded px-1.5 py-0.5 min-w-0 flex-1 focus:outline-none focus:ring-2 focus:ring-[#323288]/30"
            />
          ) : customLiningName ? (
            <span className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-sm font-semibold text-gray-900 truncate">
                {customLiningName}
              </span>
              <span className="font-mono text-[11px] text-gray-400 whitespace-nowrap">
                ({spec.code})
              </span>
            </span>
          ) : (
            <span className="font-mono text-sm font-semibold text-gray-900">{spec.code}</span>
          )}
        </div>
        {onDeleteSpec && (
          <button
            type="button"
            onClick={onDeleteSpec}
            className="text-gray-400 hover:text-red-600 text-sm leading-none px-1"
            aria-label={`Delete spec ${spec.code}`}
            title="Delete this spec"
          >
            ×
          </button>
        )}
      </div>

      <div className="space-y-2">
        {isDrawingFaceted && (
          <p className="text-[11px] text-gray-500">
            Internal &amp; external coatings are dictated by the signed drawing — both apply and
            travel with the quote. Edit the description text if a product needs amending.
          </p>
        )}
        {!isLining && !isDrawingFaceted && suppliers.length > 1 && (
          <p className="text-[11px] text-gray-500">
            {selectedId
              ? "Selected supplier shown below — click another brand to switch, or click the same one to clear and quote all alternatives."
              : "Click a brand to use it on this quote. Alternatives will stay here for reference but won't reach the customer."}
          </p>
        )}
        {suppliers.length === 0 ? (
          <p className="text-xs text-gray-500 italic">
            No {isLining ? "product" : "suppliers"} entered.{" "}
            {isLining
              ? "Click 'Add product' to enter the lining you'll be supplying."
              : "Click 'Add alternative' to enter the coating you'll be supplying."}
          </p>
        ) : (
          suppliers.map((supplier) => {
            const isSelected = !isDrawingFaceted && selectedId === supplier.id;
            const isDimmed = !isLining && !isDrawingFaceted && selectedId !== null && !isSelected;
            const resolved = spec.resolved;
            const specSummary = resolved ? resolved.summary : null;
            return (
              <SupplierRow
                key={supplier.id}
                supplier={supplier}
                kind={spec.kind}
                isLining={isLining}
                isSelected={isSelected}
                isDimmed={isDimmed}
                showSelectAffordance={!isLining && !isDrawingFaceted}
                hideDelete={isDrawingFaceted && !supplier.isCustom}
                attachment={attachments[supplier.id] ? attachments[supplier.id] : null}
                attachments={attachments}
                specSummary={specSummary}
                onChange={(partial) => updateSupplier(supplier.id, partial)}
                onDelete={() => deleteSupplier(supplier.id)}
                onToggleSelect={() => onSelectSupplier(isSelected ? null : supplier.id)}
                onAttachmentChange={(attachment) => onAttachmentChange(supplier.id, attachment)}
                onCoatAttachmentChange={onAttachmentChange}
              />
            );
          })
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={addSupplier}
            className="inline-flex items-center gap-1 text-xs text-[#323288] font-medium hover:underline"
          >
            <span aria-hidden>+</span> Add{" "}
            {isLining ? "product" : isDrawingFaceted ? "coat" : "alternative"}
          </button>
          {canRefreshThicknesses && (
            <button
              type="button"
              onClick={refreshThicknessesFromSpec}
              className="inline-flex items-center gap-1 text-xs text-[#323288] font-medium hover:underline"
              title="Rewrite the bore / flange thicknesses in every supplier line to match the latest signed-drawing values — leaves product names, properties and data-sheet attachments untouched."
            >
              <span aria-hidden>↻</span> Refresh thicknesses from drawings
            </button>
          )}
        </div>
      </div>

      <div className="flex items-end gap-2 pt-1 border-t border-gray-100">
        {isLining && (
          <RateField
            id={`rm-${spec.code}`}
            label="R / Rm"
            helper="Pipes ≥ 3 m"
            value={rmValue}
            onChange={(raw) => onRateChange("perRm", raw)}
          />
        )}
        {coatModeEntry ? (
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-0.5">
              R / m²
              <span className="ml-1 text-gray-400 normal-case font-normal">— sum of coats</span>
            </span>
            <div className="px-2 py-1 border border-gray-200 bg-gray-50 rounded text-sm font-mono text-right text-gray-700">
              R {coatRateSumLabel}
            </div>
          </div>
        ) : (
          <RateField
            id={`m2-${spec.code}`}
            label="R / m²"
            helper={isLining ? "Plate, fittings, pipes < 3 m" : "Coating area"}
            value={m2Value}
            onChange={(raw) => onRateChange("perM2", raw)}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Renders the short library status note shown below the upload row after
 * Gemini extraction + library registration. Surfaces whether the upload
 * matched an existing version, created a new one, or superseded the prior
 * latest so the quoter trusts that their upload landed somewhere useful.
 */
function formatLibraryNote(result: UploadProductDataSheetResult): string {
  const productLabel = `${result.manufacturer} ${result.productName}`.trim();
  const revLabel = result.publishedRevision ? ` ${result.publishedRevision}` : "";
  switch (result.outcome) {
    case "reused":
      return `Matched existing ${productLabel}${revLabel} in the library — nothing new uploaded.`;
    case "superseded":
      return result.supersededFromRevision
        ? `Saved as the new ${productLabel}${revLabel} — supersedes ${result.supersededFromRevision} in the library.`
        : `Saved as the new ${productLabel}${revLabel} — supersedes the previous version in the library.`;
    default:
      return `Saved ${productLabel}${revLabel} to the shared library (first version).`;
  }
}

interface SupplierRowProps {
  supplier: SupplierEntry;
  kind: SpecKind;
  isLining: boolean;
  isSelected: boolean;
  isDimmed: boolean;
  showSelectAffordance: boolean;
  /**
   * Hide the row's delete (×) button — used for drawing-faceted INT/EXT
   * coating rows where the user shouldn't be able to drop the contractual
   * face. Editing the description text is still permitted.
   */
  hideDelete: boolean;
  attachment: DataSheetAttachment | null;
  /** Full attachment map — coat-mode rows (#295) attach a data sheet per
   *  coat, each keyed by the coat's own id. */
  attachments: DataSheetAttachments;
  /**
   * The parent spec's one-liner summary (e.g. '6 mm bore, 3 mm flange,
   * hot-bonded, autoclave vulcanised, red'), extracted from the drawings /
   * spec docs by Nix. The bore + flange thicknesses are mined out of this
   * string and injected into the auto-filled supplier description so the
   * customer sees the product identity AND the application thickness in one
   * line. Null for manually-added specs with no resolved code.
   */
  specSummary: string | null;
  onChange: (partial: Partial<SupplierEntry>) => void;
  onDelete: () => void;
  onToggleSelect: () => void;
  onAttachmentChange: (attachment: DataSheetAttachment | null) => void;
  /** Attach / detach a data sheet by arbitrary id — used for per-coat
   *  sheets (#295), where the id is the coat's id rather than the row's. */
  onCoatAttachmentChange: (id: string, attachment: DataSheetAttachment | null) => void;
}

/**
 * Pulls thickness values out of a spec one-liner. Looks for the canonical
 * '<N> mm bore' and '<N> mm flange' patterns Nix produces. Returns a comma-
 * separated rendering ('6 mm bore, 3 mm flange') or null when neither is
 * present. Used to slot the application thickness from the drawings between
 * the product identity and the data-sheet properties on the auto-filled
 * supplier description.
 */
function extractThicknessesFromSpecSummary(summary: string | null): string | null {
  if (!summary) return null;
  const parts: string[] = [];
  const boreMatch = summary.match(/(\d+(?:\.\d+)?)\s*mm\s*bore/i);
  if (boreMatch) parts.push(`${boreMatch[1]} mm bore`);
  const flangeMatch = summary.match(/(\d+(?:\.\d+)?)\s*mm\s*flange/i);
  if (flangeMatch) parts.push(`${flangeMatch[1]} mm flange`);
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * Numeric-form of the spec summary's bore + flange thickness tokens. Used by
 * the "Refresh thicknesses from drawings" affordance to rewrite supplier
 * descriptions that were composed before drawings landed a newer value.
 * Returns null only when the summary itself is null/empty; otherwise returns
 * an object with whichever fields were present (each value may be null).
 */
function parseLiningSummaryThicknesses(
  summary: string | null,
): { boreMm: number | null; flangeMm: number | null } | null {
  if (!summary) return null;
  const boreMatch = summary.match(/(\d+(?:\.\d+)?)\s*mm\s*bore/i);
  const flangeMatch = summary.match(/(\d+(?:\.\d+)?)\s*mm\s*flange/i);
  const boreMm = boreMatch ? Number.parseFloat(boreMatch[1]) : null;
  const flangeMm = flangeMatch ? Number.parseFloat(flangeMatch[1]) : null;
  if (boreMm === null && flangeMm === null) return null;
  return {
    boreMm: boreMm !== null && Number.isFinite(boreMm) ? boreMm : null,
    flangeMm: flangeMm !== null && Number.isFinite(flangeMm) ? flangeMm : null,
  };
}

/**
 * In-place rewrite of bore / flange thickness tokens within a supplier-line
 * description. Replaces every "X mm bore" with the latest bore value and
 * every "Y mm flange" / "Y mm flange face" with the latest flange-face value.
 * Untouched if the description has no thickness tokens — we don't insert
 * tokens that weren't already there, because the original description format
 * was the quoter's call (some lines list thicknesses, some don't).
 */
function rewriteLiningThicknessTokens(
  description: string,
  thicknesses: { boreMm: number | null; flangeMm: number | null },
): string {
  let result = description;
  if (thicknesses.boreMm !== null) {
    result = result.replace(/\d+(?:\.\d+)?\s*mm\s*bore/gi, `${thicknesses.boreMm} mm bore`);
  }
  if (thicknesses.flangeMm !== null) {
    result = result.replace(
      /\d+(?:\.\d+)?\s*mm\s*flange(?:\s+face)?/gi,
      `${thicknesses.flangeMm} mm flange`,
    );
  }
  return result;
}

function SupplierRow(props: SupplierRowProps) {
  const {
    supplier,
    kind,
    isLining,
    isSelected,
    isDimmed,
    showSelectAffordance,
    hideDelete,
    attachment,
    attachments,
    specSummary,
    onChange,
    onDelete,
    onToggleSelect,
    onAttachmentChange,
    onCoatAttachmentChange,
  } = props;
  const isCustom = supplier.isCustom;
  // #295 — coatings can be broken into per-coat rows (blast / primer /
  // intermediate(s) / final). `coats` undefined = plain single-description
  // mode; an array = coat mode (the description is derived from the coats).
  const coatModeOn = !isLining && supplier.coats !== undefined;
  const [autoFillState, setAutoFillState] = useState<
    "idle" | "extracting" | "applied" | "no-match" | "error"
  >("idle");
  const [libraryNote, setLibraryNote] = useState<string | null>(null);
  const [uploadingFilename, setUploadingFilename] = useState<string | null>(null);
  // Server / network error from the most recent auto-fill upload. We surface
  // this verbatim in the amber banner so the quoter sees what Gemini actually
  // returned (e.g. "manufacturer='Weir Minerals', productName=(blank)")
  // instead of the generic "Auto-fill failed" caption.
  const [autoFillErrorDetail, setAutoFillErrorDetail] = useState<string | null>(null);

  /**
   * Triggered when the quoter picks a file in DataSheetUpload. The file goes
   * straight to the shared product-data-sheet library:
   *
   *   1. Gemini extracts manufacturer + product + revision + brand +
   *      description in one pass.
   *   2. The library either creates a new row, matches an existing version
   *      (same printed revision), or supersedes the prior current revision.
   *   3. The serialisable attachment {dataSheetId, filename, sizeBytes, …}
   *      is recorded on the supplier row so a page reload restores the link.
   *   4. The brand + description are auto-filled into the supplier row's
   *      empty fields — the quoter's typed override always wins.
   *
   * The library outcome shows as a short note below the row ('matched
   * existing Linard 60 Rev 03' / 'supersedes Rev 03') and clears after 6 s.
   */
  const handleFilePicked = async (file: File) => {
    setUploadingFilename(file.name);
    setAutoFillState("extracting");
    setLibraryNote(null);
    setAutoFillErrorDetail(null);
    try {
      const result = await uploadProductDataSheet(file, kind);
      const supplierBrand = supplier.brand;
      const supplierDescription = supplier.description;
      const brandIsEmpty = !supplierBrand || supplierBrand.trim().length === 0;
      const descriptionIsEmpty = !supplierDescription || supplierDescription.trim().length === 0;
      const partial: Partial<SupplierEntry> = {};
      if (brandIsEmpty && result.brand) partial.brand = result.brand;
      if (descriptionIsEmpty) {
        if (isLining) {
          // Linings have only a description field (no separate brand column),
          // so the quoter needs the product identity AND the application
          // thicknesses inline. Compose: '<Manufacturer> <ProductName>,
          // <bore + flange from drawings>, <data-sheet properties>'.
          const productLabel = `${result.manufacturer} ${result.productName}`.trim();
          const thicknesses = extractThicknessesFromSpecSummary(specSummary);
          const composedDescription = [
            productLabel || null,
            thicknesses,
            result.description ? result.description.trim() : null,
          ]
            .filter((piece): piece is string => Boolean(piece && piece.length > 0))
            .join(", ");
          if (composedDescription.length > 0) {
            partial.description = composedDescription;
          }
        } else if (result.description) {
          // Coatings already carry the manufacturer in the brand field, so
          // the description is just the data-sheet line '<Product> @ <DFT>'
          // (e.g. 'Plasite 4550-S @ 600-800μm') as Gemini returns it.
          partial.description = result.description;
        }
      }
      onAttachmentChange({
        specCode: "",
        entryId: supplier.id,
        dataSheetId: result.dataSheetId,
        filename: file.name,
        sizeBytes: file.size,
        manufacturer: result.manufacturer,
        productName: result.productName,
        publishedRevision: result.publishedRevision,
      });
      if (keys(partial).length > 0) {
        onChange(partial);
        setAutoFillState("applied");
      } else {
        setAutoFillState("no-match");
      }
      setLibraryNote(formatLibraryNote(result));
      setTimeout(() => {
        setAutoFillState("idle");
        setLibraryNote(null);
      }, 6000);
    } catch (err) {
      setAutoFillState("error");
      setLibraryNote(null);
      const rawMessage = err instanceof Error ? err.message : String(err);
      // uploadProductDataSheet wraps the body message as
      //   "Failed to upload data sheet: <status> — <backend message>"
      // Surface the backend half (which now includes what Gemini saw) and
      // drop the generic wrapper.
      const afterEmDash = rawMessage.split(" — ");
      const backendPart = afterEmDash.length > 1 ? afterEmDash.slice(1).join(" — ").trim() : "";
      const cleaned = backendPart.length > 0 ? backendPart : rawMessage.trim();
      setAutoFillErrorDetail(cleaned.length > 0 ? cleaned : null);
      // The error banner stays visible until the next upload attempt so the
      // quoter has time to read what Gemini saw.
    } finally {
      setUploadingFilename(null);
    }
  };

  const handleRemoveAttachment = () => {
    onAttachmentChange(null);
    setAutoFillState("idle");
    setLibraryNote(null);
    setAutoFillErrorDetail(null);
  };

  /**
   * Flips the entry between plain mode (single description + rate) and
   * per-coat mode (#295). Leaving coat mode drops any per-coat data sheets
   * so they don't linger as orphans in the attachment map.
   */
  const handleToggleCoatMode = (on: boolean) => {
    if (on) {
      onChange({ coats: defaultCoatBreakdown() });
      return;
    }
    if (supplier.coats) {
      for (const coat of supplier.coats) onCoatAttachmentChange(coat.id, null);
    }
    onChange({ coats: undefined });
  };

  /**
   * Triggered when the quoter attaches an existing sheet from the library
   * search instead of uploading a fresh PDF. No Gemini round-trip happens —
   * the library row already carries manufacturer + product, so the empty
   * brand/description fields are filled straight from those (the quoter's
   * own typed text always wins). The bytes already live on S3.
   */
  const handleLibraryPick = (hit: ProductDataSheetSearchHit) => {
    const supplierBrand = supplier.brand;
    const supplierDescription = supplier.description;
    const brandIsEmpty = !supplierBrand || supplierBrand.trim().length === 0;
    const descriptionIsEmpty = !supplierDescription || supplierDescription.trim().length === 0;
    const productLabel = `${hit.manufacturer} ${hit.productName}`.trim();
    const partial: Partial<SupplierEntry> = {};
    if (!isLining && brandIsEmpty && hit.manufacturer.trim().length > 0) {
      partial.brand = hit.manufacturer.trim();
    }
    if (descriptionIsEmpty) {
      if (isLining) {
        const thicknesses = extractThicknessesFromSpecSummary(specSummary);
        const composedDescription = [productLabel || null, thicknesses]
          .filter((piece): piece is string => Boolean(piece && piece.length > 0))
          .join(", ");
        if (composedDescription.length > 0) partial.description = composedDescription;
      } else if (hit.productName.trim().length > 0) {
        partial.description = hit.productName.trim();
      }
    }
    onAttachmentChange({
      specCode: "",
      entryId: supplier.id,
      dataSheetId: hit.id,
      filename: hit.originalFilename,
      sizeBytes: hit.sizeBytes,
      manufacturer: hit.manufacturer,
      productName: hit.productName,
      publishedRevision: hit.publishedRevision,
    });
    if (keys(partial).length > 0) {
      onChange(partial);
      setAutoFillState("applied");
    } else {
      setAutoFillState("idle");
    }
    setAutoFillErrorDetail(null);
    const revisionSuffix = hit.publishedRevision ? ` ${hit.publishedRevision}` : "";
    setLibraryNote(`attached ${productLabel}${revisionSuffix} from the library`);
    setTimeout(() => {
      setAutoFillState("idle");
      setLibraryNote(null);
    }, 6000);
  };

  let containerToneClass: string;
  if (isSelected) {
    containerToneClass =
      "border-emerald-500 border-2 bg-emerald-100/80 ring-2 ring-emerald-300 shadow-sm";
  } else if (isCustom) {
    containerToneClass = "border-amber-300 bg-amber-50/40";
  } else {
    containerToneClass = "border-gray-200 bg-gray-50/40";
  }
  const dimClass = isDimmed ? "opacity-50 grayscale-[20%]" : "";

  return (
    <div
      className={`rounded border p-2 transition-colors relative ${containerToneClass} ${dimClass}`}
    >
      {isSelected && (
        <div
          aria-hidden
          className="absolute -top-2 left-3 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-sm"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
          Using on quote
        </div>
      )}
      <div className="flex items-start gap-2">
        {!isLining && (
          <div className="flex flex-col items-stretch gap-1">
            <input
              type="text"
              value={supplier.brand}
              onChange={(event) => onChange({ brand: event.target.value })}
              placeholder="Supplier (e.g. Stoncor)"
              className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#323288]/30"
            />
            {showSelectAffordance && (
              <button
                type="button"
                onClick={onToggleSelect}
                aria-pressed={isSelected}
                title={
                  isSelected
                    ? "Selected for this quote — click to clear and quote all alternatives"
                    : "Use this supplier on the quote"
                }
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border transition-colors ${
                  isSelected
                    ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                    : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                }`}
              >
                {isSelected ? (
                  <span className="inline-flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Selected
                  </span>
                ) : (
                  "Use this"
                )}
              </button>
            )}
          </div>
        )}
        {coatModeOn ? (
          <div className="flex-1 min-w-0 px-2 py-1 text-xs text-gray-400 italic">
            Itemised into coats below.
          </div>
        ) : (
          <textarea
            value={supplier.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder={
              isLining
                ? "Product description (e.g. 6 mm bore, 3 mm flange, hot-bonded, autoclave vulcanised, red)"
                : "Products + DFTs (e.g. Carboguard 890 @ 100-150μm, Carbothane 137 HS @ 50-100μm)"
            }
            rows={2}
            className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#323288]/30 resize-y"
          />
        )}
        {!hideDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-gray-400 hover:text-red-600 text-sm leading-none px-1.5 py-1"
            aria-label="Delete entry"
            title="Delete entry"
          >
            ×
          </button>
        )}
      </div>
      {!isLining && (
        <label className="mt-2 inline-flex w-fit items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={coatModeOn}
            onChange={(event) => handleToggleCoatMode(event.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-300 text-[#323288] focus:ring-[#323288]/30"
          />
          Break into coats — price blast prep, primer, intermediate &amp; final separately
        </label>
      )}
      {coatModeOn && supplier.coats && (
        <CoatBreakdownEditor
          coats={supplier.coats}
          attachments={attachments}
          onCoatsChange={(coats) => onChange({ coats })}
          onCoatAttachmentChange={onCoatAttachmentChange}
        />
      )}
      {isCustom && !coatModeOn && (
        <div className="mt-2 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-amber-800"
              title="A data sheet must accompany this quote"
            >
              <span className="bg-amber-200/60 px-1.5 py-0.5 rounded">Custom</span>
              <span className="font-normal normal-case text-amber-900/80">
                {autoFillState === "extracting"
                  ? "Reading data sheet…"
                  : autoFillState === "applied"
                    ? "✓ Auto-filled from data sheet — review and edit if needed"
                    : autoFillState === "no-match"
                      ? "Couldn't read product details — please type them in"
                      : autoFillState === "error"
                        ? (autoFillErrorDetail ??
                          "Auto-fill failed — please type the product details in")
                        : "data sheet must accompany the quote"}
              </span>
            </span>
            <DataSheetUpload
              entryId={supplier.id}
              kind={kind}
              attachment={attachment}
              uploadingFilename={uploadingFilename}
              uploadingSizeBytes={null}
              isExtracting={autoFillState === "extracting"}
              onFilePicked={handleFilePicked}
              onPickFromLibrary={handleLibraryPick}
              onRemove={handleRemoveAttachment}
            />
          </div>
          {libraryNote && (
            <span className="text-[11px] text-emerald-800/80 italic">📚 {libraryNote}</span>
          )}
        </div>
      )}
    </div>
  );
}

interface DataSheetUploadProps {
  entryId: string;
  kind: SpecKind;
  attachment: DataSheetAttachment | null;
  /** Filename being uploaded to the library (transient — clears once the
   *  library write returns and the saved attachment takes over). */
  uploadingFilename: string | null;
  uploadingSizeBytes: number | null;
  isExtracting: boolean;
  onFilePicked: (file: File) => void;
  onPickFromLibrary: (hit: ProductDataSheetSearchHit) => void;
  onRemove: () => void;
}

function DataSheetUpload(props: DataSheetUploadProps) {
  const { entryId, kind, attachment, uploadingFilename, uploadingSizeBytes, isExtracting } = props;
  const inputId = `data-sheet-${entryId}`;

  const displayFilename = attachment ? attachment.filename : uploadingFilename;
  const displaySize = attachment ? attachment.sizeBytes : uploadingSizeBytes;

  if (displayFilename !== null) {
    const sizeKb = displaySize !== null ? displaySize / 1024 : 0;
    const sizeLabel =
      displaySize === null
        ? ""
        : sizeKb >= 1024
          ? `${(sizeKb / 1024).toFixed(1)} MB`
          : `${sizeKb.toFixed(0)} KB`;
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-100 border border-emerald-300 rounded text-xs text-emerald-900">
        {isExtracting ? (
          <svg
            className="w-3.5 h-3.5 text-emerald-700 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" strokeWidth={3} className="opacity-25" />
            <path
              d="M22 12a10 10 0 00-10-10"
              strokeWidth={3}
              strokeLinecap="round"
              className="opacity-75"
            />
          </svg>
        ) : (
          <svg
            className="w-3.5 h-3.5 text-emerald-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        )}
        <span className="font-medium truncate max-w-[14rem]" title={displayFilename}>
          {displayFilename}
        </span>
        {sizeLabel.length > 0 && <span className="text-emerald-700/70">({sizeLabel})</span>}
        <button
          type="button"
          onClick={() => props.onRemove()}
          disabled={isExtracting}
          className="ml-1 text-emerald-700 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Remove data sheet"
          title="Remove data sheet"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <label
        htmlFor={inputId}
        className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-amber-400 text-amber-800 rounded text-xs font-medium cursor-pointer hover:bg-amber-50"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        Upload data sheet
        <input
          id={inputId}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.docx"
          onChange={(event) => {
            const file = event.target.files ? event.target.files[0] : null;
            if (!file) return;
            props.onFilePicked(file);
            event.target.value = "";
          }}
          className="hidden"
        />
      </label>
      <DataSheetLibraryPicker kind={kind} onPick={props.onPickFromLibrary} />
    </div>
  );
}

/**
 * Inline search of the shared product-data-sheet library. Lets the quoter
 * attach a Stoncor (or any) sheet that already lives in the repo with one
 * click — no re-upload, no Gemini round-trip — instead of hunting down the
 * original PDF. Results are filtered to the row's kind (coating vs lining)
 * so a coating row never offers a rubber-lining sheet.
 */
function DataSheetLibraryPicker(props: {
  kind: SpecKind;
  onPick: (hit: ProductDataSheetSearchHit) => void;
}) {
  const { kind, onPick } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ProductDataSheetSearchHit[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "error">("idle");
  // Bumped on every keystroke so a slow earlier request can't overwrite the
  // results of a later one (last-write-wins by sequence number).
  const seqRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setStatus("idle");
      return;
    }
    const seq = seqRef.current + 1;
    seqRef.current = seq;
    setStatus("searching");
    const timer = setTimeout(() => {
      searchProductDataSheets(trimmed)
        .then((rows) => {
          if (seqRef.current !== seq) return;
          setHits(rows.filter((r) => r.kind === kind));
          setStatus("idle");
        })
        .catch(() => {
          if (seqRef.current !== seq) return;
          setHits([]);
          setStatus("error");
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, kind]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-[#323288]/40 text-[#323288] rounded text-xs font-medium cursor-pointer hover:bg-[#323288]/5"
        title="Attach a data sheet that is already in the library"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
          />
        </svg>
        Find in library
      </button>
    );
  }

  return (
    <div className="relative inline-block">
      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-[#323288]/40 rounded">
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search library…"
          className="w-44 px-1 py-0.5 text-xs border-0 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setQuery("");
            setHits([]);
          }}
          className="text-gray-400 hover:text-red-600 text-sm leading-none px-1"
          aria-label="Close library search"
          title="Close"
        >
          ×
        </button>
      </div>
      {query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 left-0 w-72 max-h-60 overflow-auto bg-white border border-gray-300 rounded shadow-lg text-xs">
          {status === "searching" && <div className="px-2 py-1.5 text-gray-500">Searching…</div>}
          {status === "error" && (
            <div className="px-2 py-1.5 text-red-600">Search failed — try again.</div>
          )}
          {status === "idle" && hits.length === 0 && (
            <div className="px-2 py-1.5 text-gray-500">
              No {kind} sheets match — upload a new one.
            </div>
          )}
          {hits.map((hit) => (
            <button
              key={hit.id}
              type="button"
              onClick={() => {
                onPick(hit);
                setOpen(false);
                setQuery("");
                setHits([]);
              }}
              className="block w-full text-left px-2 py-1.5 hover:bg-[#323288]/5 border-b border-gray-100 last:border-b-0"
            >
              <span className="font-medium text-gray-800">
                {hit.manufacturer} {hit.productName}
              </span>
              {hit.publishedRevision && (
                <span className="ml-1 text-gray-500">({hit.publishedRevision})</span>
              )}
              <span className="block text-gray-400 truncate">{hit.originalFilename}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Per-coat editor for a coating entry (#295). Renders the fixed blast /
 * primer / final coats — each with an "applies" tick-box — plus any
 * intermediate coats, with an "Add intermediate coat" button. Blast prep
 * carries only a rate (it's surface prep, no product); the product coats
 * carry a product name, DFT and their own data sheet. The summed rate of
 * the applied coats becomes the coating's R/m² (SpecCard syncs it onto
 * the persisted SpecRate so the cost pipeline is unaffected).
 */
function CoatBreakdownEditor(props: {
  coats: CoatEntry[];
  attachments: DataSheetAttachments;
  onCoatsChange: (coats: CoatEntry[]) => void;
  onCoatAttachmentChange: (coatId: string, attachment: DataSheetAttachment | null) => void;
}) {
  const { coats, attachments, onCoatsChange, onCoatAttachmentChange } = props;
  const [uploading, setUploading] = useState<{ coatId: string; filename: string } | null>(null);

  const updateCoat = (coatId: string, partial: Partial<CoatEntry>) => {
    onCoatsChange(coats.map((coat) => (coat.id === coatId ? { ...coat, ...partial } : coat)));
  };
  const removeCoat = (coatId: string) => {
    onCoatsChange(coats.filter((coat) => coat.id !== coatId));
    onCoatAttachmentChange(coatId, null);
  };
  const addIntermediate = () => {
    onCoatsChange([...coats, newIntermediateCoat()]);
  };

  // After a data sheet attaches, fill the coat's product name from it —
  // but only when blank, so a quoter's own wording is never overwritten.
  const autoFillProduct = (coatId: string, manufacturer: string, productName: string) => {
    const coat = coats.find((c) => c.id === coatId);
    if (!coat || coat.product.trim().length > 0) return;
    const label = `${manufacturer} ${productName}`.trim();
    if (label.length > 0) updateCoat(coatId, { product: label });
  };

  const handleFilePicked = async (coatId: string, file: File) => {
    setUploading({ coatId, filename: file.name });
    try {
      const result = await uploadProductDataSheet(file, "coating");
      onCoatAttachmentChange(coatId, {
        specCode: "",
        entryId: coatId,
        dataSheetId: result.dataSheetId,
        filename: file.name,
        sizeBytes: file.size,
        manufacturer: result.manufacturer,
        productName: result.productName,
        publishedRevision: result.publishedRevision,
      });
      autoFillProduct(coatId, result.manufacturer, result.productName);
    } catch {
      // The chip just won't appear — the quoter can retry or type the
      // product in by hand. The entry-level path surfaces detailed Gemini
      // errors; per-coat we keep it quiet to avoid banner clutter.
    } finally {
      setUploading(null);
    }
  };

  const handleLibraryPick = (coatId: string, hit: ProductDataSheetSearchHit) => {
    onCoatAttachmentChange(coatId, {
      specCode: "",
      entryId: coatId,
      dataSheetId: hit.id,
      filename: hit.originalFilename,
      sizeBytes: hit.sizeBytes,
      manufacturer: hit.manufacturer,
      productName: hit.productName,
      publishedRevision: hit.publishedRevision,
    });
    autoFillProduct(coatId, hit.manufacturer, hit.productName);
  };

  const ordered = orderedCoats(coats);
  const intermediateCount = ordered.filter((coat) => coat.type === "intermediate").length;
  let intermediateSeen = 0;
  const total = sumCoatRates(coats);

  return (
    <div className="mt-2 flex flex-col gap-1.5 rounded-md border border-orange-200 bg-orange-50/40 p-2">
      {ordered.map((coat) => {
        if (coat.type === "intermediate") intermediateSeen += 1;
        const label = coatLabel(coat, intermediateSeen, intermediateCount);
        const isBlast = coat.type === "blast";
        const isIntermediate = coat.type === "intermediate";
        const rateText = coat.ratePerM2 > 0 ? String(coat.ratePerM2) : "";
        const coatAttachment = attachments[coat.id] ? attachments[coat.id] : null;
        return (
          <div
            key={coat.id}
            className={`flex flex-wrap items-center gap-2 rounded border bg-white px-2 py-1.5 ${
              coat.applies ? "border-gray-200" : "border-gray-100 opacity-60"
            }`}
          >
            {isIntermediate ? (
              <span className="w-28 text-[11px] font-semibold text-gray-700">{label}</span>
            ) : (
              <label className="inline-flex w-28 cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={coat.applies}
                  onChange={(event) => updateCoat(coat.id, { applies: event.target.checked })}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-[#323288] focus:ring-[#323288]/30"
                />
                {label}
              </label>
            )}
            {isBlast ? (
              <span className="min-w-[8rem] flex-1 text-[11px] text-gray-400 italic">
                Surface prep — abrasive blast, no product
              </span>
            ) : (
              <>
                <input
                  type="text"
                  value={coat.product}
                  onChange={(event) => updateCoat(coat.id, { product: event.target.value })}
                  placeholder="Product (e.g. Carbozinc 880)"
                  disabled={!coat.applies}
                  className="min-w-[8rem] flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#323288]/30 disabled:bg-gray-50"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={coat.dftMicrons}
                    onChange={(event) => updateCoat(coat.id, { dftMicrons: event.target.value })}
                    placeholder="DFT"
                    disabled={!coat.applies}
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-right text-xs focus:outline-none focus:ring-2 focus:ring-[#323288]/30 disabled:bg-gray-50"
                  />
                  <span className="text-[11px] text-gray-400">µm</span>
                </div>
              </>
            )}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-gray-500">R</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                value={rateText}
                onChange={(event) =>
                  updateCoat(coat.id, { ratePerM2: sanitiseRate(Number(event.target.value)) })
                }
                placeholder="0.00"
                disabled={!coat.applies}
                className="w-20 rounded border border-gray-300 px-2 py-1 text-right font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#323288]/30 disabled:bg-gray-50"
              />
              <span className="text-[10px] text-gray-400">/m²</span>
            </div>
            {!isBlast && coat.applies && (
              <DataSheetUpload
                entryId={coat.id}
                kind="coating"
                attachment={coatAttachment}
                uploadingFilename={
                  uploading && uploading.coatId === coat.id ? uploading.filename : null
                }
                uploadingSizeBytes={null}
                isExtracting={uploading !== null && uploading.coatId === coat.id}
                onFilePicked={(file) => handleFilePicked(coat.id, file)}
                onPickFromLibrary={(hit) => handleLibraryPick(coat.id, hit)}
                onRemove={() => onCoatAttachmentChange(coat.id, null)}
              />
            )}
            {isIntermediate && (
              <button
                type="button"
                onClick={() => removeCoat(coat.id)}
                className="px-1 text-sm leading-none text-gray-400 hover:text-red-600"
                aria-label={`Remove ${label}`}
                title={`Remove ${label}`}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <button
          type="button"
          onClick={addIntermediate}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#323288] hover:underline"
        >
          <span aria-hidden>+</span> Add intermediate coat
        </button>
        <span className="text-[11px] font-semibold text-gray-700">
          Total R {total.toFixed(2)} /m²
        </span>
      </div>
    </div>
  );
}

interface RateFieldProps {
  id: string;
  label: string;
  helper: string;
  value: string;
  onChange: (raw: string) => void;
}

function RateField(props: RateFieldProps) {
  const { id, label, helper, value, onChange } = props;
  return (
    <div className="flex-1 min-w-0">
      <label
        htmlFor={id}
        className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-0.5"
      >
        {label}
        <span className="ml-1 text-gray-400 normal-case font-normal">— {helper}</span>
      </label>
      <div className="flex items-center">
        <span className="text-gray-500 text-sm pr-1">R</span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={1}
          placeholder="0.00"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full min-w-0 px-2 py-1 border border-gray-300 rounded text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-[#323288]/30"
        />
      </div>
    </div>
  );
}
