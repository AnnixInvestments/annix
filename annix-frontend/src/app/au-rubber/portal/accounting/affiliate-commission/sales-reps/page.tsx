"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useConfirm } from "@/app/au-rubber/hooks/useConfirm";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { Breadcrumb } from "../../../../components/Breadcrumb";
import { RequirePermission } from "../../../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../../../config/pagePermissions";

interface SalesRep {
  id: number;
  name: string;
  email: string;
  phone: string;
  commissionPercent: number;
  status: string;
  notes: string;
}

interface RepForm {
  name: string;
  email: string;
  phone: string;
  commissionPercent: number;
  notes: string;
}

const emptyForm: RepForm = { name: "", email: "", phone: "", commissionPercent: 0, notes: "" };

export default function SalesRepsPage() {
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const { confirm, ConfirmDialog } = useConfirm();
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RepForm>(emptyForm);

  const fetchReps = async () => {
    setIsLoading(true);
    try {
      const data = await auRubberApiClient.affiliateCommissionSalesReps();
      setReps(data as SalesRep[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load sales reps";
      alert({ message: msg, variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReps();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (rep: SalesRep) => {
    setEditingId(rep.id);
    const repPhone = rep.phone;
    const repNotes = rep.notes;
    setForm({
      name: rep.name,
      email: rep.email,
      phone: repPhone || "",
      commissionPercent: rep.commissionPercent,
      notes: repNotes || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const rawPhone = form.phone;
    const rawNotes = form.notes;
    const dto = {
      name: form.name,
      email: form.email,
      phone: rawPhone || undefined,
      commissionPercent: form.commissionPercent,
      notes: rawNotes || undefined,
    };

    try {
      if (editingId) {
        await auRubberApiClient.affiliateCommissionUpdateSalesRep(editingId, dto);
      } else {
        await auRubberApiClient.affiliateCommissionCreateSalesRep(dto);
      }
      showToast(editingId ? "Sales rep updated" : "Sales rep created", "success");
      setShowModal(false);
      fetchReps();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      alert({ message: msg, variant: "error" });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const ok = await confirm({
      title: "Delete sales rep?",
      message: `Remove ${name}? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await auRubberApiClient.affiliateCommissionDeleteSalesRep(id);
      showToast("Sales rep deleted", "success");
      fetchReps();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      alert({ message: msg, variant: "error" });
    }
  };

  const activeReps = reps.filter((r) => r.status === "ACTIVE");
  const inactiveReps = reps.filter((r) => r.status !== "ACTIVE");
  const fName = form.name;
  const fEmail = form.email;

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/accounting"]}>
      {ConfirmDialog}
      {AlertDialog}
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Accounting", href: "/au-rubber/portal/accounting" },
            {
              label: "Affiliate & Commission",
              href: "/au-rubber/portal/accounting/affiliate-commission",
            },
            { label: "Sales Reps" },
          ]}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sales Reps</h1>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Sales Rep
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
          </div>
        ) : reps.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No sales reps yet. Add one to start tracking commissions.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Commission %</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 w-20 text-right" />
                </tr>
              </thead>
              <tbody>
                {[...activeReps, ...inactiveReps].map((rep) => (
                  <tr
                    key={rep.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {rep.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{rep.email}</td>
                    <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100">
                      {rep.commissionPercent}%
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          rep.status === "ACTIVE"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {rep.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(rep)}
                          className="p-1.5 rounded text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(rep.id, rep.name)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {editingId ? "Edit Sales Rep" : "Add Sales Rep"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Commission %
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={form.commissionPercent}
                    onChange={(e) =>
                      setForm({ ...form, commissionPercent: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!fName || !fEmail}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                >
                  {editingId ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </RequirePermission>
  );
}
