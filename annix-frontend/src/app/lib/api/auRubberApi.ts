import { toPairs as entries } from "es-toolkit/compat";
import { throwIfNotOk } from "@/app/lib/api/apiError";
import { type ApiClient, createApiClient, createEndpoint } from "@/app/lib/api/createApiClient";
import { auRubberTokenStore } from "@/app/lib/api/portalTokenStores";
import type { RubberAppProfileDto } from "@/app/lib/api/rubberPortalApi";
import { API_BASE_URL } from "@/lib/api-config";
import type {
  CallOff,
  CreateRubberProductDto,
  ImportProductRowDto,
  ImportProductsResultDto,
  RubberCompanyDto,
  RubberOrderDto,
  RubberPriceCalculationDto,
  RubberPricingTierDto,
  RubberProductCodingDto,
  RubberProductDto,
} from "./rubberPortalApi";

export interface RubberOrderItemInput {
  productId?: number;
  thickness?: number;
  width?: number;
  length?: number;
  quantity?: number;
  callOffs?: CallOff[];
}

export interface CreateRubberOrderInput {
  orderNumber?: string;
  companyOrderNumber?: string;
  companyId?: number;
  items?: RubberOrderItemInput[];
}

export interface UpdateRubberOrderItemInput extends RubberOrderItemInput {
  cpoUnitPrice?: number | null;
  pricePerKg?: number | null;
}

export interface UpdateRubberOrderInput {
  companyOrderNumber?: string;
  status?: number;
  companyId?: number;
  items?: UpdateRubberOrderItemInput[];
}

export interface CreateRubberCompanyInput {
  name: string;
  companyType?: string;
  code?: string;
  pricingTierId?: number;
  availableProducts?: string[];
  isCompoundOwner?: boolean;
  vatNumber?: string;
  registrationNumber?: string;
  address?: Record<string, string>;
  notes?: string;
  phone?: string;
  contactPerson?: string;
  emailConfig?: Record<string, string>;
}

export interface RubberSpecificationDto {
  id: number;
  rubberTypeId: number;
  rubberTypeName: string | null;
  typeNumber: number;
  grade: string;
  hardnessClassIrhd: number;
  tensileStrengthMpaMin: number;
  elongationAtBreakMin: number;
  tensileAfterAgeingMinPercent: number;
  tensileAfterAgeingMaxPercent: number;
  elongationAfterAgeingMinPercent: number;
  elongationAfterAgeingMaxPercent: number;
  hardnessChangeAfterAgeingMax: number;
  heatResistance80cHardnessChangeMax: number | null;
  heatResistance100cHardnessChangeMax: number | null;
  ozoneResistance: string | null;
  chemicalResistanceHardnessChangeMax: number | null;
  waterResistanceMaxPercent: number | null;
  oilResistanceMaxPercent: number | null;
  contaminantReleaseMaxPercent: number | null;
  sansStandard: string;
}

export type CompoundMovementType = "IN" | "OUT" | "ADJUSTMENT";
export type CompoundMovementReferenceType =
  | "PURCHASE"
  | "PRODUCTION"
  | "MANUAL"
  | "STOCK_TAKE"
  | "COC_RECEIPT"
  | "CALENDARING"
  | "OPENING_STOCK"
  | "INVOICE_RECEIPT"
  | "DELIVERY_DEDUCTION";
export type RubberProductionStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type RubberCompoundOrderStatus =
  | "PENDING"
  | "APPROVED"
  | "ORDERED"
  | "RECEIVED"
  | "CANCELLED";
export type SupplierCocType = "COMPOUNDER" | "CALENDARER" | "CALENDER_ROLL";
export type CocProcessingStatus = "PENDING" | "EXTRACTED" | "NEEDS_REVIEW" | "APPROVED";
export type DeliveryNoteType = "COMPOUND" | "ROLL";
export type DeliveryNoteStatus = "PENDING" | "EXTRACTED" | "APPROVED" | "LINKED" | "STOCK_CREATED";
export type RollStockStatus = "IN_STOCK" | "RESERVED" | "SOLD" | "SCRAPPED" | "REJECTED";
export type RollRejectionStatus = "PENDING_RETURN" | "RETURNED" | "REPLACEMENT_RECEIVED" | "CLOSED";
export type AuCocStatus = "DRAFT" | "GENERATED" | "SENT";
export type RollIssuanceStatus = "ACTIVE" | "RETURNED" | "CANCELLED";

export interface RollPhotoExtractionDto {
  date: string | null;
  supplier: string | null;
  compoundCode: string | null;
  thicknessMm: number | null;
  widthMm: number | null;
  lengthM: number | null;
  batchNumber: string | null;
  weightKg: number | null;
  confidence: number;
  analysis: string;
}

export interface RollIssuanceRollDto {
  id: number;
  rollNumber: string;
  compoundCode: string | null;
  compoundName: string | null;
  weightKg: number;
  widthMm: number | null;
  thicknessMm: number | null;
  lengthM: number | null;
  status: string;
}

export interface RollPhotoIdentifyResponse {
  extraction: RollPhotoExtractionDto;
  matchedRoll: RollIssuanceRollDto | null;
  supplierResolved: string | null;
}

export interface JcSearchResultDto {
  id: number;
  jcNumber: string | null;
  jobNumber: string;
  jobName: string;
  customerName: string | null;
  status: string;
}

export interface JcLineItemDto {
  id: number;
  itemNo: string | null;
  itemCode: string | null;
  itemDescription: string | null;
  quantity: number | null;
  m2: number | null;
}

export interface CreateRollFromPhotoDto {
  rollNumber: string;
  compoundCode?: string | null;
  weightKg: number;
  widthMm?: number | null;
  thicknessMm?: number | null;
  lengthM?: number | null;
}

export interface CreateRollIssuanceLineItemInput {
  lineItemId: number;
  itemDescription?: string | null;
  itemNo?: string | null;
  quantity?: number | null;
  m2?: number | null;
}

export interface CreateRollIssuanceItemInput {
  jobCardId: number;
  jcNumber: string;
  jobName?: string | null;
  lineItems: CreateRollIssuanceLineItemInput[];
}

export interface CreateRollIssuanceDto {
  rollStockId: number;
  issuedBy: string;
  photoPath?: string | null;
  notes?: string | null;
  jobCards: CreateRollIssuanceItemInput[];
}

export interface RollIssuanceLineItemDto {
  id: number;
  lineItemId: number;
  itemDescription: string | null;
  itemNo: string | null;
  quantity: number | null;
  m2: number | null;
  estimatedWeightKg: number | null;
}

export interface RollIssuanceItemDto {
  id: number;
  jobCardId: number;
  jcNumber: string;
  jobName: string | null;
  lineItems: RollIssuanceLineItemDto[];
}

export interface RollIssuanceDto {
  id: number;
  rollStockId: number;
  rollNumber: string;
  compoundCode: string | null;
  issuedBy: string;
  issuedAt: string;
  rollWeightAtIssueKg: number;
  totalEstimatedUsageKg: number | null;
  expectedReturnKg: number | null;
  photoPath: string | null;
  notes: string | null;
  status: RollIssuanceStatus;
  statusLabel: string;
  items: RollIssuanceItemDto[];
  createdAt: string;
}
export type RequisitionStatus =
  | "PENDING"
  | "APPROVED"
  | "ORDERED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";
export type RequisitionSourceType = "LOW_STOCK" | "MANUAL" | "EXTERNAL_PO";
export type RequisitionItemType = "COMPOUND" | "ROLL";
export type QualityAlertType = "DRIFT" | "DROP" | "CV_HIGH";
export type QualityAlertSeverity = "WARNING" | "CRITICAL";
export type TrendDirection = "up" | "down" | "stable";
export type QualityStatus = "normal" | "warning" | "critical";
export type TaxInvoiceType = "SUPPLIER" | "CUSTOMER";
export type TaxInvoiceStatus = "PENDING" | "EXTRACTED" | "APPROVED";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ExtractedTaxInvoiceRoll {
  rollNumber: string;
  weightKg: number | null;
}

export interface ExtractedTaxInvoiceLineItem {
  description: string;
  compoundCode?: string | null;
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null;
  rolls?: ExtractedTaxInvoiceRoll[] | null;
}

export interface ExtractedTaxInvoiceData {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  companyName: string | null;
  productSummary: string | null;
  deliveryNoteRef: string | null;
  orderNumber: string | null;
  lineItems: ExtractedTaxInvoiceLineItem[];
  subtotal: number | null;
  vatAmount: number | null;
  totalAmount: number | null;
  originalInvoiceRef?: string | null;
  rollNumbers?: string[] | null;
}

export interface RubberTaxInvoiceDto {
  id: number;
  firebaseUid: string;
  invoiceNumber: string;
  invoiceDate: string | null;
  invoiceType: TaxInvoiceType;
  invoiceTypeLabel: string;
  companyId: number;
  companyName: string | null;
  documentPath: string | null;
  status: TaxInvoiceStatus;
  statusLabel: string;
  extractedData: ExtractedTaxInvoiceData | null;
  totalAmount: number | null;
  vatAmount: number | null;
  exportedToSageAt: string | null;
  sageInvoiceId: number | null;
  postedToSageAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  productDescription: string | null;
  numberOfRolls: number | null;
  unit: string | null;
  costPerUnit: number | null;
  version: number;
  versionStatus: string;
  versionStatusLabel: string;
  previousVersionId: number | null;
  isCreditNote: boolean;
  originalInvoiceId: number | null;
  originalInvoiceNumber: string | null;
  creditNoteRollNumbers: string[];
}

export interface RubberTaxInvoiceStatementDto {
  companyId: number;
  companyName: string;
  companyCode: string | null;
  emailConfig: Record<string, string> | null;
  invoiceCount: number;
  total: number;
  vatTotal: number;
}

export interface MetricStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  cv: number;
  trend: TrendDirection;
  latestValue: number;
  sampleCount: number;
}

export interface CompoundQualitySummaryDto {
  compoundCode: string;
  batchCount: number;
  lastBatchDate: string | null;
  shoreA: MetricStats | null;
  tc90: MetricStats | null;
  tensile: MetricStats | null;
  elongation: MetricStats | null;
  tearStrength: MetricStats | null;
  specificGravity: MetricStats | null;
  rebound: MetricStats | null;
  status: QualityStatus;
  activeAlertCount: number;
}

export interface BatchMetricData {
  batchId: number;
  batchNumber: string;
  createdAt: string;
  shoreA: number | null;
  specificGravity: number | null;
  rebound: number | null;
  tearStrength: number | null;
  tensile: number | null;
  elongation: number | null;
  sMin: number | null;
  sMax: number | null;
  ts2: number | null;
  tc90: number | null;
  passFailStatus: string | null;
}

export interface QualityConfigDto {
  id: number | null;
  compoundCode: string;
  compoundDescription: string | null;
  windowSize: number;
  shoreADriftThreshold: number;
  specificGravityDriftThreshold: number;
  reboundDriftThreshold: number;
  tearStrengthDropPercent: number;
  tensileStrengthDropPercent: number;
  elongationDropPercent: number;
  tc90CvThreshold: number;
  shoreANominal: number | null;
  shoreAMin: number | null;
  shoreAMax: number | null;
  densityNominal: number | null;
  densityMin: number | null;
  densityMax: number | null;
  reboundNominal: number | null;
  reboundMin: number | null;
  reboundMax: number | null;
  tearStrengthNominal: number | null;
  tearStrengthMin: number | null;
  tearStrengthMax: number | null;
  tensileNominal: number | null;
  tensileMin: number | null;
  tensileMax: number | null;
  elongationNominal: number | null;
  elongationMin: number | null;
  elongationMax: number | null;
}

export interface QualityAlertDto {
  id: number;
  compoundCode: string;
  alertType: QualityAlertType;
  alertTypeLabel: string;
  severity: QualityAlertSeverity;
  severityLabel: string;
  metricName: string;
  title: string;
  message: string;
  metricValue: number;
  thresholdValue: number;
  meanValue: number;
  batchNumber: string;
  batchId: number;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  createdAt: string;
}

export interface CompoundQualityDetailDto {
  compoundCode: string;
  batchCount: number;
  stats: {
    shoreA: MetricStats | null;
    specificGravity: MetricStats | null;
    rebound: MetricStats | null;
    tearStrength: MetricStats | null;
    tensile: MetricStats | null;
    elongation: MetricStats | null;
    tc90: MetricStats | null;
  };
  batches: BatchMetricData[];
  config: QualityConfigDto;
  alerts: QualityAlertDto[];
}

export interface AnalyzedOrderLine {
  lineNumber: number;
  productName: string | null;
  productId: number | null;
  thickness: number | null;
  width: number | null;
  length: number | null;
  quantity: number | null;
  unitPrice: number | null;
  confidence: number;
  rawText: string | null;
}

export interface AnalyzedProductLine {
  lineNumber: number;
  title: string | null;
  type: string | null;
  compound: string | null;
  colour: string | null;
  hardness: string | null;
  grade: string | null;
  curingMethod: string | null;
  specificGravity: number | null;
  baseCostPerKg: number | null;
  confidence: number;
  rawText: string | null;
}

export interface AnalyzedProductData {
  filename: string;
  fileType: "pdf" | "excel" | "word";
  lines: AnalyzedProductLine[];
  confidence: number;
  errors: string[];
}

