import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type CreateSeekerInterviewEventInput,
  type SeekerInterviewEvent,
  type UpdateSeekerInterviewEventInput,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitSeekerInterviewEvents(enabled: boolean = true) {
  return useQuery<SeekerInterviewEvent[]>({
    queryKey: annixOrbitKeys.seekerInterviewEvents.list(),
    queryFn: () => annixOrbitApiClient.listMyInterviewEvents().then((res) => res.events),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useOrbitCreateSeekerInterviewEvent() {
  const queryClient = useQueryClient();
  return useMutation<{ event: SeekerInterviewEvent }, Error, CreateSeekerInterviewEventInput>({
    mutationFn: (input) => annixOrbitApiClient.createMyInterviewEvent(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerInterviewEvents.all });
    },
  });
}

export function useOrbitUpdateSeekerInterviewEvent() {
  const queryClient = useQueryClient();
  return useMutation<
    { event: SeekerInterviewEvent },
    Error,
    { id: number; input: UpdateSeekerInterviewEventInput }
  >({
    mutationFn: ({ id, input }) => annixOrbitApiClient.updateMyInterviewEvent(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerInterviewEvents.all });
    },
  });
}

export function useOrbitDeleteSeekerInterviewEvent() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) => annixOrbitApiClient.deleteMyInterviewEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerInterviewEvents.all });
    },
  });
}
