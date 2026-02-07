import { useQuery } from "@tanstack/react-query";
import { type CustomerDocument, customerDocumentApi } from "@/app/lib/api/customerApi";
import { customerKeys } from "../../keys";

export function useCustomerDocuments() {
  return useQuery<CustomerDocument[]>({
    queryKey: customerKeys.documents.list(),
    queryFn: () => customerDocumentApi.getDocuments(),
  });
}