export interface AnalyzeProductFilesResult {
  files: AnalyzedProductData[];
  totalLines: number;
}

export type ExtractionMethod = "ai" | "template";

export interface AnalyzedOrderData {
  filename: string;
  fileType: "pdf" | "excel" | "email";
  companyName: string | null;
  companyId: number | null;
  companyVatNumber: string | null;
  companyAddress: string | null;
  companyRegistrationNumber: string | null;
  poNumber: string | null;
  orderDate: string | null;
  deliveryDate: string | null;
  lines: AnalyzedOrderLine[];
  confidence: number;
  errors: string[];
  emailSubject?: string | null;
  emailFrom?: string | null;
  extractionMethod: ExtractionMethod;
  templateId: number | null;
  templateName: string | null;
  formatHash: string | null;
  isNewFormat: boolean;
  isNewCustomer: boolean;
}

export interface RegionCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

export interface PdfPageImage {
  pageNumber: number;
  imageData: string;
  width: number;
  height: number;
}

export interface TemplateRegionDto {
  fieldName: string;
  regionCoordinates: RegionCoordinates;
  labelCoordinates?: RegionCoordinates | null;
  labelText?: string | null;
  sampleValue?: string | null;
  confidenceThreshold?: number;
}

export interface CreateTemplateDto {
  companyId: number;
  formatHash: string;
  templateName?: string;
  regions: TemplateRegionDto[];
}

export interface PoTemplateDto {
  id: number;
  formatHash: string;
  templateName: string | null;
  useCount: number;
  successCount: number;
  successRate: number;
  regionCount: number;
  createdAt: string;
}

export interface AnalyzeOrderFilesResult {
  files: AnalyzedOrderData[];
  totalLines: number;
}

export interface NewCompanyFromAnalysis {
  name: string;
  vatNumber?: string;
  address?: string;
  registrationNumber?: string;
}

export interface CreateOrderFromAnalysisDto {
  analysis: AnalyzedOrderData;
  overrides?: {
    companyId?: number;
    poNumber?: string;
    lines?: {
      productId?: number;
      thickness?: number;
      width?: number;
      length?: number;
      quantity?: number;
      unitPrice?: number | null;
    }[];
    newCompany?: NewCompanyFromAnalysis;
  };
}

export interface RubberSupplierCocDto {
  id: number;
  firebaseUid: string;
  cocType: SupplierCocType;
  cocTypeLabel: string;
  supplierCompanyId: number;
  supplierCompanyName: string | null;
  documentPath: string | null;
  graphPdfPath: string | null;
  cocNumber: string | null;
  productionDate: string | null;
  compoundCode: string | null;
  orderNumber: string | null;
  ticketNumber: string | null;
  processingStatus: CocProcessingStatus;
  processingStatusLabel: string;
  extractedData: Record<string, unknown> | null;
  reviewNotes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  linkedDeliveryNoteId: number | null;
  linkedCalenderRollCocId: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  versionStatus: string;
  versionStatusLabel: string;
  previousVersionId: number | null;
  rejectedRollNumbers: string[];
}

export interface RubberCompoundBatchDto {
  id: number;
  firebaseUid: string;
  supplierCocId: number;
  supplierCocNumber: string | null;
  batchNumber: string;
  compoundStockId: number | null;
  shoreAHardness: number | null;
  specificGravity: number | null;
  reboundPercent: number | null;
  tearStrengthKnM: number | null;
  tensileStrengthMpa: number | null;
  elongationPercent: number | null;
  rheometerSMin: number | null;
  rheometerSMax: number | null;
  rheometerTs2: number | null;
  rheometerTc90: number | null;
  passFailStatus: string;
  passFailStatusLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedDeliveryNoteRoll {
  rollNumber: string;
  compoundCode?: string | null;
  thicknessMm?: number;
  widthMm?: number;
  lengthM?: number;
  weightKg?: number;
  areaSqM?: number;
  deliveryNoteNumber?: string;
  deliveryDate?: string;
  customerName?: string;
  customerReference?: string;
  pageNumber?: number;
}

export interface ExtractedDeliveryNoteData {
  deliveryNoteNumber?: string;
  deliveryDate?: string;
  supplierName?: string;
  customerName?: string;
  customerReference?: string;
  batchRange?: string;
  totalWeightKg?: number;
  rolls?: ExtractedDeliveryNoteRoll[];
  userCorrected?: boolean;
}

export interface AnalyzedDeliveryNoteCompany {
  name: string | null;
  address: string | null;
  vatNumber: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
}

export interface AnalyzedDeliveryNoteLineItem {
  description: string;
  productCode: string | null;
  compoundCode: string | null;
  quantity: number | null;
  unitOfMeasure: string | null;
  rollNumber: string | null;
  batchNumber: string | null;
  thicknessMm: number | null;
  widthMm: number | null;
  lengthM: number | null;
  weightKg: number | null;
  color: string | null;
  hardnessShoreA: number | null;
}

export interface AnalyzedDeliveryNoteResult {
  success: boolean;
  data: {
    documentType: "SUPPLIER_DELIVERY" | "CUSTOMER_DELIVERY";
    deliveryNoteNumber: string | null;
    deliveryDate: string | null;
    purchaseOrderNumber: string | null;
    customerReference: string | null;
    fromCompany: AnalyzedDeliveryNoteCompany;
    toCompany: AnalyzedDeliveryNoteCompany;
    lineItems: AnalyzedDeliveryNoteLineItem[];
    totals: {
      totalQuantity: number | null;
      totalWeightKg: number | null;
      numberOfRolls: number | null;
    };
    notes: string | null;
    receivedBySignature: boolean;
    receivedDate: string | null;
  };
  tokensUsed?: number;
  processingTimeMs: number;
}

export interface RubberDeliveryNoteDto {
  id: number;
  firebaseUid: string;
  deliveryNoteType: DeliveryNoteType;
  deliveryNoteTypeLabel: string;
  deliveryNoteNumber: string | null;
  customerReference: string | null;
  supplierCompanyId: number;
  supplierCompanyName: string | null;
  deliveryDate: string | null;
  documentPath: string | null;
  status: DeliveryNoteStatus;
  statusLabel: string;
  extractedData: ExtractedDeliveryNoteData | ExtractedDeliveryNoteData[] | null;
  linkedCocId: number | null;
  auCocId: number | null;
  auCocNumber: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  versionStatus: string;
  versionStatusLabel: string;
  previousVersionId: number | null;
  podPageNumbers: number[] | null;
  sourcePageNumbers: number[] | null;
}

export interface RubberDeliveryNoteItemDto {
  id: number;
  deliveryNoteId: number;
  batchNumberStart: string | null;
  batchNumberEnd: string | null;
  weightKg: number | null;
  rollNumber: string | null;
  rollWeightKg: number | null;
  widthMm: number | null;
  thicknessMm: number | null;
  lengthM: number | null;
  linkedBatchIds: number[] | null;
  compoundType: string | null;
  quantity: number | null;
  cocBatchNumbers: string[] | null;
  theoreticalWeightKg: number | null;
  weightDeviationPct: number | null;
  weightFlagged: boolean;
  createdAt: string;
}

export interface AnalyzedCustomerDnFile {
  filename: string;
  originalFileIndex: number;
  deliveryNoteNumber: string | null;
  customerReference: string | null;
  deliveryDate: string | null;
  customerName: string | null;
  customerId: number | null;
  pageInfo: { currentPage: number | null; totalPages: number | null } | null;
  lineItems: Array<{
    lineNumber: number | null;
    compoundType: string | null;
    thicknessMm: number | null;
    widthMm: number | null;
    lengthM: number | null;
    quantity: number | null;
    rollWeightKg: number | null;
    rollNumber: string | null;
    cocBatchNumbers: string[] | null;
    itemCategory: string;
    description: string | null;
  }>;
  pdfText: string;
}

export interface CustomerDnGroup {
  deliveryNoteNumber: string;
  customerReference: string | null;
  deliveryDate: string | null;
  customerId: number | null;
  customerName: string | null;
  files: Array<{
    fileIndex: number;
    filename: string;
    pageNumber: number | null;
  }>;
  allLineItems: AnalyzedCustomerDnFile["lineItems"];
}

export interface AnalyzeCustomerDnsResult {
  files: AnalyzedCustomerDnFile[];
  groups: CustomerDnGroup[];
  unmatchedCustomerNames: string[];
  existingDnNumbers?: string[];
}

export type CustomerDnLineItem = AnalyzedCustomerDnFile["lineItems"][number];

export interface CustomerDnOverride {
  deliveryNoteNumber?: string | null;
  customerId?: number | null;
  customerReference?: string | null;
  deliveryDate?: string | null;
  stockCategory?: string | null;
  lineItems?: CustomerDnLineItem[];
}

export interface RubberRollStockDto {
  id: number;
  firebaseUid: string;
  rollNumber: string;
  compoundCodingId: number;
  compoundName: string | null;
  compoundCode: string | null;
  weightKg: number;
  widthMm: number | null;
  thicknessMm: number | null;
  lengthM: number | null;
  status: RollStockStatus;
  statusLabel: string;
  linkedBatchIds: number[] | null;
  deliveryNoteItemId: number | null;
  soldToCompanyId: number | null;
  soldToCompanyName: string | null;
  auCocId: number | null;
  soldAt: string | null;
  location: string | null;
  notes: string | null;
  costZar: number | null;
  tollCostR: number | null;
  compoundCostR: number | null;
  totalCostR: number | null;
  priceZar: number | null;
  productionDate: string | null;
  customerTaxInvoiceId: number | null;
  supplierTaxInvoiceId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RollRejectionDto {
  id: number;
  firebaseUid: string;
  originalSupplierCocId: number;
  originalCocNumber: string | null;
  rollNumber: string;
  rollStockId: number | null;
  rejectionReason: string;
  rejectedBy: string;
  rejectedAt: string;
  returnDocumentPath: string | null;
  replacementSupplierCocId: number | null;
  replacementCocNumber: string | null;
  replacementRollNumber: string | null;
  status: RollRejectionStatus;
  statusLabel: string;
  notes: string | null;
  createdAt: string;
}

export interface CreateOpeningStockDto {
  rollNumber: string;
  compoundCodingId: number;
  weightKg: number;
  costZar?: number | null;
  priceZar?: number | null;
  locationId?: number | null;
  productionDate?: string | null;
  notes?: string | null;
}

export interface ImportOpeningStockRowDto {
  rollNumber: string;
  compoundCode: string;
  weightKg: number;
  costZar?: number | null;
  priceZar?: number | null;
  location?: string | null;
  productionDate?: string | null;
}

export interface ImportOpeningStockResultDto {
  totalRows: number;
  created: number;
  errors: { row: number; rollNumber: string; error: string }[];
}

export interface CreateCompoundOpeningStockDto {
  compoundCodingId: number;
  quantityKg: number;
  costPerKg?: number | null;
  minStockLevelKg?: number;
  reorderPointKg?: number;
  locationId?: number | null;
  batchNumber?: string | null;
  date?: string | null;
  notes?: string | null;
}

export interface ImportCompoundOpeningStockRowDto {
  compoundCode: string;
  quantityKg: number;
  costPerKg?: number | null;
  minStockLevelKg?: number | null;
  reorderPointKg?: number | null;
  location?: string | null;
  batchNumber?: string | null;
}

export interface ImportCompoundOpeningStockResultDto {
  totalRows: number;
  created: number;
  updated: number;
  errors: { row: number; compoundCode: string; error: string }[];
}

export type OtherStockUnitOfMeasure =
  | "EACH"
  | "BOX"
  | "PACK"
  | "KG"
  | "LITERS"
  | "METERS"
  | "ROLLS"
  | "SHEETS"
  | "PAIRS"
  | "SETS";

export interface RubberOtherStockDto {
  id: number;
  firebaseUid: string;
  itemCode: string;
  itemName: string;
  description: string | null;
  category: string | null;
  unitOfMeasure: OtherStockUnitOfMeasure;
  unitOfMeasureLabel: string;
  quantity: number;
  minStockLevel: number;
  reorderPoint: number;
  costPerUnit: number | null;
  pricePerUnit: number | null;
  location: string | null;
  locationId: number | null;
  supplier: string | null;
  notes: string | null;
  isActive: boolean;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOtherStockDto {
  itemCode: string;
  itemName: string;
  description?: string | null;
  category?: string | null;
  unitOfMeasure: OtherStockUnitOfMeasure;
  quantity: number;
  minStockLevel?: number;
  reorderPoint?: number;
  costPerUnit?: number | null;
  pricePerUnit?: number | null;
  locationId?: number | null;
  supplier?: string | null;
  notes?: string | null;
}

export interface UpdateOtherStockDto {
  itemName?: string;
  description?: string | null;
  category?: string | null;
  unitOfMeasure?: OtherStockUnitOfMeasure;
  quantity?: number;
  minStockLevel?: number;
  reorderPoint?: number;
  costPerUnit?: number | null;
  pricePerUnit?: number | null;
  locationId?: number | null;
  supplier?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface ReceiveOtherStockDto {
  otherStockId: number;
  quantity: number;
}

export interface AdjustOtherStockDto {
  otherStockId: number;
  newQuantity: number;
  reason?: string;
}

export interface ImportOtherStockRowDto {
  itemCode: string;
  itemName: string;
  description?: string | null;
  category?: string | null;
  unitOfMeasure?: string | null;
  quantity: number;
  minStockLevel?: number | null;
  reorderPoint?: number | null;
  costPerUnit?: number | null;
  pricePerUnit?: number | null;
  location?: string | null;
  supplier?: string | null;
  notes?: string | null;
}

export interface ImportOtherStockResultDto {
  totalRows: number;
  created: number;
  updated: number;
  errors: { row: number; itemCode: string; error: string }[];
}

export interface ExtractedRollDataDto {
  rollNumber: string;
  thicknessMm?: number | null;
  widthMm?: number | null;
  lengthM?: number | null;
  weightKg?: number | null;
  areaSqM?: number | null;
}

export interface RubberAuCocDto {
  id: number;
  firebaseUid: string;
  cocNumber: string;
  customerCompanyId: number;
  customerCompanyName: string | null;
  poNumber: string | null;
  deliveryNoteRef: string | null;
  sourceDeliveryNoteId: number | null;
  extractedRollData: ExtractedRollDataDto[] | null;
  status: AuCocStatus;
  statusLabel: string;
  generatedPdfPath: string | null;
  sentAt: string | null;
  sentToEmail: string | null;
  approvedAt: string | null;
  approvedByName: string | null;
  notes: string | null;
  createdBy: string | null;
  readinessStatus: string | null;
  readinessDetails: {
    calendererCocId: number | null;
    compounderCocId: number | null;
    graphPdfPath: string | null;
    calendererApproved: boolean;
    compounderApproved: boolean;
    missingDocuments: string[];
    lastCheckedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  items: RubberAuCocItemDto[];
}

export interface RubberAuCocItemDto {
  id: number;
  auCocId: number;
  rollStockId: number;
  rollNumber: string | null;
  testDataSummary: Record<string, unknown> | null;
}

export interface RollTraceabilityDto {
  roll: RubberRollStockDto;
  batches: RubberCompoundBatchDto[];
  supplierCocs: RubberSupplierCocDto[];
  auCoc: RubberAuCocDto | null;
}

export interface StockLocationDto {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RequisitionItemDto {
  id: number;
  requisitionId: number;
  itemType: RequisitionItemType;
  compoundStockId: number | null;
  compoundCodingId: number | null;
  compoundName: string | null;
  quantityKg: number;
  quantityReceivedKg: number;
  unitPrice: number | null;
  notes: string | null;
  createdAt: string;
}

export interface RequisitionDto {
  id: number;
  firebaseUid: string;
  requisitionNumber: string;
  sourceType: RequisitionSourceType;
  sourceTypeLabel: string;
  status: RequisitionStatus;
  statusLabel: string;
  supplierCompanyId: number | null;
  supplierCompanyName: string | null;
  externalPoNumber: string | null;
  externalPoDocumentPath: string | null;
  expectedDeliveryDate: string | null;
  notes: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  orderedAt: string | null;
  receivedAt: string | null;
  items: RequisitionItemDto[];
  totalQuantityKg: number;
  totalReceivedKg: number;
  createdAt: string;
  updatedAt: string;
}

export interface RubberCompoundStockDto {
  id: number;
  firebaseUid: string;
  compoundCodingId: number;
  compoundName: string | null;
  compoundCode: string | null;
  quantityKg: number;
  minStockLevelKg: number;
  reorderPointKg: number;
  costPerKg: number | null;
  location: string | null;
  batchNumber: string | null;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RubberCompoundMovementDto {
  id: number;
  compoundStockId: number;
  compoundName: string | null;
  movementType: CompoundMovementType;
  quantityKg: number;
  referenceType: CompoundMovementReferenceType;
  referenceId: number | null;
  batchNumber: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface RubberProductionDto {
  id: number;
  firebaseUid: string;
  productionNumber: string;
  productId: number;
  productTitle: string | null;
  compoundStockId: number;
  compoundName: string | null;
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  quantity: number;
  compoundRequiredKg: number;
  compoundUsedKg: number | null;
  status: RubberProductionStatus;
  statusLabel: string;
  orderId: number | null;
  notes: string | null;
  createdBy: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RubberCompoundOrderDto {
  id: number;
  firebaseUid: string;
  orderNumber: string;
  compoundStockId: number;
  compoundName: string | null;
  quantityKg: number;
  status: RubberCompoundOrderStatus;
  statusLabel: string;
  isAutoGenerated: boolean;
  supplierName: string | null;
  expectedDelivery: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompoundCalculationResultDto {
  productTitle: string | null;
  specificGravity: number;
  compoundRequiredKg: number;
  kgPerUnit: number;
}

export interface CandidateImage {
  url: string;
  source: string;
  width: number | null;
  height: number | null;
}

export interface ScrapedBrandingCandidates {
  logoCandidates: CandidateImage[];
  heroCandidates: CandidateImage[];
  primaryColor: string | null;
  colorCandidates: string[];
}

export interface AuRubberLoginDto {
  email: string;
  password: string;
  appCode?: string;
}

export interface AuRubberUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface AuRubberLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuRubberUser;
}

export interface AuRubberUserProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  createdAt: string;
  lastActiveAt?: string;
}

export interface AuRubberAccessInfo {
  roleCode: string | null;
  roleName: string | null;
  permissions: string[];
  isAdmin: boolean;
}

export type RoleTargetType = "CUSTOMER" | "SUPPLIER";

export interface AuRubberRoleDto {
  id: number;
  appId: number;
  code: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  displayOrder: number;
  targetType: RoleTargetType | null;
  permissions: string[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuRubberPermissionDto {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  displayOrder: number;
}

export interface AuRubberUserAccessDto {
  id: number;
  userId: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  appCode: string;
  roleCode: string | null;
  roleName: string | null;
  useCustomPermissions: boolean;
  permissionCodes: string[] | null;
  permissionCount: number | null;
  grantedAt: string;
  expiresAt: string | null;
  grantedById: number | null;
  productKeys: string[] | null;
}

export interface AuRubberInviteUserResponse {
  userId: number;
  email: string;
  accessId: number;
  isNewUser: boolean;
  message: string;
}

export interface SageContactSyncResult {
  matched: number;
  unmatched: number;
  alreadyMapped: number;
  newMappings: Array<{
    companyId: number;
    companyName: string;
    sageContactId: number;
    sageContactName: string;
  }>;
}

export interface SageContactMappingStatus {
  companies: Array<{
    id: number;
    name: string;
    companyType: string;
    sageContactId: number | null;
    sageContactName: string | null;
    suggestedMatches: Array<{
      sageId: number;
      sageName: string;
      confidence: number;
    }>;
  }>;
  summary: {
    total: number;
    mapped: number;
    unmapped: number;
  };
}

const apiClient: ApiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: auRubberTokenStore,
  refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
});

class AuRubberApiClient {
  baseURL = API_BASE_URL;

  get accessToken(): string | null {
    return auRubberTokenStore.accessToken();
  }

  protected headers(): Record<string, string> {
    return auRubberTokenStore.authHeaders();
  }

  setRememberMe(_remember: boolean) {
    // PortalTokenStore tracks rememberMe via setTokens
  }

  private setTokens(accessToken: string, refreshToken: string) {
    auRubberTokenStore.setTokens(accessToken, refreshToken, auRubberTokenStore.rememberMe());
  }

  clearTokens() {
    auRubberTokenStore.clear();
  }

  isAuthenticated(): boolean {
    return auRubberTokenStore.isAuthenticated();
  }

  private request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return apiClient.request<T>(endpoint, options);
  }

  requestBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
    return apiClient.requestBlob(endpoint, options);
  }

