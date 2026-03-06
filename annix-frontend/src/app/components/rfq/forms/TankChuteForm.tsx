"use client";

import { useCallback, useMemo } from "react";
import SplitPaneLayout from "@/app/components/rfq/shared/SplitPaneLayout";
import { STEEL_DENSITY_KG_M3 } from "@/app/lib/config/rfq/constants";
import type { PlateBomItem, TankChuteEntry } from "@/app/lib/hooks/useRfqForm";

export interface TankChuteFormProps {
  entry: TankChuteEntry;
  index: number;
  entriesCount: number;
  globalSpecs: any;
  masterData: any;
  onUpdateEntry: (id: string, updates: any) => void;
  onRemoveEntry: (id: string) => void;
  generateItemDescription: (entry: any) => string;
  requiredProducts?: string[];
}

const ASSEMBLY_TYPES = [
  { value: "tank", label: "Tank" },
  { value: "chute", label: "Chute" },
  { value: "hopper", label: "Hopper" },
  { value: "underpan", label: "Underpan" },
  { value: "custom", label: "Custom" },
];

const LINING_TYPES = [
  { value: "rubber", label: "Rubber" },
  { value: "ceramic", label: "Ceramic" },
  { value: "hdpe", label: "HDPE" },
  { value: "pu", label: "Polyurethane (PU)" },
  { value: "glass_flake", label: "Glass Flake" },
];

const SURFACE_PREP_STANDARDS = [
  { value: "Sa 1", label: "Sa 1 - Light Blast" },
  { value: "Sa 2", label: "Sa 2 - Thorough Blast" },
  { value: "Sa 2.5", label: "Sa 2.5 - Near White Metal" },
  { value: "Sa 3", label: "Sa 3 - White Metal" },
];

const COMMON_GRADES = [
  "S355JR",
  "S355J2",
  "Bisalloy 400",
  "Bisalloy 500",
  "Hardox 400",
  "Hardox 500",
  "AR200",
  "AR400",
  "AR450",
  "AR500",
  "3CR12",
  "304",
  "316",
];

const EMPTY_BOM_ROW: PlateBomItem = {
  mark: "",
  description: "",
  thicknessMm: 0,
  lengthMm: 0,
  widthMm: 0,
  quantity: 1,
  weightKg: 0,
  areaM2: 0,
};

function calculatePlateWeight(item: PlateBomItem): number {
  return (
    (item.thicknessMm / 1000) *
    (item.lengthMm / 1000) *
    (item.widthMm / 1000) *
    STEEL_DENSITY_KG_M3 *
    item.quantity
  );
}

function calculatePlateArea(item: PlateBomItem): number {
  return (item.lengthMm / 1000) * (item.widthMm / 1000) * item.quantity;
}

