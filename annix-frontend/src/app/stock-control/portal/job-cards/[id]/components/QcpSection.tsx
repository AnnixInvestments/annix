"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import type {
  InterventionType,
  QcControlPlanRecord,
  QcpActivity,
  QcpApprovalStatus,
  QcpPlanType,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { InitialsPad } from "@/app/stock-control/components/InitialsPad";
import { QcpEditorModal } from "./QcpEditorModal";
import { QcpForm } from "./QcpForm";

interface QcpSectionProps {
  jobCardId?: number | null;
  cpoId?: number | null;
  readOnly?: boolean;
}

type ViewMode = "list" | "create" | "edit";

const PLAN_TYPE_LABELS: Record<QcpPlanType, string> = {
  paint_external: "Paint Ext",
  paint_internal: "Paint Int",
  rubber: "Rubber",
  hdpe: "HDPE",
};

const PLAN_TYPE_COLORS: Record<QcpPlanType, string> = {
  paint_external: "bg-blue-100 text-blue-800",
  paint_internal: "bg-indigo-100 text-indigo-800",
  rubber: "bg-amber-100 text-amber-800",
  hdpe: "bg-emerald-100 text-emerald-800",
};

const INTERVENTION_LABELS: Record<InterventionType, string> = {
  H: "Hold",
  I: "Inspection",
  W: "Witness",
  R: "Review",
  S: "Surveillance",
  V: "Verify",
};

const INTERVENTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "-" },
  { value: "H", label: "H" },
  { value: "I", label: "I" },
  { value: "W", label: "W" },
  { value: "R", label: "R" },
  { value: "S", label: "S" },
  { value: "V", label: "V" },
];

const APPROVAL_STATUS_COLORS: Record<QcpApprovalStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_mps: "bg-cyan-100 text-cyan-800",
  pending_client: "bg-blue-100 text-blue-800",
  pending_third_party: "bg-indigo-100 text-indigo-800",
  changes_requested: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
};

const APPROVAL_STATUS_LABELS: Record<QcpApprovalStatus, string> = {
  draft: "Draft",
  pending_mps: "Pending Customer",
  pending_client: "Pending Client",
  pending_third_party: "Pending 3rd Party",
  changes_requested: "Changes Requested",
  approved: "Approved",
};

const IGNORED_WORDS = new Set([
  "pty",
  "ltd",
  "proprietary",
  "limited",
  "the",
  "and",
  "of",
  "cc",
  "inc",
  "incorporated",
  "sa",
  "group",
]);

