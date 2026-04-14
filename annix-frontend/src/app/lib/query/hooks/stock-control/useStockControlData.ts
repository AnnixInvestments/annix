import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type {
  AddCpoItemRequest,
  AnalyzedDeliveryNoteData,
  CalibrationCertificate,
  CoatingAnalysis,
  CostByJob,
  CpoCalloffBreakdown,
  CpoCalloffRecord,
  CpoDeliveryHistory,
  CpoFulfillmentReportItem,
  CpoOverdueInvoiceItem,
  CustomerPurchaseOrder,
  DeliveryNote,
  DispatchProgress,
  DispatchScan,
  ImportMappingConfig,
  InspectionBooking,
  JobCard,
  JobCardActionCompletion,
  JobCardApproval,
  JobCardImportRow,
  QcControlPlanRecord,
  Requisition,
  StaffMember,
  StaffStockFilters,
  StaffStockReportResult,
  StockAllocation,
  StockControlDepartment,
  StockControlLocation,
  StockControlSupplierDto,
  StockItem,
  StockMovement,
  StockValuation,
  SupplierCertificate,
  SupplierInvoice,
  UpdateCpoItemRequest,
  WorkflowNotification,
  WorkflowStatus,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import {
  createArrayQueryHook,
  createInvalidationHook,
  createMutationHook,
  createQueryHook,
} from "../../factories";
import { stockControlKeys } from "../../keys/stockControlKeys";

export function useJobCards(status?: string) {
  return useQuery<JobCard[]>({
    queryKey: stockControlKeys.jobCards.list(status),
    queryFn: async () => {
      const data = await stockControlApiClient.jobCards(status === "all" ? undefined : status);
      return Array.isArray(data) ? data : [];
    },
  });
}

export const useDataBookStatuses = createQueryHook<
  Record<number, { exists: boolean; isStale: boolean; certificateCount: number }>,
  [number[]]
>(
  (ids) => stockControlKeys.jobCards.dataBookStatuses(ids),
  (ids) => stockControlApiClient.dataBookStatusBulk(ids),
  { enabled: (ids) => ids.length > 0 },
);

export const useCreateJobCard = createMutationHook(
  (data: Partial<JobCard>) => stockControlApiClient.createJobCard(data),
  [stockControlKeys.jobCards.all],
);

export const useDeleteJobCard = createMutationHook(
  (id: number) => stockControlApiClient.deleteJobCard(id),
  [stockControlKeys.jobCards.all],
);

export const useInventoryItems = createQueryHook<
  { items: StockItem[]; total: number },
  [Record<string, string>]
>(
  (params) => stockControlKeys.inventory.list(params),
  (params) => stockControlApiClient.stockItems(params),
);

export const useInventoryGrouped = createQueryHook(
  (search?: string, locationId?: number) => stockControlKeys.inventory.grouped(search, locationId),
  (search?: string, locationId?: number) =>
    stockControlApiClient.stockItemsGrouped(search, locationId),
);

export const useInventoryCategories = createArrayQueryHook<string>(
  () => stockControlKeys.inventory.categories(),
  () => stockControlApiClient.categories(),
  { staleTime: 60_000 },
);

export const useInventoryLocations = createArrayQueryHook<StockControlLocation>(
  () => stockControlKeys.inventory.locations(),
  () => stockControlApiClient.locations(),
  { staleTime: 60_000 },
);

export const useInvoices = createArrayQueryHook<SupplierInvoice>(
  () => stockControlKeys.invoices.list(),
  () => stockControlApiClient.supplierInvoices(),
);

export const useDeliveryNotes = createArrayQueryHook<DeliveryNote>(
  () => stockControlKeys.deliveries.list(),
  () => stockControlApiClient.deliveryNotes(),
);

export const useDeleteInvoice = createMutationHook(
  (id: number) => stockControlApiClient.deleteInvoice(id),
  [stockControlKeys.invoices.all],
);

export const useCreateDeliveryNote = createMutationHook(
  (data: {
    deliveryNumber: string;
    supplierName: string;
    receivedDate?: string;
    notes?: string;
    receivedBy?: string;
    items: { stockItemId: number; quantityReceived: number }[];
  }) => stockControlApiClient.createDeliveryNote(data),
  [stockControlKeys.deliveries.all],
);

export const useDeleteDeliveryNote = createMutationHook(
  (id: number) => stockControlApiClient.deleteDeliveryNote(id),
  [stockControlKeys.deliveries.all],
);

export const useLinkDeliveryNoteToStock = createMutationHook(
  (params: {
    id: number;
    overrides?: Array<{ description: string; matchedItemId: number | null }>;
  }) => stockControlApiClient.linkDeliveryNoteToStock(params.id, params.overrides),
  [stockControlKeys.deliveries.all, stockControlKeys.inventory.all],
);

export const useSavePendingDeliveryNote = createMutationHook(
  (params: { file: File; analyzedData: Record<string, unknown> }) =>
    stockControlApiClient.savePendingDeliveryNote(
      params.file,
      params.analyzedData as unknown as Parameters<
        typeof stockControlApiClient.savePendingDeliveryNote
      >[1],
    ),
  [stockControlKeys.deliveries.all],
);

export const useConfirmDeliveryNote = createMutationHook(
  (params: { id: number; confirmedData: Record<string, unknown> }) =>
    stockControlApiClient.confirmDeliveryNote(params.id, params.confirmedData),
  [stockControlKeys.deliveries.all],
);

export const useInvalidateDeliveries = createInvalidationHook(stockControlKeys.deliveries.all);

export const useInvalidateInvoices = createInvalidationHook(stockControlKeys.invoices.all);

export const useInvalidateJobCards = createInvalidationHook(stockControlKeys.jobCards.all);

export const useInvalidateInventory = createInvalidationHook(stockControlKeys.inventory.all);

export const useDeliveryNoteDetail = createQueryHook<DeliveryNote, [number]>(
  (id) => stockControlKeys.deliveries.detail(id),
  (id) => stockControlApiClient.deliveryNoteById(id),
  { enabled: (id) => !!id },
);

export const useUploadDeliveryPhoto = createMutationHook(
  ({ id, file }: { id: number; file: File }) => stockControlApiClient.uploadDeliveryPhoto(id, file),
  (_data, vars) => [stockControlKeys.deliveries.detail(vars.id)],
);

export const useInventoryItemDetail = createQueryHook<StockItem, [number]>(
  (id) => stockControlKeys.inventory.detail(id),
  (id) => stockControlApiClient.stockItemById(id),
  { enabled: (id) => !!id },
);

export const useStockMovements = createArrayQueryHook<StockMovement, [number]>(
  (stockItemId) => stockControlKeys.inventory.movements(stockItemId),
  (stockItemId) => stockControlApiClient.stockMovements({ stockItemId }),
  { enabled: (stockItemId) => !!stockItemId },
);

export const useUpdateStockItem = createMutationHook(
  ({ id, data }: { id: number; data: Partial<StockItem> }) =>
    stockControlApiClient.updateStockItem(id, data),
  (_data, vars) => [stockControlKeys.inventory.detail(vars.id), stockControlKeys.inventory.all],
);

export const useCreateStockItem = createMutationHook(
  (data: Partial<StockItem>) => stockControlApiClient.createStockItem(data),
  [stockControlKeys.inventory.all],
);

export function useInspectionBookingsForRange(startDate: string, endDate: string) {
  return useQuery<InspectionBooking[]>({
    queryKey: stockControlKeys.inspections.forRange(startDate, endDate),
    queryFn: async () => {
      const data = await stockControlApiClient.inspectionBookingsForRange(startDate, endDate);
      return Array.isArray(data) ? data : [];
    },
    enabled: startDate.length > 0 && endDate.length > 0,
  });
}

export const useCreateManualAdjustment = createMutationHook(
  (data: { stockItemId: number; movementType: string; quantity: number; notes?: string }) =>
    stockControlApiClient.createManualAdjustment(data),
  (_data, vars) => [
    stockControlKeys.inventory.detail(vars.stockItemId),
    stockControlKeys.inventory.movements(vars.stockItemId),
  ],
);

export const useUploadStockItemPhoto = createMutationHook(
  ({ id, file }: { id: number; file: File }) =>
    stockControlApiClient.uploadStockItemPhoto(id, file),
  (_data, vars) => [stockControlKeys.inventory.detail(vars.id)],
);

export const useCpoDetail = createQueryHook<CustomerPurchaseOrder, [number]>(
  (id) => stockControlKeys.cpos.detail(id),
  (id) => stockControlApiClient.cpoById(id),
  { enabled: (id) => !!id },
);

export const useCpoCalloffRecords = createArrayQueryHook<CpoCalloffRecord, [number]>(
  (cpoId) => stockControlKeys.cpos.calloffRecords(cpoId),
  (cpoId) => stockControlApiClient.cpoCalloffRecords(cpoId),
  { enabled: (cpoId) => !!cpoId },
);

export const useCpoDeliveryHistory = createQueryHook<CpoDeliveryHistory, [number]>(
  (cpoId) => stockControlKeys.cpos.deliveryHistory(cpoId),
  (cpoId) => stockControlApiClient.cpoDeliveryHistory(cpoId),
  { enabled: (cpoId) => !!cpoId },
);

export const useUpdateCpoStatus = createMutationHook(
  ({ id, status }: { id: number; status: string }) =>
    stockControlApiClient.updateCpoStatus(id, status),
  (_data, vars) => [stockControlKeys.cpos.detail(vars.id), stockControlKeys.cpos.all],
);

export const useDeleteCpoItem = createMutationHook(
  ({ cpoId, itemId }: { cpoId: number; itemId: number }) =>
    stockControlApiClient.deleteCpoItem(cpoId, itemId),
  (_data, vars) => [stockControlKeys.cpos.detail(vars.cpoId)],
);

export const useUpdateCalloffRecordStatus = createMutationHook(
  ({ recordId, status }: { recordId: number; status: string; cpoId: number }) =>
    stockControlApiClient.updateCalloffRecordStatus(recordId, status),
  (_data, vars) => [stockControlKeys.cpos.calloffRecords(vars.cpoId)],
);

export const useAddCpoItem = createMutationHook(
  ({ cpoId, data }: { cpoId: number; data: AddCpoItemRequest }) =>
    stockControlApiClient.addCpoItem(cpoId, data),
  (_data, vars) => [stockControlKeys.cpos.detail(vars.cpoId)],
);

export const useUpdateCpoItem = createMutationHook(
  ({ cpoId, itemId, data }: { cpoId: number; itemId: number; data: UpdateCpoItemRequest }) =>
    stockControlApiClient.updateCpoItem(cpoId, itemId, data),
  (_data, vars) => [stockControlKeys.cpos.detail(vars.cpoId)],
);

export const useJobCardDetail = createQueryHook<JobCard, [number]>(
  (id) => stockControlKeys.jobCards.detail(id),
  (id) => stockControlApiClient.jobCardById(id),
  { enabled: (id) => !!id },
);

export const useDispatchProgress = createQueryHook<DispatchProgress, [number]>(
  (jobCardId) => stockControlKeys.jobCards.dispatchProgress(jobCardId),
  (jobCardId) => stockControlApiClient.dispatchProgress(jobCardId),
  { enabled: (jobCardId) => !!jobCardId },
);

export const useDispatchHistory = createQueryHook<DispatchScan[], [number]>(
  (jobCardId) => stockControlKeys.jobCards.dispatchHistory(jobCardId),
  (jobCardId) => stockControlApiClient.dispatchHistory(jobCardId),
  { enabled: (jobCardId) => !!jobCardId },
);

export const useScanDispatchItem = createMutationHook(
  ({
    jobCardId,
    stockItemId,
    quantity,
    notes,
  }: {
    jobCardId: number;
    stockItemId: number;
    quantity: number;
    notes?: string;
  }) => stockControlApiClient.scanDispatchItem(jobCardId, stockItemId, quantity, notes),
  (_data, vars) => [
    stockControlKeys.jobCards.dispatchProgress(vars.jobCardId),
    stockControlKeys.jobCards.dispatchHistory(vars.jobCardId),
  ],
);

export const useCompleteDispatch = createMutationHook(
  (jobCardId: number) => stockControlApiClient.completeDispatch(jobCardId),
  [stockControlKeys.jobCards.all],
);

export function useWorkflowNotifications(filter: string) {
  return useQuery<WorkflowNotification[]>({
    queryKey: stockControlKeys.notifications.list(filter),
    queryFn: async () => {
      const data =
        filter === "unread"
          ? await stockControlApiClient.unreadNotifications()
          : await stockControlApiClient.workflowNotifications(100);
      return Array.isArray(data) ? data : [];
    },
  });
}

export const useMarkNotificationAsRead = createMutationHook(
  (notificationId: number) => stockControlApiClient.markNotificationAsRead(notificationId),
  [stockControlKeys.notifications.all],
);

export const useMarkAllNotificationsAsRead = createMutationHook<unknown, void>(
  () => stockControlApiClient.markAllNotificationsAsRead(),
  [stockControlKeys.notifications.all],
);

export const useCompleteBackgroundStep = createMutationHook(
  (params: { jobCardId: number; stepKey: string; notes?: string }) =>
    stockControlApiClient.completeBackgroundStep(params.jobCardId, params.stepKey, params.notes),
  [stockControlKeys.notifications.all],
);

export function useCpos(status?: string) {
  return useQuery<CustomerPurchaseOrder[]>({
    queryKey: stockControlKeys.cpos.list(status),
    queryFn: async () => {
      const data = await stockControlApiClient.cpos(status === "all" ? undefined : status);
      return Array.isArray(data) ? data : [];
    },
  });
}

export const useDeleteCpo = createMutationHook(
  (id: number) => stockControlApiClient.deleteCpo(id),
  [stockControlKeys.cpos.all],
);

export function useCustomerDeliveries() {
  return useQuery<DeliveryNote[]>({
    queryKey: [...stockControlKeys.deliveries.all, "customer"] as const,
    queryFn: async () => {
      const data = await stockControlApiClient.deliveryNotes();
      return (Array.isArray(data) ? data : []).filter((dn) => {
        const extracted = dn.extractedData as { documentType?: string } | null;
        return extracted?.documentType === "CUSTOMER_DELIVERY";
      });
    },
  });
}

export function useAnalyzeDeliveryNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const result = await stockControlApiClient.analyzeDeliveryNotePhoto(file);
      return stockControlApiClient.acceptAnalyzedDeliveryNote(file, result.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.deliveries.all });
    },
  });
}

