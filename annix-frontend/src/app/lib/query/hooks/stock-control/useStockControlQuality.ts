import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BlastProfileWithJobCard,
  DataBookStatus,
  DftReadingWithJobCard,
  EnvironmentalRecordWithJobCard,
  IssuanceBatchRecord,
  PositectorDevice,
  ShoreHardnessWithJobCard,
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

export function useAllShoreHardnessRecords() {
  return useQuery<ShoreHardnessWithJobCard[]>({
    queryKey: stockControlKeys.shoreHardness.list(),
    queryFn: async () => {
      const data = await stockControlApiClient.allShoreHardnessRecords();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useDeleteShoreHardness() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id: number) => stockControlApiClient.deleteShoreHardnessById(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.shoreHardness.all });
    },
  });
}

export function useAllEnvironmentalRecords() {
  return useQuery<EnvironmentalRecordWithJobCard[]>({
    queryKey: stockControlKeys.environmentalRecords.list(),
    queryFn: async () => {
      const data = await stockControlApiClient.allEnvironmentalRecords();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useDeleteEnvironmentalRecord() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id: number) => stockControlApiClient.deleteEnvironmentalRecordById(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.environmentalRecords.all });
    },
  });
}

export function useAllBlastProfiles() {
  return useQuery<BlastProfileWithJobCard[]>({
    queryKey: stockControlKeys.blastProfiles.list(),
    queryFn: async () => {
      const data = await stockControlApiClient.allBlastProfiles();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useDeleteBlastProfile() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id: number) => stockControlApiClient.deleteBlastProfileById(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.blastProfiles.all });
    },
  });
}

export function useAllDftReadings() {
  return useQuery<DftReadingWithJobCard[]>({
    queryKey: stockControlKeys.dftReadings.list(),
    queryFn: async () => {
      const data = await stockControlApiClient.allDftReadings();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useDeleteDftReading() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id: number) => stockControlApiClient.deleteDftReadingById(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.dftReadings.all });
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
