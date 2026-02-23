import { API_BASE_URL } from "@/lib/api-config";

export interface CvAssistantLoginDto {
  email: string;
  password: string;
}

export interface CvAssistantUser {
  id: number;
  email: string;
  name: string;
  role: string;
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
  companyId: number;
  companyName: string | null;
  createdAt: string;
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
  companyId: number;
  createdAt: string;
  updatedAt: string;
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
  imapHost: string | null;
  imapPort: number | null;
  imapUser: string | null;
  imapConfigured: boolean;
  monitoringEnabled: boolean;
  emailFromAddress: string | null;
}

const TOKEN_KEYS = {
  accessToken: "cvAssistantAccessToken",
  refreshToken: "cvAssistantRefreshToken",
} as const;

class CvAssistantApiClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private rememberMe: boolean = true;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;

    if (typeof window !== "undefined") {
      this.accessToken =
        localStorage.getItem(TOKEN_KEYS.accessToken) ??
        sessionStorage.getItem(TOKEN_KEYS.accessToken);
      this.refreshToken =
        localStorage.getItem(TOKEN_KEYS.refreshToken) ??
        sessionStorage.getItem(TOKEN_KEYS.refreshToken);
    }
  }

  setRememberMe(remember: boolean) {
    this.rememberMe = remember;
  }

  private headers(): Record<string, string> {
    if (!this.accessToken && typeof window !== "undefined") {
      this.accessToken =
        localStorage.getItem(TOKEN_KEYS.accessToken) ??
        sessionStorage.getItem(TOKEN_KEYS.accessToken);
      this.refreshToken =
        localStorage.getItem(TOKEN_KEYS.refreshToken) ??
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
        localStorage.getItem(TOKEN_KEYS.accessToken) ??
        sessionStorage.getItem(TOKEN_KEYS.accessToken);
      this.refreshToken =
        localStorage.getItem(TOKEN_KEYS.refreshToken) ??
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
        // Use raw error text
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
      const response = await fetch(`${this.baseURL}/cv-assistant/auth/refresh`, {
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
    companyName?: string;
  }): Promise<{ message: string; user: CvAssistantUser }> {
    return this.request("/cv-assistant/auth/register", {
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

    const url = `${this.baseURL}/cv-assistant/candidates/upload`;
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

  async updateCompanySettings(data: { name?: string }): Promise<{ message: string }> {
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
    feedbackText?: string,
  ): Promise<{ message: string }> {
    return this.request(`/cv-assistant/reference-feedback/${token}`, {
      method: "POST",
      body: JSON.stringify({ rating, feedbackText }),
    });
  }
}

export const cvAssistantApiClient = new CvAssistantApiClient();
