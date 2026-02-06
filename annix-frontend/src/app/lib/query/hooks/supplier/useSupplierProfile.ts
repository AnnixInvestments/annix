import { useQuery } from '@tanstack/react-query'
import { supplierPortalApi } from '@/app/lib/api/supplierApi'
import { supplierKeys } from '../../keys'

export function useSupplierProfile() {
  return useQuery({
    queryKey: supplierKeys.profile.data(),
    queryFn: () => supplierPortalApi.getProfile(),
  })
}
