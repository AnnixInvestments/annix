"use client";

import { useEffect, useRef, useState } from "react";
import type { UpdateJobWizardPayload } from "@/app/lib/api/cvAssistantApi";
import { useCvUpdateJobWizard } from "@/app/lib/query/hooks";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 700;

export interface UseWizardAutoSaveResult {
  status: AutoSaveStatus;
  schedule: (patch: UpdateJobWizardPayload) => void;
  flush: () => Promise<void>;
}

/**
 * Debounced auto-save for the wizard. Each call to `schedule()` queues
 * (and merges) a partial payload; the latest queued patch fires after
 * DEBOUNCE_MS of quiet. `flush()` immediately persists whatever's queued
 * and resolves once the network round-trip completes — used on step
 * transitions and explicit publish.
 */
export function useWizardAutoSave(jobId: number | null): UseWizardAutoSaveResult {
  const updateMutation = useCvUpdateJobWizard();
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const queuedPatchRef = useRef<UpdateJobWizardPayload | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const persist = async (id: number, patch: UpdateJobWizardPayload) => {
    setStatus("saving");
    try {
      await updateMutation.mutateAsync({ id, payload: patch });
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  const flush = async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const patch = queuedPatchRef.current;
    queuedPatchRef.current = null;
    if (!patch || !jobId) return;
    await persist(jobId, patch);
  };

  const schedule = (patch: UpdateJobWizardPayload) => {
    if (!jobId) return;
    const previous = queuedPatchRef.current;
    const base = previous ? previous : {};
    queuedPatchRef.current = {
      ...base,
      ...patch,
    };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const queued = queuedPatchRef.current;
      queuedPatchRef.current = null;
      timerRef.current = null;
      if (!queued || !jobId) return;
      void persist(jobId, queued);
    }, DEBOUNCE_MS);
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { status, schedule, flush };
}
