"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QcEnvironmentalRecordResponse } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { EnvironmentalRecordForm } from "./EnvironmentalRecordForm";

interface EnvironmentalTabProps {
  jobCardId: number;
}

const parseCSV = (
  text: string,
): Array<{
  recordDate: string;
  temperatureC: number;
  humidity: number;
  dewPointC: number | null;
  notes: string | null;
}> => {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const cols = header.split(",").map((c) => c.trim());
  const dateIdx = cols.findIndex((c) => c.includes("date"));
  const tempIdx = cols.findIndex((c) => c.includes("temp"));
  const humIdx = cols.findIndex((c) => c.includes("humid"));
  const dewIdx = cols.findIndex((c) => c.includes("dew"));
  const notesIdx = cols.findIndex((c) => c.includes("note"));

  if (dateIdx < 0 || tempIdx < 0 || humIdx < 0) return [];

  return lines.slice(1).reduce(
    (acc, line) => {
      const parts = line.split(",").map((p) => p.trim());
      const dateVal = parts[dateIdx] || "";
      const tempVal = parseFloat(parts[tempIdx] || "");
      const humVal = parseFloat(parts[humIdx] || "");

      if (!dateVal || Number.isNaN(tempVal) || Number.isNaN(humVal)) return acc;

      const dewVal = dewIdx >= 0 ? parseFloat(parts[dewIdx] || "") : Number.NaN;
      const notesVal = notesIdx >= 0 ? parts[notesIdx] || null : null;

      return [
        ...acc,
        {
          recordDate: dateVal,
          temperatureC: tempVal,
          humidity: humVal,
          dewPointC: Number.isNaN(dewVal) ? null : dewVal,
          notes: notesVal,
        },
      ];
    },
    [] as Array<{
      recordDate: string;
      temperatureC: number;
      humidity: number;
      dewPointC: number | null;
      notes: string | null;
    }>,
  );
};

export function EnvironmentalTab(props: EnvironmentalTabProps) {
  const { jobCardId } = props;
  const [records, setRecords] = useState<QcEnvironmentalRecordResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QcEnvironmentalRecordResponse | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await stockControlApiClient.environmentalRecordsForJobCard(jobCardId);
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load environmental records");
    } finally {
      setIsLoading(false);
    }
  }, [jobCardId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleDelete = async (id: number) => {
    try {
      setError(null);
      await stockControlApiClient.deleteEnvironmentalRecord(jobCardId, id);
      fetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete record");
    }
  };

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
  }, []);

  const handleFormSaved = useCallback(() => {
    handleFormClose();
    fetchRecords();
  }, [handleFormClose, fetchRecords]);

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCsvUploading(true);
      setError(null);
      const text = await file.text();
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        setError(
          "No valid records found in CSV. Expected columns: date, temperature, humidity (optional: dew_point, notes)",
        );
        return;
      }

      await stockControlApiClient.bulkCreateEnvironmentalRecords(jobCardId, parsed);
      fetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload CSV");
    } finally {
      setCsvUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Environmental Records</h3>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
              {csvUploading ? "Uploading..." : "Upload CSV"}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
                disabled={csvUploading}
              />
            </label>
            <button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800"
            >
              + Add Record
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading...</div>
        ) : records.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No environmental records yet. Add records manually or upload a CSV file.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Temp (°C)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Humidity (%)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Dew Point (°C)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Notes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Recorded By
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map((rec) => {
                  const dateStr = formatDateZA(rec.recordDate);
                  const tempStr = String(rec.temperatureC);
                  const humStr = String(rec.humidity);
                  const dewStr = rec.dewPointC != null ? String(rec.dewPointC) : "-";
                  return (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                        {dateStr}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {tempStr}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {humStr}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {dewStr}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {rec.notes || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {rec.recordedByName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setEditing(rec);
                            setFormOpen(true);
                          }}
                          className="text-xs text-teal-600 hover:text-teal-800 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(rec.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EnvironmentalRecordForm
        isOpen={formOpen}
        onClose={handleFormClose}
        jobCardId={jobCardId}
        existing={editing}
        onSaved={handleFormSaved}
      />
    </div>
  );
}
