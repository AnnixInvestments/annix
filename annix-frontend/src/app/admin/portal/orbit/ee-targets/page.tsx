"use client";

import Link from "next/link";
import { useState } from "react";
import { FormModal } from "@/app/components/modals/FormModal";
import { useToast } from "@/app/components/Toast";
import type {
  EeTargetMetric,
  EeTargetOccupationalLevel,
  OrbitEeTarget,
} from "@/app/lib/api/adminApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useAdminDeleteOrbitEeTarget,
  useAdminOrbitEeTargets,
  useAdminUpsertOrbitEeTarget,
} from "@/app/lib/query/hooks";

const METRIC_OPTIONS: { value: EeTargetMetric; label: string }[] = [
  { value: "race_african_black", label: "African (Black)" },
  { value: "race_coloured", label: "Coloured" },
  { value: "race_indian", label: "Indian" },
  { value: "female", label: "Female" },
  { value: "disability", label: "Disability" },
];

const LEVEL_OPTIONS: { value: EeTargetOccupationalLevel; label: string }[] = [
  { value: "top_management", label: "Top management" },
  { value: "senior_management", label: "Senior management" },
  { value: "professionally_qualified", label: "Professionally qualified" },
  { value: "skilled", label: "Skilled" },
  { value: "semi_skilled", label: "Semi-skilled" },
  { value: "unskilled", label: "Unskilled" },
  { value: "all_levels", label: "All levels" },
];

function metricLabel(value: EeTargetMetric): string {
  const match = METRIC_OPTIONS.find((option) => option.value === value);
  return match ? match.label : value;
}

function levelLabel(value: EeTargetOccupationalLevel): string {
  const match = LEVEL_OPTIONS.find((option) => option.value === value);
  return match ? match.label : value;
}

export default function OrbitEeTargetsPage() {
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const targetsQuery = useAdminOrbitEeTargets();
  const upsert = useAdminUpsertOrbitEeTarget();
  const remove = useAdminDeleteOrbitEeTarget();

  const targetsData = targetsQuery.data;
  const targets = targetsData || [];
  const isLoading = targetsQuery.isLoading;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sectorCode, setSectorCode] = useState("");
  const [occupationalLevel, setOccupationalLevel] =
    useState<EeTargetOccupationalLevel>("all_levels");
  const [targetYear, setTargetYear] = useState("2025");
  const [targetMetric, setTargetMetric] = useState<EeTargetMetric>("race_african_black");
  const [targetPercent, setTargetPercent] = useState("");
  const [gazetteReference, setGazetteReference] = useState("");

  const openCreate = () => {
    setEditingId(null);
    setSectorCode("");
    setOccupationalLevel("all_levels");
    setTargetYear("2025");
    setTargetMetric("race_african_black");
    setTargetPercent("");
    setGazetteReference("");
    setIsFormOpen(true);
  };

  const openEdit = (target: OrbitEeTarget) => {
    const reference = target.gazetteReference;
    setEditingId(target.id);
    setSectorCode(target.sectorCode);
    setOccupationalLevel(target.occupationalLevel);
    setTargetYear(String(target.targetYear));
    setTargetMetric(target.targetMetric);
    setTargetPercent(target.targetPercent);
    setGazetteReference(reference || "");
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    const trimmedSector = sectorCode.trim();
    const yearNumber = Number(targetYear);
    const percentNumber = Number(targetPercent);
    if (!trimmedSector || Number.isNaN(yearNumber) || Number.isNaN(percentNumber)) {
      showToast("Sector code, year and target % are required.", "error");
      return;
    }
    const reference = gazetteReference.trim();
    try {
      await upsert.mutateAsync({
        id: editingId,
        sectorCode: trimmedSector,
        occupationalLevel,
        targetYear: yearNumber,
        targetMetric,
        targetPercent: percentNumber,
        gazetteReference: reference ? reference : null,
      });
      showToast(editingId ? "Target updated." : "Target added.", "success");
      setIsFormOpen(false);
    } catch {
      showToast("Could not save the target — please try again.", "error");
    }
  };

  const handleDelete = async (target: OrbitEeTarget) => {
    const confirmed = await confirm({
      title: "Delete this target?",
      message: `Remove the ${metricLabel(target.targetMetric)} target for sector "${target.sectorCode}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(target.id);
      showToast("Target deleted.", "success");
    } catch {
      showToast("Could not delete the target — please try again.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/portal/orbit"
            className="text-sm text-violet-600 hover:text-violet-800 inline-flex items-center gap-1 mb-2"
          >
            ← Orbit admin hub
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">EE sectoral targets</h1>
          <p className="text-gray-600 mt-1 text-sm max-w-2xl">
            The B-BBEE sector targets the company Employment Equity report measures against. Capture
            the gazetted percentage per sector, occupational level and metric.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 whitespace-nowrap"
        >
          Add target
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading targets…</div>
        ) : targets.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No sectoral targets yet. Click “Add target” to capture the first one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Sector</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Metric</th>
                <th className="px-4 py-3 font-medium">Year</th>
                <th className="px-4 py-3 font-medium">Target %</th>
                <th className="px-4 py-3 font-medium">Gazette ref</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {targets.map((target) => {
                const level = levelLabel(target.occupationalLevel);
                const metric = metricLabel(target.targetMetric);
                const referenceValue = target.gazetteReference;
                const reference = referenceValue || "—";
                return (
                  <tr key={target.id} className="text-gray-900">
                    <td className="px-4 py-3 font-medium">{target.sectorCode}</td>
                    <td className="px-4 py-3">{level}</td>
                    <td className="px-4 py-3">{metric}</td>
                    <td className="px-4 py-3">{target.targetYear}</td>
                    <td className="px-4 py-3">{target.targetPercent}%</td>
                    <td className="px-4 py-3 text-gray-500">{reference}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(target)}
                        className="text-violet-600 hover:text-violet-800 font-medium mr-4"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(target)}
                        className="text-red-600 hover:text-red-800 font-medium"
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

      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        title={editingId ? "Edit sectoral target" : "Add sectoral target"}
        submitLabel={editingId ? "Save changes" : "Add target"}
        loading={upsert.isPending}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="sectorCode" className="block text-sm font-medium text-gray-700 mb-1">
              Sector code
            </label>
            <input
              id="sectorCode"
              type="text"
              value={sectorCode}
              onChange={(e) => setSectorCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g. manufacturing"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="occupationalLevel"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Occupational level
              </label>
              <select
                id="occupationalLevel"
                value={occupationalLevel}
                onChange={(e) => setOccupationalLevel(e.target.value as EeTargetOccupationalLevel)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="targetMetric"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Metric
              </label>
              <select
                id="targetMetric"
                value={targetMetric}
                onChange={(e) => setTargetMetric(e.target.value as EeTargetMetric)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {METRIC_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="targetYear" className="block text-sm font-medium text-gray-700 mb-1">
                Target year
              </label>
              <input
                id="targetYear"
                type="number"
                min={2025}
                max={2099}
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label
                htmlFor="targetPercent"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Target %
              </label>
              <input
                id="targetPercent"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={targetPercent}
                onChange={(e) => setTargetPercent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g. 60"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="gazetteReference"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Gazette reference <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="gazetteReference"
              type="text"
              value={gazetteReference}
              onChange={(e) => setGazetteReference(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g. GG 12345 of 2025"
            />
          </div>
        </div>
      </FormModal>

      {ConfirmDialog}
    </div>
  );
}
