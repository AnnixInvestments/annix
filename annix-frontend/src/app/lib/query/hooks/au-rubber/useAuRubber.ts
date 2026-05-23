import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  type AuCocStatus,
  type AuRubberPermissionDto,
  type AuRubberRoleDto,
  type AuRubberUserAccessDto,
  auRubberApiClient,
  type BlogPostDto,
  type ChemicalSupplierDocumentDto,
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
import { fromISO, nowMillis } from "@/app/lib/datetime";
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

const POLL_STALE_MS = 10 * 60 * 1000;

// Drives refetchInterval for the extraction-status polls. Polling continues only
// while a PENDING document is younger than POLL_STALE_MS, so a stuck extraction
// stops being polled instead of looping forever; the interval also backs off as
// the document ages. The previous version polled a heavy list endpoint every 3s
// with no stop condition, which burned gigabytes of DB egress from one open tab.
function pendingPollInterval<T extends { status: string; createdAt: string }>(
  items: T[] | undefined,
): number | false {
  if (!items) return false;
  const now = nowMillis();
  const pendingAges = items
    .filter((it) => it.status === "PENDING")
    .map((it) => now - fromISO(it.createdAt).toMillis())
    .filter((age) => age >= 0 && age < POLL_STALE_MS);
  if (pendingAges.length === 0) return false;
  const youngest = Math.min(...pendingAges);
  if (youngest < 30_000) return 3_000;
  if (youngest < 120_000) return 10_000;
  return 30_000;
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
    // eslint-disable-next-line no-restricted-syntax -- bounded polling: backs off as the document ages and stops once no PENDING item is younger than 10min, so a stuck extraction can't loop forever.
    refetchInterval: pollWhilePending
      ? (query) => pendingPollInterval(query.state.data?.items)
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
    // eslint-disable-next-line no-restricted-syntax -- bounded polling: backs off as the document ages and stops once no PENDING item is younger than 10min, so a stuck extraction can't loop forever.
    refetchInterval: pollWhilePending
      ? (query) => pendingPollInterval(query.state.data?.items)
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

export function useAuRubberSupplierCocsPendingAuthorizationCount() {
  return useQuery<{ count: number }>({
    queryKey: rubberKeys.supplierCocs.pendingAuthorizationCount(),
    queryFn: () => auRubberApiClient.supplierCocsPendingAuthorizationCount(),
    ...cacheConfig.static,
  });
}

export function useAuRubberSupplierCocsPendingAuthorization(options?: { enabled?: boolean }) {
  const enabledOption = options ? options.enabled : undefined;
  const enabled = enabledOption === undefined ? true : enabledOption;
  return useQuery<Array<RubberSupplierCocDto & { previousVersionCocNumber: string | null }>>({
    queryKey: rubberKeys.supplierCocs.pendingAuthorization(),
    queryFn: () => auRubberApiClient.supplierCocsPendingAuthorization(),
    enabled,
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

export function useAuRubberUpdateDeliveryNoteItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      items,
    }: {
      id: number;
      items: Parameters<typeof auRubberApiClient.updateDeliveryNoteItems>[1];
    }) => auRubberApiClient.updateDeliveryNoteItems(id, items),
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

export function useAuRubberLinkTaxInvoiceCalenderRollCoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cocId }: { id: number; cocId: number | null }) =>
      auRubberApiClient.linkTaxInvoiceCalenderRollCoc(id, cocId),
    onSuccess: (_result, { id }) => {
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

export function useAuRubberChemicalDocuments(filters?: {
  supplierCompanyId?: number;
  processingStatus?: CocProcessingStatus;
  search?: string;
}) {
  return useQuery<ChemicalSupplierDocumentDto[]>({
    queryKey: rubberKeys.chemicalDocuments.list(filters),
    queryFn: () => auRubberApiClient.chemicalDocuments(filters),
  });
}

export function useAuRubberChemicalDocument(id: number) {
  return useQuery<ChemicalSupplierDocumentDto>({
    queryKey: rubberKeys.chemicalDocuments.detail(id),
    queryFn: () => auRubberApiClient.chemicalDocumentById(id),
    enabled: id > 0,
  });
}

export function useAuRubberUploadChemicalDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      data,
    }: {
      file: File;
      data: Parameters<typeof auRubberApiClient.uploadChemicalDocument>[1];
    }) => auRubberApiClient.uploadChemicalDocument(file, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.chemicalDocuments.all });
    },
  });
}

export function useAuRubberExtractChemicalDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => auRubberApiClient.extractChemicalDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.chemicalDocuments.all });
    },
  });
}

export function useAuRubberUpdateChemicalDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Parameters<typeof auRubberApiClient.updateChemicalDocument>[1];
    }) => auRubberApiClient.updateChemicalDocument(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.chemicalDocuments.all });
    },
  });
}

export function useAuRubberApproveChemicalDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => auRubberApiClient.approveChemicalDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.chemicalDocuments.all });
    },
  });
}

export function useAuRubberDeleteChemicalDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => auRubberApiClient.deleteChemicalDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.chemicalDocuments.all });
    },
  });
}

export function useAuRubberLinkChemicalDocumentSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Parameters<typeof auRubberApiClient.linkChemicalDocumentSupplier>[1];
    }) => auRubberApiClient.linkChemicalDocumentSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.chemicalDocuments.all });
    },
  });
}

export function useAuRubberChemicalDocumentUrl() {
  return useMutation({
    mutationFn: (id: number) => auRubberApiClient.chemicalDocumentUrl(id),
  });
}

export function useAuRubberDedupeActiveSupplierCocs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => auRubberApiClient.dedupeActiveSupplierCocs(),
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
