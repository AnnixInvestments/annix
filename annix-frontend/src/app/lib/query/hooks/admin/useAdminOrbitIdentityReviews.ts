import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApiClient, type OrbitIdentityReview } from "@/app/lib/api/adminApi";
import { adminKeys } from "@/app/lib/query/keys/adminKeys";

export function useAdminOrbitIdentityReviews() {
  return useQuery<OrbitIdentityReview[]>({
    queryKey: adminKeys.orbitIdentityReviews.list(),
    queryFn: () => adminApiClient.orbitIdentityReviews(),
    staleTime: 60 * 1000,
  });
}

export function useAdminResolveOrbitIdentityReview() {
  const queryClient = useQueryClient();
  return useMutation<
    { status: string },
    Error,
    { profileId: number; action: "approve" | "reject" }
  >({
    mutationFn: (input) => adminApiClient.resolveOrbitIdentityReview(input.profileId, input.action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitIdentityReviews.all });
    },
  });
}
