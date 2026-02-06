import { useQuery } from '@tanstack/react-query'
import {
  customerPortalApi,
  type CustomerProfileResponse,
} from '@/app/lib/api/customerApi'
import { customerKeys } from '../../keys'

export function useCustomerProfile() {
  return useQuery<CustomerProfileResponse>({
    queryKey: customerKeys.profile.data(),
    queryFn: () => customerPortalApi.getProfile(),
  })
}
