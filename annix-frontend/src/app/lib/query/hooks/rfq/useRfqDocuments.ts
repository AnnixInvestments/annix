import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type RfqDocument, rfqDocumentApi } from "@/app/lib/api/client";
import { rfqKeys } from "../../keys";

export function useUploadRfqDocument(rfqId: number) {
  const queryClient = useQueryClient();

  return useMutation<RfqDocument, Error, File>({
    mutationFn: (file) => rfqDocumentApi.upload(rfqId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.detail(rfqId) });
    },
  });
}

export function useDeleteRfqDocument(rfqId: number) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: (documentId) => rfqDocumentApi.delete(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.detail(rfqId) });
    },
  });
}
