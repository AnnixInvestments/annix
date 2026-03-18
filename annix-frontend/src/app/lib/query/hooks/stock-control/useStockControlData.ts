import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CalibrationCertificate,
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
  JobCard,
  JobCardApproval,
  Requisition,
  StaffMember,
  StaffStockFilters,
  StaffStockReportResult,
  StockAllocation,
  StockControlDepartment,
  StockControlLocation,
  StockControlSupplierDto,
  StockIssuance,
  StockItem,
  StockMovement,
  StockValuation,
  SupplierCertificate,
  SupplierInvoice,
  WorkflowNotification,
  WorkflowStatus,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
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

export function useDataBookStatuses(ids: number[]) {
  return useQuery<Record<number, { exists: boolean; isStale: boolean; certificateCount: number }>>({
    queryKey: stockControlKeys.jobCards.dataBookStatuses(ids),
    queryFn: () => stockControlApiClient.dataBookStatusBulk(ids),
    enabled: ids.length > 0,
  });
}

export function useCreateJobCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<JobCard>) => stockControlApiClient.createJobCard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCards.all });
    },
  });
}

export function useDeleteJobCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.deleteJobCard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCards.all });
    },
  });
}

export function useInventoryItems(params: Record<string, string>) {
  return useQuery<{ items: StockItem[]; total: number }>({
    queryKey: stockControlKeys.inventory.list(params),
    queryFn: () => stockControlApiClient.stockItems(params),
  });
}

export function useInventoryGrouped(search?: string, locationId?: number) {
  return useQuery<{
    groups: { category: string; items: StockItem[] }[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: stockControlKeys.inventory.grouped(search, locationId),
    queryFn: () => stockControlApiClient.stockItemsGrouped(search, locationId),
  });
}

export function useInventoryCategories() {
  return useQuery<string[]>({
    queryKey: stockControlKeys.inventory.categories(),
    queryFn: () => stockControlApiClient.categories(),
    staleTime: 60_000,
  });
}

export function useInventoryLocations() {
  return useQuery<StockControlLocation[]>({
    queryKey: stockControlKeys.inventory.locations(),
    queryFn: () => stockControlApiClient.locations(),
    staleTime: 60_000,
  });
}

export function useInvoices() {
  return useQuery<SupplierInvoice[]>({
    queryKey: stockControlKeys.invoices.list(),
    queryFn: async () => {
      const data = await stockControlApiClient.supplierInvoices();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useDeliveryNotes() {
  return useQuery<DeliveryNote[]>({
    queryKey: stockControlKeys.deliveries.list(),
    queryFn: async () => {
      const data = await stockControlApiClient.deliveryNotes();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.invoices.all });
    },
  });
}

export function useCreateDeliveryNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      deliveryNumber: string;
      supplierName: string;
      receivedDate?: string;
      notes?: string;
      receivedBy?: string;
      items: { stockItemId: number; quantityReceived: number }[];
    }) => stockControlApiClient.createDeliveryNote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.deliveries.all });
    },
  });
}

export function useDeleteDeliveryNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.deleteDeliveryNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.deliveries.all });
    },
  });
}

export function useLinkDeliveryNoteToStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.linkDeliveryNoteToStock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.deliveries.all });
      queryClient.invalidateQueries({ queryKey: stockControlKeys.inventory.all });
    },
  });
}

export function useInvalidateDeliveries() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.deliveries.all });
}

export function useInvalidateInvoices() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.invoices.all });
}

export function useInvalidateJobCards() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCards.all });
}

export function useInvalidateInventory() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.inventory.all });
}

export function useDeliveryNoteDetail(id: number) {
  return useQuery<DeliveryNote>({
    queryKey: stockControlKeys.deliveries.detail(id),
    queryFn: () => stockControlApiClient.deliveryNoteById(id),
    enabled: !!id,
  });
}

export function useUploadDeliveryPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      stockControlApiClient.uploadDeliveryPhoto(id, file),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: stockControlKeys.deliveries.detail(variables.id),
      });
    },
  });
}

