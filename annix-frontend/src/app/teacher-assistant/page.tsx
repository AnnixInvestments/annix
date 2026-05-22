"use client";

import type { Assignment, AssignmentInput } from "@annix/product-data/teacher-assistant";
import { isArray, isString } from "es-toolkit/compat";
import { AlertTriangle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import PortalToolbar, { type NavItem } from "@/app/components/PortalToolbar";
import { useToast } from "@/app/components/Toast";
import { useFullWidthLayout } from "@/app/context/LayoutContext";
import { type ApiError, extractErrorMessage, isApiError } from "@/app/lib/api/apiError";
import { metricsApi } from "@/app/lib/api/metricsApi";
import { useGenerateAssignment } from "@/app/lib/query/hooks";
import {
  type RecentAssignmentEntry,
  useTeacherAssistantStore,
} from "@/app/lib/store/teacherAssistantStore";
import { AssignmentPreview } from "./components/AssignmentPreview";
import { RecentAssignmentsList } from "./components/RecentAssignmentsList";
import { TeacherAssistantForm } from "./components/TeacherAssistantForm";
import { TEACHER_ASSISTANT_VERSION } from "./config/version";
import { useTeacherAssistantAuth } from "./context/TeacherAssistantAuthContext";

const FALLBACK_GENERATION_MS = 75_000;
const MIN_GENERATION_ESTIMATE_MS = 45_000;
const MAX_GENERATION_ESTIMATE_MS = 110_000;
const METRIC_CATEGORY = "teacher-assistant-generate";

const NAV_ITEMS: NavItem[] = [];

async function realisticEstimateMs(subject: string): Promise<number> {
  try {
    const stats = await metricsApi.extractionStats(METRIC_CATEGORY, subject);
    const rawAverage = stats.averageMs;
    if (rawAverage === null || rawAverage <= 0) return FALLBACK_GENERATION_MS;
    const cushion = Math.round(rawAverage * 1.15);
    return Math.min(MAX_GENERATION_ESTIMATE_MS, Math.max(MIN_GENERATION_ESTIMATE_MS, cushion));
  } catch {
    return FALLBACK_GENERATION_MS;
  }
}

export default function TeacherAssistantPage() {
  useFullWidthLayout();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useTeacherAssistantAuth();
  const { showToast } = useToast();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const generate = useGenerateAssignment();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [generatedFrom, setGeneratedFrom] = useState<AssignmentInput | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastFailures, setLastFailures] = useState<string[]>([]);

  const recent = useTeacherAssistantStore((s) => s.recent);
  const rememberAssignment = useTeacherAssistantStore((s) => s.rememberAssignment);
  const forgetAssignment = useTeacherAssistantStore((s) => s.forgetAssignment);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/teacher-assistant/login?returnUrl=%2Fteacher-assistant");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF8A00]" />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.replace("/teacher-assistant/login");
  };

  const handleSubmit = async (input: AssignmentInput) => {
    setGeneratedFrom(input);
    setLastError(null);
    setLastFailures([]);
    const estimatedDurationMs = await realisticEstimateMs(input.subject);
    showExtraction({
      brand: "teacher-assistant",
      label: `Generating ${input.subject} assignment on "${input.topic}"…`,
      estimatedDurationMs,
    });
    generate.mutate(input, {
      onSuccess: (result) => {
        hideExtraction();
        setAssignment(result);
        rememberAssignment(input, result);
        const successMessage =
          result.qualityWarnings && result.qualityWarnings.length > 0
            ? "Assignment generated — review the caveats banner."
            : "Assignment generated.";
        showToast(successMessage, "success");
      },
      onError: (error) => {
        hideExtraction();
        const message = extractErrorMessage(error, "Generation failed.");
        setLastError(message);
        setLastFailures(extractFailures(error));
      },
    });
  };

  const handleReset = () => {
    setAssignment(null);
    setGeneratedFrom(null);
  };

  const handleRegenerateAll = () => {
    if (!generatedFrom) return;
    handleSubmit(generatedFrom);
  };

  const handleOpenRecent = (entry: RecentAssignmentEntry) => {
    setGeneratedFrom(entry.input);
    setAssignment(entry.assignment);
  };

  const nameParts = user.name.split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;
  const rawSchoolName = user.schoolName;
  const companyName = rawSchoolName ?? undefined;
  const startNewAssignmentAction = assignment ? (
    <button
      type="button"
      onClick={handleReset}
      className="text-sm text-white/80 hover:text-[#FF8A00] transition-colors px-3 py-2"
    >
      Start new assignment
    </button>
  ) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40]">
      <PortalToolbar
        portalType="teacherAssistant"
        navItems={NAV_ITEMS}
        user={{
          firstName,
          lastName,
          email: user.email,
          companyName,
        }}
        onLogout={handleLogout}
        version={TEACHER_ASSISTANT_VERSION}
        additionalActions={startNewAssignmentAction}
      />

      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {assignment && generatedFrom ? (
          <AssignmentPreview
            initialAssignment={assignment}
            generatedFrom={generatedFrom}
            onRegenerateAll={handleRegenerateAll}
            isRegeneratingAll={generate.isPending}
          />
        ) : (
          <>
            <RecentAssignmentsList
              recent={recent}
              onOpen={handleOpenRecent}
              onForget={forgetAssignment}
            />
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 md:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create a new assignment</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Generate a process-based, AI-aware assignment in seconds. The output is fully
                  editable before export.
                </p>
              </div>
              {lastError ? (
                <div
                  role="alert"
                  className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-sm text-red-800">
                    <p className="font-semibold mb-1">Generation failed</p>
                    <p>{lastError}</p>
                    {lastFailures.length > 0 ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-red-700 hover:text-red-900 font-medium">
                          What the AI struggled with ({lastFailures.length})
                        </summary>
                        <ul className="mt-2 ml-2 space-y-1 list-disc list-inside text-red-700">
                          {lastFailures.slice(0, 8).map((failure) => (
                            <li key={failure}>{failure}</li>
                          ))}
                          {lastFailures.length > 8 ? (
                            <li className="opacity-70">…and {lastFailures.length - 8} more.</li>
                          ) : null}
                        </ul>
                      </details>
                    ) : null}
                    <p className="mt-2 text-red-700">
                      Try a more specific topic, change the difficulty, or try again in a few
                      seconds.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLastError(null);
                      setLastFailures([]);
                    }}
                    className="text-red-400 hover:text-red-600"
                    aria-label="Dismiss error"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : null}
              <TeacherAssistantForm onSubmit={handleSubmit} isSubmitting={generate.isPending} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

interface FailureLike {
  message?: unknown;
  code?: unknown;
}

function extractFailures(error: unknown): string[] {
  if (!isApiError(error)) return [];
  const apiError = error as ApiError;
  const meta = apiError.meta;
  if (!meta || !isArray(meta.failures)) return [];
  return (meta.failures as FailureLike[])
    .map((f) => (isString(f?.message) ? f.message : ""))
    .filter((m) => m.length > 0);
}
