import type {
  AgeBucket,
  Assignment,
  AssignmentInput,
  DifferentiationOption,
  DifficultyLevel,
  Duration,
  OutputType,
  Subject,
} from "@annix/product-data/teacher-assistant";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nowMillis } from "@/app/lib/datetime";

const MAX_RECENT = 5;

export interface RecentAssignmentEntry {
  id: string;
  generatedAt: number;
  input: AssignmentInput;
  assignment: Assignment;
}

export interface FormDraft {
  subject: Subject;
  topicChoice: string;
  customTopic: string;
  ageBucket: AgeBucket;
  studentAge: number;
  duration: Duration;
  outputType: OutputType;
  difficulty: DifficultyLevel;
  differentiation: DifferentiationOption[];
  learningObjective: string;
  allowAiUse: boolean;
}

interface TeacherAssistantState {
  recent: RecentAssignmentEntry[];
  formDraft: FormDraft | null;
}

interface TeacherAssistantActions {
  rememberAssignment: (input: AssignmentInput, assignment: Assignment) => void;
  forgetAssignment: (id: string) => void;
  clearRecent: () => void;
  saveFormDraft: (draft: FormDraft) => void;
  clearFormDraft: () => void;
}

export const useTeacherAssistantStore = create<TeacherAssistantState & TeacherAssistantActions>()(
  persist(
    (set) => ({
      recent: [],
      formDraft: null,
      rememberAssignment: (input, assignment) =>
        set((state) => {
          const ts = nowMillis();
          const id = `${ts}-${Math.random().toString(36).slice(2, 8)}`;
          const entry: RecentAssignmentEntry = {
            id,
            generatedAt: ts,
            input,
            assignment,
          };
          return { recent: [entry, ...state.recent].slice(0, MAX_RECENT) };
        }),
      forgetAssignment: (id) =>
        set((state) => ({ recent: state.recent.filter((entry) => entry.id !== id) })),
      clearRecent: () => set({ recent: [] }),
      saveFormDraft: (draft) => set({ formDraft: draft }),
      clearFormDraft: () => set({ formDraft: null }),
    }),
    {
      name: "teacher-assistant:recent",
      version: 2,
    },
  ),
);
