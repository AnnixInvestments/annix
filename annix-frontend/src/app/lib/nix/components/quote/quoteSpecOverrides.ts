import type { ResolvedCode } from "@/app/lib/nix/components/draft";

/**
 * One supplier-and-product entry inside a coating spec, OR the single
 * product entry for a lining spec.
 *
 * Coatings are multi-supplier (e.g. R1 = Stoncor + Corrocoat side by side as
 * alternatives the customer can choose between). The quoter keeps only the
 * suppliers they actually intend to supply, deletes the others, and may add
 * a custom alternative — every change flips `isCustom = true` so the system
 * can require a data sheet to accompany the quote.
 *
 * Linings are typically a single product with no separate supplier line (the
 * brand IS the product — "Linatex Linard 60") so for lining specs there's a
 * single SupplierEntry with `brand=""` and `description` carrying the
 * compound description.
 */
export interface SupplierEntry {
  id: string;
  brand: string;
  description: string;
  isCustom: boolean;
}

export type SpecKind = "coating" | "lining";

/**
 * The user's override of an extracted spec (or the entire content of a
 * manually-added spec). When an override exists for a spec code, it is
 * authoritative — the original `productDescriptors` from the extraction is
 * ignored. Until the user touches a spec, no override exists and the parsed
 * default suppliers are computed on-demand.
 *
 * `selectedSupplierId` is the id of the supplier the quoter has chosen
 * to use in the customer-facing quote. When set, the section footer shows
 * only that supplier; the others remain in the editor as alternatives but
 * don't reach the customer. When null/undefined, every supplier appears in
 * the footer (the unselected default — useful while still negotiating
 * which alternative to use).
 */
export interface SpecOverride {
  suppliers: SupplierEntry[];
  selectedSupplierId?: string | null;
}

export type SpecOverrides = Record<string, SpecOverride>;

/**
 * Reference to a data sheet uploaded by the quoter and registered in the
 * shared product-data-sheet library. The actual PDF bytes live on S3 (via
 * the library); this attachment is only the link from THIS quote's supplier
 * row to that library entry, so the bundle is fully serialisable and can be
 * persisted on the Nix session for restore-after-refresh.
 *
 * `dataSheetId` is the library row id — use it to fetch a presigned view URL
 * via `GET /nix/product-data-sheets/:id/url`. The other fields are cached
 * here so the row's UI ('AU Premium 60 Shore Red.pdf (255 KB)') renders
 * without an extra round-trip on every page load.
 */
export interface DataSheetAttachment {
  specCode: string;
  entryId: string;
  dataSheetId: number;
  filename: string;
  sizeBytes: number;
  manufacturer: string;
  productName: string;
  publishedRevision: string | null;
}

export type DataSheetAttachments = Record<string, DataSheetAttachment>;

/**
 * Listing of a spec used in the quote — extracted from a session pool, OR
 * manually added via the editor's '+ Add spec' button. Drives the cards
 * rendered in QuoteSpecsEditor.
 */
export interface SpecListing {
  code: string;
  kind: SpecKind;
  resolved: ResolvedCode | null;
  /**
   * True when this spec was added manually by the user (no underlying
   * extraction). Manually-added specs can be deleted from the editor;
   * extracted specs cannot.
   */
  isManuallyAdded: boolean;
}

let entryCounter = 0;
function nextEntryId(): string {
  entryCounter += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `entry-${entryCounter}-${random}`;
}

/**
 * Splits the joined `productDescriptors` string from a coating spec into
 * per-supplier rows. Format produced by `extractProductDescriptors` in the
 * draft module is `"Stoncor: ... • Corrocoat: ..."` so the splitter is
 * deterministic. Falls back to a single bracketed entry when no `•` or `:`
 * is found, so the user can still see and edit the raw text.
 */
export function parseSuppliersFromCoating(productDescriptors: string | null): SupplierEntry[] {
  if (!productDescriptors) return [];
  const trimmed = productDescriptors.trim();
  if (trimmed.length === 0) return [];

  return trimmed.split("•").map((part) => {
    const partTrimmed = part.trim();
    const colonIdx = partTrimmed.indexOf(":");
    if (colonIdx === -1) {
      return {
        id: nextEntryId(),
        brand: "",
        description: partTrimmed,
        isCustom: false,
      };
    }
    return {
      id: nextEntryId(),
      brand: partTrimmed.slice(0, colonIdx).trim(),
      description: partTrimmed.slice(colonIdx + 1).trim(),
      isCustom: false,
    };
  });
}

