import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApiClient, type UpdateCompanyProfileRequest } from "@/app/lib/api/adminApi";
import { adminKeys } from "../../keys/adminKeys";

export function useAnnixCompanyProfile() {
  return useQuery({
    queryKey: adminKeys.companyProfile.detail(),
    queryFn: () => adminApiClient.companyProfile(),
  });
}

export function useUpdateAnnixCompanyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCompanyProfileRequest) => adminApiClient.updateCompanyProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.companyProfile.all });
    },
  });
}
