"use client";

import { keys } from "es-toolkit/compat";
import { useState } from "react";
import { type UploadProductDataSheetResult, uploadProductDataSheet } from "@/app/lib/query/hooks";
import {
  countMissingDataSheets,
  type DataSheetAttachment,
  type DataSheetAttachments,
  effectiveSuppliers,
  newCustomEntry,
  type SpecKind,
  type SpecListing,
  type SpecOverrides,
  type SpecRate,
  type SpecRates,
  type SupplierEntry,
  selectedSupplierId,
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
  onRatesChange: (next: SpecRates) => void;
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
                handleRateChange(rates, onRatesChange, spec.code, field, value)
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

function handleRateChange(
  rates: SpecRates,
  onChange: (next: SpecRates) => void,
  code: string,
  field: "perM2" | "perRm",
  raw: string,
): void {
  const existing = rates[code] ? rates[code] : { perM2: 0, perRm: 0 };
  const parsed = raw === "" ? 0 : Number(raw);
  const safe = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  const nextEntry: SpecRate = {
    perM2: field === "perM2" ? safe : existing.perM2,
    perRm: field === "perRm" ? safe : existing.perRm,
  };
  const next = { ...rates };
  if (nextEntry.perM2 === 0 && nextEntry.perRm === 0) {
    delete next[code];
  } else {
    next[code] = nextEntry;
  }
  onChange(next);
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

  const m2Value = rate && rate.perM2 > 0 ? String(rate.perM2) : "";
  const rmValue = rate && rate.perRm > 0 ? String(rate.perRm) : "";

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
        {!isLining && suppliers.length > 1 && (
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
            const isSelected = selectedId === supplier.id;
            const isDimmed = !isLining && selectedId !== null && !isSelected;
            return (
              <SupplierRow
                key={supplier.id}
                supplier={supplier}
                kind={spec.kind}
                isLining={isLining}
                isSelected={isSelected}
                isDimmed={isDimmed}
                showSelectAffordance={!isLining}
                attachment={attachments[supplier.id] ? attachments[supplier.id] : null}
                onChange={(partial) => updateSupplier(supplier.id, partial)}
                onDelete={() => deleteSupplier(supplier.id)}
                onToggleSelect={() => onSelectSupplier(isSelected ? null : supplier.id)}
                onAttachmentChange={(attachment) => onAttachmentChange(supplier.id, attachment)}
              />
            );
          })
        )}
        <button
          type="button"
          onClick={addSupplier}
          className="inline-flex items-center gap-1 text-xs text-[#323288] font-medium hover:underline"
        >
          <span aria-hidden>+</span> Add {isLining ? "product" : "alternative"}
        </button>
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
        <RateField
          id={`m2-${spec.code}`}
          label="R / m²"
          helper={isLining ? "Plate, fittings, pipes < 3 m" : "Coating area"}
          value={m2Value}
          onChange={(raw) => onRateChange("perM2", raw)}
        />
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
    case "new":
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
  attachment: DataSheetAttachment | null;
  onChange: (partial: Partial<SupplierEntry>) => void;
  onDelete: () => void;
  onToggleSelect: () => void;
  onAttachmentChange: (attachment: DataSheetAttachment | null) => void;
}

function SupplierRow(props: SupplierRowProps) {
  const {
    supplier,
    kind,
    isLining,
    isSelected,
    isDimmed,
    showSelectAffordance,
    attachment,
    onChange,
    onDelete,
    onToggleSelect,
    onAttachmentChange,
  } = props;
  const isCustom = supplier.isCustom;
  const [autoFillState, setAutoFillState] = useState<
    "idle" | "extracting" | "applied" | "no-match" | "error"
  >("idle");
  const [libraryNote, setLibraryNote] = useState<string | null>(null);

  /**
   * When the user uploads a data sheet on a custom supplier row, the file is
   * sent to the shared product data sheet library:
   *
   *   1. Gemini extracts manufacturer + product + revision + brand +
   *      description in one pass.
   *   2. The library either creates a new row, matches an existing version
   *      (same printed revision), or supersedes the prior current revision.
   *   3. The brand + description come back for auto-filling THIS quote's
   *      supplier row — but only into empty fields, so the quoter's typed
   *      override always wins.
   *
   * The library outcome is shown as a short note below the row ('matched
   * existing Linard 60 Rev 03' / 'supersedes Rev 03') and clears after 6s
   * so the row stays calm.
   */
  const handleAttachmentChange = async (next: DataSheetAttachment | null) => {
    onAttachmentChange(next);
    if (!next) {
      setAutoFillState("idle");
      setLibraryNote(null);
      return;
    }
    setAutoFillState("extracting");
    setLibraryNote(null);
    try {
      const result = await uploadProductDataSheet(next.file, kind);
      const supplierBrand = supplier.brand;
      const supplierDescription = supplier.description;
      const brandIsEmpty = !supplierBrand || supplierBrand.trim().length === 0;
      const descriptionIsEmpty = !supplierDescription || supplierDescription.trim().length === 0;
      const partial: Partial<SupplierEntry> = {};
      if (brandIsEmpty && result.brand) partial.brand = result.brand;
      if (descriptionIsEmpty && result.description) partial.description = result.description;
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
    } catch {
      setAutoFillState("error");
      setLibraryNote(null);
      setTimeout(() => setAutoFillState("idle"), 4000);
    }
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
        <textarea
          value={supplier.description}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder={
            isLining
              ? "Product description (e.g. 6 mm bore, 3 mm flange, hot-bonded, autoclave vulcanised, red)"
              : "Products + DFTs (e.g. Carboguard 890 @ 100-150μm, Carbothane 137 HS @ 50-100μm)"
          }
          rows={isLining ? 2 : 2}
          className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#323288]/30 resize-y"
        />
        <button
          type="button"
          onClick={onDelete}
          className="text-gray-400 hover:text-red-600 text-sm leading-none px-1.5 py-1"
          aria-label="Delete entry"
          title="Delete entry"
        >
          ×
        </button>
      </div>
      {isCustom && (
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
                        ? "Auto-fill failed — please type the product details in"
                        : "data sheet must accompany the quote"}
              </span>
            </span>
            <DataSheetUpload
              entryId={supplier.id}
              attachment={attachment}
              isExtracting={autoFillState === "extracting"}
              onChange={handleAttachmentChange}
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
  attachment: DataSheetAttachment | null;
  isExtracting: boolean;
  onChange: (attachment: DataSheetAttachment | null) => void;
}

function DataSheetUpload(props: DataSheetUploadProps) {
  const { entryId, attachment, isExtracting, onChange } = props;
  const inputId = `data-sheet-${entryId}`;

  if (attachment) {
    const sizeKb = attachment.size / 1024;
    const sizeLabel =
      sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb.toFixed(0)} KB`;
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
        <span className="font-medium truncate max-w-[14rem]" title={attachment.filename}>
          {attachment.filename}
        </span>
        <span className="text-emerald-700/70">({sizeLabel})</span>
        <button
          type="button"
          onClick={() => onChange(null)}
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
          onChange({
            specCode: "",
            entryId,
            file,
            filename: file.name,
            size: file.size,
          });
          event.target.value = "";
        }}
        className="hidden"
      />
    </label>
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
