"use client";

import { useState } from "react";
import { FormModal } from "@/app/components/modals/FormModal";
import { useToast } from "@/app/components/Toast";
import type { OrbitDismissReason } from "@/app/lib/api/adminApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useAdminCreateOrbitDismissReason,
  useAdminDeleteOrbitDismissReason,
  useAdminOrbitDismissReasons,
  useAdminUpdateOrbitDismissReason,
} from "@/app/lib/query/hooks";

type MuteActionValue = "" | "company" | "category";

const MUTE_ACTION_LABELS: Record<string, string> = {
  company: "Mute company",
  category: "Mute category",
};

function muteActionLabel(value: string | null): string {
  if (!value) return "—";
  const label = MUTE_ACTION_LABELS[value];
  return label || value;
}

export default function OrbitDismissReasonsPage() {
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const reasonsQuery = useAdminOrbitDismissReasons();
  const create = useAdminCreateOrbitDismissReason();
  const update = useAdminUpdateOrbitDismissReason();
  const remove = useAdminDeleteOrbitDismissReason();

  const reasonsData = reasonsQuery.data;
  const reasons = reasonsData || [];
  const isLoading = reasonsQuery.isLoading;
  const creating = create.isPending;
  const saving = creating || update.isPending;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [muteAction, setMuteAction] = useState<MuteActionValue>("");
  const [sortOrder, setSortOrder] = useState("0");
  const [active, setActive] = useState(true);

  const openCreate = () => {
    setEditingId(null);
    setCode("");
    setLabel("");
    setMuteAction("");
    setSortOrder(String(reasons.length + 1));
    setActive(true);
    setIsFormOpen(true);
  };

  const openEdit = (reason: OrbitDismissReason) => {
    const nextMuteAction = reason.muteAction;
    setEditingId(reason.id);
    setCode(reason.code);
    setLabel(reason.label);
    setMuteAction(
      nextMuteAction === "company" || nextMuteAction === "category" ? nextMuteAction : "",
    );
    setSortOrder(String(reason.sortOrder));
    setActive(reason.active);
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
    const muteActionValue = muteAction === "" ? null : muteAction;
    try {
      if (editingId) {
        await update.mutateAsync({
          id: editingId,
          input: {
            label: trimmedLabel,
            muteAction: muteActionValue,
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
          muteAction: muteActionValue,
          sortOrder: parsedSortOrder,
          active,
        });
      }
      showToast(editingId ? "Reason updated." : "Reason added.", "success");
      setIsFormOpen(false);
    } catch {
      showToast("Could not save the reason — please try again.", "error");
    }
  };

  const handleDelete = async (reason: OrbitDismissReason) => {
    const confirmed = await confirm({
      title: "Delete this reason?",
      message: `"${reason.label}" will no longer appear in the seeker's "Not for me" menu.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(reason.id);
      showToast("Reason deleted.", "success");
    } catch {
      showToast("Could not delete the reason.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dismiss reasons</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage the reasons a seeker can pick when they tap "Not for me" on a job. Changes appear
            in the seeker dropdown immediately. A mute action also filters that company or category
            out of their feed; every reason teaches Nix to avoid similar jobs.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"
        >
          + Add reason
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <p className="p-5 text-sm text-gray-500">Loading…</p>
        ) : reasons.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">No reasons yet. Add one to get started.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Label</th>
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Mute action</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reasons.map((reason) => (
                <tr key={reason.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500">{reason.sortOrder}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{reason.label}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">{reason.code}</td>
                  <td className="px-4 py-2 text-gray-600">{muteActionLabel(reason.muteAction)}</td>
                  <td className="px-4 py-2">
                    {reason.active ? (
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
                      onClick={() => openEdit(reason)}
                      className="text-xs font-medium text-violet-600 hover:text-violet-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(reason)}
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
        title={editingId ? "Edit reason" : "Add reason"}
        submitLabel={editingId ? "Save changes" : "Add reason"}
        loading={saving}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="dr-code" className="block text-sm font-medium text-gray-700 mb-1">
              Code
            </label>
            <input
              id="dr-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={Boolean(editingId)}
              placeholder="e.g. wrong_location"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-400">
              Lowercase letters, numbers and underscores. Cannot be changed once created.
            </p>
          </div>
          <div>
            <label htmlFor="dr-label" className="block text-sm font-medium text-gray-700 mb-1">
              Label
            </label>
            <input
              id="dr-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Location of work place"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="dr-mute" className="block text-sm font-medium text-gray-700 mb-1">
              Mute action
            </label>
            <select
              id="dr-mute"
              value={muteAction}
              onChange={(e) => setMuteAction(e.target.value as MuteActionValue)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">None (semantic learning only)</option>
              <option value="company">Mute this company</option>
              <option value="category">Mute this category</option>
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Optional: also hide that company or category from the seeker's feed when they pick
              this reason.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label htmlFor="dr-order" className="block text-sm font-medium text-gray-700 mb-1">
                Sort order
              </label>
              <input
                id="dr-order"
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
