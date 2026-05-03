"use client";

import type { Assignment, AssignmentInput } from "@annix/product-data/teacher-assistant";
import { GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { useToast } from "@/app/components/Toast";
import { useAdminAuth } from "@/app/context/AdminAuthContext";
import { useGenerateAssignment } from "@/app/lib/query/hooks";
import {
  type RecentAssignmentEntry,
  useTeacherAssistantStore,
} from "@/app/lib/store/teacherAssistantStore";
import { AssignmentPreview } from "./components/AssignmentPreview";
import { RecentAssignmentsList } from "./components/RecentAssignmentsList";
import { TeacherAssistantForm } from "./components/TeacherAssistantForm";
import { TEACHER_ASSISTANT_VERSION } from "./config/version";

const ESTIMATED_GENERATION_MS = 25_000;

export default function TeacherAssistantPage() {
  const router = useRouter();
  const { admin, isLoading } = useAdminAuth();
  const { showToast } = useToast();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const generate = useGenerateAssignment();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [generatedFrom, setGeneratedFrom] = useState<AssignmentInput | null>(null);

  const recent = useTeacherAssistantStore((s) => s.recent);
  const rememberAssignment = useTeacherAssistantStore((s) => s.rememberAssignment);
  const forgetAssignment = useTeacherAssistantStore((s) => s.forgetAssignment);

  useEffect(() => {
    if (!isLoading && !admin) {
      router.push("/admin/login?returnUrl=%2Fteacher-assistant");
    }
  }, [isLoading, admin, router]);

  if (isLoading || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6ff]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#323288]" />
      </div>
    );
  }

  const handleSubmit = (input: AssignmentInput) => {
    setGeneratedFrom(input);
    showExtraction({
      brand: "teacher-assistant",
      label: `Generating ${input.subject} assignment on "${input.topic}"…`,
      estimatedDurationMs: ESTIMATED_GENERATION_MS,
    });
    generate.mutate(input, {
      onSuccess: (result) => {
        hideExtraction();
        setAssignment(result);
        rememberAssignment(input, result);
        showToast("Assignment generated.", "success");
      },
      onError: (error) => {
        hideExtraction();
        showToast(error instanceof Error ? error.message : "Generation failed.", "error");
      },
    });
  };

  const handleReset = () => {
    setAssignment(null);
    setGeneratedFrom(null);
  };

  const handleOpenRecent = (entry: RecentAssignmentEntry) => {
    setGeneratedFrom(entry.input);
    setAssignment(entry.assignment);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f6ff] via-white to-[#e8eaff]">
      <header className="bg-[#323288] text-white shadow-md border-b-4 border-[#FFA500]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFA500] rounded-lg flex items-center justify-center text-white">
              <GraduationCap className="w-6 h-6" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                Annix <span className="font-normal opacity-80">— Teacher Assistant</span>
              </h1>
              <p className="text-xs text-white/70">v{TEACHER_ASSISTANT_VERSION}</p>
            </div>
          </div>
          {assignment ? (
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-white/80 hover:text-[#FFA500] transition-colors"
            >
              Start new assignment
            </button>
          ) : null}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {assignment && generatedFrom ? (
          <AssignmentPreview initialAssignment={assignment} generatedFrom={generatedFrom} />
        ) : (
          <>
            <RecentAssignmentsList
              recent={recent}
              onOpen={handleOpenRecent}
              onForget={forgetAssignment}
            />
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 max-w-3xl mx-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create a new assignment</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Generate a process-based, AI-aware assignment in seconds. The output is fully
                  editable before export.
                </p>
              </div>
              <TeacherAssistantForm onSubmit={handleSubmit} isSubmitting={generate.isPending} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
