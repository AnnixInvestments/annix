import { useCallback, useEffect, useRef, useState } from "react";
import { fromISO, now, nowISO } from "@/app/lib/datetime";
import { log } from "@/app/lib/logger";

const DRAFT_STORAGE_KEY = "annix_rfq_draft";
const DRAFT_TIMESTAMP_KEY = "annix_rfq_draft_timestamp";
const DRAFT_EXPIRY_DAYS = 7;
// Drafts saved within this window auto-restore silently on mount.
// Older drafts surface the "restore vs start fresh" prompt — they're
// likely from a different session.
const FRESH_RESTORE_WINDOW_MIN = 60;
// Periodic forced flush — bounds worst-case data loss to this many
// seconds even if the user crashes the tab between debounced saves.
const PERIODIC_SAVE_INTERVAL_MS = 30_000;
// Debounce window for typing-rate edits.
const SAVE_DEBOUNCE_MS = 1_000;

export interface RfqDraftData {
  rfqData: any;
  globalSpecs: any;
  currentStep: number;
  entries: any[];
  lastSaved: string;
  customerEmail?: string;
}

export interface UseRfqDraftStorageReturn {
  loadDraft: () => RfqDraftData | null;
  saveDraft: (data: Partial<RfqDraftData>) => void;
  clearDraft: () => void;
  hasDraft: boolean;
  lastSaved: Date | null;
  draftEmail: string | null;
  // True when the most recent draft was saved within the fresh
  // restore window (default 60 minutes). Caller uses this to decide
  // whether to silently auto-restore vs prompt the user.
  isFreshDraft: boolean;
}

