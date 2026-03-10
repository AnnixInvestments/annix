import { API_BASE_URL } from "@/lib/api-config";

export interface StockControlLoginDto {
  email: string;
  password: string;
}

export interface StockControlUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface StockControlLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: StockControlUser;
}

export interface StockControlUserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  companyId: number;
  companyName: string | null;
  brandingType: string;
  primaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  registrationNumber: string | null;
  vatNumber: string | null;
  streetAddress: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  phone: string | null;
  companyEmail: string | null;
  websiteUrl: string | null;
  pipingLossFactorPct: number;
  flatPlateLossFactorPct: number;
  structuralSteelLossFactorPct: number;
  linkedStaffId: number | null;
  createdAt: string;
  companyUpdatedAt: string | null;
  hideTooltips: boolean;
}

export interface GlossaryTerm {
  id: number;
  abbreviation: string;
  term: string;
  definition: string;
  category: string | null;
  companyId: number;
  isCustom: boolean;
}

export interface CompanyDetailsUpdate {
  name?: string;
  registrationNumber?: string;
  vatNumber?: string;
  streetAddress?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  pipingLossFactorPct?: number;
  flatPlateLossFactorPct?: number;
  structuralSteelLossFactorPct?: number;
}

export interface SmtpConfigResponse {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassSet: boolean;
  smtpFromName: string | null;
  smtpFromEmail: string | null;
  notificationEmails: string[];
}

export interface SmtpConfigUpdate {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpFromName: string | null;
  smtpFromEmail: string | null;
  notificationEmails?: string[];
}

export interface StockControlCompany {
  id: number;
  name: string;
  brandingType: string;
  websiteUrl: string | null;
  brandingAuthorized: boolean;
}

export interface StockControlInvitation {
  id: number;
  companyId: number;
  invitedById: number;
  email: string;
  token: string;
  role: string;
  status: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  invitedBy?: { name: string; email: string };
}

