/**
 * Type declarations for adminApi. Extracted from adminApi.ts as part
 * of issue #233 Phase 2D to slim that file down.
 */
export interface AdminLoginDto {
  email: string;
  password: string;
}

export interface AdminUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface AdminLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AdminUser;
}

export interface AdminUserProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  createdAt: string;
  lastActiveAt?: string;
}

export interface DashboardStats {
  totalCustomers: number;
  totalSuppliers: number;
  totalRfqs: number;
  pendingApprovals: {
    customers: number;
    suppliers: number;
    total: number;
  };
  recentActivity: ActivityItem[];
  systemHealth: {
    activeCustomerSessions: number;
    activeSupplierSessions: number;
    activeAdminSessions: number;
  };
}

export interface ActivityItem {
  id: number;
  timestamp: string;
  userId: number;
  userName: string;
  action: string;
  entityType: string;
  entityId?: number;
  details?: string;
  ipAddress?: string;
}

export interface CustomerStats {
  total: number;
  active: number;
  suspended: number;
  pendingReview: number;
}

export interface SupplierStats {
  total: number;
  active: number;
  suspended: number;
  pendingReview: number;
}

// Feedback Types

export type FeedbackSource = "text" | "voice";

export type FeedbackClassification =
  | "bug"
  | "feature-request"
  | "question"
  | "ui-issue"
  | "data-issue";
export type FeedbackStatus = "submitted" | "triaged" | "in_progress" | "resolved";

export type ResolutionStatus =
  | "needs_investigation"
  | "investigating"
  | "fix_in_progress"
  | "fix_deployed"
  | "verified"
  | "cannot_reproduce"
  | "wont_fix"
  | "duplicate";

export interface FeedbackItem {
  id: number;
  customerProfileId: number | null;
  conversationId: number | null;
  assignedToId: number | null;
  content: string;
  source: FeedbackSource;
  pageUrl: string | null;
  submitterType: string | null;
  submitterName: string | null;
  submitterEmail: string | null;
  appContext: string | null;
  githubIssueNumber: number | null;
  aiClassification: FeedbackClassification | null;
  status: FeedbackStatus;
  resolutionStatus: ResolutionStatus | null;
  testCriteria: string | null;
  verifiedAt: string | null;
  createdAt: string;
  customerProfile?: {
    id: number;
    firstName: string;
    lastName: string;
    company?: { legalName: string };
  } | null;
  assignedTo?: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  attachments?: FeedbackAttachmentItem[];
}

export interface FeedbackAttachmentItem {
  id: number;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  isAutoScreenshot: boolean;
  createdAt: string;
}

export interface FeedbackAttachmentUrl {
  id: number;
  url: string;
  filename: string;
  isAutoScreenshot: boolean;
}

export interface FeedbackDetail extends FeedbackItem {
  conversation?: {
    id: number;
    subject: string;
  } | null;
}

// Customer Management Types

export type CustomerAccountStatus = "pending" | "active" | "suspended" | "deactivated";

export interface CustomerQueryDto {
  search?: string;
  status?: CustomerAccountStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface CustomerListItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  accountStatus: CustomerAccountStatus;
  createdAt: string;
  lastLoginAt?: string | null;
  deviceBound: boolean;
}

export interface CustomerListResponse {
  items: CustomerListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerDetail {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  directPhone?: string;
  mobilePhone?: string;
  accountStatus: CustomerAccountStatus;
  suspensionReason?: string | null;
  suspendedAt?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
  deviceBound: boolean;
  company?: {
    name: string;
    vatNumber?: string;
    registrationNumber?: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };
  onboarding?: {
    id: number;
    status: string;
    submittedAt?: string;
    reviewedAt?: string;
    reviewedByName?: string | null;
  };
}

export interface SuspendCustomerDto {
  reason: string;
}

export interface ReactivateCustomerDto {
  note?: string;
}

export interface ResetDeviceBindingDto {
  reason: string;
}

export interface LoginHistoryItem {
  id: number;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
}

export interface CustomerDocument {
  id: number;
  documentType: string;
  fileName: string;
  filePath: string;
  uploadedAt: string;
  validationStatus?: string;
  validationNotes?: string;
  ocrProcessedAt?: string;
  ocrFailed?: boolean;
  verificationConfidence?: number;
  allFieldsMatch?: boolean;
}

export interface FieldComparisonResult {
  field: string;
  expected: string | number | null;
  extracted: string | number | null;
  matches: boolean;
  similarity: number;
}

export interface DocumentReviewData {
  documentId: number;
  documentType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  validationStatus: string;
  validationNotes: string | null;
  presignedUrl: string;
  ocrProcessedAt: string | null;
  ocrFailed: boolean;
  verificationConfidence: number | null;
  allFieldsMatch: boolean | null;
  expectedData: Record<string, any>;
  extractedData: Record<string, any>;
  fieldComparison: FieldComparisonResult[];
  reviewedBy: string | null;
  reviewedAt: string | null;
  customer?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  supplier?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export interface VerificationResult {
  success: boolean;
  documentId: number;
  entityType: "customer" | "supplier";
  validationStatus: string;
  allFieldsMatch: boolean;
  requiresManualReview: boolean;
  errorMessage?: string;
}

export interface AutoApprovalResult {
  entityType: "customer" | "supplier";
  entityId: number;
  approved: boolean;
  reason: string;
  missingDocuments: string[];
}

export interface DocumentPreviewImages {
  pages: string[];
  totalPages: number;
  invalidDocuments: string[];
  manualReviewDocuments: string[];
}

export interface SecureDocument {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  folder: string | null;
  storagePath: string;
  fileType: "markdown" | "pdf" | "excel" | "word" | "other";
  originalFilename: string | null;
  attachmentPath: string | null;
  createdBy: {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SecureDocumentWithContent extends SecureDocument {
  content: string;
}

export interface CreateSecureDocumentDto {
  title: string;
  description?: string;
  content: string;
  folder?: string;
}

export interface UpdateSecureDocumentDto {
  title?: string;
  description?: string;
  content?: string;
  folder?: string;
}

export interface SecureEntityFolder {
  id: number;
  entityType: "customer" | "supplier";
  entityId: number;
  folderName: string;
  secureFolderPath: string;
  isActive: boolean;
  createdAt: string;
  deletedAt: string | null;
  deletionReason: string | null;
}

export interface LocalDocument {
  slug: string;
  title: string;
  description: string;
  filePath: string;
  updatedAt: string;
  isLocal: true;
}

export interface LocalDocumentWithContent extends LocalDocument {
  content: string;
}

// Re-export RfqDraftStatus from client for admin use
export type { RfqDraftStatus } from "./client";

// Admin RFQ types - extends existing types with admin-specific fields
export interface AdminRfqListItem {
  id: number;
  rfqNumber?: string;
  projectName: string;
  customerName: string;
  customerEmail: string;
  status: string;
  isUnregistered?: boolean;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  documentCount?: number;
  requiredDate?: string;
  isPastDeadline?: boolean;
}

export interface AdminRfqListResponse {
  items: AdminRfqListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RfqFullDraftResponse {
  id: number;
  draftNumber: string;
  projectName?: string;
  currentStep: number;
  completionPercentage: number;
  isConverted: boolean;
  convertedRfqId?: number;
  formData: Record<string, any>;
  globalSpecs?: Record<string, any>;
  requiredProducts?: string[];
  straightPipeEntries?: Record<string, any>[];
  pendingDocuments?: Record<string, any>[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminRfqQueryDto {
  search?: string;
  status?: string;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  page?: number;
  limit?: number;
}