function customerShortName(name: string | null): string {
  if (!name) return "Client";
  const cleaned = name.replace(/\(.*?\)/g, "").trim();
  const words = cleaned.split(/\s+/).filter((w) => !IGNORED_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return "Client";
  if (words.length === 1) return words[0];
  return words
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function filteredSpec(spec: string | null, planType: QcpPlanType): string {
  if (!spec) return "";
  const isPaint = planType === "paint_external" || planType === "paint_internal";
  const isRubber = planType === "rubber";
  if (!isPaint && !isRubber) return spec;

  const parts = spec
    .split(/(?=\bINT\s*:|EXT\s*:)/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1) return spec;

  if (isPaint) {
    const extParts = parts.filter((p) => /^EXT\s*:/i.test(p));
    return extParts.length > 0 ? extParts.join(" ") : spec;
  }
  const intParts = parts.filter((p) => /^INT\s*:/i.test(p));
  return intParts.length > 0 ? intParts.join(" ") : spec;
}

function signOffProgress(plan: QcControlPlanRecord): { signed: number; total: number } {
  const total = plan.activities.reduce((acc, a) => {
    const count =
      (a.pls.interventionType ? 1 : 0) +
      (a.mps.interventionType ? 1 : 0) +
      (a.client.interventionType ? 1 : 0);
    return acc + count;
  }, 0);
  const signed = plan.activities.reduce((acc, a) => {
    const count =
      (a.pls.interventionType && a.pls.name ? 1 : 0) +
      (a.mps.interventionType && a.mps.name ? 1 : 0) +
      (a.client.interventionType && a.client.name ? 1 : 0);
    return acc + count;
  }, 0);
  return { signed, total };
}

function interventionSummary(plan: QcControlPlanRecord): string {
  const types = new Set<InterventionType>();
  plan.activities.forEach((a) => {
    if (a.pls.interventionType) types.add(a.pls.interventionType);
    if (a.mps.interventionType) types.add(a.mps.interventionType);
    if (a.client.interventionType) types.add(a.client.interventionType);
  });
  return Array.from(types)
    .map((t) => INTERVENTION_LABELS[t])
    .join(", ");
}

type PartyKey = "pls" | "mps" | "client" | "thirdParty";

function PartyCell(props: {
  activity: QcpActivity;
  activityIndex: number;
  party: PartyKey;
  editable: boolean;
  onChangeIntervention: (idx: number, party: PartyKey, value: InterventionType | null) => void;
  onClickInitial: (idx: number, party: PartyKey) => void;
}) {
  const so = props.activity[props.party];
  const interventionType = so.interventionType;
  if (!props.editable) {
    if (!so.interventionType) {
      return <td className="px-2 py-1.5 text-center text-gray-300">-</td>;
    }
    return (
      <td className="px-2 py-1.5 text-center">
        <span className="font-medium">{so.interventionType}</span>
        {so.initial && <span className="ml-1 text-gray-500">{so.initial}</span>}
      </td>
    );
  }

  const initial = so.initial;
  return (
    <td className="px-1 py-1 text-center">
      <div className="flex items-center justify-center gap-0.5">
        <select
          value={interventionType || ""}
          onChange={(e) => {
            const val = e.target.value;
            props.onChangeIntervention(
              props.activityIndex,
              props.party,
              val ? (val as InterventionType) : null,
            );
          }}
          className="w-10 rounded border border-gray-300 px-0.5 py-0.5 text-xs text-center focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
        >
          {INTERVENTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => props.onClickInitial(props.activityIndex, props.party)}
          className={`w-10 rounded border px-0.5 py-0.5 text-xs text-center ${so.initial ? "border-teal-300 bg-teal-50 font-medium text-teal-800" : "border-gray-300 text-gray-400 hover:border-teal-400 hover:bg-teal-50"}`}
        >
          {initial || "init"}
        </button>
      </div>
    </td>
  );
}

export function QcpSection(props: QcpSectionProps) {
  const rawJobCardId = props.jobCardId;
  const jobCardId = rawJobCardId || null;
  const rawCpoId = props.cpoId;
  const cpoId = rawCpoId || null;
  const rawReadOnly = props.readOnly;
  const readOnly = rawReadOnly || false;
  const isCpoMode = cpoId !== null && jobCardId === null;

  const [plans, setPlans] = useState<QcControlPlanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingPlan, setEditingPlan] = useState<QcControlPlanRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [reviewPlan, setReviewPlan] = useState<QcControlPlanRecord | null>(null);
  const [editModalPlan, setEditModalPlan] = useState<QcControlPlanRecord | null>(null);
  const [initialsTarget, setInitialsTarget] = useState<{
    planId: number;
    activityIdx: number;
    party: PartyKey;
  } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pdfPreview = usePdfPreview();

  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = isCpoMode
        ? await stockControlApiClient.controlPlansForCpo(cpoId)
        : await stockControlApiClient.controlPlansForJobCard(jobCardId!);
      setPlans(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load control plans");
    } finally {
      setIsLoading(false);
    }
  }, [jobCardId, cpoId, isCpoMode]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const debouncedSave = useCallback(
    (planId: number, activities: QcpActivity[]) => {
      if (readOnly) return;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(async () => {
        try {
          if (isCpoMode) {
            await stockControlApiClient.updateControlPlanForCpo(cpoId, planId, { activities });
          } else {
            await stockControlApiClient.updateControlPlan(jobCardId!, planId, { activities });
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save changes");
        }
      }, 600);
    },
    [jobCardId, cpoId, isCpoMode, readOnly],
  );

  const handlePartyInterventionChange = useCallback(
    (planId: number, activityIdx: number, party: PartyKey, value: InterventionType | null) => {
      setPlans((prev) =>
        prev.map((p) => {
          if (p.id !== planId) return p;
          const updatedActivities = p.activities.map((a, i) => {
            if (i !== activityIdx) return a;
            return {
              ...a,
              [party]: { ...a[party], interventionType: value },
            };
          });
          debouncedSave(planId, updatedActivities);
          return { ...p, activities: updatedActivities };
        }),
      );
    },
    [debouncedSave],
  );

  const handlePartyInitialChange = useCallback(
    (planId: number, activityIdx: number, party: PartyKey, value: string) => {
      setPlans((prev) =>
        prev.map((p) => {
          if (p.id !== planId) return p;
          const updatedActivities = p.activities.map((a, i) => {
            if (i !== activityIdx) return a;
            return {
              ...a,
              [party]: { ...a[party], initial: value || null },
            };
          });
          debouncedSave(planId, updatedActivities);
          return { ...p, activities: updatedActivities };
        }),
      );
    },
    [debouncedSave],
  );

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      if (isCpoMode) {
        await stockControlApiClient.deleteControlPlanForCpo(cpoId, id);
      } else {
        await stockControlApiClient.deleteControlPlan(jobCardId!, id);
      }
      fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete control plan");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = () => {
    setViewMode("list");
    setEditingPlan(null);
    fetchPlans();
  };

  const handleEdit = (plan: QcControlPlanRecord) => {
    setEditingPlan(plan);
    setViewMode("edit");
  };

  const handleAutoGenerate = async () => {
    try {
      setIsAutoGenerating(true);
      setError(null);
      if (isCpoMode) {
        await stockControlApiClient.autoGenerateControlPlansForCpo(cpoId);
      } else {
        await stockControlApiClient.autoGenerateControlPlans(jobCardId!);
      }
      fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to auto-generate QCPs");
    } finally {
      setIsAutoGenerating(false);
    }
  };

  if (!readOnly && (viewMode === "create" || viewMode === "edit") && jobCardId) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <QcpForm
          jobCardId={jobCardId}
          existingPlan={editingPlan}
          onSaved={handleSaved}
          onCancel={() => {
            setViewMode("list");
            setEditingPlan(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Quality Control Plans
          {plans.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500">({plans.length})</span>
          )}
        </h3>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoGenerate}
              disabled={isAutoGenerating}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isAutoGenerating
                ? "Generating..."
                : plans.length > 0
                  ? "Re-Generate"
                  : "Auto-Generate"}
            </button>
            {!isCpoMode && (
              <button
                type="button"
                onClick={() => {
                  setEditingPlan(null);
                  setViewMode("create");
                }}
                className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
              >
                + New QCP
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-5 mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading...</div>
      ) : plans.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500">No quality control plans yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Create a QCP to define inspection activities and intervention requirements
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {plans.map((plan) => {
            const progress = signOffProgress(plan);
            const isExpanded = expandedId === plan.id;
            const custLabel = customerShortName(plan.customerName);
            const qcpNumber = plan.qcpNumber;
            const customerName = plan.customerName;
            const orderNumber = plan.orderNumber;
            const revision = plan.revision;
            return (
              <div key={plan.id}>
                <div
                  className="flex cursor-pointer items-center justify-between px-5 py-3 hover:bg-gray-50"
                  onClick={() => setExpandedId(isExpanded ? null : plan.id)}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PLAN_TYPE_COLORS[plan.planType]}`}
                    >
                      {PLAN_TYPE_LABELS[plan.planType]}
                    </span>
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {qcpNumber || `QCP #${plan.id}`}
                      </span>
                      {plan.revision && (
                        <span className="ml-1.5 inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                          V{plan.revision}
                        </span>
                      )}
                      {(() => {
                        const approvalStatus = plan.approvalStatus;
                        if (!approvalStatus || approvalStatus === "draft") return null;
                        const statusKey = approvalStatus as QcpApprovalStatus;
                        const statusColor = APPROVAL_STATUS_COLORS[statusKey];
                        const statusLabel = APPROVAL_STATUS_LABELS[statusKey];
                        return (
                          <span
                            className={`ml-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor || ""}`}
                          >
                            {statusLabel || approvalStatus}
                          </span>
                        );
                      })()}
                      {plan.version > 1 && (
                        <span className="ml-1.5 text-[10px] text-gray-400">v{plan.version}</span>
                      )}
                      {plan.specification && (
                        <span className="ml-2 text-xs text-gray-500">
                          {filteredSpec(plan.specification, plan.planType)}
                        </span>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{plan.activities.length} activities</span>
                        <span className="text-gray-300">|</span>
                        <span>
                          {progress.signed}/{progress.total} signed
                        </span>
                        {progress.total > 0 && progress.signed === progress.total && (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Complete
                          </span>
                        )}
                        <span className="text-gray-300">|</span>
                        <span>by {plan.createdByName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const qcpNum = qcpNumber || `QCP-${plan.id}`;
                        pdfPreview.openWithFetch(
                          () =>
                            isCpoMode
                              ? stockControlApiClient.openControlPlanPdfForCpo(cpoId, plan.id)
                              : stockControlApiClient.openControlPlanPdf(jobCardId!, plan.id),
                          `${qcpNum}.pdf`,
                        );
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReviewPlan(plan);
                      }}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Review
                    </button>
                    {isCpoMode ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditModalPlan(plan);
                        }}
                        className="text-sm text-teal-600 hover:text-teal-800"
                      >
                        Edit
                      </button>
                    ) : null}
                    {!readOnly && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(plan);
                          }}
                          className="text-sm text-teal-600 hover:text-teal-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(plan.id);
                          }}
                          disabled={deletingId === plan.id}
                          className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
                        >
                          {deletingId === plan.id ? "..." : "Delete"}
                        </button>
                      </>
                    )}
                    <span className="text-xs text-gray-400">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
                    <div className="mb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-600">
                      <div>
                        <span className="font-medium">Customer:</span> {customerName || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Order:</span> {orderNumber || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Revision:</span> {revision || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Interventions:</span>{" "}
                        {interventionSummary(plan) || "-"}
                      </div>
                    </div>

                    {(() => {
                      const allParties: Array<{ key: PartyKey; label: string }> = [
                        { key: "pls", label: "PLS" },
                        { key: "mps", label: custLabel },
                        { key: "client", label: "Client" },
                        { key: "thirdParty", label: "3rd Party" },
                      ];
                      const activeKeys = (plan.activeParties as string[] | null) || [
                        "pls",
                        "mps",
                        "client",
                        "thirdParty",
                      ];
                      const visibleParties = allParties.filter((p) => activeKeys.includes(p.key));

                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full divide-y divide-gray-200 text-xs">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="px-2 py-1.5 text-left font-medium text-gray-500">
                                  Op
                                </th>
                                <th className="px-2 py-1.5 text-left font-medium text-gray-500">
                                  Activity
                                </th>
                                <th className="px-2 py-1.5 text-left font-medium text-gray-500">
                                  Spec/Proc
                                </th>
                                <th className="px-2 py-1.5 text-left font-medium text-gray-500">
                                  Doc
                                </th>
                                {visibleParties.map((p) => (
                                  <th
                                    key={p.key}
                                    className="px-2 py-1.5 text-center font-medium text-gray-500"
                                  >
                                    {p.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {plan.activities.map((a, i) => {
                                const specification = a.specification;
                                const documentation = (a as any).documentation;
                                const procedureRequired = a.procedureRequired;
                                return (
                                  <tr key={i}>
                                    <td className="px-2 py-1.5 text-center">{a.operationNumber}</td>
                                    <td className="px-2 py-1.5">{a.description}</td>
                                    <td className="px-2 py-1.5 text-gray-500">
                                      {specification || "-"}
                                    </td>
                                    <td className="px-2 py-1.5 text-gray-500">
                                      {documentation || procedureRequired || "-"}
                                    </td>
                                    {visibleParties.map((p) => (
                                      <PartyCell
                                        key={p.key}
                                        activity={a}
                                        activityIndex={i}
                                        party={p.key}
                                        editable={!readOnly && (p.key === "pls" || p.key === "mps")}
                                        onChangeIntervention={(idx, party, val) =>
                                          handlePartyInterventionChange(plan.id, idx, party, val)
                                        }
                                        onClickInitial={(idx, party) =>
                                          setInitialsTarget({
                                            planId: plan.id,
                                            activityIdx: idx,
                                            party,
                                          })
                                        }
                                      />
                                    ))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}

                    {plan.approvalSignatures.some((s) => s.name) && (
                      <div className="mt-3 flex gap-4">
                        {plan.approvalSignatures
                          .filter((s) => s.name)
                          .map((s, i) => (
                            <div key={i} className="text-xs text-gray-600">
                              <span className="font-medium">{s.party}:</span> {s.name}
                              {s.date && <span className="ml-1 text-gray-400">({s.date})</span>}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {initialsTarget &&
        (() => {
          const targetPlan = plans.find((p) => p.id === initialsTarget.planId);
          const targetActivity = targetPlan?.activities[initialsTarget.activityIdx];
          const targetParty = targetActivity?.[initialsTarget.party];
          const targetInitial = targetParty?.initial;
          return (
            <InitialsPad
              currentValue={targetInitial || null}
              onSave={(text) => {
                handlePartyInitialChange(
                  initialsTarget.planId,
                  initialsTarget.activityIdx,
                  initialsTarget.party,
                  text,
                );
                setInitialsTarget(null);
              }}
              onCancel={() => setInitialsTarget(null)}
            />
          );
        })()}
      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />
      {reviewPlan && (
        <QcpEditorModal
          plan={reviewPlan}
          jobCardId={jobCardId}
          cpoId={cpoId}
          readOnly={readOnly}
          onClose={() => setReviewPlan(null)}
          onSaved={fetchPlans}
        />
      )}
      {editModalPlan && (
        <QcpEditorModal
          plan={editModalPlan}
          jobCardId={jobCardId}
          cpoId={cpoId}
          readOnly={false}
          onClose={() => setEditModalPlan(null)}
          onSaved={fetchPlans}
        />
      )}
    </div>
  );
}
