import { useQuery } from '@tanstack/react-query'
import { supplierPortalApi } from '@/app/lib/api/supplierApi'
import { supplierKeys } from '../../keys'

export function useSupplierCapabilities() {
  return useQuery<{ capabilities: string[] }>({
    queryKey: supplierKeys.capabilities.data(),
    queryFn: () => supplierPortalApi.getCapabilities(),
  })
}
