import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  type AuCocStatus,
  type AuRubberPermissionDto,
  type AuRubberRoleDto,
  type AuRubberUserAccessDto,
  auRubberApiClient,
  type BlogPostDto,
  type CocProcessingStatus,
  type CompoundQualityDetailDto,
  type CompoundQualitySummaryDto,
  type DeliveryNoteStatus,
  type DeliveryNoteType,
  type PaginatedResult,
  type QualityAlertDto,
  type RubberAuCocDto,
  type RubberDeliveryNoteDto,
  type RubberDeliveryNoteItemDto,
  type RubberSpecificationDto,
  type RubberSupplierCocDto,
  type RubberTaxInvoiceDto,
  type RubberTaxInvoiceStatementDto,
  type ScrapedBrandingCandidates,
  type SupplierCocType,
  type TaxInvoiceStatus,
  type TaxInvoiceType,
  type TestimonialDto,
  type WebsitePageDto,
} from "@/app/lib/api/auRubberApi";
import type {
  RubberCompanyDto,
  RubberOrderDto,
  RubberProductCodingDto,
  RubberProductDto,
} from "@/app/lib/api/rubberPortalApi";
import { cacheConfig } from "../../cacheConfig";
import { rubberKeys } from "../../keys";

export function useAuRubberOrders(status?: number) {
  return useQuery<RubberOrderDto[]>({
    queryKey: rubberKeys.orders.list(status),
    queryFn: () => auRubberApiClient.orders(status),
    ...cacheConfig.list,
  });
}

export function useAuRubberCompanies() {
  return useQuery<RubberCompanyDto[]>({
    queryKey: rubberKeys.companies.list(),
    queryFn: () => auRubberApiClient.companies(),
    ...cacheConfig.static,
  });
}

export function useAuRubberProducts() {
  return useQuery<RubberProductDto[]>({
    queryKey: rubberKeys.products.list(),
    queryFn: () => auRubberApiClient.products(),
    ...cacheConfig.static,
  });
}

export function useAuRubberSupplierCocs(filters?: {
  cocType?: SupplierCocType;
  processingStatus?: CocProcessingStatus;
  supplierId?: number;
  includeAllVersions?: boolean;
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
  companyType?: "SUPPLIER" | "CUSTOMER";
  includeAllVersions?: boolean;
  search?: string;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  pollWhilePending?: boolean;
}) {
  const pollWhilePending = filters?.pollWhilePending;
  return useQuery<PaginatedResult<RubberDeliveryNoteDto>>({
    queryKey: rubberKeys.deliveryNotes.list(filters),
    queryFn: () => auRubberApiClient.deliveryNotes(filters),
    // eslint-disable-next-line no-restricted-syntax -- short polling justified: only fires while PENDING items exist (post-upload extraction window), auto-stops when all are EXTRACTED. Replaces manual setTimeout(refresh, 5000/20000/30000) cascade.
    refetchInterval: pollWhilePending
      ? (query) => {
          const data = query.state.data;
          if (!data) return false;
          const items = data.items;
          const hasPending = items.some((inv) => inv.status === "PENDING");
          return hasPending ? 3000 : false;
        }
      : false,
  });
}

export function useAuRubberAuCocs(filters?: { status?: AuCocStatus; customerId?: number }) {
  return useQuery<RubberAuCocDto[]>({
    queryKey: rubberKeys.auCocs.list(filters),
    queryFn: () => auRubberApiClient.auCocs(filters),
  });
}

export function useAuRubberTaxInvoiceStatements(invoiceType: TaxInvoiceType) {
  return useQuery<RubberTaxInvoiceStatementDto[]>({
    queryKey: rubberKeys.taxInvoices.statements(invoiceType),
    queryFn: () => auRubberApiClient.taxInvoiceStatements({ invoiceType }),
    ...cacheConfig.list,
  });
}

