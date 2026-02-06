import { useQuery } from '@tanstack/react-query'
import {
  adminApiClient,
  type CustomerDetail,
  type LoginHistoryItem,
  type CustomerDocument,
  type AdminRfqListItem,
  type CustomFieldValue,
} from '@/app/lib/api/adminApi'
import { adminKeys } from '../../keys'

export function useAdminCustomerDetail(id: number) {
  return useQuery<CustomerDetail>({
    queryKey: adminKeys.customers.detail(id),
    queryFn: () => adminApiClient.getCustomerDetail(id),
    enabled: id > 0,
  })
}

export function useAdminCustomerLoginHistory(id: number) {
  return useQuery<LoginHistoryItem[]>({
    queryKey: adminKeys.customers.loginHistory(id),
    queryFn: () => adminApiClient.getCustomerLoginHistory(id, 20),
    enabled: id > 0,
  })
}

export function useAdminCustomerDocuments(id: number) {
  return useQuery<CustomerDocument[]>({
    queryKey: adminKeys.customers.documents(id),
    queryFn: () => adminApiClient.getCustomerDocuments(id),
    enabled: id > 0,
  })
}

export function useAdminCustomerRfqs(customerId: number) {
  return useQuery({
    queryKey: [...adminKeys.rfqs.all, 'byCustomer', customerId] as const,
    queryFn: () => adminApiClient.listRfqs({ customerId, limit: 100 }),
    enabled: customerId > 0,
    select: (data) => data.items,
  })
}

export function useAdminCustomerCustomFields(id: number) {
  return useQuery<{ fields: CustomFieldValue[] }>({
    queryKey: adminKeys.customers.customFields(id),
    queryFn: () => adminApiClient.customFieldValues('customer', id),
    enabled: id > 0,
  })
}