export function useCalibrationCertificates(filterActive: string) {
  return useQuery<CalibrationCertificate[]>({
    queryKey: stockControlKeys.calibration.list(filterActive),
    queryFn: async () => {
      const filters: { active?: boolean } = {};
      if (filterActive === "true") filters.active = true;
      if (filterActive === "false") filters.active = false;
      const data = await stockControlApiClient.calibrationCertificates(filters);
      return Array.isArray(data) ? data : [];
    },
  });
}

export const useDeactivateCalibrationCertificate = createMutationHook(
  (id: number) => stockControlApiClient.deactivateCalibrationCertificate(id),
  [stockControlKeys.calibration.all],
);

export const useDeleteCalibrationCertificate = createMutationHook(
  (id: number) => stockControlApiClient.deleteCalibrationCertificate(id),
  [stockControlKeys.calibration.all],
);

export const useUploadCalibrationCertificate = createMutationHook(
  (params: {
    file: File;
    data: {
      equipmentName: string;
      equipmentIdentifier: string | null;
      certificateNumber: string | null;
      description: string | null;
      expiryDate: string;
    };
  }) => stockControlApiClient.uploadCalibrationCertificate(params.file, params.data),
  [stockControlKeys.calibration.all],
);

export const useRequisitions = createArrayQueryHook<Requisition>(
  () => stockControlKeys.requisitions.list(),
  () => stockControlApiClient.requisitions(),
);

