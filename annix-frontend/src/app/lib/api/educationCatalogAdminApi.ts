import { createApiClient } from "@/app/lib/api/createApiClient";
import { adminTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

export interface EducationInstitution {
  id: string;
  code: string;
  name: string;
  country: string | null;
  defaultRequirementSpec: Record<string, unknown> | null;
}

export interface EducationFaculty {
  id: string;
  institutionId: string;
  code: string;
  name: string;
  defaultRequirementSpec: Record<string, unknown> | null;
}

export interface EducationProgramme {
  id: string;
  institutionId: string;
  facultyId: string | null;
  code: string;
  name: string;
  careerCluster: string | null;
}

export interface EducationScholarship {
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

export interface CreateInstitutionInput {
  code: string;
  name: string;
  country?: string | null;
}

export interface UpdateInstitutionInput {
  name?: string;
  country?: string | null;
}

export interface CreateFacultyInput {
  institutionId: string;
  code: string;
  name: string;
}

export interface CreateProgrammeInput {
  institutionId: string;
  facultyId?: string | null;
  code: string;
  name: string;
  careerCluster?: string | null;
}

export interface UpdateProgrammeInput {
  name?: string;
  facultyId?: string | null;
  careerCluster?: string | null;
}

export interface ScholarshipInput {
  name: string;
  provider: string;
  country?: string | null;
  amountDisplay?: string | null;
  criteria?: string | null;
  url?: string | null;
  careerCluster?: string | null;
  active?: boolean;
}

const PREFIX = "/admin/annix-orbit/education";

const apiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: adminTokenStore,
  refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
});

class EducationCatalogAdminApiClient {
  async institutions(): Promise<EducationInstitution[]> {
    const response = await apiClient.get<{ institutions: EducationInstitution[] }>(
      `${PREFIX}/institutions`,
    );
    return response.institutions;
  }

  async createInstitution(input: CreateInstitutionInput): Promise<EducationInstitution> {
    const response = await apiClient.post<{ institution: EducationInstitution }>(
      `${PREFIX}/institutions`,
      input,
    );
    return response.institution;
  }

  async updateInstitution(
    id: string,
    input: UpdateInstitutionInput,
  ): Promise<EducationInstitution> {
    const response = await apiClient.patch<{ institution: EducationInstitution }>(
      `${PREFIX}/institutions/${id}`,
      input,
    );
    return response.institution;
  }

  async faculties(institutionId: string): Promise<EducationFaculty[]> {
    const response = await apiClient.get<{ faculties: EducationFaculty[] }>(
      `${PREFIX}/institutions/${institutionId}/faculties`,
    );
    return response.faculties;
  }

  async createFaculty(input: CreateFacultyInput): Promise<EducationFaculty> {
    const response = await apiClient.post<{ faculty: EducationFaculty }>(
      `${PREFIX}/faculties`,
      input,
    );
    return response.faculty;
  }

  async programmes(institutionId: string): Promise<EducationProgramme[]> {
    const response = await apiClient.get<{ programmes: EducationProgramme[] }>(
      `${PREFIX}/programmes?institutionId=${encodeURIComponent(institutionId)}`,
    );
    return response.programmes;
  }

  async createProgramme(input: CreateProgrammeInput): Promise<EducationProgramme> {
    const response = await apiClient.post<{ programme: EducationProgramme }>(
      `${PREFIX}/programmes`,
      input,
    );
    return response.programme;
  }

  async updateProgramme(id: string, input: UpdateProgrammeInput): Promise<EducationProgramme> {
    const response = await apiClient.patch<{ programme: EducationProgramme }>(
      `${PREFIX}/programmes/${id}`,
      input,
    );
    return response.programme;
  }

  async scholarships(): Promise<EducationScholarship[]> {
    const response = await apiClient.get<{ scholarships: EducationScholarship[] }>(
      `${PREFIX}/scholarships`,
    );
    return response.scholarships;
  }

  async createScholarship(input: ScholarshipInput): Promise<EducationScholarship> {
    const response = await apiClient.post<{ scholarship: EducationScholarship }>(
      `${PREFIX}/scholarships`,
      input,
    );
    return response.scholarship;
  }

  async updateScholarship(id: string, input: ScholarshipInput): Promise<EducationScholarship> {
    const response = await apiClient.patch<{ scholarship: EducationScholarship }>(
      `${PREFIX}/scholarships/${id}`,
      input,
    );
    return response.scholarship;
  }
}

export const educationCatalogAdminApi = new EducationCatalogAdminApiClient();
