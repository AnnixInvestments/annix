"use client";

import { isUndefined, keys } from "es-toolkit/compat";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import {
  PriceListImportModeSelect,
  priceListImportResultMessage,
} from "@/app/components/shared/PriceListImportMode";
import { useToast } from "@/app/components/Toast";
import { metricsApi } from "@/app/lib/api/metricsApi";
import type {
  CreateRubberPriceListItemInput,
  PriceListImportMode,
  RubberCureType,
  RubberNbFactorConfig,
  RubberPriceFamily,
  RubberPriceListImportPreview,
  RubberPriceListRow,
  RubberPricingConfig,
} from "@/app/lib/api/stockControlApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useBranding,
  useBulkUpliftRubberPrices,
  useClearRubberPriceList,
  useCommitRubberPriceListImport,
  useCreateRubberPriceItem,
  useDeleteRubberPriceItem,
  useImportRubberPriceList,
  useRubberBondingAgents,
  useRubberPricing,
  useSeedRubberPriceList,
  useUpdateRubberPriceItem,
  useUpdateRubberPricingConfig,
} from "@/app/lib/query/hooks";
import {
  agentPortionPerM2,
  blastingCostPerM2,
  curingCostPerM2,
  labourCostPerM2,
} from "./rubberCostMath";

const IMPORT_FALLBACK_MS = 60000;

const FAMILY_TABS: { value: RubberPriceFamily; label: string }[] = [
  { value: "plate", label: "Plate" },
  { value: "pipe", label: "Running-metre Pipe" },
];

const BONDING_OPTIONS = [
  "Natural",
  "Premium Natural",
  "Chemical",
  "Butyl",
  "Nitrile",
  "Neoprene",
  "EPDM",
  "Cured",
];

const CURE_OPTIONS: { value: RubberCureType; label: string }[] = [
  { value: "steam", label: "Steam" },
  { value: "precured", label: "Pre-cured" },
  { value: "chemical", label: "Chemical" },
];

function cureTypeOrNull(value: string): RubberCureType | null {
  const match = CURE_OPTIONS.find((entry) => entry.value === value);
  return match ? match.value : null;
}

function cureLabel(value: RubberCureType | null): string {
  const option = CURE_OPTIONS.find((entry) => entry.value === value);
  return option ? option.label : "—";
}

interface RowDraft {
  supplier: string;
  productCode: string;
  productName: string;
  cureType: string;
  bondingType: string;
  colour: string;
  shoreHardness: string;
  specificGravity: string;
  costPerKg: string;
  upliftPercent: string;
  preferred: boolean;
}

const EMPTY_DRAFT: RowDraft = {
  supplier: "",
  productCode: "",
  productName: "",
  cureType: "",
  bondingType: "",
  colour: "",
  shoreHardness: "",
  specificGravity: "",
  costPerKg: "",
  upliftPercent: "",
  preferred: false,
};

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function money(value: number): string {
  return value.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  });
}

function decimal(value: number, places: number): string {
  return value.toLocaleString("en-ZA", {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });
}

function draftFromRow(row: RubberPriceListRow): RowDraft {
  const item = row.item;
  const bondingType = item.bondingType;
  const colour = item.colour;
  const productName = item.productName;
  const shoreHardness = item.shoreHardness;
  const costPerKg = item.costPerKg;
  const cureType = item.cureType;
  return {
    supplier: item.supplier,
    productCode: item.productCode,
    productName: productName ?? "",
    cureType: cureType ?? "",
    bondingType: bondingType ?? "",
    colour: colour ?? "",
    shoreHardness: shoreHardness === null ? "" : String(shoreHardness),
    specificGravity: String(item.specificGravity),
    costPerKg: costPerKg === null ? "" : String(costPerKg),
    upliftPercent: String(item.upliftPercent),
    preferred: item.preferred === true,
  };
}

function draftToInput(draft: RowDraft): CreateRubberPriceListItemInput {
  const specificGravity = numberOrNull(draft.specificGravity);
  return {
    supplier: draft.supplier.trim(),
    productCode: draft.productCode.trim(),
    productName: textOrNull(draft.productName),
    cureType: cureTypeOrNull(draft.cureType),
    bondingType: textOrNull(draft.bondingType),
    colour: textOrNull(draft.colour),
    shoreHardness: numberOrNull(draft.shoreHardness),
    specificGravity: specificGravity ?? 1,
    costPerKg: numberOrNull(draft.costPerKg),
    upliftPercent: numberOrNull(draft.upliftPercent),
    preferred: draft.preferred,
  };
}

function draftIsValid(draft: RowDraft): boolean {
  const hasSupplier = draft.supplier.trim() !== "";
  const hasCode = draft.productCode.trim() !== "";
  const hasSg = numberOrNull(draft.specificGravity) !== null;
  return hasSupplier && hasCode && hasSg;
}

const DEFAULT_REF_THICKNESS_MM = 6;
const DEFAULT_REF_NB = "150NB";

function closestThickness(options: number[], desired: number): number | null {
  if (options.length === 0) {
    return null;
  }
  const exact = options.find((value) => value === desired);
  if (exact !== undefined) {
    return exact;
  }
  return options.reduce((best, current) =>
    Math.abs(current - desired) < Math.abs(best - desired) ? current : best,
  );
}

function plateRefSale(row: RubberPriceListRow, thicknessMm: number | null): number | null {
  if (thicknessMm === null) {
    return null;
  }
  const plate = row.plate;
  const thicknesses = plate.thicknesses;
  const entry = thicknesses.find((thickness) => thickness.thicknessMm === thicknessMm);
  if (!entry) {
    return null;
  }
  return entry.salePerM2;
}

