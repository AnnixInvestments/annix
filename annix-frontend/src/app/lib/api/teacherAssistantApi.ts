import type {
  AgeBucket,
  Assignment,
  AssignmentInput,
  AssignmentSection,
  DifficultyLevel,
  Subject,
} from "@annix/product-data/teacher-assistant";
import { type ApiClient, createApiClient } from "@/app/lib/api/createApiClient";
import { teacherAssistantTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

export interface GenerateAssignmentRequest extends AssignmentInput {}

export interface RegenerateSectionRequest {
  input: AssignmentInput;
  section: AssignmentSection;
  existingAssignment: Assignment;
}

export interface TeacherAssistantUser {
  id: number;
  email: string;
  name: string;
  schoolName: string | null;
}

export interface TeacherAssistantAuthResult {
  accessToken: string;
  expiresIn: number;
  user: TeacherAssistantUser;
}

export interface RegisterTeacherInput {
  email: string;
  password: string;
  name: string;
  schoolName?: string | null;
}

export interface LoginTeacherInput {
  email: string;
  password: string;
}

export interface SuggestObjectivesInput {
  subject: Subject;
  topic: string;
  ageBucket: AgeBucket;
  difficulty: DifficultyLevel;
}

export interface SuggestObjectivesResult {
  suggestions: string[];
}

export interface DocxExportResult {
  filename: string;
  storagePath: string;
  presignedUrl: string;
  byteSize: number;
}

class TeacherAssistantApi {
  private readonly client: ApiClient;

  constructor() {
    this.client = createApiClient({
      baseURL: API_BASE_URL,
      tokenStore: teacherAssistantTokenStore,
      refreshHandler: async () => false,
    });
  }

  register(input: RegisterTeacherInput): Promise<TeacherAssistantAuthResult> {
    return this.client.post<TeacherAssistantAuthResult>("/teacher-assistant/auth/register", input);
  }

  login(input: LoginTeacherInput): Promise<TeacherAssistantAuthResult> {
    return this.client.post<TeacherAssistantAuthResult>("/teacher-assistant/auth/login", input);
  }

  me(): Promise<TeacherAssistantUser> {
    return this.client.get<TeacherAssistantUser>("/teacher-assistant/auth/me");
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

  suggestObjectives(input: SuggestObjectivesInput): Promise<SuggestObjectivesResult> {
    return this.client.post<SuggestObjectivesResult>(
      "/teacher-assistant/suggest/objectives",
      input,
    );
  }
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
