// Shared Nix quote-view primitives. Mount <QuoteView /> from any app's
// promoted-session page to render the customer-facing quote with items
// pooled by coating + lining and a per-pool 'All above items require…'
// footer.
//
// Stock Control (Polymer Lining) mounts with hideNoScopeItems=true so
// items with no painting / no lining are pulled into a footnote rather
// than the main quote. RFQ (general fabrication) will mount with
// hideNoScopeItems=false to surface every line for the fabricator.
//
// Lower-level primitives are exported too in case an app wants to
// compose its own layout or run the pooling logic independently
// (e.g. to feed a PDF generator).

export type { QuoteItem, QuotePool } from "./poolItemsBySpec";
export { poolItemsBySpec } from "./poolItemsBySpec";
export type { QuoteSpecsEditorProps } from "./QuoteSpecsEditor";
export { QuoteSpecsEditor } from "./QuoteSpecsEditor";
export type { QuoteViewProps } from "./QuoteView";
export { QuoteView } from "./QuoteView";
export type {
  DataSheetAttachment,
  DataSheetAttachments,
  SpecKind,
  SpecListing,
  SpecOverride,
  SpecOverrides,
  SpecRate,
  SpecRates,
  SupplierEntry,
} from "./quoteSpecOverrides";
export {
  countMissingDataSheets,
  defaultSuppliersForSpec,
  effectiveSuppliers,
  emptyRate,
  hasCustomEntries,
  joinSuppliersForFooter,
  lookupSpecRate,
  newCustomEntry,
  parseLiningDescription,
  parseSuppliersFromCoating,
  selectedSupplierId,
  suppliersForCustomerFooter,
  withSelectedSupplier,
  withSpecSuppliers,
} from "./quoteSpecOverrides";
export type { ItemSurfaceArea } from "./surfaceAreaForQuoteItem";
export { sumPoolTotals, surfaceAreaForQuoteItem } from "./surfaceAreaForQuoteItem";
