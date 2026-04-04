"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  InterventionType,
  QcControlPlanRecord,
  QcpActivity,
} from "@/app/lib/api/stockControlApi";
import { SignaturePad } from "@/app/stock-control/components/SignaturePad";
import { browserBaseUrl } from "@/lib/api-config";

type ReviewStatus = "loading" | "ready" | "submitted" | "error";

interface TokenDetails {
  token: {
    id: number;
    partyRole: "mps" | "client" | "third_party";
    recipientEmail: string;
    status: string;
  };
  plan: QcControlPlanRecord;
  company: {
    name: string;
    logoUrl: string | null;
    primaryColor: string | null;
  };
}

const INTERVENTION_TYPES: InterventionType[] = ["H", "I", "W", "R", "S", "V"];

const INTERVENTION_LABELS: Record<InterventionType, string> = {
  H: "Hold",
  I: "Inspection",
  W: "Witness",
  R: "Review",
  S: "Surveillance",
  V: "Verify",
};

function publicApi(path: string, options?: RequestInit) {
  return fetch(`${browserBaseUrl()}/stock-control/public/qcp-review${path}`, options);
}

export default function QcpReviewPage() {
  const params = useParams();
  const tokenStr = params.token as string;

  const [status, setStatus] = useState<ReviewStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<TokenDetails | null>(null);
  const [activities, setActivities] = useState<QcpActivity[]>([]);
  const [lineRemarks, setLineRemarks] = useState<Record<number, string>>({});
  const [overallComments, setOverallComments] = useState("");
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedAction, setSubmittedAction] = useState<string | null>(null);
  const [forwardEmail, setForwardEmail] = useState("");
  const [forwardName, setForwardName] = useState("");
  const [isForwarding, setIsForwarding] = useState(false);
  const [forwardSuccess, setForwardSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await publicApi(`/${tokenStr}`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setErrorMessage(data?.message || "Invalid or expired review link");
          setStatus("error");
          return;
        }
        const data: TokenDetails = await res.json();
        setDetails(data);
        setActivities(data.plan.activities);
        setStatus("ready");
      } catch {
        setErrorMessage("Failed to load review. Please try again later.");
        setStatus("error");
      }
    };
    load();
  }, [tokenStr]);

  const partyKeyMap: Record<string, "mps" | "client" | "thirdParty"> = {
    mps: "mps",
    client: "client",
    third_party: "thirdParty",
  };
  const partyKey = partyKeyMap[details?.token.partyRole || "client"] || "client";

  const updateIntervention = useCallback(
    (activityIndex: number, value: InterventionType | null) => {
      setActivities((prev) =>
        prev.map((a, i) =>
          i === activityIndex
            ? { ...a, [partyKey]: { ...a[partyKey], interventionType: value } }
            : a,
        ),
      );
    },
    [partyKey],
  );

  const updateInitial = useCallback(
    (activityIndex: number, value: string) => {
      setActivities((prev) =>
        prev.map((a, i) =>
          i === activityIndex
            ? { ...a, [partyKey]: { ...a[partyKey], initial: value || null } }
            : a,
        ),
      );
    },
    [partyKey],
  );

  const handleApprove = useCallback(
    async (signatureUrl: string) => {
      if (!signatureName.trim()) return;
      setIsSubmitting(true);
      try {
        const remarksArray = Object.entries(lineRemarks)
          .filter(([, v]) => v.trim())
          .map(([k, v]) => ({ operationNumber: Number(k), remark: v }));

        const res = await publicApi(`/${tokenStr}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "approve",
            activities,
            lineRemarks: remarksArray,
            overallComments: overallComments || null,
            signatureName: signatureName.trim(),
            signatureUrl,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setErrorMessage(data?.message || "Failed to submit approval");
          return;
        }

        setSubmittedAction("approved");
        setStatus("submitted");
      } catch {
        setErrorMessage("Failed to submit. Please try again.");
      } finally {
        setIsSubmitting(false);
        setShowSignaturePad(false);
      }
    },
    [tokenStr, activities, lineRemarks, overallComments, signatureName],
  );

  const handleRequestChanges = useCallback(async () => {
    const remarksArray = Object.entries(lineRemarks)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => ({ operationNumber: Number(k), remark: v }));

    if (remarksArray.length === 0 && !overallComments.trim()) {
      setErrorMessage("Please add at least one remark or comment explaining the requested changes");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await publicApi(`/${tokenStr}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_changes",
          activities,
          lineRemarks: remarksArray,
          overallComments: overallComments || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorMessage(data?.message || "Failed to submit change request");
        return;
      }

      setSubmittedAction("changes_requested");
      setStatus("submitted");
    } catch {
      setErrorMessage("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [tokenStr, activities, lineRemarks, overallComments]);

  const handleSavePreferences = useCallback(async () => {
    const prefs: Record<number, string> = {};
    activities.forEach((a) => {
      const intervention = a[partyKey]?.interventionType;
      if (intervention) {
        prefs[a.operationNumber] = intervention;
      }
    });

    try {
      await publicApi(`/${tokenStr}/save-preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefs }),
      });
      setErrorMessage(null);
    } catch {
      setErrorMessage("Failed to save preferences");
    }
  }, [tokenStr, activities, partyKey]);

  const handleForward = useCallback(async () => {
    if (!forwardEmail.trim()) return;
    const isMps = details?.token.partyRole === "mps";
    const endpoint = isMps ? "forward-to-client" : "forward";
    setIsForwarding(true);
    try {
      const res = await publicApi(`/${tokenStr}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forwardEmail.trim(),
          name: forwardName.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorMessage(data?.message || "Failed to forward");
        return;
      }

      setForwardSuccess(true);
    } catch {
      setErrorMessage("Failed to forward. Please try again.");
    } finally {
      setIsForwarding(false);
    }
  }, [tokenStr, forwardEmail, forwardName, details?.token.partyRole]);

  const primaryColor = details?.company.primaryColor || "#0d9488";

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-teal-600" />
          <p className="mt-3 text-sm text-gray-500">Loading review...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-lg bg-white p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <span className="text-xl text-red-600">!</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Unable to Load Review</h2>
          <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (status === "submitted") {
    const isApproved = submittedAction === "approved";
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-lg bg-white p-8 shadow-sm text-center">
          <div
            className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${isApproved ? "bg-green-100" : "bg-amber-100"}`}
          >
            <span className={`text-xl ${isApproved ? "text-green-600" : "text-amber-600"}`}>
              {isApproved ? "\u2713" : "\u2190"}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isApproved ? "QCP Approved" : "Changes Requested"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isApproved
              ? `Thank you. The QCP has been approved and ${details?.company.name || "the team"} has been notified.`
              : `Your change request has been sent to ${details?.company.name || "the team"} for revision.`}
          </p>

          {isApproved &&
            (details?.token.partyRole === "mps" || details?.token.partyRole === "client") && (
              <div className="mt-6 rounded-lg border border-gray-200 p-4 text-left">
                <h3 className="text-sm font-semibold text-gray-900">
                  {details.token.partyRole === "mps"
                    ? "Forward to End Client?"
                    : "Forward to 3rd Party?"}
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  {details.token.partyRole === "mps"
                    ? "If the end client needs to review this QCP, enter their details below."
                    : "If a third-party inspector needs to review this QCP, enter their details below."}
                </p>
                {forwardSuccess ? (
                  <p className="mt-3 text-sm text-green-700">
                    Review request sent to {forwardEmail}
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    <input
                      type="email"
                      value={forwardEmail}
                      onChange={(e) => setForwardEmail(e.target.value)}
                      placeholder={
                        details.token.partyRole === "mps" ? "End client email" : "3rd party email"
                      }
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={forwardName}
                      onChange={(e) => setForwardName(e.target.value)}
                      placeholder={
                        details.token.partyRole === "mps"
                          ? "End client name (optional)"
                          : "3rd party name (optional)"
                      }
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleForward}
                      disabled={isForwarding || !forwardEmail.trim()}
                      className="w-full rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      {isForwarding
                        ? "Sending..."
                        : details.token.partyRole === "mps"
                          ? "Forward to End Client"
                          : "Forward to 3rd Party"}
                    </button>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    );
  }

  const plan = details?.plan;
  if (!plan || !details) return null;

  const roleLabelMap: Record<string, string> = {
    mps: "Polymer Customer",
    client: "Client",
    third_party: "3rd Party",
  };
  const roleLabel = roleLabelMap[details.token.partyRole] || "Client";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm">
        {details.company.logoUrl && (
          <img src={details.company.logoUrl} alt={details.company.name} className="h-10 w-auto" />
        )}
        <div>
          <h1 className="text-lg font-bold" style={{ color: primaryColor }}>
            {details.company.name}
          </h1>
          <p className="text-xs text-gray-500">Quality Control Plan Review</p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
          <button onClick={() => setErrorMessage(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <span className="text-xs font-medium text-gray-500">QCP Number</span>
            <p className="font-semibold text-gray-900">{plan.qcpNumber || `QCP #${plan.id}`}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">Revision</span>
            <p className="text-gray-900">{plan.revision || "01"}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">Customer</span>
            <p className="text-gray-900">{plan.customerName || "-"}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">Job</span>
            <p className="text-gray-900">{plan.jobName || "-"}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            Reviewing as {roleLabel}
          </span>
          {plan.version > 1 && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Version {plan.version}
            </span>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-lg bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Activities & Intervention Matrix</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            H = Hold, I = Inspection, W = Witness, R = Review, S = Surveillance, V = Verify. Fill in
            your {roleLabel} interventions below.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10 px-2 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Op
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Description
                </th>
                <th className="w-28 px-2 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Spec
                </th>
                <th className="w-24 px-2 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Doc
                </th>
                <th className="w-20 px-2 py-2 text-center text-xs font-medium uppercase text-gray-500">
                  PLS
                </th>
                <th className="w-20 px-2 py-2 text-center text-xs font-medium uppercase text-gray-500">
                  MPS
                </th>
                <th
                  className="w-28 px-2 py-2 text-center text-xs font-medium uppercase"
                  style={{ color: primaryColor }}
                >
                  {roleLabel}
                </th>
                <th className="w-40 px-2 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activities.map((activity, idx) => {
                const so = activity[partyKey];
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-2 py-1.5 text-center font-medium text-gray-700">
                      {activity.operationNumber}
                    </td>
                    <td className="px-2 py-1.5 text-gray-900">{activity.description}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-500">
                      {activity.specification || "-"}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-500">
                      {activity.documentation || "-"}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className="font-medium text-gray-600">
                        {activity.pls.interventionType || "-"}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className="font-medium text-gray-600">
                        {activity.mps.interventionType || "-"}
                      </span>
                    </td>
                    <td className="px-1 py-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={so?.interventionType || ""}
                          onChange={(e) =>
                            updateIntervention(idx, (e.target.value as InterventionType) || null)
                          }
                          className="w-11 rounded border border-gray-300 px-0.5 py-1 text-center text-xs"
                          style={{
                            borderColor: so?.interventionType ? primaryColor : undefined,
                          }}
                        >
                          <option value="">-</option>
                          {INTERVENTION_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t} - {INTERVENTION_LABELS[t]}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={so?.initial || ""}
                          onChange={(e) => updateInitial(idx, e.target.value)}
                          maxLength={5}
                          placeholder="init"
                          className="w-12 rounded border border-gray-300 px-1 py-1 text-center text-xs"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={lineRemarks[activity.operationNumber] || ""}
                        onChange={(e) =>
                          setLineRemarks((prev) => ({
                            ...prev,
                            [activity.operationNumber]: e.target.value,
                          }))
                        }
                        placeholder="Optional remark"
                        className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium text-gray-700">Overall Comments</label>
        <textarea
          value={overallComments}
          onChange={(e) => setOverallComments(e.target.value)}
          rows={3}
          placeholder="Any general comments or notes about this QCP..."
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {showSignaturePad ? (
        <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700">Your Name</label>
            <input
              type="text"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Full name"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <p className="mb-2 text-xs text-gray-500">Draw your signature below:</p>
          <SignaturePad
            onSave={(dataUrl) => handleApprove(dataUrl)}
            onCancel={() => setShowSignaturePad(false)}
            width={400}
            height={150}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSavePreferences}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Save for Future
            </button>
            <button
              type="button"
              onClick={() => {
                publicApi(`/${tokenStr}/pdf`)
                  .then((res) => res.blob())
                  .then((b) => {
                    const url = URL.createObjectURL(b);
                    window.open(url, "_blank");
                  })
                  .catch(() => setErrorMessage("Failed to load PDF"));
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View PDF
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRequestChanges}
              disabled={isSubmitting}
              className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Request Changes"}
            </button>
            <button
              type="button"
              onClick={() => setShowSignaturePad(true)}
              disabled={isSubmitting}
              className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              Approve QCP
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
