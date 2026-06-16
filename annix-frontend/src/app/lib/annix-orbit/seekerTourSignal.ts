"use client";

import { useSyncExternalStore } from "react";

// Tiny shared flag so seeker UI can tell when a Nix guided tour is running and
// suppress its own redundant prompts (e.g. the filters' "press Search to apply"
// hint while Nix is already pointing at the Search button).
let active = false;
const listeners = new Set<() => void>();

export function setSeekerTourActive(value: boolean): void {
  if (active === value) {
    return;
  }
  active = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot(): boolean {
  return active;
}

export function useSeekerTourActive(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