/**
 * Lining specs use the resolved `summary` as the canonical product
 * description ('6 mm bore, 3 mm flange, hot-bonded, autoclave vulcanised,
 * red'). Returns a single supplier entry with no brand label so the editor
 * renders a single textarea rather than a multi-supplier list.
 */
export function parseLiningDescription(summary: string | null): SupplierEntry[] {
  if (!summary) return [];
  const trimmed = summary.trim();
  if (trimmed.length === 0) return [];
  return [
    {
      id: nextEntryId(),
      brand: "",
      description: trimmed,
      isCustom: false,
    },
  ];
}

/**
 * Default supplier list parsed from the resolved spec for the given kind.
 * Used as the initial value when the user first opens an override on a spec
 * that doesn't have one yet.
 *
 * IDs are made deterministic per spec (`default-{specCode}-{index}`) rather
 * than using the random counter so that re-renders before the user has
 * touched the spec produce STABLE supplier ids. Stable ids matter because
 * `selectedSupplierId` lives in the override and is matched back to a
 * supplier by id — non-deterministic ids would silently break selection
 * the moment any other state in the editor updated.
 */
export function defaultSuppliersForSpec(spec: SpecListing): SupplierEntry[] {
  const resolved = spec.resolved;
  if (!resolved) return [];
  const raw =
    spec.kind === "coating"
      ? parseSuppliersFromCoating(resolved.productDescriptors)
      : parseLiningDescription(resolved.summary ? resolved.summary : resolved.productDescriptors);
  return raw.map((entry, idx) => ({
    ...entry,
    id: `default-${spec.code}-${idx}`,
  }));
}

/**
 * Effective supplier list for a spec — override wins when present, otherwise
 * computed from the resolved extraction. Read-side helper used by both the
 * editor (to render rows) and the section footer (to rebuild the
 * 'All above items require:' line from the user's choices).
 *
 * Stale-shape guard: when the resolved code now exposes drawing-derived
 * INT/EXT productDescriptors ("Internal: <int> • External: <ext>") but a
 * legacy override was saved with spec-PDF brand labels (Stoncor /
 * Corrocoat / colour) before the drawing-INT/EXT capability shipped, the
 * override no longer matches what the signed drawing demands. Without
 * this guard the customer-facing footer would keep rendering the old
 * spec-PDF supplier list — see [[signed-drawings-override]]. Returning
 * defaultSuppliersForSpec drops the stale override silently; the
 * companion hydration migration (in QuoteView) cleans up the DB so the
 * stale entry doesn't reappear on subsequent loads.
 */
export function effectiveSuppliers(spec: SpecListing, overrides: SpecOverrides): SupplierEntry[] {
  const override = overrides[spec.code];
  if (!override) return defaultSuppliersForSpec(spec);
  if (spec.kind === "coating" && isOverrideStaleVsDrawing(spec, override)) {
    return defaultSuppliersForSpec(spec);
  }
  // Lining specs: when the user has uploaded a custom product (e.g.
  // 'Weir Linacure 60' with a data sheet attached) the spec-PDF default
  // ('6 mm bore, 3 mm flange, hot-bonded …') is no longer authoritative
  // — the customer is being quoted the user's nominated product. Hide
  // the defaults from the editor so the row reflects what's actually
  // going on the quote. Editing still works (textarea is enabled) and
  // the user can re-add a default via '+ Add product' if needed.
  if (spec.kind === "lining") {
    const customs = override.suppliers.filter((s) => s.isCustom);
    if (customs.length > 0) return customs;
  }
  return override.suppliers;
}

