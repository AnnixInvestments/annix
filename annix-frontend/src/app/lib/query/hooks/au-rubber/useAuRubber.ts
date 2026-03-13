import { useQuery } from "@tanstack/react-query";
import {
  auRubberApiClient,
  type AuCocStatus,
  type CocProcessingStatus,
  type CompoundQualityDetailDto,
  type CompoundQualitySummaryDto,
  type DeliveryNoteStatus,
  type DeliveryNoteType,
  type QualityAlertDto,
  type RubberAuCocDto,
  type RubberDeliveryNoteDto,
  type RubberSupplierCocDto,
  type SupplierCocType,
} from "@/app/lib/api/auRubberApi";
import type {
  RubberCompanyDto,
  RubberOrderDto,
  RubberProductCodingDto,
  RubberProductDto,
} from "@/app/lib/api/rubberPortalApi";
import { rubberKeys } from "../../keys";

export function useAuRubberOrders(status?: number) {
  return useQuery<RubberOrderDto[]>({
    queryKey: rubberKeys.orders.list(status),
    queryFn: () => auRubberApiClient.orders(status),
  });
}

export function useAuRubberCompanies() {
  return useQuery<RubberCompanyDto[]>({
    queryKey: rubberKeys.companies.list(),
    queryFn: () => auRubberApiClient.companies(),
  });
}

export function useAuRubberProducts() {
  return useQuery<RubberProductDto[]>({
    queryKey: rubberKeys.products.list(),
    queryFn: () => auRubberApiClient.products(),
  });
}

export function useAuRubberSupplierCocs(filters?: {
  cocType?: SupplierCocType;
  processingStatus?: CocProcessingStatus;
  supplierId?: number;
}) {
  return useQuery<RubberSupplierCocDto[]>({
    queryKey: rubberKeys.supplierCocs.list(filters),
    queryFn: () => auRubberApiClient.supplierCocs(filters),
  });
}

export function useAuRubberDeliveryNotes(filters?: {
  deliveryNoteType?: DeliveryNoteType;
  status?: DeliveryNoteStatus;
  supplierId?: number;
}) {
  return useQuery<RubberDeliveryNoteDto[]>({
    queryKey: rubberKeys.deliveryNotes.list(filters),
    queryFn: () => auRubberApiClient.deliveryNotes(filters),
  });
}

export function useAuRubberAuCocs(filters?: { status?: AuCocStatus; customerId?: number }) {
  return useQuery<RubberAuCocDto[]>({
    queryKey: rubberKeys.auCocs.list(filters),
    queryFn: () => auRubberApiClient.auCocs(filters),
  });
}

export function useAuRubberQualityTrackingSummary() {
  return useQuery<CompoundQualitySummaryDto[]>({
    queryKey: rubberKeys.qualityTracking.summary(),
    queryFn: () => auRubberApiClient.qualityTrackingSummary(),
  });
}

export function useAuRubberQualityTrackingDetail(compoundCode: string) {
  return useQuery<CompoundQualityDetailDto>({
    queryKey: rubberKeys.qualityTracking.detail(compoundCode),
    queryFn: () => auRubberApiClient.qualityTrackingDetail(compoundCode),
    enabled: !!compoundCode,
  });
}

export function useAuRubberPendingAuCocs() {
  return useQuery<RubberAuCocDto[]>({
    queryKey: rubberKeys.pendingAuCocs.list(),
    queryFn: () => auRubberApiClient.pendingAuCocs(),
  });
}

export function useAuRubberCodings(codingType?: string) {
  return useQuery<RubberProductCodingDto[]>({
    queryKey: rubberKeys.codings.list(codingType),
    queryFn: () => auRubberApiClient.productCodings(codingType),
  });
}

export function useAuRubberQualityAlerts() {
  return useQuery<QualityAlertDto[]>({
    queryKey: rubberKeys.qualityAlerts.list(),
    queryFn: () => auRubberApiClient.qualityAlerts(),
  });
}
