import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type ReminderPreferences,
  type UpdateReminderPreferencesInput,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitReminderPreferences(enabled: boolean = true) {
  return useQuery<ReminderPreferences>({
    queryKey: annixOrbitKeys.seekerReminderPreferences.detail(),
    queryFn: () => annixOrbitApiClient.reminderPreferences(),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useOrbitUpdateReminderPreferences() {
  const queryClient = useQueryClient();
  return useMutation<ReminderPreferences, Error, UpdateReminderPreferencesInput>({
    mutationFn: (input) => annixOrbitApiClient.updateReminderPreferences(input),
    onSuccess: (data) => {
      queryClient.setQueryData(annixOrbitKeys.seekerReminderPreferences.detail(), data);
    },
  });
}
