"use client";

import { useState } from "react";
import { useAdminMutations, useRubberCompounds } from "../hooks/useAdminQueries";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";
import type { CreateRubberCompoundInput, RubberCompoundDto } from "../types/admin";

const FAMILY_OPTIONS = [
  "NR",
  "SBR",
  "NBR",
  "EPDM",
  "CR",
  "FKM",
  "IIR",
  "BR",
  "CSM",
  "PU",
  "other",
] as const;

export function AdminRubberCompoundsPage() {
  const config = useStockManagementConfig();
  const { data, isLoading, refetch } = useRubberCompounds(true);
  const mutations = useAdminMutations();
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState<CreateRubberCompoundInput>({
    code: "",
    name: "",
    compoundFamily: "SBR",
    shoreHardness: 70,
    densityKgPerM3: 940,
  });

  const handleCreate = async () => {
    if (!draft.code.trim() || !draft.name.trim()) return;
    try {
      await mutations.createRubberCompound(draft);
      setShowCreate(false);
      setDraft({
        code: "",
        name: "",
        compoundFamily: "SBR",
        shoreHardness: 70,
        densityKgPerM3: 940,
      });
      await refetch();
    } catch (err) {
      console.error("Create failed", err);
    }
  };

  const handleSeed = async () => {
    try {
      await mutations.seedRubberCompounds();
      await refetch();
    } catch (err) {
      console.error("Seed failed", err);
    }
  };

  const handleToggleActive = async (compound: RubberCompoundDto) => {
    try {
      await mutations.updateRubberCompound(compound.id, { active: !compound.active });
      await refetch();
    } catch (err) {
      console.error("Toggle failed", err);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-500">{config.label("common.loading")}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {config.label("admin.rubberCompounds")}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage rubber compound catalog with density and shore hardness from supplier datasheets
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSeed}
            disabled={mutations.isPending}
            className="px-4 py-2 bg-white border border-gray-300 rounded text-sm"
          >
            Seed Standard Compounds
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium"
          >
            + New Compound
          </button>
        </div>
      </header>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Family
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Shore
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Density kg/m³
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Datasheet
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Active
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(data ?? []).map((compound) => {
              const status = compound.datasheetStatus;
              const statusClass =
                status === "verified"
                  ? "bg-green-100 text-green-800"
                  : status === "extracted" || status === "uploaded"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800";
              return (
                <tr key={compound.id} className={compound.active ? "" : "opacity-50"}>
                  <td className="px-4 py-3 font-mono text-xs">{compound.code}</td>
                  <td className="px-4 py-3 text-sm">{compound.name}</td>
                  <td className="px-4 py-3 text-xs">{compound.compoundFamily}</td>
                  <td className="px-4 py-3 text-xs">
                    {(() => {
                      const rawShoreHardness = compound.shoreHardness;
                      return rawShoreHardness ?? "—";
                    })()}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {(() => {
                      const rawDensityKgPerM3 = compound.densityKgPerM3;
                      return rawDensityKgPerM3 ?? "—";
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${statusClass}`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{compound.active ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(compound)}
                      disabled={mutations.isPending}
                      className="text-sm text-teal-700 hover:underline"
                    >
                      {compound.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">New Rubber Compound</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700">Code</label>
                <input
                  value={draft.code}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700">Name</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Family</label>
                <select
                  value={(() => {
                    const rawCompoundFamily = draft.compoundFamily;
                    return rawCompoundFamily ?? "SBR";
                  })()}
                  onChange={(e) => setDraft({ ...draft, compoundFamily: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {FAMILY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Shore Hardness</label>
                <input
                  type="number"
                  value={(() => {
                    const rawShoreHardness = draft.shoreHardness;
                    return rawShoreHardness ?? "";
                  })()}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      shoreHardness: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700">Density (kg/m³)</label>
                <input
                  type="number"
                  value={(() => {
                    const rawDensityKgPerM3 = draft.densityKgPerM3;
                    return rawDensityKgPerM3 ?? "";
                  })()}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      densityKgPerM3: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded"
              >
                {config.label("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={mutations.isPending}
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded font-medium"
              >
                {config.label("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminRubberCompoundsPage;
