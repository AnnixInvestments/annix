export type FittingClass = "STD" | "XH" | "XXH";

export const FITTING_WALL_THICKNESS: Record<FittingClass, Record<number, number>> = {
  STD: {
    15: 2.77,
    20: 2.87,
    25: 3.38,
    32: 3.56,
    40: 3.68,
    50: 3.91,
    65: 5.16,
    80: 5.49,
    90: 5.74,
    100: 6.02,
    125: 6.55,
    150: 7.11,
    200: 8.18,
    250: 9.27,
    300: 9.53,
  },
  XH: {
    15: 3.73,
    20: 3.91,
    25: 4.55,
    32: 4.85,
    40: 5.08,
    50: 5.54,
    65: 7.01,
    80: 7.62,
    100: 8.56,
    125: 9.53,
    150: 10.97,
    200: 12.7,
    250: 12.7,
    300: 12.7,
  },
  XXH: {
    15: 7.47,
    20: 7.82,
    25: 9.09,
    32: 9.7,
    40: 10.16,
    50: 11.07,
    65: 14.02,
    80: 15.24,
    100: 17.12,
    125: 19.05,
    150: 22.23,
    200: 22.23,
    250: 25.4,
    300: 25.4,
  },
};

export const fittingClassFromSchedule = (schedule: string): FittingClass | null => {
  const scheduleUpper = schedule.toUpperCase();

  if (scheduleUpper.includes("160") || scheduleUpper === "XXS" || scheduleUpper === "XXH") {
    return "XXH";
  }
  if (scheduleUpper.includes("80") || scheduleUpper === "XS" || scheduleUpper === "XH") {
    return "XH";
  }
  if (scheduleUpper.includes("40") || scheduleUpper === "STD") {
    return "STD";
  }

  return null;
};

export const fittingWallThickness = (
  nominalBoreMm: number,
  schedule: string,
  fallbackThickness?: number,
): number | null => {
  const fittingClass = fittingClassFromSchedule(schedule);

  if (!fittingClass || nominalBoreMm > 300) {
    return fallbackThickness || null;
  }

  return FITTING_WALL_THICKNESS[fittingClass]?.[nominalBoreMm] || fallbackThickness || null;
};

export const fittingWallThicknessForClass = (
  nominalBoreMm: number,
  fittingClass: FittingClass,
  fallbackThickness?: number,
): number | null => {
  if (nominalBoreMm > 300) {
    return fallbackThickness || null;
  }

  return FITTING_WALL_THICKNESS[fittingClass]?.[nominalBoreMm] || fallbackThickness || null;
};
