import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApiClient,
  type CustomerDetail,
  type CustomerDocument,
  type CustomFieldValue,
  type LoginHistoryItem,
  type ReactivateCustomerDto,
  type ResetDeviceBindingDto,
  type SuspendCustomerDto,
} from "@/app/lib/api/adminApi";
import { adminKeys } from "../../keys";

export function useAdminCustomerDetail(id: number) {
  return useQuery<CustomerDetail>({
    queryKey: adminKeys.customers.detail(id),
    queryFn: () => adminApiClient.getCustomerDetail(id),
    enabled: id > 0,
  });
}

export function useAdminCustomerLoginHistory(id: number) {
  return useQuery<LoginHistoryItem[]>({
    queryKey: adminKeys.customers.loginHistory(id),
    queryFn: () => adminApiClient.getCustomerLoginHistory(id, 20),
    enabled: id > 0,
  });
}

export function useAdminCustomerDocuments(id: number) {
  return useQuery<CustomerDocument[]>({
    queryKey: adminKeys.customers.documents(id),
    queryFn: () => adminApiClient.getCustomerDocuments(id),
    enabled: id > 0,
  });
}

export function useAdminCustomerRfqs(customerId: number) {
  return useQuery({
    queryKey: [...adminKeys.rfqs.all, "byCustomer", customerId] as const,
    queryFn: () => adminApiClient.listRfqs({ customerId, limit: 100 }),
    enabled: customerId > 0,
    select: (data) => data.items,
  });
}

export function useAdminCustomerCustomFields(id: number) {
  return useQuery<{ fields: CustomFieldValue[] }>({
    queryKey: adminKeys.customers.customFields(id),
    queryFn: () => adminApiClient.customFieldValues("customer", id),
    enabled: id > 0,
  });
}

export function useSuspendCustomer(customerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SuspendCustomerDto) => adminApiClient.suspendCustomer(customerId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.customers.detail(customerId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.customers.all });
    },
  });
}

export function useReactivateCustomer(customerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: ReactivateCustomerDto) => adminApiClient.reactivateCustomer(customerId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.customers.detail(customerId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.customers.all });
    },
  });
}

export function useResetDeviceBinding(customerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: ResetDeviceBindingDto) => adminApiClient.resetDeviceBinding(customerId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.customers.detail(customerId) });
    },
  });
}
