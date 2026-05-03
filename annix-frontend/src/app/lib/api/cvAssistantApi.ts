import { type ApiClient, createApiClient } from "@/app/lib/api/createApiClient";
import { cvAssistantTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

export interface CvAssistantLoginDto {
  email: string;
  password: string;
}

export type CvAssistantUserType = "company" | "individual";

export interface CvAssistantUser {
  id: number;
  email: string;
  name: string;
  role: string;
  userType: CvAssistantUserType;
}

export interface CvAssistantLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: CvAssistantUser;
}

export interface CvAssistantUserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  userType: CvAssistantUserType;
  companyId: number | null;
  companyName: string | null;
  createdAt: string;
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
  costTier: "free" | "freemium" | "paid";
  available: boolean;
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
  companyId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobMarketSourceDto {
  provider: string;
  name: string;
  apiId?: string | null;
  apiKey?: string | null;
  countryCodes?: string[];
  categories?: string[];
  ingestionIntervalHours?: number;
}

export interface UpdateJobMarketSourceDto {
  name?: string;
  apiId?: string;
  apiKey?: string;
  countryCodes?: string[];
  categories?: string[];
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
  }>;
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
}

export interface PublicJob {
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

export interface IndividualDocument {
  id: number;
  kind: IndividualDocumentKind;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  label: string | null;
  uploadedAt: string;
  downloadUrl: string;
}

export interface IndividualProfileStatus {
  profileComplete: boolean;
  hasCv: boolean;
  qualificationsCount: number;
  certificatesCount: number;
  cvUploadedAt: string | null;
  cvOriginalFilename: string | null;
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

const apiClient: ApiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: cvAssistantTokenStore,
  refreshUrl: `${API_BASE_URL}/cv-assistant/auth/refresh`,
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

class CvAssistantApiClient {
  setRememberMe(_remember: boolean) {
    // PortalTokenStore tracks rememberMe via setTokens; this no-op preserves the public API
  }

  private setTokens(accessToken: string, refreshToken: string) {
    cvAssistantTokenStore.setTokens(accessToken, refreshToken, cvAssistantTokenStore.rememberMe());
  }

  clearTokens() {
    cvAssistantTokenStore.clear();
  }

  isAuthenticated(): boolean {
    return cvAssistantTokenStore.isAuthenticated();
  }

  private request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return apiClient.request<T>(endpoint, options);
  }

