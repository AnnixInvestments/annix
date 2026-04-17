"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDateTimeZA, formatDateZA } from "@/app/lib/datetime";
import { StockManagementApiClient } from "../api/stockManagementApi";
import { ComboBox, type ComboBoxOption } from "../components/ComboBox";
import { PhotoExtractButton, type PhotoExtractedFields } from "../components/PhotoExtractButton";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";
import type { RubberCompoundDto } from "../types/admin";

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
  paintReturns?: Array<{
    id: number;
    litresReturned: number;
    condition: "usable" | "contaminated";
    batchNumber: string | null;
    notes: string | null;
  }>;
  consumableReturns?: Array<{
    id: number;
    quantityReturned: number;
    condition: "usable" | "contaminated";
    batchNumber: string | null;
    notes: string | null;
  }>;
}

interface ProductOption {
  id: number;
  name: string;
  sku: string;
  productType: string;
  unitOfMeasure?: string | null;
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
  const [client] = useState(
    () =>
      new StockManagementApiClient({
        baseUrl: config.apiBaseUrl,
        headers: config.authHeaders,
      }),
  );
  const [outstanding, setOutstanding] = useState<ReturnSessionDto[]>([]);
  const [bins, setBins] = useState<WastageBinDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewOffcut, setShowNewOffcut] = useState(false);
  const [showNewPaint, setShowNewPaint] = useState(false);
  const [showNewConsumable, setShowNewConsumable] = useState(false);
  const [paintProducts, setPaintProducts] = useState<ProductOption[]>([]);
  const [consumableProducts, setConsumableProducts] = useState<ProductOption[]>([]);
  const [compounds, setCompounds] = useState<RubberCompoundDto[]>([]);
  const [draft, setDraft] = useState<{
    widthMm: number;
    lengthM: number;
    thicknessMm: number;
    compoundId: number | "";
    offcutNumber: string;
    notes: string;
  }>({
    widthMm: 0,
    lengthM: 0,
    thicknessMm: 0,
    compoundId: "",
    offcutNumber: "",
    notes: "",
  });
  const [paintDraft, setPaintDraft] = useState<{
    sourceProductId: number | "";
    litresReturned: number;
    condition: "usable" | "contaminated";
    batchNumber: string;
    notes: string;
  }>({
    sourceProductId: "",
    litresReturned: 0,
    condition: "usable",
    batchNumber: "",
    notes: "",
  });
  const [consumableDraft, setConsumableDraft] = useState<{
    sourceProductId: number | "";
    quantityReturned: number;
    condition: "usable" | "contaminated";
    batchNumber: string;
    notes: string;
  }>({
    sourceProductId: "",
    quantityReturned: 0,
    condition: "usable",
    batchNumber: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [outstandingResult, binsResult, paintResult, consumableResult, compoundsResult] =
        await Promise.all([
          client.listOutstandingReturns(),
          client.listWastageBins(),
          client.listProducts({ productType: "paint", active: true, pageSize: 200 }),
          client.listProducts({ productType: "consumable", active: true, pageSize: 200 }),
          client.listRubberCompounds(false),
        ]);
      setOutstanding(outstandingResult as ReturnSessionDto[]);
      setBins(binsResult as WastageBinDto[]);
      const paintResultTyped = paintResult as { items: ProductOption[] };
      setPaintProducts(paintResultTyped.items);
      const consumableResultTyped = consumableResult as { items: ProductOption[] };
      setConsumableProducts(consumableResultTyped.items);
      setCompounds(compoundsResult);
    } catch (err) {
      console.error("Failed to load returns", err);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const compoundOptions = useMemo<ComboBoxOption[]>(() => {
    return compounds.map((c) => {
      const colour = c.defaultColour;
      const colourSuffix = colour == null ? "" : ` · ${colour}`;
      return {
        id: c.id,
        label: `${c.code} — ${c.name}`,
        sublabel: `${c.compoundFamily}${colourSuffix}`,
        searchTokens: [c.code, c.name, c.compoundFamily],
      };
    });
  }, [compounds]);

  const paintProductOptions = useMemo<ComboBoxOption[]>(() => {
    return paintProducts.map((p) => ({
      id: p.id,
      label: p.name,
      sublabel: p.sku,
      searchTokens: [p.sku, p.name],
    }));
  }, [paintProducts]);

  const consumableProductOptions = useMemo<ComboBoxOption[]>(() => {
    return consumableProducts.map((p) => ({
      id: p.id,
      label: p.name,
      sublabel: p.sku,
      searchTokens: [p.sku, p.name],
    }));
  }, [consumableProducts]);

  const outstandingRubber = useMemo<ReturnSessionDto[]>(
    () => outstanding.filter((s) => s.returnKind === "rubber_offcut"),
    [outstanding],
  );
  const outstandingPaint = useMemo<ReturnSessionDto[]>(
    () => outstanding.filter((s) => s.returnKind === "paint_litres"),
    [outstanding],
  );
  const outstandingConsumable = useMemo<ReturnSessionDto[]>(
    () => outstanding.filter((s) => s.returnKind === "consumable_qty"),
    [outstanding],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (draft.widthMm <= 0 || draft.lengthM <= 0 || draft.thicknessMm <= 0) {
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
      alert("Width, length and thickness must all be positive");
      return;
    }
    const selectedCompound =
      draft.compoundId === "" ? null : compounds.find((c) => c.id === draft.compoundId);
    const derivedCode = selectedCompound == null ? null : selectedCompound.code;
    const derivedColour = selectedCompound == null ? null : selectedCompound.defaultColour;
    setIsSubmitting(true);
    try {
      await client.createOffcutReturn({
        widthMm: draft.widthMm,
        lengthM: draft.lengthM,
        thicknessMm: draft.thicknessMm,
        compoundCode: derivedCode,
        colour: derivedColour,
        offcutNumber: (() => {
          const rawOffcutNumber = draft.offcutNumber;
          return rawOffcutNumber || null;
        })(),
        notes: (() => {
          const rawNotes = draft.notes;
          return rawNotes || null;
        })(),
      });
      setShowNewOffcut(false);
      setDraft({
        widthMm: 0,
        lengthM: 0,
        thicknessMm: 0,
        compoundId: "",
        offcutNumber: "",
        notes: "",
      });
      await refresh();
    } catch (err) {
      console.error("Create failed", err);
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
      alert(err instanceof Error ? err.message : "Create failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOffcutPhotoExtracted = (fields: PhotoExtractedFields) => {
    const widthMm = fields.widthMm;
    const lengthM = fields.lengthM;
    const thicknessMm = fields.thicknessMm;
    const compoundCode = fields.compoundCode;
    const matchedCompound =
      compoundCode == null
        ? null
        : compounds.find((c) => c.code.toLowerCase() === compoundCode.toLowerCase());
    setDraft((prev) => ({
      ...prev,
      widthMm: widthMm == null ? prev.widthMm : widthMm,
      lengthM: lengthM == null ? prev.lengthM : lengthM,
      thicknessMm: thicknessMm == null ? prev.thicknessMm : thicknessMm,
      compoundId: matchedCompound == null ? prev.compoundId : matchedCompound.id,
    }));
  };

  const handlePaintPhotoExtracted = (fields: PhotoExtractedFields) => {
    const sku = fields.sku;
    const productName = fields.productName;
    const batchNumber = fields.batchNumber;
    const matchById = fields.matches.find((m) => m.productType === "paint");
    const matchBySku =
      sku == null ? null : paintProducts.find((p) => p.sku.toLowerCase() === sku.toLowerCase());
    const matchByName =
      productName == null
        ? null
        : paintProducts.find((p) => p.name.toLowerCase().includes(productName.toLowerCase()));
    const matched =
      matchById != null
        ? paintProducts.find((p) => p.id === matchById.productId)
        : matchBySku != null
          ? matchBySku
          : matchByName;
    setPaintDraft((prev) => ({
      ...prev,
      sourceProductId: matched == null ? prev.sourceProductId : matched.id,
      batchNumber: batchNumber == null ? prev.batchNumber : batchNumber,
    }));
  };

  const handleConsumablePhotoExtracted = (fields: PhotoExtractedFields) => {
    const sku = fields.sku;
    const productName = fields.productName;
    const batchNumber = fields.batchNumber;
    const matchById = fields.matches.find((m) => m.productType === "consumable");
    const matchBySku =
      sku == null
        ? null
        : consumableProducts.find((p) => p.sku.toLowerCase() === sku.toLowerCase());
    const matchByName =
      productName == null
        ? null
        : consumableProducts.find((p) => p.name.toLowerCase().includes(productName.toLowerCase()));
    const matched =
      matchById != null
        ? consumableProducts.find((p) => p.id === matchById.productId)
        : matchBySku != null
          ? matchBySku
          : matchByName;
    setConsumableDraft((prev) => ({
      ...prev,
      sourceProductId: matched == null ? prev.sourceProductId : matched.id,
      batchNumber: batchNumber == null ? prev.batchNumber : batchNumber,
    }));
  };

  const handleCreatePaint = async () => {
    if (paintDraft.sourceProductId === "") {
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
      alert("Please pick a paint product");
      return;
    }
    if (paintDraft.litresReturned <= 0) {
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
      alert("Litres returned must be greater than zero");
      return;
    }
    setIsSubmitting(true);
    try {
      await client.createPaintReturn({
        sourceProductId: Number(paintDraft.sourceProductId),
        litresReturned: paintDraft.litresReturned,
        condition: paintDraft.condition,
        batchNumber: (() => {
          const rawBatchNumber = paintDraft.batchNumber;
          return rawBatchNumber || null;
        })(),
        notes: (() => {
          const rawNotes = paintDraft.notes;
          return rawNotes || null;
        })(),
      });
      setShowNewPaint(false);
      setPaintDraft({
        sourceProductId: "",
        litresReturned: 0,
        condition: "usable",
        batchNumber: "",
        notes: "",
      });
      await refresh();
    } catch (err) {
      console.error("Create paint return failed", err);
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
      alert(err instanceof Error ? err.message : "Create paint return failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateConsumable = async () => {
    if (consumableDraft.sourceProductId === "") {
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
      alert("Please pick a consumable product");
      return;
    }
    if (consumableDraft.quantityReturned <= 0) {
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
      alert("Quantity returned must be greater than zero");
      return;
    }
    setIsSubmitting(true);
    try {
      await client.createConsumableReturn({
        sourceProductId: Number(consumableDraft.sourceProductId),
        quantityReturned: consumableDraft.quantityReturned,
        condition: consumableDraft.condition,
        batchNumber: (() => {
          const rawBatchNumber = consumableDraft.batchNumber;
          return rawBatchNumber || null;
        })(),
        notes: (() => {
          const rawNotes = consumableDraft.notes;
          return rawNotes || null;
        })(),
      });
      setShowNewConsumable(false);
      setConsumableDraft({
        sourceProductId: "",
        quantityReturned: 0,
        condition: "usable",
        batchNumber: "",
        notes: "",
      });
      await refresh();
    } catch (err) {
      console.error("Create consumable return failed", err);
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
      alert(err instanceof Error ? err.message : "Create consumable return failed");
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
    // eslint-disable-next-line no-restricted-globals -- legacy sync prompt pending modal migration (issue #175)
    const reason = prompt("Rejection reason?");
    if (!reason) return;
    try {
      await client.rejectReturnSession(sessionId, reason);
      await refresh();
    } catch (err) {
      console.error("Reject failed", err);
    }
  };

  const renderSessionCard = (session: ReturnSessionDto) => {
    return (
      <div key={session.id} className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">Return #{session.id}</div>
            <div className="text-xs text-gray-500 mt-1">
              {formatDateTimeZA(session.createdAt)} · status: {session.status}
            </div>
            {session.offcutReturns && session.offcutReturns.length > 0 && (
              <div className="mt-2 text-xs text-gray-700">
                {session.offcutReturns.map((offcut) => {
                  const weightKg = offcut.computedWeightKg;
                  const colour = offcut.colour;
                  const compound = offcut.compoundCode;
                  return (
                    <div key={offcut.id}>
                      {offcut.widthMm}mm × {offcut.lengthM}m × {offcut.thicknessMm}mm
                      {colour != null && ` · ${colour}`}
                      {compound != null && ` · ${compound}`}
                      {weightKg != null && ` (${weightKg.toFixed(2)} kg)`}
                    </div>
                  );
                })}
              </div>
            )}
            {session.paintReturns && session.paintReturns.length > 0 && (
              <div className="mt-2 text-xs text-gray-700">
                {session.paintReturns.map((paint) => {
                  const batch = paint.batchNumber;
                  return (
                    <div key={paint.id}>
                      {paint.litresReturned.toFixed(2)}L · {paint.condition}
                      {batch != null && ` · batch ${batch}`}
                    </div>
                  );
                })}
              </div>
            )}
            {session.consumableReturns && session.consumableReturns.length > 0 && (
              <div className="mt-2 text-xs text-gray-700">
                {session.consumableReturns.map((consumable) => {
                  const batch = consumable.batchNumber;
                  return (
                    <div key={consumable.id}>
                      {consumable.quantityReturned} units · {consumable.condition}
                      {batch != null && ` · batch ${batch}`}
                    </div>
                  );
                })}
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
    );
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-500">{config.label("common.loading")}</div>;
  }

  return (
    <div className="space-y-4 p-3 sm:space-y-6 sm:p-6">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{config.label("returns.title")}</h1>
          <p className="mt-1 text-sm text-gray-600">{config.label("returns.subtitle")}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowNewPaint(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium"
          >
            + New Paint Return
          </button>
          <button
            type="button"
            onClick={() => setShowNewConsumable(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium"
          >
            + New Consumable Return
          </button>
          <button
            type="button"
            onClick={() => setShowNewOffcut(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium"
          >
            + New Rubber Offcut Return
          </button>
        </div>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-3">Paint Returns</h2>
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm divide-y">
          {outstandingPaint.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">No paint returns</div>
          ) : (
            outstandingPaint.map((session) => renderSessionCard(session))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Consumable Returns</h2>
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm divide-y">
          {outstandingConsumable.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">No consumable returns</div>
          ) : (
            outstandingConsumable.map((session) => renderSessionCard(session))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Rubber Offcut Returns</h2>
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm divide-y">
          {outstandingRubber.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">No rubber offcut returns</div>
          ) : (
            outstandingRubber.map((session) => renderSessionCard(session))
          )}
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
                  Emptied: {formatDateZA(bin.lastEmptiedAt)}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {showNewOffcut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">New Rubber Offcut Return</h2>
            <p className="text-xs text-gray-600">
              Returning a rubber offcut creates a new allocatable stock entry with the dimensions
              you enter below. The system computes weight from dimensions × density. Colour is
              derived from the selected compound.
            </p>
            <PhotoExtractButton
              onExtracted={handleOffcutPhotoExtracted}
              label="Take photo of offcut to auto-fill"
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Width (mm)</label>
                <input
                  type="number"
                  value={(() => {
                    const rawWidthMm = draft.widthMm;
                    return rawWidthMm || "";
                  })()}
                  onChange={(e) => setDraft({ ...draft, widthMm: Number(e.target.value) })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Length (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={(() => {
                    const rawLengthM = draft.lengthM;
                    return rawLengthM || "";
                  })()}
                  onChange={(e) => setDraft({ ...draft, lengthM: Number(e.target.value) })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Thick (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={(() => {
                    const rawThicknessMm = draft.thicknessMm;
                    return rawThicknessMm || "";
                  })()}
                  onChange={(e) => setDraft({ ...draft, thicknessMm: Number(e.target.value) })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Compound</label>
              <ComboBox
                value={draft.compoundId}
                options={compoundOptions}
                onChange={(id) => setDraft({ ...draft, compoundId: id })}
                placeholder="Type or pick a compound (e.g. SBR70)"
                emptyLabel="No compounds — create some under Admin · Rubber Compounds"
              />
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

      {showNewPaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">New Paint Return</h2>
            <p className="text-xs text-gray-600">
              Return partially-used paint. Usable litres can be re-issued; contaminated paint is
              logged for disposal. Backend scope gap: re-stocking usable litres into FIFO batches is
              tracked on #192 and not yet wired.
            </p>
            <PhotoExtractButton
              onExtracted={handlePaintPhotoExtracted}
              label="Take photo of paint tin to auto-fill"
            />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Paint product</label>
              <ComboBox
                value={paintDraft.sourceProductId}
                options={paintProductOptions}
                onChange={(id) => setPaintDraft({ ...paintDraft, sourceProductId: id })}
                placeholder="Type or pick a paint"
                emptyLabel="No paint products — create some under Admin · Product Categories"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Litres returned</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={(() => {
                  const rawLitresReturned = paintDraft.litresReturned;
                  return rawLitresReturned || "";
                })()}
                onChange={(e) =>
                  setPaintDraft({ ...paintDraft, litresReturned: Number(e.target.value) })
                }
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">Condition</div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="paintCondition"
                    value="usable"
                    checked={paintDraft.condition === "usable"}
                    onChange={() => setPaintDraft({ ...paintDraft, condition: "usable" })}
                  />
                  <span>Usable (can be re-issued)</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="paintCondition"
                    value="contaminated"
                    checked={paintDraft.condition === "contaminated"}
                    onChange={() => setPaintDraft({ ...paintDraft, condition: "contaminated" })}
                  />
                  <span>Contaminated</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Batch number (optional)
              </label>
              <input
                value={paintDraft.batchNumber}
                onChange={(e) => setPaintDraft({ ...paintDraft, batchNumber: e.target.value })}
                placeholder="e.g. HP-2024-A42"
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Notes</label>
              <textarea
                value={paintDraft.notes}
                onChange={(e) => setPaintDraft({ ...paintDraft, notes: e.target.value })}
                rows={2}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowNewPaint(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded"
              >
                {config.label("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleCreatePaint}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded font-medium disabled:opacity-50"
              >
                {isSubmitting ? "Creating…" : "Create Paint Return"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewConsumable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">New Consumable Return</h2>
            <p className="text-xs text-gray-600">
              Return unused or partially-used consumables. Usable units can be re-issued;
              contaminated units are logged for disposal. Backend scope gap: re-stocking usable
              quantity into FIFO batches is tracked on #192 and not yet wired.
            </p>
            <PhotoExtractButton
              onExtracted={handleConsumablePhotoExtracted}
              label="Take photo of item to auto-fill"
            />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Consumable product
              </label>
              <ComboBox
                value={consumableDraft.sourceProductId}
                options={consumableProductOptions}
                onChange={(id) => setConsumableDraft({ ...consumableDraft, sourceProductId: id })}
                placeholder="Type or pick a consumable"
                emptyLabel="No consumable products — create some under Admin · Product Categories"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Quantity returned</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={(() => {
                  const rawQuantityReturned = consumableDraft.quantityReturned;
                  return rawQuantityReturned || "";
                })()}
                onChange={(e) =>
                  setConsumableDraft({
                    ...consumableDraft,
                    quantityReturned: Number(e.target.value),
                  })
                }
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">Condition</div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="consumableCondition"
                    value="usable"
                    checked={consumableDraft.condition === "usable"}
                    onChange={() => setConsumableDraft({ ...consumableDraft, condition: "usable" })}
                  />
                  <span>Usable (can be re-issued)</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="consumableCondition"
                    value="contaminated"
                    checked={consumableDraft.condition === "contaminated"}
                    onChange={() =>
                      setConsumableDraft({ ...consumableDraft, condition: "contaminated" })
                    }
                  />
                  <span>Contaminated</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Batch number (optional)
              </label>
              <input
                value={consumableDraft.batchNumber}
                onChange={(e) =>
                  setConsumableDraft({ ...consumableDraft, batchNumber: e.target.value })
                }
                placeholder="e.g. BATCH-2024-07"
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Notes</label>
              <textarea
                value={consumableDraft.notes}
                onChange={(e) => setConsumableDraft({ ...consumableDraft, notes: e.target.value })}
                rows={2}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowNewConsumable(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded"
              >
                {config.label("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleCreateConsumable}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded font-medium disabled:opacity-50"
              >
                {isSubmitting ? "Creating…" : "Create Consumable Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReturnsPage;
