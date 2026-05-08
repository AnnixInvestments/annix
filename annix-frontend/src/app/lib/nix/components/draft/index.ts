// Shared Nix draft-review UI primitives.
//
// Mount <NixDraftReview /> from any app's draft page (Stock Control,
// RFQ, Comply-SA, etc.) to get the drawings + specs + other group
// layout, per-row Retry, click-to-edit cells, the spec-clause card
// with stat-cards / pill chips / page-jump button, and the in-app
// PdfPreviewModal — all wired through a single nixApi.
//
// Lower-level primitives are exported too in case an app wants to
// compose its own layout (e.g. inline a single SpecificationCard
// outside the drawing/spec grouping).

export { CodeChip } from "./CodeChip";
export { CodesCell } from "./CodesCell";
export { CodesEditor } from "./CodesEditor";
export { DetailsBlock } from "./DetailsBlock";
export { EditableCell } from "./EditableCell";
export { ExtractionCard } from "./ExtractionCard";
export { ExtractionGroup } from "./ExtractionGroup";
export {
  humaniseKey,
  isPureNumber,
  looksLikeNumberWithUnit,
  type ParsedKey,
  parseKey,
  tryRangeString,
} from "./humanise";
export { ItemRow } from "./ItemRow";
export { NixDraftReview } from "./NixDraftReview";
export { SpecificationCard } from "./SpecificationCard";
export { StatCard } from "./StatCard";
export { type ResolvedCode, type SpecLookup, useSpecLookup } from "./useSpecLookup";
