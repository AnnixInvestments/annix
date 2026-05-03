import type { Assignment } from "@annix/product-data/teacher-assistant";
import { type DocxExportResult, teacherAssistantApi } from "@/app/lib/api/teacherAssistantApi";

export async function downloadAssignmentAsDocx(assignment: Assignment): Promise<DocxExportResult> {
  const result = await teacherAssistantApi.exportDocx(assignment);
  triggerWindowDownload(result.presignedUrl, result.filename);
  return result;
}

function triggerWindowDownload(url: string, filename: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