export function useInventoryItemDetail(id: number) {
  return useQuery<StockItem>({
    queryKey: stockControlKeys.inventory.detail(id),
    queryFn: () => stockControlApiClient.stockItemById(id),
    enabled: !!id,
  });
}

export function useStockMovements(stockItemId: number) {
  return useQuery<StockMovement[]>({
    queryKey: stockControlKeys.inventory.movements(stockItemId),
    queryFn: async () => {
      const data = await stockControlApiClient.stockMovements({ stockItemId });
      return Array.isArray(data) ? data : [];
    },
    enabled: !!stockItemId,
  });
}

export function useUpdateStockItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<StockItem> }) =>
      stockControlApiClient.updateStockItem(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: stockControlKeys.inventory.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: stockControlKeys.inventory.all });
    },
  });
}

export function useCreateManualAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      stockItemId: number;
      movementType: string;
      quantity: number;
      notes?: string;
    }) => stockControlApiClient.createManualAdjustment(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: stockControlKeys.inventory.detail(variables.stockItemId),
      });
      queryClient.invalidateQueries({
        queryKey: stockControlKeys.inventory.movements(variables.stockItemId),
      });
    },
  });
}

export function useUploadStockItemPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      stockControlApiClient.uploadStockItemPhoto(id, file),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: stockControlKeys.inventory.detail(variables.id),
      });
    },
  });
}

export function useCpoDetail(id: number) {
  return useQuery<CustomerPurchaseOrder>({
    queryKey: stockControlKeys.cpos.detail(id),
    queryFn: () => stockControlApiClient.cpoById(id),
    enabled: !!id,
  });
}

export function useCpoCalloffRecords(cpoId: number) {
  return useQuery<CpoCalloffRecord[]>({
    queryKey: stockControlKeys.cpos.calloffRecords(cpoId),
    queryFn: async () => {
      const data = await stockControlApiClient.cpoCalloffRecords(cpoId);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!cpoId,
  });
}

export function useCpoDeliveryHistory(cpoId: number) {
  return useQuery<CpoDeliveryHistory>({
    queryKey: stockControlKeys.cpos.deliveryHistory(cpoId),
    queryFn: () => stockControlApiClient.cpoDeliveryHistory(cpoId),
    enabled: !!cpoId,
  });
}

export function useUpdateCpoStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      stockControlApiClient.updateCpoStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: stockControlKeys.cpos.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: stockControlKeys.cpos.all });
    },
  });
}

export function useUpdateCalloffRecordStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      recordId,
      status,
      cpoId,
    }: {
      recordId: number;
      status: string;
      cpoId: number;
    }) => stockControlApiClient.updateCalloffRecordStatus(recordId, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: stockControlKeys.cpos.calloffRecords(variables.cpoId),
      });
    },
  });
}

export function useJobCardDetail(id: number) {
  return useQuery<JobCard>({
    queryKey: stockControlKeys.jobCards.detail(id),
    queryFn: () => stockControlApiClient.jobCardById(id),
    enabled: !!id,
  });
}

export function useDispatchProgress(jobCardId: number) {
  return useQuery<DispatchProgress>({
    queryKey: stockControlKeys.jobCards.dispatchProgress(jobCardId),
    queryFn: () => stockControlApiClient.dispatchProgress(jobCardId),
    enabled: !!jobCardId,
  });
}

export function useDispatchHistory(jobCardId: number) {
  return useQuery<DispatchScan[]>({
    queryKey: stockControlKeys.jobCards.dispatchHistory(jobCardId),
    queryFn: () => stockControlApiClient.dispatchHistory(jobCardId),
    enabled: !!jobCardId,
  });
}

export function useScanDispatchItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: stockControlKeys.jobCards.dispatchProgress(variables.jobCardId),
      });
      queryClient.invalidateQueries({
        queryKey: stockControlKeys.jobCards.dispatchHistory(variables.jobCardId),
      });
    },
  });
}

