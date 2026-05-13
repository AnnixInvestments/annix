"use client";

import { useMutation } from "@tanstack/react-query";
import type { QuotePdfSnapshotDto } from "./useNix";

export interface ConvertToJobCardResultDto {
  jobCardId: number;
}

export interface ConvertToJobCardInput {
  sessionId: number;
  snapshot: QuotePdfSnapshotDto;
  jobNumber: string;
  jobName: string;
  dueDate?: string | null;
  siteLocation?: string | null;
  contactPerson?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  [key: string]: unknown;
}

export function useConvertQuoteToJobCard() {
  return useMutation<ConvertToJobCardResultDto, Error, ConvertToJobCardInput>({
    mutationFn: async () => {
      throw new Error("useConvertQuoteToJobCard is not yet wired — backend endpoint pending");
    },
  });
}
