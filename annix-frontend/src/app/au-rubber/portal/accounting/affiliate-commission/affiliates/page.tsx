"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useConfirm } from "@/app/au-rubber/hooks/useConfirm";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { Breadcrumb } from "../../../../components/Breadcrumb";
import { RequirePermission } from "../../../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../../../config/pagePermissions";

interface Affiliate {
  id: number;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  status: string;
  notes: string;
}

interface AffiliateForm {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
}

const emptyForm: AffiliateForm = { name: "", contactName: "", email: "", phone: "", notes: "" };

export default function AffiliatesPage() {
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const { confirm, ConfirmDialog } = useConfirm();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AffiliateForm>(emptyForm);

  const fetchAffiliates = async () => {
    setIsLoading(true);
    try {
      const data = await auRubberApiClient.affiliateCommissionAffiliates();
      setAffiliates(data as Affiliate[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load affiliates";
      alert({ message: msg, variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAffiliates();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (a: Affiliate) => {
    setEditingId(a.id);
    const affPhone = a.phone;
    const affNotes = a.notes;
    setForm({
      name: a.name,
      contactName: a.contactName,
      email: a.email,
      phone: affPhone || "",
      notes: affNotes || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const rawPhone = form.phone;
    const rawNotes = form.notes;
    const dto = {
      name: form.name,
      contactName: form.contactName,
      email: form.email,
      phone: rawPhone || undefined,
      notes: rawNotes || undefined,
    };

    try {
      if (editingId) {
        await auRubberApiClient.affiliateCommissionUpdateAffiliate(editingId, dto);
      } else {
        await auRubberApiClient.affiliateCommissionCreateAffiliate(dto);
      }
      showToast(editingId ? "Affiliate updated" : "Affiliate created", "success");
      setShowModal(false);
      fetchAffiliates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      alert({ message: msg, variant: "error" });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const ok = await confirm({
      title: "Delete affiliate?",
      message: `Remove ${name}? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await auRubberApiClient.affiliateCommissionDeleteAffiliate(id);
      showToast("Affiliate deleted", "success");
      fetchAffiliates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      alert({ message: msg, variant: "error" });
    }
  };

  const activeAffiliates = affiliates.filter((a) => a.status === "ACTIVE");
  const inactiveAffiliates = affiliates.filter((a) => a.status !== "ACTIVE");
  const fName = form.name;
  const fContactName = form.contactName;
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
            { label: "Affiliates" },
          ]}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Affiliates</h1>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Affiliate
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
          </div>
        ) : affiliates.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No affiliates yet. Add one to start managing price lists.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Price List</th>
                  <th className="px-4 py-3 w-20 text-right" />
                </tr>
              </thead>
              <tbody>
                {[...activeAffiliates, ...inactiveAffiliates].map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {a.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.contactName}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          a.status === "ACTIVE"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/au-rubber/portal/accounting/affiliate-commission/price-lists?affiliateId=${a.id}`}
                        className="text-yellow-600 hover:text-yellow-700 text-xs font-medium"
                      >
                        View price lists
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          className="p-1.5 rounded text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(a.id, a.name)}
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
                  {editingId ? "Edit Affiliate" : "Add Affiliate"}
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
                    Company Name
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
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
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
                  disabled={!fName || !fContactName || !fEmail}
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
