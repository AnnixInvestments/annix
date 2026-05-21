import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type CreateInterviewSlotInput,
  type InterviewSlot,
  type NixCalendarAdvisoryConflict,
  type NixCalendarAdvisoryResponse,
  type SeekerInterviewBooking,
  type SeekerInterviewInvite,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useCvInterviewSlotsForCompany(fromIso?: string | null) {
  return useQuery<InterviewSlot[]>({
    queryKey: annixOrbitKeys.interviewSlots.company(fromIso ?? null),
    queryFn: () => annixOrbitApiClient.interviewSlotsForCompany(fromIso ?? null),
    staleTime: 30 * 1000,
  });
}

export function useCvInterviewSlotsForJob(jobPostingId: number | null) {
  return useQuery<InterviewSlot[]>({
    queryKey: annixOrbitKeys.interviewSlots.job(jobPostingId ?? 0),
    queryFn: () => annixOrbitApiClient.interviewSlotsForJob(jobPostingId as number),
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
      annixOrbitApiClient.createInterviewSlot(jobPostingId, input),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.interviewSlots.all });
      queryClient.invalidateQueries({
        queryKey: annixOrbitKeys.interviewSlots.job(vars.jobPostingId),
      });
    },
  });
}

export function useCvDeleteInterviewSlot() {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: boolean }, Error, number>({
    mutationFn: (slotId) => annixOrbitApiClient.deleteInterviewSlot(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.interviewSlots.all });
    },
  });
}

export function useCvSendInterviewInvite() {
  return useMutation<{ sent: boolean; bookingLink: string }, Error, number>({
    mutationFn: (candidateId) => annixOrbitApiClient.sendInterviewInvite(candidateId),
  });
}

export function useCvMyInterviewBookings() {
  return useQuery<SeekerInterviewBooking[]>({
    queryKey: annixOrbitKeys.individualProfile.interviewBookings(),
    queryFn: () => annixOrbitApiClient.myInterviewBookings(),
    staleTime: 60 * 1000,
  });
}

export function useCvMyInterviewInvites() {
  return useQuery<SeekerInterviewInvite[]>({
    queryKey: annixOrbitKeys.individualProfile.interviewInvites(),
    queryFn: () => annixOrbitApiClient.myInterviewInvites(),
    staleTime: 60 * 1000,
  });
}

export function useCvCalendarAdvisory() {
  return useMutation<NixCalendarAdvisoryResponse, Error, NixCalendarAdvisoryConflict[]>({
    mutationFn: (conflicts) => annixOrbitApiClient.calendarAdvisory(conflicts),
  });
}
