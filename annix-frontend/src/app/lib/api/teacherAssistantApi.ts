import type {
  Assignment,
  AssignmentInput,
  AssignmentSection,
} from "@annix/product-data/teacher-assistant";
import { type ApiClient, createApiClient } from "@/app/lib/api/createApiClient";
import { adminTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

export interface GenerateAssignmentRequest extends AssignmentInput {}

export interface RegenerateSectionRequest {
  input: AssignmentInput;
  section: AssignmentSection;
  existingAssignment: Assignment;
}

class TeacherAssistantApi {
  private readonly client: ApiClient;

  constructor() {
    this.client = createApiClient({
      baseURL: API_BASE_URL,
      tokenStore: adminTokenStore,
      refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
    });
  }

  generate(input: GenerateAssignmentRequest): Promise<Assignment> {
    return this.client.post<Assignment>("/teacher-assistant/generate", input);
  }

  regenerateSection(payload: RegenerateSectionRequest): Promise<Assignment> {
    return this.client.post<Assignment>("/teacher-assistant/regenerate-section", payload);
  }
}

export const teacherAssistantApi = new TeacherAssistantApi();
