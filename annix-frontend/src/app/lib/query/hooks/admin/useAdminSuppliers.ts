import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApiClient } from "@/app/lib/api/adminApi";
import { adminKeys } from "../../keys";

interface SupplierQueryParams {
  page?: number;
  limit?: number;
  status?: string;
}

export function useAdminSuppliers(params?: SupplierQueryParams) {
  return useQuery({
    queryKey: adminKeys.suppliers.list(params),
    queryFn: () => adminApiClient.listSuppliers(params),
  });
}

export function useInviteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, message }: { email: string; message?: string }) =>
      adminApiClient.inviteSupplier(email, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.suppliers.all });
    },
  });
}