function pipeRefRunningMetre(
  row: RubberPriceListRow,
  thicknessMm: number | null,
  nb: string | null,
  nbFactors: RubberNbFactorConfig[],
): number | null {
  if (thicknessMm === null || nb === null) {
    return null;
  }
  const pipe = row.pipe;
  const thicknesses = pipe.thicknesses;
  const entry = thicknesses.find((thickness) => thickness.thicknessMm === thicknessMm);
  if (!entry) {
    return null;
  }
  const perM2 = entry.salePerM2;
  const factorEntry = nbFactors.find((factor) => factor.nb === nb);
  if (!factorEntry) {
    return null;
  }
  const factor = factorEntry.pie + factorEntry.additional;
  return perM2 * factor;
}

const INPUT_CLASS =
  "w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500";

const TH_CLASS =
  "px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap";

const TD_CLASS = "px-3 py-2 text-sm text-gray-700 whitespace-nowrap";

export default function RubberPricingAdminPage() {
  const query = useRubberPricing();
  const createItem = useCreateRubberPriceItem();
  const updateItem = useUpdateRubberPriceItem();
  const deleteItem = useDeleteRubberPriceItem();
  const saveConfig = useUpdateRubberPricingConfig();
  const importPriceList = useImportRubberPriceList();
  const commitImport = useCommitRubberPriceListImport();
  const bulkUplift = useBulkUpliftRubberPrices();
  const seedList = useSeedRubberPriceList();
  const clearList = useClearRubberPriceList();
  const bondingAgentsQuery = useRubberBondingAgents();
  const brandingQuery = useBranding("annix-core");
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showExtraction, hideExtraction } = useExtractionProgress();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [family, setFamily] = useState<RubberPriceFamily>("plate");
  const [refThicknessMm, setRefThicknessMm] = useState<number>(DEFAULT_REF_THICKNESS_MM);
  const [refNb, setRefNb] = useState<string>(DEFAULT_REF_NB);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [rowDraft, setRowDraft] = useState<RowDraft>(EMPTY_DRAFT);
  const [newDraft, setNewDraft] = useState<RowDraft>(EMPTY_DRAFT);
  const [configDraft, setConfigDraft] = useState<RubberPricingConfig | null>(null);
  const [importPreview, setImportPreview] = useState<RubberPriceListImportPreview | null>(null);
  const [importMode, setImportMode] = useState<PriceListImportMode>("update");
  const [bulkUpliftValue, setBulkUpliftValue] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [colourFilter, setColourFilter] = useState("all");
  const [bondingFilter, setBondingFilter] = useState("all");
  const [shoreFilter, setShoreFilter] = useState("all");
  const [cureFilter, setCureFilter] = useState("all");
  const [summaryBondingType, setSummaryBondingType] = useState("Natural");

  const data = query.data;
  const config = data ? data.config : null;
  const rows = data ? data.items : [];

  const branding = brandingQuery.data;
  const brandAccent = branding?.navbarColor;
  const accentColor = brandAccent || "var(--brand-navbar, #0d9488)";

  useEffect(() => {
    if (config) {
      setConfigDraft(structuredClone(config));
    }
  }, [config]);

  const familyThicknesses = config ? config[family].thicknessesMm : [];
  const pipeNbFactors = config ? config.pipe.nbFactors : [];

  useEffect(() => {
    const resolved = closestThickness(familyThicknesses, refThicknessMm);
    if (resolved !== null && resolved !== refThicknessMm) {
      setRefThicknessMm(resolved);
    }
  }, [familyThicknesses, refThicknessMm]);

  useEffect(() => {
    const nbValues = pipeNbFactors.map((factor) => factor.nb);
    const inList = nbValues.find((value) => value === refNb);
    const fallback = nbValues[0];
    if (inList === undefined && fallback !== undefined) {
      setRefNb(fallback);
    }
  }, [pipeNbFactors, refNb]);

  const supplierOptions = Array.from(
    new Set(rows.map((row) => row.item.supplier).filter((name) => name !== "")),
  ).sort((a, b) => a.localeCompare(b));

  const colourOptions = Array.from(
    new Set(rows.map((row) => row.item.colour).filter((value): value is string => !!value)),
  ).sort((a, b) => a.localeCompare(b));

  const bondingOptions = Array.from(
    new Set(rows.map((row) => row.item.bondingType).filter((value): value is string => !!value)),
  ).sort((a, b) => a.localeCompare(b));

  const shoreOptions = Array.from(
    new Set(
      rows.map((row) => row.item.shoreHardness).filter((value): value is number => value != null),
    ),
  ).sort((a, b) => a - b);

  const filteredRows = rows.filter((row) => {
    const item = row.item;
    const supplier = item.supplier;
    const colour = item.colour;
    const bonding = item.bondingType;
    const shore = item.shoreHardness;
    const cure = item.cureType;
    const matchesSupplier = supplierFilter === "all" || supplier === supplierFilter;
    const matchesColour = colourFilter === "all" || colour === colourFilter;
    const matchesBonding = bondingFilter === "all" || bonding === bondingFilter;
    const matchesShore = shoreFilter === "all" || String(shore) === shoreFilter;
    const matchesCure = cureFilter === "all" || (cure ?? "") === cureFilter;
    return matchesSupplier && matchesColour && matchesBonding && matchesShore && matchesCure;
  });

  const hasRows = rows.length > 0;
  const bulkUpliftPending = bulkUplift.isPending;
  const importPending = importPriceList.isPending;
  const seedPending = seedList.isPending;
  const clearPending = clearList.isPending;

  const startEdit = useCallback((row: RubberPriceListRow) => {
    setEditingId(row.item.id);
    setRowDraft(draftFromRow(row));
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setRowDraft(EMPTY_DRAFT);
  }, []);

  const handleInlineSave = useCallback(
    (item: RubberPriceListRow["item"], field: "upliftPercent" | "costPerKg", raw: string) => {
      const trimmed = raw.trim();
      if (trimmed !== "" && !Number.isFinite(Number(trimmed))) {
        return;
      }
      const parsed = trimmed === "" ? null : Number(trimmed);
      const nextValue = field === "upliftPercent" ? (parsed ?? 0) : parsed;
      const currentValue = item[field];
      if (nextValue === currentValue) {
        return;
      }
      updateItem.mutate(
        { id: item.id, input: { [field]: nextValue } },
        { onError: () => showToast("Could not save the change — please try again.", "error") },
      );
    },
    [updateItem, showToast],
  );

  const handleTogglePreferred = useCallback(
    (item: RubberPriceListRow["item"], next: boolean) => {
      if (next === item.preferred) {
        return;
      }
      updateItem.mutate(
        { id: item.id, input: { preferred: next } },
        { onError: () => showToast("Could not save the change — please try again.", "error") },
      );
    },
    [updateItem, showToast],
  );

  const handleCureChange = useCallback(
    (item: RubberPriceListRow["item"], raw: string) => {
      const next = cureTypeOrNull(raw);
      if (next === item.cureType) {
        return;
      }
      updateItem.mutate(
        { id: item.id, input: { cureType: next } },
        { onError: () => showToast("Could not save the change — please try again.", "error") },
      );
    },
    [updateItem, showToast],
  );

  const handleBondingChange = useCallback(
    (item: RubberPriceListRow["item"], raw: string) => {
      const next = raw === "" ? null : raw;
      if (next === item.bondingType) {
        return;
      }
      updateItem.mutate(
        { id: item.id, input: { bondingType: next } },
        { onError: () => showToast("Could not save the change — please try again.", "error") },
      );
    },
    [updateItem, showToast],
  );

  const handleSaveEdit = useCallback(
    (id: number) => {
      if (!draftIsValid(rowDraft)) {
        showToast("Supplier, product code and specific gravity are required.", "warning");
        return;
      }
      updateItem.mutate(
        { id, input: draftToInput(rowDraft) },
        {
          onSuccess: () => {
            showToast("Rubber updated.", "success");
            setEditingId(null);
            setRowDraft(EMPTY_DRAFT);
          },
          onError: () => showToast("Could not update rubber — please try again.", "error"),
        },
      );
    },
    [rowDraft, updateItem, showToast],
  );

  const handleAdd = useCallback(() => {
    if (!draftIsValid(newDraft)) {
      showToast("Supplier, product code and specific gravity are required.", "warning");
      return;
    }
    createItem.mutate(draftToInput(newDraft), {
      onSuccess: () => {
        showToast("Rubber added.", "success");
        setNewDraft(EMPTY_DRAFT);
      },
      onError: () => showToast("Could not add rubber — please try again.", "error"),
    });
  }, [newDraft, createItem, showToast]);

  const handleDelete = useCallback(
    async (row: RubberPriceListRow) => {
      const item = row.item;
      const confirmed = await confirm({
        title: "Delete rubber",
        message: `Remove "${item.productCode}" (${item.supplier}) from the price list? This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!confirmed) return;
      deleteItem.mutate(item.id, {
        onSuccess: () => showToast("Rubber deleted.", "success"),
        onError: () => showToast("Could not delete rubber — please try again.", "error"),
      });
    },
    [confirm, deleteItem, showToast],
  );

  const handleSaveConfig = useCallback(() => {
    if (!configDraft) return;
    saveConfig.mutate(configDraft, {
      onSuccess: () => showToast("Pricing settings saved.", "success"),
      onError: () => showToast("Could not save settings — please try again.", "error"),
    });
  }, [configDraft, saveConfig, showToast]);

  const handleSeed = useCallback(async () => {
    const confirmed = await confirm({
      title: "Seed price list",
      message:
        "Backfill the rubber price list from product data? This only runs when the list is empty.",
      confirmLabel: "Seed",
      variant: "info",
    });
    if (!confirmed) return;
    seedList.mutate(undefined, {
      onSuccess: (result) => {
        const seeded = result.seeded;
        if (seeded > 0) {
          showToast(`Seeded ${seeded} rubber product${seeded === 1 ? "" : "s"}.`, "success");
        } else {
          showToast("The price list already has products — nothing was seeded.", "info");
        }
      },
      onError: () => showToast("Could not seed the price list — please try again.", "error"),
    });
  }, [confirm, seedList, showToast]);

  const handleClearAll = useCallback(async () => {
    const confirmed = await confirm({
      title: "Clear price list",
      message:
        "Delete every rubber price list item? This cannot be undone — you can re-seed or re-import afterwards.",
      confirmLabel: "Clear all",
      variant: "danger",
    });
    if (!confirmed) return;
    clearList.mutate(undefined, {
      onSuccess: (result) => {
        const cleared = result.cleared;
        showToast(`Cleared ${cleared} rubber product${cleared === 1 ? "" : "s"}.`, "success");
      },
      onError: () => showToast("Could not clear the price list — please try again.", "error"),
    });
  }, [confirm, clearList, showToast]);

  const handleImportFile = useCallback(
    async (file: File) => {
      try {
        const stats = await metricsApi
          .extractionStats("stock-control-rubber-pricing", "import")
          .catch(() => null);
        const learnedMs = stats == null ? null : stats.averageMs;
        const estimatedDurationMs =
          learnedMs == null || learnedMs <= 0 ? IMPORT_FALLBACK_MS : learnedMs;
        showExtraction({
          brand: "stock-control",
          label: "Reading price list…",
          estimatedDurationMs,
          backgroundSafe: true,
        });
        const preview = await importPriceList.mutateAsync(file);
        setImportPreview(preview);
        setImportMode("update");
      } catch {
        showToast("Could not read that price list — please try a clearer file.", "error");
      } finally {
        hideExtraction();
      }
    },
    [importPriceList, showExtraction, hideExtraction, showToast],
  );

  const handleImportInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      const file = files ? files[0] : null;
      event.target.value = "";
      if (file) {
        void handleImportFile(file);
      }
    },
    [handleImportFile],
  );

  const handleConfirmImport = useCallback(() => {
    const preview = importPreview;
    if (!preview) return;
    const rowsInput = preview.rows.map((row): CreateRubberPriceListItemInput => {
      const sg = row.specificGravity;
      return {
        supplier: row.supplier,
        productCode: row.productCode,
        cureType: row.cureType,
        bondingType: row.bondingType,
        colour: row.colour,
        shoreHardness: row.shoreHardness,
        specificGravity: sg ?? 1,
        costPerKg: row.costPerKg,
        upliftPercent: 0,
      };
    });
    const mode = importMode;
    commitImport.mutate(
      { supplier: preview.supplier, replaceSupplier: mode === "replace", mode, rows: rowsInput },
      {
        onSuccess: (result) => {
          showToast(priceListImportResultMessage(result, "rubber products"), "success");
          setImportPreview(null);
        },
        onError: () => showToast("Could not import the price list — please try again.", "error"),
      },
    );
  }, [importPreview, importMode, commitImport, showToast]);

  const handleBulkUplift = useCallback(async () => {
    const parsedValue = numberOrNull(bulkUpliftValue);
    if (parsedValue === null || parsedValue < 0) {
      showToast("Enter a valid uplift percentage (0 or more) to apply.", "warning");
      return;
    }
    const parsed = parsedValue;
    const confirmed = await confirm({
      title: "Apply bulk uplift",
      message: `Set the uplift to ${parsed}% on every rubber in the list? This overwrites the uplift on all rows.`,
      confirmLabel: "Apply to all",
      variant: "warning",
    });
    if (!confirmed) return;
    bulkUplift.mutate(parsed, {
      onSuccess: (result) => {
        const updated = result.updated;
        showToast(
          `Applied ${parsed}% uplift to ${updated} rubber${updated === 1 ? "" : "s"}.`,
          "success",
        );
        setBulkUpliftValue("");
      },
      onError: () => showToast("Could not apply the bulk uplift — please try again.", "error"),
    });
  }, [bulkUpliftValue, confirm, bulkUplift, showToast]);

  const setRowField = useCallback((field: keyof RowDraft, value: string) => {
    setRowDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setNewField = useCallback((field: keyof RowDraft, value: string) => {
    setNewDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateConsumableMarkup = useCallback((value: string) => {
    const parsed = numberOrNull(value);
    setConfigDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, consumableMarkup: parsed ?? 0 };
    });
  }, []);

  const updateFamilyNumber = useCallback(
    (fam: RubberPriceFamily, field: "wastePct" | "markupFactor" | "mpsFactor", value: string) => {
      const parsed = numberOrNull(value);
      setConfigDraft((prev) => {
        if (!prev) return prev;
        const famConfig = prev[fam];
        return { ...prev, [fam]: { ...famConfig, [field]: parsed ?? 0 } };
      });
    },
    [],
  );

  const updateDefaultBondingSupplier = useCallback((fam: RubberPriceFamily, supplier: string) => {
    setConfigDraft((prev) => {
      if (!prev) return prev;
      const famConfig = prev[fam];
      return { ...prev, [fam]: { ...famConfig, defaultBondingAgentSupplier: supplier } };
    });
  }, []);

  const queryIsLoading = query.isLoading;
  const queryIsError = query.isError;

  if (queryIsLoading) {
    return <div className="p-8 text-center text-gray-500">Loading rubber pricing…</div>;
  }

  if (queryIsError || !data || !configDraft) {
    return (
      <div className="p-8 text-center text-gray-500">
        Could not load rubber pricing — please try again.
      </div>
    );
  }

  const blastingPerM2 = blastingCostPerM2(configDraft);
  const curingPerM2 = curingCostPerM2(configDraft);
  const summaryLabourPerM2 = labourCostPerM2(configDraft, family);
  const summaryFamilyConfig = configDraft[family];
  const summarySupplierBaselines = summaryFamilyConfig.cwAgentSupplierBaselines;
  const bondingSupplierOptions = keys(summarySupplierBaselines ?? {});
  const storedDefaultSupplier = summaryFamilyConfig.defaultBondingAgentSupplier;
  const firstSupplierOption = bondingSupplierOptions[0];
  const summarySupplier = storedDefaultSupplier ?? firstSupplierOption ?? "";
  const bondingAgentsData = bondingAgentsQuery.data;
  const bondingAgentRows = bondingAgentsData ? bondingAgentsData.agents : [];
  const summarySaleByName = new Map(
    bondingAgentRows.map((row) => {
      const sale = row.pricing.salePerM2;
      return [row.agent.name, sale ?? null] as const;
    }),
  );
  const summaryAdhesivesPerM2 = agentPortionPerM2(
    configDraft,
    family,
    summaryBondingType,
    summarySupplier,
    summarySaleByName,
  );
  const summaryTotalAdditionalPerM2 =
    blastingPerM2 + curingPerM2 + summaryLabourPerM2 + summaryAdhesivesPerM2;
  const previewSupplier = importPreview ? importPreview.supplier : "";
  const previewRows = importPreview ? importPreview.rows : [];

  const activeFamilyConfig = configDraft[family];
  const thicknessOptions = activeFamilyConfig.thicknessesMm;
  const pipeConfig = configDraft.pipe;
  const nbFactors = pipeConfig.nbFactors;
  const resolvedRefThickness = closestThickness(thicknessOptions, refThicknessMm);
  const nbValues = nbFactors.map((factor) => factor.nb);
  const refNbInList = nbValues.find((value) => value === refNb);
  const resolvedRefNbCandidate = refNbInList ?? nbValues[0];
  const resolvedRefNb = resolvedRefNbCandidate ?? null;
  const refColumnHeader =
    family === "pipe"
      ? `Sale R/m @ ${resolvedRefNb ?? "—"} · ${resolvedRefThickness ?? "—"}mm`
      : `Sale R/m² @ ${resolvedRefThickness ?? "—"}mm`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rubber Lining Pricing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Maintain the rubber price list and the global tunables used to quote rubber lining work
          per square metre (plate) and per running metre (pipe).
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Global pricing settings</h2>
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={saveConfig.isPending}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {saveConfig.isPending ? "Saving…" : "Save settings"}
          </button>
        </div>

        <div className="space-y-3">
          <span className="text-sm font-medium text-gray-700">Bonding-system cost summary</span>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-xs text-gray-500">Family</span>
              <select
                value={family}
                onChange={(e) => setFamily(e.target.value as RubberPriceFamily)}
                aria-label="Cost summary family"
                className={`${INPUT_CLASS} w-44`}
              >
                {FAMILY_TABS.map((tab) => (
                  <option key={tab.value} value={tab.value}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">Bonding supplier (default)</span>
              <select
                value={summarySupplier}
                onChange={(e) => updateDefaultBondingSupplier(family, e.target.value)}
                aria-label="Default bonding agent supplier"
                className={`${INPUT_CLASS} w-44`}
              >
                {bondingSupplierOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">Rubber type</span>
              <select
                value={summaryBondingType}
                onChange={(e) => setSummaryBondingType(e.target.value)}
                aria-label="Cost summary rubber type"
                className={`${INPUT_CLASS} w-44`}
              >
                {BONDING_OPTIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="rounded-md border border-gray-200 p-3">
              <span className="text-xs text-gray-500">Blasting / m²</span>
              <div className="text-base font-semibold text-gray-900">{money(blastingPerM2)}</div>
            </div>
            <div className="rounded-md border border-gray-200 p-3">
              <span className="text-xs text-gray-500">Paraffin / curing / m²</span>
              <div className="text-base font-semibold text-gray-900">{money(curingPerM2)}</div>
            </div>
            <div className="rounded-md border border-gray-200 p-3">
              <span className="text-xs text-gray-500">Labour / m²</span>
              <div className="text-base font-semibold text-gray-900">
                {money(summaryLabourPerM2)}
              </div>
            </div>
            <div className="rounded-md border border-gray-200 p-3">
              <span className="text-xs text-gray-500">Adhesives / m²</span>
              <div className="text-base font-semibold text-gray-900">
                {money(summaryAdhesivesPerM2)}
              </div>
            </div>
            <div className="rounded-md border border-gray-300 bg-gray-50 p-3">
              <span className="text-xs text-gray-500">Total additional / m²</span>
              <div className="text-lg font-semibold text-gray-900">
                {money(summaryTotalAdditionalPerM2)}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Blasting, paraffin and labour are edited on the Labour and Blasting pages under
            Resources; adhesives come from the chosen supplier's bonding system for that rubber
            type. The bonding supplier picked here is saved (on Save settings) as the default used
            on quotes when none is chosen. Total additional / m² is what's added on top of the
            rubber material cost.
          </p>
        </div>

        <div className="space-y-2 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-xs text-gray-500">Consumable markup</span>
              <input
                type="number"
                step="0.01"
                value={configDraft.consumableMarkup}
                onChange={(e) => updateConsumableMarkup(e.target.value)}
                className={INPUT_CLASS}
              />
            </label>
          </div>
        </div>

        <div className="space-y-2 border-t border-gray-100 pt-4">
          <span className="text-sm font-medium text-gray-700">Per-family factors</span>
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className={TH_CLASS}>Family</th>
                  <th className={TH_CLASS}>Waste %</th>
                  <th className={TH_CLASS}>Markup factor</th>
                  <th className={TH_CLASS}>MPS factor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {FAMILY_TABS.map((tab) => {
                  const famConfig = configDraft[tab.value];
                  return (
                    <tr key={tab.value}>
                      <td className={`${TD_CLASS} font-medium text-gray-900`}>{tab.label}</td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="0.01"
                          value={famConfig.wastePct}
                          onChange={(e) =>
                            updateFamilyNumber(tab.value, "wastePct", e.target.value)
                          }
                          aria-label={`${tab.label} waste percent`}
                          className={`${INPUT_CLASS} w-28`}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="0.01"
                          value={famConfig.markupFactor}
                          onChange={(e) =>
                            updateFamilyNumber(tab.value, "markupFactor", e.target.value)
                          }
                          aria-label={`${tab.label} markup factor`}
                          className={`${INPUT_CLASS} w-28`}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="0.01"
                          value={famConfig.mpsFactor}
                          onChange={(e) =>
                            updateFamilyNumber(tab.value, "mpsFactor", e.target.value)
                          }
                          aria-label={`${tab.label} MPS factor`}
                          className={`${INPUT_CLASS} w-28`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Rubber price list</h2>
            <p className="text-sm text-gray-500 mt-1">
              Cost/kg is the input; the sale price shown is read-only at the selected reference
              thickness (plate: per m²; pipe: per running metre at the selected NB). Upload a
              supplier price list (PDF or Excel) to populate it.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImportInputChange}
            />
            <div className="flex items-center gap-2 rounded-md border border-gray-300 px-2 py-1">
              <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                Bulk uplift %
              </span>
              <input
                type="number"
                step="0.1"
                value={bulkUpliftValue}
                placeholder="0"
                onChange={(e) => setBulkUpliftValue(e.target.value)}
                disabled={bulkUpliftPending || !hasRows}
                aria-label="Bulk uplift percentage"
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleBulkUplift}
                disabled={bulkUpliftPending || !hasRows}
                className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: accentColor }}
              >
                {bulkUpliftPending ? "Applying…" : "Apply to all"}
              </button>
            </div>
            <button
              type="button"
              onClick={handleSeed}
              disabled={seedPending || hasRows}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {seedPending ? "Seeding…" : "Seed from product data"}
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={clearPending || !hasRows}
              className="inline-flex items-center justify-center rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {clearPending ? "Clearing…" : "Clear all"}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importPending}
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-teal-50 disabled:opacity-50"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              {importPending ? "Reading…" : "Upload supplier price list"}
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
            {FAMILY_TABS.map((tab) => {
              const isActive = tab.value === family;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFamily(tab.value)}
                  className={`px-4 py-1.5 text-sm font-medium ${
                    isActive ? "text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                  style={isActive ? { backgroundColor: accentColor } : undefined}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium whitespace-nowrap">Reference thickness</span>
            <select
              value={resolvedRefThickness === null ? "" : String(resolvedRefThickness)}
              onChange={(e) => setRefThicknessMm(Number(e.target.value))}
              aria-label="Reference thickness in millimetres"
              className={`${INPUT_CLASS} w-32`}
            >
              {thicknessOptions.map((value) => (
                <option key={value} value={value}>
                  {value} mm
                </option>
              ))}
            </select>
          </label>
          {family === "pipe" && (
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium whitespace-nowrap">Reference NB</span>
              <select
                value={resolvedRefNb ?? ""}
                onChange={(e) => setRefNb(e.target.value)}
                aria-label="Reference nominal bore"
                className={`${INPUT_CLASS} w-32`}
              >
                {nbFactors.map((factor) => (
                  <option key={factor.nb} value={factor.nb}>
                    {factor.nb}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium whitespace-nowrap">Supplier</span>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              aria-label="Filter by supplier"
              className={`${INPUT_CLASS} w-48`}
            >
              <option value="all">All suppliers</option>
              {supplierOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium whitespace-nowrap">Rubber type</span>
            <select
              value={bondingFilter}
              onChange={(e) => setBondingFilter(e.target.value)}
              aria-label="Filter by rubber type"
              className={`${INPUT_CLASS} w-40`}
            >
              <option value="all">All types</option>
              {bondingOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium whitespace-nowrap">Colour</span>
            <select
              value={colourFilter}
              onChange={(e) => setColourFilter(e.target.value)}
              aria-label="Filter by colour"
              className={`${INPUT_CLASS} w-36`}
            >
              <option value="all">All colours</option>
              {colourOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium whitespace-nowrap">Shore A</span>
            <select
              value={shoreFilter}
              onChange={(e) => setShoreFilter(e.target.value)}
              aria-label="Filter by shore hardness"
              className={`${INPUT_CLASS} w-28`}
            >
              <option value="all">All</option>
              {shoreOptions.map((value) => (
                <option key={value} value={String(value)}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium whitespace-nowrap">Cure</span>
            <select
              value={cureFilter}
              onChange={(e) => setCureFilter(e.target.value)}
              aria-label="Filter by cure type"
              className={`${INPUT_CLASS} w-36`}
            >
              <option value="all">All cures</option>
              {CURE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-auto max-h-[70vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={TH_CLASS}>Supplier</th>
                <th className={TH_CLASS}>Code</th>
                <th className={TH_CLASS}>Name</th>
                <th className={TH_CLASS}>Cure</th>
                <th className={TH_CLASS}>Bonding</th>
                <th className={TH_CLASS}>Colour</th>
                <th className={TH_CLASS}>Shore A</th>
                <th className={TH_CLASS}>SG</th>
                <th className={TH_CLASS}>Cost/kg</th>
                <th className={TH_CLASS}>Uplift %</th>
                <th className={TH_CLASS}>Preferred</th>
                <th className={TH_CLASS}>{refColumnHeader}</th>
                <th className={TH_CLASS}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((row) => {
                const item = row.item;
                const isEditing = editingId === item.id;
                const refSale =
                  family === "pipe"
                    ? pipeRefRunningMetre(row, resolvedRefThickness, resolvedRefNb, nbFactors)
                    : plateRefSale(row, resolvedRefThickness);
                if (isEditing) {
                  return (
                    <tr key={item.id} className="bg-teal-50/40">
                      <td className={TD_CLASS}>
                        <input
                          type="text"
                          value={rowDraft.supplier}
                          onChange={(e) => setRowField("supplier", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="text"
                          value={rowDraft.productCode}
                          onChange={(e) => setRowField("productCode", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="text"
                          value={rowDraft.productName}
                          onChange={(e) => setRowField("productName", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <select
                          value={rowDraft.cureType}
                          onChange={(e) => setRowField("cureType", e.target.value)}
                          aria-label="Cure type"
                          className={`${INPUT_CLASS} w-32`}
                        >
                          <option value="">—</option>
                          {CURE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={TD_CLASS}>
                        <select
                          value={rowDraft.bondingType}
                          onChange={(e) => setRowField("bondingType", e.target.value)}
                          className={`${INPUT_CLASS} w-36`}
                        >
                          <option value="">—</option>
                          {BONDING_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="text"
                          value={rowDraft.colour}
                          onChange={(e) => setRowField("colour", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="1"
                          value={rowDraft.shoreHardness}
                          onChange={(e) => setRowField("shoreHardness", e.target.value)}
                          className={`${INPUT_CLASS} w-20`}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="0.01"
                          value={rowDraft.specificGravity}
                          onChange={(e) => setRowField("specificGravity", e.target.value)}
                          className={`${INPUT_CLASS} w-20`}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="0.01"
                          value={rowDraft.costPerKg}
                          onChange={(e) => setRowField("costPerKg", e.target.value)}
                          className={`${INPUT_CLASS} w-24`}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="0.1"
                          value={rowDraft.upliftPercent}
                          onChange={(e) => setRowField("upliftPercent", e.target.value)}
                          className={`${INPUT_CLASS} w-20`}
                        />
                      </td>
                      <td className={`${TD_CLASS} text-center`}>
                        <input
                          type="checkbox"
                          checked={rowDraft.preferred}
                          onChange={(e) =>
                            setRowDraft((prev) => ({ ...prev, preferred: e.target.checked }))
                          }
                          aria-label="Preferred"
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                      </td>
                      <td className={TD_CLASS}>{refSale === null ? "—" : money(refSale)}</td>
                      <td className={TD_CLASS}>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            disabled={updateItem.isPending}
                            className="text-sm font-medium text-teal-700 hover:text-teal-800 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="text-sm font-medium text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                const bonding = item.bondingType;
                const colour = item.colour;
                const productName = item.productName;
                const cureType = item.cureType;
                const cureValue = cureType ?? "";
                const colourDisplay = colour ?? "—";
                const productNameDisplay = productName ?? "—";
                const shoreDisplay = item.shoreHardness === null ? "—" : item.shoreHardness;
                const costValue = item.costPerKg;
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className={`${TD_CLASS} font-medium text-gray-900`}>{item.supplier}</td>
                    <td className={TD_CLASS}>{item.productCode}</td>
                    <td className={TD_CLASS}>{productNameDisplay}</td>
                    <td className={TD_CLASS}>
                      <select
                        value={cureValue}
                        onChange={(e) => handleCureChange(item, e.target.value)}
                        aria-label="Cure type"
                        className={`${INPUT_CLASS} w-32`}
                      >
                        <option value="">—</option>
                        {CURE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={TD_CLASS}>
                      <select
                        value={bonding ?? ""}
                        onChange={(e) => handleBondingChange(item, e.target.value)}
                        aria-label="Rubber type"
                        className={`${INPUT_CLASS} w-36`}
                      >
                        <option value="">—</option>
                        {BONDING_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={TD_CLASS}>{colourDisplay}</td>
                    <td className={TD_CLASS}>{shoreDisplay}</td>
                    <td className={TD_CLASS}>{decimal(item.specificGravity, 2)}</td>
                    <td className={TD_CLASS}>
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={costValue === null ? "" : costValue}
                        key={`cost-${item.id}-${costValue ?? ""}`}
                        onBlur={(e) => handleInlineSave(item, "costPerKg", e.target.value)}
                        aria-label="Cost per kilogram"
                        className={`${INPUT_CLASS} w-24`}
                      />
                    </td>
                    <td className={TD_CLASS}>
                      <input
                        type="number"
                        step="0.1"
                        defaultValue={item.upliftPercent}
                        key={`uplift-${item.id}-${item.upliftPercent}`}
                        onBlur={(e) => handleInlineSave(item, "upliftPercent", e.target.value)}
                        aria-label="Uplift percent"
                        className={`${INPUT_CLASS} w-20`}
                      />
                    </td>
                    <td className={`${TD_CLASS} text-center`}>
                      <input
                        type="checkbox"
                        checked={item.preferred === true}
                        onChange={(e) => handleTogglePreferred(item, e.target.checked)}
                        aria-label="Preferred"
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                    </td>
                    <td className={`${TD_CLASS} font-semibold text-gray-900`}>
                      {refSale === null ? "—" : money(refSale)}
                    </td>
                    <td className={TD_CLASS}>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="text-sm font-medium text-teal-700 hover:text-teal-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          disabled={deleteItem.isPending}
                          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-50">
                <td className={TD_CLASS}>
                  <input
                    type="text"
                    value={newDraft.supplier}
                    placeholder="Supplier"
                    onChange={(e) => setNewField("supplier", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="text"
                    value={newDraft.productCode}
                    placeholder="Code"
                    onChange={(e) => setNewField("productCode", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="text"
                    value={newDraft.productName}
                    placeholder="Name"
                    onChange={(e) => setNewField("productName", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={TD_CLASS}>
                  <select
                    value={newDraft.cureType}
                    onChange={(e) => setNewField("cureType", e.target.value)}
                    aria-label="Cure type"
                    className={`${INPUT_CLASS} w-32`}
                  >
                    <option value="">—</option>
                    {CURE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={TD_CLASS}>
                  <select
                    value={newDraft.bondingType}
                    onChange={(e) => setNewField("bondingType", e.target.value)}
                    className={`${INPUT_CLASS} w-36`}
                  >
                    <option value="">—</option>
                    {BONDING_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="text"
                    value={newDraft.colour}
                    placeholder="Colour"
                    onChange={(e) => setNewField("colour", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="number"
                    step="1"
                    value={newDraft.shoreHardness}
                    onChange={(e) => setNewField("shoreHardness", e.target.value)}
                    className={`${INPUT_CLASS} w-20`}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="number"
                    step="0.01"
                    value={newDraft.specificGravity}
                    placeholder="SG"
                    onChange={(e) => setNewField("specificGravity", e.target.value)}
                    className={`${INPUT_CLASS} w-20`}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="number"
                    step="0.01"
                    value={newDraft.costPerKg}
                    onChange={(e) => setNewField("costPerKg", e.target.value)}
                    className={`${INPUT_CLASS} w-24`}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="number"
                    step="0.1"
                    value={newDraft.upliftPercent}
                    onChange={(e) => setNewField("upliftPercent", e.target.value)}
                    className={`${INPUT_CLASS} w-20`}
                  />
                </td>
                <td className={`${TD_CLASS} text-center`}>
                  <input
                    type="checkbox"
                    checked={newDraft.preferred}
                    onChange={(e) =>
                      setNewDraft((prev) => ({ ...prev, preferred: e.target.checked }))
                    }
                    aria-label="Preferred"
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                </td>
                <td className={TD_CLASS}>—</td>
                <td className={TD_CLASS}>
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={createItem.isPending}
                    className="text-sm font-medium text-teal-700 hover:text-teal-800 disabled:opacity-50"
                  >
                    Add
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {importPreview && (
        <ImportPreviewModal
          supplier={previewSupplier}
          rowCount={previewRows.length}
          mode={importMode}
          onModeChange={setImportMode}
          onCancel={() => setImportPreview(null)}
          onConfirm={handleConfirmImport}
          committing={commitImport.isPending}
          accentColor={accentColor}
          rows={previewRows}
        />
      )}

      {ConfirmDialog}
    </div>
  );
}

interface ImportPreviewModalProps {
  supplier: string;
  rowCount: number;
  mode: PriceListImportMode;
  onModeChange: (value: PriceListImportMode) => void;
  onCancel: () => void;
  onConfirm: () => void;
  committing: boolean;
  accentColor: string;
  rows: RubberPriceListImportPreview["rows"];
}

function ImportPreviewModal(props: ImportPreviewModalProps) {
  const rows = props.rows;
  const accentColor = props.accentColor;
  const committing = props.committing;
  const hasNoRows = rows.length === 0;
  if (isUndefined(globalThis.document)) {
    return null;
  }
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Review imported price list</h2>
          <p className="text-sm text-gray-500 mt-1">
            Supplier <span className="font-medium text-gray-700">{props.supplier}</span> —{" "}
            {props.rowCount} product{props.rowCount === 1 ? "" : "s"} read.
          </p>
        </div>
        <div className="p-5 overflow-auto flex-1">
          <div className="mb-4">
            <PriceListImportModeSelect
              value={props.mode}
              onChange={props.onModeChange}
              itemNoun="products"
            />
          </div>
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className={TH_CLASS}>Supplier</th>
                <th className={TH_CLASS}>Code</th>
                <th className={TH_CLASS}>Cure</th>
                <th className={TH_CLASS}>Bonding</th>
                <th className={TH_CLASS}>Colour</th>
                <th className={TH_CLASS}>Shore A</th>
                <th className={TH_CLASS}>SG</th>
                <th className={TH_CLASS}>Cost/kg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, index) => {
                const cost = row.costPerKg;
                const sg = row.specificGravity;
                const shore = row.shoreHardness;
                const bonding = row.bondingType;
                const colour = row.colour;
                const cureType = row.cureType;
                const cureDisplay = cureLabel(cureType);
                return (
                  <tr key={`${row.productCode}-${index}`}>
                    <td className={TD_CLASS}>{row.supplier}</td>
                    <td className={TD_CLASS}>{row.productCode}</td>
                    <td className={TD_CLASS}>{cureDisplay}</td>
                    <td className={TD_CLASS}>{bonding ?? "—"}</td>
                    <td className={TD_CLASS}>{colour ?? "—"}</td>
                    <td className={TD_CLASS}>{shore === null ? "—" : shore}</td>
                    <td className={TD_CLASS}>{sg === null ? "—" : decimal(sg, 2)}</td>
                    <td className={TD_CLASS}>{cost === null ? "—" : money(cost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={props.onCancel}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={props.onConfirm}
            disabled={committing || hasNoRows}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {committing ? "Importing…" : "Import products"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
