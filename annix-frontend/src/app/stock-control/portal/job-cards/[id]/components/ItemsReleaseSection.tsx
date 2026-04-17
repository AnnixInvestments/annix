"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type {
  ItemReleaseResult,
  QcItemsReleaseRecord,
  ReleaseLineItem,
  ReleasePartySignOff,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { now } from "@/app/lib/datetime";
import { SignaturePad } from "@/app/stock-control/components/SignaturePad";

interface ItemsReleaseSectionProps {
  jobCardId: number;
}

type ViewMode = "list" | "edit";

const emptySignOff = (): ReleasePartySignOff => ({
  name: null,
  date: null,
  signatureUrl: null,
});

export function ItemsReleaseSection({ jobCardId }: ItemsReleaseSectionProps) {
  const [releases, setReleases] = useState<QcItemsReleaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingRelease, setEditingRelease] = useState<QcItemsReleaseRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);

  const fetchReleases = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await stockControlApiClient.itemsReleasesForJobCard(jobCardId);
      setReleases(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load items releases");
    } finally {
      setIsLoading(false);
    }
  }, [jobCardId]);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  const handleAutoPopulate = async () => {
    try {
      setIsAutoPopulating(true);
      setError(null);
      const result = await stockControlApiClient.autoPopulateItemsRelease(jobCardId);
      setEditingRelease(result);
      setViewMode("edit");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to auto-populate from job card");
    } finally {
      setIsAutoPopulating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      await stockControlApiClient.deleteItemsRelease(jobCardId, id);
      fetchReleases();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete items release");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = () => {
    setViewMode("list");
    setEditingRelease(null);
    fetchReleases();
  };

  const handleEdit = (release: QcItemsReleaseRecord) => {
    setEditingRelease(release);
    setViewMode("edit");
  };

  if (viewMode === "edit") {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-5 shadow-sm">
        <ItemsReleaseForm
          jobCardId={jobCardId}
          existing={editingRelease}
          onSaved={handleSaved}
          onCancel={() => {
            setViewMode("list");
            setEditingRelease(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 px-3 sm:px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Items Release
          {releases.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500">({releases.length})</span>
          )}
        </h3>
        <button
          type="button"
          onClick={handleAutoPopulate}
          disabled={isAutoPopulating}
          className="self-start rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {isAutoPopulating ? "Loading..." : "+ New from Job Card"}
        </button>
      </div>

      {error && (
        <div className="mx-3 sm:mx-5 mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading...</div>
      ) : releases.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500">No items releases yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Create one to track per-item pass/fail status with multi-party sign-off
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {releases.map((release) => {
            const version = release.version;
            const passCount = release.items.filter((i) => i.result === "pass").length;
            const failCount = release.items.filter((i) => i.result === "fail").length;
            const hasSignOffs = [
              release.plsSignOff,
              release.mpsSignOff,
              release.clientSignOff,
            ].filter((s) => s.name !== null).length;

            return (
              <div
                key={release.id}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 py-3 hover:bg-gray-50"
              >
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                  <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">
                    v{version || 1}
                  </span>
                  {failCount > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      {failCount} Fail
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      All Pass
                    </span>
                  )}
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-900">
                      {release.items.length} item{release.items.length !== 1 ? "s" : ""}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      ({passCount} pass{failCount > 0 ? `, ${failCount} fail` : ""})
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>Qty: {release.totalQuantity}</span>
                      {hasSignOffs > 0 && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span>{hasSignOffs}/3 signed off</span>
                        </>
                      )}
                      {release.checkedByName && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span>Checked: {release.checkedByName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEdit(release)}
                    className="text-sm text-teal-600 hover:text-teal-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(release.id)}
                    disabled={deletingId === release.id}
                    className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    {deletingId === release.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ItemsReleaseFormProps {
  jobCardId: number;
  existing: QcItemsReleaseRecord | null;
  onSaved: () => void;
  onCancel: () => void;
}

function ItemsReleaseForm({ jobCardId, existing, onSaved, onCancel }: ItemsReleaseFormProps) {
  const existingItems = existing ? existing.items : null;
  const existingCheckedByName = existing ? existing.checkedByName : null;
  const existingComments = existing ? existing.comments : null;
  const existingPls = existing ? existing.plsSignOff : null;
  const existingMps = existing ? existing.mpsSignOff : null;
  const existingClient = existing ? existing.clientSignOff : null;
  const [items, setItems] = useState<ReleaseLineItem[]>(existingItems ? existingItems : []);
  const [checkedByName, setCheckedByName] = useState(
    existingCheckedByName ? existingCheckedByName : "",
  );
  const [comments, setComments] = useState(existingComments ? existingComments : "");
  const [plsSignOff, setPlsSignOff] = useState<ReleasePartySignOff>(
    existingPls ? existingPls : emptySignOff(),
  );
  const [mpsSignOff, setMpsSignOff] = useState<ReleasePartySignOff>(
    existingMps ? existingMps : emptySignOff(),
  );
  const [clientSignOff, setClientSignOff] = useState<ReleasePartySignOff>(
    existingClient ? existingClient : emptySignOff(),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureDate, setSignatureDate] = useState(now().toFormat("yyyy-MM-dd"));

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const passCount = items.filter((i) => i.result === "pass").length;
  const failCount = items.filter((i) => i.result === "fail").length;

  const toggleItemResult = (index: number) => {
    setItems(
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              result:
                item.result === "pass"
                  ? ("fail" as ItemReleaseResult)
                  : ("pass" as ItemReleaseResult),
            }
          : item,
      ),
    );
  };

  const markAllPass = () => {
    setItems(items.map((item) => ({ ...item, result: "pass" as ItemReleaseResult })));
  };

  const markAllFail = () => {
    setItems(items.map((item) => ({ ...item, result: "fail" as ItemReleaseResult })));
  };

  const updateItem = (index: number, field: keyof ReleaseLineItem, value: string | number) => {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const updateSignOff = (
    party: "pls" | "mps" | "client",
    field: keyof ReleasePartySignOff,
    value: string | null,
  ) => {
    const setters = { pls: setPlsSignOff, mps: setMpsSignOff, client: setClientSignOff };
    const current = { pls: plsSignOff, mps: mpsSignOff, client: clientSignOff };
    setters[party]({ ...current[party], [field]: value });
  };

  const handleSaveClick = () => {
    setShowSignatureModal(true);
  };

  const handleSaveWithSignature = async (signatureDataUrl: string) => {
    try {
      setIsSaving(true);
      setSaveError(null);
      setShowSignatureModal(false);

      const payload: Partial<QcItemsReleaseRecord> = {
        items,
        totalQuantity,
        checkedByName: checkedByName || null,
        checkedByDate: signatureDate,
        checkedBySignature: signatureDataUrl || null,
        plsSignOff,
        mpsSignOff,
        clientSignOff,
        comments: comments || null,
      };

      if (existing?.id) {
        await stockControlApiClient.updateItemsRelease(jobCardId, existing.id, payload);
      } else {
        await stockControlApiClient.createItemsRelease(jobCardId, payload);
      }

      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const rawVersion = existing ? existing.version : null;
  const version = existing ? existing.version : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          {existing?.id
            ? `Edit Items Release (v${rawVersion || 1} → v${(version || 1) + 1})`
            : "New Items Release"}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {items.length} item{items.length !== 1 ? "s" : ""} | Qty: {totalQuantity}
          </span>
        </div>
      </div>

      {saveError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{saveError}</div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={markAllPass}
          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
        >
          Mark All Pass
        </button>
        <button
          type="button"
          onClick={markAllFail}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        >
          Mark All Fail
        </button>
        <span className="text-sm text-gray-500">
          <span className="text-green-600 font-medium">{passCount} pass</span>
          {failCount > 0 && <span className="ml-2 text-red-600 font-medium">{failCount} fail</span>}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                Item No
              </th>
              <th className="hidden sm:table-cell px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                Item Code
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                Description
              </th>
              <th className="hidden md:table-cell px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                JT No
              </th>
              <th className="hidden md:table-cell px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                Rubber Spec
              </th>
              <th className="hidden md:table-cell px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                Paint Spec
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                Qty
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500">
                Result
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {items.map((item, index) => {
              const itemNoValue = item.itemNo == null ? "" : item.itemNo;
              const jtNumberValue = item.jtNumber == null ? "" : item.jtNumber;
              const rubberSpecValue = item.rubberSpec == null ? "" : item.rubberSpec;
              const paintingSpecValue = item.paintingSpec == null ? "" : item.paintingSpec;
              return (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-500">{index + 1}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={itemNoValue}
                      onChange={(e) => updateItem(index, "itemNo", e.target.value)}
                      placeholder="Item No"
                      className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="hidden sm:table-cell px-3 py-2">
                    <input
                      type="text"
                      value={item.itemCode}
                      onChange={(e) => updateItem(index, "itemCode", e.target.value)}
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      className="w-32 sm:w-48 rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="hidden md:table-cell px-3 py-2">
                    <input
                      type="text"
                      value={jtNumberValue}
                      onChange={(e) => updateItem(index, "jtNumber", e.target.value)}
                      placeholder="Paste JT"
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="hidden md:table-cell px-3 py-2">
                    <input
                      type="text"
                      value={rubberSpecValue}
                      onChange={(e) => updateItem(index, "rubberSpec", e.target.value)}
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="hidden md:table-cell px-3 py-2">
                    <input
                      type="text"
                      value={paintingSpecValue}
                      onChange={(e) => updateItem(index, "paintingSpec", e.target.value)}
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", Number(e.target.value) || 0)}
                      className="w-16 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => toggleItemResult(index)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        item.result === "pass"
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-red-100 text-red-800 hover:bg-red-200"
                      }`}
                    >
                      {item.result === "pass" ? "Pass" : "Fail"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={7} className="px-3 py-2 text-sm font-medium text-gray-700">
                Total
              </td>
              <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                {totalQuantity}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Checked By</label>
          <input
            type="text"
            value={checkedByName}
            onChange={(e) => setCheckedByName(e.target.value)}
            placeholder="Inspector name"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Comments</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Multi-Party Sign-Off</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(["pls", "mps", "client"] as const).map((party) => {
            const signOff = { pls: plsSignOff, mps: mpsSignOff, client: clientSignOff }[party];
            const labels = { pls: "PLS", mps: "MPS", client: "Client" };
            const signOffName = signOff.name;
            const signOffDate = signOff.date;
            const nameValue = signOffName == null ? "" : signOffName;
            const dateValue = signOffDate == null ? "" : signOffDate;
            return (
              <div key={party} className="rounded-lg border border-gray-200 p-3">
                <h5 className="text-xs font-semibold uppercase text-gray-600 mb-2">
                  {labels[party]}
                </h5>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500">Name</label>
                    <input
                      type="text"
                      value={nameValue}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        updateSignOff(party, "name", rawValue || null);
                      }}
                      className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Date</label>
                    <input
                      type="date"
                      value={dateValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateSignOff(party, "date", value || null);
                      }}
                      className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={isSaving || items.length === 0}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Sign & Save"}
        </button>
      </div>

      {showSignatureModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md"
              onClick={() => setShowSignatureModal(false)}
              aria-hidden="true"
            />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Sign Items Release Document
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inspector Name
                  </label>
                  <input
                    type="text"
                    value={checkedByName}
                    onChange={(e) => setCheckedByName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inspection Date
                  </label>
                  <input
                    type="date"
                    value={signatureDate}
                    onChange={(e) => setSignatureDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
                  <SignaturePad
                    onSave={(dataUrl) => handleSaveWithSignature(dataUrl)}
                    onCancel={() => setShowSignatureModal(false)}
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
