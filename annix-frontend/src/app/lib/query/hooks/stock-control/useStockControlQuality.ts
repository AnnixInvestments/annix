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

export function useAnalyzeBundlePdf() {
  return useMutation({
    mutationFn: (file: File) => stockControlApiClient.analyzeBundlePdf(file),
  });
}

export function useImportBundlePdf() {
  return useMutation({
    mutationFn: (file: File) => stockControlApiClient.importBundlePdf(file),
  });
}

export function useStartPositectorStreamingSession() {
  return useMutation({
    mutationFn: (
      config: Parameters<typeof stockControlApiClient.startPositectorStreamingSession>[0],
    ) => stockControlApiClient.startPositectorStreamingSession(config),
  });
}

export function useAddPositectorStreamingReading() {
  return useMutation({
    mutationFn: (params: { sessionId: string; data: { value: number } }) =>
      stockControlApiClient.addPositectorStreamingReading(params.sessionId, params.data),
  });
}

export function useEndPositectorStreamingSession() {
  return useMutation({
    mutationFn: (sessionId: string) =>
      stockControlApiClient.endPositectorStreamingSession(sessionId),
  });
}

export function useDiscardPositectorStreamingSession() {
  return useMutation({
    mutationFn: (sessionId: string) =>
      stockControlApiClient.discardPositectorStreamingSession(sessionId),
  });
}

export function useCheckPositectorConnection() {
  return useMutation({
    mutationFn: (deviceId: number) => stockControlApiClient.checkPositectorConnection(deviceId),
  });
}

export function useRegisterPositectorDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof stockControlApiClient.registerPositectorDevice>[0]) =>
      stockControlApiClient.registerPositectorDevice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.positector.all });
    },
  });
}

export function useDeletePositectorDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.deletePositectorDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.positector.all });
    },
  });
}

export function usePositectorBatches() {
  return useMutation({
    mutationFn: (deviceId: number) => stockControlApiClient.positectorBatches(deviceId),
  });
}

export function usePositectorBatchDetail() {
  return useMutation({
    mutationFn: (params: { deviceId: number; buid: string }) =>
      stockControlApiClient.positectorBatch(params.deviceId, params.buid),
  });
}

export function useImportPositectorBatch() {
  return useMutation({
    mutationFn: (params: {
      deviceId: number;
      buid: string;
      data: Parameters<typeof stockControlApiClient.importPositectorBatch>[2];
    }) => stockControlApiClient.importPositectorBatch(params.deviceId, params.buid, params.data),
  });
}

export function useUploadPositectorFile() {
  return useMutation({
    mutationFn: (file: File) => stockControlApiClient.uploadPositectorFile(file),
  });
}

export function useLinkPositectorUpload() {
  return useMutation({
    mutationFn: (params: {
      uploadId: number;
      data: Parameters<typeof stockControlApiClient.linkPositectorUpload>[1];
    }) => stockControlApiClient.linkPositectorUpload(params.uploadId, params.data),
  });
}

export function usePositectorUploadDownloadUrl() {
  return useMutation({
    mutationFn: (uploadId: number) => stockControlApiClient.positectorUploadDownloadUrl(uploadId),
  });
}

export function usePositectorStreamingSessions() {
  return useMutation({
    mutationFn: () => stockControlApiClient.positectorStreamingSessions(),
  });
}

export function usePositectorStreamingSessionDetail() {
  return useMutation({
    mutationFn: (sessionId: string) => stockControlApiClient.positectorStreamingSession(sessionId),
  });
}

export function positectorStreamingEventsUrl(sessionId: string): string {
  return stockControlApiClient.positectorStreamingEventsUrl(sessionId);
}

export function positectorWebhookUrl(companyId: number, deviceId: number): string {
  return stockControlApiClient.positectorWebhookUrl(companyId, deviceId);
}

export function useJobCardCoatingAnalysis() {
  return useMutation({
    mutationFn: (jobCardId: number) => stockControlApiClient.jobCardCoatingAnalysis(jobCardId),
  });
}

export function useRubberStockOptions() {
  return useMutation({
    mutationFn: (jobCardId: number) => stockControlApiClient.rubberStockOptions(jobCardId),
  });
}
