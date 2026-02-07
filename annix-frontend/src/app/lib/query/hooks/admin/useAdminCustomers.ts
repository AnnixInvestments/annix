import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApiClient,
  type CustomerListResponse,
  type CustomerQueryDto,
} from "@/app/lib/api/adminApi";
import { adminKeys } from "../../keys";

export function useAdminCustomers(params?: CustomerQueryDto) {
  return useQuery<CustomerListResponse>({
    queryKey: adminKeys.customers.list(params),
    queryFn: () => adminApiClient.listCustomers(params),
  });
}

export function useInviteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, message }: { email: string; message?: string }) =>
      adminApiClient.inviteCustomer(email, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.customers.all });
    },
  });
}
