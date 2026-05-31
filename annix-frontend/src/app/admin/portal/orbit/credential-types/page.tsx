"use client";

import { useState } from "react";
import { FormModal } from "@/app/components/modals/FormModal";
import { useToast } from "@/app/components/Toast";
import type { OrbitCredentialType } from "@/app/lib/api/adminApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useAdminCreateOrbitCredentialType,
  useAdminDeleteOrbitCredentialType,
  useAdminOrbitCredentialTypes,
  useAdminUpdateOrbitCredentialType,
} from "@/app/lib/query/hooks";

export default function OrbitCredentialTypesPage() {
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const typesQuery = useAdminOrbitCredentialTypes();
  const create = useAdminCreateOrbitCredentialType();
  const update = useAdminUpdateOrbitCredentialType();
  const remove = useAdminDeleteOrbitCredentialType();

  const typesData = typesQuery.data;
  const types = typesData || [];
  const isLoading = typesQuery.isLoading;
  const isCreating = create.isPending;
  const isUpdating = update.isPending;
  const saving = isCreating || isUpdating;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [active, setActive] = useState(true);

  const openCreate = () => {
    setEditingId(null);
    setCode("");
    setLabel("");
    setDescription("");
    setSortOrder(String(types.length + 1));
    setActive(true);
    setIsFormOpen(true);
  };

  const openEdit = (type: OrbitCredentialType) => {
    const nextDescription = type.description || "";
    setEditingId(type.id);
    setCode(type.code);
    setLabel(type.label);
    setDescription(nextDescription);
    setSortOrder(String(type.sortOrder));
    setActive(type.active);
    setIsFormOpen(true);
  };

  const submit = async () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      showToast("Label is required.", "error");
      return;
    }
    const parsed = Number.parseInt(sortOrder, 10);
    const parsedSortOrder = parsed || 0;
    const trimmedDescription = description.trim();
    const descriptionValue = trimmedDescription === "" ? null : trimmedDescription;
    try {
      if (editingId) {
        await update.mutateAsync({
          id: editingId,
          input: {
            label: trimmedLabel,
            description: descriptionValue,
            sortOrder: parsedSortOrder,
            active,
          },
        });
      } else {
        const trimmedCode = code.trim().toLowerCase();
        if (!trimmedCode) {
          showToast("Code is required.", "error");
          return;
        }
        await create.mutateAsync({
          code: trimmedCode,
          label: trimmedLabel,
          description: descriptionValue,
          sortOrder: parsedSortOrder,
          active,
        });
      }
      showToast(editingId ? "Credential type updated." : "Credential type added.", "success");
      setIsFormOpen(false);
    } catch {
      showToast("Could not save the credential type — please try again.", "error");
    }
  };

  const handleDelete = async (type: OrbitCredentialType) => {
    const confirmed = await confirm({
      title: "Delete this credential type?",
      message: `"${type.label}" will no longer be selectable. Existing seeker records keep their value.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(type.id);
      showToast("Credential type deleted.", "success");
    } catch {
      showToast("Could not delete the credential type.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credential types</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage the deployment credentials seekers can track. Changes appear in the seeker
            credentials picker immediately.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"
        >
          + Add credential type
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <p className="p-5 text-sm text-gray-500">Loading…</p>
        ) : types.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">
            No credential types yet. Add one to get started.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Label</th>
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {types.map((type) => (
                <tr key={type.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500">{type.sortOrder}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{type.label}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">{type.code}</td>
                  <td className="px-4 py-2 text-gray-600 max-w-md">{type.description}</td>
                  <td className="px-4 py-2">
                    {type.active ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 border border-gray-200">
                        Hidden
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEdit(type)}
                      className="text-xs font-medium text-violet-600 hover:text-violet-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(type)}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={submit}
        title={editingId ? "Edit credential type" : "Add credential type"}
        submitLabel={editingId ? "Save changes" : "Add credential type"}
        loading={saving}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="ct-code" className="block text-sm font-medium text-gray-700 mb-1">
              Code
            </label>
            <input
              id="ct-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={Boolean(editingId)}
              placeholder="e.g. banksman"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-400">
              Lowercase letters, numbers and underscores. Cannot be changed once created.
            </p>
          </div>
          <div>
            <label htmlFor="ct-label" className="block text-sm font-medium text-gray-700 mb-1">
              Label
            </label>
            <input
              id="ct-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Banksman Ticket"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label
              htmlFor="ct-description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <input
              id="ct-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short explanation shown under the picker"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label htmlFor="ct-order" className="block text-sm font-medium text-gray-700 mb-1">
                Sort order
              </label>
              <input
                id="ct-order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <label className="flex items-center gap-2 mt-6 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded border-gray-300"
              />
              Active (visible to seekers)
            </label>
          </div>
        </div>
      </FormModal>

      {ConfirmDialog}
    </div>
  );
}
