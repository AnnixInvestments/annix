import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DataBookStatus,
  IssuanceBatchRecord,
  PositectorDevice,
  SupplierCertificate,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { stockControlKeys } from "../../keys/stockControlKeys";

export function usePositectorDevices() {
  return useQuery<PositectorDevice[]>({
    queryKey: stockControlKeys.positector.devices(),
    queryFn: async () => {
      const data = await stockControlApiClient.positectorDevices({ active: true });
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useInvalidatePositectorDevices() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.positector.all });
}

export function useSearchDataBook() {
  return useMutation<
    { status: DataBookStatus; certs: SupplierCertificate[]; batchRecords: IssuanceBatchRecord[] },
    Error,
    number
  >({
    mutationFn: async (jobCardId: number) => {
      const [status, certs, batchRecords] = await Promise.all([
        stockControlApiClient.dataBookStatus(jobCardId),
        stockControlApiClient.certificatesForJobCard(jobCardId),
        stockControlApiClient.batchRecordsForJobCard(jobCardId),
      ]);
      return { status, certs, batchRecords };
    },
  });
}

export function useCompileDataBook() {
  return useMutation<{ certificateCount: number }, Error, number>({
    mutationFn: (jobCardId: number) => stockControlApiClient.compileDataBook(jobCardId),
  });
}

export function useSearchBatch() {
  return useMutation<
    { certificates: SupplierCertificate[]; batchRecords: IssuanceBatchRecord[] },
    Error,
    string
  >({
    mutationFn: async (batchNumber: string) => {
      const [certificates, batchRecords] = await Promise.all([
        stockControlApiClient.certificatesByBatchNumber(batchNumber),
        stockControlApiClient.batchRecordsByBatchNumber(batchNumber),
      ]);
      return { certificates, batchRecords };
    },
  });
}
