import { isNumber, isString } from "es-toolkit/compat";
import { useCallback, useState } from "react";
import type { SortDirection } from "@/app/components/shared/TableComponents";

interface TablePreferences {
  pageSize: number;
  sortColumn: string;
  sortDirection: SortDirection;
}

const STORAGE_PREFIX = "auRubber_table_";

function loadPreferences(pageKey: string, defaults: TablePreferences): TablePreferences {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
  if (typeof window === "undefined") return defaults;
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${pageKey}`);
    if (!stored) return defaults;
    const parsed = JSON.parse(stored) as Partial<TablePreferences>;
    return {
      pageSize: isNumber(parsed.pageSize) ? parsed.pageSize : defaults.pageSize,
      sortColumn: isString(parsed.sortColumn) ? parsed.sortColumn : defaults.sortColumn,
      sortDirection:
        parsed.sortDirection === "asc" || parsed.sortDirection === "desc"
          ? parsed.sortDirection
          : defaults.sortDirection,
    };
  } catch {
    return defaults;
  }
}

function savePreferences(pageKey: string, prefs: TablePreferences): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${pageKey}`, JSON.stringify(prefs));
  } catch {
    // localStorage full or unavailable
  }
}

export function useTablePreferences(pageKey: string, defaults: TablePreferences) {
  const [prefs, setPrefs] = useState<TablePreferences>(() => loadPreferences(pageKey, defaults));

  const setPageSize = useCallback(
    (size: number) => {
      setPrefs((prev) => {
        const next = { ...prev, pageSize: size };
        savePreferences(pageKey, next);
        return next;
      });
    },
    [pageKey],
  );

  const setSortColumn = useCallback(
    (column: string) => {
      setPrefs((prev) => {
        const next = { ...prev, sortColumn: column };
        savePreferences(pageKey, next);
        return next;
      });
    },
    [pageKey],
  );

  const setSortDirection = useCallback(
    (direction: SortDirection) => {
      setPrefs((prev) => {
        const next = { ...prev, sortDirection: direction };
        savePreferences(pageKey, next);
        return next;
      });
    },
    [pageKey],
  );

  return {
    pageSize: prefs.pageSize,
    sortColumn: prefs.sortColumn,
    sortDirection: prefs.sortDirection,
    setPageSize,
    setSortColumn,
    setSortDirection,
  };
}