export const useRequisitionDetail = createQueryHook<Requisition, [number]>(
  (id) => stockControlKeys.requisitions.detail(id),
  (id) => stockControlApiClient.requisitionById(id),
  { enabled: (id) => id > 0 },
);

export function useUpdateRequisitionItem(reqId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { itemId: number; data: Record<string, unknown> }) =>
      stockControlApiClient.updateRequisitionItem(reqId, params.itemId, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: stockControlKeys.requisitions.detail(reqId),
      });
    },
  });
}

export const useInvalidateNotifications = createInvalidationHook(
  stockControlKeys.notifications.all,
);

export const useInvalidateCpos = createInvalidationHook(stockControlKeys.cpos.all);

export const useInvalidateCalibration = createInvalidationHook(stockControlKeys.calibration.all);

export const useInvalidateRequisitions = createInvalidationHook(stockControlKeys.requisitions.all);

export const useJobCardAllocations = createArrayQueryHook<StockAllocation, [number]>(
  (id) => stockControlKeys.jobCardDetail.allocations(id),
  (id) => stockControlApiClient.jobCardAllocations(id),
  { enabled: (id) => id > 0 },
);

export function useJobCardRequisition(jobId: number) {
  return useQuery<Requisition | null>({
    queryKey: stockControlKeys.jobCardDetail.requisition(jobId),
    queryFn: async () => {
      const reqs = await stockControlApiClient.requisitions();
      const match = reqs.find((r) => r.jobCardId === jobId && r.status !== "cancelled");
      return match ?? null;
    },
    enabled: jobId > 0,
  });
}

