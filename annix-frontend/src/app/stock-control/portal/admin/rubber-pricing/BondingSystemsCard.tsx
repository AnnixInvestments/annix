"use client";

import { keys } from "es-toolkit/compat";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { MultiSelect } from "@/app/components/ui/MultiSelect";
import type {
  RubberBondingAgentRow,
  RubberFamilyPricingConfig,
  RubberPriceFamily,
  RubberPricingConfig,
} from "@/app/lib/api/stockControlApi";
import {
  useRubberBondingAgents,
  useRubberPricing,
  useUpdateRubberBondingAgent,
  useUpdateRubberPricingConfig,
} from "@/app/lib/query/hooks";
import { blastingCostPerM2, curingCostPerM2, labourCostPerM2 } from "./rubberCostMath";

const BONDING_TYPE_ORDER = [
  "Natural",
  "Premium Natural",
  "Butyl",
  "Nitrile",
  "Neoprene",
  "Chemical",
  "EPDM",
  "Cured",
];

const INPUT_CLASS =
  "w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500";

const TH_CLASS =
  "px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap";

const TD_CLASS = "px-3 py-2 text-sm text-gray-700 align-top";

function money(value: number): string {
  return value.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  });
}

type RecipeDraft = Record<string, string[]>;

function normalizeAgentName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isGlobalBondingAgent(name: string): boolean {
  return normalizeAgentName(name).includes("toluene");
}

function inferBondingSupplier(name: string): string | null {
  const n = normalizeAgentName(name);
  if (
    n.includes("herobond") ||
    n.includes("heroprime") ||
    n.includes("heroline") ||
    n.includes("herocure") ||
    n.includes("anchorcure") ||
    n.includes("ecorrcure")
  ) {
    return "Impilo";
  }
  if (
    n.includes("rema") ||
    n.includes("sc2000") ||
    n.includes("sc4000") ||
    n.includes("sc2001") ||
    n.includes("bc3000") ||
    n.includes("heatingsolution")
  ) {
    return "Rema";
  }
  if (
    n.includes("typly") ||
    n.includes("tycote") ||
    n.includes("vs86") ||
    n.includes("vs05") ||
    n.includes("vs20") ||
    n.includes("vs54") ||
    n.includes("vs80") ||
    n.includes("vs82") ||
    n.includes("2033")
  ) {
    return "Ty-Ply";
  }
  if (n.includes("megum")) {
    return "Megum";
  }
  return null;
}

function familyConfig(
  config: RubberPricingConfig | undefined,
  family: RubberPriceFamily,
): RubberFamilyPricingConfig | null {
  if (!config) {
    return null;
  }
  return family === "pipe" ? config.pipe : config.plate;
}

function bondingTypesFor(familyCfg: RubberFamilyPricingConfig | null): string[] {
  if (!familyCfg) {
    return [];
  }
  const baselineMap = familyCfg.cwAgentBaselinePerM2;
  const baselineKeys = keys(baselineMap ?? {});
  const ordered = BONDING_TYPE_ORDER.filter((type) => baselineKeys.includes(type));
  const extras = baselineKeys.filter((key) => !BONDING_TYPE_ORDER.includes(key));
  return [...ordered, ...extras];
}

interface BondingSystemsCardProps {
  accentColor: string;
}

