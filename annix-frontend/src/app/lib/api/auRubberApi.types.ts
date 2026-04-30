/**
 * Type declarations for auRubberApi. Extracted from auRubberApi.ts as part
 * of issue #233 Phase 2B to slim that file down to the API client class.
 */
import type { CallOff } from "./rubberPortalApi";

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