export const useDeliveryJobCards = createArrayQueryHook<JobCard, [number]>(
  (parentJobCardId) => stockControlKeys.jobCardDetail.deliveryJobCards(parentJobCardId),
  (parentJobCardId) => stockControlApiClient.deliveryJobCards(parentJobCardId),
  { enabled: (parentJobCardId) => parentJobCardId > 0 },
);

export function useJobCardWorkflow(jobId: number) {
  return useQuery<WorkflowStatus | null>({
    queryKey: stockControlKeys.jobCardDetail.workflow(jobId),
    queryFn: async () => {
      try {
        return await stockControlApiClient.workflowStatus(jobId);
      } catch {
        return null;
      }
    },
    enabled: jobId > 0,
  });
}

export function useJobCardApprovals(jobId: number) {
  return useQuery<JobCardApproval[]>({
    queryKey: stockControlKeys.jobCardDetail.approvals(jobId),
    queryFn: async () => {
      try {
        const data = await stockControlApiClient.approvalHistory(jobId);
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: jobId > 0,
  });
}

export const useInvalidateJobCardDetail = createInvalidationHook(
  stockControlKeys.jobCardDetail.all,
);

export function useAllocateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      jobId: number;
      data: {
        stockItemId: number;
        quantityUsed: number;
        notes?: string;
        staffMemberId?: number;
      };
      photoFile?: File;
    }) =>
      stockControlApiClient.allocateStock(params.jobId, params.data).then(async (allocation) => {
        if (params.photoFile) {
          await stockControlApiClient.uploadAllocationPhoto(
            params.jobId,
            allocation.id,
            params.photoFile,
          );
        }
        return allocation;
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCardDetail.all });
    },
  });
}

export const useApproveOverAllocation = createMutationHook(
  (params: { jobId: number; allocationId: number }) =>
    stockControlApiClient.approveOverAllocation(params.jobId, params.allocationId),
  [stockControlKeys.jobCardDetail.all],
);

export const useRejectOverAllocation = createMutationHook(
  (params: { jobId: number; allocationId: number; reason: string }) =>
    stockControlApiClient.rejectOverAllocation(params.jobId, params.allocationId, params.reason),
  [stockControlKeys.jobCardDetail.all],
);

export const useUpdateJobCardStatus = createMutationHook(
  (params: { jobId: number; status: string }) =>
    stockControlApiClient.updateJobCard(params.jobId, { status: params.status }),
  [stockControlKeys.jobCardDetail.all, stockControlKeys.jobCards.all],
);

export const useReExtractLineItems = createMutationHook(
  (jobCardId: number) => stockControlApiClient.reExtractJobCardLineItems(jobCardId),
  [stockControlKeys.jobCardDetail.all],
);

export const useDeleteLineItem = createMutationHook(
  (params: { jobCardId: number; lineItemId: number }) =>
    stockControlApiClient.deleteLineItem(params.jobCardId, params.lineItemId),
  [stockControlKeys.jobCardDetail.all],
);

export const useAddLineItem = createMutationHook(
  (params: {
    jobCardId: number;
    data: {
      itemCode?: string;
      itemDescription?: string;
      itemNo?: string;
      quantity?: number;
      jtNo?: string;
      m2?: number;
    };
  }) => stockControlApiClient.addLineItem(params.jobCardId, params.data),
  [stockControlKeys.jobCardDetail.all],
);

export const useCompleteAction = createMutationHook(
  (params: {
    jobCardId: number;
    stepKey: string;
    actionType?: string;
    metadata?: Record<string, unknown>;
  }) =>
    stockControlApiClient.completeAction(
      params.jobCardId,
      params.stepKey,
      params.actionType,
      params.metadata,
    ),
  [stockControlKeys.jobCardDetail.all],
);

