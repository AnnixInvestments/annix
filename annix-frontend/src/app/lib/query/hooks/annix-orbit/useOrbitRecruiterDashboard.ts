import { useQuery } from "@tanstack/react-query";
import { annixOrbitApiClient, type OrbitRecruiterDashboard } from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitRecruiterDashboard(from: string, to: string) {
  return useQuery<OrbitRecruiterDashboard>({
    queryKey: annixOrbitKeys.recruiterDashboard.range(from, to),
    queryFn: () => annixOrbitApiClient.recruiterDashboard(from, to),
    enabled: from.length === 10 && to.length === 10,
    staleTime: 60 * 1000,
  });
}
