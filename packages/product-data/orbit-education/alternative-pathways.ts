/**
 * Alternative post-school pathways (#304 Phase 2) — shown when a learner's
 * first-choice programmes are a stretch (few/no eligible matches, or a funding
 * gap). These describe pathway TYPES (generic, honest — no fabricated specific
 * institutions/fees); curate concrete providers separately if needed.
 */

import type { OrbitEducationCareerCluster } from "./career-clusters";

export const ALTERNATIVE_PATHWAY_TYPES = [
  "trade",
  "diploma",
  "extended_programme",
  "online",
  "bridging",
] as const;

export type AlternativePathwayType = (typeof ALTERNATIVE_PATHWAY_TYPES)[number];

export interface AlternativePathway {
  type: AlternativePathwayType;
  label: string;
  description: string;
  /** Clusters this pathway is most relevant to; empty = broadly applicable. */
  clusters: OrbitEducationCareerCluster[];
}

export const ORBIT_EDUCATION_ALTERNATIVE_PATHWAYS: AlternativePathway[] = [
  {
    type: "trade",
    label: "Artisan / trade route",
    description:
      "Train toward a recognised trade qualification via a TVET college plus an apprenticeship or learnership — strong demand, earn-while-you-learn, and a faster route to work.",
    clusters: ["engineering_built_environment", "agriculture"],
  },
  {
    type: "diploma",
    label: "Diploma / vocational qualification",
    description:
      "A diploma (often with lower entry requirements than a degree) builds practical, employable skills and can articulate into a degree later.",
    clusters: [],
  },
  {
    type: "extended_programme",
    label: "Extended / foundation programme",
    description:
      "Many universities offer an extended (foundation) version of a degree for applicants just below the standard requirement — same qualification, an extra year with more support.",
    clusters: [],
  },
  {
    type: "online",
    label: "Online study",
    description:
      "Accredited online programmes (local or international) widen your options and can be more affordable, with flexible pacing.",
    clusters: ["information_technology", "commerce_business"],
  },
  {
    type: "bridging",
    label: "Bridging / improve-and-reapply",
    description:
      "A bridging course or a year to re-write/improve key subjects can lift your marks above the cut-off for next intake — pair this with the marks-improvement plan.",
    clusters: [],
  },
];

/** Pathways relevant to a learner's interest clusters (or all broadly-applicable ones). */
export function alternativePathwaysForClusters(clusters: readonly string[]): AlternativePathway[] {
  const set = new Set(clusters);
  return ORBIT_EDUCATION_ALTERNATIVE_PATHWAYS.filter(
    (pathway) =>
      pathway.clusters.length === 0 || pathway.clusters.some((cluster) => set.has(cluster)),
  );
}
