"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { EnvironmentalRecordWithJobCard } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { UnlinkedUploadsSection } from "@/app/stock-control/components/UnlinkedUploadsSection";

export default function EnvironmentalPage() {
  const [records, setRecords] = useState<EnvironmentalRecordWithJobCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await stockControlApiClient.allEnvironmentalRecords();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load environmental records");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleDelete = async (id: number) => {
    try {
      setError(null);
      await stockControlApiClient.deleteEnvironmentalRecordById(id);
      fetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete record");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Environmental Records</h1>
        <p className="mt-1 text-sm text-gray-600">
          Temperature, humidity, and dew point readings across all job cards
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      <UnlinkedUploadsSection entityType="environmental" entityLabel="environmental" />

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto" />
              <p className="mt-3 text-sm text-gray-500">Loading records...</p>
            </div>
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No environmental records</h3>
            <p className="mt-1 text-sm text-gray-500">
              Records are added from individual job card pages.
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Job Card
                </th>
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
                const tempC = rec.temperatureC;
                const tempStr = String(tempC);
                const humidity = rec.humidity;
                const humStr = String(humidity);
                const dewPoint = rec.dewPointC;
                const dewStr = dewPoint != null ? String(dewPoint) : "-";
                const jcLabel = [rec.jobNumber, rec.jcNumber].filter(Boolean).join(" / ");
                return (
                  <tr key={rec.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link
                        href={`/stock-control/portal/job-cards/${rec.jobCardId}#quality`}
                        className="text-teal-600 hover:text-teal-800 font-medium"
                      >
                        {jcLabel || `JC #${rec.jobCardId}`}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {dateStr}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{tempStr}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{humStr}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{dewStr}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {rec.notes || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {rec.recordedByName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
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
        )}
      </div>
    </div>
  );
}
