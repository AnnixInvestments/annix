"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CoatingAnalysis,
  InterventionType,
  QcControlPlanRecord,
  QcpActivity,
  QcpApprovalSignature,
  QcpPartySignOff,
  QcpPlanType,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { nowISO } from "@/app/lib/datetime";
import { SignaturePad } from "@/app/stock-control/components/SignaturePad";

interface QcpFormProps {
  jobCardId: number;
  existingPlan: QcControlPlanRecord | null;
  onSaved: () => void;
  onCancel: () => void;
}

const PLAN_TYPE_LABELS: Record<QcpPlanType, string> = {
  paint_external: "Paint External",
  paint_internal: "Paint Internal",
  rubber: "Rubber Lining",
  hdpe: "HDPE Lining",
};

const INTERVENTION_LABELS: Record<InterventionType, string> = {
  H: "Hold",
  I: "Inspection",
  W: "Witness",
  R: "Review",
  S: "Surveillance",
  V: "Verify",
};

const INTERVENTION_TYPES: InterventionType[] = ["H", "I", "W", "R", "S", "V"];

const PARTIES = ["PLS", "MPS", "Client"] as const;

function emptyPartySignOff(): QcpPartySignOff {
  return { interventionType: null, name: null, signatureUrl: null, date: null };
}

function emptyActivity(opNum: number): QcpActivity {
  return {
    operationNumber: opNum,
    description: "",
    specification: null,
    procedureRequired: null,
    pls: emptyPartySignOff(),
    mps: emptyPartySignOff(),
    client: emptyPartySignOff(),
    remarks: null,
  };
}

function paintExternalTemplate(): QcpActivity[] {
  const steps = [
    "Receive & inspect items",
    "Surface preparation - Abrasive blasting to SA 2.5",
    "Dust and debris assessment",
    "Apply primer coat",
    "Primer DFT measurement",
    "Apply intermediate coat",
    "Intermediate DFT measurement",
    "Apply final/topcoat",
    "Final DFT measurement",
    "Visual inspection",
    "Final release",
  ];
  return steps.map((desc, i) => ({
    ...emptyActivity(i + 1),
    description: desc,
  }));
}

function paintInternalTemplate(): QcpActivity[] {
  const steps = [
    "Receive & inspect items",
    "Surface preparation - Abrasive blasting to SA 2.5",
    "Dust and debris assessment",
    "Apply internal primer coat",
    "Primer DFT measurement",
    "Apply internal lining coat",
    "Final DFT measurement",
    "Visual inspection",
    "Final release",
  ];
  return steps.map((desc, i) => ({
    ...emptyActivity(i + 1),
    description: desc,
  }));
}

function rubberTemplate(): QcpActivity[] {
  const steps = [
    "Receive & inspect items",
    "Surface preparation - Abrasive blasting to SA 2.5",
    "Contamination check",
    "Apply bonding solution/adhesive",
    "Apply rubber lining as per drawing",
    "Visual inspection - pre-cure",
    "Autoclave curing",
    "Shore hardness test",
    "Spark test",
    "Visual inspection - post-cure",
    "Final release",
  ];
  return steps.map((desc, i) => ({
    ...emptyActivity(i + 1),
    description: desc,
  }));
}

function hdpeTemplate(): QcpActivity[] {
  const steps = [
    "Receive & inspect items",
    "Surface preparation",
    "HDPE sheet preparation and cutting",
    "Welding / fabrication",
    "Weld test (destructive/non-destructive)",
    "Visual inspection",
    "Spark test",
    "Final release",
  ];
  return steps.map((desc, i) => ({
    ...emptyActivity(i + 1),
    description: desc,
  }));
}

function templateForType(type: QcpPlanType): QcpActivity[] {
  if (type === "paint_external") return paintExternalTemplate();
  if (type === "paint_internal") return paintInternalTemplate();
  if (type === "rubber") return rubberTemplate();
  return hdpeTemplate();
}

