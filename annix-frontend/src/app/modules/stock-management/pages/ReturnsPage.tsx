"use client";

import { useCallback, useEffect, useState } from "react";
import { StockManagementApiClient } from "../api/stockManagementApi";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";

interface ReturnSessionDto {
  id: number;
  companyId: number;
  returnKind: string;
  status: string;
  notes: string | null;
  createdAt: string;
  offcutReturns?: Array<{
    id: number;
    widthMm: number;
    lengthM: number;
    thicknessMm: number;
    computedWeightKg: number | null;
    colour: string | null;
    compoundCode: string | null;
  }>;
}

interface WastageBinDto {
  id: number;
  colour: string;
  currentWeightKg: number;
  currentValueR: number;
  lastEmptiedAt: string | null;
}

export function ReturnsPage() {
  const config = useStockManagementConfig();
  const [client] = useState(() => new StockManagementApiClient({ baseUrl: config.apiBaseUrl }));
  const [outstanding, setOutstanding] = useState<ReturnSessionDto[]>([]);
  const [bins, setBins] = useState<WastageBinDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewOffcut, setShowNewOffcut] = useState(false);
  const [draft, setDraft] = useState({
    widthMm: 0,
    lengthM: 0,
    thicknessMm: 0,
    compoundCode: "",
    colour: "",
    offcutNumber: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [outstandingResult, binsResult] = await Promise.all([
        client.listOutstandingReturns(),
        client.listWastageBins(),
      ]);
      setOutstanding(outstandingResult as ReturnSessionDto[]);
      setBins(binsResult as WastageBinDto[]);
    } catch (err) {
      console.error("Failed to load returns", err);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (draft.widthMm <= 0 || draft.lengthM <= 0 || draft.thicknessMm <= 0) {
      alert("Width, length and thickness must all be positive");
      return;
    }
    setIsSubmitting(true);
    try {
      await client.createOffcutReturn({
        widthMm: draft.widthMm,
        lengthM: draft.lengthM,
        thicknessMm: draft.thicknessMm,
        compoundCode: draft.compoundCode || null,
        colour: draft.colour || null,
        offcutNumber: draft.offcutNumber || null,
        notes: draft.notes || null,
      });
      setShowNewOffcut(false);
      setDraft({
        widthMm: 0,
        lengthM: 0,
        thicknessMm: 0,
        compoundCode: "",
        colour: "",
        offcutNumber: "",
        notes: "",
      });
      await refresh();
    } catch (err) {
      console.error("Create failed", err);
      alert(err instanceof Error ? err.message : "Create failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async (sessionId: number) => {
    try {
      await client.confirmReturnSession(sessionId);
      await refresh();
    } catch (err) {
      console.error("Confirm failed", err);
    }
  };

  const handleReject = async (sessionId: number) => {
    const reason = prompt("Rejection reason?");
    if (!reason) return;
    try {
      await client.rejectReturnSession(sessionId, reason);
      await refresh();
    } catch (err) {
      console.error("Reject failed", err);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-500">{config.label("common.loading")}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{config.label("returns.title")}</h1>
          <p className="mt-1 text-sm text-gray-600">{config.label("returns.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewOffcut(true)}
          className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium"
        >
          + New Rubber Offcut Return
        </button>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          {config.label("returns.dashboard.outstandingHeader")}
        </h2>
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm divide-y">
          {outstanding.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">
              {config.label("common.empty")}
            </div>
          )}
          {outstanding.map((session) => (
            <div key={session.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">
                    Return #{session.id} · {session.returnKind}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(session.createdAt).toLocaleString()} · status: {session.status}
                  </div>
                  {session.offcutReturns && session.offcutReturns.length > 0 && (
                    <div className="mt-2 text-xs text-gray-700">
                      {session.offcutReturns.map((offcut) => (
                        <div key={offcut.id}>
                          {offcut.widthMm}mm × {offcut.lengthM}m × {offcut.thicknessMm}mm
                          {offcut.colour && ` · ${offcut.colour}`}
                          {offcut.compoundCode && ` · ${offcut.compoundCode}`}
                          {offcut.computedWeightKg && ` (${offcut.computedWeightKg.toFixed(2)} kg)`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfirm(session.id)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded text-xs"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(session.id)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded text-xs"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Rubber Wastage Bins</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {bins.length === 0 && (
            <div className="col-span-full p-6 text-center text-sm text-gray-500 border border-gray-200 rounded-lg">
              No wastage bins yet — they appear here as wastage is logged
            </div>
          )}
          {bins.map((bin) => (
            <div key={bin.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: bin.colour.toLowerCase() }}
                />
                <span className="font-semibold text-sm capitalize">{bin.colour}</span>
              </div>
              <div className="mt-2 text-xl font-bold">{bin.currentWeightKg.toFixed(2)} kg</div>
              <div className="text-xs text-gray-600">R {bin.currentValueR.toFixed(2)}</div>
              {bin.lastEmptiedAt && (
                <div className="text-xs text-gray-400 mt-1">
                  Emptied: {new Date(bin.lastEmptiedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {showNewOffcut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">New Rubber Offcut Return</h2>
            <p className="text-xs text-gray-600">
              Returning a rubber offcut creates a new allocatable stock entry with the dimensions
              you enter below. The system computes weight from dimensions × density.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Width (mm)</label>
                <input
                  type="number"
                  value={draft.widthMm || ""}
                  onChange={(e) => setDraft({ ...draft, widthMm: Number(e.target.value) })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Length (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={draft.lengthM || ""}
                  onChange={(e) => setDraft({ ...draft, lengthM: Number(e.target.value) })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Thick (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={draft.thicknessMm || ""}
                  onChange={(e) => setDraft({ ...draft, thicknessMm: Number(e.target.value) })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Compound code</label>
                <input
                  value={draft.compoundCode}
                  onChange={(e) => setDraft({ ...draft, compoundCode: e.target.value })}
                  placeholder="e.g. SBR70"
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Colour</label>
                <input
                  value={draft.colour}
                  onChange={(e) => setDraft({ ...draft, colour: e.target.value })}
                  placeholder="e.g. black, red"
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Offcut number</label>
              <input
                value={draft.offcutNumber}
                onChange={(e) => setDraft({ ...draft, offcutNumber: e.target.value })}
                placeholder="optional — handwritten label or auto-generated"
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Notes</label>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                rows={2}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowNewOffcut(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded"
              >
                {config.label("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded font-medium disabled:opacity-50"
              >
                {isSubmitting ? "Creating…" : "Create Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReturnsPage;
