// Match Nix's free-text materialGrade ("API 5L", "A234 WPB",
// "A105", "SABS 719", "ASTM A106") against the loaded steel-specs
// master list and return the best-matching id.
//
// Shared between two callers:
//   1. rfqWizardStore.convertNixItemsToRfqItems — applies per
//      BOQ row when Nix returns steel material text.
//   2. rfqWizardStore.mergeSpecMetadataIntoGlobalSpecs — applies
//      to globalSpecs when a tender-spec PDF declares the
//      material standard globally (no per-row text).
//
// Without this resolution, every Nix-extracted steel pipe ends up
// with steelSpecificationId=undefined → the BOQ description says
// just "Steel" and the weight calculation has no spec to anchor
// on. Wired in by issue #288 Phase 8.

export interface SteelSpecMasterRow {
  id: number;
  steelSpecName: string;
}

export const resolveSteelSpecId = (
  material: string | null | undefined,
  materialGrade: string | null | undefined,
  steelSpecs: SteelSpecMasterRow[],
): number | undefined => {
  if (steelSpecs.length === 0) return undefined;
  const haystack = `${material || ""} ${materialGrade || ""}`.trim().toLowerCase();
  if (!haystack) return undefined;
  const normalize = (s: string): string => s.toLowerCase().replace(/\s+/g, " ").trim();
  // Try strongest match first: exact-substring of the steel
  // spec's full name in the haystack. Score by spec-name length
  // so "API 5L X42" beats a generic "API".
  const best = steelSpecs.reduce<{ id: number; score: number } | null>((acc, spec) => {
    const name = normalize(spec.steelSpecName);
    if (!name) return acc;
    if (haystack.includes(name) || normalize(haystack).includes(name)) {
      const score = name.length;
      if (!acc || score > acc.score) return { id: spec.id, score };
    }
    return acc;
  }, null);
  return best ? best.id : undefined;
};
