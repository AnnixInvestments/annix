export type RubberBondingCoverageBasis = "litre" | "gram" | "none";

export interface RubberBondingCoverageRef {
  matchTokens: string[];
  supplier: string;
  coverageBasis: RubberBondingCoverageBasis;
  areaCoverPerLitre: number | null;
  gramsPerM2: number | null;
  source: string;
}

export const RUBBER_BONDING_COVERAGE_REFS: RubberBondingCoverageRef[] = [
  {
    matchTokens: ["heroprime", "105"],
    supplier: "Impilo",
    coverageBasis: "litre",
    areaCoverPerLitre: 12.0,
    gramsPerM2: null,
    source: "Impilo adhesive price list & application guide — 12,0 m²/litre @ 10µm DFT",
  },
  {
    matchTokens: ["herobond", "200"],
    supplier: "Impilo",
    coverageBasis: "gram",
    areaCoverPerLitre: null,
    gramsPerM2: 700,
    source: "Impilo application guide — ±700 g/m² (rubber-to-metal, depending on roughness)",
  },
  {
    matchTokens: ["herobond", "300"],
    supplier: "Impilo",
    coverageBasis: "gram",
    areaCoverPerLitre: null,
    gramsPerM2: 700,
    source: "Impilo price list — two-part cold-cure kit ±500–850 g/m²; ±700 g/m² working rate",
  },
  {
    matchTokens: ["herobond", "400"],
    supplier: "Impilo",
    coverageBasis: "litre",
    areaCoverPerLitre: 5.0,
    gramsPerM2: null,
    source: "Impilo price list — 5 m²/litre per coat @ 20µm DFT",
  },
  {
    matchTokens: ["herobond", "450"],
    supplier: "Impilo",
    coverageBasis: "litre",
    areaCoverPerLitre: 5.0,
    gramsPerM2: null,
    source: "Impilo price list — 5 m²/litre per coat @ 20µm DFT",
  },
  {
    matchTokens: ["herobond", "080"],
    supplier: "Impilo",
    coverageBasis: "litre",
    areaCoverPerLitre: 10.5,
    gramsPerM2: null,
    source: "Impilo price list & application guide — 10–11 m²/litre (midpoint 10.5)",
  },
  {
    matchTokens: ["herobond", "082"],
    supplier: "Impilo",
    coverageBasis: "litre",
    areaCoverPerLitre: 9.5,
    gramsPerM2: null,
    source: "Impilo price list & application guide — 9–10 m²/litre (midpoint 9.5)",
  },
  {
    matchTokens: ["herobond", "086"],
    supplier: "Impilo",
    coverageBasis: "litre",
    areaCoverPerLitre: 6.2,
    gramsPerM2: null,
    source: "Impilo application guide — 6,2 m²/litre for one coat",
  },
  {
    matchTokens: ["herobond", "089"],
    supplier: "Impilo",
    coverageBasis: "litre",
    areaCoverPerLitre: 11.0,
    gramsPerM2: null,
    source: "Impilo application guide — 11 m²/litre (UV-resistant green primer)",
  },
  {
    matchTokens: ["herobond", "090"],
    supplier: "Impilo",
    coverageBasis: "litre",
    areaCoverPerLitre: 20.0,
    gramsPerM2: null,
    source: "Impilo application guide — 20 m²/litre (UV-resistant red cover coat)",
  },
  {
    matchTokens: ["sc2000"],
    supplier: "Rema Tip Top",
    coverageBasis: "gram",
    areaCoverPerLitre: null,
    gramsPerM2: 400,
    source:
      "REMA TIP TOP GmbH Product Information SC 2000 — ~400 g/m² per coat on metal/CN (≈500 on buffed rubber)",
  },
  {
    matchTokens: ["sc4000"],
    supplier: "Rema Tip Top",
    coverageBasis: "gram",
    areaCoverPerLitre: null,
    gramsPerM2: 200,
    source:
      "REMA TIP TOP GmbH Product Information SC 4000 — ~200 g/m² per coat on metal/CN (≈300 on buffed rubber)",
  },
  {
    matchTokens: ["bc3000"],
    supplier: "Rema Tip Top",
    coverageBasis: "gram",
    areaCoverPerLitre: null,
    gramsPerM2: 200,
    source:
      "REMA TIP TOP TDS BC 3004 (CHC-free replacement for BC 3000) — ~200 g/m² per coat on steel/rubber",
  },
  {
    matchTokens: ["remabond", "2000"],
    supplier: "Rema Tip Top",
    coverageBasis: "gram",
    areaCoverPerLitre: null,
    gramsPerM2: 100,
    source:
      "REMA TIP TOP TDS Primer PR 200 (= REMABOND 2000/PR200) — ~100 g/m² per coat, brush-applied",
  },
];

function normalizeBondingName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export interface RubberBondingCoverageResult {
  coverageBasis: RubberBondingCoverageBasis;
  areaCoverPerLitre: number | null;
  gramsPerM2: number | null;
  source: string;
}

export function lookupRubberBondingCoverage(
  name: string | null | undefined,
): RubberBondingCoverageResult | null {
  const normalized = normalizeBondingName(name ?? "");
  if (normalized === "") {
    return null;
  }
  const match = RUBBER_BONDING_COVERAGE_REFS.find((ref) =>
    ref.matchTokens.every((token) => normalized.includes(token)),
  );
  if (!match) {
    return null;
  }
  return {
    coverageBasis: match.coverageBasis,
    areaCoverPerLitre: match.areaCoverPerLitre,
    gramsPerM2: match.gramsPerM2,
    source: match.source,
  };
}
