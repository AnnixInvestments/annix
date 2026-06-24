import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type CreateInterviewSlotInput,
  type InterviewPrepPack,
  type InterviewSlot,
  type NixCalendarAdvisoryConflict,
  type NixCalendarAdvisoryResponse,
  type PublicInterviewBookingLookup,
  type SeekerInterviewBooking,
  type SeekerInterviewInvite,
} from "@/app/lib/api/annixOrbitApi";
import { isApiError } from "@/app/lib/api/apiError";
import { annixOrbitKeys } from "../../keys";

export function useOrbitInterviewSlotsForCompany(fromIso?: string | null) {
  return useQuery<InterviewSlot[]>({
    queryKey: annixOrbitKeys.interviewSlots.company(fromIso ?? null),
    queryFn: () => annixOrbitApiClient.interviewSlotsForCompany(fromIso ?? null),
    staleTime: 30 * 1000,
  });
}

export function useOrbitInterviewSlotsForJob(jobPostingId: number | null) {
  return useQuery<InterviewSlot[]>({
    queryKey: annixOrbitKeys.interviewSlots.job(jobPostingId ?? 0),
    queryFn: () => annixOrbitApiClient.interviewSlotsForJob(jobPostingId as number),
    enabled: jobPostingId != null && jobPostingId > 0,
    staleTime: 30 * 1000,
  });
}

export function useOrbitCreateInterviewSlot() {
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

export function useOrbitDeleteInterviewSlot() {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: boolean }, Error, number>({
    mutationFn: (slotId) => annixOrbitApiClient.deleteInterviewSlot(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.interviewSlots.all });
    },
  });
}

export function useOrbitSendInterviewInvite() {
  return useMutation<{ sent: boolean; bookingLink: string }, Error, number>({
    mutationFn: (candidateId) => annixOrbitApiClient.sendInterviewInvite(candidateId),
  });
}

export function useOrbitMyInterviewBookings() {
  return useQuery<SeekerInterviewBooking[]>({
    queryKey: annixOrbitKeys.individualProfile.interviewBookings(),
    queryFn: () => annixOrbitApiClient.myInterviewBookings(),
    staleTime: 60 * 1000,
  });
}

export function useOrbitMyInterviewInvites() {
  return useQuery<SeekerInterviewInvite[]>({
    queryKey: annixOrbitKeys.individualProfile.interviewInvites(),
    queryFn: () => annixOrbitApiClient.myInterviewInvites(),
    staleTime: 60 * 1000,
  });
}

export function useOrbitCalendarAdvisory() {
  return useMutation<NixCalendarAdvisoryResponse, Error, NixCalendarAdvisoryConflict[]>({
    mutationFn: (conflicts) => annixOrbitApiClient.calendarAdvisory(conflicts),
  });
}

export function useInterviewPrepGenerate() {
  return useMutation<InterviewPrepPack, Error, number>({
    mutationFn: (interviewId) => annixOrbitApiClient.interviewPrepGenerate(interviewId),
  });
}

export function usePublicInterviewBooking(token: string) {
  return useQuery<PublicInterviewBookingLookup>({
    queryKey: annixOrbitKeys.publicInterviewBooking.byToken(token),
    queryFn: () => annixOrbitApiClient.publicInterviewBookingLookup(token),
    enabled: token.length > 0,
    staleTime: 30 * 1000,
    retry: (failureCount, error) => {
      // A 4xx means the token itself is the problem (invalid / used / expired) —
      // retrying never helps. Only retry transient server / network errors.
      if (isApiError(error) && error.status < 500) return false;
      return failureCount < 2;
    },
  });
}

export function usePublicBookInterviewSlot(token: string) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; slotId: number; status: string }, Error, number>({
    mutationFn: (slotId) => annixOrbitApiClient.publicBookInterviewSlot(token, slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: annixOrbitKeys.publicInterviewBooking.byToken(token),
      });
    },
  });
}

export function usePublicCancelInterviewBooking(token: string) {
  const queryClient = useQueryClient();
  return useMutation<{ cancelled: boolean }, Error, number>({
    mutationFn: (bookingId) => annixOrbitApiClient.publicCancelInterviewBooking(token, bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: annixOrbitKeys.publicInterviewBooking.byToken(token),
      });
    },
  });
}
