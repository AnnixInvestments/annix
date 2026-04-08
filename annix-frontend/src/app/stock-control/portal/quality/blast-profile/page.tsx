"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { BlastProfileWithJobCard } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { UnlinkedUploadsSection } from "@/app/stock-control/components/UnlinkedUploadsSection";

export default function BlastProfilePage() {
  const [records, setRecords] = useState<BlastProfileWithJobCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await stockControlApiClient.allBlastProfiles();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load blast profiles");
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
      await stockControlApiClient.deleteBlastProfileById(id);
      fetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete record");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Blast Profile Readings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Surface blast profile measurements across all job cards
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

      <UnlinkedUploadsSection entityType="blast_profile" entityLabel="blast profile" />

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
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No blast profile readings</h3>
            <p className="mt-1 text-sm text-gray-500">
              Readings are added from individual job card pages or PosiTector uploads.
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
                  Spec (um)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Avg (um)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Temp (C)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Humidity (%)
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">
                  Readings
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Captured By
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map((rec) => {
                const jcLabel = [rec.jobNumber, rec.jcNumber].filter(Boolean).join(" / ");
                const avg = rec.averageMicrons;
                const avgStr = avg != null ? Number(avg).toFixed(1) : "-";
                const temp = rec.temperature;
                const tempStr = temp != null ? String(temp) : "-";
                const hum = rec.humidity;
                const humStr = hum != null ? String(hum) : "-";
                const readings = rec.readings;
                const readingCount = Array.isArray(readings) ? readings.length : 0;
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
                      {formatDateZA(rec.readingDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {rec.specMicrons}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{avgStr}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{tempStr}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{humStr}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 text-center">
                      {readingCount}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {rec.capturedByName}
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