export const useActionCompletions = createArrayQueryHook<JobCardActionCompletion, [number]>(
  (jobCardId) => [...stockControlKeys.jobCardDetail.all, "actions", jobCardId] as const,
  (jobCardId) => stockControlApiClient.actionCompletions(jobCardId),
  { enabled: (jobCardId) => jobCardId > 0 },
);

export const useApproveWorkflowStep = createMutationHook(
  (params: { jobId: number; signatureDataUrl?: string; comments?: string; outcomeKey?: string }) =>
    stockControlApiClient.approveWorkflowStep(params.jobId, {
      signatureDataUrl: params.signatureDataUrl,
      comments: params.comments,
      outcomeKey: params.outcomeKey,
    }),
  [stockControlKeys.jobCardDetail.all],
);

export const useRejectWorkflowStep = createMutationHook(
  (params: { jobId: number; reason: string }) =>
    stockControlApiClient.rejectWorkflowStep(params.jobId, params.reason),
  [stockControlKeys.jobCardDetail.all],
);

export const useCostByJobReport = createArrayQueryHook<CostByJob>(
  () => stockControlKeys.reports.costByJob(),
  () => stockControlApiClient.costByJob(),
);

export const useStockValuationReport = createQueryHook<StockValuation | null>(
  () => stockControlKeys.reports.stockValuation(),
  () => stockControlApiClient.stockValuation(),
);

export const useMovementHistoryReport = createArrayQueryHook<
  StockMovement,
  [
    | { startDate?: string; endDate?: string; movementType?: string; stockItemId?: number }
    | undefined,
  ]
>(
  (params) =>
    stockControlKeys.reports.movementHistory(params as Record<string, string | number | undefined>),
  (params) => stockControlApiClient.movementHistory(params),
);

export const useStaffStockReport = createQueryHook<
  StaffStockReportResult | null,
  [StaffStockFilters | undefined]
>(
  (filters) =>
    stockControlKeys.reports.staffStock(filters as Record<string, string | number | undefined>),
  (filters) => stockControlApiClient.staffStockReport(filters),
);

