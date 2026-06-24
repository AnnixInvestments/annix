import { useMutation } from "@tanstack/react-query";
import { annixOrbitApiClient } from "@/app/lib/api/annixOrbitApi";

export function useOrbitDraftMessage() {
  return useMutation({
    mutationFn: (dto: {
      templateKey: string;
      candidateName?: string | null;
      role?: string | null;
      notes?: string | null;
    }) => annixOrbitApiClient.draftMessage(dto),
  });
}

export function useOrbitSendMessage() {
  return useMutation({
    mutationFn: (dto: { to: string; subject: string; body: string; candidateId?: number | null }) =>
      annixOrbitApiClient.sendMessage(dto),
  });
}
