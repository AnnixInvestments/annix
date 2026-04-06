"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import type {
  InterventionType,
  QcControlPlanRecord,
  QcpActivity,
  QcpPartySignOff,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface QcpEditorModalProps {
  plan: QcControlPlanRecord;
  jobCardId: number;
  onClose: () => void;
  onSaved: () => void;
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

type PartyKey = "pls" | "mps" | "client" | "thirdParty";
const PARTY_KEYS: PartyKey[] = ["pls", "mps", "client", "thirdParty"];
const PARTY_LABELS: Record<PartyKey, string> = {
  pls: "PLS",
  mps: "MPS",
  client: "Client",
  thirdParty: "3rd Party",
};

function ensureSignOff(so: QcpPartySignOff | undefined | null): QcpPartySignOff {
  if (so && typeof so === "object") {
    return {
      interventionType: so.interventionType || null,
      initial: so.initial || null,
      name: so.name || null,
      signatureUrl: so.signatureUrl || null,
      date: so.date || null,
    };
  }
  return { interventionType: null, initial: null, name: null, signatureUrl: null, date: null };
}

export function QcpEditorModal(props: QcpEditorModalProps) {
  const { plan, jobCardId, onClose, onSaved } = props;

  const [activities, setActivities] = useState<QcpActivity[]>(
    plan.activities.map((a) => ({
      ...a,
      documentation: (a as any).documentation || a.procedureRequired || null,
      thirdParty: ensureSignOff((a as any).thirdParty),
      pls: ensureSignOff(a.pls),
      mps: ensureSignOff(a.mps),
      client: ensureSignOff(a.client),
    })),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pdfPreview = usePdfPreview();

  const updateField = useCallback(
    (
      idx: number,
      field: "description" | "specification" | "documentation" | "remarks",
      value: string | null,
    ) => {
      setActivities((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
    },
    [],
  );

  const updateIntervention = useCallback(
    (idx: number, party: PartyKey, type: InterventionType | null) => {
      setActivities((prev) =>
        prev.map((a, i) =>
          i === idx ? { ...a, [party]: { ...a[party], interventionType: type } } : a,
        ),
      );
    },
    [],
  );

  const updateInitial = useCallback((idx: number, party: PartyKey, initial: string | null) => {
    setActivities((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [party]: { ...a[party], initial } } : a)),
    );
  }, []);

  const saveAndDownload = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await stockControlApiClient.updateControlPlan(jobCardId, plan.id, {
        activities: activities.filter((a) => a.description.trim() !== ""),
      });
      onSaved();
      const qcpNum = plan.qcpNumber || `QCP-${plan.id}`;
      pdfPreview.openWithFetch(
        () => stockControlApiClient.openControlPlanPdf(jobCardId, plan.id),
        `${qcpNum}.pdf`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const saveOnly = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await stockControlApiClient.updateControlPlan(jobCardId, plan.id, {
        activities: activities.filter((a) => a.description.trim() !== ""),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-4 w-full max-w-[95vw] rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Edit QCP: {plan.qcpNumber || `#${plan.id}`}
            </h3>
            <p className="text-xs text-gray-500">
              Review and edit intervention types before generating PDF. Legend: H=Hold,
              I=Inspection, W=Witness, R=Review, S=Surveillance, V=Verify
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            X
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>
        )}

        <div className="overflow-x-auto px-3 py-3">
          <table className="w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-8 px-1 py-2 text-center font-medium text-gray-500">OP</th>
                <th className="px-1 py-2 text-left font-medium text-gray-500">
                  ACTIVITY DESCRIPTION
                </th>
                <th className="w-36 px-1 py-2 text-left font-medium text-gray-500">
                  SPECIFICATION / PROCEDURE
                </th>
                <th className="w-28 px-1 py-2 text-left font-medium text-gray-500">
                  DOCUMENTATION
                </th>
                {PARTY_KEYS.map((pk) => (
                  <th key={pk} className="w-24 px-1 py-2 text-center font-medium text-gray-500">
                    <div>{PARTY_LABELS[pk]}</div>
                    <div className="mt-0.5 flex justify-center gap-2 text-[9px] font-normal text-gray-400">
                      <span>Type</span>
                      <span>Initial</span>
                    </div>
                  </th>
                ))}
                <th className="w-20 px-1 py-2 text-left font-medium text-gray-500">REMARKS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activities.map((a, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-1 py-1 text-center font-medium text-gray-600">
                    {a.operationNumber}
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="text"
                      value={a.description}
                      onChange={(e) => updateField(idx, "description", e.target.value)}
                      className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="text"
                      value={a.specification || ""}
                      onChange={(e) => updateField(idx, "specification", e.target.value || null)}
                      className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="text"
                      value={a.documentation || ""}
                      onChange={(e) => updateField(idx, "documentation", e.target.value || null)}
                      className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                    />
                  </td>
                  {PARTY_KEYS.map((pk) => {
                    const so = a[pk] || { interventionType: null, initial: null };
                    return (
                      <td key={pk} className="px-1 py-1">
                        <div className="flex items-center gap-0.5">
                          <select
                            value={(so as QcpPartySignOff).interventionType || ""}
                            onChange={(e) =>
                              updateIntervention(
                                idx,
                                pk,
                                (e.target.value as InterventionType) || null,
                              )
                            }
                            className="w-12 rounded border border-gray-200 px-0 py-0.5 text-center text-xs"
                          >
                            <option value="">-</option>
                            {INTERVENTION_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={(so as QcpPartySignOff).initial || ""}
                            onChange={(e) => updateInitial(idx, pk, e.target.value || null)}
                            className="w-10 rounded border border-gray-200 px-0.5 py-0.5 text-center text-xs"
                            placeholder=""
                            title="Initial"
                          />
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-1 py-1">
                    <input
                      type="text"
                      value={a.remarks || ""}
                      onChange={(e) => updateField(idx, "remarks", e.target.value || null)}
                      className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveOnly}
            disabled={isSaving}
            className="rounded-md border border-teal-600 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={saveAndDownload}
            disabled={isSaving}
            className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save & Download PDF"}
          </button>
        </div>
      </div>
      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />
    </div>,
    document.body,
  );
}