export function useAuRubberTaxInvoices(filters?: {
  invoiceType?: TaxInvoiceType;
  status?: TaxInvoiceStatus;
  companyId?: number;
  includeAllVersions?: boolean;
  isCreditNote?: boolean;
  search?: string;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  pollWhilePending?: boolean;
}) {
  const pollWhilePending = filters?.pollWhilePending;
  return useQuery<PaginatedResult<RubberTaxInvoiceDto>>({
    queryKey: rubberKeys.taxInvoices.list(filters),
    queryFn: () => auRubberApiClient.taxInvoices(filters),
    // eslint-disable-next-line no-restricted-syntax -- short polling justified: only fires while PENDING items exist (post-upload extraction window), auto-stops when all are EXTRACTED. Replaces manual setTimeout(refresh, 5000/20000/30000) cascade.
    refetchInterval: pollWhilePending
      ? (query) => {
          const data = query.state.data;
          if (!data) return false;
          const items = data.items;
          const hasPending = items.some((inv) => inv.status === "PENDING");
          return hasPending ? 3000 : false;
        }
      : false,
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
    ...cacheConfig.list,
  });
}

export function useAuRubberCodings(codingType?: string) {
  return useQuery<RubberProductCodingDto[]>({
    queryKey: rubberKeys.codings.list(codingType),
    queryFn: () => auRubberApiClient.productCodings(codingType),
    ...cacheConfig.static,
  });
}

export function useAuRubberCodingsNeedsReviewCount() {
  return useQuery<{ count: number }>({
    queryKey: rubberKeys.codings.needsReviewCount(),
    queryFn: () => auRubberApiClient.productCodingsNeedsReviewCount(),
    ...cacheConfig.static,
  });
}

export function useAuRubberSpecifications() {
  return useQuery<RubberSpecificationDto[]>({
    queryKey: rubberKeys.specifications.list(),
    queryFn: () => auRubberApiClient.rubberSpecifications(),
    ...cacheConfig.static,
  });
}

export function useAuRubberQualityAlerts() {
  return useQuery<QualityAlertDto[]>({
    queryKey: rubberKeys.qualityAlerts.list(),
    queryFn: () => auRubberApiClient.qualityAlerts(),
  });
}

export function useAuRubberWebsitePages() {
  return useQuery<WebsitePageDto[]>({
    queryKey: rubberKeys.websitePages.list(),
    queryFn: () => auRubberApiClient.websitePages(),
  });
}

export function useAuRubberWebsitePage(id: string) {
  return useQuery<WebsitePageDto>({
    queryKey: rubberKeys.websitePages.detail(id),
    queryFn: () => auRubberApiClient.websitePage(id),
    enabled: !!id,
  });
}

export function useAuRubberTestimonials() {
  return useQuery<TestimonialDto[]>({
    queryKey: rubberKeys.testimonials.list(),
    queryFn: () => auRubberApiClient.testimonials(),
  });
}

export function useAuRubberTestimonial(id: string) {
  return useQuery<TestimonialDto>({
    queryKey: rubberKeys.testimonials.detail(id),
    queryFn: () => auRubberApiClient.testimonial(id),
    enabled: !!id,
  });
}

export function useAuRubberBlogPosts() {
  return useQuery<BlogPostDto[]>({
    queryKey: rubberKeys.blogPosts.list(),
    queryFn: () => auRubberApiClient.blogPosts(),
  });
}

export function useAuRubberBlogPost(id: string) {
  return useQuery<BlogPostDto>({
    queryKey: rubberKeys.blogPosts.detail(id),
    queryFn: () => auRubberApiClient.blogPost(id),
    enabled: !!id,
  });
}

export function useAuRubberProxyImageBlob(url: string | null) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) {
      setObjectUrl(null);
      setFailed(false);
      return;
    }
    const controller = new AbortController();
    const proxyUrl = auRubberApiClient.proxyImageUrl(url);
    const headers = auRubberApiClient.authHeaders();
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

export function useAuRubberDeliveryNoteDetail(id: number) {
  return useQuery<RubberDeliveryNoteDto>({
    queryKey: rubberKeys.deliveryNotes.detail(id),
    queryFn: () => auRubberApiClient.deliveryNoteById(id),
    enabled: id > 0,
  });
}

