export const calculatorKeys = {
  reducer: {
    all: ["reducer-calculator"] as const,
    standardLength: (largeNbMm: number, smallNbMm: number) =>
      [...calculatorKeys.reducer.all, "standard-length", largeNbMm, smallNbMm] as const,
  },
} as const;
