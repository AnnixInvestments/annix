import { useState, useEffect, useCallback, useRef } from 'react';
import { log } from '@/app/lib/logger';

const DRAFT_STORAGE_KEY = 'annix_rfq_draft';
const DRAFT_TIMESTAMP_KEY = 'annix_rfq_draft_timestamp';
const DRAFT_EXPIRY_DAYS = 7;

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
}

export function useRfqDraftStorage(): UseRfqDraftStorageReturn {
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftEmail, setDraftEmail] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isExpired = useCallback((timestamp: string): boolean => {
    const savedDate = new Date(timestamp);
    const expiryDate = new Date(savedDate.getTime() + DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    return new Date() > expiryDate;
  }, []);

  const loadDraft = useCallback((): RfqDraftData | null => {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!stored) return null;

      const draft: RfqDraftData = JSON.parse(stored);

      if (draft.lastSaved && isExpired(draft.lastSaved)) {
        log.debug('Draft expired, clearing...');
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
        setHasDraft(false);
        return null;
      }

      log.debug('Loaded draft from localStorage:', {
        customerEmail: draft.customerEmail,
        currentStep: draft.currentStep,
        entriesCount: draft.entries?.length
      });

      return draft;
    } catch (error) {
      log.error('Error loading draft from localStorage:', error);
      return null;
    }
  }, [isExpired]);

  const saveDraft = useCallback((data: Partial<RfqDraftData>) => {
    if (typeof window === 'undefined') return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const existingDraft = loadDraft();
        const now = new Date().toISOString();

        const draftToSave: RfqDraftData = {
          rfqData: data.rfqData ?? existingDraft?.rfqData ?? {},
          globalSpecs: data.globalSpecs ?? existingDraft?.globalSpecs ?? {},
          currentStep: data.currentStep ?? existingDraft?.currentStep ?? 0,
          entries: data.entries ?? existingDraft?.entries ?? [],
          lastSaved: now,
          customerEmail: data.rfqData?.customerEmail || data.customerEmail || existingDraft?.customerEmail,
        };

        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftToSave));
        localStorage.setItem(DRAFT_TIMESTAMP_KEY, now);

        setHasDraft(true);
        setLastSaved(new Date(now));
        setDraftEmail(draftToSave.customerEmail || null);

        log.debug('Draft saved to localStorage:', {
          customerEmail: draftToSave.customerEmail,
          currentStep: draftToSave.currentStep,
          entriesCount: draftToSave.entries?.length,
        });
      } catch (error) {
        log.error('Error saving draft to localStorage:', error);
      }
    }, 1000);
  }, [loadDraft]);

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
      setHasDraft(false);
      setLastSaved(null);
      setDraftEmail(null);
      log.debug('Draft cleared from localStorage');
    } catch (error) {
      log.error('Error clearing draft from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setHasDraft(true);
      setLastSaved(draft.lastSaved ? new Date(draft.lastSaved) : null);
      setDraftEmail(draft.customerEmail || null);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [loadDraft]);

  return {
    loadDraft,
    saveDraft,
    clearDraft,
    hasDraft,
    lastSaved,
    draftEmail,
  };
}

export function formatLastSaved(date: Date | null): string {
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}
