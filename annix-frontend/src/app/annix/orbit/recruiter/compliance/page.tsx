"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { OrbitComplianceItem } from "@/app/lib/api/annixOrbitApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitComplianceItems,
  useOrbitDeleteComplianceItem,
  useOrbitTalentCandidates,
} from "@/app/lib/query/hooks";
import { ComplianceItemFormModal } from "./components/ComplianceItemFormModal";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "missing", label: "Missing" },
  { value: "received", label: "Received" },
  { value: "verified", label: "Verified" },
  { value: "expiring", label: "Expiring" },
  { value: "expired", label: "Expired" },
];

function statusMeta(status: string): { label: string; classes: string } {
  if (status === "received") return { label: "Received", classes: "bg-blue-100 text-blue-700" };
  if (status === "verified") return { label: "Verified", classes: "bg-green-100 text-green-700" };
  if (status === "expiring") return { label: "Expiring", classes: "bg-amber-100 text-amber-700" };
  if (status === "expired") return { label: "Expired", classes: "bg-red-100 text-red-700" };
  return { label: "Missing", classes: "bg-gray-100 text-gray-600" };
}

export default function RecruiterCompliancePage() {
  const { data: items = [], isLoading, isError } = useOrbitComplianceItems();
  const { data: candidates = [] } = useOrbitTalentCandidates();
  const deleteMutation = useOrbitDeleteComplianceItem();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrbitComplianceItem | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (item: OrbitComplianceItem) => {
    setEditing(item);
    setModalOpen(true);
  };

  const handleDelete = async (item: OrbitComplianceItem) => {
    const confirmed = await confirm({
      title: "Delete this document record?",
      message: `"${item.documentType}" will be removed. This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(item.id);
      showToast("Document deleted.", "success");
    } catch {
      showToast("Could not delete the document. Please try again.", "error");
    }
  };

  const candidateName = (candidateId: number): string => {
    const found = candidates.find((c) => c.id === candidateId);
    return found ? found.fullName : "Candidate";
  };

  const visibleItems =
    statusFilter === "all" ? items : items.filter((i) => i.status === statusFilter);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1B3D] dark:text-white">Compliance</h1>
          <p className="mt-1 text-gray-600 dark:text-[#c0c0eb]">
            Track candidate documents and their status across your agency.
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
          Add document
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = statusFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                active
                  ? "bg-[#323288] text-white"
                  : "bg-white dark:bg-white/5 text-gray-600 dark:text-[#c0c0eb] border border-gray-200 dark:border-white/10"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#323288]" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Something went wrong loading compliance documents — please try again.
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#c0c0eb] bg-white/60 dark:bg-white/5 p-10 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">No documents</p>
          <p className="mt-2 text-gray-600 dark:text-[#c0c0eb]">
            Add a candidate's documents to start tracking compliance.
          </p>
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
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {visibleItems.map((item) => {
                  const meta = statusMeta(item.status);
                  const expiry = item.expiryDate ? item.expiryDate : "—";
                  return (
                    <tr
                      key={item.id}
                      onClick={() => openEdit(item)}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-[#252560] dark:text-white">
                        {candidateName(item.candidateId)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#c0c0eb]">
                        {item.documentType}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${meta.classes}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#c0c0eb]">
                        {expiry}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
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
        <ComplianceItemFormModal
          item={editing}
          candidates={candidates}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
      {ConfirmDialog}
    </div>
  );
}