export function BondingSystemsCard(props: BondingSystemsCardProps) {
  const accentColor = props.accentColor;
  const pricingQuery = useRubberPricing();
  const agentsQuery = useRubberBondingAgents();
  const updateConfig = useUpdateRubberPricingConfig();
  const updateAgent = useUpdateRubberBondingAgent();
  const { showToast } = useToast();

  const config = pricingQuery.data ? pricingQuery.data.config : undefined;
  const agentsData = agentsQuery.data;
  const agentRows = useMemo(() => (agentsData ? agentsData.agents : []), [agentsData]);

  const [family, setFamily] = useState<RubberPriceFamily>("plate");
  const familyCfg = familyConfig(config, family);

  const supplierOptions = useMemo(() => {
    const fromAgents = agentRows
      .map((row) => row.agent.supplier)
      .filter((name): name is string => name != null && name.trim() !== "");
    const supplierBaselineMap = familyCfg ? familyCfg.cwAgentSupplierBaselines : undefined;
    const fromBaselines = keys(supplierBaselineMap ?? {});
    return Array.from(new Set([...fromAgents, ...fromBaselines])).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [agentRows, familyCfg]);

  const [supplier, setSupplier] = useState("");

  useEffect(() => {
    if (supplier === "" && supplierOptions.length > 0) {
      const fallbackSupplier = familyCfg ? familyCfg.defaultBondingAgentSupplier : null;
      const initial =
        fallbackSupplier && supplierOptions.includes(fallbackSupplier)
          ? fallbackSupplier
          : supplierOptions[0];
      setSupplier(initial);
    }
  }, [supplier, supplierOptions, familyCfg]);

  const bondingTypes = useMemo(() => bondingTypesFor(familyCfg), [familyCfg]);

  const [draft, setDraft] = useState<RecipeDraft>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!familyCfg || supplier === "") {
      return;
    }
    const supplierRecipes = familyCfg.cwSupplierRecipes;
    const existing = supplierRecipes ? supplierRecipes[supplier] : undefined;
    setDraft(existing ? { ...existing } : {});
    setDirty(false);
  }, [familyCfg, supplier]);

  const saleByName = useMemo(() => {
    return new Map(
      agentRows.map((row) => {
        const sale = row.pricing.salePerM2;
        return [row.agent.name, sale ?? null] as const;
      }),
    );
  }, [agentRows]);

  const agentOptionsForSupplier = useMemo(() => {
    return agentRows.filter((row) => {
      const name = row.agent.name;
      if (isGlobalBondingAgent(name)) {
        return true;
      }
      const stored = row.agent.supplier;
      const effective = stored ?? inferBondingSupplier(name);
      return effective === supplier;
    });
  }, [agentRows, supplier]);

  const multiSelectOptions = useMemo(() => {
    const seen = new Set<string>();
    return agentOptionsForSupplier.reduce<{ value: string; label: string; sublabel: string }[]>(
      (options, row) => {
        const name = row.agent.name;
        if (seen.has(name)) {
          return options;
        }
        seen.add(name);
        const sale = row.pricing.salePerM2;
        const saleLabel = sale == null ? "no coverage" : `${money(sale)}/m²`;
        const supplierLabel = isGlobalBondingAgent(name) ? "global" : supplier;
        return [
          ...options,
          { value: name, label: name, sublabel: `${supplierLabel} · ${saleLabel}` },
        ];
      },
      [],
    );
  }, [agentOptionsForSupplier, supplier]);

  const agentByName = useMemo(() => {
    return new Map(agentRows.map((row) => [row.agent.name, row] as const));
  }, [agentRows]);

  const setRecipe = useCallback((bondingType: string, names: string[]) => {
    setDraft((prev) => ({ ...prev, [bondingType]: names }));
    setDirty(true);
  }, []);

  const totalFor = useCallback(
    (names: string[]): number | null => {
      const sales = names.map((name) => {
        const sale = saleByName.get(name);
        return sale ?? null;
      });
      if (sales.some((sale) => sale == null)) {
        return null;
      }
      return sales.reduce<number>((sum, sale) => sum + (sale ?? 0), 0);
    },
    [saleByName],
  );

  const handleSave = useCallback(() => {
    if (!config || !familyCfg || supplier === "") {
      return;
    }
    const storedSupplierRecipes = familyCfg.cwSupplierRecipes;
    const existingSupplierRecipes = storedSupplierRecipes ?? {};
    const nextFamilyCfg = {
      ...familyCfg,
      cwSupplierRecipes: { ...existingSupplierRecipes, [supplier]: draft },
    };
    const nextConfig: RubberPricingConfig =
      family === "pipe"
        ? { ...config, pipe: { ...config.pipe, ...nextFamilyCfg } }
        : { ...config, plate: { ...config.plate, ...nextFamilyCfg } };
    updateConfig.mutate(nextConfig, {
      onSuccess: () => {
        showToast("Bonding systems saved — quotes now use these recipes.", "success");
        setDirty(false);
      },
      onError: () => showToast("Could not save bonding systems — please try again.", "error"),
    });
  }, [config, familyCfg, supplier, draft, family, updateConfig, showToast]);

  const handleUsageCommit = useCallback(
    (row: RubberBondingAgentRow, value: string) => {
      const trimmed = value.trim();
      if (trimmed === "") {
        return;
      }
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        showToast("Enter a usage greater than zero.", "warning");
        return;
      }
      const agent = row.agent;
      const isGram = agent.coverageBasis === "gram";
      const currentValue = isGram ? agent.gramsPerM2 : agent.areaCoverPerLitre;
      if (currentValue != null && Math.abs(currentValue - parsed) < 0.0001) {
        return;
      }
      const input = isGram
        ? { coverageBasis: "gram" as const, gramsPerM2: parsed, areaCoverPerLitre: null }
        : { coverageBasis: "litre" as const, areaCoverPerLitre: parsed, gramsPerM2: null };
      updateAgent.mutate(
        { id: agent.id, input },
        {
          onSuccess: () => showToast(`Updated usage for ${agent.name}.`, "success"),
          onError: () => showToast("Could not update usage — please try again.", "error"),
        },
      );
    },
    [updateAgent, showToast],
  );

  const pricingLoading = pricingQuery.isLoading;
  const agentsLoading = agentsQuery.isLoading;
  const isLoading = pricingLoading || agentsLoading;
  const pricingError = pricingQuery.isError;
  const agentsError = agentsQuery.isError;
  const isError = pricingError || agentsError;
  const savePending = updateConfig.isPending;
  const saveDisabled = !dirty || savePending || supplier === "";

  const blastingPerM2 = config ? blastingCostPerM2(config) : 0;
  const curingPerM2 = config ? curingCostPerM2(config) : 0;
  const labourPerM2 = config ? labourCostPerM2(config, family) : 0;
  const fixedStack = blastingPerM2 + curingPerM2 + labourPerM2;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Bonding systems</h2>
          <p className="text-sm text-gray-500 mt-1">
            The set of products used for each rubber type, per supplier. The{" "}
            <strong>Full /m²</strong> (adhesives + labour + curing + blasting) is the bonding-system
            cost used in quotes. Edit a product's usage to match your real working spread rate — it
            updates the same coverage shown in the bonding agents table below. Labour, curing and
            blasting are set on the Labour and Blasting pages.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveDisabled}
          className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          {savePending ? "Saving…" : "Save bonding systems"}
        </button>
      </div>

      <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-4">
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
          <button
            type="button"
            onClick={() => setFamily("plate")}
            className={`px-4 py-1.5 text-sm font-medium ${family === "plate" ? "text-white" : "text-gray-700 bg-white hover:bg-gray-50"}`}
            style={family === "plate" ? { backgroundColor: accentColor } : undefined}
          >
            Plate &amp; fittings
          </button>
          <button
            type="button"
            onClick={() => setFamily("pipe")}
            className={`px-4 py-1.5 text-sm font-medium ${family === "pipe" ? "text-white" : "text-gray-700 bg-white hover:bg-gray-50"}`}
            style={family === "pipe" ? { backgroundColor: accentColor } : undefined}
          >
            Running-metre pipe
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium whitespace-nowrap">Supplier</span>
          <select
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            aria-label="Bonding system supplier"
            className={`${INPUT_CLASS} w-48`}
          >
            {supplierOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!isLoading && !isError && supplierOptions.length > 0 && (
        <div className="p-4 border-b border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-md border border-gray-200 p-3">
            <span className="text-xs text-gray-500">Labour / m²</span>
            <div className="text-base font-semibold text-gray-900">{money(labourPerM2)}</div>
          </div>
          <div className="rounded-md border border-gray-200 p-3">
            <span className="text-xs text-gray-500">Curing / m²</span>
            <div className="text-base font-semibold text-gray-900">{money(curingPerM2)}</div>
          </div>
          <div className="rounded-md border border-gray-200 p-3">
            <span className="text-xs text-gray-500">Blasting / m²</span>
            <div className="text-base font-semibold text-gray-900">{money(blastingPerM2)}</div>
          </div>
          <div className="rounded-md border border-gray-300 bg-gray-50 p-3">
            <span className="text-xs text-gray-500">Labour + curing + blasting / m²</span>
            <div className="text-base font-semibold text-gray-900">{money(fixedStack)}</div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="p-8 text-center text-sm text-gray-500">Loading bonding systems…</div>
      )}

      {isError && (
        <div className="p-8 text-center text-sm text-gray-500">
          Could not load bonding systems — please try again.
        </div>
      )}

      {!isLoading && !isError && supplierOptions.length === 0 && (
        <div className="p-8 text-center text-sm text-gray-500">
          Add bonding agents below first, then build a system per rubber type here.
        </div>
      )}

      {!isLoading && !isError && supplierOptions.length > 0 && (
        <div className="overflow-auto max-h-[70vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={TH_CLASS}>Rubber type</th>
                <th className={TH_CLASS}>Products used</th>
                <th className={TH_CLASS}>Usages</th>
                <th className={TH_CLASS}>Adhesives /m²</th>
                <th className={TH_CLASS}>Full /m²</th>
                <th className={TH_CLASS}>Old baseline /m²</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bondingTypes.map((bondingType) => {
                const draftForType = draft[bondingType];
                const selected = draftForType ?? [];
                const total = totalFor(selected);
                const supplierBaselines = familyCfg
                  ? familyCfg.cwAgentSupplierBaselines
                  : undefined;
                const baselineForSupplier = supplierBaselines
                  ? supplierBaselines[supplier]
                  : undefined;
                const baseline = baselineForSupplier ? baselineForSupplier[bondingType] : undefined;
                return (
                  <tr key={bondingType} className="hover:bg-gray-50">
                    <td className={`${TD_CLASS} font-medium text-gray-900 whitespace-nowrap`}>
                      {bondingType}
                    </td>
                    <td className={`${TD_CLASS} min-w-[18rem]`}>
                      <MultiSelect
                        values={selected}
                        onChange={(names) => setRecipe(bondingType, names)}
                        options={multiSelectOptions}
                        placeholder="Select products…"
                        emptyText="No agents for this supplier"
                      />
                    </td>
                    <td className={`${TD_CLASS} min-w-[16rem]`}>
                      {selected.length === 0 ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {selected.map((name) => {
                            const row = agentByName.get(name);
                            if (!row) {
                              return (
                                <div key={name} className="text-xs text-amber-600">
                                  {name} — not in list
                                </div>
                              );
                            }
                            const agent = row.agent;
                            const isGram = agent.coverageBasis === "gram";
                            const unit = isGram ? "g/m²" : "m²/L";
                            const current = isGram ? agent.gramsPerM2 : agent.areaCoverPerLitre;
                            const sale = row.pricing.salePerM2;
                            return (
                              <div key={name} className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 w-40 truncate" title={name}>
                                  {name}
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  defaultValue={current == null ? "" : String(current)}
                                  aria-label={`Usage for ${name}`}
                                  onBlur={(e) => handleUsageCommit(row, e.target.value)}
                                  className={`${INPUT_CLASS} w-20`}
                                />
                                <span className="text-xs text-gray-400 w-12">{unit}</span>
                                <span className="text-xs text-gray-500 w-20 text-right">
                                  {sale == null ? "—" : money(sale)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className={`${TD_CLASS} text-gray-700 whitespace-nowrap`}>
                      {total == null ? "—" : money(total)}
                    </td>
                    <td className={`${TD_CLASS} font-semibold text-gray-900 whitespace-nowrap`}>
                      {total == null ? "—" : money(total + fixedStack)}
                    </td>
                    <td className={`${TD_CLASS} text-gray-400 whitespace-nowrap`}>
                      {baseline == null ? "—" : `${money(baseline)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-4 py-3 text-xs text-gray-500">
            "Adhesives /m²" is the sum of the chosen products; "Full /m²" adds the labour, curing
            and blasting shown above and is what drives quotes once saved. "Old baseline /m²" is the
            previous fixed value for reference while you tune usages. A row with an unresolved
            product (no coverage) keeps using the old baseline until every product resolves.
          </p>
        </div>
      )}
    </div>
  );
}