  private async requestWithFiles<T>(
    endpoint: string,
    files: File[],
    data?: Record<string, string | number | undefined>,
    fieldName: string = "files",
  ): Promise<T> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append(fieldName, file);
    });

    if (data) {
      entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, String(value));
        }
      });
    }

    const accessToken = auRubberTokenStore.accessToken();
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, { method: "POST", headers, body: formData });

    if (response.status === 401 && auRubberTokenStore.refreshToken()) {
      const refreshed = await apiClient.refreshAccessToken();
      if (refreshed) {
        const newToken = auRubberTokenStore.accessToken();
        const retryHeaders: Record<string, string> = {};
        if (newToken) retryHeaders.Authorization = `Bearer ${newToken}`;
        const retryResponse = await fetch(url, {
          method: "POST",
          headers: retryHeaders,
          body: formData,
        });
        await throwIfNotOk(retryResponse);
        const text = await retryResponse.text();
        return text && text.trim() !== "" ? (JSON.parse(text) as T) : ({} as T);
      }
    }

    await throwIfNotOk(response);
    const text = await response.text();
    return text && text.trim() !== "" ? (JSON.parse(text) as T) : ({} as T);
  }

  refreshAccessToken(): Promise<boolean> {
    return apiClient.refreshAccessToken();
  }

  async login(dto: AuRubberLoginDto): Promise<AuRubberLoginResponse> {
    const response = await this.request<AuRubberLoginResponse>("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ ...dto, appCode: "au-rubber" }),
    });

    this.setTokens(response.accessToken, response.refreshToken);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request("/admin/auth/logout", { method: "POST" });
    } finally {
      this.clearTokens();
    }
  }

  currentUser = createEndpoint<[], AuRubberUserProfile>(apiClient, "GET", {
    path: "/admin/auth/me",
  });

  productCodings = createEndpoint<[codingType?: string], RubberProductCodingDto[]>(
    apiClient,
    "GET",
    {
      path: "/rubber-lining/portal/product-codings",
      query: (codingType) => ({ codingType }),
    },
  );

  productCodingById = createEndpoint<[id: number], RubberProductCodingDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/product-codings/${id}`,
  });

  createProductCoding = createEndpoint<
    [data: Omit<RubberProductCodingDto, "id" | "firebaseUid">],
    RubberProductCodingDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/product-codings",
    body: (data) => data,
  });

  updateProductCoding = createEndpoint<
    [id: number, data: Partial<RubberProductCodingDto>],
    RubberProductCodingDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/product-codings/${id}`,
    body: (_id, data) => data,
  });

  deleteProductCoding = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/product-codings/${id}`,
  });

  pricingTiers = createEndpoint<[], RubberPricingTierDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/pricing-tiers",
  });

  pricingTierById = createEndpoint<[id: number], RubberPricingTierDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/pricing-tiers/${id}`,
  });

  createPricingTier = createEndpoint<
    [data: Omit<RubberPricingTierDto, "id">],
    RubberPricingTierDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/pricing-tiers",
    body: (data) => data,
  });

  updatePricingTier = createEndpoint<
    [id: number, data: Partial<RubberPricingTierDto>],
    RubberPricingTierDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/pricing-tiers/${id}`,
    body: (_id, data) => data,
  });

  deletePricingTier = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/pricing-tiers/${id}`,
  });

  companies = createEndpoint<[], RubberCompanyDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/companies",
  });

  companyById = createEndpoint<[id: number], RubberCompanyDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/companies/${id}`,
  });

  createCompany = createEndpoint<[data: CreateRubberCompanyInput], RubberCompanyDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/companies",
      body: (data) => data,
    },
  );

  updateCompany = createEndpoint<
    [id: number, data: Partial<CreateRubberCompanyInput>],
    RubberCompanyDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/companies/${id}`,
    body: (_id, data) => data,
  });

  deleteCompany = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/companies/${id}`,
  });

  products = createEndpoint<[], RubberProductDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/products",
  });

  productById = createEndpoint<[id: number], RubberProductDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/products/${id}`,
  });

  createProduct = createEndpoint<[data: CreateRubberProductDto], RubberProductDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/products",
      body: (data) => data,
    },
  );

  updateProduct = createEndpoint<
    [id: number, data: Partial<CreateRubberProductDto>],
    RubberProductDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/products/${id}`,
    body: (_id, data) => data,
  });

  deleteProduct = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/products/${id}`,
  });

  orders = createEndpoint<[status?: number], RubberOrderDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/orders",
    query: (status) => ({ status }),
  });

  orderById = createEndpoint<[id: number], RubberOrderDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/orders/${id}`,
  });

  createOrder = createEndpoint<[data: CreateRubberOrderInput], RubberOrderDto>(apiClient, "POST", {
    path: "/rubber-lining/portal/orders",
    body: (data) => data,
  });

  updateOrder = createEndpoint<[id: number, data: UpdateRubberOrderInput], RubberOrderDto>(
    apiClient,
    "PUT",
    {
      path: (id) => `/rubber-lining/portal/orders/${id}`,
      body: (_id, data) => data,
    },
  );

  deleteOrder = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/orders/${id}`,
  });

  orderConfirmationPdfBlob(orderId: number): Promise<Blob> {
    return apiClient.requestBlob(`/rubber-lining/portal/orders/${orderId}/confirmation-pdf`);
  }

  sendOrderConfirmation = createEndpoint<
    [orderId: number, email: string, cc?: string, bcc?: string],
    { success: boolean }
  >(apiClient, "POST", {
    path: (orderId) => `/rubber-lining/portal/orders/${orderId}/send-confirmation`,
    body: (_orderId, email, cc, bcc) => ({ email, cc, bcc }),
  });

  appProfile = createEndpoint<[], RubberAppProfileDto>(apiClient, "GET", {
    path: "/rubber-lining/portal/app-profile",
  });

  updateAppProfile = createEndpoint<[data: Partial<RubberAppProfileDto>], RubberAppProfileDto>(
    apiClient,
    "PUT",
    {
      path: "/rubber-lining/portal/app-profile",
      body: (data) => data,
    },
  );

  orderStatuses = createEndpoint<[], { value: number; label: string }[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/order-statuses",
  });

  codingTypes = createEndpoint<[], { value: string; label: string }[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/coding-types",
  });

  calculatePrice = createEndpoint<
    [
      data: {
        productId: number;
        companyId: number;
        thickness: number;
        width: number;
        length: number;
        quantity: number;
      },
    ],
    RubberPriceCalculationDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/calculate-price",
    body: (data) => data,
  });

  importProducts = createEndpoint<
    [
      data: {
        rows: ImportProductRowDto[];
        updateExisting?: boolean;
      },
    ],
    ImportProductsResultDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/products/import",
    body: (data) => data,
  });

  async analyzeProductFiles(files: File[]): Promise<AnalyzeProductFilesResult> {
    return this.requestWithFiles("/rubber-lining/portal/products/analyze", files);
  }

  compoundStocks = createEndpoint<[], RubberCompoundStockDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/compound-stocks",
  });

  lowStockCompounds = createEndpoint<[], RubberCompoundStockDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/compound-stocks/low-stock",
  });

  compoundStockById = createEndpoint<[id: number], RubberCompoundStockDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/compound-stocks/${id}`,
  });

  createCompoundStock = createEndpoint<
    [
      data: {
        compoundCodingId: number;
        quantityKg?: number;
        minStockLevelKg?: number;
        reorderPointKg?: number;
        costPerKg?: number;
        location?: string;
        batchNumber?: string;
      },
    ],
    RubberCompoundStockDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/compound-stocks",
    body: (data) => data,
  });

  createCompoundOpeningStock = createEndpoint<
    [data: CreateCompoundOpeningStockDto],
    RubberCompoundStockDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/compound-stocks/opening",
    body: (data) => data,
  });

  importCompoundOpeningStock = createEndpoint<
    [rows: ImportCompoundOpeningStockRowDto[]],
    ImportCompoundOpeningStockResultDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/compound-stocks/import-opening",
    body: (rows) => rows,
  });

  updateCompoundStock = createEndpoint<
    [
      id: number,
      data: {
        compoundCodingId?: number;
        quantityKg?: number;
        minStockLevelKg?: number;
        reorderPointKg?: number;
        costPerKg?: number;
        location?: string;
        batchNumber?: string;
      },
    ],
    RubberCompoundStockDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/compound-stocks/${id}`,
    body: (_id, data) => data,
  });

  deleteCompoundStock = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/compound-stocks/${id}`,
  });

  async compoundMovements(filters?: {
    compoundStockId?: number;
    movementType?: CompoundMovementType;
    referenceType?: CompoundMovementReferenceType;
  }): Promise<RubberCompoundMovementDto[]> {
    const params = new URLSearchParams();
    if (filters?.compoundStockId) params.set("compoundStockId", String(filters.compoundStockId));
    if (filters?.movementType) params.set("movementType", filters.movementType);
    if (filters?.referenceType) params.set("referenceType", filters.referenceType);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/rubber-lining/portal/compound-movements${query}`);
  }

  receiveCompound = createEndpoint<
    [
      data: {
        compoundStockId: number;
        quantityKg: number;
        batchNumber?: string;
        notes?: string;
      },
    ],
    RubberCompoundMovementDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/compound-movements/receive",
    body: (data) => data,
  });

  adjustCompound = createEndpoint<
    [
      data: {
        compoundStockId: number;
        quantityKg: number;
        notes?: string;
      },
    ],
    RubberCompoundMovementDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/compound-movements/adjust",
    body: (data) => data,
  });

  productions = createEndpoint<[status?: RubberProductionStatus], RubberProductionDto[]>(
    apiClient,
    "GET",
    {
      path: "/rubber-lining/portal/productions",
      query: (status) => ({ status: status }),
    },
  );

  productionById = createEndpoint<[id: number], RubberProductionDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/productions/${id}`,
  });

  createProduction = createEndpoint<
    [
      data: {
        productId: number;
        compoundStockId: number;
        thicknessMm: number;
        widthMm: number;
        lengthM: number;
        quantity: number;
        orderId?: number;
        notes?: string;
      },
    ],
    RubberProductionDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/productions",
    body: (data) => data,
  });

  startProduction = createEndpoint<[id: number], RubberProductionDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/productions/${id}/start`,
  });

  completeProduction = createEndpoint<[id: number], RubberProductionDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/productions/${id}/complete`,
  });

  cancelProduction = createEndpoint<[id: number], RubberProductionDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/productions/${id}/cancel`,
  });

  calculateCompoundRequired = createEndpoint<
    [
      data: {
        productId: number;
        thicknessMm: number;
        widthMm: number;
        lengthM: number;
        quantity: number;
      },
    ],
    CompoundCalculationResultDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/productions/calculate-compound",
    body: (data) => data,
  });

  async compoundOrders(
    status?: RubberCompoundOrderStatus | null,
  ): Promise<RubberCompoundOrderDto[]> {
    const query = status ? `?status=${status}` : "";
    return this.request(`/rubber-lining/portal/compound-orders${query}`);
  }

  compoundOrderById = createEndpoint<[id: number], RubberCompoundOrderDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/compound-orders/${id}`,
  });

  createCompoundOrder = createEndpoint<
    [
      data: {
        compoundStockId: number;
        quantityKg: number;
        supplierName?: string | null;
        expectedDelivery?: string | null;
        notes?: string | null;
      },
    ],
    RubberCompoundOrderDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/compound-orders",
    body: (data) => data,
  });

  updateCompoundOrderStatus = createEndpoint<
    [id: number, status: RubberCompoundOrderStatus],
    RubberCompoundOrderDto
  >(apiClient, "PUT", {
    path: (id, _status) => `/rubber-lining/portal/compound-orders/${id}/status`,
    body: (_id, status) => ({ status }),
  });

  receiveCompoundOrder = createEndpoint<
    [
      id: number,
      data: {
        actualQuantityKg: number;
        batchNumber?: string | null;
        notes?: string | null;
      },
    ],
    RubberCompoundOrderDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/compound-orders/${id}/receive`,
    body: (_id, data) => data,
  });

  productionStatuses = createEndpoint<[], { value: string; label: string }[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/production-statuses",
  });

  compoundOrderStatuses = createEndpoint<[], { value: string; label: string }[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/compound-order-statuses",
  });

  scrapeBranding = createEndpoint<[websiteUrl: string], ScrapedBrandingCandidates>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/scrape-branding",
      body: (websiteUrl) => ({ websiteUrl }),
    },
  );

  proxyImageUrl(url: string): string {
    return `${this.baseURL}/rubber-lining/portal/proxy-image?url=${encodeURIComponent(url)}`;
  }

  authHeaders(): Record<string, string> {
    return this.headers();
  }

  myAccess = createEndpoint<[], AuRubberAccessInfo>(apiClient, "GET", {
    path: "/rubber-lining/admin/access/me",
  });

  accessUsers = createEndpoint<[], AuRubberUserAccessDto[]>(apiClient, "GET", {
    path: "/rubber-lining/admin/access/users",
  });

  accessRoles = createEndpoint<[], AuRubberRoleDto[]>(apiClient, "GET", {
    path: "/rubber-lining/admin/access/roles",
  });

  accessPermissions = createEndpoint<[], AuRubberPermissionDto[]>(apiClient, "GET", {
    path: "/rubber-lining/admin/access/permissions",
  });

  createRole = createEndpoint<
    [
      data: {
        code: string;
        name: string;
        description?: string;
        isDefault?: boolean;
        targetType?: RoleTargetType | null;
      },
    ],
    AuRubberRoleDto
  >(apiClient, "POST", {
    path: "/rubber-lining/admin/access/roles",
    body: (data) => data,
  });

  updateRole = createEndpoint<
    [roleId: number, data: { name?: string; description?: string; isDefault?: boolean }],
    AuRubberRoleDto
  >(apiClient, "PATCH", {
    path: (roleId) => `/rubber-lining/admin/access/roles/${roleId}`,
    body: (_roleId, data) => data,
  });

  setRolePermissions = createEndpoint<[roleId: number, permissionCodes: string[]], void>(
    apiClient,
    "PUT",
    {
      path: (roleId, _permissionCodes) => `/rubber-lining/admin/access/roles/${roleId}/permissions`,
      body: (_roleId, permissionCodes) => ({ permissionCodes }),
    },
  );

  deleteRole = createEndpoint<[roleId: number], { message: string; reassignedUsers: number }>(
    apiClient,
    "DELETE",
    {
      path: (roleId) => `/rubber-lining/admin/access/roles/${roleId}`,
    },
  );

  grantUserAccess = createEndpoint<[userId: number, roleCode: string], AuRubberUserAccessDto>(
    apiClient,
    "POST",
    {
      path: (userId, _roleCode) => `/rubber-lining/admin/access/users/${userId}`,
      body: (_userId, roleCode) => ({ roleCode }),
    },
  );

  updateUserAccess = createEndpoint<[accessId: number, roleCode: string], AuRubberUserAccessDto>(
    apiClient,
    "PATCH",
    {
      path: (accessId, _roleCode) => `/rubber-lining/admin/access/users/${accessId}`,
      body: (_accessId, roleCode) => ({ roleCode }),
    },
  );

  revokeUserAccess = createEndpoint<[accessId: number], void>(apiClient, "DELETE", {
    path: (accessId) => `/rubber-lining/admin/access/users/${accessId}`,
  });

  inviteUser = createEndpoint<
    [
      data: {
        email: string;
        firstName?: string;
        lastName?: string;
        roleCode: string;
      },
    ],
    AuRubberInviteUserResponse
  >(apiClient, "POST", {
    path: "/rubber-lining/admin/access/invite",
    body: (data) => data,
  });

  async searchUsers(
    query: string,
  ): Promise<{ id: number; email: string; firstName: string | null; lastName: string | null }[]> {
    return this.request(`/rubber-lining/admin/users/search?q=${encodeURIComponent(query)}`);
  }

  async supplierCocs(filters?: {
    cocType?: SupplierCocType;
    processingStatus?: CocProcessingStatus;
    supplierId?: number;
    includeAllVersions?: boolean;
  }): Promise<RubberSupplierCocDto[]> {
    const params = new URLSearchParams();
    if (filters?.cocType) params.set("cocType", filters.cocType);
    if (filters?.processingStatus) params.set("processingStatus", filters.processingStatus);
    if (filters?.supplierId) params.set("supplierId", String(filters.supplierId));
    if (filters?.includeAllVersions) params.set("includeAllVersions", "true");
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/rubber-lining/portal/supplier-cocs${query}`);
  }

  supplierCocById = createEndpoint<[id: number], RubberSupplierCocDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/supplier-cocs/${id}`,
  });

  uploadSupplierCoc = createEndpoint<
    [
      data: {
        cocType: SupplierCocType;
        supplierCompanyId?: number;
        cocNumber?: string;
        productionDate?: string;
        compoundCode?: string;
        orderNumber?: string;
        ticketNumber?: string;
      },
    ],
    RubberSupplierCocDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/supplier-cocs",
    body: (data) => data,
  });

  async uploadSupplierCocWithFiles(
    files: File[],
    data: {
      cocType: SupplierCocType;
      supplierCompanyId?: number;
      cocNumber?: string;
      productionDate?: string;
      compoundCode?: string;
      orderNumber?: string;
      ticketNumber?: string;
    },
  ): Promise<RubberSupplierCocDto[]> {
    return this.requestWithFiles("/rubber-lining/portal/supplier-cocs/upload", files, {
      cocType: data.cocType,
      supplierCompanyId: data.supplierCompanyId,
      cocNumber: data.cocNumber,
      productionDate: data.productionDate,
      compoundCode: data.compoundCode,
      orderNumber: data.orderNumber,
      ticketNumber: data.ticketNumber,
    });
  }

  async analyzeSupplierCocs(files: File[]): Promise<{
    files: Array<{
      filename: string;
      isGraph: boolean;
      cocType: SupplierCocType | null;
      companyId: number | null;
      companyName: string | null;
      batchNumbers: string[];
      linkedToIndex: number | null;
      compoundCode: string | null;
      extractedData: Record<string, unknown> | null;
    }>;
    dataPdfs: number[];
    graphPdfs: number[];
  }> {
    return this.requestWithFiles("/rubber-lining/portal/supplier-cocs/analyze", files);
  }

  async createCocsFromAnalysis(
    files: File[],
    analysis: {
      files: Array<{
        filename: string;
        isGraph: boolean;
        cocType: SupplierCocType | null;
        companyId: number | null;
        companyName: string | null;
        batchNumbers: string[];
        linkedToIndex: number | null;
        compoundCode: string | null;
        extractedData: Record<string, unknown> | null;
      }>;
      dataPdfs: number[];
      graphPdfs: number[];
    },
  ): Promise<{ cocIds: number[] }> {
    const url = `${this.baseURL}/rubber-lining/portal/supplier-cocs/create-from-analysis`;
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    formData.append("analysis", JSON.stringify(analysis));

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    await throwIfNotOk(response);

    return response.json();
  }

  updateSupplierCoc = createEndpoint<
    [
      id: number,
      data: {
        cocType?: SupplierCocType;
        cocNumber?: string | null;
        compoundCode?: string | null;
        productionDate?: string | null;
        orderNumber?: string | null;
        ticketNumber?: string | null;
        createdAt?: string | null;
      },
    ],
    RubberSupplierCocDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/supplier-cocs/${id}`,
    body: (_id, data) => data,
  });

  extractSupplierCoc = createEndpoint<[id: number], RubberSupplierCocDto>(apiClient, "POST", {
    path: (id) => `/rubber-lining/portal/supplier-cocs/${id}/extract`,
  });

  reviewSupplierCoc = createEndpoint<
    [id: number, data: { extractedData?: Record<string, unknown>; reviewNotes?: string }],
    RubberSupplierCocDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/supplier-cocs/${id}/review`,
    body: (_id, data) => data,
  });

  approveSupplierCoc = createEndpoint<[id: number], RubberSupplierCocDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/supplier-cocs/${id}/approve`,
  });

  deleteSupplierCoc = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/supplier-cocs/${id}`,
  });

  linkCocToDeliveryNote = createEndpoint<
    [cocId: number, deliveryNoteId: number],
    RubberSupplierCocDto
  >(apiClient, "PUT", {
    path: (cocId, _deliveryNoteId) => `/rubber-lining/portal/supplier-cocs/${cocId}/link-dn`,
    body: (_cocId, deliveryNoteId) => ({ deliveryNoteId }),
  });

  compoundBatchesByCocId = createEndpoint<[cocId: number], RubberCompoundBatchDto[]>(
    apiClient,
    "GET",
    {
      path: (cocId) => `/rubber-lining/portal/supplier-cocs/${cocId}/batches`,
    },
  );

  createCompoundBatch = createEndpoint<
    [
      data: {
        supplierCocId: number;
        batchNumber: string;
        compoundStockId?: number;
        shoreAHardness?: number;
        specificGravity?: number;
        reboundPercent?: number;
        tearStrengthKnM?: number;
        tensileStrengthMpa?: number;
        elongationPercent?: number;
        rheometerSMin?: number;
        rheometerSMax?: number;
        rheometerTs2?: number;
        rheometerTc90?: number;
        passFailStatus?: string;
      },
    ],
    RubberCompoundBatchDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/compound-batches",
    body: (data) => data,
  });

  updateCompoundBatch = createEndpoint<
    [
      id: number,
      data: {
        batchNumber?: string;
        shoreAHardness?: number | null;
        specificGravity?: number | null;
        reboundPercent?: number | null;
        tearStrengthKnM?: number | null;
        tensileStrengthMpa?: number | null;
        elongationPercent?: number | null;
        rheometerSMin?: number | null;
        rheometerSMax?: number | null;
        rheometerTs2?: number | null;
        rheometerTc90?: number | null;
        passFailStatus?: string | null;
      },
    ],
    RubberCompoundBatchDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/compound-batches/${id}`,
    body: (_id, data) => data,
  });

  deleteCompoundBatch = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/compound-batches/${id}`,
  });

  async deliveryNotes(filters?: {
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
  }): Promise<PaginatedResult<RubberDeliveryNoteDto>> {
    const params = new URLSearchParams();
    if (filters?.deliveryNoteType) params.set("deliveryNoteType", filters.deliveryNoteType);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.supplierId) params.set("supplierId", String(filters.supplierId));
    if (filters?.companyType) params.set("companyType", filters.companyType);
    if (filters?.includeAllVersions) params.set("includeAllVersions", "true");
    if (filters?.search) params.set("search", filters.search);
    if (filters?.sortColumn) params.set("sortColumn", filters.sortColumn);
    if (filters?.sortDirection) params.set("sortDirection", filters.sortDirection);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/rubber-lining/portal/delivery-notes${query}`);
  }

  deliveryNoteById = createEndpoint<[id: number], RubberDeliveryNoteDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/delivery-notes/${id}`,
  });

  deleteDeliveryNote = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/delivery-notes/${id}`,
  });

  uploadDeliveryNote = createEndpoint<
    [
      data: {
        deliveryNoteType: DeliveryNoteType;
        supplierCompanyId: number;
        deliveryNoteNumber?: string;
        deliveryDate?: string;
      },
    ],
    RubberDeliveryNoteDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/delivery-notes",
    body: (data) => data,
  });

  async uploadDeliveryNoteWithFiles(
    files: File[],
    data: {
      deliveryNoteType: DeliveryNoteType;
      supplierCompanyId?: number;
      deliveryNoteNumber?: string;
      deliveryDate?: string;
    },
  ): Promise<RubberDeliveryNoteDto[]> {
    return this.requestWithFiles("/rubber-lining/portal/delivery-notes/upload", files, {
      deliveryNoteType: data.deliveryNoteType,
      ...(data.supplierCompanyId ? { supplierCompanyId: data.supplierCompanyId } : {}),
      deliveryNoteNumber: data.deliveryNoteNumber,
      deliveryDate: data.deliveryDate,
    });
  }

  async bulkAutoLinkDeliveryNotes(): Promise<{ linked: number; details: string[] }> {
    return this.request("/rubber-lining/portal/delivery-notes/bulk-auto-link", {
      method: "POST",
    });
  }

  async bulkLinkCustomerDns(): Promise<{ linked: number; details: string[] }> {
    return this.request("/rubber-lining/portal/delivery-notes/bulk-link-customer-dns", {
      method: "POST",
    });
  }

  async bulkAutoGenerateAuCocs(): Promise<{
    checked: number;
    generated: number;
    details: string[];
  }> {
    return this.request("/rubber-lining/portal/au-cocs/bulk-auto-generate", {
      method: "POST",
    });
  }

  async regenerateAllGeneratedCocs(): Promise<{
    regenerated: number;
    failed: number;
    total: number;
    errors: string[];
  }> {
    return this.request("/rubber-lining/portal/au-cocs/bulk-regenerate", {
      method: "POST",
    });
  }

  extractDeliveryNote = createEndpoint<[id: number], RubberDeliveryNoteDto>(apiClient, "POST", {
    path: (id) => `/rubber-lining/portal/delivery-notes/${id}/extract`,
  });

  saveExtractedDataCorrections = createEndpoint<
    [id: number, corrections: ExtractedDeliveryNoteData],
    RubberDeliveryNoteDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/delivery-notes/${id}/extracted-data`,
    body: (_id, corrections) => corrections,
  });

  async analyzeDeliveryNotePhoto(file: File): Promise<AnalyzedDeliveryNoteResult> {
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${this.baseURL}/rubber-lining/portal/delivery-notes/analyze`, {
      method: "POST",
      headers,
      body: formData,
    });

    await throwIfNotOk(response);

    return response.json();
  }

  async acceptAnalyzedDeliveryNote(
    file: File,
    analyzedData: AnalyzedDeliveryNoteResult["data"],
  ): Promise<RubberDeliveryNoteDto> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("analyzedData", JSON.stringify(analyzedData));

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(
      `${this.baseURL}/rubber-lining/portal/delivery-notes/accept-analyzed`,
      {
        method: "POST",
        headers,
        body: formData,
      },
    );

    await throwIfNotOk(response);

    return response.json();
  }

  linkDeliveryNoteToCoc = createEndpoint<
    [deliveryNoteId: number, cocId: number],
    RubberDeliveryNoteDto
  >(apiClient, "PUT", {
    path: (deliveryNoteId, _cocId) =>
      `/rubber-lining/portal/delivery-notes/${deliveryNoteId}/link-coc`,
    body: (_deliveryNoteId, cocId) => ({ cocId }),
  });

  finalizeDeliveryNote = createEndpoint<[id: number], RubberDeliveryNoteDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/delivery-notes/${id}/finalize`,
  });

  approveDeliveryNote = createEndpoint<[id: number], RubberDeliveryNoteDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/delivery-notes/${id}/approve`,
  });

  refileDeliveryNoteStock = createEndpoint<[id: number], RubberDeliveryNoteDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/delivery-notes/${id}/refile-stock`,
  });

  deliveryNoteItems = createEndpoint<[deliveryNoteId: number], RubberDeliveryNoteItemDto[]>(
    apiClient,
    "GET",
    {
      path: (deliveryNoteId) => `/rubber-lining/portal/delivery-notes/${deliveryNoteId}/items`,
    },
  );

  acceptDeliveryNoteExtract = createEndpoint<[id: number], { deliveryNoteIds: number[] }>(
    apiClient,
    "PUT",
    {
      path: (id) => `/rubber-lining/portal/delivery-notes/${id}/accept-extract`,
    },
  );

  async deliveryNotePageUrl(
    id: number,
    pageNumber: number,
  ): Promise<{ url: string; totalPages: number }> {
    return this.request<{ url: string; totalPages: number }>(
      `/rubber-lining/portal/delivery-notes/${id}/page/${pageNumber}`,
    );
  }

  async replaceDeliveryNoteDocument(id: number, file: File): Promise<RubberDeliveryNoteDto> {
    const url = `${this.baseURL}/rubber-lining/portal/delivery-notes/${id}/document`;
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: formData,
    });

    await throwIfNotOk(response);

    return response.json();
  }

  async analyzeCustomerDeliveryNotes(files: File[]): Promise<AnalyzeCustomerDnsResult> {
    return this.requestWithFiles("/rubber-lining/portal/customer-delivery-notes/analyze", files);
  }

  async createCustomerDnsFromAnalysis(
    files: File[],
    analysis: AnalyzeCustomerDnsResult,
    overrides: CustomerDnOverride[],
  ): Promise<{ deliveryNoteIds: number[] }> {
    const url = `${this.baseURL}/rubber-lining/portal/customer-delivery-notes/create-from-analysis`;
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    formData.append("analysis", JSON.stringify(analysis));
    formData.append("overrides", JSON.stringify(overrides));

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    await throwIfNotOk(response);

    return response.json();
  }

  async rollStock(filters?: {
    status?: RollStockStatus;
    compoundCodingId?: number;
    customerId?: number;
  }): Promise<RubberRollStockDto[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.compoundCodingId) params.set("compoundCodingId", String(filters.compoundCodingId));
    if (filters?.customerId) params.set("customerId", String(filters.customerId));
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/rubber-lining/portal/roll-stock${query}`);
  }

  rollStockById = createEndpoint<[id: number], RubberRollStockDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/roll-stock/${id}`,
  });

  rollTraceability = createEndpoint<[id: number], RollTraceabilityDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/roll-stock/${id}/traceability`,
  });

  reserveRoll = createEndpoint<[id: number, customerId: number], RubberRollStockDto>(
    apiClient,
    "PUT",
    {
      path: (id, _customerId) => `/rubber-lining/portal/roll-stock/${id}/reserve`,
      body: (_id, customerId) => ({ customerId }),
    },
  );

  unreserveRoll = createEndpoint<[id: number], RubberRollStockDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/roll-stock/${id}/unreserve`,
  });

  sellRoll = createEndpoint<
    [id: number, data: { customerId: number; poNumber?: string; auCocId?: number }],
    RubberRollStockDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/roll-stock/${id}/sell`,
    body: (_id, data) => data,
  });

  scrapRoll = createEndpoint<[id: number, reason?: string], RubberRollStockDto>(apiClient, "PUT", {
    path: (id, _reason) => `/rubber-lining/portal/roll-stock/${id}/scrap`,
    body: (_id, reason) => ({ reason }),
  });

  createOpeningStock = createEndpoint<[data: CreateOpeningStockDto], RubberRollStockDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/roll-stock/opening-stock",
      body: (data) => data,
    },
  );

  importOpeningStock = createEndpoint<
    [rows: ImportOpeningStockRowDto[]],
    ImportOpeningStockResultDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/roll-stock/import-opening",
    body: (rows) => ({ rows }),
  });

  rollRejectionsBySupplierCoc = createEndpoint<[supplierCocId: number], RollRejectionDto[]>(
    apiClient,
    "GET",
    {
      path: (supplierCocId) =>
        `/rubber-lining/portal/supplier-cocs/${supplierCocId}/roll-rejections`,
    },
  );

  allRollRejections = createEndpoint<[statusFilter?: RollRejectionStatus], RollRejectionDto[]>(
    apiClient,
    "GET",
    {
      path: "/rubber-lining/portal/roll-rejections",
      query: (statusFilter) => ({ status: statusFilter }),
    },
  );

  createRollRejection = createEndpoint<
    [
      data: {
        originalSupplierCocId: number;
        rollNumber: string;
        rejectionReason: string;
        rejectedBy: string;
        notes?: string | null;
      },
    ],
    RollRejectionDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/roll-rejections",
    body: (data) => data,
  });

  async uploadRollRejectionReturnDocument(
    rejectionId: number,
    file: File,
  ): Promise<RollRejectionDto> {
    return this.requestWithFiles<RollRejectionDto>(
      `/rubber-lining/portal/roll-rejections/${rejectionId}/return-document`,
      [file],
      undefined,
      "file",
    );
  }

  linkReplacementCoc = createEndpoint<
    [rejectionId: number, data: { replacementCocId: number; replacementRollNumber?: string }],
    RollRejectionDto
  >(apiClient, "PUT", {
    path: (rejectionId) => `/rubber-lining/portal/roll-rejections/${rejectionId}/link-replacement`,
    body: (_rejectionId, data) => data,
  });

  closeRollRejection = createEndpoint<[rejectionId: number], RollRejectionDto>(apiClient, "PUT", {
    path: (rejectionId) => `/rubber-lining/portal/roll-rejections/${rejectionId}/close`,
  });

  rollRejectionReturnDocumentUrl = createEndpoint<[rejectionId: number], { url: string | null }>(
    apiClient,
    "GET",
    {
      path: (rejectionId) =>
        `/rubber-lining/portal/roll-rejections/${rejectionId}/return-document-url`,
    },
  );

  async auCocs(filters?: { status?: AuCocStatus; customerId?: number }): Promise<RubberAuCocDto[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.customerId) params.set("customerId", String(filters.customerId));
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/rubber-lining/portal/au-cocs${query}`);
  }

  auCocById = createEndpoint<[id: number], RubberAuCocDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/au-cocs/${id}`,
  });

  createAuCoc = createEndpoint<
    [
      data: {
        customerCompanyId: number;
        rollIds: number[];
        poNumber?: string;
        deliveryNoteRef?: string;
      },
    ],
    RubberAuCocDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/au-cocs",
    body: (data) => data,
  });

  generateAuCocPdf = createEndpoint<[id: number], RubberAuCocDto>(apiClient, "POST", {
    path: (id) => `/rubber-lining/portal/au-cocs/${id}/generate-pdf`,
  });

  sendAuCoc = createEndpoint<
    [id: number, email: string, options?: { cc?: string; bcc?: string }],
    RubberAuCocDto
  >(apiClient, "POST", {
    path: (id, _email, _options) => `/rubber-lining/portal/au-cocs/${id}/send`,
    body: (_id, email, options) => ({ email, cc: options?.cc, bcc: options?.bcc }),
  });

  bulkSendAuCocs = createEndpoint<
    [email: string, options?: { cc?: string; bcc?: string }],
    { sent: number; total: number; cocNumbers: string[] }
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/au-cocs/bulk-send",
    body: (email, options) => ({ email, cc: options?.cc, bcc: options?.bcc }),
  });

  async createAuCocFromDeliveryNote(deliveryNoteId: number): Promise<RubberAuCocDto> {
    return this.request(
      `/rubber-lining/portal/au-cocs/create-from-delivery-note/${deliveryNoteId}`,
      {
        method: "POST",
      },
    );
  }

  auCocPdfUrl(id: number): string {
    return `${this.baseURL}/rubber-lining/portal/au-cocs/${id}/pdf`;
  }

  async auCocPdfBlob(id: number): Promise<Blob> {
    return this.requestBlob(`/rubber-lining/portal/au-cocs/${id}/pdf`);
  }

  async downloadAuCocPdf(id: number): Promise<Blob> {
    return this.requestBlob(`/rubber-lining/portal/au-cocs/${id}/pdf`);
  }

  deleteAuCoc = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/au-cocs/${id}`,
  });

  autoCreateAuCocFromDeliveryNote = createEndpoint<
    [deliveryNoteId: number, customerCompanyId: number],
    {
      auCoc: RubberAuCocDto | null;
      matchedSupplierCocs: { id: number; cocNumber: string | null; orderNumber: string | null }[];
      message: string;
    }
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/au-cocs/auto-create-from-dn",
    body: (deliveryNoteId, customerCompanyId) => ({ deliveryNoteId, customerCompanyId }),
  });

  auCocPdfWithGraphUrl(id: number, supplierCocId: number): string {
    return `${this.baseURL}/rubber-lining/portal/au-cocs/${id}/pdf-with-graph/${supplierCocId}`;
  }

  async documentUrl(documentPath: string): Promise<string> {
    const response = await this.request<{ url: string }>(
      `/rubber-lining/portal/documents/url?path=${encodeURIComponent(documentPath)}`,
    );
    return response.url;
  }

  cocProcessingStatuses(): Promise<{ value: string; label: string }[]> {
    return this.request("/rubber-lining/portal/coc-processing-statuses");
  }

  deliveryNoteStatuses(): Promise<{ value: string; label: string }[]> {
    return this.request("/rubber-lining/portal/delivery-note-statuses");
  }

  rollStockStatuses(): Promise<{ value: string; label: string }[]> {
    return this.request("/rubber-lining/portal/roll-stock-statuses");
  }

  auCocStatuses(): Promise<{ value: string; label: string }[]> {
    return this.request("/rubber-lining/portal/au-coc-statuses");
  }

  pendingAuCocs(): Promise<RubberAuCocDto[]> {
    return this.request("/rubber-lining/portal/au-cocs/pending");
  }

  auCocReadiness(id: number): Promise<{
    ready: boolean;
    readinessStatus: string;
    calendererCocId: number | null;
    compounderCocId: number | null;
    graphPdfPath: string | null;
    missingDocuments: string[];
  }> {
    return this.request(`/rubber-lining/portal/au-cocs/${id}/readiness`);
  }

  autoGenerateAuCoc(id: number): Promise<{ generated: boolean; auCocId: number; reason: string }> {
    return this.request(`/rubber-lining/portal/au-cocs/${id}/auto-generate`, {
      method: "POST",
    });
  }

  async stockLocations(includeInactive = false): Promise<StockLocationDto[]> {
    const query = includeInactive ? "?includeInactive=true" : "";
    return this.request(`/rubber-lining/portal/stock-locations${query}`);
  }

  stockLocationById = createEndpoint<[id: number], StockLocationDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/stock-locations/${id}`,
  });

  createStockLocation = createEndpoint<
    [
      data: {
        name: string;
        description?: string;
        displayOrder?: number;
      },
    ],
    StockLocationDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/stock-locations",
    body: (data) => data,
  });

  updateStockLocation = createEndpoint<
    [
      id: number,
      data: { name?: string; description?: string; displayOrder?: number; active?: boolean },
    ],
    StockLocationDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/stock-locations/${id}`,
    body: (_id, data) => data,
  });

  deleteStockLocation = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/stock-locations/${id}`,
  });

  async purchaseRequisitions(filters?: {
    status?: RequisitionStatus;
    sourceType?: RequisitionSourceType;
  }): Promise<RequisitionDto[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.sourceType) params.set("sourceType", filters.sourceType);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/rubber-lining/portal/purchase-requisitions${query}`);
  }

  purchaseRequisitionById = createEndpoint<[id: number], RequisitionDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/purchase-requisitions/${id}`,
  });

  pendingRequisitions = createEndpoint<[], RequisitionDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/purchase-requisitions/pending",
  });

  createManualRequisition = createEndpoint<
    [
      data: {
        supplierCompanyId?: number;
        externalPoNumber?: string;
        expectedDeliveryDate?: string;
        notes?: string;
        createdBy?: string;
        items: {
          itemType: RequisitionItemType;
          compoundStockId?: number;
          compoundCodingId?: number;
          compoundName?: string;
          quantityKg: number;
          unitPrice?: number;
          notes?: string;
        }[];
      },
    ],
    RequisitionDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/purchase-requisitions",
    body: (data) => data,
  });

  createExternalPoRequisition = createEndpoint<
    [
      data: {
        supplierCompanyId?: number;
        externalPoNumber: string;
        externalPoDocumentPath?: string;
        expectedDeliveryDate?: string;
        notes?: string;
        createdBy?: string;
        items: {
          itemType: RequisitionItemType;
          compoundStockId?: number;
          compoundCodingId?: number;
          compoundName?: string;
          quantityKg: number;
          unitPrice?: number;
          notes?: string;
        }[];
      },
    ],
    RequisitionDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/purchase-requisitions/external-po",
    body: (data) => data,
  });

  async checkLowStockRequisitions(): Promise<RequisitionDto[]> {
    return this.request("/rubber-lining/portal/purchase-requisitions/check-low-stock", {
      method: "POST",
    });
  }

  approveRequisition = createEndpoint<[id: number, approvedBy: string], RequisitionDto>(
    apiClient,
    "PUT",
    {
      path: (id, _approvedBy) => `/rubber-lining/portal/purchase-requisitions/${id}/approve`,
      body: (_id, approvedBy) => ({ approvedBy }),
    },
  );

  rejectRequisition = createEndpoint<
    [id: number, rejectedBy: string, reason: string],
    RequisitionDto
  >(apiClient, "PUT", {
    path: (id, _rejectedBy, _reason) => `/rubber-lining/portal/purchase-requisitions/${id}/reject`,
    body: (_id, rejectedBy, reason) => ({ rejectedBy, reason }),
  });

  async markRequisitionOrdered(
    id: number,
    data?: { externalPoNumber?: string; expectedDeliveryDate?: string },
  ): Promise<RequisitionDto> {
    return this.request(`/rubber-lining/portal/purchase-requisitions/${id}/mark-ordered`, {
      method: "PUT",
      body: JSON.stringify(data || {}),
    });
  }

  receiveRequisitionItems = createEndpoint<
    [id: number, itemReceipts: { itemId: number; quantityReceivedKg: number }[]],
    RequisitionDto
  >(apiClient, "PUT", {
    path: (id, _itemReceipts) => `/rubber-lining/portal/purchase-requisitions/${id}/receive`,
    body: (_id, itemReceipts) => ({ itemReceipts }),
  });

  cancelRequisition = createEndpoint<[id: number], RequisitionDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/purchase-requisitions/${id}/cancel`,
  });

  requisitionStatuses(): Promise<{ value: string; label: string }[]> {
    return this.request("/rubber-lining/portal/requisition-statuses");
  }

  requisitionSourceTypes(): Promise<{ value: string; label: string }[]> {
    return this.request("/rubber-lining/portal/requisition-source-types");
  }

  qualityTrackingSummary = createEndpoint<[], CompoundQualitySummaryDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/quality-tracking",
  });

  async qualityTrackingDetail(compoundCode: string): Promise<CompoundQualityDetailDto> {
    return this.request(
      `/rubber-lining/portal/quality-tracking/${encodeURIComponent(compoundCode)}`,
    );
  }

  qualityAlerts = createEndpoint<[], QualityAlertDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/quality-alerts",
  });

  acknowledgeQualityAlert = createEndpoint<[id: number, acknowledgedBy: string], QualityAlertDto>(
    apiClient,
    "PUT",
    {
      path: (id, _acknowledgedBy) => `/rubber-lining/portal/quality-alerts/${id}/acknowledge`,
      body: (_id, acknowledgedBy) => ({ acknowledgedBy }),
    },
  );

  qualityConfigs = createEndpoint<[], QualityConfigDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/quality-configs",
  });

  async updateQualityConfig(
    compoundCode: string,
    data: Partial<QualityConfigDto>,
  ): Promise<QualityConfigDto> {
    return this.request(
      `/rubber-lining/portal/quality-configs/${encodeURIComponent(compoundCode)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
  }

  async analyzeOrderFiles(files: File[]): Promise<AnalyzeOrderFilesResult> {
    return this.requestWithFiles("/rubber-lining/portal/orders/analyze", files);
  }

  createOrderFromAnalysis = createEndpoint<
    [data: CreateOrderFromAnalysisDto],
    { orderId: number; orderNumber: string }
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/orders/from-analysis",
    body: (data) => data,
  });

  async orderDocumentPages(file: File): Promise<{ pages: PdfPageImage[] }> {
    return this.requestWithFiles("/rubber-lining/portal/orders/document-pages", [file], {}, "file");
  }

  async extractOrderRegion(
    file: File,
    coordinates: RegionCoordinates,
    fieldName: string,
  ): Promise<{ text: string; confidence: number }> {
    const url = `${this.baseURL}/rubber-lining/portal/orders/extract-region`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("coordinates", JSON.stringify(coordinates));
    formData.append("fieldName", fieldName);

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    await throwIfNotOk(response);

    return response.json();
  }

  savePoTemplate = createEndpoint<[dto: CreateTemplateDto], { templateId: number }>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/orders/templates",
      body: (dto) => dto,
    },
  );

  companyPoTemplates = createEndpoint<[companyId: number], { templates: PoTemplateDto[] }>(
    apiClient,
    "GET",
    {
      path: (companyId) => `/rubber-lining/portal/orders/templates/${companyId}`,
    },
  );

  deletePoTemplate = createEndpoint<[templateId: number], { success: boolean }>(
    apiClient,
    "DELETE",
    {
      path: (templateId) => `/rubber-lining/portal/orders/templates/${templateId}`,
    },
  );

  async computeOrderFormatHash(file: File): Promise<{ formatHash: string }> {
    return this.requestWithFiles(
      "/rubber-lining/portal/orders/compute-format-hash",
      [file],
      {},
      "file",
    );
  }

  async otherStocks(includeInactive = false): Promise<RubberOtherStockDto[]> {
    const params = includeInactive ? "?includeInactive=true" : "";
    return this.request(`/rubber-lining/portal/other-stocks${params}`);
  }

  lowStockItems = createEndpoint<[], RubberOtherStockDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/other-stocks/low",
  });

  otherStockById = createEndpoint<[id: number], RubberOtherStockDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/other-stocks/${id}`,
  });

  createOtherStock = createEndpoint<[data: CreateOtherStockDto], RubberOtherStockDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/other-stocks",
      body: (data) => data,
    },
  );

  updateOtherStock = createEndpoint<[id: number, data: UpdateOtherStockDto], RubberOtherStockDto>(
    apiClient,
    "PUT",
    {
      path: (id) => `/rubber-lining/portal/other-stocks/${id}`,
      body: (_id, data) => data,
    },
  );

  deleteOtherStock = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/other-stocks/${id}`,
  });

  receiveOtherStock = createEndpoint<[data: ReceiveOtherStockDto], RubberOtherStockDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/other-stocks/receive",
      body: (data) => data,
    },
  );

  adjustOtherStock = createEndpoint<[data: AdjustOtherStockDto], RubberOtherStockDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/other-stocks/adjust",
      body: (data) => data,
    },
  );

  importOtherStock = createEndpoint<[rows: ImportOtherStockRowDto[]], ImportOtherStockResultDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/other-stocks/import",
      body: (rows) => rows,
    },
  );

  rubberSpecifications = createEndpoint<[], RubberSpecificationDto[]>(apiClient, "GET", {
    path: "/rubber-lining/specifications",
  });

  async taxInvoices(filters?: {
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
  }): Promise<PaginatedResult<RubberTaxInvoiceDto>> {
    const params = new URLSearchParams();
    if (filters?.invoiceType) params.set("invoiceType", filters.invoiceType);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.companyId) params.set("companyId", String(filters.companyId));
    if (filters?.includeAllVersions) params.set("includeAllVersions", "true");
    if (filters?.isCreditNote !== undefined)
      params.set("isCreditNote", String(filters.isCreditNote));
    if (filters?.search) params.set("search", filters.search);
    if (filters?.sortColumn) params.set("sortColumn", filters.sortColumn);
    if (filters?.sortDirection) params.set("sortDirection", filters.sortDirection);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));
    const qs = params.toString();
    return this.request(`/rubber-lining/portal/tax-invoices${qs ? `?${qs}` : ""}`);
  }

  taxInvoiceById = createEndpoint<[id: number], RubberTaxInvoiceDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/tax-invoices/${id}`,
  });

  async taxInvoiceStatements(filters: {
    invoiceType: TaxInvoiceType;
  }): Promise<RubberTaxInvoiceStatementDto[]> {
    const params = new URLSearchParams();
    params.set("invoiceType", filters.invoiceType);
    return this.request(`/rubber-lining/portal/tax-invoices/statements?${params.toString()}`);
  }

  extractTaxInvoice = createEndpoint<[id: number], RubberTaxInvoiceDto>(apiClient, "POST", {
    path: (id) => `/rubber-lining/portal/tax-invoices/${id}/extract`,
  });

  createTaxInvoice = createEndpoint<
    [
      data: {
        invoiceNumber: string;
        invoiceDate?: string;
        invoiceType: TaxInvoiceType;
        companyId: number;
        totalAmount?: number;
        vatAmount?: number;
        isCreditNote?: boolean;
      },
    ],
    RubberTaxInvoiceDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/tax-invoices",
    body: (data) => data,
  });

  updateTaxInvoice = createEndpoint<
    [
      id: number,
      data: {
        invoiceNumber?: string;
        invoiceDate?: string;
        status?: TaxInvoiceStatus;
        totalAmount?: number;
        vatAmount?: number;
        productDescription?: string;
        orderNumber?: string;
        deliveryNoteRef?: string;
        quantity?: number;
        unit?: string;
        costPerUnit?: number;
        subtotal?: number;
      },
    ],
    RubberTaxInvoiceDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/tax-invoices/${id}`,
    body: (_id, data) => data,
  });

  approveTaxInvoice = createEndpoint<[id: number], RubberTaxInvoiceDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/tax-invoices/${id}/approve`,
  });

  refileTaxInvoiceStock = createEndpoint<[id: number], RubberTaxInvoiceDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/tax-invoices/${id}/refile-stock`,
  });

  updateTaxInvoiceLineItemRolls = createEndpoint<
    [id: number, lineIdx: number, rolls: Array<{ rollNumber: string; weightKg: number | null }>],
    RubberTaxInvoiceDto
  >(apiClient, "PUT", {
    path: (id, lineIdx, _rolls) =>
      `/rubber-lining/portal/tax-invoices/${id}/line-items/${lineIdx}/rolls`,
    body: (_id, _lineIdx, rolls) => ({ rolls }),
  });

  async availableRollsForProductCode(productCode: string): Promise<
    Array<{
      id: number;
      rollNumber: string;
      weightKg: number;
      compoundCode: string | null;
      thicknessMm: number | null;
      widthMm: number | null;
      lengthM: number | null;
    }>
  > {
    const params = new URLSearchParams({ productCode });
    return this.request(`/rubber-lining/portal/roll-stock/available?${params.toString()}`);
  }

  async recomputeCompoundCosts(
    invoiceId: number,
  ): Promise<{ updated: number; unitPrice: number | null }> {
    return this.request(
      `/rubber-lining/portal/tax-invoices/${invoiceId}/recompute-compound-costs`,
      { method: "POST" },
    );
  }

  async rollsByNumbers(rollNumbers: string[]): Promise<
    Array<{
      id: number;
      rollNumber: string;
      weightKg: number;
      tollCostR: number | null;
      compoundCostR: number | null;
      totalCostR: number | null;
      status: string;
      statusLabel: string;
      soldToCompanyId: number | null;
      soldToCompanyName: string | null;
      customerTaxInvoiceId: number | null;
      supplierTaxInvoiceId: number | null;
    }>
  > {
    if (rollNumbers.length === 0) return [];
    const params = new URLSearchParams({ rollNumbers: rollNumbers.join(",") });
    return this.request(`/rubber-lining/portal/roll-stock/by-numbers?${params.toString()}`);
  }

  deleteTaxInvoice = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/tax-invoices/${id}`,
  });

  async uploadTaxInvoiceDocument(id: number, file: File): Promise<RubberTaxInvoiceDto> {
    return this.requestWithFiles(
      `/rubber-lining/portal/tax-invoices/${id}/document`,
      [file],
      {},
      "file",
    );
  }

  async uploadTaxInvoiceWithFiles(
    files: File[],
    data: {
      invoiceType: TaxInvoiceType;
      companyId?: number;
      invoiceNumber?: string;
      invoiceDate?: string;
    },
  ): Promise<{ taxInvoiceIds: number[] }> {
    return this.requestWithFiles("/rubber-lining/portal/tax-invoices/upload", files, {
      invoiceType: data.invoiceType,
      companyId: data.companyId,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
    });
  }

  async cocSageExportPreview(params: {
    dateFrom?: string;
    dateTo?: string;
    excludeExported?: boolean;
  }): Promise<{ cocCount: number; batchCount: number; totalBatches: number }> {
    const query = new URLSearchParams();
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);
    if (params.excludeExported !== undefined) {
      query.set("excludeExported", String(params.excludeExported));
    }
    return this.request(
      `/rubber-lining/portal/supplier-cocs/export/sage-preview?${query.toString()}`,
    );
  }

  async cocSageExportCsv(params: {
    dateFrom?: string;
    dateTo?: string;
    excludeExported?: boolean;
  }): Promise<Blob> {
    const query = new URLSearchParams();
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);
    if (params.excludeExported !== undefined) {
      query.set("excludeExported", String(params.excludeExported));
    }
    const url = `${this.baseURL}/rubber-lining/portal/supplier-cocs/export/sage-csv?${query.toString()}`;
    const headers = this.authHeaders();
    const response = await fetch(url, { headers });
    await throwIfNotOk(response);
    return response.blob();
  }

  async sageExportPreview(params: {
    dateFrom?: string;
    dateTo?: string;
    excludeExported?: boolean;
    invoiceId?: number;
  }): Promise<{ invoiceCount: number; lineItemCount: number; totalAmount: number }> {
    const query = new URLSearchParams();
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);
    if (params.excludeExported !== undefined) {
      query.set("excludeExported", String(params.excludeExported));
    }
    if (params.invoiceId) query.set("invoiceId", String(params.invoiceId));
    return this.request(
      `/rubber-lining/portal/tax-invoices/export/sage-preview?${query.toString()}`,
    );
  }

  async sageExportCsv(params: {
    dateFrom?: string;
    dateTo?: string;
    excludeExported?: boolean;
    invoiceId?: number;
  }): Promise<Blob> {
    const query = new URLSearchParams();
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);
    if (params.excludeExported !== undefined) {
      query.set("excludeExported", String(params.excludeExported));
    }
    if (params.invoiceId) query.set("invoiceId", String(params.invoiceId));
    const url = `${this.baseURL}/rubber-lining/portal/tax-invoices/export/sage-csv?${query.toString()}`;
    const headers = this.authHeaders();
    const response = await fetch(url, { headers });
    await throwIfNotOk(response);
    return response.blob();
  }

  async reExtractAllTaxInvoices(
    invoiceType?: TaxInvoiceType,
  ): Promise<{ triggered: number; invoiceIds: number[]; startedAt: string }> {
    const query = invoiceType ? `?invoiceType=${invoiceType}` : "";
    return this.request(`/rubber-lining/portal/tax-invoices/re-extract-all${query}`, {
      method: "POST",
    });
  }

  async reExtractAllDeliveryNotes(
    partyType: "SUPPLIER" | "CUSTOMER",
  ): Promise<{ triggered: number; deliveryNoteIds: number[]; startedAt: string }> {
    return this.request(
      `/rubber-lining/portal/delivery-notes/re-extract-all?partyType=${partyType}`,
      {
        method: "POST",
      },
    );
  }

  async dedupeDeliveryNotes(): Promise<{ deleted: number; kept: number; groups: number }> {
    return this.request("/rubber-lining/portal/delivery-notes/dedupe", {
      method: "POST",
    });
  }

  async dedupeTaxInvoices(): Promise<{ deleted: number; kept: number; groups: number }> {
    return this.request("/rubber-lining/portal/tax-invoices/dedupe", {
      method: "POST",
    });
  }

  async customerSageExportPreview(params: {
    dateFrom?: string;
    dateTo?: string;
    excludeExported?: boolean;
  }): Promise<{ invoiceCount: number; lineItemCount: number; totalAmount: number }> {
    const query = new URLSearchParams();
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);
    if (params.excludeExported !== undefined) {
      query.set("excludeExported", String(params.excludeExported));
    }
    return this.request(
      `/rubber-lining/portal/tax-invoices/export/customer-sage-preview?${query.toString()}`,
    );
  }

  async customerSageExportCsv(params: {
    dateFrom?: string;
    dateTo?: string;
    excludeExported?: boolean;
  }): Promise<Blob> {
    const query = new URLSearchParams();
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);
    if (params.excludeExported !== undefined) {
      query.set("excludeExported", String(params.excludeExported));
    }
    const url = `${this.baseURL}/rubber-lining/portal/tax-invoices/export/customer-sage-csv?${query.toString()}`;
    const headers = this.authHeaders();
    const response = await fetch(url, { headers });
    await throwIfNotOk(response);
    return response.blob();
  }

  sageConnectionStatus = createEndpoint<
    [],
    {
      connected: boolean;
      enabled: boolean;
      sageUsername: string | null;
      sagePasswordSet: boolean;
      sageCompanyId: number | null;
      sageCompanyName: string | null;
      connectedAt: string | null;
    }
  >(apiClient, "GET", {
    path: "/rubber-lining/portal/sage/status",
  });

  updateSageConfig = createEndpoint<
    [
      dto: {
        sageUsername: string | null;
        sagePassword: string | null;
        sageCompanyId: number | null;
        sageCompanyName: string | null;
      },
    ],
    { message: string }
  >(apiClient, "PATCH", {
    path: "/rubber-lining/portal/sage/config",
    body: (dto) => dto,
  });

  async disconnectSage(): Promise<{ message: string }> {
    return this.request("/rubber-lining/portal/sage/config", {
      method: "DELETE",
    });
  }

  testSageConnection = createEndpoint<
    [username?: string, password?: string],
    {
      success: boolean;
      companies: Array<{ ID: number; Name: string; TaxNumber: string }>;
    }
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/sage/test",
    body: (username, password) => ({ username, password }),
  });

  async sageContactSync(): Promise<SageContactSyncResult> {
    return this.request("/rubber-lining/portal/sage/contact-sync", {
      method: "POST",
    });
  }

  sageContactMappings = createEndpoint<[], SageContactMappingStatus>(apiClient, "GET", {
    path: "/rubber-lining/portal/sage/contact-mappings",
  });

  mapSageContact = createEndpoint<
    [companyId: number, sageContactId: number, sageContactType: string],
    unknown
  >(apiClient, "PATCH", {
    path: (companyId, _sageContactId, _sageContactType) =>
      `/rubber-lining/portal/sage/contact-mappings/${companyId}`,
    body: (_companyId, sageContactId, sageContactType) => ({ sageContactId, sageContactType }),
  });

  unmapSageContact = createEndpoint<[companyId: number], unknown>(apiClient, "DELETE", {
    path: (companyId) => `/rubber-lining/portal/sage/contact-mappings/${companyId}`,
  });

  async postInvoiceToSage(
    invoiceId: number,
  ): Promise<{ sageInvoiceId: number; invoiceId: number; invoiceNumber: string }> {
    return this.request(`/rubber-lining/portal/tax-invoices/${invoiceId}/post-to-sage`, {
      method: "POST",
    });
  }

  postInvoicesToSageBulk = createEndpoint<
    [invoiceIds: number[]],
    {
      successful: Array<{ sageInvoiceId: number; invoiceId: number; invoiceNumber: string }>;
      failed: Array<{ invoiceId: number; invoiceNumber: string; error: string }>;
    }
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/tax-invoices/post-to-sage/bulk",
    body: (invoiceIds) => ({ invoiceIds }),
  });

  postInvoicesToSageBulkByFilter = createEndpoint<
    [
      filter: {
        invoiceType: TaxInvoiceType;
        search?: string;
        includeAllVersions?: boolean;
      },
    ],
    {
      successful: Array<{ sageInvoiceId: number; invoiceId: number; invoiceNumber: string }>;
      failed: Array<{ invoiceId: number; invoiceNumber: string; error: string }>;
    }
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/tax-invoices/post-to-sage/bulk-by-filter",
    body: (filter) => filter,
  });

  async authorizeVersion(
    entityType: "tax-invoices" | "delivery-notes" | "supplier-cocs",
    id: number,
  ): Promise<{ authorizedId: number; supersededId: number | null }> {
    return this.request(`/rubber-lining/portal/${entityType}/${id}/authorize-version`, {
      method: "PUT",
    });
  }

  async rejectVersion(
    entityType: "tax-invoices" | "delivery-notes" | "supplier-cocs",
    id: number,
  ): Promise<void> {
    return this.request(`/rubber-lining/portal/${entityType}/${id}/reject-version`, {
      method: "PUT",
    });
  }

  async versionHistory(
    entityType: "tax-invoices" | "delivery-notes" | "supplier-cocs",
    id: number,
  ): Promise<
    Array<{
      id: number;
      version: number;
      versionStatus: string;
      versionStatusLabel: string;
      createdAt: string;
      updatedAt: string;
    }>
  > {
    return this.request(`/rubber-lining/portal/${entityType}/${id}/version-history`);
  }

  accountingDirectors = createEndpoint<
    [],
    Array<{
      id: number;
      name: string;
      title: string;
      email: string;
      isActive: boolean;
      createdAt: string;
    }>
  >(apiClient, "GET", {
    path: "/rubber-lining/portal/accounting/directors",
  });

  createAccountingDirector = createEndpoint<
    [
      data: {
        name: string;
        title: string;
        email: string;
      },
    ],
    { id: number; name: string; title: string; email: string }
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/accounting/directors",
    body: (data) => data,
  });

  updateAccountingDirector = createEndpoint<
    [id: number, data: { name?: string; title?: string; email?: string; isActive?: boolean }],
    { id: number; name: string; title: string; email: string }
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/accounting/directors/${id}`,
    body: (_id, data) => data,
  });

  deleteAccountingDirector = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/accounting/directors/${id}`,
  });

  async accountingPayable(
    year: number,
    month: number,
    companyId?: number,
  ): Promise<{
    year: number;
    month: number;
    accountType: string;
    companies: Array<unknown>;
    grandTotal: number;
    grandVat: number;
    grandPayable: number;
  }> {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
    });
    if (companyId) params.set("companyId", String(companyId));
    return this.request(`/rubber-lining/portal/accounting/payable?${params.toString()}`);
  }

  async accountingReceivable(
    year: number,
    month: number,
    companyId?: number,
  ): Promise<{
    year: number;
    month: number;
    accountType: string;
    companies: Array<unknown>;
    grandTotal: number;
    grandVat: number;
    grandPayable: number;
  }> {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
    });
    if (companyId) params.set("companyId", String(companyId));
    return this.request(`/rubber-lining/portal/accounting/receivable?${params.toString()}`);
  }

  async accountingMonthlyAccounts(filters?: {
    accountType?: string;
    status?: string;
    year?: number;
  }): Promise<Array<unknown>> {
    const params = new URLSearchParams();
    if (filters?.accountType) params.set("accountType", filters.accountType);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.year) params.set("year", String(filters.year));
    const qs = params.toString();
    return this.request(`/rubber-lining/portal/accounting${qs ? `?${qs}` : ""}`);
  }

  accountingGenerate = createEndpoint<
    [year: number, month: number, accountType: string],
    Record<string, unknown>
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/accounting/generate",
    body: (year, month, accountType) => ({ year, month, accountType }),
  });

  async accountingDownloadPdf(id: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/rubber-lining/portal/accounting/${id}/pdf`, {
      headers: this.headers(),
    });
    await throwIfNotOk(response);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `account-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  accountingRequestSignOff = createEndpoint<[id: number], Record<string, unknown>>(
    apiClient,
    "POST",
    {
      path: (id) => `/rubber-lining/portal/accounting/${id}/request-signoff`,
    },
  );

  async accountingReconciliations(filters?: {
    companyId?: number;
    status?: string;
    year?: number;
    month?: number;
  }): Promise<Array<unknown>> {
    const params = new URLSearchParams();
    if (filters?.companyId) params.set("companyId", String(filters.companyId));
    if (filters?.status) params.set("status", filters.status);
    if (filters?.year) params.set("year", String(filters.year));
    if (filters?.month) params.set("month", String(filters.month));
    const qs = params.toString();
    return this.request(`/rubber-lining/portal/accounting/reconciliation${qs ? `?${qs}` : ""}`);
  }

  accountingReconciliationById = createEndpoint<[id: number], unknown>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/accounting/reconciliation/${id}`,
  });

  async accountingUploadStatement(
    companyId: number,
    file: File,
    year: number,
    month: number,
  ): Promise<Record<string, unknown>> {
    return this.requestWithFiles(
      "/rubber-lining/portal/accounting/reconciliation/upload",
      [file],
      {
        companyId,
        year,
        month,
      },
      "file",
    );
  }

  accountingExtractStatement = createEndpoint<[id: number], unknown>(apiClient, "POST", {
    path: (id) => `/rubber-lining/portal/accounting/reconciliation/${id}/extract`,
  });

  accountingReconcileStatement = createEndpoint<[id: number], unknown>(apiClient, "POST", {
    path: (id) => `/rubber-lining/portal/accounting/reconciliation/${id}/reconcile`,
  });

  accountingResolveDiscrepancy = createEndpoint<
    [id: number, resolvedBy: string, notes: string],
    unknown
  >(apiClient, "PUT", {
    path: (id, _resolvedBy, _notes) =>
      `/rubber-lining/portal/accounting/reconciliation/${id}/resolve`,
    body: (_id, resolvedBy, notes) => ({ resolvedBy, notes }),
  });

  featureFlagsDetailed = createEndpoint<
    [],
    {
      flags: Array<{
        flagKey: string;
        enabled: boolean;
        description: string | null;
        category: string;
      }>;
    }
  >(apiClient, "GET", {
    path: "/rubber-lining/admin/feature-flags/detailed",
  });

  updateFeatureFlag = createEndpoint<
    [flagKey: string, enabled: boolean],
    { flagKey: string; enabled: boolean; description: string | null; category: string }
  >(apiClient, "PUT", {
    path: "/rubber-lining/admin/feature-flags",
    body: (flagKey, enabled) => ({ flagKey, enabled }),
  });

  identifyRollPhoto = createEndpoint<
    [imageBase64: string, mediaType: "image/jpeg" | "image/png" | "image/webp"],
    RollPhotoIdentifyResponse
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/roll-issuances/identify-photo",
    body: (imageBase64, mediaType) => ({ imageBase64, mediaType }),
  });

  createRollFromPhoto = createEndpoint<[dto: CreateRollFromPhotoDto], RollIssuanceRollDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/roll-issuances/create-from-photo",
      body: (dto) => dto,
    },
  );

  async searchJobCardsForIssuing(query: string): Promise<JcSearchResultDto[]> {
    return this.request(
      `/rubber-lining/portal/roll-issuances/jc-search?q=${encodeURIComponent(query)}`,
    );
  }

  jobCardLineItems = createEndpoint<[jobCardId: number], JcLineItemDto[]>(apiClient, "GET", {
    path: (jobCardId) => `/rubber-lining/portal/roll-issuances/jc/${jobCardId}/line-items`,
  });

  createRollIssuance = createEndpoint<[dto: CreateRollIssuanceDto], RollIssuanceDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/roll-issuances",
      body: (dto) => dto,
    },
  );

  rollIssuances = createEndpoint<[], RollIssuanceDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/roll-issuances",
  });

  rollIssuanceById = createEndpoint<[id: number], RollIssuanceDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/roll-issuances/${id}`,
  });

  cancelRollIssuance = createEndpoint<[id: number], RollIssuanceDto>(apiClient, "POST", {
    path: (id) => `/rubber-lining/portal/roll-issuances/${id}/cancel`,
  });
  websitePages = createEndpoint<[], WebsitePageDto[]>(apiClient, "GET", {
    path: "/rubber-lining/website-pages",
  });

  websitePage = createEndpoint<[id: string], WebsitePageDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/website-pages/${id}`,
  });

  createWebsitePage = createEndpoint<[data: CreateWebsitePageDto], WebsitePageDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/website-pages",
      body: (data) => data,
    },
  );

  updateWebsitePage = createEndpoint<[id: string, data: UpdateWebsitePageDto], WebsitePageDto>(
    apiClient,
    "PATCH",
    {
      path: (id, _data) => `/rubber-lining/website-pages/${id}`,
      body: (_id, data) => data,
    },
  );

  async deleteWebsitePage(id: string): Promise<void> {
    return this.request(`/rubber-lining/website-pages/${id}`, {
      method: "DELETE",
    });
  }

  reorderWebsitePage = createEndpoint<[id: string, sortOrder: number], WebsitePageDto>(
    apiClient,
    "PATCH",
    {
      path: (id, _sortOrder) => `/rubber-lining/website-pages/${id}/reorder`,
      body: (_id, sortOrder) => ({ sortOrder }),
    },
  );

  async uploadWebsiteImage(file: File): Promise<{ url: string }> {
    return this.requestWithFiles("/rubber-lining/website-pages/upload-image", [file], {}, "file");
  }

  testimonials = createEndpoint<[], TestimonialDto[]>(apiClient, "GET", {
    path: "/rubber-lining/testimonials",
  });

  testimonial = createEndpoint<[id: string], TestimonialDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/testimonials/${id}`,
  });

  createTestimonial = createEndpoint<[data: CreateTestimonialDto], TestimonialDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/testimonials",
      body: (data) => data,
    },
  );

  updateTestimonial = createEndpoint<[id: string, data: UpdateTestimonialDto], TestimonialDto>(
    apiClient,
    "PATCH",
    {
      path: (id, _data) => `/rubber-lining/testimonials/${id}`,
      body: (_id, data) => data,
    },
  );

  async deleteTestimonial(id: string): Promise<void> {
    return this.request(`/rubber-lining/testimonials/${id}`, {
      method: "DELETE",
    });
  }

  blogPosts = createEndpoint<[], BlogPostDto[]>(apiClient, "GET", {
    path: "/rubber-lining/blog-posts",
  });

  blogPost = createEndpoint<[id: string], BlogPostDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/blog-posts/${id}`,
  });

  createBlogPost = createEndpoint<[data: CreateBlogPostDto], BlogPostDto>(apiClient, "POST", {
    path: "/rubber-lining/blog-posts",
    body: (data) => data,
  });

  updateBlogPost = createEndpoint<[id: string, data: UpdateBlogPostDto], BlogPostDto>(
    apiClient,
    "PATCH",
    {
      path: (id, _data) => `/rubber-lining/blog-posts/${id}`,
      body: (_id, data) => data,
    },
  );

  async deleteBlogPost(id: string): Promise<void> {
    return this.request(`/rubber-lining/blog-posts/${id}`, {
      method: "DELETE",
    });
  }
}

export interface WebsitePageDto {
  id: string;
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  content: string;
  heroImageUrl: string | null;
  sortOrder: number;
  isPublished: boolean;
  isHomePage: boolean;
  showInNav: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebsitePageDto {
  title: string;
  slug: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  content?: string;
  heroImageUrl?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
  isHomePage?: boolean;
  showInNav?: boolean;
}

export interface UpdateWebsitePageDto {
  title?: string;
  slug?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  content?: string;
  heroImageUrl?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
  isHomePage?: boolean;
  showInNav?: boolean;
}

export type TestimonialSource = "google" | "manual" | "email" | "whatsapp";

export interface TestimonialDto {
  id: string;
  authorName: string;
  authorRole: string | null;
  authorCompany: string | null;
  rating: number;
  body: string;
  datePublished: string;
  source: TestimonialSource;
  highlight: boolean;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestimonialDto {
  authorName: string;
  authorRole?: string | null;
  authorCompany?: string | null;
  rating: number;
  body: string;
  datePublished: string;
  source?: TestimonialSource;
  highlight?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
}

export interface UpdateTestimonialDto {
  authorName?: string;
  authorRole?: string | null;
  authorCompany?: string | null;
  rating?: number;
  body?: string;
  datePublished?: string;
  source?: TestimonialSource;
  highlight?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
}

export interface BlogPostDto {
  id: string;
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  excerpt: string;
  content: string;
  heroImageUrl: string | null;
  author: string;
  publishedAt: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlogPostDto {
  slug: string;
  title: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  excerpt?: string;
  content?: string;
  heroImageUrl?: string | null;
  author?: string;
  publishedAt?: string | null;
  isPublished?: boolean;
}

export interface UpdateBlogPostDto {
  slug?: string;
  title?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  excerpt?: string;
  content?: string;
  heroImageUrl?: string | null;
  author?: string;
  publishedAt?: string | null;
  isPublished?: boolean;
}

export const auRubberApiClient = new AuRubberApiClient();
