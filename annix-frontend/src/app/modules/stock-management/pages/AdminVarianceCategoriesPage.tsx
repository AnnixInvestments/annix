"use client";

import { useState } from "react";
import { useAdminMutations, useVarianceCategories } from "../hooks/useAdminQueries";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";
import type { CreateVarianceCategoryInput, VarianceCategoryDto } from "../types/admin";

const SEVERITY_OPTIONS: ReadonlyArray<{ value: VarianceCategoryDto["severity"]; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export function AdminVarianceCategoriesPage() {
  const config = useStockManagementConfig();
  const { data, isLoading, refetch } = useVarianceCategories(true);
  const mutations = useAdminMutations();
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState<CreateVarianceCategoryInput>({
    slug: "",
    name: "",
    severity: "low",
    requiresPhoto: false,
  });

  const handleCreate = async () => {
    if (!draft.slug.trim() || !draft.name.trim()) return;
    try {
      await mutations.createVarianceCategory(draft);
      setShowCreate(false);
      setDraft({ slug: "", name: "", severity: "low", requiresPhoto: false });
      await refetch();
    } catch (err) {
      console.error("Create failed", err);
    }
  };

  const handleSeed = async () => {
    try {
      await mutations.seedVarianceCategories();
      await refetch();
    } catch (err) {
      console.error("Seed failed", err);
    }
  };

  const handleToggleActive = async (cat: VarianceCategoryDto) => {
    try {
      await mutations.updateVarianceCategory(cat.id, { active: !cat.active });
      await refetch();
    } catch (err) {
      console.error("Toggle failed", err);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-500">{config.label("common.loading")}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {config.label("admin.varianceCategories")}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage stock take variance categories with severity and notification rules
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSeed}
            disabled={mutations.isPending}
            className="px-4 py-2 bg-white border border-gray-300 rounded text-sm"
          >
            Seed Defaults
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium"
          >
            + New Category
          </button>
        </div>
      </header>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Slug
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Severity
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Photo
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Notify
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Active
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(data ?? []).map((cat) => {
              const severityClass =
                cat.severity === "critical"
                  ? "bg-red-100 text-red-800"
                  : cat.severity === "high"
                    ? "bg-orange-100 text-orange-800"
                    : cat.severity === "medium"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-gray-100 text-gray-700";
              return (
                <tr key={cat.id} className={cat.active ? "" : "opacity-50"}>
                  <td className="px-4 py-3 font-mono text-xs">{cat.slug}</td>
                  <td className="px-4 py-3 text-sm">{cat.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${severityClass}`}>
                      {cat.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{cat.requiresPhoto ? "Required" : "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {cat.notifyOnSubmit.length > 0 ? cat.notifyOnSubmit.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">{cat.active ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(cat)}
                      disabled={mutations.isPending}
                      className="text-sm text-teal-700 hover:underline"
                    >
                      {cat.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">New Variance Category</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Slug</label>
                <input
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Name</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Severity</label>
                <select
                  value={draft.severity}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      severity: e.target.value as VarianceCategoryDto["severity"],
                    })
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {SEVERITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.requiresPhoto}
                  onChange={(e) => setDraft({ ...draft, requiresPhoto: e.target.checked })}
                />
                Requires photo
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded"
              >
                {config.label("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={mutations.isPending}
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded font-medium"
              >
                {config.label("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminVarianceCategoriesPage;
