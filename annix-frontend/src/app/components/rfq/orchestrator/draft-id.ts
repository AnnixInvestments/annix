/**
 * Drafts are keyed by numeric ids, but values reach the orchestrator from
 * mixed sources — Mongoose's `id` virtual stringifies `_id`, localStorage
 * drafts round-trip whatever was stored, and URL params are strings. The
 * backend validator rejects non-numbers ("draftId must be a number"), which
 * bricked Save Progress after the first save (issue #357). Coerce to a
 * positive integer or null at every point a draft id enters state.
 */
export const toNumericDraftId = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};
