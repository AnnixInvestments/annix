"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { QcBatchAssignment } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface CpoBatchAssignmentSectionProps {
  cpoId: number;
}

interface GroupedBatch {
  jobCardId: number;
  fieldKey: string;
  label: string;
  batchNumber: string;
  itemCount: number;
  notApplicable: boolean;
}

const FIELD_KEY_ORDER: Record<string, number> = {
  paint_blast_profile: 1,
  paint_dft_primer: 2,
  paint_dft_intermediate: 3,
  paint_dft_final: 4,
  rubber_blast_profile: 5,
  rubber_shore_hardness: 6,
};

function fieldKeySort(a: string, b: string): number {
  const orderA = FIELD_KEY_ORDER[a] || 99;
  const orderB = FIELD_KEY_ORDER[b] || 99;
  return orderA - orderB;
}

export function CpoBatchAssignmentSection(props: CpoBatchAssignmentSectionProps) {
  const cpoId = props.cpoId;

  const [assignments, setAssignments] = useState<QcBatchAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await stockControlApiClient.batchAssignmentsForCpo(cpoId);
      setAssignments(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load batch assignments";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [cpoId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const grouped = useMemo(() => {
    const map = new Map<string, GroupedBatch>();

    assignments.forEach((a) => {
      const key = `${a.jobCardId}-${a.fieldKey}-${a.batchNumber}`;
      const existing = map.get(key);
      if (existing) {
        map.set(key, { ...existing, itemCount: existing.itemCount + 1 });
      } else {
        map.set(key, {
          jobCardId: a.jobCardId,
          fieldKey: a.fieldKey,
          label: a.label,
          batchNumber: a.batchNumber,
          itemCount: 1,
          notApplicable: a.notApplicable,
        });
      }
    });

    const result = [...map.values()];
    result.sort((a, b) => {
      if (a.jobCardId !== b.jobCardId) return a.jobCardId - b.jobCardId;
      const fieldSort = fieldKeySort(a.fieldKey, b.fieldKey);
      if (fieldSort !== 0) return fieldSort;
      return a.batchNumber.localeCompare(b.batchNumber);
    });

    return result;
  }, [assignments]);

  const jobCardIds = useMemo(() => {
    const ids = [...new Set(grouped.map((g) => g.jobCardId))];
    ids.sort((a, b) => a - b);
    return ids;
  }, [grouped]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Batch Assignments</h3>
        <div className="flex items-center justify-center py-8 text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Batch Assignments</h3>
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (grouped.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Batch Assignments</h3>
        <p className="text-sm text-gray-500">
          No batch assignments found. Batches are assigned on each job card's quality tab.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Batch Assignments</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left font-medium text-gray-600">JC</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Measurement Type</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Batch #</th>
              <th className="px-4 py-2 text-center font-medium text-gray-600">Items</th>
              <th className="px-4 py-2 text-center font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobCardIds.map((jcId) => {
              const jcRows = grouped.filter((g) => g.jobCardId === jcId);
              return jcRows.map((row, idx) => {
                const rowKey = `${row.jobCardId}-${row.fieldKey}-${row.batchNumber}`;
                const naClass = row.notApplicable ? "text-gray-400 italic" : "";
                const statusLabel = row.notApplicable ? "N/A" : "Assigned";
                const statusColor = row.notApplicable
                  ? "bg-gray-100 text-gray-500"
                  : "bg-green-100 text-green-700";
                return (
                  <tr key={rowKey} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">{idx === 0 ? `JC-${jcId}` : ""}</td>
                    <td className={`px-4 py-2 ${naClass}`}>{row.label}</td>
                    <td className={`px-4 py-2 font-mono ${naClass}`}>{row.batchNumber}</td>
                    <td className="px-4 py-2 text-center text-gray-600">{row.itemCount}</td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
