"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { RubberBlastingConfig, RubberPricingConfig } from "@/app/lib/api/stockControlApi";
import { useRubberPricing, useUpdateRubberPricingConfig } from "@/app/lib/query/hooks";

const INPUT_CLASS =
  "w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500";

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

interface BlastingDraft {
  elecAvgRate: number;
  elecAvgKwh: number;
  gritBagCost: number;
  gritM2PerBag: number;
  m2PerHour: number;
  crewSize: number;
  margin: number;
  blastDeptRate: number;
}

function blastingPerM2(draft: BlastingDraft): number {
  const perHour = draft.m2PerHour;
  if (perHour <= 0) {
    return 0;
  }
  const labour = (draft.blastDeptRate * draft.crewSize) / perHour;
  const electricity = (draft.elecAvgRate * draft.elecAvgKwh) / perHour;
  const grit = draft.gritM2PerBag > 0 ? draft.gritBagCost / draft.gritM2PerBag : 0;
  return (labour + electricity + grit) * draft.margin;
}

function draftFromConfig(blasting: RubberBlastingConfig, blastDeptRate: number): BlastingDraft {
  return {
    elecAvgRate: blasting.elecAvgRate,
    elecAvgKwh: blasting.elecAvgKwh,
    gritBagCost: blasting.gritBagCost,
    gritM2PerBag: blasting.gritM2PerBag,
    m2PerHour: blasting.m2PerHour,
    crewSize: blasting.crewSize,
    margin: blasting.margin,
    blastDeptRate,
  };
}

interface BlastingCardProps {
  accentColor: string;
}

export function BlastingCard(props: BlastingCardProps) {
  const accentColor = props.accentColor;
  const pricingQuery = useRubberPricing();
  const updateConfig = useUpdateRubberPricingConfig();
  const { showToast } = useToast();

  const config = pricingQuery.data ? pricingQuery.data.config : undefined;

  const [draft, setDraft] = useState<BlastingDraft | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!config || dirty) {
      return;
    }
    const blastDeptRate = config.deptAvgHourly.Blast;
    setDraft(draftFromConfig(config.blasting, blastDeptRate ?? 0));
  }, [config, dirty]);

  const setField = useCallback((field: keyof BlastingDraft, value: string) => {
    const parsed = numberOrZero(value);
    setDraft((prev) => (prev ? { ...prev, [field]: parsed } : prev));
    setDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!config || !draft) {
      return;
    }
    const nextBlasting: RubberBlastingConfig = {
      elecAvgRate: draft.elecAvgRate,
      elecAvgKwh: draft.elecAvgKwh,
      gritBagCost: draft.gritBagCost,
      gritM2PerBag: draft.gritM2PerBag,
      m2PerHour: draft.m2PerHour,
      crewSize: draft.crewSize,
      margin: draft.margin,
    };
    const nextConfig: RubberPricingConfig = {
      ...config,
      blasting: nextBlasting,
      deptAvgHourly: { ...config.deptAvgHourly, Blast: draft.blastDeptRate },
    };
    updateConfig.mutate(nextConfig, {
      onSuccess: () => {
        showToast("Blasting settings saved.", "success");
        setDirty(false);
      },
      onError: () => showToast("Could not save blasting settings — please try again.", "error"),
    });
  }, [config, draft, updateConfig, showToast]);

  const savePending = updateConfig.isPending;
  const pricingLoading = pricingQuery.isLoading;

  if (pricingLoading || !draft) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-sm text-gray-500">
        Loading blasting settings…
      </div>
    );
  }

  const perM2 = blastingPerM2(draft);
  const fields: { key: keyof BlastingDraft; label: string; step: string }[] = [
    { key: "blastDeptRate", label: "Blaster hourly rate (R)", step: "0.01" },
    { key: "crewSize", label: "Crew size", step: "1" },
    { key: "m2PerHour", label: "m² per hour", step: "0.01" },
    { key: "elecAvgRate", label: "Electricity avg rate (R/kWh)", step: "0.01" },
    { key: "elecAvgKwh", label: "Electricity avg kWh", step: "0.01" },
    { key: "gritBagCost", label: "Grit bag cost (R)", step: "0.01" },
    { key: "gritM2PerBag", label: "Grit m² per bag", step: "0.01" },
    { key: "margin", label: "Margin", step: "0.01" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Blasting</h2>
          <p className="text-sm text-gray-500 mt-1">
            Grit-blasting cost per m². Blasting/m² = (blaster wages + electricity + grit) × margin,
            spread over the blast throughput. Feeds the rubber lining bonding-system cost on every
            quote.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || savePending}
          className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          {savePending ? "Saving…" : "Save blasting"}
        </button>
      </div>

      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {fields.map((field) => {
          const value = draft[field.key];
          return (
            <label key={field.key} className="block">
              <span className="text-xs text-gray-500">{field.label}</span>
              <input
                type="number"
                step={field.step}
                value={value}
                onChange={(e) => setField(field.key, e.target.value)}
                className={INPUT_CLASS}
              />
            </label>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Blasting cost / m²</span>
        <span className="text-lg font-semibold text-gray-900">{money(perM2)}</span>
      </div>
    </div>
  );
}
