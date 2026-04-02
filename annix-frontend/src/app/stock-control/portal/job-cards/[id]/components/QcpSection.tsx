"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  InterventionType,
  QcControlPlanRecord,
  QcpActivity,
  QcpPlanType,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { QcpForm } from "./QcpForm";

interface QcpSectionProps {
  jobCardId: number;
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
  onChangeInitial: (idx: number, party: PartyKey, value: string) => void;
}) {
  const so = props.activity[props.party];
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

  return (
    <td className="px-1 py-1 text-center">
      <div className="flex items-center justify-center gap-0.5">
        <select
          value={so.interventionType || ""}
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
        <input
          type="text"
          value={so.initial || ""}
          onChange={(e) => props.onChangeInitial(props.activityIndex, props.party, e.target.value)}
          maxLength={5}
          placeholder="init"
          className="w-10 rounded border border-gray-300 px-0.5 py-0.5 text-xs text-center text-gray-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
        />
      </div>
    </td>
  );
}

export function QcpSection({ jobCardId }: QcpSectionProps) {
  const [plans, setPlans] = useState<QcControlPlanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingPlan, setEditingPlan] = useState<QcControlPlanRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await stockControlApiClient.controlPlansForJobCard(jobCardId);
      setPlans(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load control plans");
    } finally {
      setIsLoading(false);
    }
  }, [jobCardId]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const debouncedSave = useCallback(
    (planId: number, activities: QcpActivity[]) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(async () => {
        try {
          await stockControlApiClient.updateControlPlan(jobCardId, planId, { activities });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save changes");
        }
      }, 600);
    },
    [jobCardId],
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
      await stockControlApiClient.deleteControlPlan(jobCardId, id);
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
      await stockControlApiClient.autoGenerateControlPlans(jobCardId);
      fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to auto-generate QCPs");
    } finally {
      setIsAutoGenerating(false);
    }
  };

  if (viewMode === "create" || viewMode === "edit") {
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
        </div>
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
                        {plan.qcpNumber || `QCP #${plan.id}`}
                      </span>
                      {plan.revision && (
                        <span className="ml-1.5 inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                          V{plan.revision}
                        </span>
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
                        stockControlApiClient.openControlPlanPdf(jobCardId, plan.id);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      PDF
                    </button>
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
                    <span className="text-xs text-gray-400">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
                    <div className="mb-3 grid grid-cols-4 gap-3 text-xs text-gray-600">
                      <div>
                        <span className="font-medium">Customer:</span> {plan.customerName || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Order:</span> {plan.orderNumber || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Revision:</span> {plan.revision || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Interventions:</span>{" "}
                        {interventionSummary(plan) || "-"}
                      </div>
                    </div>

                    <table className="w-full divide-y divide-gray-200 text-xs">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-2 py-1.5 text-left font-medium text-gray-500">Op</th>
                          <th className="px-2 py-1.5 text-left font-medium text-gray-500">
                            Activity
                          </th>
                          <th className="px-2 py-1.5 text-left font-medium text-gray-500">
                            Spec/Proc
                          </th>
                          <th className="px-2 py-1.5 text-left font-medium text-gray-500">Doc</th>
                          <th className="px-2 py-1.5 text-center font-medium text-gray-500">PLS</th>
                          <th className="px-2 py-1.5 text-center font-medium text-gray-500">
                            {custLabel}
                          </th>
                          <th className="px-2 py-1.5 text-center font-medium text-gray-500">
                            Client
                          </th>
                          <th className="px-2 py-1.5 text-center font-medium text-gray-500">
                            3rd Party
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {plan.activities.map((a, i) => (
                          <tr key={i}>
                            <td className="px-2 py-1.5 text-center">{a.operationNumber}</td>
                            <td className="px-2 py-1.5">{a.description}</td>
                            <td className="px-2 py-1.5 text-gray-500">{a.specification || "-"}</td>
                            <td className="px-2 py-1.5 text-gray-500">
                              {(a as any).documentation || a.procedureRequired || "-"}
                            </td>
                            <PartyCell
                              activity={a}
                              activityIndex={i}
                              party="pls"
                              editable={true}
                              onChangeIntervention={(idx, party, val) =>
                                handlePartyInterventionChange(plan.id, idx, party, val)
                              }
                              onChangeInitial={(idx, party, val) =>
                                handlePartyInitialChange(plan.id, idx, party, val)
                              }
                            />
                            <PartyCell
                              activity={a}
                              activityIndex={i}
                              party="mps"
                              editable={true}
                              onChangeIntervention={(idx, party, val) =>
                                handlePartyInterventionChange(plan.id, idx, party, val)
                              }
                              onChangeInitial={(idx, party, val) =>
                                handlePartyInitialChange(plan.id, idx, party, val)
                              }
                            />
                            <PartyCell
                              activity={a}
                              activityIndex={i}
                              party="client"
                              editable={true}
                              onChangeIntervention={(idx, party, val) =>
                                handlePartyInterventionChange(plan.id, idx, party, val)
                              }
                              onChangeInitial={(idx, party, val) =>
                                handlePartyInitialChange(plan.id, idx, party, val)
                              }
                            />
                            <PartyCell
                              activity={a}
                              activityIndex={i}
                              party="thirdParty"
                              editable={true}
                              onChangeIntervention={(idx, party, val) =>
                                handlePartyInterventionChange(plan.id, idx, party, val)
                              }
                              onChangeInitial={(idx, party, val) =>
                                handlePartyInitialChange(plan.id, idx, party, val)
                              }
                            />
                          </tr>
                        ))}
                      </tbody>
                    </table>

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
    </div>
  );
}
