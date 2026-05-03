import type {
  Assignment,
  AssignmentInput,
  AssignmentSection,
} from "@annix/product-data/teacher-assistant";
import { useMutation } from "@tanstack/react-query";
import { teacherAssistantApi } from "@/app/lib/api/teacherAssistantApi";

export function useGenerateAssignment() {
  return useMutation({
    mutationFn: (input: AssignmentInput) => teacherAssistantApi.generate(input),
  });
}

export interface RegenerateSectionArgs {
  input: AssignmentInput;
  section: AssignmentSection;
  existingAssignment: Assignment;
}

export function useRegenerateSection() {
  return useMutation({
    mutationFn: (args: RegenerateSectionArgs) => teacherAssistantApi.regenerateSection(args),
  });
}
