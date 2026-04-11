"use client";

import { useState } from "react";
import { useAdminMutations, useProductCategories } from "../hooks/useAdminQueries";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";
import type { CreateProductCategoryInput } from "../types/admin";
import type { IssuableProductType, ProductCategoryDto } from "../types/products";

const TYPE_OPTIONS: ReadonlyArray<{ value: IssuableProductType; label: string }> = [
  { value: "consumable", label: "Consumable" },
  { value: "paint", label: "Paint" },
  { value: "rubber_roll", label: "Rubber Roll" },
  { value: "rubber_offcut", label: "Rubber Offcut" },
  { value: "solution", label: "Solution" },
];

export function AdminProductCategoriesPage() {
  const config = useStockManagementConfig();
  const [filterType, setFilterType] = useState<IssuableProductType | undefined>(undefined);
  const { data, isLoading, refetch } = useProductCategories(filterType);
  const mutations = useAdminMutations();
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState<CreateProductCategoryInput>({
    productType: "consumable",
    slug: "",
    name: "",
  });

  const handleCreate = async () => {
    if (!draft.slug.trim() || !draft.name.trim()) return;
    try {
      await mutations.createProductCategory(draft);
      setShowCreate(false);
      setDraft({ productType: "consumable", slug: "", name: "" });
      await refetch();
    } catch (err) {
      console.error("Create failed", err);
    }
  };

  const handleSeed = async () => {
    try {
      await mutations.seedProductCategories();
      await refetch();
    } catch (err) {
      console.error("Seed failed", err);
    }
  };

  const handleDelete = async (cat: ProductCategoryDto) => {
    if (!confirm(`Deactivate category "${cat.name}"?`)) return;
    try {
      await mutations.deleteProductCategory(cat.id);
      await refetch();
    } catch (err) {
      console.error("Delete failed", err);
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
            {config.label("admin.productCategories")}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Admin-managed taxonomy for products grouped by type
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={filterType ?? ""}
            onChange={(e) =>
              setFilterType(e.target.value ? (e.target.value as IssuableProductType) : undefined)
            }
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="">All types</option>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Slug
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Order
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Active
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(data ?? []).map((cat) => (
              <tr key={cat.id} className={cat.active ? "" : "opacity-50"}>
                <td className="px-4 py-3 text-xs text-gray-600">{cat.productType}</td>
                <td className="px-4 py-3 font-mono text-xs">{cat.slug}</td>
                <td className="px-4 py-3 text-sm">{cat.name}</td>
                <td className="px-4 py-3 text-xs">{cat.sortOrder}</td>
                <td className="px-4 py-3 text-sm">{cat.active ? "Active" : "Inactive"}</td>
                <td className="px-4 py-3 text-right">
                  {cat.active && (
                    <button
                      type="button"
                      onClick={() => handleDelete(cat)}
                      disabled={mutations.isPending}
                      className="text-sm text-red-700 hover:underline"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">New Product Category</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Product Type</label>
                <select
                  value={draft.productType}
                  onChange={(e) =>
                    setDraft({ ...draft, productType: e.target.value as IssuableProductType })
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
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
                <label className="block text-xs font-medium text-gray-700">Description</label>
                <textarea
                  value={draft.description ?? ""}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={2}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
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

export default AdminProductCategoriesPage;
