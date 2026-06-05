import { type ApiClient, createApiClient } from "@/app/lib/api/createApiClient";
import { annixOrbitTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

export interface AnnixOrbitLoginDto {
  email: string;
  password: string;
  accountType?: string;
}

export type AnnixOrbitUserType = "company" | "recruiter" | "individual" | "student";

export interface AnnixOrbitUser {
  id: number;
  email: string;
  name: string;
  role: string;
  userType: AnnixOrbitUserType;
}

export interface AnnixOrbitLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AnnixOrbitUser;
}

export interface AnnixOrbitUserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  userType: AnnixOrbitUserType;
  companyId: number | null;
  companyName: string | null;
  createdAt: string;
}

export interface OrbitClient {
  id: number;
  companyId: number;
  name: string;
  industry: string | null;
  province: string | null;
  city: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  feePercentage: number | null;
  paymentTerms: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrbitClientInput {
  name: string;
  industry?: string | null;
  province?: string | null;
  city?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  feePercentage?: number | null;
  paymentTerms?: string | null;
  status?: string;
  notes?: string | null;
}

export interface OrbitPlacement {
  id: number;
  companyId: number;
  clientId: number | null;
  candidateName: string;
  jobTitle: string;
  salary: number | null;
  placementFee: number | null;
  startDate: string | null;
  guaranteeUntil: string | null;
  status: string;
  invoiceStatus: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrbitPlacementInput {
  clientId?: number | null;
  candidateName: string;
  jobTitle: string;
  salary?: number | null;
  placementFee?: number | null;
  startDate?: string | null;
  guaranteeUntil?: string | null;
  status?: string;
  invoiceStatus?: string;
  notes?: string | null;
}

export interface OrbitTalentCandidate {
  id: number;
  companyId: number;
  ownerUserId: number;
  visibility: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  currentRole: string | null;
  province: string | null;
  city: string | null;
  yearsExperience: number | null;
  skills: string[] | null;
  salaryExpectation: number | null;
  availability: string | null;
  noticePeriod: string | null;
  willingToRelocate: boolean;
  status: string;
  notes: string | null;
  consentToShare: boolean;
  consentGivenAt: string | null;
  consentSource: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrbitTalentCandidateInput {
  visibility?: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  currentRole?: string | null;
  province?: string | null;
  city?: string | null;
  yearsExperience?: number | null;
  skills?: string[] | null;
  salaryExpectation?: number | null;
  availability?: string | null;
  noticePeriod?: string | null;
  willingToRelocate?: boolean;
  status?: string;
  notes?: string | null;
  consentToShare?: boolean;
  consentGivenAt?: string | null;
  consentSource?: string | null;
}

export interface OrbitSubmission {
  id: number;
  companyId: number;
  candidateId: number;
  clientId: number | null;
  jobTitle: string;
  status: string;
  submittedAt: string | null;
  feedback: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrbitSubmissionCreateInput {
  candidateId: number;
  clientId?: number | null;
  jobTitle: string;
  status?: string;
  feedback?: string | null;
  notes?: string | null;
}

export interface OrbitSubmissionUpdateInput {
  clientId?: number | null;
  jobTitle: string;
  status?: string;
  feedback?: string | null;
  notes?: string | null;
}

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "temporary"
  | "internship"
  | "learnership";

export type WorkMode = "on_site" | "hybrid" | "remote";
export type SkillImportance = "required" | "preferred";
export type SkillProficiency = "basic" | "intermediate" | "advanced" | "expert";
export type SuccessMetricTimeframe = "3_months" | "12_months";
export type ScreeningQuestionType = "yes_no" | "short_text" | "multiple_choice" | "numeric";

export interface JobSkill {
  id?: number;
  name: string;
  importance: SkillImportance;
  proficiency: SkillProficiency;
  yearsExperience?: number | null;
  evidenceRequired?: string | null;
  weight?: number;
  sortOrder?: number;
}

export interface JobSuccessMetric {
  id?: number;
  timeframe: SuccessMetricTimeframe;
  metric: string;
  sortOrder?: number;
}

export interface JobScreeningQuestion {
  id?: number;
  question: string;
  questionType: ScreeningQuestionType;
  options?: string[] | null;
  disqualifyingAnswer?: string | null;
  weight?: number;
  sortOrder?: number;
}

export interface JobPosting {
  id: number;
  title: string;
  description: string | null;
  requiredSkills: string[];
  minExperienceYears: number | null;
  requiredEducation: string | null;
  requiredCertifications: string[];
  emailSubjectPattern: string | null;
  autoRejectEnabled: boolean;
  autoRejectThreshold: number;
  autoAcceptThreshold: number;
  status: string;
  referenceNumber: string | null;
  responseTimelineDays: number;
  location: string | null;
  province: string | null;
  employmentType: EmploymentType | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  applyByEmail: string | null;
  activatedAt: string | null;
  enabledPortalCodes: string[];
  testMode?: boolean;
  companyId: number;
  createdAt: string;
  updatedAt: string;
  // Wizard fields (Phase 1+)
  normalizedTitle?: string | null;
  industry?: string | null;
  department?: string | null;
  seniorityLevel?: string | null;
  workMode?: WorkMode | null;
  companyContext?: string | null;
  mainPurpose?: string | null;
  commissionStructure?: string | null;
  benefits?: string[];
  qualityScore?: number;
  inclusivityScore?: number;
  nixSummary?: Record<string, unknown> | null;
  skills?: JobSkill[];
  successMetrics?: JobSuccessMetric[];
  screeningQuestions?: JobScreeningQuestion[];
}

export interface UpdateJobWizardPayload {
  title?: string;
  normalizedTitle?: string;
  industry?: string;
  department?: string;
  seniorityLevel?: string;
  location?: string;
  province?: string;
  employmentType?: EmploymentType;
  workMode?: WorkMode;
  companyContext?: string;
  mainPurpose?: string;
  description?: string;
  successMetrics?: JobSuccessMetric[];
  skills?: JobSkill[];
  requiredCertifications?: string[];
  minExperienceYears?: number;
  requiredEducation?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  commissionStructure?: string;
  benefits?: string[];
  screeningQuestions?: JobScreeningQuestion[];
  enabledPortalCodes?: string[];
  responseTimelineDays?: number;
  applyByEmail?: string;
}

export interface PortalAdapterSummary {
  code: string;
  displayName: string;
  costTier: "free" | "freemium" | "paid" | "assisted";
  postingMode: "api" | "assisted";
  available: boolean;
}

export interface AssistedPostingPackEntry {
  portalCode: string;
  displayName: string;
  targetUrl: string;
  copyTitle: string;
  copyBody: string;
  copyContact: string | null;
  notes: string | null;
}

export interface PublicJobPosting {
  referenceNumber: string;
  title: string;
  description: string | null;
  location: string | null;
  province: string | null;
  employmentType: EmploymentType | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  requiredSkills: string[];
  requiredEducation: string | null;
  requiredCertifications: string[];
  minExperienceYears: number | null;
  responseTimelineDays: number;
  applyByEmail: string | null;
  postedAt: string;
  companyName: string | null;
}

export interface ExtractedCvData {
  candidateName: string | null;
  email: string | null;
  phone: string | null;
  experienceYears: number | null;
  skills: string[];
  education: string[];
  certifications: string[];
  references: Array<{
    name: string;
    email: string;
    relationship: string | null;
  }>;
  summary: string | null;
  detectedLanguage: string | null;
  professionalRegistrations: string[];
  saQualifications: string[];
  location: string | null;
}

export interface MatchAnalysis {
  overallScore: number;
  skillsMatched: string[];
  skillsMissing: string[];
  experienceMatch: boolean;
  educationMatch: boolean;
  recommendation: "reject" | "review" | "shortlist";
  reasoning: string | null;
}

export interface Candidate {
  id: number;
  email: string | null;
  name: string | null;
  cvFilePath: string | null;
  extractedData: ExtractedCvData | null;
  matchAnalysis: MatchAnalysis | null;
  matchScore: number | null;
  status: string;
  beeLevel: number | null;
  popiaConsent: boolean;
  popiaConsentedAt: string | null;
  lastActiveAt: string | null;
  jobAlertsOptIn: boolean;
  jobPostingId: number;
  jobPosting?: JobPosting;
  references?: CandidateReference[];
  createdAt: string;
  updatedAt: string;
}

export interface CandidateReference {
  id: number;
  name: string;
  email: string;
  relationship: string | null;
  feedbackRating: number | null;
  feedbackText: string | null;
  feedbackSubmittedAt: string | null;
  status: string;
  candidateId: number;
  createdAt: string;
}

export interface DashboardStats {
  totalCandidates: number;
  candidatesByStatus: Record<string, number>;
  averageScore: number | null;
  totalJobPostings: number;
  activeJobPostings: number;
  pendingReferences: number;
}

export interface CompanySettings {
  id: number;
  name: string;
  industry: string | null;
  companySize: string | null;
  province: string | null;
  city: string | null;
  streetAddress: string | null;
  postalCode: string | null;
  phone: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  registrationNumber: string | null;
  vatNumber: string | null;
  beeLevel: number | null;
  imapHost: string | null;
  imapPort: number | null;
  imapUser: string | null;
  imapConfigured: boolean;
  monitoringEnabled: boolean;
  emailFromAddress: string | null;
}

export type CvEmailTemplateKind =
  | "rejection"
  | "shortlist"
  | "acceptance"
  | "reference_request"
  | "acknowledgement";

export interface CvEmailTemplate {
  kind: CvEmailTemplateKind;
  label: string;
  description: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  placeholders: string[];
  isCustomised: boolean;
  updatedAt: string | null;
}

export interface UpdateCompanySettingsInput {
  name?: string;
  industry?: string;
  companySize?: string;
  province?: string;
  city?: string;
  streetAddress?: string;
  postalCode?: string;
  phone?: string;
  contactEmail?: string;
  websiteUrl?: string;
  registrationNumber?: string;
  vatNumber?: string;
  beeLevel?: number;
}

export interface JobMarketSource {
  id: number;
  provider: string;
  name: string;
  apiId: string | null;
  countryCodes: string[];
  categories: string[];
  enabled: boolean;
  rateLimitPerDay: number;
  requestsToday: number;
  lastIngestedAt: string | null;
  ingestionIntervalHours: number;
  visibleTiers: string[] | null;
  requiresVetting: boolean;
  companyId: number | null;
  createdAt: string;
  updatedAt: string;
}

export type JobSourceProvider =
  | "adzuna"
  | "remotive"
  | "dpsa"
  | "executiveplacements"
  | "jobplacements"
  | "jobmail";

export interface JobSourceCredentialField {
  key: "apiId" | "apiKey";
  label: string;
  secret: boolean;
}

export interface JobSourceProviderInfo {
  id: JobSourceProvider;
  label: string;
  description: string;
  credentialFields: JobSourceCredentialField[];
}

export interface CreateJobMarketSourceDto {
  provider: JobSourceProvider;
  name: string;
  apiId?: string | null;
  apiKey?: string | null;
  countryCodes?: string[];
  categories?: string[];
  visibleTiers?: string[];
  ingestionIntervalHours?: number;
}

export interface UpdateJobMarketSourceDto {
  name?: string;
  apiId?: string;
  apiKey?: string;
  countryCodes?: string[];
  categories?: string[];
  visibleTiers?: string[];
  enabled?: boolean;
  ingestionIntervalHours?: number;
}

export interface ExternalJob {
  id: number;
  title: string;
  company: string | null;
  country: string;
  locationRaw: string | null;
  locationArea: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  description: string | null;
  extractedSkills: string[];
  category: string | null;
  sourceExternalId: string;
  sourceUrl: string | null;
  postedAt: string | null;
  expiresAt: string | null;
  sourceId: number;
  source?: { id: number; name: string; provider: string } | null;
  acceptsZa: boolean | null;
  vettingNotes: string | null;
  vettedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobMarketStats {
  totalJobs: number;
  jobsLast7Days: number;
  sources: Array<{
    id: number;
    name: string;
    provider: string;
    enabled: boolean;
    lastIngestedAt: string | null;
    requestsToday: number;
    rateLimitPerDay: number;
    jobCount: number;
  }>;
}

export interface DuplicateJobSide {
  id: number;
  title: string;
  company: string | null;
  location: string | null;
  source: string;
  createdAt: string | null;
}

export interface DuplicateJobPair {
  score: number;
  crossSource: boolean;
  a: DuplicateJobSide;
  b: DuplicateJobSide;
}

export interface SalaryBenchmark {
  category: string;
  averageSalary: number | null;
  medianSalary: number | null;
  minSalary: number | null;
  maxSalary: number | null;
  sampleSize: number;
  salaryBand: string | null;
}

export interface DemandTrend {
  category: string;
  currentCount: number;
  previousCount: number;
  changePercent: number;
  trend: "rising" | "falling" | "stable";
}

export interface LocationDemand {
  location: string;
  jobCount: number;
  averageSalary: number | null;
  costOfLivingIndex: number;
  adjustedSalary: number | null;
}

export interface MarketInsights {
  salaryBenchmarks: SalaryBenchmark[];
  demandTrends: DemandTrend[];
  topLocations: LocationDemand[];
  topSkills: Array<{ skill: string; count: number }>;
  totalActiveJobs: number;
  dataAsOf: string;
}

export interface FunnelStage {
  label: string;
  count: number;
  rate: number | null;
}

export interface ConversionFunnelResponse {
  stages: FunnelStage[];
  dateFrom: string | null;
  dateTo: string | null;
}

export interface MatchAccuracyBand {
  range: string;
  total: number;
  accepted: number;
  accuracy: number;
}

export interface MatchAccuracyResponse {
  bands: MatchAccuracyBand[];
  overall: { total: number; accepted: number; accuracy: number };
}

export interface TimeToFillJob {
  title: string;
  averageDays: number;
  candidateCount: number;
}

export interface TimeToFillResponse {
  overall: { averageDays: number; medianDays: number; count: number };
  byJob: TimeToFillJob[];
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface LocationCount {
  location: string;
  count: number;
}

export interface SalaryByCategory {
  category: string;
  averageSalary: number;
  currency: string;
  count: number;
}

export interface MonthlyJobCount {
  month: string;
  count: number;
}

export interface SkillDemand {
  skill: string;
  count: number;
}

export interface MarketTrendsResponse {
  byCategory: CategoryCount[];
  byLocation: LocationCount[];
  salaryByCategory: SalaryByCategory[];
  monthlyTrend: MonthlyJobCount[];
  topSkills: SkillDemand[];
  totalJobs: number;
}

export interface PopiaRetentionStats {
  totalCandidates: number;
  expiringWithin30Days: number;
  withConsent: number;
  withoutConsent: number;
}

export interface NotificationPreferences {
  matchAlertThreshold: number;
  digestEnabled: boolean;
  pushEnabled: boolean;
}

export interface IndividualNotificationPreferences {
  matchAlertThreshold: number;
  digestEnabled: boolean;
  pushEnabled: boolean;
  jobAlertsOptIn?: boolean;
  accountDeletionRequested?: boolean;
}

export interface PublicJob {
  id: number;
  kind: "external" | "annix";
  referenceNumber: string | null;
  title: string;
  company: string | null;
  country: string;
  locationRaw: string | null;
  locationArea: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  description: string | null;
  extractedSkills: string[];
  category: string | null;
  sourceUrl: string | null;
  postedAt: string | null;
  expiresAt: string | null;
}

export interface IndividualDataExportAccount {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  emailVerified: boolean;
}

export interface IndividualDataExportProfile {
  matchAlertThreshold: number;
  digestEnabled: boolean;
  pushEnabled: boolean;
  cvUploadedAt: string | null;
}

export interface IndividualDataExportDocument {
  id: number;
  kind: IndividualDocumentKind;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  label: string | null;
  uploadedAt: string;
}

export interface IndividualDataExport {
  exportedAt: string;
  account: IndividualDataExportAccount;
  profile: IndividualDataExportProfile;
  documents: IndividualDataExportDocument[];
  extractedCv: unknown;
}

export type IndividualDocumentKind = "cv" | "qualification" | "certificate";

export interface CredentialFields {
  credentialName: string | null;
  issuer: string | null;
  dateAwarded: string | null;
  nqfLevel: string | null;
  expiry: string | null;
}

export interface IndividualDocument {
  id: number;
  kind: IndividualDocumentKind;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  label: string | null;
  uploadedAt: string;
  downloadUrl: string;
  isPhotoCapture: boolean;
  needsClearScan: boolean;
  credentialFields: CredentialFields | null;
}

export interface IndividualProfileStatus {
  profileComplete: boolean;
  hasCv: boolean;
  qualificationsCount: number;
  certificatesCount: number;
  cvUploadedAt: string | null;
  cvOriginalFilename: string | null;
  photoCredentialCapture: boolean;
  dismissWarningAcknowledged: boolean;
  eeDisclosed: boolean;
  onboardingComplete: boolean;
}

export type NixSeekerImprovementArea =
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "certifications"
  | "formatting"
  | "keywords"
  | "references"
  | "other";

export type NixSeekerPriority = "high" | "medium" | "low";
export type NixSeekerRankingPotential = "low" | "medium" | "strong";

export interface NixSeekerCvImprovement {
  area: NixSeekerImprovementArea;
  priority: NixSeekerPriority;
  finding: string;
  suggestion: string;
  example: string | null;
  rankingImpact: NixSeekerPriority;
}

export interface NixSeekerCvAssessment {
  overallScore: number;
  rankingPotential: NixSeekerRankingPotential;
  headline: string;
  strengths: string[];
  improvements: NixSeekerCvImprovement[];
  missingDocumentSuggestions: string[];
  keywordGaps: string[];
  rewriteSummary: string | null;
}

export interface NixGeneratedCvExperience {
  role: string;
  employer: string;
  period: string;
  location: string | null;
  bullets: string[];
}

export interface NixGeneratedCvReference {
  name: string;
  position: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
}

export interface NixGeneratedCv {
  fullName: string;
  headlineTitle: string;
  location: string | null;
  contact: { email: string | null; phone: string | null; linkedin: string | null };
  professionalSummary: string;
  coreCompetencies: string[];
  experience: NixGeneratedCvExperience[];
  education: string[];
  certifications: string[];
  professionalRegistrations: string[];
  keySkills: string[];
  references: NixGeneratedCvReference[];
  improvementsApplied: string[];
  closingNote: string | null;
}

export interface NixGeneratedCvResponse {
  cv: NixGeneratedCv | null;
  generatedAt: string | null;
}

export interface CandidateJobMatchDetails {
  embeddingSimilarity: number;
  skillsOverlap: number;
  skillsMatched: string[];
  skillsMissing: string[];
  experienceMatch: number;
  locationMatch: number;
  reasoning: string;
}

export interface CandidateJobMatch {
  id: number;
  candidateId: number;
  externalJobId: number;
  similarityScore: number;
  structuredScore: number;
  overallScore: number;
  matchDetails: CandidateJobMatchDetails | null;
  dismissed: boolean;
  externalJob?: ExternalJob;
  candidate?: Candidate;
  createdAt: string;
  updatedAt: string;
}

export type InterviewBookingStatus = "booked" | "cancelled";

export interface InterviewSlotBookingSummary {
  id: number;
  candidateId: number;
  status: InterviewBookingStatus;
  bookedAt: string;
  candidate?: {
    id: number;
    name: string | null;
    email: string | null;
  } | null;
}

export interface InterviewSlot {
  id: number;
  companyId: number;
  jobPostingId: number;
  startsAt: string;
  endsAt: string;
  locationLabel: string | null;
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
  capacity: number;
  notes: string | null;
  isCancelled: boolean;
  bookings?: InterviewSlotBookingSummary[];
  jobPosting?: {
    id: number;
    title: string;
    referenceNumber: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateInterviewSlotInput {
  startsAt: string;
  endsAt: string;
  locationLabel?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  capacity?: number;
  notes?: string | null;
}

export interface SeekerInterviewBooking {
  id: number;
  slotId: number;
  candidateId: number;
  status: InterviewBookingStatus;
  bookedAt: string;
  slot: {
    id: number;
    startsAt: string;
    endsAt: string;
    locationLabel: string | null;
    locationAddress: string | null;
    locationLat: number | null;
    locationLng: number | null;
    notes: string | null;
    jobPosting: {
      id: number;
      title: string;
      referenceNumber: string | null;
      companyId: number;
    } | null;
  } | null;
}

export interface SeekerInterviewInvite {
  id: number;
  token: string;
  candidateId: number;
  jobPostingId: number;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  jobPosting: {
    id: number;
    title: string;
    referenceNumber: string | null;
    location: string | null;
    province: string | null;
  } | null;
}

export interface SeekerInterviewEvent {
  id: number;
  applyClickId: number | null;
  externalJobId: number | null;
  companyName: string | null;
  roleTitle: string | null;
  startsAt: string;
  endsAt: string | null;
  locationLabel: string | null;
  locationAddress: string | null;
  notes: string | null;
  cancelledAt: string | null;
}

export interface CreateSeekerInterviewEventInput {
  applyClickId?: number | null;
  externalJobId?: number | null;
  companyName?: string | null;
  roleTitle?: string | null;
  startsAt: string;
  endsAt?: string | null;
  locationLabel?: string | null;
  locationAddress?: string | null;
  notes?: string | null;
}

export type UpdateSeekerInterviewEventInput = Omit<
  CreateSeekerInterviewEventInput,
  "applyClickId" | "externalJobId" | "startsAt"
> & { startsAt?: string };

export type SeekerEmploymentLifecycleStatus = "active" | "left";
export type SeekerEmploymentResearchStatus = "pending" | "researched" | "skipped" | "failed";

export interface SeekerEmploymentRecord {
  id: number;
  applyClickId: number | null;
  externalJobId: number | null;
  employerName: string;
  companyWebsiteUrl: string | null;
  roleTitle: string;
  roleOutline: string | null;
  startDate: string | null;
  endDate: string | null;
  status: SeekerEmploymentLifecycleStatus;
  researchStatus: SeekerEmploymentResearchStatus;
  researchedAt: string | null;
  appliedToCvAt: string | null;
}

export interface CreateSeekerEmploymentInput {
  applyClickId?: number | null;
  externalJobId?: number | null;
  employerName: string;
  companyWebsiteUrl?: string | null;
  roleTitle: string;
  roleOutline?: string | null;
  startDate: string;
}

export interface ReminderPreferences {
  phone: string | null;
  interviewReminderEmail: boolean;
  interviewReminderSms: boolean;
  interviewReminderWhatsapp: boolean;
  multiChannelReminders: boolean;
}

export interface UpdateReminderPreferencesInput {
  phone?: string | null;
  interviewReminderEmail?: boolean;
  interviewReminderSms?: boolean;
  interviewReminderWhatsapp?: boolean;
}

export interface NixCalendarAdvisoryConflict {
  bookingId: number;
  type: "overlap" | "insufficient-travel";
  prevSlot: {
    endsAt: string;
    locationLabel: string | null;
    locationAddress: string | null;
  };
  nextSlot: {
    startsAt: string;
    endsAt: string;
    locationLabel: string | null;
    locationAddress: string | null;
  };
  travelMinutes: number | null;
  gapMinutes: number;
}

export interface NixCalendarAdvisoryResponse {
  advisories: Array<{ bookingId: number; message: string }>;
}

export type EePopulationGroupKey =
  | "african_black"
  | "coloured"
  | "indian"
  | "white"
  | "prefer_not_to_say";
export type EeGenderKey = "female" | "male" | "other" | "prefer_not_to_say";
export type EeDisabilityKey = "yes" | "no" | "prefer_not_to_say";
export type EeTargetMetricKey =
  | "race_african_black"
  | "race_coloured"
  | "race_indian"
  | "female"
  | "disability";

export interface EeOccupationalLevelBreakdown {
  occupationalLevel: string;
  applicants: number;
  newHires: number;
  byPopulation: Record<EePopulationGroupKey, number>;
  byGender: Record<EeGenderKey, number>;
  byDisability: Record<EeDisabilityKey, number>;
}

export interface EeSectorTargetComparison {
  occupationalLevel: string;
  metric: EeTargetMetricKey;
  targetPercent: number;
  actualPercent: number;
  met: boolean;
  gazetteReference: string | null;
}

export interface MySeekerEeAttributes {
  populationGroup: EePopulationGroupKey;
  gender: EeGenderKey;
  disabilityStatus: EeDisabilityKey;
  requiresAccommodation: boolean;
  accommodationNotes: string | null;
  nationalityStatus:
    | "sa_citizen"
    | "sa_permanent_resident"
    | "foreign_national"
    | "prefer_not_to_say";
  consentTextVersionId: number;
  consentGrantedAt: string;
  purposes: Array<"ee_reporting" | "fairness_monitoring">;
}

export interface RegisterEeDisclosurePayload {
  populationGroup: EePopulationGroupKey;
  gender: EeGenderKey;
  disabilityStatus: EeDisabilityKey;
  requiresAccommodation: boolean;
  accommodationNotes?: string | null;
  nationalityStatus: MySeekerEeAttributes["nationalityStatus"];
  purposes: Array<"ee_reporting" | "fairness_monitoring">;
}

export interface UpdateMyEeAttributesInput {
  populationGroup: EePopulationGroupKey;
  gender: EeGenderKey;
  disabilityStatus: EeDisabilityKey;
  requiresAccommodation: boolean;
  accommodationNotes: string | null;
  nationalityStatus: MySeekerEeAttributes["nationalityStatus"];
  consentTextVersionId: number | null;
  purposes: Array<"ee_reporting" | "fairness_monitoring">;
}

export interface EeReportResponse {
  companyId: number;
  companyName: string;
  economicSector: string | null;
  isDesignatedEmployer: boolean;
  dateFrom: string;
  dateTo: string;
  totalApplicantsWithDisclosure: number;
  totalNewHiresWithDisclosure: number;
  byOccupationalLevel: EeOccupationalLevelBreakdown[];
  sectorTargetComparisons: EeSectorTargetComparison[];
  disabilityTarget: {
    targetPercent: number;
    actualPercent: number;
    sampleSize: number;
    met: boolean;
  };
  yearOverYear: {
    previousTotalApplicants: number;
    delta: number;
    deltaPercent: number | null;
  };
  generatedAt: string;
}

const apiClient: ApiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: annixOrbitTokenStore,
  refreshUrl: `${API_BASE_URL}/annix-orbit/auth/refresh`,
});

// Strip frontend-only fields (id, etc.) from nested arrays before PATCHing
// the wizard. The backend DTOs use forbidNonWhitelisted: true at the global
// validation pipe, so any extra property on a nested skill / metric /
// screening question fails the entire request with a 400 — silently
// surfacing as "Couldn't save — retrying" in the wizard.
const sanitizeWizardPayload = (payload: UpdateJobWizardPayload): UpdateJobWizardPayload => {
  const out: UpdateJobWizardPayload = { ...payload };
  if (payload.skills) {
    out.skills = payload.skills.map((s) => {
      const yearsExperience = s.yearsExperience;
      const evidenceRequired = s.evidenceRequired;
      return {
        name: s.name,
        importance: s.importance,
        proficiency: s.proficiency,
        yearsExperience: yearsExperience == null ? undefined : yearsExperience,
        evidenceRequired: evidenceRequired == null ? undefined : evidenceRequired,
        weight: s.weight,
        sortOrder: s.sortOrder,
      };
    });
  }
  if (payload.successMetrics) {
    out.successMetrics = payload.successMetrics.map((m) => ({
      timeframe: m.timeframe,
      metric: m.metric,
      sortOrder: m.sortOrder,
    }));
  }
  if (payload.screeningQuestions) {
    out.screeningQuestions = payload.screeningQuestions.map((q) => {
      const options = q.options;
      const disqualifyingAnswer = q.disqualifyingAnswer;
      return {
        question: q.question,
        questionType: q.questionType,
        options: options == null ? undefined : options,
        disqualifyingAnswer: disqualifyingAnswer == null ? undefined : disqualifyingAnswer,
        weight: q.weight,
        sortOrder: q.sortOrder,
      };
    });
  }
  return out;
};

export interface SeekerTierFeatures {
  applyToJobs: boolean;
  viewSalaries: boolean;
  nixCvBuilder: boolean;
  jobListingSite: boolean;
  multiChannelReminders?: boolean;
  photoCredentialCapture?: boolean;
}

export interface SeekerTierPricing {
  monthlyPrice: number | null;
  perNixRun: number | null;
  perCvBuild: number | null;
}

export interface SeekerTierPlan {
  tier: string;
  label: string;
  matchStrictness: string;
  maxJobResults: number | null;
  monthlyNixRuns: number | null;
  monthlyCvBuilds: number | null;
  features: SeekerTierFeatures;
  pricing: SeekerTierPricing | null;
  displayOrder: number;
}

export interface SeekerCvBuildQuota {
  unlimited: boolean;
  allowance: number | null;
  used: number;
  remaining: number | null;
  resetsAt: string;
}

export interface SeekerEntitlements {
  tier: string;
  label: string;
  features: SeekerTierFeatures;
  cvBuilds: SeekerCvBuildQuota;
}

class AnnixOrbitApiClient {
  setRememberMe(_remember: boolean) {
    // PortalTokenStore tracks rememberMe via setTokens; this no-op preserves the public API
  }

