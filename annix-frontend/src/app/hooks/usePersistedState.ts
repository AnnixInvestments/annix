"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

export function usePersistedState<T>(
  storageKey: string,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(defaultValue);
  const hasHydrated = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(storageKey);
    if (raw !== null) {
      try {
        setValue(JSON.parse(raw) as T);
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
    hasHydrated.current = true;
  }, [storageKey]);

  useEffect(() => {
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    if (typeof window === "undefined") return;
    if (!hasHydrated.current) return;
    localStorage.setItem(storageKey, JSON.stringify(value));
  }, [storageKey, value]);

  return [value, setValue];
}
