"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { OrbitPlacement } from "@/app/lib/api/annixOrbitApi";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitClients,
  useOrbitDeletePlacement,
  useOrbitPlacements,
} from "@/app/lib/query/hooks";
import { PlacementFormModal } from "./components/PlacementFormModal";

function statusMeta(status: string): { label: string; classes: string } {
  if (status === "started") return { label: "Started", classes: "bg-blue-100 text-blue-700" };
  if (status === "guarantee")
    return { label: "In guarantee", classes: "bg-amber-100 text-amber-700" };
  if (status === "completed") return { label: "Completed", classes: "bg-green-100 text-green-700" };
  if (status === "fall_off") return { label: "Fall-off", classes: "bg-red-100 text-red-700" };
  return { label: "Offer accepted", classes: "bg-[#e0e0f5] text-[#323288]" };
}

function invoiceLabel(invoiceStatus: string): string {
  if (invoiceStatus === "invoiced") return "Invoiced";
  if (invoiceStatus === "paid") return "Paid";
  return "Not invoiced";
}

function formatRand(value: number | null): string {
  if (value === null) return "—";
  return `R${value.toLocaleString("en-ZA")}`;
}

export default function RecruiterPlacementsPage() {
  const { data: placements = [], isLoading, isError } = useOrbitPlacements();
  const { data: clients = [] } = useOrbitClients();
  const deleteMutation = useOrbitDeletePlacement();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrbitPlacement | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (placement: OrbitPlacement) => {
    setEditing(placement);
    setModalOpen(true);
  };

  const handleDelete = async (placement: OrbitPlacement) => {
    const confirmed = await confirm({
      title: "Delete this placement?",
      message: `The placement of "${placement.candidateName}" will be removed. This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(placement.id);
      showToast("Placement deleted.", "success");
    } catch {
      alert({ message: "Could not delete the placement. Please try again.", variant: "error" });
    }
  };

  const clientName = (clientId: number | null): string => {
    if (clientId === null) return "—";
    const found = clients.find((c) => c.id === clientId);
    return found ? found.name : "—";
  };

  const pipelineTotal = placements.reduce((sum, p) => {
    const fee = p.placementFee;
    return fee === null ? sum : sum + fee;
  }, 0);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1B3D] dark:text-white">Placements</h1>
          <p className="mt-1 text-gray-600 dark:text-[#c0c0eb]">
            Track placements from offer through guarantee, invoicing and payment.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#323288] text-white font-medium rounded-lg hover:bg-[#252560] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Record placement
        </button>
      </div>

      {!isLoading && !isError && placements.length > 0 ? (
        <div className="mb-6 inline-flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-5 py-4">
          <span className="text-sm font-medium text-gray-500 dark:text-[#c0c0eb]">
            Fees in pipeline
          </span>
          <span className="text-2xl font-bold text-[#323288] dark:text-white">
            {formatRand(pipelineTotal)}
          </span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#323288]" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Something went wrong loading your placements — please try again.
        </div>
      ) : placements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#c0c0eb] bg-white/60 dark:bg-white/5 p-10 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">No placements yet</p>
          <p className="mt-2 text-gray-600 dark:text-[#c0c0eb]">
            Record your first placement to start tracking fees and guarantee periods.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-[#323288] text-white font-medium rounded-lg hover:bg-[#252560] transition-colors"
          >
            Record placement
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {placements.map((placement) => {
                  const meta = statusMeta(placement.status);
                  const guarantee = placement.guaranteeUntil;
                  return (
                    <tr
                      key={placement.id}
                      onClick={() => openEdit(placement)}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#252560] dark:text-white">
                          {placement.candidateName}
                        </div>
                        <div className="text-sm text-gray-500">{placement.jobTitle}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#c0c0eb]">
                        {clientName(placement.clientId)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {formatRand(placement.placementFee)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${meta.classes}`}
                        >
                          {meta.label}
                        </span>
                        {guarantee ? (
                          <div className="mt-1 text-xs text-gray-400">Guarantee to {guarantee}</div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#c0c0eb]">
                        {invoiceLabel(placement.invoiceStatus)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(placement);
                          }}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen ? (
        <PlacementFormModal
          placement={editing}
          clients={clients}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
      {ConfirmDialog}
      {AlertDialog}
    </div>
  );
}