  private setTokens(accessToken: string, refreshToken: string) {
    annixOrbitTokenStore.setTokens(accessToken, refreshToken, annixOrbitTokenStore.rememberMe());
  }

  clearTokens() {
    annixOrbitTokenStore.clear();
  }

  isAuthenticated(): boolean {
    return annixOrbitTokenStore.isAuthenticated();
  }

  private request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return apiClient.request<T>(endpoint, options);
  }

  async login(dto: AnnixOrbitLoginDto): Promise<AnnixOrbitLoginResponse> {
    const response = await this.request<AnnixOrbitLoginResponse>("/annix-orbit/auth/login", {
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
    companyName: string;
    industry: string;
    companySize: string;
    province: string;
    city: string;
  }): Promise<{ message: string; user: AnnixOrbitUser }> {
    return this.request("/annix-orbit/auth/register", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async registerRecruiter(dto: {
    email: string;
    password: string;
    name: string;
    agencyName: string;
    province: string;
    city: string;
  }): Promise<{ message: string; user: AnnixOrbitUser }> {
    return this.request("/annix-orbit/auth/register/recruiter", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async clients(): Promise<OrbitClient[]> {
    return this.request("/annix-orbit/clients");
  }

  async clientById(id: number): Promise<OrbitClient> {
    return this.request(`/annix-orbit/clients/${id}`);
  }

  async createClient(data: OrbitClientInput): Promise<OrbitClient> {
    return this.request("/annix-orbit/clients", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: number, data: OrbitClientInput): Promise<OrbitClient> {
    return this.request(`/annix-orbit/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: number): Promise<void> {
    return this.request(`/annix-orbit/clients/${id}`, { method: "DELETE" });
  }

  async placements(): Promise<OrbitPlacement[]> {
    return this.request("/annix-orbit/placements");
  }

  async placementById(id: number): Promise<OrbitPlacement> {
    return this.request(`/annix-orbit/placements/${id}`);
  }

  async createPlacement(data: OrbitPlacementInput): Promise<OrbitPlacement> {
    return this.request("/annix-orbit/placements", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePlacement(id: number, data: OrbitPlacementInput): Promise<OrbitPlacement> {
    return this.request(`/annix-orbit/placements/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deletePlacement(id: number): Promise<void> {
    return this.request(`/annix-orbit/placements/${id}`, { method: "DELETE" });
  }

  async talentCandidates(): Promise<OrbitTalentCandidate[]> {
    return this.request("/annix-orbit/talent-candidates");
  }

  async talentCandidateById(id: number): Promise<OrbitTalentCandidate> {
    return this.request(`/annix-orbit/talent-candidates/${id}`);
  }

  async createTalentCandidate(data: OrbitTalentCandidateInput): Promise<OrbitTalentCandidate> {
    return this.request("/annix-orbit/talent-candidates", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTalentCandidate(
    id: number,
    data: OrbitTalentCandidateInput,
  ): Promise<OrbitTalentCandidate> {
    return this.request(`/annix-orbit/talent-candidates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteTalentCandidate(id: number): Promise<void> {
    return this.request(`/annix-orbit/talent-candidates/${id}`, { method: "DELETE" });
  }

  async submissions(): Promise<OrbitSubmission[]> {
    return this.request("/annix-orbit/submissions");
  }

  async createSubmission(data: OrbitSubmissionCreateInput): Promise<OrbitSubmission> {
    return this.request("/annix-orbit/submissions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateSubmission(id: number, data: OrbitSubmissionUpdateInput): Promise<OrbitSubmission> {
    return this.request(`/annix-orbit/submissions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteSubmission(id: number): Promise<void> {
    return this.request(`/annix-orbit/submissions/${id}`, { method: "DELETE" });
  }

  async registerIndividual(dto: {
    email: string;
    password: string;
    name: string;
    phone?: string | null;
    eeDisclosure?: RegisterEeDisclosurePayload | null;
  }): Promise<{ message: string; user: AnnixOrbitUser }> {
    return this.request("/annix-orbit/auth/register/individual", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async registerStudent(dto: {
    email: string;
    password: string;
    name: string;
    eeDisclosure?: RegisterEeDisclosurePayload | null;
  }): Promise<{ message: string; user: AnnixOrbitUser }> {
    return this.request("/annix-orbit/auth/register/student", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async verifyEmail(token: string): Promise<{
    message: string;
    userId: number;
    email: string;
    accessToken?: string;
    refreshToken?: string;
  }> {
    const response = await this.request<{
      message: string;
      userId: number;
      email: string;
      accessToken?: string;
      refreshToken?: string;
    }>(`/annix-orbit/auth/verify-email?token=${encodeURIComponent(token)}`);

    if (response.accessToken && response.refreshToken) {
      this.setTokens(response.accessToken, response.refreshToken);
    }

    return response;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request("/annix-orbit/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return this.request("/annix-orbit/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    return this.request("/annix-orbit/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request("/annix-orbit/auth/logout", { method: "POST" });
    } finally {
      this.clearTokens();
    }
  }

  async currentUser(): Promise<AnnixOrbitUserProfile> {
    return this.request<AnnixOrbitUserProfile>("/annix-orbit/auth/me");
  }

  async teamMembers(): Promise<
    Array<{ id: number; name: string; email: string; role: string; createdAt: string }>
  > {
    return this.request("/annix-orbit/auth/team");
  }

  async dashboardStats(): Promise<DashboardStats> {
    return this.request("/annix-orbit/dashboard/stats");
  }

  async topCandidates(): Promise<Candidate[]> {
    return this.request("/annix-orbit/dashboard/top-candidates");
  }

  async jobPostings(status?: string): Promise<JobPosting[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request(`/annix-orbit/job-postings${query}`);
  }

  async jobPostingById(id: number): Promise<JobPosting> {
    return this.request(`/annix-orbit/job-postings/${id}`);
  }

  async createJobPosting(data: Partial<JobPosting>): Promise<JobPosting> {
    return this.request("/annix-orbit/job-postings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateJobPosting(id: number, data: Partial<JobPosting>): Promise<JobPosting> {
    return this.request(`/annix-orbit/job-postings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteJobPosting(id: number): Promise<void> {
    return this.request(`/annix-orbit/job-postings/${id}`, { method: "DELETE" });
  }

  async activateJobPosting(id: number): Promise<JobPosting> {
    return this.request(`/annix-orbit/job-postings/${id}/activate`, { method: "POST" });
  }

  async pauseJobPosting(id: number): Promise<JobPosting> {
    return this.request(`/annix-orbit/job-postings/${id}/pause`, { method: "POST" });
  }

  async closeJobPosting(id: number): Promise<JobPosting> {
    return this.request(`/annix-orbit/job-postings/${id}/close`, { method: "POST" });
  }

  // Phase 1 wizard
  async createJobDraft(): Promise<JobPosting> {
    return this.request("/annix-orbit/job-postings/draft", { method: "POST" });
  }

  async jobWizardDraft(id: number): Promise<JobPosting> {
    return this.request(`/annix-orbit/job-postings/${id}/wizard`);
  }

  async updateJobWizard(id: number, payload: UpdateJobWizardPayload): Promise<JobPosting> {
    return this.request(`/annix-orbit/job-postings/${id}/wizard`, {
      method: "PATCH",
      body: JSON.stringify(sanitizeWizardPayload(payload)),
    });
  }

  async publishJobDraft(id: number, options: { testMode?: boolean } = {}): Promise<JobPosting> {
    return this.request(`/annix-orbit/job-postings/${id}/publish`, {
      method: "POST",
      body: JSON.stringify({ testMode: Boolean(options.testMode) }),
    });
  }

  async seedTestCandidates(
    id: number,
    count: number,
  ): Promise<{ created: number; byProfile: Record<string, number> }> {
    return this.request(`/annix-orbit/job-postings/${id}/seed-test-candidates`, {
      method: "POST",
      body: JSON.stringify({ count }),
    });
  }

  async clearTestCandidates(id: number): Promise<{ deleted: number }> {
    return this.request(`/annix-orbit/job-postings/${id}/test-candidates`, {
      method: "DELETE",
    });
  }

  async listEmailTemplates(): Promise<CvEmailTemplate[]> {
    return this.request("/annix-orbit/email-templates");
  }

  async getEmailTemplate(kind: CvEmailTemplateKind): Promise<CvEmailTemplate> {
    return this.request(`/annix-orbit/email-templates/${kind}`);
  }

  async updateEmailTemplate(
    kind: CvEmailTemplateKind,
    payload: { subject: string; bodyHtml: string; bodyText: string },
  ): Promise<CvEmailTemplate> {
    return this.request(`/annix-orbit/email-templates/${kind}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async resetEmailTemplate(kind: CvEmailTemplateKind): Promise<CvEmailTemplate> {
    return this.request(`/annix-orbit/email-templates/${kind}`, {
      method: "DELETE",
    });
  }

  async nixDraftEmailTemplate(
    kind: CvEmailTemplateKind,
    instructions?: string,
  ): Promise<{ subject: string; bodyHtml: string; bodyText: string }> {
    return this.request(`/annix-orbit/email-templates/${kind}/nix-draft`, {
      method: "POST",
      body: JSON.stringify(instructions ? { instructions } : {}),
    });
  }

  // Phase 2 Nix endpoints
  async nixTitleSuggestions(
    id: number,
    title?: string,
  ): Promise<{
    normalizedTitle: string;
    suggestedTitles: string[];
    seniorityLevel: string | null;
    titleQualityScore: number;
    warning: string | null;
    samplePreview: string;
    sampleResponsibilities: string[];
    scoreReason: string;
    improvementTips: string[];
  }> {
    return this.request(`/annix-orbit/job-postings/${id}/nix/title-suggestions`, {
      method: "POST",
      body: JSON.stringify(title ? { title } : {}),
    });
  }

  async nixOutcomesDraft(id: number): Promise<{
    mainPurpose: string;
    companyContext: string;
    description: string;
    successIn3Months: string[];
    successIn12Months: string[];
  }> {
    return this.request(`/annix-orbit/job-postings/${id}/nix/outcomes-draft`, {
      method: "POST",
    });
  }

  async nixDescription(id: number): Promise<{
    candidateFacingDescription: string;
    responsibilities: string[];
    requirements: string[];
    successMetrics: string[];
    missingInformation: string[];
    improvementSuggestions: string[];
  }> {
    return this.request(`/annix-orbit/job-postings/${id}/nix/description`, {
      method: "POST",
    });
  }

  async nixRequirementsSuggestions(id: number): Promise<{
    minExperienceYears: number | null;
    requiredEducation: string | null;
    requiredCertifications: string[];
    reasoning: string | null;
  }> {
    return this.request(`/annix-orbit/job-postings/${id}/nix/requirements-suggestions`, {
      method: "POST",
    });
  }

  async nixSkillSuggestions(id: number): Promise<{
    skills: Array<{
      name: string;
      importance: "required" | "preferred";
      proficiency: "basic" | "intermediate" | "advanced" | "expert";
      yearsExperience: number | null;
      evidenceRequired: string | null;
      reasoning: string | null;
    }>;
    notes: string[];
    minExperienceYears: number | null;
    requiredEducation: string | null;
    requiredCertifications: string[];
  }> {
    return this.request(`/annix-orbit/job-postings/${id}/nix/skill-suggestions`, {
      method: "POST",
    });
  }

  async nixQualityScore(id: number): Promise<{
    totalScore: number;
    clarity: number;
    salaryCompetitiveness: number;
    candidateAttraction: number;
    screeningStrength: number;
    matchingReadiness: number;
    inclusivity: number;
    criticalIssues: string[];
    recommendedFixes: string[];
    flaggedTerms: Array<{
      term: string;
      category: "gendered" | "age_coded" | "ableist" | "national_origin" | "other";
      replacement: string;
      explanation: string;
    }>;
    readyToPost: boolean;
  }> {
    return this.request(`/annix-orbit/job-postings/${id}/nix/quality-score`, {
      method: "POST",
    });
  }

  async nixScreeningQuestionsSuggest(id: number): Promise<{
    questions: Array<{
      question: string;
      questionType: "yes_no" | "short_text" | "multiple_choice" | "numeric";
      options?: string[];
      disqualifyingAnswer?: string | null;
      weight: number;
      reasoning: string;
    }>;
    notes: string[];
  }> {
    return this.request(`/annix-orbit/job-postings/${id}/nix/screening-questions`, {
      method: "POST",
    });
  }

  async nixSalaryGuidance(id: number): Promise<{
    suggestedMin: number;
    suggestedMax: number;
    marketMedian: number;
    competitiveness: "low" | "medium" | "strong";
    confidence: number;
    warnings: string[];
    explanation: string;
  }> {
    return this.request(`/annix-orbit/job-postings/${id}/nix/salary-guidance`, {
      method: "POST",
    });
  }

  async nixSourcingQueries(id: number): Promise<{
    linkedin: string;
    indeed: string;
    google: string;
    explanations: string[];
  }> {
    return this.request(`/annix-orbit/job-postings/${id}/nix/sourcing-queries`, {
      method: "POST",
    });
  }

  async nixPredictedVolume(id: number): Promise<{
    expectedApplicants: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
    factors: string[];
    warnings: string[];
  }> {
    return this.request(`/annix-orbit/job-postings/${id}/nix/predicted-volume`, {
      method: "POST",
    });
  }

  async salaryInsights(params: { normalizedTitle: string; province?: string | null }): Promise<{
    normalizedTitle: string;
    province: string | null;
    p25?: number | null;
    p50?: number | null;
    p75?: number | null;
    sampleSize: number;
    confidence?: number;
    source: string | null;
    updatedAt?: string;
    attribution: string | null;
  }> {
    const search = new URLSearchParams({ normalizedTitle: params.normalizedTitle });
    if (params.province) search.set("province", params.province);
    return this.request(`/annix-orbit/job-postings/salary-insights?${search.toString()}`);
  }

  async candidates(filters?: { status?: string; jobPostingId?: number }): Promise<Candidate[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.jobPostingId) params.append("jobPostingId", String(filters.jobPostingId));
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/annix-orbit/candidates${query}`);
  }

  async candidateById(id: number): Promise<Candidate> {
    return this.request(`/annix-orbit/candidates/${id}`);
  }

  async updateCandidateStatus(
    id: number,
    dto: { status: string; reason?: string | null },
  ): Promise<Candidate> {
    return this.request(`/annix-orbit/candidates/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status: dto.status,
        ...(dto.reason ? { reason: dto.reason } : {}),
      }),
    });
  }

  async candidateCvUrl(id: number): Promise<{ url: string | null }> {
    return this.request(`/annix-orbit/candidates/${id}/cv-url`);
  }

  async rejectCandidate(id: number): Promise<void> {
    return this.request(`/annix-orbit/candidates/${id}/reject`, { method: "POST" });
  }

  async shortlistCandidate(id: number): Promise<void> {
    return this.request(`/annix-orbit/candidates/${id}/shortlist`, { method: "POST" });
  }

  async acceptCandidate(id: number): Promise<void> {
    return this.request(`/annix-orbit/candidates/${id}/accept`, { method: "POST" });
  }

  async sendReferenceRequests(candidateId: number): Promise<{ message: string }> {
    return this.request(`/annix-orbit/candidates/${candidateId}/send-reference-requests`, {
      method: "POST",
    });
  }

  async uploadCv(
    file: File,
    jobPostingId: number,
    email?: string,
    name?: string,
  ): Promise<Candidate> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("jobPostingId", String(jobPostingId));
    if (email) formData.append("email", email);
    if (name) formData.append("name", name);

    return apiClient.uploadFile<Candidate>("/annix-orbit/candidates/upload", file, {
      jobPostingId: String(jobPostingId),
      ...(email ? { email } : {}),
      ...(name ? { name } : {}),
    });
  }

  async references(status?: string): Promise<CandidateReference[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request(`/annix-orbit/references${query}`);
  }

  async pendingReferences(): Promise<CandidateReference[]> {
    return this.request("/annix-orbit/references/pending");
  }

  async completedReferences(): Promise<CandidateReference[]> {
    return this.request("/annix-orbit/references/completed");
  }

  async settings(): Promise<CompanySettings> {
    return this.request("/annix-orbit/settings");
  }

  async updateImapSettings(data: {
    imapHost?: string;
    imapPort?: number;
    imapUser?: string;
    imapPassword?: string;
    monitoringEnabled?: boolean;
    emailFromAddress?: string;
  }): Promise<{ message: string }> {
    return this.request("/annix-orbit/settings/imap", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async updateCompanySettings(data: UpdateCompanySettingsInput): Promise<{ message: string }> {
    return this.request("/annix-orbit/settings/company", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async testImapConnection(data: {
    host: string;
    port: number;
    user: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.request("/annix-orbit/settings/test-imap", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async validateReferenceToken(token: string): Promise<{
    valid: boolean;
    message?: string;
    candidateName?: string;
    jobTitle?: string;
    referenceName?: string;
  }> {
    return this.request(`/annix-orbit/reference-feedback/${token}`);
  }

  async submitReferenceFeedback(
    token: string,
    rating: number,
    feedbackText?: string | null,
  ): Promise<{ message: string }> {
    return this.request(`/annix-orbit/reference-feedback/${token}`, {
      method: "POST",
      body: JSON.stringify({ rating, feedbackText }),
    });
  }

  async jobMarketProviders(): Promise<JobSourceProviderInfo[]> {
    return this.request("/annix-orbit/job-market/providers");
  }

  async jobMarketSources(): Promise<JobMarketSource[]> {
    return this.request("/annix-orbit/job-market/sources");
  }

  async createJobMarketSource(data: CreateJobMarketSourceDto): Promise<JobMarketSource> {
    return this.request("/annix-orbit/job-market/sources", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateJobMarketSource(
    id: number,
    data: UpdateJobMarketSourceDto,
  ): Promise<JobMarketSource> {
    return this.request(`/annix-orbit/job-market/sources/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteJobMarketSource(id: number): Promise<{ message: string }> {
    return this.request(`/annix-orbit/job-market/sources/${id}`, { method: "DELETE" });
  }

  async triggerIngestion(sourceId: number): Promise<{ ingested: number; skipped: number }> {
    return this.request(`/annix-orbit/job-market/sources/${sourceId}/ingest`, {
      method: "POST",
    });
  }

  async externalJobs(filters?: {
    country?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ jobs: ExternalJob[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.country) params.append("country", filters.country);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.limit) params.append("limit", String(filters.limit));
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/annix-orbit/job-market/jobs${query}`);
  }

  async externalJobById(id: number): Promise<ExternalJob> {
    return this.request(`/annix-orbit/job-market/jobs/${id}`);
  }

  async jobMarketStats(): Promise<JobMarketStats> {
    return this.request("/annix-orbit/job-market/stats");
  }

  async recommendedJobsForCandidate(candidateId: number): Promise<CandidateJobMatch[]> {
    return this.request(`/annix-orbit/job-market/candidates/${candidateId}/recommended-jobs`);
  }

  async triggerCandidateMatch(candidateId: number): Promise<{ matched: number }> {
    return this.request(`/annix-orbit/job-market/candidates/${candidateId}/match`, {
      method: "POST",
    });
  }

  async matchingCandidatesForJob(jobId: number): Promise<CandidateJobMatch[]> {
    return this.request(`/annix-orbit/job-market/jobs/${jobId}/matching-candidates`);
  }

  async triggerJobMatch(jobId: number): Promise<{ matched: number }> {
    return this.request(`/annix-orbit/job-market/jobs/${jobId}/match`, { method: "POST" });
  }

  async dismissMatch(matchId: number): Promise<{ message: string }> {
    return this.request(`/annix-orbit/job-market/matches/${matchId}/dismiss`, {
      method: "POST",
    });
  }

  async updateCandidateProfile(
    id: number,
    data: { beeLevel?: number | null; popiaConsent?: boolean; jobAlertsOptIn?: boolean },
  ): Promise<Candidate> {
    return this.request(`/annix-orbit/candidates/${id}/profile`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async eraseCandidateData(id: number): Promise<{ message: string }> {
    return this.request(`/annix-orbit/candidates/${id}/erasure`, { method: "DELETE" });
  }

  async popiaRetentionStats(): Promise<PopiaRetentionStats> {
    return this.request("/annix-orbit/candidates/popia/retention-stats");
  }

  async marketInsights(): Promise<MarketInsights> {
    return this.request("/annix-orbit/dashboard/market-insights");
  }

  async analyticsConversionFunnel(
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ConversionFunnelResponse> {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const qs = params.toString();
    return this.request<ConversionFunnelResponse>(
      `/annix-orbit/analytics/funnel${qs ? `?${qs}` : ""}`,
    );
  }

  async analyticsMatchAccuracy(): Promise<MatchAccuracyResponse> {
    return this.request<MatchAccuracyResponse>("/annix-orbit/analytics/match-accuracy");
  }

  async analyticsTimeToFill(): Promise<TimeToFillResponse> {
    return this.request<TimeToFillResponse>("/annix-orbit/analytics/time-to-fill");
  }

  async analyticsMarketTrends(): Promise<MarketTrendsResponse> {
    return this.request<MarketTrendsResponse>("/annix-orbit/analytics/market-trends");
  }

  async analyticsExportFunnelCsv(
    dateFrom?: string | null,
    dateTo?: string | null,
  ): Promise<string> {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const qs = params.toString();
    const blob = await apiClient.requestBlob(
      `/annix-orbit/analytics/export/funnel${qs ? `?${qs}` : ""}`,
    );
    return blob.text();
  }

  async analyticsExportTimeToFillCsv(): Promise<string> {
    const blob = await apiClient.requestBlob("/annix-orbit/analytics/export/time-to-fill");
    return blob.text();
  }

  async notificationVapidKey(): Promise<{ key: string | null }> {
    return this.request("/annix-orbit/notifications/vapid-key");
  }

  async subscribePush(subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }): Promise<{ message: string }> {
    return this.request("/annix-orbit/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription),
    });
  }

  async unsubscribePush(endpoint: string): Promise<{ message: string }> {
    return this.request("/annix-orbit/notifications/unsubscribe", {
      method: "DELETE",
      body: JSON.stringify({ endpoint }),
    });
  }

  async notificationPreferences(): Promise<NotificationPreferences> {
    return this.request("/annix-orbit/notifications/preferences");
  }

  async updateNotificationPreferences(
    data: Partial<NotificationPreferences>,
  ): Promise<{ message: string }> {
    return this.request("/annix-orbit/notifications/preferences", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async myProfileStatus(): Promise<IndividualProfileStatus> {
    return this.request("/annix-orbit/me/profile/status");
  }

  async acknowledgeDismissWarning(): Promise<{ acknowledgedAt: string }> {
    return this.request("/annix-orbit/me/dismiss-warning/acknowledge", { method: "POST" });
  }

  async completeOnboarding(): Promise<{ onboardingCompletedAt: string }> {
    return this.request("/annix-orbit/me/onboarding/complete", { method: "POST" });
  }

  async sendAppLink(): Promise<{ sent: boolean; email: string }> {
    return this.request("/annix-orbit/me/send-app-link", { method: "POST" });
  }

  async myDocuments(): Promise<IndividualDocument[]> {
    return this.request("/annix-orbit/me/documents");
  }

  async uploadMyDocument(
    file: File,
    kind: IndividualDocumentKind,
    label?: string | null,
    onProgress?: (fraction: number) => void,
  ): Promise<IndividualDocument> {
    const params: Record<string, string> = { kind };
    if (label) params.label = label;
    return apiClient.uploadFile<IndividualDocument>(
      "/annix-orbit/me/documents",
      file,
      params,
      onProgress,
    );
  }

  async uploadMyDocumentPhoto(
    file: File,
    kind: IndividualDocumentKind,
    onProgress?: (fraction: number) => void,
  ): Promise<IndividualDocument> {
    return apiClient.uploadFile<IndividualDocument>(
      "/annix-orbit/me/documents",
      file,
      { kind, source: "photo" },
      onProgress,
    );
  }

  async updateMyDocumentCredentialFields(
    id: number,
    fields: Partial<CredentialFields>,
  ): Promise<IndividualDocument> {
    return this.request(`/annix-orbit/me/documents/${id}/credential-fields`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    });
  }

  async deleteMyDocument(id: number): Promise<{ message: string }> {
    return this.request(`/annix-orbit/me/documents/${id}`, { method: "DELETE" });
  }

  async myNotificationPreferences(): Promise<IndividualNotificationPreferences> {
    return this.request("/annix-orbit/me/notification-preferences");
  }

  async updateMyNotificationPreferences(
    data: Partial<IndividualNotificationPreferences>,
  ): Promise<IndividualNotificationPreferences> {
    return this.request("/annix-orbit/me/notification-preferences", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async myDataExport(): Promise<IndividualDataExport> {
    return this.request("/annix-orbit/me/data-export");
  }

  async requestMyAccountDeletion(): Promise<{ message: string; email: string }> {
    return this.request("/annix-orbit/me/account/request-delete", {
      method: "POST",
    });
  }

  async confirmMyAccountDeletion(token: string): Promise<{ message: string }> {
    return this.request("/annix-orbit/public/account/confirm-delete", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  async withdrawMyConsent(): Promise<{ message: string; erasedCandidates: number }> {
    return this.request("/annix-orbit/me/withdraw-consent", { method: "POST" });
  }

  async myEeAttributes(): Promise<MySeekerEeAttributes | null> {
    return this.request("/annix-orbit/me/ee-attributes");
  }

  async updateMyEeAttributes(
    input: UpdateMyEeAttributesInput,
  ): Promise<{ updated: number; consentTextVersionId: number }> {
    return this.request("/annix-orbit/me/ee-attributes", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async deleteMyEeAttributes(): Promise<{ tombstoned: number }> {
    return this.request("/annix-orbit/me/ee-attributes", { method: "DELETE" });
  }

  async nixWizardCvImprovements(): Promise<NixSeekerCvAssessment> {
    return this.request("/annix-orbit/me/nix-wizard/cv-improvements", { method: "POST" });
  }

  async nixWizardGenerateCv(): Promise<NixGeneratedCv> {
    return this.request("/annix-orbit/me/nix-wizard/generate-cv", { method: "POST" });
  }

  async nixWizardGeneratedCv(): Promise<NixGeneratedCvResponse> {
    return this.request("/annix-orbit/me/nix-wizard/generated-cv");
  }

  async nixWizardUpdateGeneratedCv(cv: NixGeneratedCv): Promise<NixGeneratedCv> {
    return this.request("/annix-orbit/me/nix-wizard/generated-cv", {
      method: "PATCH",
      body: JSON.stringify(cv),
    });
  }

  async nixWizardGeneratedCvPdf(): Promise<Blob> {
    return apiClient.requestBlob("/annix-orbit/me/nix-wizard/generated-cv/pdf");
  }

  async nixWizardAdoptCv(): Promise<{ candidateId: number | null }> {
    return this.request("/annix-orbit/me/nix-wizard/adopt-cv", { method: "POST" });
  }

  async candidateDataExport(candidateId: number): Promise<unknown> {
    return this.request(`/annix-orbit/candidates/${candidateId}/data-export`);
  }

  async publicJobs(params?: {
    page?: number;
    limit?: number;
    search?: string;
    country?: string;
    category?: string;
  }): Promise<{ jobs: PublicJob[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.page != null) query.append("page", String(params.page));
    if (params?.limit != null) query.append("limit", String(params.limit));
    if (params?.search) query.append("search", params.search);
    if (params?.country) query.append("country", params.country);
    if (params?.category) query.append("category", params.category);
    const queryString = query.toString();
    const suffix = queryString ? `?${queryString}` : "";
    return this.request(`/annix-orbit/public/jobs${suffix}`);
  }

  async publicJobPosting(referenceNumber: string): Promise<PublicJobPosting> {
    const safeRef = encodeURIComponent(referenceNumber);
    return this.request(`/annix-orbit/public/job-postings/${safeRef}`);
  }

  async portalAdapters(): Promise<PortalAdapterSummary[]> {
    return this.request("/annix-orbit/portal-adapters");
  }

  async assistedPostingPack(jobPostingId: number): Promise<AssistedPostingPackEntry[]> {
    return this.request(`/annix-orbit/job-postings/${jobPostingId}/assisted-posting-pack`);
  }

  async interviewSlotsForCompany(fromIso?: string | null): Promise<InterviewSlot[]> {
    const suffix = fromIso ? `?from=${encodeURIComponent(fromIso)}` : "";
    return this.request(`/annix-orbit/interview-slots${suffix}`);
  }

  async interviewSlotsForJob(jobPostingId: number): Promise<InterviewSlot[]> {
    return this.request(`/annix-orbit/interview-slots/by-job/${jobPostingId}`);
  }

  async createInterviewSlot(
    jobPostingId: number,
    input: CreateInterviewSlotInput,
  ): Promise<InterviewSlot> {
    return this.request(`/annix-orbit/interview-slots/by-job/${jobPostingId}`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async deleteInterviewSlot(slotId: number): Promise<{ deleted: boolean }> {
    return this.request(`/annix-orbit/interview-slots/${slotId}`, { method: "DELETE" });
  }

  async sendInterviewInvite(candidateId: number): Promise<{ sent: boolean; bookingLink: string }> {
    return this.request(`/annix-orbit/interview-slots/invite/${candidateId}`, { method: "POST" });
  }

  async myInterviewBookings(): Promise<SeekerInterviewBooking[]> {
    return this.request("/annix-orbit/me/interview-bookings");
  }

  async myInterviewInvites(): Promise<SeekerInterviewInvite[]> {
    return this.request("/annix-orbit/me/interview-invites");
  }

  async calendarAdvisory(
    conflicts: NixCalendarAdvisoryConflict[],
  ): Promise<NixCalendarAdvisoryResponse> {
    return this.request("/annix-orbit/me/calendar-advisory", {
      method: "POST",
      body: JSON.stringify({ conflicts }),
    });
  }

  async complianceEeReport(dateFrom: string, dateTo: string): Promise<EeReportResponse> {
    const query = new URLSearchParams({ dateFrom, dateTo });
    return this.request<EeReportResponse>(`/annix-orbit/compliance/ee-report?${query.toString()}`);
  }

  complianceEeReportCsvUrl(dateFrom: string, dateTo: string): string {
    const query = new URLSearchParams({ dateFrom, dateTo });
    return `${API_BASE_URL}/annix-orbit/compliance/ee-report.csv?${query.toString()}`;
  }

  complianceEeReportPdfUrl(dateFrom: string, dateTo: string): string {
    const query = new URLSearchParams({ dateFrom, dateTo });
    return `${API_BASE_URL}/annix-orbit/compliance/ee-report.pdf?${query.toString()}`;
  }

  async seekerRecommendedJobs(
    filters: SeekerRecommendedFilters = {},
  ): Promise<SeekerRecommendedJobsResponse> {
    const params = new URLSearchParams();
    if (filters.province) params.set("province", filters.province);
    if (filters.city) params.set("city", filters.city);
    if (filters.category) params.set("category", filters.category);
    if (filters.minSalary) params.set("minSalary", filters.minSalary);
    if (filters.search) params.set("search", filters.search);
    const qs = params.toString();
    return this.request(`/annix-orbit/seeker/jobs/recommended${qs ? `?${qs}` : ""}`);
  }

  async seekerColdStartJobs(): Promise<SeekerColdStartJobsResponse> {
    return this.request("/annix-orbit/seeker/jobs/cold-start");
  }

  async dismissSeekerMatch(matchId: number, reason?: string): Promise<{ success: boolean }> {
    return this.request(`/annix-orbit/seeker/jobs/${matchId}/dismiss`, {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {}),
      headers: { "Content-Type": "application/json" },
    });
  }

  async listSeekerDismissReasons(): Promise<SeekerDismissReason[]> {
    return this.request("/annix-orbit/seeker/jobs/dismiss-reasons");
  }

  async reportJobDelisted(externalJobId: number): Promise<{ success: boolean }> {
    return this.request("/annix-orbit/seeker/jobs/delist", {
      method: "POST",
      body: JSON.stringify({ externalJobId }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async triggerSeekerRematch(): Promise<SeekerRematchResponse> {
    return this.request("/annix-orbit/seeker/jobs/rematch", { method: "POST" });
  }

  async seekerJobSearchEstimate(): Promise<{ estimatedDurationMs: number }> {
    return this.request("/annix-orbit/seeker/jobs/search-estimate");
  }

  async withdrawSeekerMatching(): Promise<{ candidatesAffected: number; matchesCleared: number }> {
    return this.request("/annix-orbit/seeker/jobs/withdraw-matching", { method: "POST" });
  }

  async seekerJobStats(): Promise<SeekerJobStats> {
    return this.request("/annix-orbit/seeker/jobs/stats");
  }

  async tierPlans(): Promise<SeekerTierPlan[]> {
    return this.request("/annix-orbit/public/tier-plans");
  }

  async seekerEntitlements(): Promise<SeekerEntitlements> {
    return this.request("/annix-orbit/seeker/jobs/entitlements");
  }

  async selectSeekerPlan(tier: string): Promise<SeekerEntitlements> {
    return this.request("/annix-orbit/seeker/jobs/plan", {
      method: "POST",
      body: JSON.stringify({ tier }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async seekerMatchingConsent(): Promise<SeekerMatchingConsentStatus> {
    return this.request("/annix-orbit/seeker/jobs/consent");
  }

  async grantSeekerMatchingConsent(): Promise<{ candidatesAffected: number }> {
    return this.request("/annix-orbit/seeker/jobs/consent", { method: "POST" });
  }

  async recordSeekerApplyClick(input: {
    matchId: number | null;
    externalJobId: number | null;
    sourceUrl: string | null;
  }): Promise<{ recorded: boolean; clickId: number | null }> {
    return this.request("/annix-orbit/seeker/jobs/clicks", {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    });
  }

  async muteSeekerCompany(company: string): Promise<{ created: boolean; mute: SeekerMute }> {
    return this.request("/annix-orbit/seeker/jobs/mute-company", {
      method: "POST",
      body: JSON.stringify({ company }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async muteSeekerCategory(category: string): Promise<{ created: boolean; mute: SeekerMute }> {
    return this.request("/annix-orbit/seeker/jobs/mute-category", {
      method: "POST",
      body: JSON.stringify({ category }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async listSeekerMutes(): Promise<{ mutes: SeekerMute[] }> {
    return this.request("/annix-orbit/seeker/jobs/mutes");
  }

  async revokeSeekerMute(muteId: number): Promise<{ success: boolean }> {
    return this.request(`/annix-orbit/seeker/jobs/mutes/${muteId}`, { method: "DELETE" });
  }

  async seekerWorkProfile(): Promise<{
    profile: import("@annix/product-data/sa-market").WorkProfile;
    candidateIds: number[];
    suggestedSalaryMin: number | null;
    suggestedSalaryMax: number | null;
  }> {
    return this.request("/annix-orbit/seeker/work-profile");
  }

  async upsertSeekerWorkProfile(
    profile: import("@annix/product-data/sa-market").WorkProfile,
  ): Promise<{ saved: boolean; candidateIds: number[] }> {
    return this.request("/annix-orbit/seeker/work-profile", {
      method: "PUT",
      body: JSON.stringify(profile),
      headers: { "Content-Type": "application/json" },
    });
  }

  async autofillSeekerWorkProfileFromCv(): Promise<{
    extracted: boolean;
    profile: import("@annix/product-data/sa-market").WorkProfile;
    candidateIds: number[];
    reason?: "no-candidate" | "no-cv-text" | "ai-failed";
  }> {
    return this.request("/annix-orbit/seeker/work-profile/extract-from-cv", {
      method: "POST",
    });
  }

  async listSeekerCredentials(): Promise<{ credentials: SeekerCredential[] }> {
    return this.request("/annix-orbit/me/credentials");
  }

  async createSeekerCredential(
    input: SeekerCredentialInput,
  ): Promise<{ credential: SeekerCredential }> {
    return this.request("/annix-orbit/me/credentials", {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    });
  }

  async updateSeekerCredential(
    id: number,
    input: Partial<SeekerCredentialInput>,
  ): Promise<{ credential: SeekerCredential }> {
    return this.request(`/annix-orbit/me/credentials/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    });
  }

  async deleteSeekerCredential(id: number): Promise<{ success: boolean }> {
    return this.request(`/annix-orbit/me/credentials/${id}`, { method: "DELETE" });
  }

  async autofillSeekerCredentialsFromCv(): Promise<{
    created: number;
    credentials: SeekerCredential[];
    reason?: "no-candidate" | "no-cv-text" | "no-credential-keywords" | "ai-failed";
  }> {
    return this.request("/annix-orbit/me/credentials/extract-from-cv", {
      method: "POST",
    });
  }

  async extractCredentialFromDocument(file: File): Promise<ExtractedCredentialDocument> {
    return apiClient.uploadFile<ExtractedCredentialDocument>(
      "/annix-orbit/me/credentials/extract-from-document",
      file,
    );
  }

  async listCredentialTypes(): Promise<{ types: OrbitCredentialTypeOption[] }> {
    return this.request("/annix-orbit/me/credentials/types");
  }

  async listMyApplications(): Promise<{ applications: SeekerApplication[] }> {
    return this.request("/annix-orbit/me/applications");
  }

  async updateMyApplication(
    id: number,
    input: UpdateSeekerApplicationInput,
  ): Promise<{ success: boolean }> {
    return this.request(`/annix-orbit/me/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    });
  }

  async deleteMyApplication(id: number): Promise<{ success: boolean }> {
    return this.request(`/annix-orbit/me/applications/${id}`, { method: "DELETE" });
  }

  async listMyInterviewEvents(): Promise<{ events: SeekerInterviewEvent[] }> {
    return this.request("/annix-orbit/me/interview-events");
  }

  async createMyInterviewEvent(
    input: CreateSeekerInterviewEventInput,
  ): Promise<{ event: SeekerInterviewEvent }> {
    return this.request("/annix-orbit/me/interview-events", {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    });
  }

  async updateMyInterviewEvent(
    id: number,
    input: UpdateSeekerInterviewEventInput,
  ): Promise<{ event: SeekerInterviewEvent }> {
    return this.request(`/annix-orbit/me/interview-events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    });
  }

  async deleteMyInterviewEvent(id: number): Promise<{ success: boolean }> {
    return this.request(`/annix-orbit/me/interview-events/${id}`, { method: "DELETE" });
  }

  async listMyEmployment(): Promise<{ records: SeekerEmploymentRecord[] }> {
    return this.request("/annix-orbit/me/employment");
  }

  async createMyEmployment(
    input: CreateSeekerEmploymentInput,
  ): Promise<{ record: SeekerEmploymentRecord }> {
    return this.request("/annix-orbit/me/employment", {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    });
  }

  async reactivateJobSearch(): Promise<{ refreshed: number }> {
    return this.request("/annix-orbit/me/employment/reactivate", { method: "POST" });
  }

  async calendarFeedToken(): Promise<{ token: string }> {
    return this.request("/annix-orbit/me/calendar/feed");
  }

  async reminderPreferences(): Promise<ReminderPreferences> {
    return this.request("/annix-orbit/me/reminder-preferences");
  }

  async updateReminderPreferences(
    input: UpdateReminderPreferencesInput,
  ): Promise<ReminderPreferences> {
    return this.request("/annix-orbit/me/reminder-preferences", {
      method: "PATCH",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    });
  }

  async seekerEducation(): Promise<SeekerEducationResponse> {
    return this.request("/annix-orbit/education/me");
  }

  async upsertSeekerEducation(
    input: SeekerEducationInput,
  ): Promise<{ profile: SeekerEducationProfile }> {
    return this.request("/annix-orbit/education/me", {
      method: "PUT",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    });
  }

  async addSeekerEducationResult(
    input: SeekerEducationResultInput,
  ): Promise<{ result: SeekerEducationResult }> {
    return this.request("/annix-orbit/education/me/results", {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    });
  }

  async deleteSeekerEducationResult(id: string): Promise<{ deleted: boolean }> {
    return this.request(`/annix-orbit/education/me/results/${id}`, { method: "DELETE" });
  }

  async recordSeekerEducationConsent(): Promise<{ consent: SeekerEducationConsent }> {
    return this.request("/annix-orbit/education/me/consent", { method: "POST" });
  }

  async inviteSeekerEducationGuardian(
    guardianEmail: string,
  ): Promise<{ guardianLink: SeekerEducationGuardianLink }> {
    return this.request("/annix-orbit/education/me/guardian-invite", {
      method: "POST",
      body: JSON.stringify({ guardianEmail }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async askSeekerEducationMentor(question: string): Promise<SeekerEducationMentorAnswer> {
    return this.request("/annix-orbit/education/me/mentor", {
      method: "POST",
      body: JSON.stringify({ question }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async seekerEducationRecommendations(
    intakeYear?: number,
  ): Promise<SeekerEducationRecommendationsResponse> {
    const query = intakeYear ? `?intakeYear=${intakeYear}` : "";
    return this.request(`/annix-orbit/education/me/recommendations${query}`);
  }

  async seekerEducationCompareOptions(
    intakeYear?: number,
  ): Promise<SeekerEducationCompareOptionsResponse> {
    const query = intakeYear ? `?intakeYear=${intakeYear}` : "";
    return this.request(`/annix-orbit/education/me/compare-options${query}`);
  }

  async seekerEducationApplications(): Promise<{ applications: SeekerEducationApplication[] }> {
    return this.request("/annix-orbit/education/me/applications");
  }

  async createSeekerEducationApplication(
    input: SeekerEducationApplicationInput,
  ): Promise<{ application: SeekerEducationApplication }> {
    return this.request("/annix-orbit/education/me/applications", {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    });
  }

  async updateSeekerEducationApplicationStatus(
    id: string,
    status: SeekerEducationApplicationStatus,
  ): Promise<{ application: SeekerEducationApplication }> {
    return this.request(`/annix-orbit/education/me/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async deleteSeekerEducationApplication(id: string): Promise<{ deleted: boolean }> {
    return this.request(`/annix-orbit/education/me/applications/${id}`, { method: "DELETE" });
  }

  async seekerEducationScholarships(): Promise<{ scholarships: SeekerEducationScholarship[] }> {
    return this.request("/annix-orbit/education/me/scholarships");
  }

  async seekerEducationCareerFit(): Promise<{ careerFit: SeekerEducationCareerFit[] }> {
    return this.request("/annix-orbit/education/me/career-fit");
  }

  async guardianStudents(): Promise<{ students: GuardianLinkedStudent[] }> {
    return this.request("/annix-orbit/education/guardian/students");
  }

  async acceptGuardianLink(linkId: string): Promise<{ guardianLink: SeekerEducationGuardianLink }> {
    return this.request(`/annix-orbit/education/guardian/links/${linkId}/accept`, {
      method: "POST",
    });
  }

  async recordGuardianConsent(linkId: string): Promise<{ recorded: boolean }> {
    return this.request(`/annix-orbit/education/guardian/links/${linkId}/consent`, {
      method: "POST",
    });
  }
}

export interface SeekerCredential {
  id: number;
  candidateId: number;
  credentialType: string;
  issuedAt: string | null;
  expiresAt: string | null;
  issuingAuthority: string | null;
  documentPath: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SeekerCredentialInput {
  credentialType: string;
  issuedAt?: string | null;
  expiresAt?: string | null;
  issuingAuthority?: string | null;
  documentPath?: string | null;
  notes?: string | null;
}

export interface OrbitCredentialTypeOption {
  id: number;
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
}

export type SeekerApplicationStatus =
  | "applied"
  | "interviewing"
  | "rejected"
  | "offer"
  | "accepted";

export interface SeekerApplication {
  id: number;
  externalJobId: number | null;
  title: string;
  company: string | null;
  location: string | null;
  sourceUrl: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  status: SeekerApplicationStatus;
  notes: string | null;
  appliedAt: string;
}

export interface UpdateSeekerApplicationInput {
  status?: SeekerApplicationStatus;
  notes?: string | null;
}

export interface ExtractedCredentialDocument {
  credentialType: import("@annix/product-data/sa-market").CredentialType;
  issuedAt: string | null;
  expiresAt: string | null;
  issuingAuthority: string | null;
  notes: string | null;
}

export type OrbitEducationCurriculum =
  | "NSC"
  | "IEB"
  | "Cambridge"
  | "IB"
  | "GCSE"
  | "A-Level"
  | "US-GPA"
  | "Other";

export interface SeekerEducationProfile {
  id: string;
  userId: number;
  curriculum: OrbitEducationCurriculum;
  country: string | null;
  nationality: string | null;
  languages: string[];
  school: string | null;
  dateOfBirth: string | null;
  jurisdiction: string;
  targetCategories: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface SeekerEducationResult {
  id: string;
  educationProfileId: string;
  subject: string;
  mark: string | null;
  predictedMark: string | null;
  year: number | null;
  term: string | null;
  createdAt: string;
}

export interface SeekerEducationGuardianLink {
  id: string;
  educationProfileId: string;
  guardianUserId: number | null;
  guardianEmail: string;
  status: "invited" | "accepted" | "declined" | "revoked";
  invitedAt: string;
  acceptedAt: string | null;
}

export interface SeekerEducationConsent {
  id: string;
  educationProfileId: string;
  jurisdiction: string;
  grantedByRole: "guardian" | "self";
  grantedAt: string;
  revokedAt: string | null;
}

export interface SeekerEducationResponse {
  profile: SeekerEducationProfile | null;
  results: SeekerEducationResult[];
  guardianLinks: SeekerEducationGuardianLink[];
  isMinor: boolean | null;
  consentRequired: boolean;
}

export interface SeekerEducationInput {
  curriculum?: OrbitEducationCurriculum;
  country?: string | null;
  nationality?: string | null;
  languages?: string[];
  school?: string | null;
  dateOfBirth?: string | null;
}

export interface SeekerEducationResultInput {
  subject: string;
  mark?: number | null;
  predictedMark?: number | null;
  year?: number | null;
  term?: string | null;
}

export interface SeekerEducationMentorAnswer {
  answer: string;
  model: string;
  logId: string;
}

export type SeekerEducationBand = "safe" | "match" | "reach" | "below" | "unknown";

export interface SeekerEducationRecommendation {
  programmeId: string;
  programmeName: string;
  institutionId: string;
  band: SeekerEducationBand;
  result: {
    eligibility: {
      passed: boolean;
      gates: { description: string; passed: boolean; reason: string }[];
    };
    scoring: { adjustedScore: number | null; matched: boolean | null };
    competitiveness: { band: SeekerEducationBand; cutOff: number | null; margin: number | null };
    explanation: string[];
  };
}

export interface SeekerEducationRecommendationsResponse {
  intakeYear: number;
  recommendations: SeekerEducationRecommendation[];
}

export interface SeekerEducationChoiceSignal {
  source: string;
  metric: string;
  value: number;
  unit: string;
  asOf: string | null;
  confidence: string;
  sourceUrl: string | null;
}

export interface SeekerEducationChoiceOption {
  programmeId: string;
  programmeName: string;
  institutionId: string;
  band: SeekerEducationBand;
  careerCluster: string | null;
  clusterMatch: boolean;
  signals: SeekerEducationChoiceSignal[];
  reasons: string[];
  fitScore: number;
}

export interface SeekerEducationCompareOptionsResponse {
  intakeYear: number;
  options: SeekerEducationChoiceOption[];
}

export type SeekerEducationApplicationStatus =
  | "interested"
  | "applied"
  | "interview"
  | "accepted"
  | "rejected"
  | "waitlisted";

export interface SeekerEducationApplication {
  id: string;
  educationProfileId: string;
  programmeId: string | null;
  institutionName: string;
  programmeName: string;
  status: SeekerEducationApplicationStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SeekerEducationApplicationInput {
  institutionName: string;
  programmeName: string;
  programmeId?: string | null;
  status?: SeekerEducationApplicationStatus;
  notes?: string | null;
}

export interface SeekerEducationScholarship {
  id: string;
  name: string;
  provider: string;
  country: string | null;
  amountDisplay: string | null;
  criteria: string | null;
  url: string | null;
  careerCluster: string | null;
  lastVerifiedAt: string | null;
  active: boolean;
}

export interface SeekerEducationCareerFit {
  cluster: string;
  label: string;
  /** Subject-alignment score 0–100 — not an admission/employment probability. */
  fit: number | null;
  interested: boolean;
  reasons: string[];
}

export interface GuardianLinkedStudent {
  linkId: string;
  status: string;
  educationProfileId: string;
  studentName: string | null;
  curriculum: string;
  school: string | null;
  isMinor: boolean;
  consentRequired: boolean;
  resultsCount: number;
  applicationsCount: number;
}

export interface SeekerJobStats {
  hasCandidate: boolean;
  totalMatches: number;
  matchesLast7Days: number;
}

export interface SeekerQuotaStatus {
  unlimited: boolean;
  allowance: number | null;
  used: number;
  remaining: number | null;
  resetsAt: string;
}

export interface SeekerMatchingConsentStatus {
  hasCandidate: boolean;
  consented: boolean;
  consentedAt: string | null;
  quota: SeekerQuotaStatus | null;
}

export type SeekerRematchResponse =
  | { triggered: true; rematchedCandidates: number[] }
  | { triggered: false; reason: "no-candidate" }
  | { triggered: false; reason: "rate-limited"; retryAfterSeconds: number }
  | {
      triggered: false;
      reason: "quota-exceeded";
      used: number;
      allowance: number;
      resetsAt: string;
    };

export interface SeekerJobMatchDetails {
  embeddingSimilarity: number;
  skillsOverlap: number;
  skillsMatched: string[];
  skillsMissing: string[];
  experienceMatch: number;
  locationMatch: number;
  reasoning: string;
}

export interface SeekerRecommendedJob {
  matchId: number;
  candidateId: number;
  externalJobId: number;
  overallScore: number;
  similarityScore: number;
  structuredScore: number;
  matchDetails: SeekerJobMatchDetails | null;
  locked?: boolean;
  lockedSourceName?: string | null;
  job: {
    id: number;
    title: string;
    company: string | null;
    country: string;
    locationRaw: string | null;
    locationArea: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string | null;
    description: string | null;
    extractedSkills: string[];
    category: string | null;
    sourceUrl: string | null;
    postedAt: string | null;
    expiresAt: string | null;
    sourceProvider: string | null;
    sourceName: string | null;
  };
}

export interface SeekerRecommendedJobsResponse {
  matches: SeekerRecommendedJob[];
  candidateIds: number[];
  hasCandidate: boolean;
}

export interface SeekerRecommendedFilters {
  province?: string;
  city?: string;
  category?: string;
  minSalary?: string;
  search?: string;
}

export interface SeekerColdStartJobsResponse {
  jobs: SeekerRecommendedJob[];
  candidateIds: number[];
  hasCandidate: boolean;
  embeddingPending: boolean;
}

export interface SeekerMute {
  id: number;
  candidateId: number;
  companyName: string | null;
  category: string | null;
  mutedAt: string;
}

export interface SeekerDismissReason {
  id: number;
  code: string;
  label: string;
  muteAction: "company" | "category" | null;
  sortOrder: number;
  active: boolean;
}

export const annixOrbitApiClient = new AnnixOrbitApiClient();
