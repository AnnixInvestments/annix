export const fittingKeys = {
  all: ["fittings"] as const,

  ansiTypes: () => [...fittingKeys.all, "ansi", "types"] as const,
  ansiSchedules: (fittingType: string) =>
    [...fittingKeys.all, "ansi", "schedules", fittingType] as const,
  ansiSizes: (fittingType: string, schedule?: string) =>
    [...fittingKeys.all, "ansi", "sizes", fittingType, schedule] as const,
  ansiDimensions: (fittingType: string, nbMm: number, schedule: string, branchNbMm?: number) =>
    [...fittingKeys.all, "ansi", "dimensions", fittingType, nbMm, schedule, branchNbMm] as const,

  forgedTypes: () => [...fittingKeys.all, "forged", "types"] as const,
  forgedSeries: () => [...fittingKeys.all, "forged", "series"] as const,
  forgedSizes: (fittingType: string, pressureClass: number, connectionType: string) =>
    [...fittingKeys.all, "forged", "sizes", fittingType, pressureClass, connectionType] as const,
  forgedDimensions: (
    fittingType: string,
    nominalBoreMm: number,
    pressureClass: number,
    connectionType: string,
  ) =>
    [
      ...fittingKeys.all,
      "forged",
      "dimensions",
      fittingType,
      nominalBoreMm,
      pressureClass,
      connectionType,
    ] as const,

  malleableTypes: () => [...fittingKeys.all, "malleable", "types"] as const,
  malleableSizes: (fittingType: string, pressureClass: number) =>
    [...fittingKeys.all, "malleable", "sizes", fittingType, pressureClass] as const,
  malleableDimensions: (fittingType: string, pressureClass?: number) =>
    [...fittingKeys.all, "malleable", "dimensions", fittingType, pressureClass] as const,
} as const;
