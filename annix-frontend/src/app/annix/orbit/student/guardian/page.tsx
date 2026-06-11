"use client";

import { useToast } from "@/app/components/Toast";
import { useAlert } from "@/app/lib/hooks/useAlert";
import {
  useOrbitAcceptGuardianLink,
  useOrbitGuardianStudents,
  useOrbitRecordGuardianConsent,
} from "@/app/lib/query/hooks";

export default function GuardianDashboardPage() {
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const studentsQuery = useOrbitGuardianStudents();
  const acceptLink = useOrbitAcceptGuardianLink();
  const recordConsent = useOrbitRecordGuardianConsent();

  const data = studentsQuery.data;
  const students = data ? data.students : [];

  const handleAccept = async (linkId: string) => {
    try {
      await acceptLink.mutateAsync(linkId);
      showToast("Invite accepted", "success");
    } catch {
      alert({ message: "Could not accept the invite — please try again.", variant: "error" });
    }
  };

  const handleConsent = async (linkId: string) => {
    try {
      await recordConsent.mutateAsync(linkId);
      showToast("Consent recorded", "success");
    } catch {
      alert({ message: "Could not record consent — please try again.", variant: "error" });
    }
  };

  return (
    <div className="space-y-6">
      {AlertDialog}
      <header>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--brand-navbar)" }}>
          For parents &amp; guardians
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Learners who have linked you as their guardian. Accept an invite to confirm the link, and
          record consent so an under-age learner's FuturePath profile can be processed.
        </p>
      </header>

      {studentsQuery.isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : students.length === 0 ? (
        <p className="text-sm text-gray-500">
          No linked learners yet. A student invites you from their FuturePath page using your email
          address.
        </p>
      ) : (
        <ul className="space-y-3">
          {students.map((s) => {
            const pending = s.status === "invited";
            const schoolName = s.school;
            const schoolLabel = schoolName || "Learner";
            return (
              <li key={s.linkId} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{schoolLabel}</span>
                  <span className="text-xs text-gray-500">{s.curriculum}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {s.resultsCount} result{s.resultsCount === 1 ? "" : "s"} · {s.applicationsCount}{" "}
                  application{s.applicationsCount === 1 ? "" : "s"}
                  {s.isMinor ? " · under consent age" : ""}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {pending ? (
                    <button
                      type="button"
                      onClick={() => handleAccept(s.linkId)}
                      disabled={acceptLink.isPending}
                      className="rounded px-3 py-1.5 text-sm text-white"
                      style={{ backgroundColor: "var(--brand-navbar)" }}
                    >
                      Accept invite
                    </button>
                  ) : (
                    <span className="text-xs rounded-full px-2 py-0.5 bg-green-100 text-green-800">
                      Linked
                    </span>
                  )}
                  {s.consentRequired ? (
                    <button
                      type="button"
                      onClick={() => handleConsent(s.linkId)}
                      disabled={recordConsent.isPending}
                      className="rounded border border-amber-400 px-3 py-1.5 text-sm text-amber-900"
                    >
                      Record consent
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">Consent on file</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
