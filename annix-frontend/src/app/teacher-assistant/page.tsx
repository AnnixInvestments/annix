"use client";

import type { Assignment, AssignmentInput } from "@annix/product-data/teacher-assistant";
import { GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { useAdminAuth } from "@/app/context/AdminAuthContext";
import { useGenerateAssignment } from "@/app/lib/query/hooks";
import { AssignmentPreview } from "./components/AssignmentPreview";
import { TeacherAssistantForm } from "./components/TeacherAssistantForm";
import { TEACHER_ASSISTANT_VERSION } from "./config/version";

export default function TeacherAssistantPage() {
  const router = useRouter();
  const { admin, isLoading } = useAdminAuth();
  const { showToast } = useToast();
  const generate = useGenerateAssignment();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [generatedFrom, setGeneratedFrom] = useState<AssignmentInput | null>(null);

  useEffect(() => {
    if (!isLoading && !admin) {
      router.push("/admin/login?returnUrl=%2Fteacher-assistant");
    }
  }, [isLoading, admin, router]);

  if (isLoading || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" />
      </div>
    );
  }

  const handleSubmit = (input: AssignmentInput) => {
    setGeneratedFrom(input);
    generate.mutate(input, {
      onSuccess: (result) => {
        setAssignment(result);
        showToast("Assignment generated.", "success");
      },
      onError: (error) => {
        showToast(error instanceof Error ? error.message : "Generation failed.", "error");
      },
    });
  };

  const handleReset = () => {
    setAssignment(null);
    setGeneratedFrom(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100">
      <header className="bg-white border-b border-amber-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
              <GraduationCap className="w-6 h-6" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Teacher Assistant</h1>
              <p className="text-xs text-gray-500">v{TEACHER_ASSISTANT_VERSION}</p>
            </div>
          </div>
          {assignment ? (
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-gray-600 hover:text-amber-700"
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
        )}
      </main>
    </div>
  );
}
