import { useCallback, useState } from "react";

export type SortDirection = "asc" | "desc";

export interface UseSortStateOptions<TField extends string> {
  initialField?: TField;
  initialDirection?: SortDirection;
}

export interface UseSortStateReturn<TField extends string> {
  field: TField | null;
  direction: SortDirection;
  setSortBy: (field: TField, direction?: SortDirection) => void;
  toggleSort: (field: TField) => void;
  reset: () => void;
}

export function useSortState<TField extends string = string>(
  options: UseSortStateOptions<TField> = {},
): UseSortStateReturn<TField> {
  const rawInitialField = options.initialField;
  const initialField = rawInitialField || null;
  const rawInitialDirection = options.initialDirection;
  const initialDirection = rawInitialDirection || "desc";

  const [field, setField] = useState<TField | null>(initialField);
  const [direction, setDirection] = useState<SortDirection>(initialDirection);

  const setSortBy = useCallback((nextField: TField, nextDirection?: SortDirection) => {
    setField(nextField);
    setDirection(nextDirection ?? "asc");
  }, []);

  const toggleSort = useCallback(
    (nextField: TField) => {
      if (field === nextField) {
        setDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setField(nextField);
        setDirection("asc");
      }
    },
    [field],
  );

  const reset = useCallback(() => {
    setField(initialField);
    setDirection(initialDirection);
  }, [initialField, initialDirection]);

  return { field, direction, setSortBy, toggleSort, reset };
}