export function useRfqDraftStorage(): UseRfqDraftStorageReturn {
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftEmail, setDraftEmail] = useState<string | null>(null);
  const [isFreshDraft, setIsFreshDraft] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Latest pending payload so flush() (unmount, beforeunload, periodic
  // tick) can write the most recent state without waiting for the
  // debounced timer.
  const pendingDataRef = useRef<Partial<RfqDraftData> | null>(null);

  const isExpired = useCallback((timestamp: string): boolean => {
    const savedDate = fromISO(timestamp);
    const expiryDate = savedDate.plus({ days: DRAFT_EXPIRY_DAYS });
    return now() > expiryDate;
  }, []);

  const isFresh = useCallback((timestamp: string): boolean => {
    const savedDate = fromISO(timestamp);
    const ageMin = now().diff(savedDate, "minutes").minutes;
    return ageMin <= FRESH_RESTORE_WINDOW_MIN;
  }, []);

  const loadDraft = useCallback((): RfqDraftData | null => {
    // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
    if (typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!stored) return null;

      const draft: RfqDraftData = JSON.parse(stored);

      if (draft.lastSaved && isExpired(draft.lastSaved)) {
        log.debug("Draft expired, clearing...");
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
        setHasDraft(false);
        return null;
      }

      log.debug("Loaded draft from localStorage:", {
        customerEmail: draft.customerEmail,
        currentStep: draft.currentStep,
        entriesCount: draft.entries?.length,
        lastSaved: draft.lastSaved,
      });

      return draft;
    } catch (error) {
      log.error("Error loading draft from localStorage:", error);
      return null;
    }
  }, [isExpired]);

  // Synchronous write — used by both the debounced timer callback and
  // the unmount / beforeunload / periodic-tick paths. Reads the most
  // recently-queued payload from pendingDataRef so we never lose the
  // last user edit on tab close.
  const flushPending = useCallback(() => {
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    if (typeof window === "undefined") return;
    const data = pendingDataRef.current;
    if (!data) return;
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      const existingDraft: RfqDraftData | null = stored ? JSON.parse(stored) : null;
      const currentTime = nowISO();

      const rawRfqData = data.rfqData;
      const rawGlobalSpecs = data.globalSpecs;
      const rawCurrentStep = data.currentStep;
      const rawEntries = data.entries;
      const rawDataRfqData = data.rfqData;
      const rawDataCustomerEmail = data.customerEmail;
      const rawCustomerEmail = rawDataRfqData ? rawDataRfqData.customerEmail : undefined;
      const existingRfqData = existingDraft ? existingDraft.rfqData : null;
      const existingGlobalSpecs = existingDraft ? existingDraft.globalSpecs : null;
      const existingCurrentStep = existingDraft ? existingDraft.currentStep : null;
      const existingEntries = existingDraft ? existingDraft.entries : null;
      const existingCustomerEmail = existingDraft ? existingDraft.customerEmail : null;

      const draftToSave: RfqDraftData = {
        rfqData: rawRfqData || existingRfqData || {},
        globalSpecs: rawGlobalSpecs || existingGlobalSpecs || {},
        currentStep: rawCurrentStep || existingCurrentStep || 0,
        entries: rawEntries || existingEntries || [],
        lastSaved: currentTime,
        customerEmail:
          rawCustomerEmail || rawDataCustomerEmail || existingCustomerEmail || undefined,
      };

      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftToSave));
      localStorage.setItem(DRAFT_TIMESTAMP_KEY, currentTime);

      setHasDraft(true);
      setLastSaved(fromISO(currentTime).toJSDate());
      const rawCustomerEmail2 = draftToSave.customerEmail;
      setDraftEmail(rawCustomerEmail2 || null);
      setIsFreshDraft(true);

      log.debug("Draft flushed to localStorage:", {
        customerEmail: draftToSave.customerEmail,
        currentStep: draftToSave.currentStep,
        entriesCount: draftToSave.entries?.length,
        lastSaved: currentTime,
      });
    } catch (error) {
      log.error("Error saving draft to localStorage:", error);
    }
  }, []);

  const saveDraft = useCallback(
    (data: Partial<RfqDraftData>) => {
      // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
      if (typeof window === "undefined") return;

      pendingDataRef.current = data;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        flushPending();
        saveTimeoutRef.current = null;
      }, SAVE_DEBOUNCE_MS);
    },
    [flushPending],
  );

  const clearDraft = useCallback(() => {
    // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
      pendingDataRef.current = null;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      setHasDraft(false);
      setLastSaved(null);
      setDraftEmail(null);
      setIsFreshDraft(false);
      log.debug("Draft cleared from localStorage");
    } catch (error) {
      log.error("Error clearing draft from localStorage:", error);
    }
  }, []);

  // Initial load + periodic flush + unmount flush + beforeunload flush.
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setHasDraft(true);
      setLastSaved(draft.lastSaved ? fromISO(draft.lastSaved).toJSDate() : null);
      const rawCustomerEmail3 = draft.customerEmail;
      setDraftEmail(rawCustomerEmail3 || null);
      setIsFreshDraft(draft.lastSaved ? isFresh(draft.lastSaved) : false);
    }

    // beforeunload — flush any pending edit before the tab closes so
    // the last keystroke isn't lost in the debounce window.
    const handleBeforeUnload = () => {
      flushPending();
    };
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    // Periodic forced save — bounds worst-case data loss to
    // PERIODIC_SAVE_INTERVAL_MS (30s) even if a crash kills the tab
    // between debounced saves.
    const periodicTimer = setInterval(() => {
      if (pendingDataRef.current) {
        flushPending();
      }
    }, PERIODIC_SAVE_INTERVAL_MS);

    return () => {
      // CRITICAL: flush on unmount instead of cancelling. The previous
      // implementation called clearTimeout, which dropped the last
      // edit when the user navigated away within the debounce window.
      flushPending();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      clearInterval(periodicTimer);
      // eslint-disable-next-line no-restricted-syntax -- SSR guard
      if (typeof window !== "undefined") {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      }
    };
  }, [loadDraft, flushPending, isFresh]);

  return {
    loadDraft,
    saveDraft,
    clearDraft,
    hasDraft,
    lastSaved,
    draftEmail,
    isFreshDraft,
  };
}

export function formatLastSaved(date: Date | null): string {
  if (!date) return "";

  const savedDt = fromISO(date.toISOString());
  const diff = now().diff(savedDt, ["days", "hours", "minutes"]);
  const diffMins = Math.floor(diff.minutes);
  const diffHours = Math.floor(diff.hours);
  const diffDays = Math.floor(diff.days);

  if (diffMins < 1 && diffHours < 1 && diffDays < 1) return "Just now";
  if (diffHours < 1 && diffDays < 1) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffDays < 1) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
}
