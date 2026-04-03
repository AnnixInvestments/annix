"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { Breadcrumb } from "../../../components/Breadcrumb";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { RequirePermission } from "../../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../../config/pagePermissions";

interface Director {
  id: number;
  name: string;
  title: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export default function DirectorsPage() {
  const { showToast } = useToast();
  const [directors, setDirectors] = useState<Director[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDirector, setEditingDirector] = useState<Director | null>(null);
  const [deleteDirectorId, setDeleteDirectorId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchDirectors = async () => {
    setIsLoading(true);
    try {
      const result = await auRubberApiClient.accountingDirectors();
      setDirectors(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load directors";
      showToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectors();
  }, []);

  const openCreateModal = () => {
    setEditingDirector(null);
    setFormName("");
    setFormTitle("");
    setFormEmail("");
    setShowModal(true);
  };

  const openEditModal = (director: Director) => {
    setEditingDirector(director);
    setFormName(director.name);
    setFormTitle(director.title);
    setFormEmail(director.email);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName || !formTitle || !formEmail) {
      showToast("All fields are required", "error");
      return;
    }
    setIsSaving(true);
    try {
      if (editingDirector) {
        await auRubberApiClient.updateAccountingDirector(editingDirector.id, {
          name: formName,
          title: formTitle,
          email: formEmail,
        });
        showToast("Director updated", "success");
      } else {
        await auRubberApiClient.createAccountingDirector({
          name: formName,
          title: formTitle,
          email: formEmail,
        });
        showToast("Director created", "success");
      }
      setShowModal(false);
      fetchDirectors();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (director: Director) => {
    try {
      await auRubberApiClient.updateAccountingDirector(director.id, {
        isActive: !director.isActive,
      });
      showToast(`Director ${director.isActive ? "deactivated" : "activated"}`, "success");
      fetchDirectors();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update";
      showToast(msg, "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteDirectorId) return;
    try {
      await auRubberApiClient.deleteAccountingDirector(deleteDirectorId);
      showToast("Director deleted", "success");
      setDeleteDirectorId(null);
      fetchDirectors();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      showToast(msg, "error");
    }
  };

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/accounting"]}>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Accounting", href: "/au-rubber/portal/accounting" },
            { label: "Directors" },
          ]}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Directors</h1>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Add Director
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {directors.map((director) => (
                  <tr key={director.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {director.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{director.title}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{director.email}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(director)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                          director.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {director.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditModal(director)}
                        className="text-yellow-600 hover:text-yellow-700 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteDirectorId(director.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {directors.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No directors configured. Add one to enable sign-off workflows.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {editingDirector ? "Edit Director" : "Add Director"}
                </h2>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="e.g. Managing Director"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="director@example.com"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={deleteDirectorId !== null}
          title="Delete Director"
          message="Are you sure you want to delete this director? This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteDirectorId(null)}
        />
      </div>
    </RequirePermission>
  );
}
