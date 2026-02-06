import { useQuery } from '@tanstack/react-query'
import {
  supplierPortalApi,
  type SupplierDocumentDto,
} from '@/app/lib/api/supplierApi'
import { supplierKeys } from '../../keys'

export function useSupplierDocuments() {
  return useQuery<SupplierDocumentDto[]>({
    queryKey: supplierKeys.documents.list(),
    queryFn: () => supplierPortalApi.getDocuments(),
  })
}