export function QcpForm({ jobCardId, existingPlan, onSaved, onCancel }: QcpFormProps) {
  const isEditing = existingPlan !== null;

  const [planType, setPlanType] = useState<QcpPlanType>(existingPlan?.planType ?? "paint_external");
  const [qcpNumber, setQcpNumber] = useState(existingPlan?.qcpNumber ?? "");
  const [documentRef, setDocumentRef] = useState(existingPlan?.documentRef ?? "");
  const [revision, setRevision] = useState(existingPlan?.revision ?? "01");
  const [customerName, setCustomerName] = useState(existingPlan?.customerName ?? "");
  const [orderNumber, setOrderNumber] = useState(existingPlan?.orderNumber ?? "");
  const [jobName, setJobName] = useState(existingPlan?.jobName ?? "");
  const [specification, setSpecification] = useState(existingPlan?.specification ?? "");
  const [itemDescription, setItemDescription] = useState(existingPlan?.itemDescription ?? "");
  const [activities, setActivities] = useState<QcpActivity[]>(
    existingPlan?.activities?.length ? existingPlan.activities : templateForType("paint_external"),
  );
  const [approvalSignatures, setApprovalSignatures] = useState<QcpApprovalSignature[]>(
    existingPlan?.approvalSignatures?.length
      ? existingPlan.approvalSignatures
      : PARTIES.map((p) => ({ party: p, name: null, signatureUrl: null, date: null })),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingPartyIndex, setSigningPartyIndex] = useState<number | null>(null);
  const [signingActivityKey, setSigningActivityKey] = useState<{
    activityIndex: number;
    party: "pls" | "mps" | "client";
  } | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");

  useEffect(() => {
    stockControlApiClient
      .currentUser()
      .then((user) => {
        if (user?.name) {
          setCurrentUserName(user.name);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isEditing) return;
    const loadJobCardData = async () => {
      try {
        const [jobCard, coatingAnalysis] = await Promise.all([
          stockControlApiClient.jobCardById(jobCardId),
          stockControlApiClient.jobCardCoatingAnalysis(jobCardId),
        ]);
        setCustomerName(jobCard.customerName ?? "");
        setOrderNumber(jobCard.poNumber ?? "");
        setJobName(jobCard.jobName ?? "");

        if (coatingAnalysis && coatingAnalysis.status === "accepted") {
          populateFromCoating(planType, coatingAnalysis);
        }
      } catch {
        // Non-critical — user can fill in manually
      }
    };
    loadJobCardData();
  }, [jobCardId, isEditing, planType]);

  const populateFromCoating = useCallback((type: QcpPlanType, coating: CoatingAnalysis) => {
    if (type === "paint_external" || type === "paint_internal") {
      const area = type === "paint_external" ? "external" : "internal";
      const relevantCoats = coating.coats.filter((c) => c.area === area);
      if (relevantCoats.length > 0) {
        const specParts = relevantCoats.map(
          (c) => `${c.product} (${c.minDftUm}-${c.maxDftUm} μm DFT)`,
        );
        setSpecification(specParts.join("; "));
        setItemDescription(
          `${area === "external" ? "External" : "Internal"} coating — ${relevantCoats.length} coat${relevantCoats.length !== 1 ? "s" : ""}`,
        );
      }
      if (coating.surfacePrep) {
        const prepLabels: Record<string, string> = {
          blast: "Abrasive blasting",
          sa3_blast: "SA 3 Abrasive blasting",
          hand_tool: "Hand tool preparation",
          power_tool: "Power tool preparation",
        };
        const prepLabel = prepLabels[coating.surfacePrep] ?? coating.surfacePrep;
        setActivities((prev) =>
          prev.map((a) =>
            a.description.toLowerCase().includes("surface preparation")
              ? { ...a, specification: prepLabel }
              : a,
          ),
        );
      }
    }
  }, []);

  const handlePlanTypeChange = useCallback(
    (newType: QcpPlanType) => {
      setPlanType(newType);
      if (!isEditing) {
        setActivities(templateForType(newType));
      }
    },
    [isEditing],
  );

  const updateActivity = useCallback(
    (index: number, field: keyof QcpActivity, value: string | null) => {
      setActivities((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
    },
    [],
  );

  const updateActivityIntervention = useCallback(
    (index: number, party: "pls" | "mps" | "client", type: InterventionType | null) => {
      setActivities((prev) =>
        prev.map((a, i) =>
          i === index ? { ...a, [party]: { ...a[party], interventionType: type } } : a,
        ),
      );
    },
    [],
  );

  const handleActivitySignOff = useCallback(
    (index: number, party: "pls" | "mps" | "client") => {
      setActivities((prev) =>
        prev.map((a, i) =>
          i === index
            ? {
                ...a,
                [party]: {
                  ...a[party],
                  name: currentUserName || null,
                  date: nowISO().slice(0, 10),
                },
              }
            : a,
        ),
      );
      setSigningActivityKey({ activityIndex: index, party });
    },
    [currentUserName],
  );

  const handleActivitySignatureSave = useCallback(
    (dataUrl: string) => {
      if (signingActivityKey === null) return;
      const { activityIndex, party } = signingActivityKey;
      setActivities((prev) =>
        prev.map((a, i) =>
          i === activityIndex ? { ...a, [party]: { ...a[party], signatureUrl: dataUrl } } : a,
        ),
      );
      setSigningActivityKey(null);
    },
    [signingActivityKey],
  );

  const addActivity = useCallback(() => {
    setActivities((prev) => [...prev, emptyActivity(prev.length + 1)]);
  }, []);

  const removeActivity = useCallback((index: number) => {
    setActivities((prev) =>
      prev.filter((_, i) => i !== index).map((a, i) => ({ ...a, operationNumber: i + 1 })),
    );
  }, []);

  const handleApprovalSignOff = useCallback(
    (index: number) => {
      setApprovalSignatures((prev) =>
        prev.map((s, i) =>
          i === index ? { ...s, name: currentUserName || null, date: nowISO().slice(0, 10) } : s,
        ),
      );
      setSigningPartyIndex(index);
    },
    [currentUserName],
  );

  const handleApprovalSignatureSave = useCallback(
    (dataUrl: string) => {
      if (signingPartyIndex === null) return;
      setApprovalSignatures((prev) =>
        prev.map((s, i) => (i === signingPartyIndex ? { ...s, signatureUrl: dataUrl } : s)),
      );
      setSigningPartyIndex(null);
    },
    [signingPartyIndex],
  );

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const payload: Partial<QcControlPlanRecord> = {
        planType,
        qcpNumber: qcpNumber || null,
        documentRef: documentRef || null,
        revision: revision || null,
        customerName: customerName || null,
        orderNumber: orderNumber || null,
        jobName: jobName || null,
        specification: specification || null,
        itemDescription: itemDescription || null,
        activities: activities.filter((a) => a.description.trim() !== ""),
        approvalSignatures,
      };

      if (isEditing) {
        await stockControlApiClient.updateControlPlan(jobCardId, existingPlan.id, payload);
      } else {
        await stockControlApiClient.createControlPlan(jobCardId, payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save control plan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          {isEditing ? "Edit" : "New"} Quality Control Plan
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700">Plan Type</label>
          <select
            value={planType}
            onChange={(e) => handlePlanTypeChange(e.target.value as QcpPlanType)}
            disabled={isEditing}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
          >
            {Object.entries(PLAN_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">QCP Number</label>
          <input
            type="text"
            value={qcpNumber}
            onChange={(e) => setQcpNumber(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="e.g. QCP-001"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Document Ref</label>
          <input
            type="text"
            value={documentRef}
            onChange={(e) => setDocumentRef(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="e.g. QD_PLS_04"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Revision</label>
          <input
            type="text"
            value={revision}
            onChange={(e) => setRevision(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="01"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700">Customer</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Order Number</label>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Job Name</label>
          <input
            type="text"
            value={jobName}
            onChange={(e) => setJobName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700">Specification</label>
          <input
            type="text"
            value={specification}
            onChange={(e) => setSpecification(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Coating/lining specification"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Item Description</label>
          <input
            type="text"
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="What is being inspected"
          />
        </div>
      </div>

      <div className="border-b border-gray-200 pb-1 pt-4">
        <h4 className="text-sm font-semibold text-gray-900">Activities & Intervention Matrix</h4>
        <p className="mt-0.5 text-xs text-gray-500">
          H = Hold, I = Inspection, W = Witness, R = Review, S = Surveillance, V = Verify
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
              <th className="w-36 px-2 py-2 text-left text-xs font-medium uppercase text-gray-500">
                Spec / Procedure
              </th>
              {PARTIES.map((party) => (
                <th
                  key={party}
                  className="w-28 px-2 py-2 text-center text-xs font-medium uppercase text-gray-500"
                >
                  {party}
                </th>
              ))}
              <th className="w-16 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {activities.map((activity, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-2 py-2 text-center font-medium text-gray-700">
                  {activity.operationNumber}
                </td>
                <td className="px-2 py-2">
                  <input
                    type="text"
                    value={activity.description}
                    onChange={(e) => updateActivity(idx, "description", e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="Activity description"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="text"
                    value={activity.specification ?? ""}
                    onChange={(e) => updateActivity(idx, "specification", e.target.value || null)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="Spec ref"
                  />
                </td>
                {(["pls", "mps", "client"] as const).map((party) => {
                  const signOff = activity[party];
                  return (
                    <td key={party} className="px-2 py-2">
                      <div className="flex flex-col items-center gap-1">
                        <select
                          value={signOff.interventionType ?? ""}
                          onChange={(e) =>
                            updateActivityIntervention(
                              idx,
                              party,
                              (e.target.value as InterventionType) || null,
                            )
                          }
                          className="w-full rounded border border-gray-300 px-1 py-1 text-center text-xs"
                        >
                          <option value="">-</option>
                          {INTERVENTION_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t} - {INTERVENTION_LABELS[t]}
                            </option>
                          ))}
                        </select>
                        {signOff.interventionType && (
                          <div className="flex flex-col items-center gap-0.5">
                            {signOff.name ? (
                              <span className="text-xs text-green-700">{signOff.name}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleActivitySignOff(idx, party)}
                                className="text-xs text-teal-600 hover:text-teal-800"
                              >
                                Sign off
                              </button>
                            )}
                            {signOff.signatureUrl && (
                              <img
                                src={signOff.signatureUrl}
                                alt="Sig"
                                className="h-6 rounded border border-gray-200"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-center">
                  {activities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeActivity(idx)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addActivity}
        className="text-xs font-medium text-teal-600 hover:text-teal-800"
      >
        + Add Activity
      </button>

      {signingActivityKey !== null && (
        <div className="rounded border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-xs text-gray-600">
            Sign off: Activity {activities[signingActivityKey.activityIndex]?.operationNumber} —{" "}
            {signingActivityKey.party.toUpperCase()}
          </p>
          <SignaturePad
            onSave={handleActivitySignatureSave}
            onCancel={() => setSigningActivityKey(null)}
            width={360}
            height={120}
          />
        </div>
      )}

      <div className="border-b border-gray-200 pb-1 pt-4">
        <h4 className="text-sm font-semibold text-gray-900">Approval Signatures</h4>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {approvalSignatures.map((sig, idx) => (
          <div key={idx} className="rounded border border-gray-200 bg-gray-50 p-3">
            <p className="mb-2 text-xs font-semibold text-gray-700">{sig.party}</p>
            {sig.name ? (
              <div className="space-y-1">
                <p className="text-sm text-gray-900">{sig.name}</p>
                {sig.date && <p className="text-xs text-gray-500">{sig.date}</p>}
                {sig.signatureUrl && (
                  <img
                    src={sig.signatureUrl}
                    alt="Signature"
                    className="h-10 rounded border border-gray-200 bg-white p-0.5"
                  />
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleApprovalSignOff(idx)}
                className="text-xs text-teal-600 hover:text-teal-800"
              >
                Sign & approve
              </button>
            )}
          </div>
        ))}
      </div>

      {signingPartyIndex !== null && (
        <div className="rounded border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-xs text-gray-600">
            Approval signature: {approvalSignatures[signingPartyIndex]?.party}
          </p>
          <SignaturePad
            onSave={handleApprovalSignatureSave}
            onCancel={() => setSigningPartyIndex(null)}
            width={360}
            height={120}
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : isEditing ? "Update Plan" : "Create Plan"}
        </button>
      </div>
    </div>
  );
}
