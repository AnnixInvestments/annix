"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";

export function usePersistedState<T>(
  storageKey: string,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(defaultValue);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) {
        setValue(JSON.parse(raw) as T);
      }
    } catch {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Ignore — storage may be unavailable.
      }
    }
    setIsReady(true);
  }, [storageKey]);

  useEffect(() => {
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    if (typeof window === "undefined") return;
    if (!isReady) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Storage full / unavailable — ignore.
    }
  }, [storageKey, value, isReady]);

  return [value, setValue];
}