export interface StockControlTeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface StockControlDepartment {
  id: number;
  name: string;
  displayOrder: number | null;
  active: boolean;
  companyId: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockControlLocation {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number | null;
  active: boolean;
  companyId: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockItem {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unitOfMeasure: string;
  costPerUnit: number;
  quantity: number;
  minStockLevel: number;
  location: string | null;
  locationId: number | null;
  photoUrl: string | null;
  needsQrPrint: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobCardLineItem {
  id: number;
  jobCardId: number;
  itemCode: string | null;
  itemDescription: string | null;
  itemNo: string | null;
  quantity: number | null;
  jtNo: string | null;
  m2: number | null;
  notes: string | null;
  sortOrder: number;
  companyId: number;
  createdAt: string;
}

export interface JobCard {
  id: number;
  jobNumber: string;
  jcNumber: string | null;
  pageNumber: string | null;
  jobName: string;
  customerName: string | null;
  description: string | null;
  poNumber: string | null;
  siteLocation: string | null;
  contactPerson: string | null;
  dueDate: string | null;
  notes: string | null;
  reference: string | null;
  customFields: Record<string, string> | null;
  rubberPlanOverride: RubberPlanOverride | null;
  status: string;
  workflowStatus: string;
  versionNumber?: number;
  sourceFilePath?: string | null;
  sourceFileName?: string | null;
  createdAt: string;
  updatedAt: string;
  cpoId: number | null;
  isCpoCalloff: boolean;
  allocations?: StockAllocation[];
  lineItems?: JobCardLineItem[];
}

export interface JobCardVersion {
  id: number;
  jobCardId: number;
  companyId: number;
  versionNumber: number;
  filePath: string | null;
  originalFilename: string | null;
  jobName: string;
  customerName: string | null;
  notes: string | null;
  lineItemsSnapshot: Record<string, unknown>[] | null;
  amendmentNotes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface JobCardAttachment {
  id: number;
  jobCardId: number;
  companyId: number;
  attachmentType: string;
  filePath: string;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  extractionStatus: "pending" | "processing" | "analysed" | "failed";
  extractedData: Record<string, unknown>;
  extractionError: string | null;
  extractedAt: string | null;
  uploadedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffMember {
  id: number;
  name: string;
  employeeNumber: string | null;
  department: string | null;
  departmentId: number | null;
  photoUrl: string | null;
  qrToken: string;
  active: boolean;
  companyId: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockAllocation {
  id: number;
  quantityUsed: number;
  photoUrl: string | null;
  notes: string | null;
  allocatedBy: string | null;
  staffMemberId: number | null;
  staffMember?: StaffMember | null;
  createdAt: string;
  stockItem?: StockItem;
  jobCard?: JobCard;
  pendingApproval: boolean;
  allowedLitres: number | null;
  approvedByManagerId: number | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

export interface CoatDetail {
  product: string;
  genericType: string | null;
  area: "external" | "internal";
  minDftUm: number;
  maxDftUm: number;
  solidsByVolumePercent: number;
  coverageM2PerLiter: number;
  litersRequired: number;
  verified?: boolean;
}

export interface UnverifiedProduct {
  product: string;
  genericType: string | null;
  estimatedVolumeSolids: number;
}

export interface StockAssessmentItem {
  product: string;
  stockItemId: number | null;
  stockItemName: string | null;
  currentStock: number;
  required: number;
  unit: string;
  sufficient: boolean;
}

export interface CoatingAnalysis {
  id: number;
  jobCardId: number;
  applicationType: string | null;
  surfacePrep: string | null;
  extM2: number;
  intM2: number;
  coats: CoatDetail[];
  stockAssessment: StockAssessmentItem[];
  rawNotes: string | null;
  status: string;
  error: string | null;
  analysedAt: string | null;
  acceptedBy: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RubberStockOption {
  stockItemId: number;
  thicknessMm: number | null;
  widthMm: number | null;
  lengthM: number | null;
  color: string | null;
  compoundCode: string | null;
  quantityAvailable: number;
  name: string;
}

export interface RubberPlyCombination {
  thicknesses: number[];
  allInStock: boolean;
  partiallyInStock: boolean;
}

export interface RubberStockOptionsResponse {
  rubberSpec: {
    thicknessMm: number;
    shore: number | null;
    color: string | null;
    pattern: string | null;
    compound: string | null;
  } | null;
  stockItems: RubberStockOption[];
  availableThicknesses: number[];
  plyCombinations: RubberPlyCombination[];
}

export interface RubberPlanManualRoll {
  widthMm: number;
  lengthM: number;
  thicknessMm: number;
  cuts: Array<{
    description: string;
    widthMm: number;
    lengthMm: number;
    quantity: number;
  }>;
}

export interface RubberPlanOverride {
  status: "pending" | "accepted" | "manual";
  selectedPlyCombination: number[] | null;
  manualRolls: RubberPlanManualRoll[] | null;
  dimensionOverrides?: RubberDimensionOverride[] | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface RubberDimensionOverride {
  itemType: string | null;
  nbMm: number | null;
  odMm: number | null;
  schedule: string | null;
  pipeLengthMm: number;
  flangeConfig: string | null;
  calculatedWidthMm: number;
  calculatedLengthMm: number;
  overrideWidthMm: number;
  overrideLengthMm: number;
}

export interface StockControlSupplierDto {
  id: number;
  companyId: number;
  name: string;
  vatNumber: string | null;
  registrationNumber: string | null;
  address: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierCertificate {
  id: number;
  companyId: number;
  supplierId: number;
  stockItemId: number | null;
  jobCardId: number | null;
  certificateType: string;
  batchNumber: string;
  filePath: string;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  description: string | null;
  expiryDate: string | null;
  uploadedById: number | null;
  uploadedByName: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: StockControlSupplierDto;
  stockItem?: StockItem | null;
  jobCard?: { id: number; jobNumber: string; jobName: string } | null;
  downloadUrl?: string;
}

export interface IssuanceBatchRecord {
  id: number;
  companyId: number;
  stockIssuanceId: number;
  stockItemId: number;
  jobCardId: number | null;
  batchNumber: string;
  quantity: number;
  supplierCertificateId: number | null;
  createdAt: string;
  stockItem?: StockItem;
  supplierCertificate?: SupplierCertificate | null;
}

export interface DataBookStatus {
  exists: boolean;
  isStale: boolean;
  certificateCount: number;
  generatedAt: string | null;
  dataBookId: number | null;
}

export interface DeliveryNote {
  id: number;
  deliveryNumber: string;
  supplierName: string;
  supplierId: number | null;
  receivedDate: string;
  notes: string | null;
  photoUrl: string | null;
  receivedBy: string | null;
  extractionStatus: string | null;
  extractedData: Record<string, unknown> | null;
  createdAt: string;
  items: DeliveryNoteItem[];
}

export interface DeliveryNoteItem {
  id: number;
  quantityReceived: number;
  photoUrl: string | null;
  stockItem?: StockItem;
}

export interface StockMovement {
  id: number;
  movementType: string;
  quantity: number;
  referenceType: string | null;
  referenceId: number | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  stockItem?: StockItem;
}

export interface RequisitionItem {
  id: number;
  requisitionId: number;
  stockItemId: number | null;
  productName: string;
  area: string | null;
  litresRequired: number;
  packSizeLitres: number;
  packsToOrder: number;
  quantityRequired: number | null;
  reorderQty: number | null;
  reqNumber: string | null;
  companyId: number;
  stockItem: StockItem | null;
}

export interface Requisition {
  id: number;
  requisitionNumber: string;
  jobCardId: number | null;
  cpoId: number | null;
  source: "job_card" | "reorder" | "cpo";
  isCalloffOrder: boolean;
  status: string;
  notes: string | null;
  createdBy: string | null;
  companyId: number;
  createdAt: string;
  updatedAt: string;
  jobCard?: JobCard | null;
  items: RequisitionItem[];
}

export interface CpoCalloffRecord {
  id: number;
  companyId: number;
  cpoId: number;
  jobCardId: number | null;
  requisitionId: number | null;
  calloffType: "rubber" | "paint" | "solution";
  status: "pending" | "called_off" | "delivered" | "invoiced";
  calledOffAt: string | null;
  deliveredAt: string | null;
  invoicedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  jobCard?: JobCard | null;
}

export interface DashboardStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  activeJobs: number;
}

export interface CpoSummary {
  activeCpos: number;
  awaitingCalloff: number;
  overdueInvoices: number;
}

export interface StoremanDashboard {
  incomingDeliveries: number;
  dispatchReadyJobs: number;
  todayMovements: number;
  reorderAlerts: number;
}

export interface AccountsDashboard {
  pendingExtraction: number;
  processing: number;
  needsClarification: number;
  awaitingApproval: number;
  completedThisMonth: number;
  overdueInvoices: number;
}

export interface ManagerDashboard {
  pendingApprovals: number;
  activeJobs: number;
  overAllocations: number;
  dispatchReady: number;
  reorderAlerts: number;
}

export interface AdminDashboard {
  storeman: StoremanDashboard;
  accounts: AccountsDashboard;
  manager: ManagerDashboard;
  totalUsers: number;
}

export type RoleDashboardSummary =
  | ({ role: "storeman" } & StoremanDashboard)
  | ({ role: "accounts" } & AccountsDashboard)
  | ({ role: "manager" } & ManagerDashboard)
  | ({ role: "admin" } & AdminDashboard)
  | { role: "viewer"; activeJobs: number; totalItems: number; lowStockCount: number };

export interface DashboardPreferences {
  id: number;
  userId: number;
  pinnedWidgets: string[];
  hiddenWidgets: string[];
  viewOverride: string | null;
}

export interface WorkflowLaneCounts {
  inbound: {
    deliveriesPending: number;
    deliveriesProcessed: number;
    invoicesPending: number;
    invoicesNeedClarification: number;
    invoicesAwaitingApproval: number;
  };
  workshop: {
    jobCardsDraft: number;
    jobCardsPendingAdmin: number;
    jobCardsPendingManager: number;
    jobCardsRequisitionSent: number;
    jobCardsPendingAllocation: number;
    jobCardsPendingFinal: number;
    coatingPending: number;
    coatingAnalysed: number;
    requisitionsPending: number;
    requisitionsApproved: number;
    requisitionsOrdered: number;
  };
  outbound: {
    jobCardsReadyForDispatch: number;
    jobCardsDispatched: number;
    lowStockAlerts: number;
  };
}

export interface CpoFulfillmentReportItem {
  cpoId: number;
  cpoNumber: string;
  jobNumber: string;
  customerName: string | null;
  status: string;
  items: {
    itemCode: string | null;
    itemDescription: string | null;
    quantityOrdered: number;
    quantityFulfilled: number;
    remaining: number;
    percentComplete: number;
  }[];
  totalOrdered: number;
  totalFulfilled: number;
  totalRemaining: number;
  percentComplete: number;
}

export interface CpoCalloffBreakdown {
  summary: {
    pending: number;
    calledOff: number;
    delivered: number;
    invoiced: number;
    total: number;
  };
  byCpo: {
    cpoId: number;
    cpoNumber: string;
    pending: number;
    calledOff: number;
    delivered: number;
    invoiced: number;
  }[];
}

export interface CpoOverdueInvoiceItem {
  recordId: number;
  cpoNumber: string;
  jobCardNumber: string | null;
  calloffType: string;
  deliveredAt: string | null;
  daysSinceDelivery: number;
}

export interface SohSummary {
  category: string;
  totalQuantity: number;
  totalValue: number;
}

export interface SohByLocation {
  location: string;
  totalQuantity: number;
  totalValue: number;
}

export interface RecentActivity {
  id: number;
  movementType: string;
  quantity: number;
  itemName: string;
  itemSku: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface CostByJob {
  jobCardId: number;
  jobNumber: string;
  jobName: string;
  customerName: string | null;
  totalCost: number;
  totalItemsAllocated: number;
}

export interface StaffStockFilters {
  startDate?: string;
  endDate?: string;
  staffMemberId?: number;
  departmentId?: number;
  stockItemId?: number;
  anomalyThreshold?: number;
}

export interface StaffItemBreakdown {
  stockItemId: number;
  stockItemName: string;
  sku: string;
  category: string | null;
  totalQuantity: number;
  totalValue: number;
}

export interface StaffStockSummary {
  staffMemberId: number;
  staffName: string;
  employeeNumber: string | null;
  department: string | null;
  departmentId: number | null;
  totalQuantityReceived: number;
  totalValue: number;
  issuanceCount: number;
  anomalyScore: number;
  isAnomaly: boolean;
  items: StaffItemBreakdown[];
}

export interface StaffStockReportResult {
  summaries: StaffStockSummary[];
  totals: {
    totalStaff: number;
    totalQuantityIssued: number;
    totalValue: number;
    anomalyCount: number;
  };
  averagePerStaff: number;
  anomalyThreshold: number;
  standardDeviation: number;
}

export interface JobCardDocument {
  id: number;
  jobCardId: number;
  documentType: string;
  fileUrl: string;
  originalFilename: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  uploadedByName: string | null;
  createdAt: string;
}

export interface JobCardApproval {
  id: number;
  jobCardId: number;
  step: string;
  status: string;
  approvedByName: string | null;
  signatureUrl: string | null;
  comments: string | null;
  rejectedReason: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface WorkflowNotification {
  id: number;
  userId: number;
  jobCardId: number | null;
  title: string;
  message: string | null;
  actionType: string;
  actionUrl: string | null;
  readAt: string | null;
  senderId: number | null;
  senderName: string | null;
  createdAt: string;
  jobCard?: JobCard;
}

export interface WorkflowStepAssignment {
  step: string;
  userIds: number[];
  primaryUserId: number | null;
  users: { id: number; name: string; email: string; role: string }[];
}

export interface EligibleUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface StepNotificationRecipients {
  step: string;
  emails: string[];
}

export interface UserLocationSummary {
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  locationIds: number[];
}

export interface WorkflowStatus {
  currentStatus: string;
  currentStep: string | null;
  canApprove: boolean;
  requiredRole: string | null;
}

export interface DispatchScan {
  id: number;
  jobCardId: number;
  stockItemId: number;
  allocationId: number | null;
  quantityDispatched: number;
  scannedByName: string | null;
  dispatchNotes: string | null;
  scannedAt: string;
  stockItem?: StockItem;
}

export interface AllocationSummary {
  stockItemId: number;
  stockItem: StockItem;
  allocatedQuantity: number;
  dispatchedQuantity: number;
  remainingQuantity: number;
}

export interface DispatchProgress {
  totalAllocated: number;
  totalDispatched: number;
  isComplete: boolean;
  items: AllocationSummary[];
}

export interface StaffSignature {
  signatureUrl: string | null;
}

export interface StockValuation {
  items: {
    id: number;
    sku: string;
    name: string;
    category: string | null;
    quantity: number;
    costPerUnit: number;
    totalValue: number;
  }[];
  totalValue: number;
}

export interface ImportResult {
  totalRows: number;
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

export interface StockIssuance {
  id: number;
  companyId: number;
  stockItemId: number;
  stockItem?: StockItem;
  issuerStaffId: number;
  issuerStaff?: StaffMember;
  recipientStaffId: number;
  recipientStaff?: StaffMember;
  jobCardId: number | null;
  jobCard?: JobCard | null;
  quantity: number;
  notes: string | null;
  issuedByUserId: number | null;
  issuedByName: string | null;
  issuedAt: string;
  undone: boolean;
  undoneAt: string | null;
  undoneByName: string | null;
  createdAt: string;
}

export interface IssuanceScanResult {
  type: "staff" | "stock_item" | "job_card";
  id: number;
  data: StaffMember | StockItem | JobCard;
}

export interface CreateIssuanceDto {
  issuerStaffId: number;
  recipientStaffId: number;
  stockItemId: number;
  jobCardId?: number | null;
  quantity: number;
  notes?: string | null;
}

export interface IssuanceFilters {
  startDate?: string;
  endDate?: string;
  staffId?: number;
  stockItemId?: number;
  jobCardId?: number;
}

export interface IssuanceItemDto {
  stockItemId: number;
  quantity: number;
  batchNumber?: string | null;
}

export interface BatchIssuanceDto {
  issuerStaffId: number;
  recipientStaffId: number;
  jobCardId?: number | null;
  items: IssuanceItemDto[];
  notes?: string | null;
}

export interface BatchIssuanceResult {
  created: number;
  issuances: StockIssuance[];
  errors: Array<{ stockItemId: number; message: string }>;
}

export interface InventoryColumnMapping {
  sku: number | null;
  name: number | null;
  description: number | null;
  category: number | null;
  unitOfMeasure: number | null;
  costPerUnit: number | null;
  quantity: number | null;
  minStockLevel: number | null;
  location: number | null;
}

export interface ImportUploadResponse {
  format: string;
  headers?: string[];
  rawRows?: string[][];
  mapping?: InventoryColumnMapping;
  rows?: Record<string, unknown>[];
  error?: string;
}

export interface FieldMapping {
  column: number;
  startRow: number;
  endRow: number;
}

export interface CustomFieldMapping {
  fieldName: string;
  column: number;
  startRow: number;
  endRow: number;
}

export interface ImportMappingConfig {
  jobNumber: FieldMapping | null;
  jcNumber: FieldMapping | null;
  pageNumber: FieldMapping | null;
  jobName: FieldMapping | null;
  customerName: FieldMapping | null;
  description: FieldMapping | null;
  poNumber: FieldMapping | null;
  siteLocation: FieldMapping | null;
  contactPerson: FieldMapping | null;
  dueDate: FieldMapping | null;
  notes: FieldMapping | null;
  reference: FieldMapping | null;
  customFields: CustomFieldMapping[];
  lineItems: {
    itemCode: FieldMapping | null;
    itemDescription: FieldMapping | null;
    itemNo: FieldMapping | null;
    quantity: FieldMapping | null;
    jtNo: FieldMapping | null;
  };
}

export interface JobCardImportMapping {
  id: number;
  companyId: number;
  mappingConfig: ImportMappingConfig | null;
  createdAt: string;
  updatedAt: string;
}

export interface LineItemImportRow {
  itemCode?: string;
  itemDescription?: string;
  itemNo?: string;
  quantity?: string;
  jtNo?: string;
  m2?: number;
}

export interface M2Result {
  description: string;
  totalM2: number | null;
  externalM2: number | null;
  internalM2: number | null;
  parsedDiameterMm: number | null;
  parsedLengthM: number | null;
  parsedFlangeConfig: string | null;
  parsedSchedule: string | null;
  parsedItemType: string | null;
  confidence: number;
  error: string | null;
}

export interface JobCardImportRow {
  jobNumber?: string;
  jcNumber?: string;
  pageNumber?: string;
  jobName?: string;
  customerName?: string;
  description?: string;
  poNumber?: string;
  siteLocation?: string;
  contactPerson?: string;
  dueDate?: string;
  notes?: string;
  reference?: string | null;
  customFields?: Record<string, string>;
  lineItems?: LineItemImportRow[];
}

export interface JobCardImportResult {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export interface JobCardImportUploadResponse {
  grid: string[][];
  savedMapping: JobCardImportMapping | null;
  documentNumber: string | null;
  drawingRows?: JobCardImportRow[];
}

export interface CustomerPurchaseOrderItem {
  id: number;
  cpoId: number;
  companyId: number;
  itemCode: string | null;
  itemDescription: string | null;
  itemNo: string | null;
  quantityOrdered: number;
  quantityFulfilled: number;
  jtNo: string | null;
  m2: number | null;
  sortOrder: number;
  createdAt: string;
}

export interface CustomerPurchaseOrder {
  id: number;
  companyId: number;
  cpoNumber: string;
  jobNumber: string;
  jobName: string | null;
  customerName: string | null;
  poNumber: string | null;
  siteLocation: string | null;
  contactPerson: string | null;
  dueDate: string | null;
  notes: string | null;
  reference: string | null;
  customFields: Record<string, string> | null;
  status: string;
  totalItems: number;
  totalQuantity: number;
  fulfilledQuantity: number;
  sourceFilePath: string | null;
  sourceFileName: string | null;
  createdBy: string | null;
  items: CustomerPurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface GlobalSearchResultItem {
  id: number;
  type: "job_card" | "stock_item" | "staff" | "delivery_note" | "invoice" | "purchase_order";
  title: string;
  subtitle: string | null;
  status: string | null;
  href: string;
  updatedAt: string | null;
  matchRank: number;
}

export interface GlobalSearchResponse {
  results: GlobalSearchResultItem[];
  totalCount: number;
  query: string;
}

export interface CpoImportResult {
  totalRows: number;
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
  createdCpoIds: number[];
}

export interface InvitationValidation {
  valid: boolean;
  email?: string;
  role?: string;
  companyName?: string | null;
  status?: string;
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
}

export interface ProcessedBrandingResult {
  logoUrl: string | null;
  heroImageUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
}

export interface SupplierInvoice {
  id: number;
  invoiceNumber: string;
  supplierName: string;
  supplierId: number | null;
  invoiceDate: string | null;
  totalAmount: number | null;
  vatAmount: number | null;
  scanUrl: string | null;
  extractionStatus:
    | "pending"
    | "processing"
    | "needs_clarification"
    | "awaiting_approval"
    | "completed"
    | "failed";
  extractedData: Record<string, unknown> | null;
  deliveryNoteId: number | null;
  deliveryNote?: DeliveryNote | null;
  approvedBy: number | null;
  approvedAt: string | null;
  exportedToSageAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: SupplierInvoiceItem[];
  clarifications?: InvoiceClarification[];
}

export interface SupplierInvoiceItem {
  id: number;
  invoiceId: number;
  lineNumber: number;
  extractedDescription: string | null;
  extractedSku: string | null;
  quantity: number;
  unitPrice: number | null;
  matchStatus:
    | "matched"
    | "unmatched"
    | "clarification_needed"
    | "manually_matched"
    | "new_item_created";
  matchConfidence: number | null;
  stockItemId: number | null;
  stockItem?: StockItem | null;
  isPartA: boolean;
  isPartB: boolean;
  linkedItemId: number | null;
  priceUpdated: boolean;
  previousPrice: number | null;
}

export interface InvoiceClarification {
  id: number;
  invoiceId: number;
  invoiceItemId: number | null;
  clarificationType: "item_match" | "price_confirmation" | "new_item" | "part_linking";
  status: "pending" | "answered" | "skipped";
  question: string;
  context: ClarificationContext | null;
  selectedStockItemId: number | null;
  responseData: Record<string, unknown> | null;
  answeredBy: number | null;
  answeredAt: string | null;
  invoiceItem?: SupplierInvoiceItem | null;
}

export interface ClarificationContext {
  suggestedMatches?: SuggestedMatch[];
  priceChangePercent?: number;
  oldPrice?: number;
  newPrice?: number;
  extractedDescription?: string;
  extractedSku?: string;
  isPartA?: boolean;
  isPartB?: boolean;
}

export interface SuggestedMatch {
  stockItemId: number;
  stockItemName: string;
  stockItemSku: string;
  confidence: number;
  currentPrice: number;
}

export interface PriceChangeSummary {
  items: {
    id: number;
    description: string;
    stockItemName: string;
    oldPrice: number;
    newPrice: number;
    changePercent: number;
    needsApproval: boolean;
  }[];
  totalOldValue: number;
  totalNewValue: number;
}

export interface StockPriceHistory {
  id: number;
  stockItemId: number;
  oldPrice: number | null;
  newPrice: number;
  changeReason: "invoice" | "manual" | "import";
  referenceType: string | null;
  referenceId: number | null;
  supplierName: string | null;
  changedBy: number | null;
  createdAt: string;
  stockItem?: StockItem;
}

export interface CreateInvoiceDto {
  deliveryNoteId?: number | null;
  invoiceNumber: string;
  supplierName: string;
  invoiceDate?: string;
  totalAmount?: number;
  vatAmount?: number;
}

export interface SuggestedDeliveryNote {
  id: number;
  deliveryNumber: string;
  supplierName: string;
  receivedDate: string | null;
  matchReason: string;
}

export interface SubmitClarificationDto {
  selectedStockItemId?: number;
  createNewItem?: {
    sku: string;
    name: string;
    description?: string;
    category?: string;
    unitOfMeasure?: string;
  };
  skipPriceUpdate?: boolean;
  confirmed?: boolean;
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

export interface AnalyzedDeliveryNoteData {
  documentType: "SUPPLIER_DELIVERY" | "CUSTOMER_DELIVERY" | "SUPPLIER_INVOICE" | "TAX_INVOICE";
  deliveryNoteNumber: string | null;
  invoiceNumber: string | null;
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
    subtotalExclVat: number | null;
    vatTotal: number | null;
    grandTotalInclVat: number | null;
  };
  notes: string | null;
  receivedBySignature: boolean;
  receivedDate: string | null;
}

export interface AnalyzedDeliveryNoteResult {
  data: AnalyzedDeliveryNoteData;
  tokensUsed?: number;
  processingTimeMs: number;
}

const TOKEN_KEYS = {
  accessToken: "stockControlAccessToken",
  refreshToken: "stockControlRefreshToken",
} as const;

class StockControlApiClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private rememberMe: boolean = true;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;

    if (typeof window !== "undefined") {
      this.accessToken =
        localStorage.getItem(TOKEN_KEYS.accessToken) ||
        sessionStorage.getItem(TOKEN_KEYS.accessToken);
      this.refreshToken =
        localStorage.getItem(TOKEN_KEYS.refreshToken) ||
        sessionStorage.getItem(TOKEN_KEYS.refreshToken);
    }
  }

  setRememberMe(remember: boolean) {
    this.rememberMe = remember;
  }

  private headers(): Record<string, string> {
    if (!this.accessToken && typeof window !== "undefined") {
      this.accessToken =
        localStorage.getItem(TOKEN_KEYS.accessToken) ||
        sessionStorage.getItem(TOKEN_KEYS.accessToken);
      this.refreshToken =
        localStorage.getItem(TOKEN_KEYS.refreshToken) ||
        sessionStorage.getItem(TOKEN_KEYS.refreshToken);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  private setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (typeof window !== "undefined") {
      const storage = this.rememberMe ? localStorage : sessionStorage;
      storage.setItem(TOKEN_KEYS.accessToken, accessToken);
      storage.setItem(TOKEN_KEYS.refreshToken, refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEYS.accessToken);
      localStorage.removeItem(TOKEN_KEYS.refreshToken);
      sessionStorage.removeItem(TOKEN_KEYS.accessToken);
      sessionStorage.removeItem(TOKEN_KEYS.refreshToken);
    }
  }

  isAuthenticated(): boolean {
    if (!this.accessToken && typeof window !== "undefined") {
      this.accessToken =
        localStorage.getItem(TOKEN_KEYS.accessToken) ||
        sessionStorage.getItem(TOKEN_KEYS.accessToken);
      this.refreshToken =
        localStorage.getItem(TOKEN_KEYS.refreshToken) ||
        sessionStorage.getItem(TOKEN_KEYS.refreshToken);
    }
    return !!this.accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        ...this.headers(),
        ...(options.headers as Record<string, string>),
      },
    };

    const response = await fetch(url, config);

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        config.headers = {
          ...this.headers(),
          ...(options.headers as Record<string, string>),
        };
        const retryResponse = await fetch(url, config);
        if (!retryResponse.ok) {
          const errorText = await retryResponse.text();
          throw new Error(`API Error (${retryResponse.status}): ${errorText}`);
        }
        return retryResponse.json();
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API Error (${response.status}): ${errorText}`;

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Use raw error text if not JSON
      }

      throw new Error(errorMessage);
    }

    const text = await response.text();
    if (!text || text.trim() === "") {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/stock-control/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const data = await response.json();
      this.accessToken = data.accessToken;
      if (typeof window !== "undefined") {
        if (localStorage.getItem(TOKEN_KEYS.refreshToken)) {
          localStorage.setItem(TOKEN_KEYS.accessToken, data.accessToken);
        } else {
          sessionStorage.setItem(TOKEN_KEYS.accessToken, data.accessToken);
        }
      }
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  async login(dto: StockControlLoginDto): Promise<StockControlLoginResponse> {
    const response = await this.request<StockControlLoginResponse>("/stock-control/auth/login", {
      method: "POST",
      body: JSON.stringify(dto),
    });

    this.setTokens(response.accessToken, response.refreshToken);
    return response;
  }

  async register(dto: {
    email: string;
    password: string;
    name: string;
    companyName?: string;
    invitationToken?: string;
  }): Promise<{ message: string; user: StockControlUser; isInvitedUser: boolean }> {
    return this.request("/stock-control/auth/register", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async verifyEmail(token: string): Promise<{
    message: string;
    userId: number;
    email: string;
    needsBranding: boolean;
  }> {
    const response = await this.request<{
      message: string;
      userId: number;
      email: string;
      needsBranding: boolean;
      accessToken?: string;
      refreshToken?: string;
    }>(`/stock-control/auth/verify-email?token=${encodeURIComponent(token)}`);

    if (response.accessToken && response.refreshToken) {
      this.setTokens(response.accessToken, response.refreshToken);
    }

    return response;
  }

  async updateCompanyDetails(details: CompanyDetailsUpdate): Promise<{ message: string }> {
    return this.request("/stock-control/auth/company-details", {
      method: "PATCH",
      body: JSON.stringify(details),
    });
  }

  async updateCompanyName(name: string): Promise<{ message: string }> {
    return this.updateCompanyDetails({ name });
  }

  async scrapeBranding(websiteUrl: string): Promise<ScrapedBrandingCandidates> {
    return this.request("/stock-control/auth/scrape-branding", {
      method: "POST",
      body: JSON.stringify({ websiteUrl }),
    });
  }

  async processBrandingSelection(data: {
    logoSourceUrl?: string;
    heroSourceUrl?: string;
    scrapedPrimaryColor?: string;
  }): Promise<ProcessedBrandingResult> {
    return this.request("/stock-control/auth/process-branding-selection", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  proxyImageUrl(url: string): string {
    return `${this.baseURL}/stock-control/auth/proxy-image?url=${encodeURIComponent(url)}`;
  }

  authHeaders(): Record<string, string> {
    return this.headers();
  }

  async setBranding(data: {
    brandingType: string;
    websiteUrl?: string;
    brandingAuthorized?: boolean;
    primaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    heroImageUrl?: string;
  }): Promise<{ message: string }> {
    return this.request("/stock-control/auth/set-branding", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request("/stock-control/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return this.request("/stock-control/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    return this.request("/stock-control/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request("/stock-control/auth/logout", { method: "POST" });
    } finally {
      this.clearTokens();
    }
  }

  async currentUser(): Promise<StockControlUserProfile> {
    return this.request<StockControlUserProfile>("/stock-control/auth/me");
  }

  async teamMembers(): Promise<StockControlTeamMember[]> {
    return this.request("/stock-control/auth/team");
  }

  async updateMemberRole(userId: number, role: string): Promise<{ message: string }> {
    return this.request(`/stock-control/auth/team/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  }

  async sendAppLink(userId: number): Promise<{ message: string }> {
    return this.request(`/stock-control/auth/team/${userId}/send-app-link`, {
      method: "POST",
    });
  }

  async departments(): Promise<StockControlDepartment[]> {
    return this.request("/stock-control/auth/departments");
  }

  async createDepartment(name: string, displayOrder?: number): Promise<StockControlDepartment> {
    return this.request("/stock-control/auth/departments", {
      method: "POST",
      body: JSON.stringify({ name, displayOrder }),
    });
  }

  async updateDepartment(
    id: number,
    data: { name?: string; displayOrder?: number | null; active?: boolean },
  ): Promise<StockControlDepartment> {
    return this.request(`/stock-control/auth/departments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteDepartment(id: number): Promise<void> {
    return this.request(`/stock-control/auth/departments/${id}`, { method: "DELETE" });
  }

  async locations(): Promise<StockControlLocation[]> {
    return this.request("/stock-control/auth/locations");
  }

  async createLocation(
    name: string,
    description?: string,
    displayOrder?: number,
  ): Promise<StockControlLocation> {
    return this.request("/stock-control/auth/locations", {
      method: "POST",
      body: JSON.stringify({ name, description, displayOrder }),
    });
  }

  async updateLocation(
    id: number,
    data: {
      name?: string;
      description?: string | null;
      displayOrder?: number | null;
      active?: boolean;
    },
  ): Promise<StockControlLocation> {
    return this.request(`/stock-control/auth/locations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteLocation(id: number): Promise<void> {
    return this.request(`/stock-control/auth/locations/${id}`, { method: "DELETE" });
  }

  async companyInvitations(): Promise<StockControlInvitation[]> {
    return this.request("/stock-control/invitations");
  }

  async createInvitation(email: string, role: string): Promise<StockControlInvitation> {
    return this.request("/stock-control/invitations", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
  }

  async cancelInvitation(id: number): Promise<{ message: string }> {
    return this.request(`/stock-control/invitations/${id}`, { method: "DELETE" });
  }

  async resendInvitation(id: number): Promise<StockControlInvitation> {
    return this.request(`/stock-control/invitations/${id}/resend`, { method: "POST" });
  }

  async validateInvitation(token: string): Promise<InvitationValidation> {
    return this.request(`/stock-control/invitations/validate/${encodeURIComponent(token)}`);
  }

  async stockItems(params?: {
    category?: string;
    belowMinStock?: string;
    search?: string;
    page?: string;
    limit?: string;
  }): Promise<{ items: StockItem[]; total: number }> {
    const query = params
      ? "?" +
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
          .join("&")
      : "";
    return this.request(`/stock-control/inventory${query}`);
  }

  async stockItemById(id: number): Promise<StockItem> {
    return this.request(`/stock-control/inventory/${id}`);
  }

  async createStockItem(data: Partial<StockItem>): Promise<StockItem> {
    return this.request("/stock-control/inventory", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateStockItem(id: number, data: Partial<StockItem>): Promise<StockItem> {
    return this.request(`/stock-control/inventory/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteStockItem(id: number): Promise<void> {
    return this.request(`/stock-control/inventory/${id}`, { method: "DELETE" });
  }

  async uploadStockItemPhoto(id: number, file: File): Promise<StockItem> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${this.baseURL}/stock-control/inventory/${id}/photo`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    return response.json();
  }

  async identifyFromPhoto(
    file: File,
    context?: string,
  ): Promise<{
    identifiedItems: {
      name: string;
      category: string;
      description: string;
      confidence: number;
      suggestedSku: string;
    }[];
    matchingStockItems: {
      id: number;
      sku: string;
      name: string;
      category: string | null;
      similarity: number;
    }[];
    rawAnalysis: string;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    if (context) {
      formData.append("context", context);
    }

    const url = `${this.baseURL}/stock-control/inventory/identify-photo`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Identification failed: ${errorText}`);
    }

    return response.json();
  }

  async lowStockAlerts(): Promise<StockItem[]> {
    return this.request("/stock-control/inventory/low-stock");
  }

  async categories(): Promise<string[]> {
    return this.request("/stock-control/inventory/categories");
  }

  async stockItemsGrouped(
    search?: string,
    locationId?: number,
  ): Promise<{ category: string; items: StockItem[] }[]> {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (locationId) params.append("locationId", String(locationId));
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/stock-control/inventory/grouped${query}`);
  }

  async jobCards(status?: string): Promise<JobCard[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request(`/stock-control/job-cards${query}`);
  }

  async jobCardById(id: number): Promise<JobCard> {
    return this.request(`/stock-control/job-cards/${id}`);
  }

  async createJobCard(data: Partial<JobCard>): Promise<JobCard> {
    return this.request("/stock-control/job-cards", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateJobCard(id: number, data: Partial<JobCard>): Promise<JobCard> {
    return this.request(`/stock-control/job-cards/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteJobCard(id: number): Promise<void> {
    return this.request(`/stock-control/job-cards/${id}`, { method: "DELETE" });
  }

  async allocateStock(
    jobCardId: number,
    data: {
      stockItemId: number;
      quantityUsed: number;
      photoUrl?: string;
      notes?: string;
      staffMemberId?: number;
    },
  ): Promise<StockAllocation> {
    return this.request(`/stock-control/job-cards/${jobCardId}/allocate`, {
      method: "POST",
      body: JSON.stringify({ ...data, jobCardId }),
    });
  }

  async jobCardAllocations(jobCardId: number): Promise<StockAllocation[]> {
    return this.request(`/stock-control/job-cards/${jobCardId}/allocations`);
  }

  async jobCardCoatingAnalysis(jobCardId: number): Promise<CoatingAnalysis | null> {
    const result = await this.request<CoatingAnalysis | Record<string, never>>(
      `/stock-control/job-cards/${jobCardId}/coating-analysis`,
    );
    return result && "id" in result ? (result as CoatingAnalysis) : null;
  }

  async updateCoatingSurfaceArea(
    jobCardId: number,
    extM2: number,
    intM2: number,
  ): Promise<CoatingAnalysis> {
    return this.request(`/stock-control/job-cards/${jobCardId}/coating-analysis/surface-area`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extM2, intM2 }),
    });
  }

  async triggerCoatingAnalysis(jobCardId: number): Promise<CoatingAnalysis> {
    return this.request(`/stock-control/job-cards/${jobCardId}/coating-analysis`, {
      method: "POST",
    });
  }

  async acceptCoatingAnalysis(jobCardId: number): Promise<CoatingAnalysis> {
    return this.request(`/stock-control/job-cards/${jobCardId}/coating-analysis/accept`, {
      method: "PATCH",
    });
  }

  async unverifiedCoatingProducts(jobCardId: number): Promise<UnverifiedProduct[]> {
    return this.request(`/stock-control/job-cards/${jobCardId}/coating-analysis/unverified`);
  }

  async uploadCoatingTds(jobCardId: number, file: File): Promise<CoatingAnalysis> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${this.baseURL}/stock-control/job-cards/${jobCardId}/coating-analysis/verify-tds`;
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.accessToken}` },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TDS upload failed: ${errorText}`);
    }

    return response.json();
  }

  async rubberStockOptions(jobCardId: number): Promise<RubberStockOptionsResponse> {
    return this.request(`/stock-control/job-cards/${jobCardId}/rubber-stock-options`);
  }

  async updateRubberPlan(jobCardId: number, override: RubberPlanOverride): Promise<JobCard> {
    return this.request(`/stock-control/job-cards/${jobCardId}/rubber-plan`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(override),
    });
  }

  async markOffcutAsWastage(
    jobCardId: number,
    data: {
      widthMm: number;
      lengthMm: number;
      thicknessMm: number;
      color: string | null;
      specificGravity: number;
    },
  ): Promise<{ weightKg: number; stockItemId: number }> {
    return this.request(`/stock-control/job-cards/${jobCardId}/rubber-wastage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async rubberDimensionSuggestions(params: {
    itemType?: string | null;
    nbMm?: number | null;
    schedule?: string | null;
    pipeLengthMm: number;
    flangeConfig?: string | null;
  }): Promise<RubberDimensionOverride[]> {
    const searchParams = new URLSearchParams();
    if (params.itemType) searchParams.set("itemType", params.itemType);
    if (params.nbMm) searchParams.set("nbMm", String(params.nbMm));
    if (params.schedule) searchParams.set("schedule", params.schedule);
    searchParams.set("pipeLengthMm", String(params.pipeLengthMm));
    if (params.flangeConfig) searchParams.set("flangeConfig", params.flangeConfig);
    return this.request(
      `/stock-control/job-cards/rubber-dimension-suggestions?${searchParams.toString()}`,
    );
  }

  async uploadAllocationPhoto(
    jobCardId: number,
    allocationId: number,
    file: File,
  ): Promise<StockAllocation> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${this.baseURL}/stock-control/job-cards/${jobCardId}/allocations/${allocationId}/photo`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    return response.json();
  }

  async pendingAllocations(): Promise<StockAllocation[]> {
    return this.request("/stock-control/job-cards/allocations/pending");
  }

  async approveOverAllocation(jobCardId: number, allocationId: number): Promise<StockAllocation> {
    return this.request(
      `/stock-control/job-cards/${jobCardId}/allocations/${allocationId}/approve`,
      { method: "POST" },
    );
  }

  async rejectOverAllocation(
    jobCardId: number,
    allocationId: number,
    reason: string,
  ): Promise<StockAllocation> {
    return this.request(
      `/stock-control/job-cards/${jobCardId}/allocations/${allocationId}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    );
  }

  async deliveryNotes(): Promise<DeliveryNote[]> {
    return this.request("/stock-control/deliveries");
  }

  async deliveryNoteById(id: number): Promise<DeliveryNote> {
    return this.request(`/stock-control/deliveries/${id}`);
  }

  async createDeliveryNote(data: {
    deliveryNumber: string;
    supplierName: string;
    receivedDate?: string;
    notes?: string;
    receivedBy?: string;
    items: { stockItemId: number; quantityReceived: number }[];
  }): Promise<DeliveryNote> {
    return this.request("/stock-control/deliveries", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteDeliveryNote(id: number): Promise<void> {
    return this.request(`/stock-control/deliveries/${id}`, { method: "DELETE" });
  }

  async uploadDeliveryPhoto(id: number, file: File): Promise<DeliveryNote> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${this.baseURL}/stock-control/deliveries/${id}/photo`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    return response.json();
  }

  async linkDeliveryNoteToStock(id: number): Promise<DeliveryNote> {
    return this.request(`/stock-control/deliveries/${id}/link-to-stock`, { method: "POST" });
  }

  async stockMovements(params?: {
    stockItemId?: number;
    movementType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<StockMovement[]> {
    const query = params
      ? "?" +
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";
    return this.request(`/stock-control/movements${query}`);
  }

  async createManualAdjustment(data: {
    stockItemId: number;
    movementType: string;
    quantity: number;
    notes?: string;
  }): Promise<StockMovement> {
    return this.request("/stock-control/movements/adjustment", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async uploadImportFile(file: File): Promise<ImportUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${this.baseURL}/stock-control/import/upload`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Import failed: ${errorText}`);
    }

    return response.json();
  }

  async confirmImport(
    rows: unknown[],
    isStockTake: boolean = false,
    stockTakeDate: string | null = null,
  ): Promise<ImportResult> {
    return this.request("/stock-control/import/confirm", {
      method: "POST",
      body: JSON.stringify({ rows, isStockTake, stockTakeDate }),
    });
  }

  async clearQrPrintFlag(ids: number[]): Promise<{ cleared: number }> {
    return this.request("/stock-control/inventory/clear-qr-print", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  }

  async uploadJobCardImportFile(file: File): Promise<JobCardImportUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${this.baseURL}/stock-control/job-card-import/upload`;
    const { Authorization } = this.headers();
    let response = await fetch(url, {
      method: "POST",
      headers: { ...(Authorization ? { Authorization } : {}) },
      body: formData,
    });

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        const { Authorization: newAuth } = this.headers();
        response = await fetch(url, {
          method: "POST",
          headers: { ...(newAuth ? { Authorization: newAuth } : {}) },
          body: formData,
        });
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Import failed: ${errorText}`);
    }

    return response.json();
  }

  async uploadDrawingFiles(files: File[]): Promise<JobCardImportUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const url = `${this.baseURL}/stock-control/job-card-import/upload-drawings`;
    const { Authorization } = this.headers();
    let response = await fetch(url, {
      method: "POST",
      headers: { ...(Authorization ? { Authorization } : {}) },
      body: formData,
    });

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        const { Authorization: newAuth } = this.headers();
        response = await fetch(url, {
          method: "POST",
          headers: { ...(newAuth ? { Authorization: newAuth } : {}) },
          body: formData,
        });
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Drawing import failed: ${errorText}`);
    }

    return response.json();
  }

  async jobCardImportMapping(): Promise<JobCardImportMapping | null> {
    return this.request("/stock-control/job-card-import/mapping");
  }

  async saveJobCardImportMapping(
    mappingConfig: ImportMappingConfig,
  ): Promise<JobCardImportMapping> {
    return this.request("/stock-control/job-card-import/mapping", {
      method: "POST",
      body: JSON.stringify({ mappingConfig }),
    });
  }

  async calculateM2(descriptions: string[]): Promise<M2Result[]> {
    return this.request("/stock-control/job-card-import/calculate-m2", {
      method: "POST",
      body: JSON.stringify({ descriptions }),
    });
  }

  async autoDetectJobCardMapping(grid: string[][]): Promise<ImportMappingConfig> {
    return this.request("/stock-control/job-card-import/auto-detect", {
      method: "POST",
      body: JSON.stringify({ grid }),
    });
  }

  async downloadBlob(endpoint: string, filename: string): Promise<void> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      headers: { ...this.headers() },
    });

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        const retryResponse = await fetch(url, {
          headers: { ...this.headers() },
        });
        if (!retryResponse.ok) {
          throw new Error(`Download failed (${retryResponse.status})`);
        }
        const blob = await retryResponse.blob();
        this.triggerDownload(blob, filename);
        return;
      }
    }

    if (!response.ok) {
      throw new Error(`Download failed (${response.status})`);
    }

    const blob = await response.blob();
    this.triggerDownload(blob, filename);
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  }

  async downloadStockItemQrPdf(id: number): Promise<void> {
    return this.downloadBlob(`/stock-control/inventory/${id}/qr/pdf`, `stock-${id}-label.pdf`);
  }

  async downloadJobCardQrPdf(id: number): Promise<void> {
    return this.downloadBlob(`/stock-control/workflow/job-cards/${id}/print`, `job-card-${id}.pdf`);
  }

  async confirmJobCardImport(rows: JobCardImportRow[]): Promise<JobCardImportResult> {
    return this.request("/stock-control/job-card-import/confirm", {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
  }

  async staffMembers(params?: { search?: string; active?: string }): Promise<StaffMember[]> {
    const query = params
      ? "?" +
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
          .join("&")
      : "";
    return this.request(`/stock-control/staff${query}`);
  }

  async staffMemberById(id: number): Promise<StaffMember> {
    return this.request(`/stock-control/staff/${id}`);
  }

  async createStaffMember(data: Partial<StaffMember>): Promise<StaffMember> {
    return this.request("/stock-control/staff", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateStaffMember(id: number, data: Partial<StaffMember>): Promise<StaffMember> {
    return this.request(`/stock-control/staff/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteStaffMember(id: number): Promise<StaffMember> {
    return this.request(`/stock-control/staff/${id}`, { method: "DELETE" });
  }

  async uploadStaffPhoto(id: number, file: File): Promise<StaffMember> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${this.baseURL}/stock-control/staff/${id}/photo`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    return response.json();
  }

  async downloadStaffIdCardPdf(staffId: number): Promise<void> {
    const headers = this.headers();
    const response = await fetch(`${API_BASE_URL}/stock-control/staff/${staffId}/qr/pdf`, {
      headers: { Authorization: headers.Authorization ?? "" },
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ?? `Failed to download staff ID card PDF: ${response.status}`,
        );
      }
      throw new Error(`Failed to download staff ID card PDF: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  async downloadBatchStaffIdCards(ids?: number[]): Promise<void> {
    const headers = this.headers();
    const response = await fetch(`${API_BASE_URL}/stock-control/staff/id-cards/pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: headers.Authorization ?? "",
      },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ?? `Failed to download batch ID cards: ${response.status}`,
        );
      }
      throw new Error(`Failed to download batch ID cards: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  async dashboardStats(): Promise<DashboardStats> {
    return this.request("/stock-control/dashboard/stats");
  }

  async sohSummary(): Promise<SohSummary[]> {
    return this.request("/stock-control/dashboard/soh-summary");
  }

  async sohByLocation(): Promise<SohByLocation[]> {
    return this.request("/stock-control/dashboard/soh-by-location");
  }

  async recentActivity(): Promise<RecentActivity[]> {
    return this.request("/stock-control/dashboard/recent-activity");
  }

  async reorderAlerts(): Promise<StockItem[]> {
    return this.request("/stock-control/dashboard/reorder-alerts");
  }

  async cpoSummary(): Promise<CpoSummary> {
    return this.request("/stock-control/dashboard/cpo-summary");
  }

  async roleDashboardSummary(role?: string): Promise<RoleDashboardSummary> {
    const query = role ? `?role=${role}` : "";
    return this.request(`/stock-control/dashboard/role-summary${query}`);
  }

  async dashboardPreferences(): Promise<DashboardPreferences | null> {
    return this.request("/stock-control/dashboard/preferences");
  }

  async updateDashboardPreferences(data: {
    pinnedWidgets?: string[];
    hiddenWidgets?: string[];
    viewOverride?: string | null;
  }): Promise<DashboardPreferences> {
    return this.request("/stock-control/dashboard/preferences", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async workflowLaneCounts(): Promise<WorkflowLaneCounts> {
    return this.request("/stock-control/dashboard/workflow-lanes");
  }

  async costByJob(): Promise<CostByJob[]> {
    return this.request("/stock-control/reports/cost-by-job");
  }

  async stockValuation(): Promise<StockValuation> {
    return this.request("/stock-control/reports/stock-valuation");
  }

  async movementHistory(params?: {
    startDate?: string;
    endDate?: string;
    movementType?: string;
    stockItemId?: number;
  }): Promise<StockMovement[]> {
    const query = params
      ? "?" +
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";
    return this.request(`/stock-control/reports/movement-history${query}`);
  }

  async staffStockReport(filters?: StaffStockFilters): Promise<StaffStockReportResult> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    if (filters?.staffMemberId) params.append("staffMemberId", String(filters.staffMemberId));
    if (filters?.departmentId) params.append("departmentId", String(filters.departmentId));
    if (filters?.stockItemId) params.append("stockItemId", String(filters.stockItemId));
    if (filters?.anomalyThreshold)
      params.append("anomalyThreshold", String(filters.anomalyThreshold));
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/stock-control/reports/staff-stock${query}`);
  }

  async staffStockDetail(
    staffMemberId: number,
    filters?: { startDate?: string; endDate?: string },
  ): Promise<StockIssuance[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/stock-control/reports/staff-stock/${staffMemberId}/detail${query}`);
  }

  async requisitions(): Promise<Requisition[]> {
    return this.request("/stock-control/requisitions");
  }

  async requisitionById(id: number): Promise<Requisition> {
    return this.request(`/stock-control/requisitions/${id}`);
  }

  async updateRequisitionItem(
    reqId: number,
    itemId: number,
    data: { packSizeLitres?: number; reorderQty?: number | null; reqNumber?: string | null },
  ): Promise<RequisitionItem> {
    return this.request(`/stock-control/requisitions/${reqId}/items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async downloadBatchLabelsPdf(body: {
    ids?: number[];
    search?: string;
    category?: string;
  }): Promise<void> {
    const headers = this.headers();
    const response = await fetch(`${API_BASE_URL}/stock-control/inventory/labels/pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: headers.Authorization ?? "",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to download labels PDF: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "shelf-labels.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async uploadWorkflowDocument(
    jobCardId: number,
    file: File,
    documentType: string,
  ): Promise<JobCardDocument> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);

    const url = `${this.baseURL}/stock-control/workflow/job-cards/${jobCardId}/documents`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    return response.json();
  }

  async workflowDocuments(jobCardId: number): Promise<JobCardDocument[]> {
    return this.request(`/stock-control/workflow/job-cards/${jobCardId}/documents`);
  }

  async workflowStatus(jobCardId: number): Promise<WorkflowStatus> {
    return this.request(`/stock-control/workflow/job-cards/${jobCardId}/status`);
  }

  async approvalHistory(jobCardId: number): Promise<JobCardApproval[]> {
    return this.request(`/stock-control/workflow/job-cards/${jobCardId}/history`);
  }

  async approveWorkflowStep(
    jobCardId: number,
    data: { signatureDataUrl?: string; comments?: string },
  ): Promise<JobCard> {
    return this.request(`/stock-control/workflow/job-cards/${jobCardId}/approve`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async rejectWorkflowStep(jobCardId: number, reason: string): Promise<JobCard> {
    return this.request(`/stock-control/workflow/job-cards/${jobCardId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async pendingApprovals(): Promise<JobCard[]> {
    return this.request("/stock-control/workflow/pending");
  }

  async canApproveJobCard(jobCardId: number): Promise<{ canApprove: boolean }> {
    return this.request(`/stock-control/workflow/job-cards/${jobCardId}/can-approve`);
  }

  async workflowNotifications(limit?: number): Promise<WorkflowNotification[]> {
    const query = limit ? `?limit=${limit}` : "";
    return this.request(`/stock-control/workflow/notifications${query}`);
  }

  async unreadNotifications(): Promise<WorkflowNotification[]> {
    return this.request("/stock-control/workflow/notifications/unread");
  }

  async notificationCount(): Promise<{ count: number }> {
    return this.request("/stock-control/workflow/notifications/count");
  }

  async markNotificationAsRead(notificationId: number): Promise<{ success: boolean }> {
    return this.request(`/stock-control/workflow/notifications/${notificationId}/read`, {
      method: "PUT",
    });
  }

  async markAllNotificationsAsRead(): Promise<{ success: boolean }> {
    return this.request("/stock-control/workflow/notifications/read-all", {
      method: "PUT",
    });
  }

  async startDispatchSession(
    jobCardId: number,
  ): Promise<{ jobCard: JobCard; progress: DispatchProgress }> {
    return this.request(`/stock-control/workflow/job-cards/${jobCardId}/dispatch/start`);
  }

  async dispatchProgress(jobCardId: number): Promise<DispatchProgress> {
    return this.request(`/stock-control/workflow/job-cards/${jobCardId}/dispatch/progress`);
  }

  async dispatchHistory(jobCardId: number): Promise<DispatchScan[]> {
    return this.request(`/stock-control/workflow/job-cards/${jobCardId}/dispatch/history`);
  }

  async scanDispatchItem(
    jobCardId: number,
    stockItemId: number,
    quantity: number,
    notes?: string,
  ): Promise<DispatchScan> {
    return this.request(`/stock-control/workflow/job-cards/${jobCardId}/dispatch/scan`, {
      method: "POST",
      body: JSON.stringify({ stockItemId, quantity, notes }),
    });
  }

  async completeDispatch(jobCardId: number): Promise<JobCard> {
    return this.request(`/stock-control/workflow/job-cards/${jobCardId}/dispatch/complete`, {
      method: "POST",
    });
  }

  async scanQrCode(qrToken: string): Promise<{ type: "job_card" | "stock_item"; id: number }> {
    return this.request("/stock-control/workflow/dispatch/scan-qr", {
      method: "POST",
      body: JSON.stringify({ qrToken }),
    });
  }

  async downloadSignedJobCardPdf(jobCardId: number): Promise<void> {
    const headers = this.headers();
    const cacheBuster = Date.now();
    const response = await fetch(
      `${API_BASE_URL}/stock-control/workflow/job-cards/${jobCardId}/print?_t=${cacheBuster}`,
      { headers: { Authorization: headers.Authorization ?? "" }, cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error(`Failed to download signed job card PDF: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `job-card-signed-${jobCardId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async mySignature(): Promise<StaffSignature> {
    return this.request("/stock-control/signatures");
  }

  async uploadSignature(signatureDataUrl: string): Promise<StaffSignature> {
    return this.request("/stock-control/signatures", {
      method: "POST",
      body: JSON.stringify({ signatureDataUrl }),
    });
  }

  async deleteSignature(): Promise<{ success: boolean }> {
    return this.request("/stock-control/signatures", { method: "DELETE" });
  }

  async uploadJobCardAmendment(jobCardId: number, file: File, notes?: string): Promise<JobCard> {
    const formData = new FormData();
    formData.append("file", file);
    if (notes) {
      formData.append("notes", notes);
    }

    const url = `${this.baseURL}/stock-control/job-cards/${jobCardId}/amendment`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Amendment upload failed: ${errorText}`);
    }

    return response.json();
  }

  async jobCardVersionHistory(jobCardId: number): Promise<JobCardVersion[]> {
    return this.request(`/stock-control/job-cards/${jobCardId}/versions`);
  }

  async jobCardVersionById(jobCardId: number, versionId: number): Promise<JobCardVersion> {
    return this.request(`/stock-control/job-cards/${jobCardId}/versions/${versionId}`);
  }

  async jobCardAttachments(jobCardId: number): Promise<JobCardAttachment[]> {
    return this.request(`/stock-control/job-cards/${jobCardId}/attachments`);
  }

  async uploadJobCardAttachment(
    jobCardId: number,
    file: File,
    notes?: string,
  ): Promise<JobCardAttachment> {
    const formData = new FormData();
    formData.append("file", file);
    if (notes) {
      formData.append("notes", notes);
    }

    const url = `${this.baseURL}/stock-control/job-cards/${jobCardId}/attachments`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Attachment upload failed: ${errorText}`);
    }

    return response.json();
  }

  async triggerDrawingExtraction(
    jobCardId: number,
    attachmentId: number,
  ): Promise<JobCardAttachment> {
    return this.request(
      `/stock-control/job-cards/${jobCardId}/attachments/${attachmentId}/extract`,
      {
        method: "POST",
      },
    );
  }

  async extractAllDrawings(jobCardId: number): Promise<Record<string, unknown>> {
    return this.request(`/stock-control/job-cards/${jobCardId}/extract-all`, {
      method: "POST",
    });
  }

  async deleteJobCardAttachment(jobCardId: number, attachmentId: number): Promise<void> {
    return this.request(`/stock-control/job-cards/${jobCardId}/attachments/${attachmentId}`, {
      method: "DELETE",
    });
  }

  async scanIssuanceQr(qrCode: string): Promise<IssuanceScanResult> {
    return this.request("/stock-control/issuance/scan-qr", {
      method: "POST",
      body: JSON.stringify({ qrCode }),
    });
  }

  async createIssuance(dto: CreateIssuanceDto): Promise<StockIssuance> {
    return this.request("/stock-control/issuance", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async createBatchIssuance(dto: BatchIssuanceDto): Promise<BatchIssuanceResult> {
    return this.request("/stock-control/issuance/batch", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async issuanceHistory(filters?: IssuanceFilters): Promise<StockIssuance[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    if (filters?.staffId) params.append("staffId", String(filters.staffId));
    if (filters?.stockItemId) params.append("stockItemId", String(filters.stockItemId));
    if (filters?.jobCardId) params.append("jobCardId", String(filters.jobCardId));
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/stock-control/issuance${query}`);
  }

  async issuanceById(id: number): Promise<StockIssuance> {
    return this.request(`/stock-control/issuance/${id}`);
  }

  async recentIssuances(): Promise<StockIssuance[]> {
    return this.request("/stock-control/issuance/recent");
  }

  async undoIssuance(id: number): Promise<StockIssuance> {
    return this.request(`/stock-control/issuance/${id}/undo`, { method: "POST" });
  }

  async updateLinkedStaff(linkedStaffId: number | null): Promise<{ linkedStaffId: number | null }> {
    return this.request("/stock-control/auth/me/linked-staff", {
      method: "PATCH",
      body: JSON.stringify({ linkedStaffId }),
    });
  }

  async workflowAssignments(): Promise<WorkflowStepAssignment[]> {
    return this.request("/stock-control/workflow/assignments");
  }

  async eligibleUsersForStep(step: string): Promise<EligibleUser[]> {
    return this.request(
      `/stock-control/workflow/assignments/${encodeURIComponent(step)}/eligible-users`,
    );
  }

  async updateWorkflowAssignments(
    step: string,
    userIds: number[],
    primaryUserId?: number,
  ): Promise<{ success: boolean }> {
    return this.request(`/stock-control/workflow/assignments/${encodeURIComponent(step)}`, {
      method: "PUT",
      body: JSON.stringify({ userIds, primaryUserId }),
    });
  }

  async notificationRecipients(): Promise<StepNotificationRecipients[]> {
    return this.request("/stock-control/workflow/notification-recipients");
  }

  async updateNotificationRecipients(
    step: string,
    emails: string[],
  ): Promise<{ success: boolean }> {
    return this.request(
      `/stock-control/workflow/notification-recipients/${encodeURIComponent(step)}`,
      {
        method: "PUT",
        body: JSON.stringify({ emails }),
      },
    );
  }

  async userLocationAssignments(): Promise<UserLocationSummary[]> {
    return this.request("/stock-control/workflow/user-locations");
  }

  async updateUserLocations(userId: number, locationIds: number[]): Promise<{ success: boolean }> {
    return this.request(`/stock-control/workflow/user-locations/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ locationIds }),
    });
  }

  async supplierInvoices(): Promise<SupplierInvoice[]> {
    return this.request("/stock-control/invoices");
  }

  async supplierInvoiceById(id: number): Promise<SupplierInvoice> {
    return this.request(`/stock-control/invoices/${id}`);
  }

  async createSupplierInvoice(dto: CreateInvoiceDto): Promise<SupplierInvoice> {
    return this.request("/stock-control/invoices", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async uploadInvoiceScan(id: number, file: File): Promise<SupplierInvoice> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${this.baseURL}/stock-control/invoices/${id}/scan`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    return response.json();
  }

  async reExtractInvoice(invoiceId: number): Promise<SupplierInvoice> {
    return this.request(`/stock-control/invoices/${invoiceId}/re-extract`, {
      method: "POST",
    });
  }

  async invoiceClarifications(invoiceId: number): Promise<InvoiceClarification[]> {
    return this.request(`/stock-control/invoices/${invoiceId}/clarifications`);
  }

  async submitInvoiceClarification(
    invoiceId: number,
    clarificationId: number,
    dto: SubmitClarificationDto,
  ): Promise<InvoiceClarification> {
    return this.request(`/stock-control/invoices/${invoiceId}/clarifications/${clarificationId}`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async skipInvoiceClarification(
    invoiceId: number,
    clarificationId: number,
  ): Promise<InvoiceClarification> {
    return this.request(
      `/stock-control/invoices/${invoiceId}/clarifications/${clarificationId}/skip`,
      { method: "POST" },
    );
  }

  async invoicePriceSummary(invoiceId: number): Promise<PriceChangeSummary> {
    return this.request(`/stock-control/invoices/${invoiceId}/price-summary`);
  }

  async approveInvoice(invoiceId: number): Promise<SupplierInvoice> {
    return this.request(`/stock-control/invoices/${invoiceId}/approve`, {
      method: "POST",
    });
  }

  async deleteInvoice(invoiceId: number): Promise<void> {
    return this.request(`/stock-control/invoices/${invoiceId}`, {
      method: "DELETE",
    });
  }

  async manualMatchInvoiceItem(
    invoiceId: number,
    itemId: number,
    stockItemId: number,
  ): Promise<SupplierInvoiceItem> {
    return this.request(`/stock-control/invoices/${invoiceId}/items/${itemId}/match`, {
      method: "POST",
      body: JSON.stringify({ stockItemId }),
    });
  }

  async deleteSupplierInvoice(id: number): Promise<void> {
    return this.request(`/stock-control/invoices/${id}`, { method: "DELETE" });
  }

  async unlinkedInvoices(): Promise<SupplierInvoice[]> {
    return this.request("/stock-control/invoices/unlinked");
  }

  async suggestedDeliveryNotes(invoiceId: number): Promise<SuggestedDeliveryNote[]> {
    return this.request(`/stock-control/invoices/${invoiceId}/suggested-delivery-notes`);
  }

  async linkInvoiceToDeliveryNote(
    invoiceId: number,
    deliveryNoteId: number,
  ): Promise<SupplierInvoice> {
    return this.request(`/stock-control/invoices/${invoiceId}/link-delivery-note`, {
      method: "POST",
      body: JSON.stringify({ deliveryNoteId }),
    });
  }

  async sageExportPreview(params: {
    dateFrom?: string;
    dateTo?: string;
    excludeExported?: boolean;
  }): Promise<{ invoiceCount: number; lineItemCount: number; totalAmount: number }> {
    const query = new URLSearchParams();
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);
    if (params.excludeExported !== undefined)
      query.set("excludeExported", String(params.excludeExported));
    return this.request(`/stock-control/invoices/export/sage-preview?${query.toString()}`);
  }

  async sageExportCsv(params: {
    dateFrom?: string;
    dateTo?: string;
    excludeExported?: boolean;
  }): Promise<Blob> {
    const query = new URLSearchParams();
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);
    if (params.excludeExported !== undefined)
      query.set("excludeExported", String(params.excludeExported));
    const url = `${this.baseURL}/stock-control/invoices/export/sage-csv?${query.toString()}`;
    const response = await fetch(url, { headers: this.headers() });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Export failed: ${errorText}`);
    }
    return response.blob();
  }

  async stockItemPriceHistory(stockItemId: number, limit?: number): Promise<StockPriceHistory[]> {
    const query = limit ? `?limit=${limit}` : "";
    return this.request(`/stock-control/inventory/${stockItemId}/price-history${query}`);
  }

  async triggerDeliveryExtraction(deliveryNoteId: number): Promise<DeliveryNote> {
    return this.request(`/stock-control/deliveries/${deliveryNoteId}/extract`, {
      method: "POST",
    });
  }

  async deliveryExtractionStatus(
    deliveryNoteId: number,
  ): Promise<{ status: string | null; extractedData: Record<string, unknown> | null }> {
    return this.request(`/stock-control/deliveries/${deliveryNoteId}/extraction`);
  }

  async analyzeDeliveryNotePhoto(file: File): Promise<AnalyzedDeliveryNoteResult> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${this.baseURL}/stock-control/deliveries/analyze`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Analysis failed: ${errorText}`);
    }

    return response.json();
  }

  async acceptAnalyzedDeliveryNote(
    file: File,
    analyzedData: AnalyzedDeliveryNoteData,
  ): Promise<DeliveryNote> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("analyzedData", JSON.stringify(analyzedData));

    const url = `${this.baseURL}/stock-control/deliveries/accept-analyzed`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create delivery note: ${errorText}`);
    }

    return response.json();
  }

  async acceptAnalyzedInvoice(
    file: File,
    analyzedData: AnalyzedDeliveryNoteData,
  ): Promise<SupplierInvoice> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("analyzedData", JSON.stringify(analyzedData));
    formData.append("documentType", "SUPPLIER_INVOICE");

    const url = `${this.baseURL}/stock-control/deliveries/accept-analyzed`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create invoice: ${errorText}`);
    }

    return response.json();
  }

  async suppliers(): Promise<StockControlSupplierDto[]> {
    return this.request("/stock-control/suppliers");
  }

  async createSupplier(data: {
    name: string;
    vatNumber?: string;
    registrationNumber?: string;
    address?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
  }): Promise<StockControlSupplierDto> {
    return this.request("/stock-control/suppliers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async pushVapidKey(): Promise<{ vapidPublicKey: string | null }> {
    return this.request("/stock-control/workflow/push/vapid-key");
  }

  async subscribePush(subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }): Promise<{ success: boolean }> {
    return this.request("/stock-control/workflow/push/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription),
    });
  }

  async unsubscribePush(endpoint: string): Promise<{ success: boolean }> {
    return this.request("/stock-control/workflow/push/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint }),
    });
  }

  async smtpConfig(): Promise<SmtpConfigResponse> {
    return this.request("/stock-control/auth/smtp-config");
  }

  async updateSmtpConfig(dto: SmtpConfigUpdate): Promise<{ message: string }> {
    return this.request("/stock-control/auth/smtp-config", {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  }

  async testSmtpConfig(): Promise<{ message: string }> {
    return this.request("/stock-control/auth/smtp-config/test", {
      method: "POST",
    });
  }

  async navRbacConfig(): Promise<Record<string, string[]>> {
    return this.request("/stock-control/auth/rbac-config");
  }

  async updateNavRbacConfig(config: Record<string, string[]>): Promise<Record<string, string[]>> {
    return this.request("/stock-control/auth/rbac-config", {
      method: "PATCH",
      body: JSON.stringify({ config }),
    });
  }
  async cpos(status?: string): Promise<CustomerPurchaseOrder[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request(`/stock-control/cpos${query}`);
  }

  async cpoById(id: number): Promise<CustomerPurchaseOrder> {
    return this.request(`/stock-control/cpos/${id}`);
  }

  async uploadCpoImportFile(file: File): Promise<JobCardImportUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${this.baseURL}/stock-control/cpos/upload`;
    const { Authorization } = this.headers();
    const response = await fetch(url, {
      method: "POST",
      headers: { ...(Authorization ? { Authorization } : {}) },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Upload failed: ${response.status}`);
    }

    return response.json();
  }

  async confirmCpoImport(rows: JobCardImportRow[]): Promise<CpoImportResult> {
    return this.request("/stock-control/cpos/confirm", {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
  }

  async updateCpoStatus(id: number, status: string): Promise<CustomerPurchaseOrder> {
    return this.request(`/stock-control/cpos/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  async deleteCpo(id: number): Promise<void> {
    return this.request(`/stock-control/cpos/${id}`, { method: "DELETE" });
  }

  async cpoCalloffRecords(cpoId: number): Promise<CpoCalloffRecord[]> {
    return this.request(`/stock-control/cpos/${cpoId}/calloff-records`);
  }

  async updateCalloffRecordStatus(recordId: number, status: string): Promise<CpoCalloffRecord> {
    return this.request(`/stock-control/cpos/calloff-records/${recordId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  async cpoFulfillmentReport(): Promise<CpoFulfillmentReportItem[]> {
    return this.request("/stock-control/cpos/reports/fulfillment");
  }

  async cpoCalloffBreakdown(): Promise<CpoCalloffBreakdown> {
    return this.request("/stock-control/cpos/reports/calloff-breakdown");
  }

  async cpoOverdueInvoices(): Promise<CpoOverdueInvoiceItem[]> {
    return this.request("/stock-control/cpos/reports/overdue-invoices");
  }

  async cpoExportCsv(): Promise<Blob> {
    const headers = this.authHeaders();
    const response = await fetch(`${this.baseURL}/stock-control/cpos/reports/export`, { headers });
    if (!response.ok) {
      throw new Error("Failed to export CSV");
    }
    return response.blob();
  }

  async globalSearch(query: string, limit: number = 20): Promise<GlobalSearchResponse> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    return this.request(`/stock-control/search?${params.toString()}`);
  }

  async glossaryTerms(): Promise<GlossaryTerm[]> {
    return this.request("/stock-control/glossary");
  }

  async upsertGlossaryTerm(
    abbreviation: string,
    body: { term: string; definition: string; category?: string | null },
  ): Promise<GlossaryTerm> {
    return this.request(`/stock-control/glossary/${encodeURIComponent(abbreviation)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async deleteGlossaryTerm(abbreviation: string): Promise<void> {
    return this.request(`/stock-control/glossary/${encodeURIComponent(abbreviation)}`, {
      method: "DELETE",
    });
  }

  async resetGlossary(): Promise<void> {
    return this.request("/stock-control/glossary", { method: "DELETE" });
  }

  async updateTooltipPreference(hideTooltips: boolean): Promise<{ hideTooltips: boolean }> {
    return this.request("/stock-control/auth/me/tooltip-preference", {
      method: "PATCH",
      body: JSON.stringify({ hideTooltips }),
    });
  }

  async uploadCertificate(
    file: File,
    data: {
      supplierId: number;
      stockItemId?: number | null;
      jobCardId?: number | null;
      certificateType: string;
      batchNumber: string;
      description?: string | null;
      expiryDate?: string | null;
    },
  ): Promise<SupplierCertificate> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("supplierId", String(data.supplierId));
    formData.append("certificateType", data.certificateType);
    formData.append("batchNumber", data.batchNumber);
    if (data.stockItemId) formData.append("stockItemId", String(data.stockItemId));
    if (data.jobCardId) formData.append("jobCardId", String(data.jobCardId));
    if (data.description) formData.append("description", data.description);
    if (data.expiryDate) formData.append("expiryDate", data.expiryDate);

    const url = `${this.baseURL}/stock-control/certificates`;
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.accessToken}` },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Upload failed");
      throw new Error(errorText);
    }

    return response.json();
  }

  async certificates(filters?: {
    supplierId?: number;
    stockItemId?: number;
    jobCardId?: number;
    batchNumber?: string;
    certificateType?: string;
  }): Promise<SupplierCertificate[]> {
    const params = new URLSearchParams();
    if (filters?.supplierId) params.set("supplierId", String(filters.supplierId));
    if (filters?.stockItemId) params.set("stockItemId", String(filters.stockItemId));
    if (filters?.jobCardId) params.set("jobCardId", String(filters.jobCardId));
    if (filters?.batchNumber) params.set("batchNumber", filters.batchNumber);
    if (filters?.certificateType) params.set("certificateType", filters.certificateType);

    const qs = params.toString();
    return this.request(`/stock-control/certificates${qs ? `?${qs}` : ""}`);
  }

  async certificateById(id: number): Promise<SupplierCertificate> {
    return this.request(`/stock-control/certificates/${id}`);
  }

  async deleteCertificate(id: number): Promise<void> {
    return this.request(`/stock-control/certificates/${id}`, { method: "DELETE" });
  }

  async certificatesByBatchNumber(batchNumber: string): Promise<SupplierCertificate[]> {
    return this.request(`/stock-control/certificates/batch/${encodeURIComponent(batchNumber)}`);
  }

  async certificatesForJobCard(jobCardId: number): Promise<SupplierCertificate[]> {
    return this.request(`/stock-control/certificates/job-card/${jobCardId}`);
  }

  async batchRecordsForJobCard(jobCardId: number): Promise<IssuanceBatchRecord[]> {
    return this.request(`/stock-control/certificates/job-card/${jobCardId}/batch-records`);
  }

  async dataBookStatus(jobCardId: number): Promise<DataBookStatus> {
    return this.request(`/stock-control/certificates/job-card/${jobCardId}/data-book/status`);
  }

  async compileDataBook(jobCardId: number): Promise<{ id: number; certificateCount: number }> {
    return this.request(`/stock-control/certificates/job-card/${jobCardId}/data-book`, {
      method: "POST",
    });
  }

  async downloadDataBook(jobCardId: number): Promise<void> {
    const url = `${this.baseURL}/stock-control/certificates/job-card/${jobCardId}/data-book`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to download data book");
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `DataBook-JC${jobCardId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }

  async recentBatches(stockItemId: number): Promise<string[]> {
    return this.request(`/stock-control/certificates/recent-batches/${stockItemId}`);
  }
}

export const stockControlApiClient = new StockControlApiClient();