  async login(dto: CvAssistantLoginDto): Promise<CvAssistantLoginResponse> {
    const response = await this.request<CvAssistantLoginResponse>("/cv-assistant/auth/login", {
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
  }): Promise<{ message: string; user: CvAssistantUser }> {
    return this.request("/cv-assistant/auth/register", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async registerIndividual(dto: {
    email: string;
    password: string;
    name: string;
  }): Promise<{ message: string; user: CvAssistantUser }> {
    return this.request("/cv-assistant/auth/register/individual", {
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
    }>(`/cv-assistant/auth/verify-email?token=${encodeURIComponent(token)}`);

    if (response.accessToken && response.refreshToken) {
      this.setTokens(response.accessToken, response.refreshToken);
    }

    return response;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request("/cv-assistant/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return this.request("/cv-assistant/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    return this.request("/cv-assistant/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request("/cv-assistant/auth/logout", { method: "POST" });
    } finally {
      this.clearTokens();
    }
  }

  async currentUser(): Promise<CvAssistantUserProfile> {
    return this.request<CvAssistantUserProfile>("/cv-assistant/auth/me");
  }

  async teamMembers(): Promise<
    Array<{ id: number; name: string; email: string; role: string; createdAt: string }>
  > {
    return this.request("/cv-assistant/auth/team");
  }

  async dashboardStats(): Promise<DashboardStats> {
    return this.request("/cv-assistant/dashboard/stats");
  }

  async topCandidates(): Promise<Candidate[]> {
    return this.request("/cv-assistant/dashboard/top-candidates");
  }

  async jobPostings(status?: string): Promise<JobPosting[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request(`/cv-assistant/job-postings${query}`);
  }

  async jobPostingById(id: number): Promise<JobPosting> {
    return this.request(`/cv-assistant/job-postings/${id}`);
  }

  async createJobPosting(data: Partial<JobPosting>): Promise<JobPosting> {
    return this.request("/cv-assistant/job-postings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateJobPosting(id: number, data: Partial<JobPosting>): Promise<JobPosting> {
    return this.request(`/cv-assistant/job-postings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteJobPosting(id: number): Promise<void> {
    return this.request(`/cv-assistant/job-postings/${id}`, { method: "DELETE" });
  }

  async activateJobPosting(id: number): Promise<JobPosting> {
    return this.request(`/cv-assistant/job-postings/${id}/activate`, { method: "POST" });
  }

  async pauseJobPosting(id: number): Promise<JobPosting> {
    return this.request(`/cv-assistant/job-postings/${id}/pause`, { method: "POST" });
  }

  async closeJobPosting(id: number): Promise<JobPosting> {
    return this.request(`/cv-assistant/job-postings/${id}/close`, { method: "POST" });
  }

  // Phase 1 wizard
  async createJobDraft(): Promise<JobPosting> {
    return this.request("/cv-assistant/job-postings/draft", { method: "POST" });
  }

  async jobWizardDraft(id: number): Promise<JobPosting> {
    return this.request(`/cv-assistant/job-postings/${id}/wizard`);
  }

  async updateJobWizard(id: number, payload: UpdateJobWizardPayload): Promise<JobPosting> {
    return this.request(`/cv-assistant/job-postings/${id}/wizard`, {
      method: "PATCH",
      body: JSON.stringify(sanitizeWizardPayload(payload)),
    });
  }

  async publishJobDraft(id: number): Promise<JobPosting> {
    return this.request(`/cv-assistant/job-postings/${id}/publish`, { method: "POST" });
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
    return this.request(`/cv-assistant/job-postings/${id}/nix/title-suggestions`, {
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
    return this.request(`/cv-assistant/job-postings/${id}/nix/outcomes-draft`, {
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
    return this.request(`/cv-assistant/job-postings/${id}/nix/description`, {
      method: "POST",
    });
  }

  async nixRequirementsSuggestions(id: number): Promise<{
    minExperienceYears: number | null;
    requiredEducation: string | null;
    requiredCertifications: string[];
    reasoning: string | null;
  }> {
    return this.request(`/cv-assistant/job-postings/${id}/nix/requirements-suggestions`, {
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
    return this.request(`/cv-assistant/job-postings/${id}/nix/skill-suggestions`, {
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
    return this.request(`/cv-assistant/job-postings/${id}/nix/quality-score`, {
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
    return this.request(`/cv-assistant/job-postings/${id}/nix/screening-questions`, {
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
    return this.request(`/cv-assistant/job-postings/${id}/nix/salary-guidance`, {
      method: "POST",
    });
  }

  async nixSourcingQueries(id: number): Promise<{
    linkedin: string;
    indeed: string;
    google: string;
    explanations: string[];
  }> {
    return this.request(`/cv-assistant/job-postings/${id}/nix/sourcing-queries`, {
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
    return this.request(`/cv-assistant/job-postings/${id}/nix/predicted-volume`, {
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
    return this.request(`/cv-assistant/job-postings/salary-insights?${search.toString()}`);
  }

  async candidates(filters?: { status?: string; jobPostingId?: number }): Promise<Candidate[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.jobPostingId) params.append("jobPostingId", String(filters.jobPostingId));
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/cv-assistant/candidates${query}`);
  }

  async candidateById(id: number): Promise<Candidate> {
    return this.request(`/cv-assistant/candidates/${id}`);
  }

  async updateCandidateStatus(
    id: number,
    dto: { status: string; reason?: string | null },
  ): Promise<Candidate> {
    return this.request(`/cv-assistant/candidates/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status: dto.status,
        ...(dto.reason ? { reason: dto.reason } : {}),
      }),
    });
  }

  async candidateCvUrl(id: number): Promise<{ url: string | null }> {
    return this.request(`/cv-assistant/candidates/${id}/cv-url`);
  }

  async rejectCandidate(id: number): Promise<void> {
    return this.request(`/cv-assistant/candidates/${id}/reject`, { method: "POST" });
  }

  async shortlistCandidate(id: number): Promise<void> {
    return this.request(`/cv-assistant/candidates/${id}/shortlist`, { method: "POST" });
  }

  async acceptCandidate(id: number): Promise<void> {
    return this.request(`/cv-assistant/candidates/${id}/accept`, { method: "POST" });
  }

  async sendReferenceRequests(candidateId: number): Promise<{ message: string }> {
    return this.request(`/cv-assistant/candidates/${candidateId}/send-reference-requests`, {
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

    return apiClient.uploadFile<Candidate>("/cv-assistant/candidates/upload", file, {
      jobPostingId: String(jobPostingId),
      ...(email ? { email } : {}),
      ...(name ? { name } : {}),
    });
  }

  async references(status?: string): Promise<CandidateReference[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request(`/cv-assistant/references${query}`);
  }

  async pendingReferences(): Promise<CandidateReference[]> {
    return this.request("/cv-assistant/references/pending");
  }

  async completedReferences(): Promise<CandidateReference[]> {
    return this.request("/cv-assistant/references/completed");
  }

  async settings(): Promise<CompanySettings> {
    return this.request("/cv-assistant/settings");
  }

  async updateImapSettings(data: {
    imapHost?: string;
    imapPort?: number;
    imapUser?: string;
    imapPassword?: string;
    monitoringEnabled?: boolean;
    emailFromAddress?: string;
  }): Promise<{ message: string }> {
    return this.request("/cv-assistant/settings/imap", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async updateCompanySettings(data: UpdateCompanySettingsInput): Promise<{ message: string }> {
    return this.request("/cv-assistant/settings/company", {
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
    return this.request("/cv-assistant/settings/test-imap", {
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
    return this.request(`/cv-assistant/reference-feedback/${token}`);
  }

  async submitReferenceFeedback(
    token: string,
    rating: number,
    feedbackText?: string | null,
  ): Promise<{ message: string }> {
    return this.request(`/cv-assistant/reference-feedback/${token}`, {
      method: "POST",
      body: JSON.stringify({ rating, feedbackText }),
    });
  }

  async jobMarketSources(): Promise<JobMarketSource[]> {
    return this.request("/cv-assistant/job-market/sources");
  }

  async createJobMarketSource(data: CreateJobMarketSourceDto): Promise<JobMarketSource> {
    return this.request("/cv-assistant/job-market/sources", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateJobMarketSource(
    id: number,
    data: UpdateJobMarketSourceDto,
  ): Promise<JobMarketSource> {
    return this.request(`/cv-assistant/job-market/sources/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteJobMarketSource(id: number): Promise<{ message: string }> {
    return this.request(`/cv-assistant/job-market/sources/${id}`, { method: "DELETE" });
  }

  async triggerIngestion(sourceId: number): Promise<{ ingested: number; skipped: number }> {
    return this.request(`/cv-assistant/job-market/sources/${sourceId}/ingest`, {
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
    return this.request(`/cv-assistant/job-market/jobs${query}`);
  }

  async externalJobById(id: number): Promise<ExternalJob> {
    return this.request(`/cv-assistant/job-market/jobs/${id}`);
  }

  async jobMarketStats(): Promise<JobMarketStats> {
    return this.request("/cv-assistant/job-market/stats");
  }

  async recommendedJobsForCandidate(candidateId: number): Promise<CandidateJobMatch[]> {
    return this.request(`/cv-assistant/job-market/candidates/${candidateId}/recommended-jobs`);
  }

  async triggerCandidateMatch(candidateId: number): Promise<{ matched: number }> {
    return this.request(`/cv-assistant/job-market/candidates/${candidateId}/match`, {
      method: "POST",
    });
  }

  async matchingCandidatesForJob(jobId: number): Promise<CandidateJobMatch[]> {
    return this.request(`/cv-assistant/job-market/jobs/${jobId}/matching-candidates`);
  }

  async triggerJobMatch(jobId: number): Promise<{ matched: number }> {
    return this.request(`/cv-assistant/job-market/jobs/${jobId}/match`, { method: "POST" });
  }

  async dismissMatch(matchId: number): Promise<{ message: string }> {
    return this.request(`/cv-assistant/job-market/matches/${matchId}/dismiss`, {
      method: "POST",
    });
  }

  async updateCandidateProfile(
    id: number,
    data: { beeLevel?: number | null; popiaConsent?: boolean; jobAlertsOptIn?: boolean },
  ): Promise<Candidate> {
    return this.request(`/cv-assistant/candidates/${id}/profile`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async eraseCandidateData(id: number): Promise<{ message: string }> {
    return this.request(`/cv-assistant/candidates/${id}/erasure`, { method: "DELETE" });
  }

  async popiaRetentionStats(): Promise<PopiaRetentionStats> {
    return this.request("/cv-assistant/candidates/popia/retention-stats");
  }

  async marketInsights(): Promise<MarketInsights> {
    return this.request("/cv-assistant/dashboard/market-insights");
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
      `/cv-assistant/analytics/funnel${qs ? `?${qs}` : ""}`,
    );
  }

  async analyticsMatchAccuracy(): Promise<MatchAccuracyResponse> {
    return this.request<MatchAccuracyResponse>("/cv-assistant/analytics/match-accuracy");
  }

  async analyticsTimeToFill(): Promise<TimeToFillResponse> {
    return this.request<TimeToFillResponse>("/cv-assistant/analytics/time-to-fill");
  }

  async analyticsMarketTrends(): Promise<MarketTrendsResponse> {
    return this.request<MarketTrendsResponse>("/cv-assistant/analytics/market-trends");
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
      `/cv-assistant/analytics/export/funnel${qs ? `?${qs}` : ""}`,
    );
    return blob.text();
  }

  async analyticsExportTimeToFillCsv(): Promise<string> {
    const blob = await apiClient.requestBlob("/cv-assistant/analytics/export/time-to-fill");
    return blob.text();
  }

  async notificationVapidKey(): Promise<{ key: string | null }> {
    return this.request("/cv-assistant/notifications/vapid-key");
  }

  async subscribePush(subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }): Promise<{ message: string }> {
    return this.request("/cv-assistant/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription),
    });
  }

  async unsubscribePush(endpoint: string): Promise<{ message: string }> {
    return this.request("/cv-assistant/notifications/unsubscribe", {
      method: "DELETE",
      body: JSON.stringify({ endpoint }),
    });
  }

  async notificationPreferences(): Promise<NotificationPreferences> {
    return this.request("/cv-assistant/notifications/preferences");
  }

  async updateNotificationPreferences(
    data: Partial<NotificationPreferences>,
  ): Promise<{ message: string }> {
    return this.request("/cv-assistant/notifications/preferences", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async myProfileStatus(): Promise<IndividualProfileStatus> {
    return this.request("/cv-assistant/me/profile/status");
  }

  async myDocuments(): Promise<IndividualDocument[]> {
    return this.request("/cv-assistant/me/documents");
  }

  async uploadMyDocument(
    file: File,
    kind: IndividualDocumentKind,
    label?: string | null,
  ): Promise<IndividualDocument> {
    const params: Record<string, string> = { kind };
    if (label) params.label = label;
    return apiClient.uploadFile<IndividualDocument>("/cv-assistant/me/documents", file, params);
  }

  async deleteMyDocument(id: number): Promise<{ message: string }> {
    return this.request(`/cv-assistant/me/documents/${id}`, { method: "DELETE" });
  }

  async myNotificationPreferences(): Promise<IndividualNotificationPreferences> {
    return this.request("/cv-assistant/me/notification-preferences");
  }

  async updateMyNotificationPreferences(
    data: Partial<IndividualNotificationPreferences>,
  ): Promise<IndividualNotificationPreferences> {
    return this.request("/cv-assistant/me/notification-preferences", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async myDataExport(): Promise<IndividualDataExport> {
    return this.request("/cv-assistant/me/data-export");
  }

  async requestMyAccountDeletion(): Promise<{ message: string; email: string }> {
    return this.request("/cv-assistant/me/account/request-delete", {
      method: "POST",
    });
  }

  async confirmMyAccountDeletion(token: string): Promise<{ message: string }> {
    return this.request("/cv-assistant/public/account/confirm-delete", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  async withdrawMyConsent(): Promise<{ message: string; erasedCandidates: number }> {
    return this.request("/cv-assistant/me/withdraw-consent", { method: "POST" });
  }

  async nixWizardCvImprovements(): Promise<NixSeekerCvAssessment> {
    return this.request("/cv-assistant/me/nix-wizard/cv-improvements", { method: "POST" });
  }

  async candidateDataExport(candidateId: number): Promise<unknown> {
    return this.request(`/cv-assistant/candidates/${candidateId}/data-export`);
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
    return this.request(`/cv-assistant/public/jobs${suffix}`);
  }

  async publicJobPosting(referenceNumber: string): Promise<PublicJobPosting> {
    const safeRef = encodeURIComponent(referenceNumber);
    return this.request(`/cv-assistant/public/job-postings/${safeRef}`);
  }

  async portalAdapters(): Promise<PortalAdapterSummary[]> {
    return this.request("/cv-assistant/portal-adapters");
  }
}

export const cvAssistantApiClient = new CvAssistantApiClient();
