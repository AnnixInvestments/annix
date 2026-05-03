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

  async downloadPdf(assignment: Assignment): Promise<void> {
    const filename = pdfFilename(assignment.title);
    const blob = await this.client.requestBlob("/teacher-assistant/export/pdf", {
      method: "POST",
      body: JSON.stringify({ assignment }),
      headers: { "Content-Type": "application/json" },
    });
    this.client.triggerDownload(blob, filename);
  }

  exportDocx(assignment: Assignment): Promise<DocxExportResult> {
    return this.client.post<DocxExportResult>("/teacher-assistant/export/docx", { assignment });
  }
}

export interface DocxExportResult {
  filename: string;
  storagePath: string;
  presignedUrl: string;
  byteSize: number;
}

function pdfFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "assignment"}.pdf`;
}

export const teacherAssistantApi = new TeacherAssistantApi();
