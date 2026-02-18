import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixRepApi,
  type CalendarProvider,
  type ConnectCalendarDto,
  type UpdateCalendarConnectionDto,
} from "@/app/lib/api/annixRepApi";
import { annixRepKeys } from "@/app/lib/query/keys/annixRepKeys";

export function useCalendarConnections() {
  return useQuery({
    queryKey: annixRepKeys.calendars.connections(),
    queryFn: () => annixRepApi.calendars.connections(),
  });
}

export function useCalendarConnection(id: number) {
  return useQuery({
    queryKey: annixRepKeys.calendars.connection(id),
    queryFn: () => annixRepApi.calendars.connection(id),
    enabled: id > 0,
  });
}

export function useAvailableCalendars(connectionId: number) {
  return useQuery({
    queryKey: annixRepKeys.calendars.availableCalendars(connectionId),
    queryFn: () => annixRepApi.calendars.availableCalendars(connectionId),
    enabled: connectionId > 0,
  });
}

export function useCalendarEvents(startDate: string, endDate: string) {
  return useQuery({
    queryKey: annixRepKeys.calendars.events(startDate, endDate),
    queryFn: () => annixRepApi.calendars.events(startDate, endDate),
    enabled: Boolean(startDate && endDate),
  });
}

export function useConnectCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: ConnectCalendarDto) => annixRepApi.calendars.connect(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.calendars.connections() });
    },
  });
}

export function useDisconnectCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => annixRepApi.calendars.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.calendars.connections() });
    },
  });
}

export function useSyncCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ connectionId, fullSync }: { connectionId: number; fullSync?: boolean }) =>
      annixRepApi.calendars.sync(connectionId, fullSync),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.calendars.connections() });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.calendars.all });
    },
  });
}

export function useUpdateCalendarConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateCalendarConnectionDto }) =>
      annixRepApi.calendars.update(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.calendars.connections() });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.calendars.connection(id) });
    },
  });
}

export function useCalendarOAuthUrl() {
  return useMutation({
    mutationFn: ({ provider, redirectUri }: { provider: CalendarProvider; redirectUri: string }) =>
      annixRepApi.calendars.oauthUrl(provider, redirectUri),
  });
}