export function useCompleteDispatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobCardId: number) => stockControlApiClient.completeDispatch(jobCardId),
    onSuccess: (_data, jobCardId) => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCards.all });
    },
  });
}

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

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: number) =>
      stockControlApiClient.markNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.notifications.all });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => stockControlApiClient.markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.notifications.all });
    },
  });
}

export function useCompleteBackgroundStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { jobCardId: number; stepKey: string; notes?: string }) =>
      stockControlApiClient.completeBackgroundStep(params.jobCardId, params.stepKey, params.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.notifications.all });
    },
  });
}

export function useCpos(status?: string) {
  return useQuery<CustomerPurchaseOrder[]>({
    queryKey: stockControlKeys.cpos.list(status),
    queryFn: async () => {
      const data = await stockControlApiClient.cpos(status === "all" ? undefined : status);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useDeleteCpo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.deleteCpo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.cpos.all });
    },
  });
}

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

export function useDeactivateCalibrationCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.deactivateCalibrationCertificate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.calibration.all });
    },
  });
}

export function useDeleteCalibrationCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.deleteCalibrationCertificate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.calibration.all });
    },
  });
}

export function useUploadCalibrationCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      file: File;
      data: {
        equipmentName: string;
        equipmentIdentifier: string | null;
        certificateNumber: string | null;
        description: string | null;
        expiryDate: string;
      };
    }) => stockControlApiClient.uploadCalibrationCertificate(params.file, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.calibration.all });
    },
  });
}

export function useRequisitions() {
  return useQuery<Requisition[]>({
    queryKey: stockControlKeys.requisitions.list(),
    queryFn: async () => {
      const data = await stockControlApiClient.requisitions();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useRequisitionDetail(id: number) {
  return useQuery<Requisition>({
    queryKey: stockControlKeys.requisitions.detail(id),
    queryFn: () => stockControlApiClient.requisitionById(id),
    enabled: id > 0,
  });
}

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

export function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.notifications.all });
}

export function useInvalidateCpos() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.cpos.all });
}

export function useInvalidateCalibration() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.calibration.all });
}

export function useInvalidateRequisitions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.requisitions.all });
}

export function useJobCardAllocations(id: number) {
  return useQuery<StockAllocation[]>({
    queryKey: stockControlKeys.jobCardDetail.allocations(id),
    queryFn: async () => {
      const data = await stockControlApiClient.jobCardAllocations(id);
      return Array.isArray(data) ? data : [];
    },
    enabled: id > 0,
  });
}

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

export function useDeliveryJobCards(parentJobCardId: number) {
  return useQuery<JobCard[]>({
    queryKey: stockControlKeys.jobCardDetail.deliveryJobCards(parentJobCardId),
    queryFn: async () => {
      const data = await stockControlApiClient.deliveryJobCards(parentJobCardId);
      return Array.isArray(data) ? data : [];
    },
    enabled: parentJobCardId > 0,
  });
}

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

export function useInvalidateJobCardDetail() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCardDetail.all });
}

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

export function useApproveOverAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { jobId: number; allocationId: number }) =>
      stockControlApiClient.approveOverAllocation(params.jobId, params.allocationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCardDetail.all });
    },
  });
}

export function useRejectOverAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { jobId: number; allocationId: number; reason: string }) =>
      stockControlApiClient.rejectOverAllocation(params.jobId, params.allocationId, params.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCardDetail.all });
    },
  });
}

export function useUpdateJobCardStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { jobId: number; status: string }) =>
      stockControlApiClient.updateJobCard(params.jobId, { status: params.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCardDetail.all });
      queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCards.all });
    },
  });
}

export function useReExtractLineItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobCardId: number) => stockControlApiClient.reExtractJobCardLineItems(jobCardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCardDetail.all });
    },
  });
}

export function useDeleteLineItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { jobCardId: number; lineItemId: number }) =>
      stockControlApiClient.deleteLineItem(params.jobCardId, params.lineItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCardDetail.all });
    },
  });
}

