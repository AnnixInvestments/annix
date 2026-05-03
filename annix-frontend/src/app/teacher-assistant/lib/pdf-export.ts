import type { Assignment } from "@annix/product-data/teacher-assistant";
import { teacherAssistantApi } from "@/app/lib/api/teacherAssistantApi";

export function downloadAssignmentAsPdf(assignment: Assignment): Promise<void> {
  return teacherAssistantApi.downloadPdf(assignment);
}
