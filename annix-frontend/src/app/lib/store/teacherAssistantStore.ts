import type { Assignment, AssignmentInput } from "@annix/product-data/teacher-assistant";
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

interface TeacherAssistantState {
  recent: RecentAssignmentEntry[];
}

interface TeacherAssistantActions {
  rememberAssignment: (input: AssignmentInput, assignment: Assignment) => void;
  forgetAssignment: (id: string) => void;
  clearRecent: () => void;
}

export const useTeacherAssistantStore = create<TeacherAssistantState & TeacherAssistantActions>()(
  persist(
    (set) => ({
      recent: [],
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
    }),
    {
      name: "teacher-assistant:recent",
      version: 1,
    },
  ),
);
