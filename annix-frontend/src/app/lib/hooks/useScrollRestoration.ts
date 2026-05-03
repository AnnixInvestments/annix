"use client";

import { type RefObject, useEffect, useRef } from "react";

const STORAGE_PREFIX = "scroll:";

function findScrollContainer(el: HTMLElement | null): HTMLElement | Window {
  if (!el || !el.parentElement) return window;
  const parent = el.parentElement;
  const overflowY = window.getComputedStyle(parent).overflowY;
  if (overflowY === "auto" || overflowY === "scroll") return parent;
  return findScrollContainer(parent);
}

function readScrollTop(container: HTMLElement | Window): number {
  return container instanceof Window ? container.scrollY : container.scrollTop;
}

function writeScrollTop(container: HTMLElement | Window, y: number) {
  if (container instanceof Window) {
    container.scrollTo({ top: y });
  } else {
    container.scrollTop = y;
  }
}

export function useScrollRestoration(key: string): RefObject<HTMLDivElement | null> {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const sessionKey = `${STORAGE_PREFIX}${key}`;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const container = findScrollContainer(sentinel);
    const stored = sessionStorage.getItem(sessionKey);
    if (!stored) return;
    const targetY = Number(stored);
    if (Number.isNaN(targetY) || targetY <= 0) return;

    let attempts = 0;
    const tryRestore = () => {
      writeScrollTop(container, targetY);
      attempts += 1;
      if (readScrollTop(container) < targetY - 10 && attempts < 20) {
        setTimeout(tryRestore, 50);
      }
    };
    requestAnimationFrame(tryRestore);
  }, [sessionKey]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const container = findScrollContainer(sentinel);
    const target: EventTarget = container;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        sessionStorage.setItem(sessionKey, String(readScrollTop(container)));
      }, 100);
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      target.removeEventListener("scroll", onScroll);
      if (timeout) clearTimeout(timeout);
    };
  }, [sessionKey]);

  return sentinelRef;
}
