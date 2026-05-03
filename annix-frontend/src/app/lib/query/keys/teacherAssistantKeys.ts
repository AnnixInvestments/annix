import type { AssignmentInput, AssignmentSection } from "@annix/product-data/teacher-assistant";

export const teacherAssistantKeys = {
  all: ["teacher-assistant"] as const,
  generate: (input: AssignmentInput) => [...teacherAssistantKeys.all, "generate", input] as const,
  regenerateSection: (input: AssignmentInput, section: AssignmentSection) =>
    [...teacherAssistantKeys.all, "regenerate-section", input, section] as const,
} as const;
