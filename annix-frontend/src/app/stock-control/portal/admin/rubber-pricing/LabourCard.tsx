"use client";

import { keys } from "es-toolkit/compat";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { RubberPriceFamily, RubberPricingConfig } from "@/app/lib/api/stockControlApi";
import { useRubberPricing, useUpdateRubberPricingConfig } from "@/app/lib/query/hooks";

const INPUT_CLASS =
  "w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500";

const TH_CLASS =
  "px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap";

const TD_CLASS = "px-3 py-2 text-sm text-gray-700 whitespace-nowrap";

const COMPONENT_KEYS = ["rubberLining", "handling", "finishing", "solution"] as const;

type ComponentKey = (typeof COMPONENT_KEYS)[number];

const COMPONENT_LABELS: Record<ComponentKey, string> = {
  rubberLining: "Rubber lining",
  handling: "Handling",
  finishing: "Finishing",
  solution: "Solution",
};

const FAMILIES: { key: RubberPriceFamily; label: string }[] = [
  { key: "plate", label: "Plate" },
  { key: "pipe", label: "Pipe" },
];

function money(value: number): string {
  return value.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  });
}

function numberOrZero(value: string): number {
  const trimmed = value.trim();
  if (trimmed === "") {
    return 0;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

interface ParaffinDraft {
  ltrsPerCure: number;
  costPerLitre: number;
  m2PerPot: number;
}

type ComponentThroughputs = Record<ComponentKey, number>;

interface LabourDraft {
  paraffin: ParaffinDraft;
  deptRates: Record<string, number>;
  throughputs: Record<RubberPriceFamily, ComponentThroughputs>;
}

function throughputsForFamily(
  config: RubberPricingConfig,
  family: RubberPriceFamily,
): ComponentThroughputs {
  const familyCfg = config[family];
  return {
    rubberLining: familyCfg.rubberLining.m2PerHour,
    handling: familyCfg.handling.m2PerHour,
    finishing: familyCfg.finishing.m2PerHour,
    solution: familyCfg.solution.m2PerHour,
  };
}

function draftFromConfig(config: RubberPricingConfig): LabourDraft {
  const paraffin = config.paraffin;
  const deptRates = keys(config.deptAvgHourly)
    .filter((dept) => dept !== "Blast")
    .reduce<Record<string, number>>((rates, dept) => {
      const rate = config.deptAvgHourly[dept];
      return { ...rates, [dept]: rate ?? 0 };
    }, {});
  return {
    paraffin: {
      ltrsPerCure: paraffin.ltrsPerCure,
      costPerLitre: paraffin.costPerLitre,
      m2PerPot: paraffin.m2PerPot,
    },
    deptRates,
    throughputs: {
      plate: throughputsForFamily(config, "plate"),
      pipe: throughputsForFamily(config, "pipe"),
    },
  };
}

function curingPerM2(paraffin: ParaffinDraft): number {
  return paraffin.m2PerPot > 0
    ? (paraffin.ltrsPerCure * paraffin.costPerLitre) / paraffin.m2PerPot
    : 0;
}

function componentDepartment(
  config: RubberPricingConfig,
  family: RubberPriceFamily,
  component: ComponentKey,
): string {
  return config[family][component].department;
}

interface LabourCardProps {
  accentColor: string;
}

export function LabourCard(props: LabourCardProps) {
  const accentColor = props.accentColor;
  const pricingQuery = useRubberPricing();
  const updateConfig = useUpdateRubberPricingConfig();
  const { showToast } = useToast();

  const config = pricingQuery.data ? pricingQuery.data.config : undefined;

  const [draft, setDraft] = useState<LabourDraft | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!config || dirty) {
      return;
    }
    setDraft(draftFromConfig(config));
  }, [config, dirty]);

  const setParaffin = useCallback((field: keyof ParaffinDraft, value: string) => {
    const parsed = numberOrZero(value);
    setDraft((prev) =>
      prev ? { ...prev, paraffin: { ...prev.paraffin, [field]: parsed } } : prev,
    );
    setDirty(true);
  }, []);

  const setDeptRate = useCallback((dept: string, value: string) => {
    const parsed = numberOrZero(value);
    setDraft((prev) =>
      prev ? { ...prev, deptRates: { ...prev.deptRates, [dept]: parsed } } : prev,
    );
    setDirty(true);
  }, []);

  const setThroughput = useCallback(
    (family: RubberPriceFamily, component: ComponentKey, value: string) => {
      const parsed = numberOrZero(value);
      setDraft((prev) => {
        if (!prev) {
          return prev;
        }
        const familyThroughputs = prev.throughputs[family];
        return {
          ...prev,
          throughputs: {
            ...prev.throughputs,
            [family]: { ...familyThroughputs, [component]: parsed },
          },
        };
      });
      setDirty(true);
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (!config || !draft) {
      return;
    }
    const withFamily = (family: RubberPriceFamily) => {
      const familyCfg = config[family];
      const throughputs = draft.throughputs[family];
      return {
        ...familyCfg,
        rubberLining: { ...familyCfg.rubberLining, m2PerHour: throughputs.rubberLining },
        handling: { ...familyCfg.handling, m2PerHour: throughputs.handling },
        finishing: { ...familyCfg.finishing, m2PerHour: throughputs.finishing },
        solution: { ...familyCfg.solution, m2PerHour: throughputs.solution },
      };
    };
    const nextConfig: RubberPricingConfig = {
      ...config,
      paraffin: draft.paraffin,
      deptAvgHourly: { ...config.deptAvgHourly, ...draft.deptRates },
      plate: { ...config.plate, ...withFamily("plate") },
      pipe: { ...config.pipe, ...withFamily("pipe") },
    };
    updateConfig.mutate(nextConfig, {
      onSuccess: () => {
        showToast("Labour settings saved.", "success");
        setDirty(false);
      },
      onError: () => showToast("Could not save labour settings — please try again.", "error"),
    });
  }, [config, draft, updateConfig, showToast]);

  const savePending = updateConfig.isPending;
  const pricingLoading = pricingQuery.isLoading;

  if (pricingLoading || !draft || !config) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-sm text-gray-500">
        Loading labour settings…
      </div>
    );
  }

  const curing = curingPerM2(draft.paraffin);
  const deptNames = keys(draft.deptRates);

  const componentPerM2 = (family: RubberPriceFamily, component: ComponentKey): number => {
    const department = componentDepartment(config, family, component);
    const rate = draft.deptRates[department];
    const safeRate = rate ?? 0;
    const throughput = draft.throughputs[family][component];
    return throughput > 0 ? safeRate / throughput : 0;
  };

  const familySubtotal = (family: RubberPriceFamily): number => {
    return COMPONENT_KEYS.reduce<number>(
      (total, component) => total + componentPerM2(family, component),
      curing,
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Labour &amp; curing</h2>
          <p className="text-sm text-gray-500 mt-1">
            Paraffin curing, department hourly rates and the per-family throughputs (m² per hour)
            that turn wages into a cost per m². Each component's cost/m² = department rate ÷
            throughput. Feeds the rubber lining bonding-system cost on every quote (blasting is on
            its own card).
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || savePending}
          className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          {savePending ? "Saving…" : "Save labour"}
        </button>
      </div>

      <div className="p-4 space-y-2 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-700">Paraffin / curing</span>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <label className="block">
            <span className="text-xs text-gray-500">Litres per cure</span>
            <input
              type="number"
              step="0.01"
              value={draft.paraffin.ltrsPerCure}
              onChange={(e) => setParaffin("ltrsPerCure", e.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Cost per litre (R)</span>
            <input
              type="number"
              step="0.01"
              value={draft.paraffin.costPerLitre}
              onChange={(e) => setParaffin("costPerLitre", e.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">m² per pot</span>
            <input
              type="number"
              step="0.01"
              value={draft.paraffin.m2PerPot}
              onChange={(e) => setParaffin("m2PerPot", e.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <div className="flex flex-col justify-end">
            <span className="text-xs text-gray-500">Curing / m²</span>
            <span className="text-sm font-semibold text-gray-900 py-1">{money(curing)}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-700">Department average hourly rates</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {deptNames.map((dept) => {
            const rate = draft.deptRates[dept];
            return (
              <label key={dept} className="block">
                <span className="text-xs text-gray-500">{dept}</span>
                <input
                  type="number"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setDeptRate(dept, e.target.value)}
                  aria-label={`${dept} average hourly rate`}
                  className={INPUT_CLASS}
                />
              </label>
            );
          })}
        </div>
        <p className="text-xs text-gray-400">The Blast rate is set on the Blasting card.</p>
      </div>

      <div className="p-4 space-y-2">
        <span className="text-sm font-medium text-gray-700">
          Per-family throughput (m² per hour)
        </span>
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={TH_CLASS}>Component</th>
                <th className={TH_CLASS}>Plate dept</th>
                <th className={TH_CLASS}>Plate m²/hr</th>
                <th className={TH_CLASS}>Plate /m²</th>
                <th className={TH_CLASS}>Pipe dept</th>
                <th className={TH_CLASS}>Pipe m²/hr</th>
                <th className={TH_CLASS}>Pipe /m²</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {COMPONENT_KEYS.map((component) => {
                return (
                  <tr key={component}>
                    <td className={`${TD_CLASS} font-medium text-gray-900`}>
                      {COMPONENT_LABELS[component]}
                    </td>
                    {FAMILIES.map((fam) => {
                      const department = componentDepartment(config, fam.key, component);
                      const throughput = draft.throughputs[fam.key][component];
                      const perM2 = componentPerM2(fam.key, component);
                      return (
                        <FamilyThroughputCells
                          key={fam.key}
                          department={department}
                          throughput={throughput}
                          perM2={perM2}
                          onChange={(value) => setThroughput(fam.key, component, value)}
                        />
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-end gap-6">
        {FAMILIES.map((fam) => {
          const subtotal = familySubtotal(fam.key);
          return (
            <div key={fam.key} className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">{fam.label} labour / m²</span>
              <span className="text-lg font-semibold text-gray-900">{money(subtotal)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface FamilyThroughputCellsProps {
  department: string;
  throughput: number;
  perM2: number;
  onChange: (value: string) => void;
}

function FamilyThroughputCells(props: FamilyThroughputCellsProps) {
  return (
    <>
      <td className={`${TD_CLASS} text-gray-500`}>{props.department}</td>
      <td className={TD_CLASS}>
        <input
          type="number"
          step="0.01"
          value={props.throughput}
          onChange={(e) => props.onChange(e.target.value)}
          aria-label={`${props.department} throughput`}
          className={`${INPUT_CLASS} w-24`}
        />
      </td>
      <td className={`${TD_CLASS} font-semibold text-gray-900`}>{money(props.perM2)}</td>
    </>
  );
}
