// Structured registry of the catalogue sources behind every HDPE
// fitting dimension table in this package. Each catalogue entry
// (elbow, tee, reducer, lateral, end-cap) carries a sourceId that
// resolves into one of these records — so the BOQ row builder can
// surface "values per Strongbridge IPS 2024 catalogue" tooltips, and
// future audits can verify provenance without re-reading inline file
// comments.
//
// Add to this list when a new catalogue is consulted. Never inline
// source URLs in dimension files — point at a sourceId here so a
// catalogue update propagates to every entry that referenced it.

export type ManufacturingPattern = "moulded-short" | "fabricated-long" | "mixed";

export interface CatalogueSource {
  // Stable id — used as the foreign key from dimension entries.
  id: string;
  // Human-readable manufacturer / publisher name.
  name: string;
  // Country of origin. Helps the quoter judge whether a value
  // applies to local SA stock or imports.
  country: string;
  // URL of the brochure / datasheet / product page consulted.
  // Manufacturer marketing material is free to reference. ISO /
  // EN / SANS verbatim clauses are NOT — we don't hold a licence.
  url: string;
  // Manufacturing pattern this source publishes. SA mining rule of
  // thumb: moulded for DN ≤ 200, fabricated for DN ≥ 250.
  pattern: ManufacturingPattern;
  // Standards the published values claim compliance with — listed
  // for documentation only. We don't reproduce the standards
  // themselves, only the manufacturer's claim about them.
  standardCompliance: string[];
  // Catalogue version / year if stated. Otherwise "undated".
  catalogueVersion: string;
  // Human-readable note about coverage gaps, conventions, or
  // anything the quoter should know about this source.
  notes?: string;
}

// Currently-cited catalogue sources. Keep alphabetised by id.
export const HDPE_FITTING_DIMENSION_SOURCES: Record<string, CatalogueSource> = {
  chuangrong: {
    id: "chuangrong",
    name: "ChuangRong",
    country: "China",
    url: "https://www.cdchuangrong.com/pe100-pn16-sdr11-hdpe-fusion-fittings-hdpe-90-degree-elbow-with-welding-parameters-product/",
    pattern: "moulded-short",
    standardCompliance: ["ISO 4427-3", "EN 12201-3"],
    catalogueVersion: "undated",
    notes: "Cross-check source for HdpePolyfittings tables. Per-DN 90° elbow data DN 50-800.",
  },
  defpipe: {
    id: "defpipe",
    name: "DEF Pipe",
    country: "China",
    url: "https://www.defpipe.com/HDPE-Butt-Fusion-End-Cap.html",
    pattern: "moulded-short",
    standardCompliance: ["ISO 4427-3"],
    catalogueVersion: "undated",
    notes: "End-cap cross-check, ~10% lower than long-pattern (short-pattern stock).",
  },
  flotek: {
    id: "flotek",
    name: "Flo-Tek (Africa)",
    country: "South Africa",
    url: "https://www.flotekafrica.com/wp-content/uploads/2020/09/HDPE-Brochure-1.pdf",
    pattern: "mixed",
    standardCompliance: ["SANS ISO 4427", "ISO 4427"],
    catalogueVersion: "2020",
    notes:
      "Primary SA HDPE supplier — confirms product range but doesn't tabulate per-DN dims. Used as a sanity check; per-DN values come from the international sources below.",
  },
  hdpepolyfittings: {
    id: "hdpepolyfittings",
    name: "Sunplast / HdpePolyfittings",
    country: "China",
    url: "https://www.hdpepolyfittings.com/",
    pattern: "moulded-short",
    standardCompliance: ["ISO 4427-3", "EN 12201-3"],
    catalogueVersion: "undated",
    notes:
      "Comprehensive PE100 SDR11 catalogue for elbow / tee / reducer / lateral / end-cap. Primary source for moulded short-pattern values DN ≤ 160 (lateral) and DN 50-800 (elbow, tee, end-cap).",
  },
  sinvac: {
    id: "sinvac",
    name: "Sinvac (SA)",
    country: "South Africa",
    url: "https://www.sinvac.co.za/wp-content/uploads/2022/11/SINVAC-Piping-Catalogue-27-07-2020-A.pdf",
    pattern: "mixed",
    standardCompliance: ["SANS ISO 4427", "ISO 4427"],
    catalogueVersion: "2020",
    notes:
      "SA supplier — confirms 90° / 45° / Tee product range DN 20-500/630, no per-DN dim tables in brochure.",
  },
  strongbridge: {
    id: "strongbridge",
    name: "Strongbridge",
    country: "USA",
    url: "https://www.strongbridge.us/mf-wyes",
    pattern: "fabricated-long",
    standardCompliance: ["ASTM F2206"],
    catalogueVersion: "undated",
    notes:
      'Imperial IPS molded wye lateral catalogue (2"-12"). Translates to DN 200, 250, 315 anchors for fabricated long-pattern laterals — the SA mining default at large size.',
  },
};

// Provenance for a value beyond just "catalogue" vs "estimated" —
// when source === "catalogue", sourceId names which manufacturer
// catalogue produced the value. When source === "estimated", the
// value was interpolated/extrapolated and sourceId names the
// nearest anchor catalogue (so a quoter can judge confidence).
export interface ValueProvenance {
  source: "catalogue" | "estimated";
  sourceId: keyof typeof HDPE_FITTING_DIMENSION_SOURCES;
}

export const catalogueSource = (sourceId: string): CatalogueSource | null => {
  const source = HDPE_FITTING_DIMENSION_SOURCES[sourceId];
  return source ?? null;
};
