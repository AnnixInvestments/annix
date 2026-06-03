const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

export function monthTokenFromLabel(label: string | null | undefined): string | null {
  if (!label) return null;
  const lower = label.toLowerCase();
  const full = MONTHS.find((month) => lower.includes(month));
  if (full) return full;
  const abbrIndex = MONTHS.findIndex((month) => lower.includes(month.slice(0, 3)));
  return abbrIndex === -1 ? null : MONTHS[abbrIndex];
}

export interface SheetSelection {
  sheetName: string | null;
  matchedMonth: boolean;
  availableSheets: string[];
}

export function selectSheetForMonth(
  sheetNames: string[],
  monthLabel: string | null | undefined,
  explicitSheetName?: string | null,
): SheetSelection {
  if (sheetNames.length === 0) {
    return { sheetName: null, matchedMonth: false, availableSheets: [] };
  }

  if (explicitSheetName) {
    const exact = sheetNames.find((name) => name === explicitSheetName);
    if (exact) {
      return { sheetName: exact, matchedMonth: false, availableSheets: sheetNames };
    }
  }

  if (sheetNames.length === 1) {
    return { sheetName: sheetNames[0], matchedMonth: false, availableSheets: sheetNames };
  }

  const token = monthTokenFromLabel(monthLabel);
  if (token) {
    const abbr = token.slice(0, 3);
    const matched = sheetNames.find((name) => {
      const lower = name.toLowerCase();
      if (lower.includes(token)) return true;
      const words = lower.split(/[^a-z]+/).filter((word) => word !== "");
      return words.some((word) => word === abbr || word === token);
    });
    if (matched) {
      return { sheetName: matched, matchedMonth: true, availableSheets: sheetNames };
    }
  }

  return { sheetName: sheetNames[0], matchedMonth: false, availableSheets: sheetNames };
}
