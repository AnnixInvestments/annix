export interface PressureClassValidationResult {
  isUnsuitable: boolean;
  maxPressureBar: number | null;
  message: string | null;
}

const ASME_CLASS_TO_AMBIENT_BAR: Record<number, number> = {
  150: 20,
  300: 51,
  400: 68,
  600: 103,
  900: 154,
  1500: 257,
  2500: 428,
};

export const validatePressureClass = (
  standardCode: string | undefined,
  pressureClassDesignation: string | undefined,
  workingPressureBar: number,
): PressureClassValidationResult => {
  if (!standardCode || !pressureClassDesignation || workingPressureBar <= 0) {
    return { isUnsuitable: false, maxPressureBar: null, message: null };
  }

  const code = standardCode.toUpperCase();
  const designation = pressureClassDesignation.toUpperCase();

  const extractNumeric = (str: string): number => {
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const classValue = extractNumeric(designation);
  if (classValue === 0) {
    return { isUnsuitable: false, maxPressureBar: null, message: null };
  }

  if ((code.includes("SABS") || code.includes("SANS")) && code.includes("1123")) {
    const maxPressureBar = classValue / 100;
    const isUnsuitable = maxPressureBar < workingPressureBar;
    return {
      isUnsuitable,
      maxPressureBar,
      message: isUnsuitable
        ? `Class ${classValue} kPa (${maxPressureBar} bar) is below working pressure of ${workingPressureBar} bar`
        : null,
    };
  }

  if (
    (code.includes("BS") && code.includes("4504")) ||
    (code.includes("EN") && (code.includes("1092") || code.includes("10921")))
  ) {
    const maxPressureBar = classValue;
    const isUnsuitable = maxPressureBar < workingPressureBar;
    return {
      isUnsuitable,
      maxPressureBar,
      message: isUnsuitable
        ? `PN${classValue} (${maxPressureBar} bar) is below working pressure of ${workingPressureBar} bar`
        : null,
    };
  }

  if (code.includes("ASME") || code.includes("B16")) {
    const maxPressureBar = ASME_CLASS_TO_AMBIENT_BAR[classValue];
    if (maxPressureBar) {
      const isUnsuitable = maxPressureBar < workingPressureBar;
      return {
        isUnsuitable,
        maxPressureBar,
        message: isUnsuitable
          ? `Class ${classValue} (${maxPressureBar} bar at ambient) is below working pressure of ${workingPressureBar} bar`
          : null,
      };
    }
  }

  if (code.includes("BS") && code.includes("10")) {
    const tableEPressures: Record<string, number> = {
      E: 14,
      D: 7,
      F: 21,
      H: 35,
    };
    const tableMatch = designation.match(/TABLE\s*([A-Z])/i);
    if (tableMatch) {
      const tableLetter = tableMatch[1].toUpperCase();
      const maxPressureBar = tableEPressures[tableLetter];
      if (maxPressureBar) {
        const isUnsuitable = maxPressureBar < workingPressureBar;
        return {
          isUnsuitable,
          maxPressureBar,
          message: isUnsuitable
            ? `Table ${tableLetter} (${maxPressureBar} bar) is below working pressure of ${workingPressureBar} bar`
            : null,
        };
      }
    }
  }

  return { isUnsuitable: false, maxPressureBar: null, message: null };
};

export const extractPressureClassRating = (
  standardCode: string | undefined,
  pressureClassDesignation: string | undefined,
): { ratingBar: number; ratingType: "kPa" | "PN" | "Class" | "Table" | null } => {
  if (!standardCode || !pressureClassDesignation) {
    return { ratingBar: 0, ratingType: null };
  }

  const code = standardCode.toUpperCase();
  const designation = pressureClassDesignation.toUpperCase();

  const extractNumeric = (str: string): number => {
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const classValue = extractNumeric(designation);

  if ((code.includes("SABS") || code.includes("SANS")) && code.includes("1123")) {
    return { ratingBar: classValue / 100, ratingType: "kPa" };
  }

  if (
    (code.includes("BS") && code.includes("4504")) ||
    (code.includes("EN") && (code.includes("1092") || code.includes("10921")))
  ) {
    return { ratingBar: classValue, ratingType: "PN" };
  }

  if (code.includes("ASME") || code.includes("B16")) {
    const ratingBar = ASME_CLASS_TO_AMBIENT_BAR[classValue] || 0;
    return { ratingBar, ratingType: "Class" };
  }

  return { ratingBar: 0, ratingType: null };
};
