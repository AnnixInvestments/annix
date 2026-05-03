"use client";

import type { Assignment, AssignmentSection } from "@annix/product-data/teacher-assistant";
import { useCallback, useMemo, useState } from "react";

function shallowJsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export interface AssignmentEditor {
  current: Assignment;
  original: Assignment;
  editedSections: Set<AssignmentSection>;
  updateField: <K extends keyof Assignment>(key: K, value: Assignment[K]) => void;
  restoreSection: (section: AssignmentSection) => void;
  moveTaskUp: (index: number) => void;
  moveTaskDown: (index: number) => void;
  deleteTask: (index: number) => void;
  replace: (next: Assignment) => void;
  reset: () => void;
}

export function useAssignmentEditor(initial: Assignment): AssignmentEditor {
  const [original, setOriginal] = useState<Assignment>(initial);
  const [current, setCurrent] = useState<Assignment>(initial);

  const editedSections = useMemo<Set<AssignmentSection>>(() => {
    const set = new Set<AssignmentSection>();
    const sections: AssignmentSection[] = [
      "title",
      "studentBrief",
      "successCriteria",
      "tasks",
      "aiUseRules",
      "evidenceChecklist",
      "finalSubmissionRequirements",
      "rubric",
      "teacherNotes",
      "parentNote",
      "studentAiPromptStarters",
      "partialExemplars",
      "optionalWorkbookPages",
    ];
    sections.forEach((section) => {
      if (!shallowJsonEqual(current[section], original[section])) {
        set.add(section);
      }
    });
    return set;
  }, [current, original]);

  const updateField = useCallback(<K extends keyof Assignment>(key: K, value: Assignment[K]) => {
    setCurrent((prev) => ({ ...prev, [key]: value }));
  }, []);

  const restoreSection = useCallback(
    (section: AssignmentSection) => {
      setCurrent((prev) => ({ ...prev, [section]: original[section] }));
    },
    [original],
  );

  const moveTaskUp = useCallback((index: number) => {
    setCurrent((prev) => {
      if (index <= 0 || index >= prev.tasks.length) return prev;
      const next = [...prev.tasks];
      const swapped = next[index - 1];
      next[index - 1] = next[index];
      next[index] = swapped;
      return { ...prev, tasks: renumberSteps(next) };
    });
  }, []);

  const moveTaskDown = useCallback((index: number) => {
    setCurrent((prev) => {
      if (index < 0 || index >= prev.tasks.length - 1) return prev;
      const next = [...prev.tasks];
      const swapped = next[index + 1];
      next[index + 1] = next[index];
      next[index] = swapped;
      return { ...prev, tasks: renumberSteps(next) };
    });
  }, []);

  const deleteTask = useCallback((index: number) => {
    setCurrent((prev) => {
      const next = prev.tasks.filter((_, i) => i !== index);
      return { ...prev, tasks: renumberSteps(next) };
    });
  }, []);

  const replace = useCallback((next: Assignment) => {
    setOriginal(next);
    setCurrent(next);
  }, []);

  const reset = useCallback(() => {
    setCurrent(original);
  }, [original]);

  return {
    current,
    original,
    editedSections,
    updateField,
    restoreSection,
    moveTaskUp,
    moveTaskDown,
    deleteTask,
    replace,
    reset,
  };
}

function renumberSteps(tasks: Assignment["tasks"]): Assignment["tasks"] {
  return tasks.map((task, i) => ({ ...task, step: i + 1 }));
}
