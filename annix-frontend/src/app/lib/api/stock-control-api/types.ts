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
  qcEnabled: boolean;
  messagingEnabled: boolean;
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

export interface ChatMessageResponse {
  id: number;
  senderId: number;
  senderName: string;
  text: string;
  imageUrl: string | null;
  editedAt: string | null;
  createdAt: string;
  conversationId: number | null;
}

export interface ChatConversationParticipant {
  userId: number;
  name: string;
  lastReadAt: string | null;
}

export interface ChatConversationResponse {
  id: number;
  type: "general" | "direct" | "group";
  name: string | null;
  createdById: number;
  lastMessageAt: string | null;
  createdAt: string;
  participants: ChatConversationParticipant[];
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
  qcEnabled?: boolean;
  messagingEnabled?: boolean;
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

export interface InboundEmailConfigResponse {
  emailHost: string | null;
  emailPort: number | null;
  emailUser: string | null;
  emailPassSet: boolean;
  tlsEnabled: boolean;
  tlsServerName: string | null;
  enabled: boolean;
  lastPollAt: string | null;
  lastError: string | null;
}

export interface InboundEmailConfigUpdate {
  emailHost: string | null;
  emailPort: number | null;
  emailUser: string | null;
  emailPass: string | null;
  tlsEnabled: boolean;
  tlsServerName: string | null;
  enabled: boolean;
}

export interface InboundEmailAttachment {
  id: number;
  inboundEmailId: number;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  s3Path: string | null;
  documentType: string;
  classificationConfidence: number | null;
  classificationSource: string | null;
  linkedEntityType: string | null;
  linkedEntityId: number | null;
  extractionStatus: string;
  extractedData: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InboundEmail {
  id: number;
  configId: number;
  app: string;
  companyId: number | null;
  messageId: string;
  fromEmail: string;
  fromName: string | null;
  subject: string | null;
  receivedAt: string | null;
  attachmentCount: number;
  processingStatus: string;
  errorMessage: string | null;
  attachments: InboundEmailAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface InboundEmailStats {
  total: number;
  completed: number;
  failed: number;
  unclassified: number;
  pending: number;
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

export interface CompanyRole {
  id: number;
  key: string;
  label: string;
  isSystem: boolean;
  sortOrder: number;
}

export interface AdminTransferPending {
  id: number;
  targetEmail: string;
  newRoleForInitiator: string | null;
  token: string;
  createdAt: string;
  expiresAt: string;
}

export interface AdminTransferAcceptResponse {
  transferred: boolean;
  message: string;
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
  parentJobCardId: number | null;
  jtDnNumber: string | null;
  workflowCeiling: string | null;
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
  workflowStatus: string | null;
  approvalsSnapshot: Record<string, unknown>[] | null;
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
  hasInternalLining: boolean;
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

export interface SectionStatus {
  key: string;
  label: string;
  status: "complete" | "partial" | "missing";
  count: number;
  warnings: string[];
}

export interface DataBookCompleteness {
  overallPercent: number;
  readyToCompile: boolean;
  blockingReasons: string[];
  sections: SectionStatus[];
  warnings: string[];
}

export interface QcShoreHardnessRecord {
  id: number;
  companyId: number;
  jobCardId: number;
  rubberSpec: string;
  rubberBatchNumber: string | null;
  requiredShore: number;
  readings: {
    column1: number[];
    column2: number[];
    column3: number[];
    column4: number[];
    itemLabels?: string[];
  };
  averages: {
    column1: number | null;
    column2: number | null;
    column3: number | null;
    column4: number | null;
    overall: number | null;
  };
  readingDate: string;
  capturedByName: string;
  capturedById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface QcDftReadingEntry {
  itemNumber: number;
  reading: number;
}

export interface QcDftReadingRecord {
  id: number;
  companyId: number;
  jobCardId: number;
  coatType: "primer" | "final";
  paintProduct: string;
  batchNumber: string | null;
  specMinMicrons: number;
  specMaxMicrons: number;
  readings: QcDftReadingEntry[];
  averageMicrons: number | null;
  readingDate: string;
  capturedByName: string;
  capturedById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface QcBlastProfileEntry {
  itemNumber: number;
  reading: number;
}

export interface QcBlastProfileRecord {
  id: number;
  companyId: number;
  jobCardId: number;
  specMicrons: number;
  abrasiveBatchNumber: string | null;
  readings: QcBlastProfileEntry[];
  averageMicrons: number | null;
  temperature: number | null;
  humidity: number | null;
  readingDate: string;
  capturedByName: string;
  capturedById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface QcDustDebrisTestEntry {
  testNumber: number;
  quantity: number | null;
  coatingType: string | null;
  itemNumber: string | null;
  result: "pass" | "fail";
  testedAt: string | null;
}

export interface QcDustDebrisRecord {
  id: number;
  companyId: number;
  jobCardId: number;
  tests: QcDustDebrisTestEntry[];
  readingDate: string;
  capturedByName: string;
  capturedById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface QcPullTestSolution {
  product: string;
  batchNumber: string | null;
  result: "pass" | "fail";
}

export interface QcPullTestForceGauge {
  make: string;
  certificateNumber: string | null;
  expiryDate: string | null;
}

export interface QcPullTestAreaReading {
  area: string;
  result: "pass" | "fail";
  reading: string;
}

export interface QcPullTestRecord {
  id: number;
  companyId: number;
  jobCardId: number;
  itemDescription: string | null;
  quantity: number | null;
  solutions: QcPullTestSolution[];
  forceGauge: QcPullTestForceGauge;
  areaReadings: QcPullTestAreaReading[];
  comments: string | null;
  readingDate: string;
  finalApprovalName: string | null;
  finalApprovalDate: string | null;
  capturedByName: string;
  capturedById: number | null;
  createdAt: string;
  updatedAt: string;
}

export type QcCheckResult = "pass" | "fail";

export interface QcBlastingCheck {
  blastProfileBatchNo: string | null;
  contaminationFree: QcCheckResult | null;
  sa25Grade: QcCheckResult | null;
  inspectorName: string | null;
}

export interface QcSolutionUsed {
  productName: string;
  typeBatch: string | null;
  result: QcCheckResult;
  inspectorName: string | null;
}

export interface QcLiningCheck {
  preCureLinedAsPerDrawing: QcCheckResult | null;
  preCureInspectorName: string | null;
  visualDefectInspection: QcCheckResult | null;
  visualDefectInspectorName: string | null;
}

export interface QcCureCycleRecord {
  cycleNumber: number;
  timeIn: string | null;
  timeOut: string | null;
  pressureBar: number | null;
}

export interface QcPaintingCheck {
  coat: "primer" | "intermediate" | "final";
  batchNumber: string | null;
  dftMicrons: number | null;
  result: QcCheckResult | null;
  inspectorName: string | null;
}

export interface QcFinalInspection {
  linedAsPerDrawing: QcCheckResult | null;
  visualInspection: QcCheckResult | null;
  testPlate: QcCheckResult | null;
  shoreHardness: number | null;
  sparkTest: QcCheckResult | null;
  sparkTestVoltagePerMm: number | null;
  inspectorName: string | null;
}

export interface QcReleaseCertificateRecord {
  id: number;
  companyId: number;
  jobCardId: number;
  certificateNumber: string | null;
  blastingCheck: QcBlastingCheck | null;
  solutionsUsed: QcSolutionUsed[];
  liningCheck: QcLiningCheck | null;
  cureCycles: QcCureCycleRecord[];
  paintingChecks: QcPaintingCheck[];
  finalInspection: QcFinalInspection | null;
  comments: string | null;
  certificateDate: string | null;
  finalApprovalName: string | null;
  finalApprovalSignatureUrl: string | null;
  finalApprovalDate: string | null;
  capturedByName: string;
  capturedById: number | null;
  createdAt: string;
  updatedAt: string;
}

export type QcpPlanType = "paint_external" | "paint_internal" | "rubber" | "hdpe";

export type InterventionType = "H" | "I" | "W" | "R" | "S" | "V";

export interface QcpPartySignOff {
  interventionType: InterventionType | null;
  name: string | null;
  signatureUrl: string | null;
  date: string | null;
}

export interface QcpActivity {
  operationNumber: number;
  description: string;
  specification: string | null;
  procedureRequired: string | null;
  pls: QcpPartySignOff;
  mps: QcpPartySignOff;
  client: QcpPartySignOff;
  remarks: string | null;
}

export interface QcpApprovalSignature {
  party: string;
  name: string | null;
  signatureUrl: string | null;
  date: string | null;
}

export interface QcControlPlanRecord {
  id: number;
  companyId: number;
  jobCardId: number;
  planType: QcpPlanType;
  qcpNumber: string | null;
  documentRef: string | null;
  revision: string | null;
  customerName: string | null;
  orderNumber: string | null;
  jobName: string | null;
  specification: string | null;
  itemDescription: string | null;
  activities: QcpActivity[];
  approvalSignatures: QcpApprovalSignature[];
  createdByName: string;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface QcMeasurementsAggregate {
  shoreHardness: QcShoreHardnessRecord[];
  dftReadings: QcDftReadingRecord[];
  blastProfiles: QcBlastProfileRecord[];
  dustDebrisTests: QcDustDebrisRecord[];
  pullTests: QcPullTestRecord[];
  controlPlans: QcControlPlanRecord[];
  releaseCertificates: QcReleaseCertificateRecord[];
}

export type ItemReleaseResult = "pass" | "fail";

export interface ReleaseLineItem {
  itemCode: string;
  description: string;
  jtNumber: string | null;
  rubberSpec: string | null;
  paintingSpec: string | null;
  quantity: number;
  result: ItemReleaseResult;
}

export interface ReleasePartySignOff {
  name: string | null;
  date: string | null;
  signatureUrl: string | null;
}

export interface QcItemsReleaseRecord {
  id: number;
  companyId: number;
  jobCardId: number;
  items: ReleaseLineItem[];
  totalQuantity: number;
  checkedByName: string | null;
  checkedByDate: string | null;
  plsSignOff: ReleasePartySignOff;
  mpsSignOff: ReleasePartySignOff;
  clientSignOff: ReleasePartySignOff;
  comments: string | null;
  createdByName: string;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalibrationCertificate {
  id: number;
  companyId: number;
  equipmentName: string;
  equipmentIdentifier: string | null;
  certificateNumber: string | null;
  filePath: string;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  description: string | null;
  expiryDate: string;
  isActive: boolean;
  uploadedById: number | null;
  uploadedByName: string | null;
  createdAt: string;
  updatedAt: string;
  downloadUrl?: string;
}

export interface PositectorDevice {
  id: number;
  companyId: number;
  deviceName: string;
  ipAddress: string;
  port: number;
  probeType: string | null;
  serialNumber: string | null;
  isActive: boolean;
  lastConnectedAt: string | null;
  registeredByName: string;
  registeredById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PositectorConnectionStatus {
  id: number;
  deviceName: string;
  ipAddress: string;
  port: number;
  online: boolean;
  probeType: string | null;
  serialNumber: string | null;
  batchCount: number | null;
}

export interface PositectorBatchSummary {
  buid: string;
  name: string | null;
  probeType: string | null;
  readingCount: number;
}

export interface PositectorReading {
  index: number;
  value: number;
  units: string | null;
  timestamp: string | null;
  raw: Record<string, string>;
}

export interface PositectorBatchDetail {
  buid: string;
  header: {
    serialNumber: string | null;
    probeType: string | null;
    batchName: string | null;
    model: string | null;
    units: string | null;
    readingCount: number;
  };
  readings: PositectorReading[];
  statistics: Record<string, string> | null;
  suggestedEntityType: string;
  suggestedCoatType?: string | null;
}

export interface PositectorImportResult {
  entityType: string;
  recordId: number;
  readingsImported: number;
  average: number | null;
  duplicateWarning: boolean;
}

export interface PositectorStreamingSession {
  sessionId: string;
  deviceId: number;
  config: {
    jobCardId: number;
    entityType: "dft" | "blast_profile" | "shore_hardness";
    coatType?: string;
    paintProduct?: string;
    batchNumber?: string | null;
    specMinMicrons?: number;
    specMaxMicrons?: number;
    specMicrons?: number;
    rubberSpec?: string;
    rubberBatchNumber?: string | null;
    requiredShore?: number;
  };
  readingCount: number;
  readings: PositectorStreamingReading[];
  specLimits: { min: number | null; max: number | null };
  startedAt: string;
  startedByName?: string;
}

export interface PositectorStreamingReading {
  value: number;
  units: string | null;
  probeType: string | null;
  serialNumber: string | null;
  timestamp: string;
}

export interface PositectorStreamingSaveResult {
  sessionId: string;
  entityType: string;
  recordId: number;
  readingsImported: number;
  average: number | null;
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
    jobCardsPendingAllocation: number;
    coatingPending: number;
    coatingAnalysed: number;
    requisitionsPending: number;
    requisitionsApproved: number;
    requisitionsOrdered: number;
  };
  outbound: {
    jobCardsDispatched: number;
    jobCardsFileClosed: number;
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

export interface WorkflowStepConfig {
  id: number;
  companyId: number;
  key: string;
  label: string;
  sortOrder: number;
  isSystem: boolean;
  isBackground: boolean;
  triggerAfterStep: string | null;
  actionLabel: string | null;
}

export interface JobCardActionCompletion {
  id: number;
  jobCardId: number;
  companyId: number;
  stepKey: string;
  actionType: string;
  completedById: number;
  completedByName: string;
  completedAt: string;
  metadata: Record<string, unknown> | null;
}

export interface BackgroundStepStatus {
  stepKey: string;
  label: string;
  triggerAfterStep: string | null;
  completedAt: string | null;
  completedByName: string | null;
  notes: string | null;
  actionLabel: string | null;
}

export interface PendingBackgroundStep {
  jobCardId: number;
  jobCardNumber: string;
  stepKey: string;
  stepLabel: string;
  triggeredAt: string;
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
  jobCardStatus: string;
  stepAssignments: Record<string, { name: string; isPrimary: boolean }[]>;
  foregroundSteps: Array<{
    key: string;
    label: string;
    sortOrder: number;
    actionLabel: string | null;
  }>;
  backgroundSteps: Array<{
    stepKey: string;
    label: string;
    triggerAfterStep: string | null;
    completedAt: string | null;
    completedByName: string | null;
    notes: string | null;
    actionLabel: string | null;
  }>;
  actionCompletions: JobCardActionCompletion[];
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

export interface DeliveryLineMatch {
  deliveryItemId: number;
  deliveryItemDescription: string | null;
  deliveryItemCode: string | null;
  cpoItemId: number;
  cpoItemDescription: string | null;
  cpoItemCode: string | null;
  similarity: number;
  preSelected: boolean;
}

export interface DeliveryMatchResult {
  jobCardId: number;
  jtDnNumber: string;
  matches: DeliveryLineMatch[];
}

export interface JobCardImportResult {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
  deliveryMatches: DeliveryMatchResult[];
  createdJobCardIds: number[];
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

export interface CpoDeliveryHistoryItem {
  jobCardId: number;
  jobNumber: string;
  jtDnNumber: string | null;
  status: string;
  importedAt: string;
  items: { itemCode: string | null; description: string | null; quantity: number }[];
  totalQuantity: number;
}

export interface CpoRunningTotal {
  itemCode: string | null;
  description: string | null;
  ordered: number;
  fulfilled: number;
  remaining: number;
  deliveries: { jtDnNumber: string | null; quantity: number; date: string }[];
}

export interface CpoDeliveryHistory {
  deliveries: CpoDeliveryHistoryItem[];
  runningTotals: CpoRunningTotal[];
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
  linkedDeliveryNoteIds: number[] | null;
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
  unitType: string | null;
  discountPercent: number | null;
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
    quantity: number;
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
