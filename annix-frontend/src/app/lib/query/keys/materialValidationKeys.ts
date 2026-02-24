export const materialValidationKeys = {
  all: ["material-validation"] as const,
  allLimits: () => [...materialValidationKeys.all, "all-limits"] as const,
  suitability: (specName: string, temp?: number, pressure?: number) =>
    [...materialValidationKeys.all, "suitability", specName, temp, pressure] as const,
  suitableMaterials: (temp?: number, pressure?: number) =>
    [...materialValidationKeys.all, "suitable-materials", temp, pressure] as const,
  limitsBySpec: (specName: string) => [...materialValidationKeys.all, "by-spec", specName] as const,
} as const;