export default function TankChuteForm({
  entry,
  index: _index,
  entriesCount: _entriesCount,
  globalSpecs: _globalSpecs,
  masterData: _masterData,
  onUpdateEntry,
  onRemoveEntry: _onRemoveEntry,
  generateItemDescription,
  requiredProducts: _requiredProducts = [],
}: TankChuteFormProps) {
  const specs = entry.specs ?? {};
  const plateBom = specs.plateBom ?? [];
  const isCalculatedWeight = specs.weightSource === "calculated";

  const bomTotals = useMemo(() => {
    const totalWeightKg = plateBom.reduce(
      (sum: number, item: PlateBomItem) => sum + calculatePlateWeight(item),
      0,
    );
    const totalAreaM2 = plateBom.reduce(
      (sum: number, item: PlateBomItem) => sum + calculatePlateArea(item),
      0,
    );
    return {
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      totalAreaM2: Math.round(totalAreaM2 * 100) / 100,
    };
  }, [plateBom]);

  const effectiveWeight = isCalculatedWeight
    ? bomTotals.totalWeightKg
    : (specs.totalSteelWeightKg ?? 0);

  const updateSpecs = useCallback(
    (updates: Partial<TankChuteEntry["specs"]>) => {
      onUpdateEntry(entry.id, { specs: { ...specs, ...updates } });
    },
    [entry.id, specs, onUpdateEntry],
  );

  const updateBomRow = useCallback(
    (rowIndex: number, field: keyof PlateBomItem, value: string | number) => {
      const updatedBom = plateBom.map((row: PlateBomItem, i: number) => {
        if (i !== rowIndex) return row;
        const updated = { ...row, [field]: value };
        updated.weightKg = Math.round(calculatePlateWeight(updated) * 100) / 100;
        updated.areaM2 = Math.round(calculatePlateArea(updated) * 100) / 100;
        return updated;
      });
      const totalWeightKg = updatedBom.reduce(
        (sum: number, item: PlateBomItem) => sum + item.weightKg,
        0,
      );
      const totalAreaM2 = updatedBom.reduce(
        (sum: number, item: PlateBomItem) => sum + item.areaM2,
        0,
      );
      updateSpecs({
        plateBom: updatedBom,
        bomTotalWeightKg: Math.round(totalWeightKg * 100) / 100,
        bomTotalAreaM2: Math.round(totalAreaM2 * 100) / 100,
        ...(isCalculatedWeight
          ? { totalSteelWeightKg: Math.round(totalWeightKg * 100) / 100 }
          : {}),
      });
    },
    [plateBom, isCalculatedWeight, updateSpecs],
  );

  const addBomRow = useCallback(() => {
    const newBom = [...plateBom, { ...EMPTY_BOM_ROW, mark: `P${plateBom.length + 1}` }];
    updateSpecs({ plateBom: newBom });
  }, [plateBom, updateSpecs]);

  const removeBomRow = useCallback(
    (rowIndex: number) => {
      const updatedBom = plateBom.filter((_: PlateBomItem, i: number) => i !== rowIndex);
      const totalWeightKg = updatedBom.reduce(
        (sum: number, item: PlateBomItem) => sum + calculatePlateWeight(item),
        0,
      );
      const totalAreaM2 = updatedBom.reduce(
        (sum: number, item: PlateBomItem) => sum + calculatePlateArea(item),
        0,
      );
      updateSpecs({
        plateBom: updatedBom,
        bomTotalWeightKg: Math.round(totalWeightKg * 100) / 100,
        bomTotalAreaM2: Math.round(totalAreaM2 * 100) / 100,
        ...(isCalculatedWeight
          ? { totalSteelWeightKg: Math.round(totalWeightKg * 100) / 100 }
          : {}),
      });
    },
    [plateBom, isCalculatedWeight, updateSpecs],
  );

  const inputClass =
    "w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100";
  const labelClass = "block text-xs font-semibold text-gray-900 mb-1 dark:text-gray-100";
  const sectionHeaderClass =
    "text-sm font-bold text-amber-900 border-b border-amber-400 pb-1.5 mb-3 dark:text-amber-100 dark:border-amber-600";
  const sectionClass =
    "bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 dark:bg-amber-900/20 dark:border-amber-700";

  return (
    <>
      <SplitPaneLayout
        entryId={entry.id}
        itemType="tank_chute"
        showSplitToggle={true}
        formContent={
          <>
            <div>
              <label className={labelClass}>Item Description *</label>
              <textarea
                value={entry.description || generateItemDescription(entry)}
                onChange={(e) => onUpdateEntry(entry.id, { description: e.target.value })}
                className={inputClass}
                rows={2}
                placeholder="e.g., Screen 2 Underpan GPW-017 - S355JR"
                required
              />
            </div>

            {/* Assembly Type & Identity */}
            <div className={sectionClass}>
              <h4 className={sectionHeaderClass}>Assembly Type & Identity</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Assembly Type *</label>
                  <select
                    value={specs.assemblyType || ""}
                    onChange={(e) => updateSpecs({ assemblyType: e.target.value as any })}
                    className={inputClass}
                  >
                    <option value="">Select type...</option>
                    {ASSEMBLY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Drawing Reference</label>
                  <input
                    type="text"
                    value={specs.drawingReference || ""}
                    onChange={(e) => updateSpecs({ drawingReference: e.target.value })}
                    className={inputClass}
                    placeholder="e.g., GPW-017"
                  />
                </div>
                <div>
                  <label className={labelClass}>Material Grade</label>
                  <select
                    value={specs.materialGrade || ""}
                    onChange={(e) => updateSpecs({ materialGrade: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select grade...</option>
                    {COMMON_GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Quantity</label>
                  <input
                    type="number"
                    value={specs.quantityValue ?? 1}
                    onChange={(e) => updateSpecs({ quantityValue: Number(e.target.value) })}
                    className={inputClass}
                    min={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <label className={labelClass}>Length (mm)</label>
                  <input
                    type="number"
                    value={specs.overallLengthMm ?? ""}
                    onChange={(e) =>
                      updateSpecs({
                        overallLengthMm: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className={inputClass}
                    placeholder="e.g., 7238"
                  />
                </div>
                <div>
                  <label className={labelClass}>Width (mm)</label>
                  <input
                    type="number"
                    value={specs.overallWidthMm ?? ""}
                    onChange={(e) =>
                      updateSpecs({
                        overallWidthMm: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className={inputClass}
                    placeholder="e.g., 5241"
                  />
                </div>
                <div>
                  <label className={labelClass}>Height (mm)</label>
                  <input
                    type="number"
                    value={specs.overallHeightMm ?? ""}
                    onChange={(e) =>
                      updateSpecs({
                        overallHeightMm: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className={inputClass}
                    placeholder="e.g., 2852"
                  />
                </div>
              </div>
            </div>

            {/* Steel Weight */}
            <div className={sectionClass}>
              <h4 className={sectionHeaderClass}>Steel Weight</h4>
              <div className="flex items-center gap-4 mb-3">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name={`weight-source-${entry.id}`}
                    checked={!isCalculatedWeight}
                    onChange={() => updateSpecs({ weightSource: "manual" })}
                    className="text-amber-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Enter weight manually</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name={`weight-source-${entry.id}`}
                    checked={isCalculatedWeight}
                    onChange={() =>
                      updateSpecs({
                        weightSource: "calculated",
                        totalSteelWeightKg: bomTotals.totalWeightKg,
                      })
                    }
                    className="text-amber-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Calculate from plate BOM</span>
                </label>
              </div>

              {!isCalculatedWeight ? (
                <div className="w-48">
                  <label className={labelClass}>Total Steel Weight (kg)</label>
                  <input
                    type="number"
                    value={specs.totalSteelWeightKg ?? ""}
                    onChange={(e) =>
                      updateSpecs({
                        totalSteelWeightKg: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className={inputClass}
                    placeholder="e.g., 2500"
                    step="0.01"
                  />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-amber-100 dark:bg-amber-900/40">
                          <th className="px-2 py-1 text-left border border-amber-300 dark:border-amber-700">
                            Mark
                          </th>
                          <th className="px-2 py-1 text-left border border-amber-300 dark:border-amber-700">
                            Description
                          </th>
                          <th className="px-2 py-1 text-right border border-amber-300 dark:border-amber-700">
                            Thick (mm)
                          </th>
                          <th className="px-2 py-1 text-right border border-amber-300 dark:border-amber-700">
                            L (mm)
                          </th>
                          <th className="px-2 py-1 text-right border border-amber-300 dark:border-amber-700">
                            W (mm)
                          </th>
                          <th className="px-2 py-1 text-right border border-amber-300 dark:border-amber-700">
                            Qty
                          </th>
                          <th className="px-2 py-1 text-right border border-amber-300 dark:border-amber-700">
                            Weight (kg)
                          </th>
                          <th className="px-2 py-1 text-right border border-amber-300 dark:border-amber-700">
                            Area (m2)
                          </th>
                          <th className="px-2 py-1 border border-amber-300 dark:border-amber-700" />
                        </tr>
                      </thead>
                      <tbody>
                        {plateBom.map((row: PlateBomItem, i: number) => (
                          <tr key={i} className="hover:bg-amber-50/50 dark:hover:bg-amber-900/10">
                            <td className="border border-amber-200 dark:border-amber-700 p-0.5">
                              <input
                                type="text"
                                value={row.mark}
                                onChange={(e) => updateBomRow(i, "mark", e.target.value)}
                                className="w-full px-1 py-0.5 text-xs border-0 bg-transparent focus:ring-0 text-gray-900 dark:text-gray-100"
                                placeholder="P1"
                              />
                            </td>
                            <td className="border border-amber-200 dark:border-amber-700 p-0.5">
                              <input
                                type="text"
                                value={row.description}
                                onChange={(e) => updateBomRow(i, "description", e.target.value)}
                                className="w-full px-1 py-0.5 text-xs border-0 bg-transparent focus:ring-0 text-gray-900 dark:text-gray-100"
                                placeholder="Side plate"
                              />
                            </td>
                            <td className="border border-amber-200 dark:border-amber-700 p-0.5">
                              <input
                                type="number"
                                value={row.thicknessMm || ""}
                                onChange={(e) =>
                                  updateBomRow(i, "thicknessMm", Number(e.target.value))
                                }
                                className="w-full px-1 py-0.5 text-xs border-0 bg-transparent focus:ring-0 text-right text-gray-900 dark:text-gray-100"
                                step="0.1"
                              />
                            </td>
                            <td className="border border-amber-200 dark:border-amber-700 p-0.5">
                              <input
                                type="number"
                                value={row.lengthMm || ""}
                                onChange={(e) =>
                                  updateBomRow(i, "lengthMm", Number(e.target.value))
                                }
                                className="w-full px-1 py-0.5 text-xs border-0 bg-transparent focus:ring-0 text-right text-gray-900 dark:text-gray-100"
                              />
                            </td>
                            <td className="border border-amber-200 dark:border-amber-700 p-0.5">
                              <input
                                type="number"
                                value={row.widthMm || ""}
                                onChange={(e) => updateBomRow(i, "widthMm", Number(e.target.value))}
                                className="w-full px-1 py-0.5 text-xs border-0 bg-transparent focus:ring-0 text-right text-gray-900 dark:text-gray-100"
                              />
                            </td>
                            <td className="border border-amber-200 dark:border-amber-700 p-0.5">
                              <input
                                type="number"
                                value={row.quantity || ""}
                                onChange={(e) =>
                                  updateBomRow(i, "quantity", Number(e.target.value))
                                }
                                className="w-full px-1 py-0.5 text-xs border-0 bg-transparent focus:ring-0 text-right text-gray-900 dark:text-gray-100"
                                min={1}
                              />
                            </td>
                            <td className="border border-amber-200 dark:border-amber-700 px-2 py-0.5 text-right font-mono text-gray-600 dark:text-gray-400">
                              {row.weightKg.toFixed(2)}
                            </td>
                            <td className="border border-amber-200 dark:border-amber-700 px-2 py-0.5 text-right font-mono text-gray-600 dark:text-gray-400">
                              {row.areaM2.toFixed(2)}
                            </td>
                            <td className="border border-amber-200 dark:border-amber-700 p-0.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeBomRow(i)}
                                className="text-red-500 hover:text-red-700 text-xs px-1"
                                title="Remove row"
                              >
                                x
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {plateBom.length > 0 && (
                        <tfoot>
                          <tr className="bg-amber-100 dark:bg-amber-900/40 font-semibold">
                            <td
                              colSpan={6}
                              className="border border-amber-300 dark:border-amber-700 px-2 py-1 text-right"
                            >
                              Totals:
                            </td>
                            <td className="border border-amber-300 dark:border-amber-700 px-2 py-1 text-right font-mono">
                              {bomTotals.totalWeightKg.toFixed(2)}
                            </td>
                            <td className="border border-amber-300 dark:border-amber-700 px-2 py-1 text-right font-mono">
                              {bomTotals.totalAreaM2.toFixed(2)}
                            </td>
                            <td className="border border-amber-300 dark:border-amber-700" />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={addBomRow}
                    className="mt-2 px-3 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
                  >
                    + Add Plate Row
                  </button>
                </>
              )}
            </div>

            {/* Internal Lining */}
            <div className={sectionClass}>
              <h4 className={sectionHeaderClass}>Internal Lining</h4>
              <label className="flex items-center gap-2 text-xs mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={specs.liningRequired || false}
                  onChange={(e) =>
                    updateSpecs({
                      liningRequired: e.target.checked,
                      ...(!e.target.checked
                        ? {
                            liningType: undefined,
                            liningThicknessMm: undefined,
                            liningAreaM2: undefined,
                            liningWastagePercent: undefined,
                            rubberGrade: undefined,
                            rubberHardnessShore: undefined,
                          }
                        : {}),
                    })
                  }
                  className="rounded text-amber-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Internal lining required</span>
              </label>

              {specs.liningRequired && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Lining Type *</label>
                    <select
                      value={specs.liningType || ""}
                      onChange={(e) => updateSpecs({ liningType: e.target.value as any })}
                      className={inputClass}
                    >
                      <option value="">Select type...</option>
                      {LINING_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Thickness (mm)</label>
                    <input
                      type="number"
                      value={specs.liningThicknessMm ?? ""}
                      onChange={(e) =>
                        updateSpecs({
                          liningThicknessMm: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className={inputClass}
                      placeholder="e.g., 6"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Lining Area (m2)</label>
                    <input
                      type="number"
                      value={specs.liningAreaM2 ?? ""}
                      onChange={(e) =>
                        updateSpecs({
                          liningAreaM2: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className={inputClass}
                      placeholder="e.g., 75.00"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Wastage (%)</label>
                    <input
                      type="number"
                      value={specs.liningWastagePercent ?? ""}
                      onChange={(e) =>
                        updateSpecs({
                          liningWastagePercent: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className={inputClass}
                      placeholder="e.g., 5"
                      step="0.5"
                    />
                  </div>

                  {specs.liningType === "rubber" && (
                    <>
                      <div>
                        <label className={labelClass}>Rubber Grade</label>
                        <input
                          type="text"
                          value={specs.rubberGrade || ""}
                          onChange={(e) => updateSpecs({ rubberGrade: e.target.value })}
                          className={inputClass}
                          placeholder="e.g., Natural Rubber"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Hardness (Shore A)</label>
                        <input
                          type="number"
                          value={specs.rubberHardnessShore ?? ""}
                          onChange={(e) =>
                            updateSpecs({
                              rubberHardnessShore: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                          className={inputClass}
                          placeholder="e.g., 40"
                          min={20}
                          max={90}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* External Coating */}
            <div className={sectionClass}>
              <h4 className={sectionHeaderClass}>External Coating</h4>
              <label className="flex items-center gap-2 text-xs mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={specs.coatingRequired || false}
                  onChange={(e) =>
                    updateSpecs({
                      coatingRequired: e.target.checked,
                      ...(!e.target.checked
                        ? {
                            coatingSystem: undefined,
                            coatingAreaM2: undefined,
                            coatingWastagePercent: undefined,
                            surfacePrepStandard: undefined,
                          }
                        : {}),
                    })
                  }
                  className="rounded text-amber-600"
                />
                <span className="text-gray-700 dark:text-gray-300">External coating required</span>
              </label>

              {specs.coatingRequired && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className={labelClass}>Coating System Description</label>
                    <textarea
                      value={specs.coatingSystem || ""}
                      onChange={(e) => updateSpecs({ coatingSystem: e.target.value })}
                      className={inputClass}
                      rows={2}
                      placeholder="e.g., Epoxy primer + MIO intermediate + polyurethane topcoat"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Coating Area (m2)</label>
                    <input
                      type="number"
                      value={specs.coatingAreaM2 ?? ""}
                      onChange={(e) =>
                        updateSpecs({
                          coatingAreaM2: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className={inputClass}
                      placeholder="e.g., 50.00"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Surface Prep Standard</label>
                    <select
                      value={specs.surfacePrepStandard || ""}
                      onChange={(e) => updateSpecs({ surfacePrepStandard: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Select standard...</option>
                      {SURFACE_PREP_STANDARDS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Wastage (%)</label>
                    <input
                      type="number"
                      value={specs.coatingWastagePercent ?? ""}
                      onChange={(e) =>
                        updateSpecs({
                          coatingWastagePercent: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className={inputClass}
                      placeholder="e.g., 5"
                      step="0.5"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                value={entry.notes || ""}
                onChange={(e) => onUpdateEntry(entry.id, { notes: e.target.value })}
                className={inputClass}
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
          </>
        }
        previewContent={
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 dark:bg-amber-900/20 dark:border-amber-700">
              <h5 className="text-sm font-bold text-amber-900 mb-3 dark:text-amber-100">
                Assembly Summary
              </h5>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-amber-800 dark:text-amber-200">Type:</div>
                <div className="font-semibold text-amber-900 dark:text-amber-100">
                  {ASSEMBLY_TYPES.find((t) => t.value === specs.assemblyType)?.label || "-"}
                </div>
                {specs.drawingReference && (
                  <>
                    <div className="text-amber-800 dark:text-amber-200">Drawing:</div>
                    <div className="font-semibold text-amber-900 dark:text-amber-100">
                      {specs.drawingReference}
                    </div>
                  </>
                )}
                {specs.materialGrade && (
                  <>
                    <div className="text-amber-800 dark:text-amber-200">Grade:</div>
                    <div className="font-semibold text-amber-900 dark:text-amber-100">
                      {specs.materialGrade}
                    </div>
                  </>
                )}
                <div className="text-amber-800 dark:text-amber-200">Quantity:</div>
                <div className="font-semibold text-amber-900 dark:text-amber-100">
                  {specs.quantityValue ?? 1}
                </div>
                {(specs.overallLengthMm || specs.overallWidthMm || specs.overallHeightMm) && (
                  <>
                    <div className="text-amber-800 dark:text-amber-200">Dimensions:</div>
                    <div className="font-semibold text-amber-900 dark:text-amber-100">
                      {[specs.overallLengthMm, specs.overallWidthMm, specs.overallHeightMm]
                        .filter(Boolean)
                        .join(" x ")}{" "}
                      mm
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-700">
              <h5 className="text-sm font-bold text-blue-900 mb-3 dark:text-blue-100">
                Weight & Areas
              </h5>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-blue-800 dark:text-blue-200">Steel Weight:</div>
                <div className="font-semibold text-blue-900 dark:text-blue-100">
                  {effectiveWeight ? `${effectiveWeight.toFixed(2)} kg` : "-"}
                </div>
                <div className="text-blue-800 dark:text-blue-200">Weight Source:</div>
                <div className="font-semibold text-blue-900 dark:text-blue-100">
                  {isCalculatedWeight ? "BOM Calculated" : "Manual"}
                </div>
                {isCalculatedWeight && plateBom.length > 0 && (
                  <>
                    <div className="text-blue-800 dark:text-blue-200">BOM Parts:</div>
                    <div className="font-semibold text-blue-900 dark:text-blue-100">
                      {plateBom.length}
                    </div>
                    <div className="text-blue-800 dark:text-blue-200">BOM Area:</div>
                    <div className="font-semibold text-blue-900 dark:text-blue-100">
                      {bomTotals.totalAreaM2.toFixed(2)} m2
                    </div>
                  </>
                )}
              </div>
            </div>

            {specs.liningRequired && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-900/20 dark:border-green-700">
                <h5 className="text-sm font-bold text-green-900 mb-3 dark:text-green-100">
                  Internal Lining
                </h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-green-800 dark:text-green-200">Type:</div>
                  <div className="font-semibold text-green-900 dark:text-green-100">
                    {LINING_TYPES.find((t) => t.value === specs.liningType)?.label || "-"}
                  </div>
                  {specs.liningThicknessMm && (
                    <>
                      <div className="text-green-800 dark:text-green-200">Thickness:</div>
                      <div className="font-semibold text-green-900 dark:text-green-100">
                        {specs.liningThicknessMm} mm
                      </div>
                    </>
                  )}
                  {specs.liningAreaM2 && (
                    <>
                      <div className="text-green-800 dark:text-green-200">Area:</div>
                      <div className="font-semibold text-green-900 dark:text-green-100">
                        {specs.liningAreaM2} m2
                        {specs.liningWastagePercent
                          ? ` (+${specs.liningWastagePercent}% = ${(specs.liningAreaM2 * (1 + specs.liningWastagePercent / 100)).toFixed(2)} m2)`
                          : ""}
                      </div>
                    </>
                  )}
                  {specs.liningType === "rubber" && specs.rubberGrade && (
                    <>
                      <div className="text-green-800 dark:text-green-200">Rubber:</div>
                      <div className="font-semibold text-green-900 dark:text-green-100">
                        {specs.rubberGrade}
                        {specs.rubberHardnessShore ? ` (${specs.rubberHardnessShore} Shore A)` : ""}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {specs.coatingRequired && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 dark:bg-purple-900/20 dark:border-purple-700">
                <h5 className="text-sm font-bold text-purple-900 mb-3 dark:text-purple-100">
                  External Coating
                </h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {specs.coatingAreaM2 && (
                    <>
                      <div className="text-purple-800 dark:text-purple-200">Area:</div>
                      <div className="font-semibold text-purple-900 dark:text-purple-100">
                        {specs.coatingAreaM2} m2
                        {specs.coatingWastagePercent
                          ? ` (+${specs.coatingWastagePercent}% = ${(specs.coatingAreaM2 * (1 + specs.coatingWastagePercent / 100)).toFixed(2)} m2)`
                          : ""}
                      </div>
                    </>
                  )}
                  {specs.surfacePrepStandard && (
                    <>
                      <div className="text-purple-800 dark:text-purple-200">Surface Prep:</div>
                      <div className="font-semibold text-purple-900 dark:text-purple-100">
                        {specs.surfacePrepStandard}
                      </div>
                    </>
                  )}
                  {specs.coatingSystem && (
                    <>
                      <div className="text-purple-800 dark:text-purple-200">System:</div>
                      <div className="font-semibold text-purple-900 dark:text-purple-100 text-xs">
                        {specs.coatingSystem}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        }
      />
    </>
  );
}
