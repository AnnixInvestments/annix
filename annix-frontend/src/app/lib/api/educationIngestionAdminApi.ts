import { createApiClient } from "@/app/lib/api/createApiClient";
import { adminTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

export type AdmissionDraftStatus = "draft" | "approved" | "rejected" | "changed";

export interface AdmissionDraft {
  id: string;
  programmeId: string | null;
  institutionId: string | null;
  intakeYear: number;
  fieldKey: string;
  label: string;
  extractedValue: Record<string, unknown>;
  approvedValue: Record<string, unknown> | null;
  status: AdmissionDraftStatus;
  confidence: string | null;
  sourceUrl: string;
  screenshotUrl: string | null;
  rawSnippet: string | null;
  fetchedAt: string;
}

export interface IngestResult {
  drafts: number;
  screenshotPath: string | null;
  sourceUrl: string;
}

export interface IngestPayload {
  institutionId?: string;
  programmeId?: string;
  intakeYear: number;
  sourceUrl: string;
}

const PREFIX = "/admin/annix-orbit/education";

const apiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: adminTokenStore,
  refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
});

class EducationIngestionAdminApiClient {
  async ingest(payload: IngestPayload): Promise<IngestResult> {
    return apiClient.post<IngestResult>(`${PREFIX}/ingest`, payload);
  }

  async listDrafts(params: {
    programmeId?: string;
    status?: AdmissionDraftStatus;
  }): Promise<AdmissionDraft[]> {
    const query = new URLSearchParams();
    if (params.programmeId) {
      query.set("programmeId", params.programmeId);
    }
    if (params.status) {
      query.set("status", params.status);
    }
    const suffix = query.toString();
    return apiClient.get<AdmissionDraft[]>(`${PREFIX}/drafts${suffix ? `?${suffix}` : ""}`);
  }

  async approve(id: string): Promise<AdmissionDraft> {
    return apiClient.post<AdmissionDraft>(`${PREFIX}/drafts/${id}/approve`, {});
  }

  async correct(id: string, value: Record<string, unknown>): Promise<AdmissionDraft> {
    return apiClient.post<AdmissionDraft>(`${PREFIX}/drafts/${id}/correct`, { value });
  }

  async reject(id: string): Promise<AdmissionDraft> {
    return apiClient.post<AdmissionDraft>(`${PREFIX}/drafts/${id}/reject`, {});
  }
}

export const educationIngestionAdminApi = new EducationIngestionAdminApiClient();
