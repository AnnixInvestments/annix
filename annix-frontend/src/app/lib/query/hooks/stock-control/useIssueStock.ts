import type {
  BatchIssuanceDto,
  BatchIssuanceResult,
  CoatingAnalysis,
  IssuanceScanResult,
  JobCard,
  StaffMember,
  StockAllocation,
  StockIssuance,
  StockItem,
  SupplierCertificate,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { createMutationHook } from "../../factories";
import { stockControlKeys } from "../../keys/stockControlKeys";

type IdentifyForIssuanceResult = Awaited<
  ReturnType<typeof stockControlApiClient.identifyForIssuance>
>;

type StockItemsParams = Parameters<typeof stockControlApiClient.stockItems>[0];

type StaffMembersParams = Parameters<typeof stockControlApiClient.staffMembers>[0];

export const useLoadRecentBatches = createMutationHook<string[], number>((stockItemId) =>
  stockControlApiClient.recentBatches(stockItemId),
);

export const useLoadStockItems = createMutationHook<
  { items: StockItem[]; total: number },
  StockItemsParams
>((params) => stockControlApiClient.stockItems(params));

export const useIdentifyStockForIssuance = createMutationHook<IdentifyForIssuanceResult, File>(
  (file) => stockControlApiClient.identifyForIssuance(file),
);

export const useLoadStockItem = createMutationHook<StockItem, number>((id) =>
  stockControlApiClient.stockItemById(id),
);

export const useScanIssuanceQr = createMutationHook<IssuanceScanResult, string>((qrToken) =>
  stockControlApiClient.scanIssuanceQr(qrToken),
);

export const useLoadCertificatesByBatch = createMutationHook<SupplierCertificate[], string>(
  (batchNumber) => stockControlApiClient.certificatesByBatchNumber(batchNumber),
);

export const useCreateBatchIssuance = createMutationHook<BatchIssuanceResult, BatchIssuanceDto>(
  (dto) => stockControlApiClient.createBatchIssuance(dto),
  [stockControlKeys.issueStock.recentIssuances(), stockControlKeys.inventory.all],
);

export const useUndoIssuance = createMutationHook<StockIssuance, number>(
  (issuanceId) => stockControlApiClient.undoIssuance(issuanceId),
  [stockControlKeys.issueStock.recentIssuances(), stockControlKeys.inventory.all],
);

export const useLoadStaffMembers = createMutationHook<StaffMember[], StaffMembersParams>((params) =>
  stockControlApiClient.staffMembers(params),
);

export const useUpdateLinkedStaff = createMutationHook<
  { linkedStaffId: number | null },
  number | null
>(
  (staffId) => stockControlApiClient.updateLinkedStaff(staffId),
  (_data, staffId) => [stockControlKeys.issueStock.linkedStaff(staffId ?? 0)],
);

export const useLoadStaffMember = createMutationHook<StaffMember, number>((staffId) =>
  stockControlApiClient.staffMemberById(staffId),
);

export const useLoadJobCard = createMutationHook<JobCard, number>((jobCardId) =>
  stockControlApiClient.jobCardById(jobCardId),
);

export const useLoadJobCards = createMutationHook<JobCard[], string | undefined>((status) =>
  stockControlApiClient.jobCards(status),
);

export const useLoadJobCardAllocations = createMutationHook<StockAllocation[], number>(
  (jobCardId) => stockControlApiClient.jobCardAllocations(jobCardId),
);

export const useLoadJobCardCoatingAnalysis = createMutationHook<CoatingAnalysis | null, number>(
  (jobCardId) => stockControlApiClient.jobCardCoatingAnalysis(jobCardId),
);

export const useLoadRecentIssuances = createMutationHook<StockIssuance[], void>(() =>
  stockControlApiClient.recentIssuances(),
);
