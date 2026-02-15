import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CalendarProvider,
  type ConnectCalendarDto,
  fieldflowApi,
  type UpdateCalendarConnectionDto,
} from "@/app/lib/api/fieldflowApi";
import { fieldflowKeys } from "@/app/lib/query/keys/fieldflowKeys";

export function useCalendarConnections() {
  return useQuery({
    queryKey: fieldflowKeys.calendars.connections(),
    queryFn: () => fieldflowApi.calendars.connections(),
  });
}

export function useCalendarConnection(id: number) {
  return useQuery({
    queryKey: fieldflowKeys.calendars.connection(id),
    queryFn: () => fieldflowApi.calendars.connection(id),
    enabled: id > 0,
  });
}

export function useAvailableCalendars(connectionId: number) {
  return useQuery({
    queryKey: fieldflowKeys.calendars.availableCalendars(connectionId),
    queryFn: () => fieldflowApi.calendars.availableCalendars(connectionId),
    enabled: connectionId > 0,
  });
}

export function useCalendarEvents(startDate: string, endDate: string) {
  return useQuery({
    queryKey: fieldflowKeys.calendars.events(startDate, endDate),
    queryFn: () => fieldflowApi.calendars.events(startDate, endDate),
    enabled: Boolean(startDate && endDate),
  });
}

export function useConnectCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: ConnectCalendarDto) => fieldflowApi.calendars.connect(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.calendars.connections() });
    },
  });
}

export function useDisconnectCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => fieldflowApi.calendars.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.calendars.connections() });
    },
  });
}

export function useSyncCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ connectionId, fullSync }: { connectionId: number; fullSync?: boolean }) =>
      fieldflowApi.calendars.sync(connectionId, fullSync),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.calendars.connections() });
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.calendars.all });
    },
  });
}

export function useUpdateCalendarConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateCalendarConnectionDto }) =>
      fieldflowApi.calendars.update(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.calendars.connections() });
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.calendars.connection(id) });
    },
  });
}

export function useCalendarOAuthUrl() {
  return useMutation({
    mutationFn: ({ provider, redirectUri }: { provider: CalendarProvider; redirectUri: string }) =>
      fieldflowApi.calendars.oauthUrl(provider, redirectUri),
  });
}
