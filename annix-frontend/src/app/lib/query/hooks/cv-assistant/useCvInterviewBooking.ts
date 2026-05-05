import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CreateInterviewSlotInput,
  cvAssistantApiClient,
  type InterviewSlot,
  type SeekerInterviewBooking,
  type SeekerInterviewInvite,
} from "@/app/lib/api/cvAssistantApi";
import { cvAssistantKeys } from "../../keys";

export function useCvInterviewSlotsForCompany(fromIso?: string | null) {
  return useQuery<InterviewSlot[]>({
    queryKey: cvAssistantKeys.interviewSlots.company(fromIso ?? null),
    queryFn: () => cvAssistantApiClient.interviewSlotsForCompany(fromIso ?? null),
    staleTime: 30 * 1000,
  });
}

export function useCvInterviewSlotsForJob(jobPostingId: number | null) {
  return useQuery<InterviewSlot[]>({
    queryKey: cvAssistantKeys.interviewSlots.job(jobPostingId ?? 0),
    queryFn: () => cvAssistantApiClient.interviewSlotsForJob(jobPostingId as number),
    enabled: jobPostingId != null && jobPostingId > 0,
    staleTime: 30 * 1000,
  });
}

export function useCvCreateInterviewSlot() {
  const queryClient = useQueryClient();
  return useMutation<
    InterviewSlot,
    Error,
    { jobPostingId: number; input: CreateInterviewSlotInput }
  >({
    mutationFn: ({ jobPostingId, input }) =>
      cvAssistantApiClient.createInterviewSlot(jobPostingId, input),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.interviewSlots.all });
      queryClient.invalidateQueries({
        queryKey: cvAssistantKeys.interviewSlots.job(vars.jobPostingId),
      });
    },
  });
}

export function useCvDeleteInterviewSlot() {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: boolean }, Error, number>({
    mutationFn: (slotId) => cvAssistantApiClient.deleteInterviewSlot(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.interviewSlots.all });
    },
  });
}

export function useCvSendInterviewInvite() {
  return useMutation<{ sent: boolean; bookingLink: string }, Error, number>({
    mutationFn: (candidateId) => cvAssistantApiClient.sendInterviewInvite(candidateId),
  });
}

export function useCvMyInterviewBookings() {
  return useQuery<SeekerInterviewBooking[]>({
    queryKey: cvAssistantKeys.individualProfile.interviewBookings(),
    queryFn: () => cvAssistantApiClient.myInterviewBookings(),
    staleTime: 60 * 1000,
  });
}

export function useCvMyInterviewInvites() {
  return useQuery<SeekerInterviewInvite[]>({
    queryKey: cvAssistantKeys.individualProfile.interviewInvites(),
    queryFn: () => cvAssistantApiClient.myInterviewInvites(),
    staleTime: 60 * 1000,
  });
}
