import { useQuery } from '@tanstack/react-query'
import {
  customerDocumentApi,
  type CustomerDocument,
} from '@/app/lib/api/customerApi'
import { customerKeys } from '../../keys'

export function useCustomerDocuments() {
  return useQuery<CustomerDocument[]>({
    queryKey: customerKeys.documents.list(),
    queryFn: () => customerDocumentApi.getDocuments(),
  })
}
