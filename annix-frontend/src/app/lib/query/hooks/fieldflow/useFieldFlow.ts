import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CreateMeetingDto,
  type CreateProspectDto,
  type CreateVisitDto,
  type FieldFlowDashboard,
  fieldflowApi,
  type Meeting,
  type Prospect,
  type ProspectStatus,
  type Visit,
  type VisitOutcome,
} from "@/app/lib/api/fieldflowApi";
import { fieldflowKeys } from "../../keys/fieldflowKeys";

export function useFieldFlowDashboard() {
  return useQuery<FieldFlowDashboard>({
    queryKey: fieldflowKeys.dashboard.data(),
    queryFn: () => fieldflowApi.dashboard(),
  });
}

export function useProspects() {
  return useQuery<Prospect[]>({
    queryKey: fieldflowKeys.prospects.list(),
    queryFn: () => fieldflowApi.prospects.list(),
  });
}

export function useProspectsByStatus(status: ProspectStatus) {
  return useQuery<Prospect[]>({
    queryKey: fieldflowKeys.prospects.listByStatus(status),
    queryFn: () => fieldflowApi.prospects.listByStatus(status),
  });
}

export function useProspect(id: number) {
  return useQuery<Prospect>({
    queryKey: fieldflowKeys.prospects.detail(id),
    queryFn: () => fieldflowApi.prospects.detail(id),
    enabled: id > 0,
  });
}

export function useNearbyProspects(lat: number, lng: number, radiusKm?: number, limit?: number) {
  return useQuery<Prospect[]>({
    queryKey: fieldflowKeys.prospects.nearby(lat, lng, radiusKm),
    queryFn: () => fieldflowApi.prospects.nearby(lat, lng, radiusKm, limit),
    enabled: lat !== 0 && lng !== 0,
  });
}

export function useProspectStats() {
  return useQuery<Record<ProspectStatus, number>>({
    queryKey: fieldflowKeys.prospects.stats(),
    queryFn: () => fieldflowApi.prospects.stats(),
  });
}

export function useFollowUpsDue() {
  return useQuery<Prospect[]>({
    queryKey: fieldflowKeys.prospects.followUps(),
    queryFn: () => fieldflowApi.prospects.followUpsDue(),
  });
}

export function useCreateProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateProspectDto) => fieldflowApi.prospects.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.prospects.all });
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.dashboard.all });
    },
  });
}

export function useUpdateProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateProspectDto> }) =>
      fieldflowApi.prospects.update(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.prospects.detail(id) });
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.prospects.list() });
    },
  });
}

export function useUpdateProspectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ProspectStatus }) =>
      fieldflowApi.prospects.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.prospects.all });
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.dashboard.all });
    },
  });
}

export function useMarkContacted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => fieldflowApi.prospects.markContacted(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.prospects.detail(id) });
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.prospects.list() });
    },
  });
}

export function useDeleteProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => fieldflowApi.prospects.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.prospects.all });
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.dashboard.all });
    },
  });
}

export function useMeetings() {
  return useQuery<Meeting[]>({
    queryKey: fieldflowKeys.meetings.list(),
    queryFn: () => fieldflowApi.meetings.list(),
  });
}

export function useTodaysMeetings() {
  return useQuery<Meeting[]>({
    queryKey: fieldflowKeys.meetings.today(),
    queryFn: () => fieldflowApi.meetings.today(),
  });
}

export function useUpcomingMeetings(days?: number) {
  return useQuery<Meeting[]>({
    queryKey: fieldflowKeys.meetings.upcoming(days),
    queryFn: () => fieldflowApi.meetings.upcoming(days),
  });
}

export function useMeeting(id: number) {
  return useQuery<Meeting>({
    queryKey: fieldflowKeys.meetings.detail(id),
    queryFn: () => fieldflowApi.meetings.detail(id),
    enabled: id > 0,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateMeetingDto) => fieldflowApi.meetings.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.meetings.all });
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.dashboard.all });
    },
  });
}

export function useStartMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => fieldflowApi.meetings.start(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.meetings.detail(id) });
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.meetings.all });
    },
  });
}

export function useEndMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes, outcomes }: { id: number; notes?: string; outcomes?: string }) =>
      fieldflowApi.meetings.end(id, notes, outcomes),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.meetings.detail(id) });
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.meetings.all });
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.dashboard.all });
    },
  });
}

export function useCancelMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => fieldflowApi.meetings.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.meetings.all });
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.dashboard.all });
    },
  });
}

export function useVisits() {
  return useQuery<Visit[]>({
    queryKey: fieldflowKeys.visits.list(),
    queryFn: () => fieldflowApi.visits.list(),
  });
}

export function useTodaysVisits() {
  return useQuery<Visit[]>({
    queryKey: fieldflowKeys.visits.today(),
    queryFn: () => fieldflowApi.visits.today(),
  });
}

export function useProspectVisits(prospectId: number) {
  return useQuery<Visit[]>({
    queryKey: fieldflowKeys.visits.byProspect(prospectId),
    queryFn: () => fieldflowApi.visits.byProspect(prospectId),
    enabled: prospectId > 0,
  });
}

export function useCreateVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateVisitDto) => fieldflowApi.visits.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.visits.all });
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.dashboard.all });
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      latitude,
      longitude,
    }: {
      id: number;
      latitude: number;
      longitude: number;
    }) => fieldflowApi.visits.checkIn(id, latitude, longitude),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.visits.all });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      latitude,
      longitude,
      outcome,
      notes,
    }: {
      id: number;
      latitude: number;
      longitude: number;
      outcome?: VisitOutcome;
      notes?: string;
    }) => fieldflowApi.visits.checkOut(id, latitude, longitude, outcome, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.visits.all });
    },
  });
}
