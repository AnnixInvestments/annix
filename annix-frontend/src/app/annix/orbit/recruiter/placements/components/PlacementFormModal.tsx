"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/app/components/Toast";
import { DateInput } from "@/app/components/ui/DateInput";
import type { OrbitClient, OrbitPlacement, OrbitPlacementInput } from "@/app/lib/api/annixOrbitApi";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { useOrbitCreatePlacement, useOrbitUpdatePlacement } from "@/app/lib/query/hooks";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "offer_accepted", label: "Offer accepted" },
  { value: "started", label: "Started" },
  { value: "guarantee", label: "In guarantee" },
  { value: "completed", label: "Completed" },
  { value: "fall_off", label: "Fall-off" },
];

const INVOICE_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "not_invoiced", label: "Not invoiced" },
  { value: "invoiced", label: "Invoiced" },
  { value: "paid", label: "Paid" },
];

interface PlacementFormModalProps {
  placement: OrbitPlacement | null;
  clients: OrbitClient[];
  onClose: () => void;
}

export function PlacementFormModal(props: PlacementFormModalProps) {
  const placement = props.placement;
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const createMutation = useOrbitCreatePlacement();
  const updateMutation = useOrbitUpdatePlacement();
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isSaving = isCreating || isUpdating;

  const [candidateName, setCandidateName] = useState(placement ? placement.candidateName : "");
  const [jobTitle, setJobTitle] = useState(placement ? placement.jobTitle : "");
  const [clientId, setClientId] = useState(
    placement && placement.clientId !== null ? String(placement.clientId) : "",
  );
  const [salary, setSalary] = useState(
    placement && placement.salary !== null ? String(placement.salary) : "",
  );
  const [placementFee, setPlacementFee] = useState(
    placement && placement.placementFee !== null ? String(placement.placementFee) : "",
  );
  const [startDate, setStartDate] = useState(placement?.startDate ? placement.startDate : "");
  const [guaranteeUntil, setGuaranteeUntil] = useState(
    placement?.guaranteeUntil ? placement.guaranteeUntil : "",
  );
  const [status, setStatus] = useState(placement ? placement.status : "offer_accepted");
  const [invoiceStatus, setInvoiceStatus] = useState(
    placement ? placement.invoiceStatus : "not_invoiced",
  );
  const [notes, setNotes] = useState(placement?.notes ? placement.notes : "");

  const parseOptionalNumber = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const value = Number(trimmed);
    return Number.isNaN(value) ? null : value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCandidate = candidateName.trim();
    const trimmedTitle = jobTitle.trim();
    if (!trimmedCandidate || !trimmedTitle) {
      showToast("Candidate name and job title are required.", "error");
      return;
    }

    const payload: OrbitPlacementInput = {
      clientId: clientId ? Number(clientId) : null,
      candidateName: trimmedCandidate,
      jobTitle: trimmedTitle,
      salary: parseOptionalNumber(salary),
      placementFee: parseOptionalNumber(placementFee),
      startDate: startDate || null,
      guaranteeUntil: guaranteeUntil || null,
      status,
      invoiceStatus,
      notes: notes.trim() || null,
    };

    try {
      if (placement) {
        await updateMutation.mutateAsync({ id: placement.id, data: payload });
        showToast("Placement updated.", "success");
      } else {
        await createMutation.mutateAsync(payload);
        showToast("Placement recorded.", "success");
      }
      props.onClose();
    } catch {
      alert({ message: "Could not save the placement. Please try again.", variant: "error" });
    }
  };

  const inputClasses =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {AlertDialog}
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={props.onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-[#0A1B3D]">
              {placement ? "Edit placement" : "Record placement"}
            </h2>
          </div>

          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="pl-candidate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Candidate name
              </label>
              <input
                id="pl-candidate"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                required
                className={inputClasses}
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label htmlFor="pl-title" className="block text-sm font-medium text-gray-700 mb-1">
                Job title
              </label>
              <input
                id="pl-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                required
                className={inputClasses}
                placeholder="Sales Manager"
              />
            </div>

            <div>
              <label htmlFor="pl-client" className="block text-sm font-medium text-gray-700 mb-1">
                Client
              </label>
              <select
                id="pl-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={`${inputClasses} bg-white`}
              >
                <option value="">No client linked</option>
                {props.clients.map((client) => (
                  <option key={client.id} value={String(client.id)}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pl-status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="pl-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`${inputClasses} bg-white`}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pl-salary" className="block text-sm font-medium text-gray-700 mb-1">
                Salary (R/year)
              </label>
              <input
                id="pl-salary"
                inputMode="decimal"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className={inputClasses}
                placeholder="480000"
              />
            </div>

            <div>
              <label htmlFor="pl-fee" className="block text-sm font-medium text-gray-700 mb-1">
                Placement fee (R)
              </label>
              <input
                id="pl-fee"
                inputMode="decimal"
                value={placementFee}
                onChange={(e) => setPlacementFee(e.target.value)}
                className={inputClasses}
                placeholder="72000"
              />
            </div>

            <div>
              <label htmlFor="pl-start" className="block text-sm font-medium text-gray-700 mb-1">
                Start date
              </label>
              <DateInput
                id="pl-start"
                value={startDate}
                onChange={(value) => setStartDate(value)}
                className={inputClasses}
              />
            </div>

            <div>
              <label
                htmlFor="pl-guarantee"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Guarantee until
              </label>
              <DateInput
                id="pl-guarantee"
                value={guaranteeUntil}
                onChange={(value) => setGuaranteeUntil(value)}
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="pl-invoice" className="block text-sm font-medium text-gray-700 mb-1">
                Invoice status
              </label>
              <select
                id="pl-invoice"
                value={invoiceStatus}
                onChange={(e) => setInvoiceStatus(e.target.value)}
                className={`${inputClasses} bg-white`}
              >
                {INVOICE_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="pl-notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="pl-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={inputClasses}
                placeholder="Replacement guarantee 3 months; invoice on start date."
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={props.onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-[#323288] text-white rounded-lg font-medium hover:bg-[#252560] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : placement ? "Save changes" : "Record placement"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
