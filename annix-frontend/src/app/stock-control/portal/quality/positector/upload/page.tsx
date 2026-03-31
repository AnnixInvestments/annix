"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PositectorBatchDetail, PositectorImportResult } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

const FORMAT_LABELS: Record<string, string> = {
  positector_json: "PosiTector JSON",
  positector_csv: "PosiTector CSV (readings.txt)",
  posisoft_csv: "PosiSoft Desktop CSV Export",
  posisoft_pdf: "PosiSoft Desktop PDF Report",
  pasted_text: "Pasted Text Data",
  unknown: "Unknown",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  dft: "DFT Reading",
  blast_profile: "Blast Profile",
  shore_hardness: "Shore Hardness",
  environmental: "Environmental",
  pull_test: "Pull Test",
  unknown: "Unknown",
};

export default function PositectorUploadPage() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedBatch, setParsedBatch] = useState<
    (PositectorBatchDetail & { detectedFormat: string; filename: string }) | null
  >(null);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importResult, setImportResult] = useState<PositectorImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validExtensions = [".json", ".csv", ".txt", ".pdf"];

  const isValidFile = (file: File): boolean => {
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    return validExtensions.includes(ext);
  };

  const processTextData = useCallback(async (text: string, sourceName: string) => {
    const trimmed = text.trim().replace(/\r/g, "");
    const singleLine = !trimmed.includes("\n");
    const looksLikeBatchName =
      singleLine &&
      trimmed.length < 30 &&
      (/^[A-Za-z]{0,3}\d{1,6}$/.test(trimmed) || /^B\d+/i.test(trimmed));
    if (looksLikeBatchName) {
      setError(
        `Batch "${trimmed}" detected, but PosiSoft Desktop only sends the batch name when dragging from the tree — not the readings.\n\nTo upload this batch:\n1. In PosiSoft Desktop, select batch ${trimmed}\n2. Click File → Export (or right-click → Export)\n3. Save as CSV\n4. Drag or upload the exported CSV file here`,
      );
      return;
    }

    const normalized = text.includes("\t")
      ? text
          .split("\n")
          .map((line) => line.split("\t").join(","))
          .join("\n")
      : text;

    const lines = normalized
      .trim()
      .split("\n")
      .filter((l) => l.trim().length > 0);

    const hasNumericData = lines.some((line) => /\d+[,\t]\s*\d+/.test(line));
    if (lines.length < 1 || (!hasNumericData && lines.length < 2)) {
      setError(
        "Dragged data does not contain readings. Export the batch from PosiSoft Desktop as CSV (File → Export) and upload the file here.",
      );
      return;
    }

    const csvContent =
      hasNumericData && !normalized.includes("reading") && !normalized.includes("thickness")
        ? `reading,thickness,time\n${normalized}`
        : normalized;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const file = new File([blob], `${sourceName}.csv`, { type: "text/csv" });

    try {
      setIsUploading(true);
      setError(null);
      setParsedBatch(null);
      setImportResult(null);
      setSelectedFile(file);

      const result = await stockControlApiClient.uploadPositectorFile(file);
      setParsedBatch(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse pasted data");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const processFile = useCallback(async (file: File) => {
    if (!isValidFile(file)) {
      setError(`Invalid file type. Accepted: ${validExtensions.join(", ")}`);
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setParsedBatch(null);
      setImportResult(null);
      setSelectedFile(file);

      const result = await stockControlApiClient.uploadPositectorFile(file);
      setParsedBatch(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
      return;
    }

    const textData =
      e.dataTransfer.getData("text/plain") ||
      e.dataTransfer.getData("text") ||
      e.dataTransfer.getData("text/csv") ||
      e.dataTransfer.getData("text/tab-separated-values") ||
      e.dataTransfer.getData("text/unicode");

    if (textData && textData.trim().length > 0) {
      processTextData(textData, "posisoft-drag");
      return;
    }

    const htmlData = e.dataTransfer.getData("text/html");
    if (htmlData && htmlData.trim().length > 0) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = htmlData;
      const plainFromHtml = tempDiv.textContent || tempDiv.innerText || "";
      if (plainFromHtml.trim().length > 0) {
        processTextData(plainFromHtml, "posisoft-drag");
        return;
      }
    }

    setError(
      "Could not read data from PosiSoft Desktop drag. Please export the batch as a CSV or JSON file from PosiSoft Desktop (Export menu) and upload it here.",
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = "";
  };

  const handleClear = () => {
    setParsedBatch(null);
    setSelectedFile(null);
    setImportResult(null);
    setShowImportForm(false);
    setError(null);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (parsedBatch || showImportForm) return;

      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        processFile(files[0]);
        return;
      }

      const text = e.clipboardData?.getData("text/plain");
      if (text && text.trim().length > 0) {
        processTextData(text, "clipboard-paste");
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [parsedBatch, showImportForm, processFile, processTextData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">File Upload</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload PosiTector batch files from USB or PosiSoft Desktop exports
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="whitespace-pre-line text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="shrink-0 text-sm text-red-500 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {importResult && (
        <div
          className={`rounded-md p-4 ${importResult.duplicateWarning ? "bg-amber-50" : "bg-green-50"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">
                Imported {importResult.readingsImported} readings as{" "}
                {ENTITY_TYPE_LABELS[importResult.entityType] ?? importResult.entityType}
                {importResult.average !== null && ` (avg: ${importResult.average.toFixed(1)})`}
              </p>
              {importResult.duplicateWarning && (
                <p className="mt-1 text-xs text-amber-700">
                  Warning: Readings for this type and date already exist on this job card
                </p>
              )}
            </div>
            <button
              onClick={() => setImportResult(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {!parsedBatch && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
            isDragOver
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,.txt,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {isUploading ? (
            <p className="text-sm text-gray-500">Parsing file...</p>
          ) : (
            <>
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              <p className="mt-4 text-sm font-medium text-gray-900">
                Drop a PosiTector file here, or click to browse
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Supports: PosiTector JSON batch files, PosiTector CSV (readings.txt), PosiSoft
                Desktop CSV exports, PosiSoft PDF reports
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Accepted formats: .json, .csv, .txt, .pdf
              </p>
              <p className="mt-3 text-xs text-gray-400">
                You can also drag data directly from PosiSoft Desktop or paste from clipboard
                (Ctrl+V)
              </p>
            </>
          )}
        </div>
      )}

      {parsedBatch &&
        (() => {
          const batchHeader = parsedBatch["header"];
          const batchReadings = parsedBatch["readings"];
          const batchFilename = parsedBatch["filename"];
          const batchFormat = parsedBatch["detectedFormat"];
          const batchEntityType = parsedBatch["suggestedEntityType"];
          const headerBatchName = batchHeader["batchName"];
          const headerProbeType = batchHeader["probeType"];
          const headerSerialNumber = batchHeader["serialNumber"];
          const headerUnits = batchHeader["units"];

          return (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {headerBatchName ?? batchFilename}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {FORMAT_LABELS[batchFormat] ?? batchFormat}
                      </span>
                      {headerProbeType && <span>Probe: {headerProbeType}</span>}
                      {headerSerialNumber && <span>S/N: {headerSerialNumber}</span>}
                      <span>Units: {headerUnits ?? "-"}</span>
                      <span>Readings: {batchReadings.length}</span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          batchEntityType !== "unknown"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        Maps to: {ENTITY_TYPE_LABELS[batchEntityType] ?? "Unknown"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {batchReadings.length > 0 && (
                      <button
                        onClick={() => setShowImportForm(true)}
                        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Import to Job Card
                      </button>
                    )}
                    <button
                      onClick={handleClear}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {batchReadings.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                            #
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                            Value
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                            Units
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                            Timestamp
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {batchReadings.map((reading) => (
                          <tr key={reading.index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-500">{reading.index}</td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              {reading.value}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {reading.units ?? headerUnits ?? "-"}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {reading.timestamp ?? "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      {showImportForm && parsedBatch && selectedFile && (
        <UploadImportForm
          file={selectedFile}
          batch={parsedBatch}
          onClose={() => setShowImportForm(false)}
          onImported={(result) => {
            setShowImportForm(false);
            setImportResult(result);
            setParsedBatch(null);
            setSelectedFile(null);
          }}
        />
      )}
    </div>
  );
}

function UploadImportForm({
  file,
  batch,
  onClose,
  onImported,
}: {
  file: File;
  batch: PositectorBatchDetail;
  onClose: () => void;
  onImported: (result: PositectorImportResult) => void;
}) {
  const [jobCardId, setJobCardId] = useState("");
  const [entityType, setEntityType] = useState(batch.suggestedEntityType);
  const [coatType, setCoatType] = useState(batch.suggestedCoatType ?? "primer");
  const [paintProduct, setPaintProduct] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [specMin, setSpecMin] = useState("");
  const [specMax, setSpecMax] = useState("");
  const [specMicrons, setSpecMicrons] = useState("");
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [rubberSpec, setRubberSpec] = useState("");
  const [rubberBatchNumber, setRubberBatchNumber] = useState("");
  const [requiredShore, setRequiredShore] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jobCardId.trim()) {
      setError("Job Card ID is required");
      return;
    }

    try {
      setIsImporting(true);
      setError(null);

      const result = await stockControlApiClient.uploadAndImportPositectorFile(file, {
        jobCardId: parseInt(jobCardId, 10),
        entityType,
        coatType: entityType === "dft" ? coatType : undefined,
        paintProduct: entityType === "dft" ? paintProduct || "Unknown" : undefined,
        batchNumber: entityType === "dft" && batchNumber ? batchNumber : null,
        specMinMicrons: entityType === "dft" ? parseFloat(specMin) || 0 : undefined,
        specMaxMicrons: entityType === "dft" ? parseFloat(specMax) || 0 : undefined,
        specMicrons: entityType === "blast_profile" ? parseFloat(specMicrons) || 0 : undefined,
        temperature: entityType === "blast_profile" && temperature ? parseFloat(temperature) : null,
        humidity: entityType === "blast_profile" && humidity ? parseFloat(humidity) : null,
        rubberSpec: entityType === "shore_hardness" ? rubberSpec || "Unknown" : undefined,
        rubberBatchNumber:
          entityType === "shore_hardness" && rubberBatchNumber ? rubberBatchNumber : null,
        requiredShore:
          entityType === "shore_hardness" ? parseInt(requiredShore, 10) || 0 : undefined,
      });

      onImported(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Import Uploaded File</h2>
        <p className="mb-4 text-sm text-gray-500">
          {batch.readings.length} readings from {batch.header.batchName ?? file.name}
        </p>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleImport} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Job Card ID</label>
              <input
                type="number"
                value={jobCardId}
                onChange={(e) => setJobCardId(e.target.value)}
                placeholder="Enter job card ID"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Measurement Type</label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="dft">DFT Reading</option>
                <option value="blast_profile">Blast Profile</option>
                <option value="shore_hardness">Shore Hardness</option>
              </select>
            </div>
          </div>

          {entityType === "dft" && (
            <div className="space-y-3 rounded-md bg-gray-50 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Coat Type</label>
                  <select
                    value={coatType}
                    onChange={(e) => setCoatType(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    <option value="primer">Primer</option>
                    <option value="final">Final</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Paint Product</label>
                  <input
                    type="text"
                    value={paintProduct}
                    onChange={(e) => setPaintProduct(e.target.value)}
                    placeholder="e.g. Penguard Express"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Batch No</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Spec Min (um)</label>
                  <input
                    type="number"
                    value={specMin}
                    onChange={(e) => setSpecMin(e.target.value)}
                    placeholder="e.g. 240"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Spec Max (um)</label>
                  <input
                    type="number"
                    value={specMax}
                    onChange={(e) => setSpecMax(e.target.value)}
                    placeholder="e.g. 250"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {entityType === "blast_profile" && (
            <div className="space-y-3 rounded-md bg-gray-50 p-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Spec (um)</label>
                  <input
                    type="number"
                    value={specMicrons}
                    onChange={(e) => setSpecMicrons(e.target.value)}
                    placeholder="e.g. 75"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Temp (C)</label>
                  <input
                    type="number"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Humidity (%)</label>
                  <input
                    type="number"
                    value={humidity}
                    onChange={(e) => setHumidity(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {entityType === "shore_hardness" && (
            <div className="space-y-3 rounded-md bg-gray-50 p-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Rubber Spec</label>
                  <input
                    type="text"
                    value={rubberSpec}
                    onChange={(e) => setRubberSpec(e.target.value)}
                    placeholder="e.g. AU 40 SHORE"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Batch No</label>
                  <input
                    type="text"
                    value={rubberBatchNumber}
                    onChange={(e) => setRubberBatchNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Required Shore</label>
                  <input
                    type="number"
                    value={requiredShore}
                    onChange={(e) => setRequiredShore(e.target.value)}
                    placeholder="e.g. 40"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isImporting}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isImporting ? "Importing..." : `Import ${batch.readings.length} Readings`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