function isOverrideStaleVsDrawing(spec: SpecListing, override: SpecOverride): boolean {
  const descriptors = spec.resolved ? spec.resolved.productDescriptors : null;
  if (!descriptors) return false;
  const drawingHasInternal = /(^|\W)Internal:\s/i.test(descriptors);
  const drawingHasExternal = /\bExternal:\s/i.test(descriptors);
  if (!drawingHasInternal && !drawingHasExternal) return false;
  const overrideHasInternal = override.suppliers.some((s) => s.brand === "Internal");
  const overrideHasExternal = override.suppliers.some((s) => s.brand === "External");
  // Legacy spec-PDF shape (Stoncor / Corrocoat / colour) — no drawing
  // facet brands at all. Stale: rebuild from the drawing-derived defaults.
  if (!overrideHasInternal && !overrideHasExternal) return true;
  // Facet-set mismatch — the drawing has since dropped or added a facet
  // relative to the saved override. The R1 case Andrew hit on 2026-05-15:
  // R1 used to capture an Internal facet (the lining text), the override
  // saved Internal+External, but R1 is now external-only — leaving a
  // phantom empty Internal box on the coating card. Treat as stale so
  // the card rebuilds to exactly the facets the drawing dictates.
  if (drawingHasInternal !== overrideHasInternal) return true;
  if (drawingHasExternal !== overrideHasExternal) return true;
  return false;
}

/**
 * Shorthand to mutate the supplier list of one spec. Initialises an
 * override from the parsed default if the user hadn't touched the spec yet,
 * then applies `transform` to that supplier array. If the previously
 * selected supplier was removed by the transform, selection is cleared.
 */
export function withSpecSuppliers(
  spec: SpecListing,
  overrides: SpecOverrides,
  transform: (suppliers: SupplierEntry[]) => SupplierEntry[],
): SpecOverrides {
  const current = effectiveSuppliers(spec, overrides);
  const nextSuppliers = transform(current);
  const previousOverride = overrides[spec.code];
  const previousOverrideSelected = previousOverride ? previousOverride.selectedSupplierId : null;
  const previousSelected = previousOverrideSelected ? previousOverrideSelected : null;
  const stillExists =
    previousSelected !== null && nextSuppliers.some((s) => s.id === previousSelected);
  return {
    ...overrides,
    [spec.code]: {
      suppliers: nextSuppliers,
      selectedSupplierId: stillExists ? previousSelected : null,
    },
  };
}

/**
 * Returns the supplier id currently chosen for the customer-facing quote,
 * or null when none has been selected (every supplier is rendered as an
 * alternative).
 */
export function selectedSupplierId(spec: SpecListing, overrides: SpecOverrides): string | null {
  const override = overrides[spec.code];
  if (!override) return null;
  // Same stale-shape guard as effectiveSuppliers — a legacy override's
  // selectedSupplierId (e.g. "default-R2a-0" pointing at Stoncor) is
  // meaningless once we've switched to drawing-derived Internal/External
  // suppliers. Treat selection as cleared so every supplier renders in
  // the footer.
  if (spec.kind === "coating" && isOverrideStaleVsDrawing(spec, override)) return null;
  // Drawing-faceted coatings: when the suppliers are the contractual
  // Internal + External facets per the signed drawing, neither is an
  // optional alternative — both must render in the customer-facing
  // footer. Ignore any saved selection (which can linger from when the
  // override was Stoncor/Corrocoat-shaped and the migration preserved
  // the id by coincidence).
  if (
    spec.kind === "coating" &&
    override.suppliers.some((s) => s.brand === "Internal" || s.brand === "External")
  ) {
    return null;
  }
  const selected = override.selectedSupplierId;
  return selected ? selected : null;
}

/**
 * Records the user's pick of a supplier (or clears it). Initialises an
 * override from the parsed default if needed so the suppliers array is
 * preserved alongside the selection.
 */
export function withSelectedSupplier(
  spec: SpecListing,
  overrides: SpecOverrides,
  supplierId: string | null,
): SpecOverrides {
  const current = effectiveSuppliers(spec, overrides);
  return {
    ...overrides,
    [spec.code]: {
      suppliers: current,
      selectedSupplierId: supplierId,
    },
  };
}

/**
 * Filters the supplier list down to whatever the customer should see. When a
 * supplier has been selected, only that one survives — the alternatives stay
 * in the editor for reference but don't reach the customer-facing footer.
 * When no supplier has been selected, every supplier flows through.
 */