export function useReportStaffMembers() {
  return useQuery<StaffMember[]>({
    queryKey: stockControlKeys.reports.staffMembers(),
    queryFn: async () => {
      const data = await stockControlApiClient.staffMembers({ active: "true" });
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60_000,
  });
}

export function useReportDepartments() {
  return useQuery<StockControlDepartment[]>({
    queryKey: stockControlKeys.reports.departments(),
    queryFn: async () => {
      const data = await stockControlApiClient.departments();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60_000,
  });
}

export function useReportStockItems() {
  return useQuery<StockItem[]>({
    queryKey: stockControlKeys.reports.stockItems(),
    queryFn: async () => {
      const result = await stockControlApiClient.stockItems({ limit: "1000" });
      return Array.isArray(result.items) ? result.items : [];
    },
    staleTime: 60_000,
  });
}

export const useCertificates = createArrayQueryHook<
  SupplierCertificate,
  [Record<string, string | number> | undefined]
>(
  (filters) => stockControlKeys.certificates.list(filters),
  (filters) => stockControlApiClient.certificates(filters),
);

export const useCertificateSuppliers = createArrayQueryHook<StockControlSupplierDto>(
  () => stockControlKeys.certificates.suppliers(),
  () => stockControlApiClient.suppliers(),
  { staleTime: 60_000 },
);

export function useCertificateStockItems() {
  return useQuery<StockItem[]>({
    queryKey: stockControlKeys.certificates.stockItems(),
    queryFn: async () => {
      const data = await stockControlApiClient.stockItems();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60_000,
  });
}

export const useDeleteCertificate = createMutationHook(
  (id: number) => stockControlApiClient.deleteCertificate(id),
  [stockControlKeys.certificates.all],
);

export const useInvalidateCertificates = createInvalidationHook(stockControlKeys.certificates.all);

export const useCpoFulfillmentReport = createQueryHook<CpoFulfillmentReportItem[]>(
  () => stockControlKeys.cpoReports.fulfillment(),
  () => stockControlApiClient.cpoFulfillmentReport(),
);

export const useCpoCalloffBreakdown = createQueryHook<CpoCalloffBreakdown | null>(
  () => stockControlKeys.cpoReports.calloff(),
  () => stockControlApiClient.cpoCalloffBreakdown(),
);

export const useCpoOverdueInvoices = createQueryHook<CpoOverdueInvoiceItem[]>(
  () => stockControlKeys.cpoReports.overdue(),
  () => stockControlApiClient.cpoOverdueInvoices(),
);

export function useIssueStockStaffMembers() {
  return useQuery<StaffMember[]>({
    queryKey: stockControlKeys.issueStock.staffMembers(),
    queryFn: async () => {
      const data = await stockControlApiClient.staffMembers({ active: "true" });
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60_000,
  });
}

export const useLinkedStaff = createQueryHook<StaffMember | null, [number | null | undefined]>(
  (staffId) => stockControlKeys.issueStock.linkedStaff(staffId ?? 0),
  (staffId) => stockControlApiClient.staffMemberById(staffId!),
  { enabled: (staffId) => !!staffId },
);

export const useInvalidateIssueStock = createInvalidationHook(stockControlKeys.issueStock.all);

export const useScanQrCode = createMutationHook((qrToken: string) =>
  stockControlApiClient.scanQrCode(qrToken),
);

export const useDownloadStockItemQrPdf = createMutationHook((id: number) =>
  stockControlApiClient.downloadStockItemQrPdf(id),
);

export const useViewCertificateUrl = createMutationHook((id: number) =>
  stockControlApiClient.certificateById(id),
);

export const useCalibrationCertificateUrl = createMutationHook((id: number) =>
  stockControlApiClient.calibrationCertificateById(id),
);

export function useQcpLog(search: string) {
  return useQuery<QcControlPlanRecord[]>({
    queryKey: stockControlKeys.qcpLog.list(search),
    queryFn: async () => {
      const data = await stockControlApiClient.qcpLog(search || undefined);
      return Array.isArray(data) ? data : [];
    },
  });
}

export const useUpsertGlossaryTerm = createMutationHook(
  (params: {
    abbreviation: string;
    body: { term: string; definition: string; category: string | null };
  }) => stockControlApiClient.upsertGlossaryTerm(params.abbreviation, params.body),
  [stockControlKeys.glossary.all],
);

export const useDeleteGlossaryTerm = createMutationHook(
  (abbreviation: string) => stockControlApiClient.deleteGlossaryTerm(abbreviation),
  [stockControlKeys.glossary.all],
);

export const useResetGlossary = createMutationHook(
  () => stockControlApiClient.resetGlossary(),
  [stockControlKeys.glossary.all],
);

export const useUpdateStockControlNotificationPreferences = createMutationHook(
  (prefs: { emailNotificationsEnabled?: boolean; pushNotificationsEnabled?: boolean }) =>
    stockControlApiClient.updateNotificationPreferences(prefs),
);

export const useCpoExportCsv = createMutationHook(() => stockControlApiClient.cpoExportCsv());

export const useAnalyzeDeliveryNotePhoto = createMutationHook((file: File) =>
  stockControlApiClient.analyzeDeliveryNotePhoto(file),
);

export const useAcceptAnalyzedDeliveryNote = createMutationHook(
  (params: { file: File; analyzedData: AnalyzedDeliveryNoteData; documentType?: string }) => {
    const paramDocType = params.documentType;
    const docType = paramDocType ? paramDocType : "SUPPLIER_DELIVERY";
    return stockControlApiClient.acceptAnalyzedDeliveryNote(
      params.file,
      params.analyzedData,
      docType,
    );
  },
  [stockControlKeys.deliveries.all],
);

export const useAcceptAnalyzedInvoice = createMutationHook(
  (params: { file: File; analyzedData: AnalyzedDeliveryNoteData }) =>
    stockControlApiClient.acceptAnalyzedInvoice(params.file, params.analyzedData),
  [stockControlKeys.invoices.all],
);

export const useDeduplicateJobCards = createMutationHook(
  () => stockControlApiClient.deduplicateJobCards(),
  [stockControlKeys.jobCards.all],
);

export const useTriggerCoatingAnalysis = createMutationHook(
  (jobCardId: number) =>
    stockControlApiClient.triggerCoatingAnalysis(jobCardId) as Promise<CoatingAnalysis>,
);

export const useDownloadDataBook = createMutationHook((jobCardId: number) =>
  stockControlApiClient.downloadDataBook(jobCardId),
);

export const useOpenControlPlanPdf = createMutationHook(
  (params: { jobCardId: number; planId: number }) =>
    stockControlApiClient.openControlPlanPdf(params.jobCardId, params.planId),
);

export const useUploadCpoImportFile = createMutationHook((file: File) =>
  stockControlApiClient.uploadCpoImportFile(file),
);

export const useAutoDetectJobCardMapping = createMutationHook((grid: string[][]) =>
  stockControlApiClient.autoDetectJobCardMapping(grid),
);

export const useUploadJobCardImportFile = createMutationHook((file: File) =>
  stockControlApiClient.uploadJobCardImportFile(file),
);

export const useUploadDrawingFiles = createMutationHook((files: File[]) =>
  stockControlApiClient.uploadDrawingFiles(files),
);

export const useSaveJobCardImportMapping = createMutationHook(
  (mappingConfig: ImportMappingConfig) =>
    stockControlApiClient.saveJobCardImportMapping(mappingConfig),
);

export const useCalculateM2 = createMutationHook((descriptions: string[]) =>
  stockControlApiClient.calculateM2(descriptions),
);

export const useConfirmJobCardImport = createMutationHook(
  (params: {
    rows: JobCardImportRow[];
    sourceFilePath?: string | null;
    sourceFileName?: string | null;
  }) =>
    stockControlApiClient.confirmJobCardImport(
      params.rows,
      params.sourceFilePath,
      params.sourceFileName,
    ),
  [stockControlKeys.jobCards.all],
);

export const useConfirmDeliveryMatches = createMutationHook(
  (params: { jobCardId: number; matches: { deliveryItemId: number; cpoItemId: number }[] }) =>
    stockControlApiClient.confirmDeliveryMatches(params.jobCardId, params.matches),
);

export const useConfirmCpoImport = createMutationHook(
  (rows: Parameters<typeof stockControlApiClient.confirmCpoImport>[0]) =>
    stockControlApiClient.confirmCpoImport(rows),
  [stockControlKeys.cpos.all, stockControlKeys.jobCards.all],
);

export const useUploadImportFile = createMutationHook((file: File) =>
  stockControlApiClient.uploadImportFile(file),
);

export const useMatchImportRows = createMutationHook((rows: Record<string, unknown>[]) =>
  stockControlApiClient.matchImportRows(rows),
);

export function useStockControlSuppliers() {
  return useQuery<StockControlSupplierDto[]>({
    queryKey: stockControlKeys.suppliers.list(),
    queryFn: async () => {
      const data = await stockControlApiClient.suppliers();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60_000,
  });
}

export function useSupplierDocumentsList(filters: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: stockControlKeys.supplierDocuments.list(filters),
    queryFn: () =>
      stockControlApiClient.supplierDocuments(
        filters as Parameters<typeof stockControlApiClient.supplierDocuments>[0],
      ),
  });
}

export const useUploadSupplierDocument = createMutationHook(
  (params: {
    file: File;
    data: Parameters<typeof stockControlApiClient.uploadSupplierDocument>[1];
  }) => stockControlApiClient.uploadSupplierDocument(params.file, params.data),
  [stockControlKeys.supplierDocuments.all],
);

export const useSupplierDocumentById = createMutationHook((id: number) =>
  stockControlApiClient.supplierDocumentById(id),
);

export const useDeleteSupplierDocument = createMutationHook(
  (id: number) => stockControlApiClient.deleteSupplierDocument(id),
  [stockControlKeys.supplierDocuments.all],
);

export function useDispatchCdns(jobCardId: number) {
  return useQuery({
    queryKey: stockControlKeys.dispatch.cdns(jobCardId),
    queryFn: () => stockControlApiClient.dispatchCdns(jobCardId),
    enabled: !!jobCardId,
  });
}

export function useDispatchLoadPhotos(jobCardId: number) {
  return useQuery({
    queryKey: stockControlKeys.dispatch.loadPhotos(jobCardId),
    queryFn: () => stockControlApiClient.dispatchLoadPhotos(jobCardId),
    enabled: !!jobCardId,
  });
}

export const useUploadDispatchCdn = createMutationHook(
  (params: { jobCardId: number; file: File }) =>
    stockControlApiClient.uploadDispatchCdn(params.jobCardId, params.file),
  (_data, vars) => [
    stockControlKeys.dispatch.cdns(vars.jobCardId),
    stockControlKeys.jobCards.dispatchProgress(vars.jobCardId),
  ],
);

export const useUploadDispatchLoadPhotos = createMutationHook(
  (params: { jobCardId: number; files: File[] }) =>
    stockControlApiClient.uploadDispatchLoadPhotos(params.jobCardId, params.files),
  (_data, vars) => [
    stockControlKeys.dispatch.loadPhotos(vars.jobCardId),
    stockControlKeys.jobCards.dispatchProgress(vars.jobCardId),
  ],
);

export const useDeleteDispatchCdn = createMutationHook(
  (params: { jobCardId: number; cdnId: number }) =>
    stockControlApiClient.deleteDispatchCdn(params.jobCardId, params.cdnId),
  (_data, vars) => [
    stockControlKeys.dispatch.cdns(vars.jobCardId),
    stockControlKeys.jobCards.dispatchProgress(vars.jobCardId),
  ],
);

export const useDeleteDispatchLoadPhoto = createMutationHook(
  (params: { jobCardId: number; photoId: number }) =>
    stockControlApiClient.deleteDispatchLoadPhoto(params.jobCardId, params.photoId),
  (_data, vars) => [
    stockControlKeys.dispatch.loadPhotos(vars.jobCardId),
    stockControlKeys.jobCards.dispatchProgress(vars.jobCardId),
  ],
);

export const useReExtractInvoice = createMutationHook(
  (invoiceId: number) => stockControlApiClient.reExtractInvoice(invoiceId),
  [stockControlKeys.invoices.all],
);

export const useReExtractAllFailed = createMutationHook(
  () => stockControlApiClient.reExtractAllFailed(),
  [stockControlKeys.invoices.all],
);

export const useAutoLinkInvoices = createMutationHook(
  () => stockControlApiClient.autoLinkInvoices(),
  [stockControlKeys.invoices.all],
);

export const useCompleteRequisitionStep = createMutationHook(
  (jobCardId: number) => stockControlApiClient.completeRequisitionStep(jobCardId),
  [stockControlKeys.notifications.all, stockControlKeys.jobCardDetail.all],
);

export const useUpdateStaffMember = createMutationHook(
  (params: { id: number; data: Partial<StaffMember> }) =>
    stockControlApiClient.updateStaffMember(params.id, params.data),
  [stockControlKeys.staff.all],
);

export const useCreateStaffMember = createMutationHook(
  (data: { name: string; employeeNumber: string | null; departmentId: number | null }) =>
    stockControlApiClient.createStaffMember(data),
  [stockControlKeys.staff.all],
);

export const useUploadStaffPhoto = createMutationHook(
  (params: { staffId: number; file: File }) =>
    stockControlApiClient.uploadStaffPhoto(params.staffId, params.file),
  [stockControlKeys.staff.all],
);

export const useDeleteStaffMember = createMutationHook(
  (id: number) => stockControlApiClient.deleteStaffMember(id),
  [stockControlKeys.staff.all],
);

export const useDownloadStaffIdCardPdf = createMutationHook((staffId: number) =>
  stockControlApiClient.downloadStaffIdCardPdf(staffId),
);

export const useDownloadBatchStaffIdCards = createMutationHook((staffIds: number[]) =>
  stockControlApiClient.downloadBatchStaffIdCards(staffIds),
);

export const useInvalidateSupplierDocuments = createInvalidationHook(
  stockControlKeys.supplierDocuments.all,
);

export const useUploadCertificate = createMutationHook(
  (params: {
    file: File;
    data: {
      supplierId: number;
      stockItemId?: number | null;
      certificateType: string;
      batchNumber: string;
      description?: string | null;
      expiryDate?: string | null;
      pageNumbers?: number[] | null;
    };
  }) => stockControlApiClient.uploadCertificate(params.file, params.data),
  [stockControlKeys.certificates.all],
);

export const useAnalyzeCertificateDocument = createMutationHook((file: File) =>
  stockControlApiClient.analyzeCertificateDocument(file),
);

export const useBackfillCertificateProducts = createMutationHook(
  () => stockControlApiClient.backfillCertificateProducts(),
  [stockControlKeys.certificates.all],
);

export const useInvoiceDetail = createQueryHook<SupplierInvoice, [number]>(
  (id) => stockControlKeys.invoices.detail(id),
  (id) => stockControlApiClient.supplierInvoiceById(id),
  { enabled: (id) => !!id },
);

export const useSuggestedDeliveryNotes = createArrayQueryHook<
  import("@/app/lib/api/stockControlApi").SuggestedDeliveryNote,
  [number]
>(
  (invoiceId) =>
    [...stockControlKeys.invoices.detail(invoiceId), "suggested-delivery-notes"] as const,
  (invoiceId) => stockControlApiClient.suggestedDeliveryNotes(invoiceId),
  { enabled: (invoiceId) => !!invoiceId },
);

export const useLinkInvoiceToDeliveryNote = createMutationHook(
  (params: { invoiceId: number; deliveryNoteId: number }) =>
    stockControlApiClient.linkInvoiceToDeliveryNote(params.invoiceId, params.deliveryNoteId),
  [stockControlKeys.invoices.all, stockControlKeys.deliveries.all],
);

export const useSubmitInvoiceClarification = createMutationHook(
  (params: { invoiceId: number; clarificationId: number; response: Record<string, unknown> }) =>
    stockControlApiClient.submitInvoiceClarification(
      params.invoiceId,
      params.clarificationId,
      params.response,
    ),
  [stockControlKeys.invoices.all],
);

export const useSkipInvoiceClarification = createMutationHook(
  (params: { invoiceId: number; clarificationId: number }) =>
    stockControlApiClient.skipInvoiceClarification(params.invoiceId, params.clarificationId),
  [stockControlKeys.invoices.all],
);

export const useApproveInvoice = createMutationHook(
  (invoiceId: number) => stockControlApiClient.approveInvoice(invoiceId),
  [stockControlKeys.invoices.all],
);

export const useResolveAndApproveInvoice = createMutationHook(
  (invoiceId: number) => stockControlApiClient.resolveAndApproveInvoice(invoiceId),
  [stockControlKeys.invoices.all],
);

export const useUpdateInvoiceItem = createMutationHook(
  (params: { invoiceId: number; itemId: number; updates: Record<string, unknown> }) =>
    stockControlApiClient.updateInvoiceItem(params.invoiceId, params.itemId, params.updates),
  [stockControlKeys.invoices.all],
);

export const useDeleteInvoiceItem = createMutationHook(
  (params: { invoiceId: number; itemId: number }) =>
    stockControlApiClient.deleteInvoiceItem(params.invoiceId, params.itemId),
  [stockControlKeys.invoices.all],
);

export const useManualMatchInvoiceItem = createMutationHook(
  (params: { invoiceId: number; itemId: number; stockItemId: number }) =>
    stockControlApiClient.manualMatchInvoiceItem(
      params.invoiceId,
      params.itemId,
      params.stockItemId,
    ),
  [stockControlKeys.invoices.all],
);

export const useUpdateCpoCoatingSpecs = createMutationHook(
  (params: { cpoId: number; specs: string | null }) =>
    stockControlApiClient.updateCpoCoatingSpecs(params.cpoId, params.specs),
  (_data, vars) => [stockControlKeys.cpos.detail(vars.cpoId)],
);

export const useUploadSageJcDump = createMutationHook((params: { cpoId: number; file: File }) =>
  stockControlApiClient.uploadSageJcDump(params.cpoId, params.file),
);

export const useConfirmSageJcDump = createMutationHook(
  (params: {
    cpoId: number;
    data: Parameters<typeof stockControlApiClient.confirmSageJcDump>[1];
  }) => stockControlApiClient.confirmSageJcDump(params.cpoId, params.data),
  [stockControlKeys.cpos.all, stockControlKeys.jobCards.all],
);

export function useStockControlProxyImageBlob(url: string | null) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) {
      setObjectUrl(null);
      setFailed(false);
      return;
    }
    const controller = new AbortController();
    const proxyUrl = stockControlApiClient.proxyImageUrl(url);
    const headers = stockControlApiClient.authHeaders();
    let createdObjectUrl: string | null = null;
    setFailed(false);
    fetch(proxyUrl, { headers, signal: controller.signal })
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error("proxy failed"))))
      .then((blob) => {
        if (!controller.signal.aborted) {
          createdObjectUrl = URL.createObjectURL(blob);
          setObjectUrl(createdObjectUrl);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });

    return () => {
      controller.abort();
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [url]);

  return { objectUrl, failed };
}
