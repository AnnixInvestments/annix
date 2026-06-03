import { useQuery } from "@tanstack/react-query";
import { annixOrbitApiClient } from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitCalendarFeed(enabled: boolean) {
  return useQuery<{ token: string }>({
    queryKey: annixOrbitKeys.seekerCalendarFeed.detail(),
    queryFn: () => annixOrbitApiClient.calendarFeedToken(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
