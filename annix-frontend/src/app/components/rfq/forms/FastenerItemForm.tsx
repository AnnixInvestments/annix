"use client";

import { useCallback, useEffect, useState } from "react";
import type { FastenerEntry } from "@/app/lib/hooks/useRfqForm";
import { API_BASE_URL } from "@/lib/api-config";

export interface FastenerItemFormProps {
  entry: FastenerEntry;
  index: number;
  entriesCount: number;
  onUpdateEntry: (id: string, updates: Partial<FastenerEntry>) => void;
  onRemoveEntry: (id: string) => void;
}

interface FastenerTypeGroup {
  category: string;
  types: Array<{ type: string; count: number }>;
}

interface SizeOption {
  size: string;
}

interface GradeOption {
  grade: string | null;
  material: string | null;
}

const CATEGORY_OPTIONS = [
  { value: "bolt", label: "Bolt" },
  { value: "nut", label: "Nut" },
  { value: "washer", label: "Washer" },
  { value: "gasket", label: "Gasket" },
  { value: "set_screw", label: "Set Screw" },
  { value: "machine_screw", label: "Machine Screw" },
  { value: "insert", label: "Threaded Insert" },
];

const FINISH_OPTIONS = [
  { value: "plain", label: "Plain" },
  { value: "zinc", label: "Zinc Plated" },
  { value: "HDG", label: "Hot-Dip Galvanized" },
  { value: "black oxide", label: "Black Oxide" },
  { value: "cadmium", label: "Cadmium" },
  { value: "phosphate", label: "Phosphate" },
];

const THREAD_TYPE_OPTIONS = [
  { value: "coarse", label: "Coarse" },
  { value: "fine", label: "Fine" },
];

export function FastenerItemForm(props: FastenerItemFormProps) {
  const entry = props.entry;
  const specs = entry.specs;

  const [typeGroups, setTypeGroups] = useState<FastenerTypeGroup[]>([]);
  const [sizes, setSizes] = useState<SizeOption[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/bolt/fasteners/types`)
      .then((res) => res.json())
      .then(setTypeGroups)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (specs.fastenerCategory && specs.specificType) {
      const categoryMap: Record<string, string> = {
        bolt: "bolt",
        set_screw: "bolt",
        machine_screw: "bolt",
        nut: "nut",
        washer: "washer",
        insert: "insert",
        gasket: "washer",
      };
      const cat = categoryMap[specs.fastenerCategory] || specs.fastenerCategory;
      fetch(`${API_BASE_URL}/bolt/fasteners/sizes?category=${cat}&type=${specs.specificType}`)
        .then((res) => res.json())
        .then(setSizes)
        .catch(() => {});
    }
  }, [specs.fastenerCategory, specs.specificType]);

  useEffect(() => {
    if (specs.fastenerCategory && specs.specificType && specs.size) {
      const categoryMap: Record<string, string> = {
        bolt: "bolt",
        set_screw: "bolt",
        machine_screw: "bolt",
        nut: "nut",
        washer: "washer",
        insert: "insert",
        gasket: "washer",
      };
      const cat = categoryMap[specs.fastenerCategory] || specs.fastenerCategory;
      fetch(
        `${API_BASE_URL}/bolt/fasteners/grades?category=${cat}&type=${specs.specificType}&size=${specs.size}`,
      )
        .then((res) => res.json())
        .then(setGrades)
        .catch(() => {});
    }
  }, [specs.fastenerCategory, specs.specificType, specs.size]);

  const updateSpecs = useCallback(
    (updates: Partial<FastenerEntry["specs"]>) => {
      props.onUpdateEntry(entry.id, {
        specs: { ...specs, ...updates },
      } as Partial<FastenerEntry>);
    },
    [entry.id, specs, props.onUpdateEntry],
  );

  const typesForCategory = (() => {
    const categoryMap: Record<string, string> = {
      bolt: "bolt",
      set_screw: "bolt",
      machine_screw: "bolt",
      nut: "nut",
      washer: "washer",
      insert: "insert",
      gasket: "washer",
    };
    const cat = categoryMap[specs.fastenerCategory] || specs.fastenerCategory;
    const group = typeGroups.find((g) => g.category === cat);
    return group?.types || [];
  })();

  const showLengthField =
    specs.fastenerCategory === "bolt" ||
    specs.fastenerCategory === "set_screw" ||
    specs.fastenerCategory === "machine_screw";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Fastener Item #{props.index + 1}
        </h3>
        {props.entriesCount > 1 && (
          <button
            type="button"
            onClick={() => props.onRemoveEntry(entry.id)}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Category
          </label>
          <select
            value={specs.fastenerCategory}
            onChange={(e) =>
              updateSpecs({
                fastenerCategory: e.target.value as FastenerEntry["specs"]["fastenerCategory"],
                specificType: undefined,
                size: undefined,
                grade: undefined,
              })
            }
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Type
          </label>
          <select
            value={specs.specificType || ""}
            onChange={(e) =>
              updateSpecs({
                specificType: e.target.value || undefined,
                size: undefined,
                grade: undefined,
              })
            }
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          >
            <option value="">Select type...</option>
            {typesForCategory.map((t) => (
              <option key={t.type} value={t.type}>
                {t.type.replace(/_/g, " ")} ({t.count})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Size
          </label>
          <select
            value={specs.size || ""}
            onChange={(e) => updateSpecs({ size: e.target.value || undefined, grade: undefined })}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          >
            <option value="">Select size...</option>
            {sizes.map((s) => (
              <option key={s.size} value={s.size}>
                {s.size}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Grade
          </label>
          <select
            value={specs.grade || ""}
            onChange={(e) => updateSpecs({ grade: e.target.value || undefined })}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          >
            <option value="">Select grade...</option>
            {grades.map((g, idx) => (
              <option key={`${g.grade}-${idx}`} value={g.grade || ""}>
                {g.grade || "N/A"} {g.material ? `(${g.material})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Finish
          </label>
          <select
            value={specs.finish || ""}
            onChange={(e) => updateSpecs({ finish: e.target.value || undefined })}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          >
            <option value="">Select finish...</option>
            {FINISH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Thread
          </label>
          <select
            value={specs.threadType || ""}
            onChange={(e) =>
              updateSpecs({
                threadType: (e.target.value || undefined) as "coarse" | "fine" | undefined,
              })
            }
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          >
            <option value="">Select thread...</option>
            {THREAD_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {showLengthField && (
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Length (mm)
            </label>
            <input
              type="number"
              value={specs.lengthMm || ""}
              onChange={(e) =>
                updateSpecs({
                  lengthMm: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              placeholder="e.g. 50"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Quantity
          </label>
          <input
            type="number"
            min={1}
            value={specs.quantityValue}
            onChange={(e) =>
              updateSpecs({ quantityValue: Math.max(1, Number(e.target.value) || 1) })
            }
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Standard
          </label>
          <input
            type="text"
            value={specs.standard || ""}
            onChange={(e) => updateSpecs({ standard: e.target.value || undefined })}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            placeholder="e.g. DIN 931"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Notes
        </label>
        <textarea
          value={entry.notes || ""}
          onChange={(e) =>
            props.onUpdateEntry(entry.id, { notes: e.target.value } as Partial<FastenerEntry>)
          }
          rows={2}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          placeholder="Additional specifications or requirements..."
        />
      </div>
    </div>
  );
}