export function suppliersForCustomerFooter(
  suppliers: SupplierEntry[],
  selected: string | null,
): SupplierEntry[] {
  if (!selected) return suppliers;
  const match = suppliers.find((s) => s.id === selected);
  if (!match) return suppliers;
  return [match];
}

/**
 * Renders the joined 'Brand: Products' string for the section footer based
 * on the override-aware supplier list. Custom entries (user-typed or user-
 * added rows, marked isCustom = true) take precedence over the parsed
 * defaults — if the user has gone to the trouble of nominating a specific
 * supplier's product for this quote, the customer-facing footer must
 * reflect that, NOT the original spec-line text.
 *
 * Rules:
 * - If any custom entries exist, they alone drive the line (defaults are
 *   dropped). This applies to both kinds.
 * - Linings join multiple customs with ' or ' (single-product convention).
 *   Coatings join with ' • ' to keep alternatives readable in the footer.
 * - When no customs exist, falls back to the previous behaviour: first
 *   supplier for linings, all suppliers joined with ' • ' for coatings.
 */
export function joinSuppliersForFooter(suppliers: SupplierEntry[], kind: SpecKind): string {
  if (suppliers.length === 0) return "";

  const customs = suppliers.filter((s) => s.isCustom);
  const pool = customs.length > 0 ? customs : suppliers;

  if (kind === "lining") {
    if (pool.length === 1) {
      return pool[0].description;
    }
    return pool
      .map((s) => s.description)
      .filter((p) => p.length > 0)
      .join(" or ");
  }

  return pool
    .map((s) => {
      if (s.brand && s.description) return `${s.brand}: ${s.description}`;
      if (s.brand) return s.brand;
      return s.description;
    })
    .filter((p) => p.length > 0)
    .join(" • ");
}

/**
 * True when the spec has at least one custom (user-edited or user-added)
 * supplier entry — drives the 'data sheet required' UI.
 */
export function hasCustomEntries(suppliers: SupplierEntry[]): boolean {
  return suppliers.some((s) => s.isCustom);
}

export function newCustomEntry(brand: string, description: string): SupplierEntry {
  return {
    id: nextEntryId(),
    brand,
    description,
    isCustom: true,
  };
}

/* ------------------------------------------------------------------
 * Pricing rates
 *
 * Per-spec pricing entered by the user.
 *
 * - `perM2` — applies to coatings (always) and to linings on plate
 *   work, fittings, and short pipes (< 3 m).
 * - `perRm` — only meaningful for linings; applied to long pipes
 *   (>= 3 m) per the rubber-lining schedule (length × Rm rate, with
 *   100 mm per flange overlap added — same allowance the m²
 *   calculator uses).
 *
 * Coating specs ignore `perRm`. Both default to 0 when unset; a 0
 * rate contributes 0 to the cost so blank inputs are harmless.
 * ------------------------------------------------------------------ */

export interface SpecRate {
  perM2: number;
  perRm: number;
}
export type SpecRates = Record<string, SpecRate>;

export function emptyRate(): SpecRate {
  return { perM2: 0, perRm: 0 };
}

export function sanitiseRate(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function lookupSpecRate(rates: SpecRates, code: string | null): SpecRate {
  if (!code) return emptyRate();
  const entry = rates[code];
  if (!entry) return emptyRate();
  return { perM2: sanitiseRate(entry.perM2), perRm: sanitiseRate(entry.perRm) };
}

/**
 * Counts how many manually-added or edited entries across all specs are
 * still missing a data sheet attachment. Drives the top-of-page banner —
 * 'N entries need a data sheet attached when sending this quote'.
 */
export function countMissingDataSheets(
  specs: SpecListing[],
  overrides: SpecOverrides,
  attachments: DataSheetAttachments,
): { custom: number; missing: number } {
  let custom = 0;
  let missing = 0;
  for (const spec of specs) {
    const suppliers = effectiveSuppliers(spec, overrides);
    for (const supplier of suppliers) {
      if (!supplier.isCustom) continue;
      custom += 1;
      const attachment = attachments[supplier.id];
      if (!attachment) missing += 1;
    }
  }
  return { custom, missing };
}