export function useAddLineItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCardDetail.all });
    },
  });
}

export function useApproveWorkflowStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { jobId: number; signatureDataUrl?: string; comments?: string }) =>
      stockControlApiClient.approveWorkflowStep(params.jobId, {
        signatureDataUrl: params.signatureDataUrl,
        comments: params.comments,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCardDetail.all });
    },
  });
}

export function useRejectWorkflowStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { jobId: number; reason: string }) =>
      stockControlApiClient.rejectWorkflowStep(params.jobId, params.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCardDetail.all });
    },
  });
}

export function useCostByJobReport() {
  return useQuery<CostByJob[]>({
    queryKey: stockControlKeys.reports.costByJob(),
    queryFn: async () => {
      const data = await stockControlApiClient.costByJob();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useStockValuationReport() {
  return useQuery<StockValuation | null>({
    queryKey: stockControlKeys.reports.stockValuation(),
    queryFn: () => stockControlApiClient.stockValuation(),
  });
}

export function useMovementHistoryReport(params?: {
  startDate?: string;
  endDate?: string;
  movementType?: string;
  stockItemId?: number;
}) {
  return useQuery<StockMovement[]>({
    queryKey: stockControlKeys.reports.movementHistory(
      params as Record<string, string | number | undefined>,
    ),
    queryFn: async () => {
      const data = await stockControlApiClient.movementHistory(params);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useStaffStockReport(filters?: StaffStockFilters) {
  return useQuery<StaffStockReportResult | null>({
    queryKey: stockControlKeys.reports.staffStock(
      filters as Record<string, string | number | undefined>,
    ),
    queryFn: () => stockControlApiClient.staffStockReport(filters),
  });
}

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

export function useCertificates(filters?: Record<string, string | number>) {
  return useQuery<SupplierCertificate[]>({
    queryKey: stockControlKeys.certificates.list(filters),
    queryFn: async () => {
      const data = await stockControlApiClient.certificates(filters);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useCertificateSuppliers() {
  return useQuery<StockControlSupplierDto[]>({
    queryKey: stockControlKeys.certificates.suppliers(),
    queryFn: async () => {
      const data = await stockControlApiClient.suppliers();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60_000,
  });
}

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

export function useDeleteCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.deleteCertificate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.certificates.all });
    },
  });
}

export function useInvalidateCertificates() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.certificates.all });
}

export function useCpoFulfillmentReport() {
  return useQuery<CpoFulfillmentReportItem[]>({
    queryKey: stockControlKeys.cpoReports.fulfillment(),
    queryFn: () => stockControlApiClient.cpoFulfillmentReport(),
  });
}

export function useCpoCalloffBreakdown() {
  return useQuery<CpoCalloffBreakdown | null>({
    queryKey: stockControlKeys.cpoReports.calloff(),
    queryFn: () => stockControlApiClient.cpoCalloffBreakdown(),
  });
}

export function useCpoOverdueInvoices() {
  return useQuery<CpoOverdueInvoiceItem[]>({
    queryKey: stockControlKeys.cpoReports.overdue(),
    queryFn: () => stockControlApiClient.cpoOverdueInvoices(),
  });
}

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

export function useRecentIssuances() {
  return useQuery<StockIssuance[]>({
    queryKey: stockControlKeys.issueStock.recentIssuances(),
    queryFn: async () => {
      const data = await stockControlApiClient.recentIssuances();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useLinkedStaff(staffId: number | null | undefined) {
  return useQuery<StaffMember | null>({
    queryKey: stockControlKeys.issueStock.linkedStaff(staffId ?? 0),
    queryFn: () => stockControlApiClient.staffMemberById(staffId!),
    enabled: !!staffId,
  });
}

export function useInvalidateIssueStock() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.issueStock.all });
}

export function useScanQrCode() {
  return useMutation({
    mutationFn: (qrToken: string) => stockControlApiClient.scanQrCode(qrToken),
  });
}

export function useDownloadStockItemQrPdf() {
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.downloadStockItemQrPdf(id),
  });
}
