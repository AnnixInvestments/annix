export const flangeWeightKeys = {
  all: ["flange-weight"] as const,
  nbToOdMap: () => [...flangeWeightKeys.all, "nb-to-od-map"] as const,
  allWeights: () => [...flangeWeightKeys.all, "all-weights"] as const,
  allBnwSets: () => [...flangeWeightKeys.all, "all-bnw-sets"] as const,
  allRetainingRings: () => [...flangeWeightKeys.all, "all-retaining-rings"] as const,
  allGasketWeights: () => [...flangeWeightKeys.all, "all-gasket-weights"] as const,
  allFlangeTypes: () => [...flangeWeightKeys.all, "all-flange-types"] as const,
} as const;
