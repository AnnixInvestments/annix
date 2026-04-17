"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CoatingAnalysis,
  IssuanceBatchRecord,
  QcDftReadingEntry,
  QcDftReadingRecord,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { now } from "@/app/lib/datetime";
import { QcFormModal } from "./QcFormModal";

interface DftReadingFormProps {
  isOpen: boolean;
  onClose: () => void;
  jobCardId: number;
  existing?: QcDftReadingRecord | null;
  onSaved: () => void;
  coatingAnalysis?: CoatingAnalysis | null;
  batchRecords?: IssuanceBatchRecord[];
}

const READING_ROWS = Array.from({ length: 20 }, (_, i) => i + 1);

const todayDateString = (): string => now().toFormat("yyyy-MM-dd");

const initialReadings = (existing: QcDftReadingRecord | null): Record<number, string> => {
  if (!existing) {
    return {};
  }
  return existing.readings.reduce(
    (acc, entry) => ({ ...acc, [entry.itemNumber]: String(entry.reading) }),
    {} as Record<number, string>,
  );
};

const PAINT_CATEGORY_PATTERN = /paint|primer|coat|epoxy|polyurethane|topcoat|finish/i;

const paintBatchRecords = (records: IssuanceBatchRecord[]): IssuanceBatchRecord[] =>
  records.filter(
    (r) =>
      (r.stockItem?.category && PAINT_CATEGORY_PATTERN.test(r.stockItem.category)) ||
      (r.stockItem?.name && PAINT_CATEGORY_PATTERN.test(r.stockItem.name)),
  );

const significantWords = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .filter((w) => !PAINT_CATEGORY_PATTERN.test(w));

const matchBatchByProduct = (records: IssuanceBatchRecord[], product: string): string => {
  const productLower = product.toLowerCase();
  const paintRecords = paintBatchRecords(records);

  const byExactSubstring = paintRecords.find((r) =>
    r.stockItem?.name?.toLowerCase().includes(productLower),
  );
  if (byExactSubstring) {
    return byExactSubstring.batchNumber;
  }

  const byReverseSubstring = paintRecords.find(
    (r) => r.stockItem?.name && productLower.includes(r.stockItem.name.toLowerCase()),
  );
  if (byReverseSubstring) {
    return byReverseSubstring.batchNumber;
  }

  const productWords = significantWords(product);
  if (productWords.length > 0) {
    const byWordMatch = paintRecords.find((r) => {
      const itemName = r.stockItem?.name?.toLowerCase() || "";
      return productWords.some((word) => itemName.includes(word));
    });
    if (byWordMatch) {
      return byWordMatch.batchNumber;
    }
  }

  const rawBatchNumber = paintRecords[0]?.batchNumber;
  return rawBatchNumber || "";
};

type DftCoatType = "primer" | "intermediate" | "final";

const coatDefaults = (
  coatingAnalysis: CoatingAnalysis | null | undefined,
  coatType: DftCoatType,
  batchRecords: IssuanceBatchRecord[],
): { product: string; batchNumber: string; minUm: string; maxUm: string } => {
  if (!coatingAnalysis) {
    return { product: "", batchNumber: "", minUm: "", maxUm: "" };
  }
  const extCoats = coatingAnalysis.coats.filter((c) => c.area === "external");
  const coat = extCoats.find((c) => c.coatRole === coatType) || extCoats[0] || null;
  if (coat) {
    const batchByProduct = matchBatchByProduct(batchRecords, coat.product);
    const batchNumber =
      batchByProduct ||
      (coat.genericType ? matchBatchByProduct(batchRecords, coat.genericType) : "");
    return {
      product: coat.product,
      batchNumber,
      minUm: String(coat.minDftUm),
      maxUm: String(coat.maxDftUm),
    };
  }
  return { product: "", batchNumber: "", minUm: "", maxUm: "" };
};