export function useAuRubberDeliveryNoteItems(deliveryNoteId: number) {
  return useQuery<RubberDeliveryNoteItemDto[]>({
    queryKey: [...rubberKeys.deliveryNotes.detail(deliveryNoteId), "items"] as const,
    queryFn: () => auRubberApiClient.deliveryNoteItems(deliveryNoteId),
    enabled: deliveryNoteId > 0,
  });
}

export function useAuRubberSaveDeliveryNoteCorrections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Parameters<typeof auRubberApiClient.saveExtractedDataCorrections>[1];
    }) => auRubberApiClient.saveExtractedDataCorrections(id, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.deliveryNotes.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: rubberKeys.deliveryNotes.all });
    },
  });
}

export function useAuRubberExtractDeliveryNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => auRubberApiClient.extractDeliveryNote(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.deliveryNotes.detail(id) });
      queryClient.invalidateQueries({ queryKey: rubberKeys.deliveryNotes.all });
    },
  });
}

export function useAuRubberDeliveryNotePageUrl() {
  return useMutation({
    mutationFn: ({ id, pageNumber }: { id: number; pageNumber: number }) =>
      auRubberApiClient.deliveryNotePageUrl(id, pageNumber),
  });
}

export function useAuRubberDeleteDeliveryNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => auRubberApiClient.deleteDeliveryNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.deliveryNotes.all });
    },
  });
}

export function useAuRubberLinkDeliveryNoteToCoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cocId }: { id: number; cocId: number }) =>
      auRubberApiClient.linkDeliveryNoteToCoc(id, cocId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.deliveryNotes.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: rubberKeys.deliveryNotes.all });
    },
  });
}

export function useAuRubberFinalizeDeliveryNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => auRubberApiClient.finalizeDeliveryNote(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.deliveryNotes.detail(id) });
      queryClient.invalidateQueries({ queryKey: rubberKeys.deliveryNotes.all });
    },
  });
}

export function useAuRubberApproveDeliveryNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => auRubberApiClient.approveDeliveryNote(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.deliveryNotes.detail(id) });
      queryClient.invalidateQueries({ queryKey: rubberKeys.deliveryNotes.all });
    },
  });
}

export function useAuRubberRefileDeliveryNoteStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => auRubberApiClient.refileDeliveryNoteStock(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.deliveryNotes.detail(id) });
      queryClient.invalidateQueries({ queryKey: rubberKeys.deliveryNotes.all });
    },
  });
}

export function useAuRubberBackfillDeliveryNoteSiblings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => auRubberApiClient.backfillDeliveryNoteSiblings(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.deliveryNotes.detail(id) });
      queryClient.invalidateQueries({ queryKey: rubberKeys.deliveryNotes.all });
    },
  });
}

export function useAuRubberRefileTaxInvoiceStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => auRubberApiClient.refileTaxInvoiceStock(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.taxInvoices.detail(id) });
      queryClient.invalidateQueries({ queryKey: rubberKeys.taxInvoices.all });
    },
  });
}

export function useAuRubberAnalyzeSupplierCocs() {
  return useMutation({
    mutationFn: (files: File[]) => auRubberApiClient.analyzeSupplierCocs(files),
  });
}

export function useAuRubberCreateCocsFromAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      files,
      analysis,
    }: {
      files: File[];
      analysis: Parameters<typeof auRubberApiClient.createCocsFromAnalysis>[1];
    }) => auRubberApiClient.createCocsFromAnalysis(files, analysis),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.supplierCocs.all });
    },
  });
}

export function useAuRubberUploadSupplierCocWithFiles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      files,
      data,
    }: {
      files: File[];
      data: Parameters<typeof auRubberApiClient.uploadSupplierCocWithFiles>[1];
    }) => auRubberApiClient.uploadSupplierCocWithFiles(files, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.supplierCocs.all });
    },
  });
}

export function useAuRubberUploadSupplierCoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof auRubberApiClient.uploadSupplierCoc>[0]) =>
      auRubberApiClient.uploadSupplierCoc(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.supplierCocs.all });
    },
  });
}

export function useAuRubberDeleteSupplierCoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => auRubberApiClient.deleteSupplierCoc(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.supplierCocs.all });
    },
  });
}

export function useAuRubberExtractSupplierCoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => auRubberApiClient.extractSupplierCoc(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.supplierCocs.all });
    },
  });
}

export function useAuRubberApproveSupplierCoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => auRubberApiClient.approveSupplierCoc(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.supplierCocs.all });
    },
  });
}

export function useAuRubberUpdateSupplierCoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Parameters<typeof auRubberApiClient.updateSupplierCoc>[1];
    }) => auRubberApiClient.updateSupplierCoc(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.supplierCocs.all });
    },
  });
}

export function useAuRubberAuthorizeVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      kind,
      id,
    }: {
      kind: "supplier-cocs" | "delivery-notes" | "tax-invoices";
      id: number;
    }) => auRubberApiClient.authorizeVersion(kind, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.supplierCocs.all });
      queryClient.invalidateQueries({ queryKey: rubberKeys.deliveryNotes.all });
    },
  });
}

export function useAuRubberRejectVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      kind,
      id,
    }: {
      kind: "supplier-cocs" | "delivery-notes" | "tax-invoices";
      id: number;
    }) => auRubberApiClient.rejectVersion(kind, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.supplierCocs.all });
      queryClient.invalidateQueries({ queryKey: rubberKeys.deliveryNotes.all });
    },
  });
}

export function useAuRubberDocumentUrl() {
  return useMutation({
    mutationFn: (documentPath: string) => auRubberApiClient.documentUrl(documentPath),
  });
}

export function useAuRubberAccessUsers() {
  return useQuery<AuRubberUserAccessDto[]>({
    queryKey: rubberKeys.accessUsers.list(),
    queryFn: () => auRubberApiClient.accessUsers(),
  });
}

export function useAuRubberAccessRoles() {
  return useQuery<AuRubberRoleDto[]>({
    queryKey: rubberKeys.accessRoles.list(),
    queryFn: () => auRubberApiClient.accessRoles(),
  });
}

export function useAuRubberAccessPermissions() {
  return useQuery<AuRubberPermissionDto[]>({
    queryKey: rubberKeys.accessPermissions.list(),
    queryFn: () => auRubberApiClient.accessPermissions(),
  });
}

export function useAuRubberSetRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: number; permissions: string[] }) =>
      auRubberApiClient.setRolePermissions(roleId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.accessRoles.all });
    },
  });
}

export function useAuRubberDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: number) => auRubberApiClient.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.accessRoles.all });
      queryClient.invalidateQueries({ queryKey: rubberKeys.accessUsers.all });
    },
  });
}

export function useAuRubberCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof auRubberApiClient.createRole>[0]) =>
      auRubberApiClient.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.accessRoles.all });
    },
  });
}

export function useAuRubberInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof auRubberApiClient.inviteUser>[0]) =>
      auRubberApiClient.inviteUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.accessUsers.all });
    },
  });
}

export function useAuRubberUpdateUserAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ accessId, roleCode }: { accessId: number; roleCode: string }) =>
      auRubberApiClient.updateUserAccess(accessId, roleCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.accessUsers.all });
    },
  });
}

export function useAuRubberRevokeUserAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accessId: number) => auRubberApiClient.revokeUserAccess(accessId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.accessUsers.all });
    },
  });
}

export function useAuRubberScrapeBranding() {
  return useMutation<ScrapedBrandingCandidates, Error, string>({
    mutationFn: (websiteUrl: string) => auRubberApiClient.scrapeBranding(websiteUrl),
  });
}

export function useAuRubberFeatureFlagsDetailed() {
  return useQuery({
    queryKey: rubberKeys.featureFlags.list(),
    queryFn: () => auRubberApiClient.featureFlagsDetailed(),
  });
}

export function useAuRubberUpdateFeatureFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flagKey, enabled }: { flagKey: string; enabled: boolean }) =>
      auRubberApiClient.updateFeatureFlag(flagKey, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.featureFlags.all });
    },
  });
}
