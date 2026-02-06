import { useQuery } from '@tanstack/react-query'
import {
  customerPortalApi,
  type CustomerDashboardResponse,
} from '@/app/lib/api/customerApi'
import { draftsApi, type RfqDraftResponse } from '@/app/lib/api/client'
import { customerKeys } from '../../keys'

export function useCustomerDashboard() {
  return useQuery<CustomerDashboardResponse>({
    queryKey: customerKeys.dashboard.data(),
    queryFn: () => customerPortalApi.getDashboard(),
  })
}

export function useCustomerDrafts() {
  return useQuery<RfqDraftResponse[]>({
    queryKey: customerKeys.drafts.list(),
    queryFn: () => draftsApi.getAll(),
  })
}