export default function DftReadingForm(props: DftReadingFormProps) {
  const { isOpen, onClose, jobCardId, onSaved } = props;
  const rawExisting = props.existing;
  const existing = rawExisting || null;
  const rawCoatingAnalysis = props.coatingAnalysis;
  const coatingAnalysis = rawCoatingAnalysis || null;
  const rawBatchRecords = props.batchRecords;
  const batchRecords = rawBatchRecords || [];

  const initialCoatType = existing?.coatType;
  const initialPaintProduct = existing?.paintProduct;
  const initialBatchNumber = existing?.batchNumber;

  const availableCoatTypes: DftCoatType[] = (() => {
    const extCoats = coatingAnalysis?.coats.filter((c) => c.area === "external") || [];
    const roles = extCoats.map((c) => c.coatRole).filter(Boolean) as DftCoatType[];
    return roles.length > 0
      ? (["primer", "intermediate", "final"] as const).filter((r) => roles.includes(r))
      : ["primer", "final"];
  })();
  const [coatType, setCoatType] = useState<DftCoatType>(initialCoatType || "primer");
  const defaults = existing ? null : coatDefaults(coatingAnalysis, coatType, batchRecords);
  const initialProduct = defaults?.product;
  const initialBatch = defaults?.batchNumber;
  const initialMinUm = defaults?.minUm;
  const initialMaxUm = defaults?.maxUm;
  const [paintProduct, setPaintProduct] = useState(initialPaintProduct || initialProduct || "");
  const [batchNumber, setBatchNumber] = useState(initialBatchNumber || initialBatch || "");
  const specMinRaw = existing?.specMinMicrons;
  const [specMinMicrons, setSpecMinMicrons] = useState(
    specMinRaw != null ? String(specMinRaw) : initialMinUm || "",
  );
  const specMaxRaw = existing?.specMaxMicrons;
  const [specMaxMicrons, setSpecMaxMicrons] = useState(
    specMaxRaw != null ? String(specMaxRaw) : initialMaxUm || "",
  );
  const [readingDate, setReadingDate] = useState(
    existing?.readingDate ? existing.readingDate.slice(0, 10) : todayDateString(),
  );
  const [temperature, setTemperature] = useState(
    existing?.temperature != null ? String(existing.temperature) : "",
  );
  const [humidity, setHumidity] = useState(
    existing?.humidity != null ? String(existing.humidity) : "",
  );
  const [readings, setReadings] = useState<Record<number, string>>(
    initialReadings(existing ?? null),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!readingDate || existing) return;
    stockControlApiClient
      .environmentalRecordByDate(jobCardId, readingDate)
      .then((envRec) => {
        if (!envRec) return;
        setTemperature((prev) => (prev === "" ? String(envRec.temperatureC) : prev));
        setHumidity((prev) => (prev === "" ? String(envRec.humidity) : prev));
      })
      .catch(() => {});
  }, [readingDate, jobCardId, existing]);

  const parsedMin = Number(specMinMicrons);
  const parsedMax = Number(specMaxMicrons);
  const hasValidSpec = !Number.isNaN(parsedMin) && !Number.isNaN(parsedMax) && parsedMin > 0;

  const filledReadings = useMemo(
    () =>
      READING_ROWS.map((num) => {
        const readingsNum = readings[num];
        const value = readingsNum || "";
        return { itemNumber: num, value };
      }).filter((r) => r.value !== "" && !Number.isNaN(Number(r.value))),
    [readings],
  );

  const average = useMemo(() => {
    if (filledReadings.length === 0) {
      return null;
    }
    const sum = filledReadings.reduce((acc, r) => acc + Number(r.value), 0);
    return Math.round((sum / filledReadings.length) * 10) / 10;
  }, [filledReadings]);

  const readingOutOfSpec = (value: string): boolean => {
    if (!hasValidSpec || value === "" || Number.isNaN(Number(value))) {
      return false;
    }
    const num = Number(value);
    return num < parsedMin || num > parsedMax;
  };

  const updateReading = (itemNumber: number, value: string) => {
    setReadings((prev) => ({ ...prev, [itemNumber]: value }));
  };

  const handleSave = async () => {
    if (!paintProduct.trim()) {
      setError("Paint product is required.");
      return;
    }
    if (!specMinMicrons || Number.isNaN(parsedMin)) {
      setError("Spec min microns is required.");
      return;
    }
    if (!specMaxMicrons || Number.isNaN(parsedMax)) {
      setError("Spec max microns is required.");
      return;
    }
    if (!readingDate) {
      setError("Reading date is required.");
      return;
    }

    const entries: QcDftReadingEntry[] = filledReadings.map((r) => ({
      itemNumber: r.itemNumber,
      reading: Number(r.value),
    }));

    const payload: Partial<QcDftReadingRecord> = {
      coatType,
      paintProduct: paintProduct.trim(),
      batchNumber: batchNumber.trim() || null,
      specMinMicrons: parsedMin,
      specMaxMicrons: parsedMax,
      readings: entries,
      averageMicrons: average,
      temperature: temperature ? Number(temperature) : null,
      humidity: humidity ? Number(humidity) : null,
      readingDate,
    };

    setSaving(true);
    setError(null);

    try {
      if (existing) {
        await stockControlApiClient.updateDftReading(jobCardId, existing.id, payload);
      } else {
        await stockControlApiClient.createDftReading(jobCardId, payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save DFT reading.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <QcFormModal
      isOpen={isOpen}
      onClose={onClose}
      title={existing ? "Edit DFT Reading" : "New DFT Reading"}
      error={error}
      saving={saving}
      onSave={handleSave}
    >
      <div className="mb-4 flex rounded-md border border-gray-300 overflow-hidden">
        {availableCoatTypes.map((type) => (
          <button
            key={type}
            type="button"
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors capitalize ${
              coatType === type
                ? "bg-teal-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => setCoatType(type)}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Paint Product</label>
          <input
            type="text"
            value={paintProduct}
            onChange={(e) => setPaintProduct(e.target.value)}
            placeholder="e.g. Sigma EP Universal Primer"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
          <input
            type="text"
            list="dft-batch-options"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {batchRecords.length > 0 && (
            <datalist id="dft-batch-options">
              {paintBatchRecords(batchRecords).map((r) => {
                const stockItem = r.stockItem;
                const name = stockItem ? stockItem.name : null;
                return (
                  <option key={r.id} value={r.batchNumber}>
                    {name || r.batchNumber}
                  </option>
                );
              })}
            </datalist>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reading Date</label>
          <input
            type="date"
            value={readingDate}
            onChange={(e) => setReadingDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Spec Min (μm)</label>
          <input
            type="number"
            value={specMinMicrons}
            onChange={(e) => setSpecMinMicrons(e.target.value)}
            placeholder="240"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Spec Max (μm)</label>
          <input
            type="number"
            value={specMaxMicrons}
            onChange={(e) => setSpecMaxMicrons(e.target.value)}
            placeholder="250"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
          <input
            type="number"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Humidity (%)</label>
          <input
            type="number"
            step="0.1"
            value={humidity}
            onChange={(e) => setHumidity(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {hasValidSpec && (
        <div className="mb-2 text-sm font-medium text-gray-600">
          Spec: {parsedMin}-{parsedMax} μm
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1">
        {READING_ROWS.map((num) => {
          const readingsNum = readings[num];
          const readingValue = readingsNum || "";
          const outOfSpec = readingOutOfSpec(readingValue);
          return (
            <div key={num} className="flex items-center gap-2">
              <span className="w-6 text-right text-sm text-gray-500">{num}</span>
              <input
                type="number"
                value={readingValue}
                onChange={(e) => updateReading(num, e.target.value)}
                placeholder="μm"
                className={`w-full rounded-md border px-3 py-1.5 text-sm ${
                  outOfSpec ? "border-red-500 bg-red-50 text-red-700" : "border-gray-300"
                }`}
              />
            </div>
          );
        })}
      </div>

      <div className="mb-6 flex items-center gap-2 text-sm">
        <span className="font-medium text-gray-700">Average:</span>
        <span
          className={`font-semibold ${
            average !== null && hasValidSpec && (average < parsedMin || average > parsedMax)
              ? "text-red-700"
              : "text-gray-900"
          }`}
        >
          {average != null ? `${average} μm` : "—"}
        </span>
        <span className="text-gray-500">
          ({filledReadings.length} reading
          {filledReadings.length !== 1 ? "s" : ""})
        </span>
        {average !== null && hasValidSpec && (average < parsedMin || average > parsedMax) && (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            Out of spec
          </span>
        )}
      </div>
    </QcFormModal>
  );
}
