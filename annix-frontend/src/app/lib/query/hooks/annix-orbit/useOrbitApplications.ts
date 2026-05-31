import { useQuery } from "@tanstack/react-query";
import { annixOrbitApiClient, type SeekerApplication } from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitSeekerApplications(enabled: boolean = true) {
  return useQuery<SeekerApplication[]>({
    queryKey: annixOrbitKeys.seekerApplications.list(),
    queryFn: () => annixOrbitApiClient.listMyApplications().then((res) => res.applications),
    enabled,
    staleTime: 60 * 1000,
  });
}
