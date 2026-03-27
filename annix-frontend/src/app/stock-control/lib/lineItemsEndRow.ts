const LINE_ITEMS_FOOTER =
  /^(production|foreman?\s*sign|forman\s*sign|material\s*spec|job\s*comp|completion\s*date|supervisor|quality\s*control|qc\s*sign|inspector|approved\s*by|checked\s*by|despatch)\b|^Sage\s*\d{3}\s*Evolution/i;

const ITEM_HEADER = /^Item\s*Code/i;

function scanSectionRows(grid: string[][], startRow: number): number[] {
  const { rows } = grid.slice(startRow).reduce<{ rows: number[]; stopped: boolean }>(
    (acc, row, idx) => {
      if (acc.stopped) return acc;

      const firstCell = (row[0] || "").trim();
      if (LINE_ITEMS_FOOTER.test(firstCell)) {
        return { ...acc, stopped: true };
      }

      const hasContent = row.some((cell) => (cell || "").trim().length > 0);
      return hasContent ? { ...acc, rows: [...acc.rows, startRow + idx] } : acc;
    },
    { rows: [], stopped: false },
  );

  return rows;
}

function itemSectionRanges(grid: string[][], startRow: number): number[] {
  const sectionStarts = grid.reduce<number[]>((acc, row, r) => {
    const firstCell = (row[0] || "").trim();
    return ITEM_HEADER.test(firstCell) ? [...acc, r] : acc;
  }, []);

  if (sectionStarts.length <= 1) {
    return scanSectionRows(grid, startRow);
  }

  return sectionStarts.reduce<number[]>((allRows, sectionStart) => {
    const dataStart = sectionStart + 1;
    if (dataStart < startRow) return allRows;

    return [...allRows, ...scanSectionRows(grid, dataStart)];
  }, []);
}

export function correctLineItemsEndRow(
  grid: string[][],
  startRow: number,
  currentEndRow: number,
): number {
  const rows = itemSectionRanges(grid, startRow);
  return rows.length > 0 ? Math.max(...rows, currentEndRow) : currentEndRow;
}

export function validItemRows(grid: string[][], startRow: number): Set<number> {
  return new Set(itemSectionRanges(grid, startRow));
}
