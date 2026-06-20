"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { FormModal } from "@/app/components/modals/FormModal";
import { useToast } from "@/app/components/Toast";
import { metricsApi } from "@/app/lib/api/metricsApi";
import type {
  CreatePaintPriceListItemInput,
  PaintBlastGrade,
  PaintCoatRole,
  PaintDiscountTier,
  PaintPackVariant,
  PaintPriceListImportPreview,
  PaintPriceListRow,
  PaintPricingConfig,
} from "@/app/lib/api/stockControlApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useBulkUpliftPaintPrices,
  useCommitPaintPriceListImport,
  useCreatePaintPriceItem,
  useDeletePaintPriceItem,
  useEnrichPaintPriceSpecs,
  useImportPaintPriceList,
  usePaintPricing,
  useUpdatePaintPriceItem,
  useUpdatePaintPricingConfig,
} from "@/app/lib/query/hooks";

const IMPORT_FALLBACK_MS = 60000;

const COAT_TYPES: { value: PaintCoatRole; label: string }[] = [
  { value: "primer", label: "Primer" },
  { value: "intermediate", label: "Intermediate" },
  { value: "final", label: "Final" },
];

const GENERIC_TYPES = [
  "zinc-rich-epoxy",
  "zinc-silicate",
  "epoxy",
  "epoxy-mio",
  "epoxy-mastic",
  "epoxy-phenolic",
  "epoxy-glass-flake",
  "coal-tar-epoxy",
  "polyurethane",
  "polysiloxane",
  "polyurea",
  "acrylic",
  "alkyd",
  "vinyl",
  "high-temp-silicone",
  "intumescent",
  "fbe",
  "3lpe",
  "bitumen",
];

const DEFAULT_BLAST_GRADES = ["SA3", "SA2.5", "SA2", "Flash blast"];

function seedBlastGrades(
  existing: PaintBlastGrade[] | undefined | null,
  tierNames: string[],
): PaintBlastGrade[] {
  const base =
    existing && existing.length > 0
      ? existing.map((grade) => ({
          grade: grade.grade,
          pricePerM2: grade.pricePerM2,
          tierPrices: grade.tierPrices.map((tier) => ({ ...tier })),
        }))
      : DEFAULT_BLAST_GRADES.map((grade) => ({ grade, pricePerM2: 0, tierPrices: [] }));
  return base.map((grade) => {
    const tierPrices = tierNames.map((name) => {
      const match = grade.tierPrices.find((tier) => tier.name === name);
      return match ? { name, pricePerM2: match.pricePerM2 } : { name, pricePerM2: 0 };
    });
    return { grade: grade.grade, pricePerM2: grade.pricePerM2, tierPrices };
  });
}

type EditableField = keyof CreatePaintPriceListItemInput;

interface RowDraft {
  supplierName: string;
  coatType: string;
  productName: string;
  paintType: string;
  packSizeLitres: string;
  volumeSolidsPercent: string;
  costPerLitre: string;
  costPerKit: string;
  upliftPercent: string;
  recommendedMicrons: string;
  micronsOverride: string;
  thinnerName: string;
  thinnerPricePerLitre: string;
  maxThinningPercent: string;
  preferred: boolean;
}

const EMPTY_DRAFT: RowDraft = {
  supplierName: "",
  coatType: "",
  productName: "",
  paintType: "",
  packSizeLitres: "",
  volumeSolidsPercent: "",
  costPerLitre: "",
  costPerKit: "",
  upliftPercent: "",
  recommendedMicrons: "",
  micronsOverride: "",
  thinnerName: "",
  thinnerPricePerLitre: "",
  maxThinningPercent: "",
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

function coatOrNull(value: string): PaintCoatRole | null {
  if (value === "primer" || value === "intermediate" || value === "final") return value;
  return null;
}

function draftFromRow(row: PaintPriceListRow): RowDraft {
  const item = row.item;
  const coatType = item.coatType;
  const paintType = item.paintType;
  const thinnerName = item.thinnerName;
  return {
    supplierName: item.supplierName,
    coatType: coatType ?? "",
    productName: item.productName,
    paintType: paintType ?? "",
    packSizeLitres: item.packSizeLitres === null ? "" : String(item.packSizeLitres),
    volumeSolidsPercent: String(item.volumeSolidsPercent),
    costPerLitre: String(item.costPerLitre),
    costPerKit: item.costPerKit === null ? "" : String(item.costPerKit),
    upliftPercent: String(item.upliftPercent),
    recommendedMicrons: item.recommendedMicrons === null ? "" : String(item.recommendedMicrons),
    micronsOverride: item.micronsOverride === null ? "" : String(item.micronsOverride),
    thinnerName: thinnerName ?? "",
    thinnerPricePerLitre:
      item.thinnerPricePerLitre === null ? "" : String(item.thinnerPricePerLitre),
    maxThinningPercent: item.maxThinningPercent === null ? "" : String(item.maxThinningPercent),
    preferred: item.preferred === true,
  };
}

function draftToInput(draft: RowDraft): CreatePaintPriceListItemInput {
  const volumeSolids = numberOrNull(draft.volumeSolidsPercent);
  const costPerLitre = numberOrNull(draft.costPerLitre);
  return {
    supplierName: draft.supplierName.trim(),
    coatType: coatOrNull(draft.coatType),
    productName: draft.productName.trim(),
    paintType: textOrNull(draft.paintType),
    packSizeLitres: numberOrNull(draft.packSizeLitres),
    volumeSolidsPercent: volumeSolids ?? 0,
    costPerLitre: costPerLitre ?? 0,
    costPerKit: numberOrNull(draft.costPerKit),
    upliftPercent: numberOrNull(draft.upliftPercent),
    recommendedMicrons: numberOrNull(draft.recommendedMicrons),
    micronsOverride: numberOrNull(draft.micronsOverride),
    thinnerName: textOrNull(draft.thinnerName),
    thinnerPricePerLitre: numberOrNull(draft.thinnerPricePerLitre),
    maxThinningPercent: numberOrNull(draft.maxThinningPercent),
    preferred: draft.preferred,
  };
}

function draftIsValid(draft: RowDraft): boolean {
  const hasSupplier = draft.supplierName.trim() !== "";
  const hasProduct = draft.productName.trim() !== "";
  const hasSolids = numberOrNull(draft.volumeSolidsPercent) !== null;
  const hasCost = numberOrNull(draft.costPerLitre) !== null;
  return hasSupplier && hasProduct && hasSolids && hasCost;
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

const INPUT_CLASS =
  "w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500";

const TH_CLASS =
  "px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap";

const TH_CLASS_PLAIN =
  "px-3 py-2 text-left text-xs font-semibold text-gray-600 tracking-wide whitespace-nowrap";

const TD_CLASS = "px-3 py-2 text-sm text-gray-700 whitespace-nowrap";

const FROZEN_TH_FIRST = `${TH_CLASS} sticky left-0 top-0 z-30 bg-gray-50 w-40 min-w-[10rem]`;

const FROZEN_TH_SECOND = `${TH_CLASS} sticky left-[10rem] top-0 z-30 bg-gray-50 w-56 min-w-[14rem]`;

const STICKY_TH = `${TH_CLASS} sticky top-0 z-20 bg-gray-50`;

const STICKY_TH_PLAIN = `${TH_CLASS_PLAIN} sticky top-0 z-20 bg-gray-50`;

const FROZEN_TD_FIRST = `${TD_CLASS} sticky left-0 z-10 bg-white w-40 min-w-[10rem]`;

const FROZEN_TD_SECOND = `${TD_CLASS} sticky left-[10rem] z-10 bg-white w-56 min-w-[14rem]`;

const FROZEN_TD_FIRST_EDIT = `${TD_CLASS} sticky left-0 z-10 bg-teal-50 w-40 min-w-[10rem]`;

const FROZEN_TD_SECOND_EDIT = `${TD_CLASS} sticky left-[10rem] z-10 bg-teal-50 w-56 min-w-[14rem]`;

const FROZEN_TD_FIRST_NEW = `${TD_CLASS} sticky left-0 z-10 bg-gray-50 w-40 min-w-[10rem]`;

const FROZEN_TD_SECOND_NEW = `${TD_CLASS} sticky left-[10rem] z-10 bg-gray-50 w-56 min-w-[14rem]`;

export default function PaintPricingPage() {
  const query = usePaintPricing();
  const createItem = useCreatePaintPriceItem();
  const updateItem = useUpdatePaintPriceItem();
  const deleteItem = useDeletePaintPriceItem();
  const saveConfig = useUpdatePaintPricingConfig();
  const importPriceList = useImportPaintPriceList();
  const commitImport = useCommitPaintPriceListImport();
  const enrichSpecs = useEnrichPaintPriceSpecs();
  const bulkUplift = useBulkUpliftPaintPrices();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showExtraction, hideExtraction } = useExtractionProgress();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [rowDraft, setRowDraft] = useState<RowDraft>(EMPTY_DRAFT);
  const [newDraft, setNewDraft] = useState<RowDraft>(EMPTY_DRAFT);
  const [configDraft, setConfigDraft] = useState<PaintPricingConfig | null>(null);
  const [importPreview, setImportPreview] = useState<PaintPriceListImportPreview | null>(null);
  const [replaceSupplier, setReplaceSupplier] = useState(true);
  const [bulkUpliftValue, setBulkUpliftValue] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [coatFilter, setCoatFilter] = useState("all");
  const [paintTypeFilter, setPaintTypeFilter] = useState("all");
  const [expandedRowIds, setExpandedRowIds] = useState<Set<number>>(new Set());

  const data = query.data;
  const config = data ? data.config : null;
  const rows = data ? data.rows : [];
  const firstRow = rows[0];
  const tierNames = firstRow ? firstRow.pricing.tierPrices.map((tier) => tier.name) : [];
  const enrichPending = enrichSpecs.isPending;
  const importPending = importPriceList.isPending;
  const bulkUpliftPending = bulkUplift.isPending;
  const hasRows = rows.length > 0;

  const supplierOptions = Array.from(
    new Set(rows.map((row) => row.item.supplierName).filter((name) => name !== "")),
  ).sort((a, b) => a.localeCompare(b));
  const paintTypeOptions = Array.from(
    new Set(rows.map((row) => row.item.paintType).filter((type): type is string => type !== null)),
  ).sort((a, b) => a.localeCompare(b));

  const pricingRows = rows.filter((row) => {
    const isPricingVariant = row.isPricingVariant;
    return isPricingVariant;
  });

  const filteredRows = pricingRows.filter((row) => {
    const item = row.item;
    const supplierMatch = supplierFilter === "all" || item.supplierName === supplierFilter;
    const coatMatch = coatFilter === "all" || item.coatType === coatFilter;
    const paintTypeMatch = paintTypeFilter === "all" || item.paintType === paintTypeFilter;
    return supplierMatch && coatMatch && paintTypeMatch;
  });

  const totalProducts = pricingRows.length;
  const pricingRowsShown = filteredRows.length;

  const filtersActive =
    supplierFilter !== "all" || coatFilter !== "all" || paintTypeFilter !== "all";

  const toggleExpanded = useCallback((id: number) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      const isOpen = next.has(id);
      if (isOpen) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (config) {
      const tierNames = config.discountTiers.map((tier) => tier.name);
      setConfigDraft({
        applicationCostPerM2: config.applicationCostPerM2,
        markupFactor: config.markupFactor,
        lossPct: config.lossPct,
        discountTiers: config.discountTiers.map((tier) => ({ ...tier })),
        blastGrades: seedBlastGrades(config.blastGrades, tierNames),
      });
    }
  }, [config]);

  const startEdit = useCallback((row: PaintPriceListRow) => {
    setEditingId(row.item.id);
    setRowDraft(draftFromRow(row));
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setRowDraft(EMPTY_DRAFT);
  }, []);

  const handleInlineSave = useCallback(
    (item: PaintPriceListRow["item"], field: "upliftPercent" | "micronsOverride", raw: string) => {
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

  const handleInlineCoatSave = useCallback(
    (item: PaintPriceListRow["item"], value: string) => {
      const nextValue = coatOrNull(value);
      if (nextValue === item.coatType) {
        return;
      }
      updateItem.mutate(
        { id: item.id, input: { coatType: nextValue } },
        { onError: () => showToast("Could not save the change — please try again.", "error") },
      );
    },
    [updateItem, showToast],
  );

  const handleInlineGenericTypeSave = useCallback(
    (item: PaintPriceListRow["item"], value: string) => {
      const nextValue = value === "" ? null : value;
      const currentValue = item.genericType;
      if (nextValue === currentValue) {
        return;
      }
      updateItem.mutate(
        { id: item.id, input: { genericType: nextValue } },
        { onError: () => showToast("Could not save the change — please try again.", "error") },
      );
    },
    [updateItem, showToast],
  );

  const handleTogglePreferred = useCallback(
    (item: PaintPriceListRow["item"], next: boolean) => {
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

  const handleSaveEdit = useCallback(
    (id: number) => {
      if (!draftIsValid(rowDraft)) {
        showToast("Supplier, product, vol solids and cost/litre are required.", "warning");
        return;
      }
      updateItem.mutate(
        { id, input: draftToInput(rowDraft) },
        {
          onSuccess: () => {
            showToast("Paint updated.", "success");
            setEditingId(null);
            setRowDraft(EMPTY_DRAFT);
          },
          onError: () => showToast("Could not update paint — please try again.", "error"),
        },
      );
    },
    [rowDraft, updateItem, showToast],
  );

  const handleAdd = useCallback(() => {
    if (!draftIsValid(newDraft)) {
      showToast("Supplier, product, vol solids and cost/litre are required.", "warning");
      return;
    }
    createItem.mutate(draftToInput(newDraft), {
      onSuccess: () => {
        showToast("Paint added.", "success");
        setNewDraft(EMPTY_DRAFT);
      },
      onError: () => showToast("Could not add paint — please try again.", "error"),
    });
  }, [newDraft, createItem, showToast]);

  const handleDelete = useCallback(
    async (row: PaintPriceListRow) => {
      const confirmed = await confirm({
        title: "Delete paint",
        message: `Remove "${row.item.productName}" from the price list? This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!confirmed) return;
      deleteItem.mutate(row.item.id, {
        onSuccess: () => showToast("Paint deleted.", "success"),
        onError: () => showToast("Could not delete paint — please try again.", "error"),
      });
    },
    [confirm, deleteItem, showToast],
  );

  const handleDeletePack = useCallback(
    async (productName: string, variant: PaintPackVariant) => {
      const packSize = variant.packSizeLitres;
      const packLabel = packSize === null ? "this pack" : `the ${packSize}L pack`;
      const confirmed = await confirm({
        title: "Delete pack",
        message: `Remove ${packLabel} of "${productName}" from the price list? This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!confirmed) return;
      deleteItem.mutate(variant.id, {
        onSuccess: () => showToast("Pack deleted.", "success"),
        onError: () => showToast("Could not delete pack — please try again.", "error"),
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

  const handleImportFile = useCallback(
    async (file: File) => {
      try {
        const stats = await metricsApi
          .extractionStats("stock-control-paint-pricing", "import")
          .catch(() => null);
        const learnedMs = stats == null ? null : stats.averageMs;
        const estimatedDurationMs =
          learnedMs == null || learnedMs <= 0 ? IMPORT_FALLBACK_MS : learnedMs;
        showExtraction({
          brand: "stock-control",
          label: "Reading price list…",
          estimatedDurationMs,
        });
        const preview = await importPriceList.mutateAsync(file);
        setImportPreview(preview);
        setReplaceSupplier(true);
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

  const handleEnrichSpecs = useCallback(async () => {
    try {
      const stats = await metricsApi
        .extractionStats("stock-control-paint-pricing", "enrich")
        .catch(() => null);
      const learnedMs = stats == null ? null : stats.averageMs;
      const estimatedDurationMs =
        learnedMs == null || learnedMs <= 0 ? IMPORT_FALLBACK_MS : learnedMs;
      showExtraction({
        brand: "stock-control",
        label: "Nix is finding missing specs…",
        estimatedDurationMs,
      });
      const result = await enrichSpecs.mutateAsync();
      const enriched = result.enriched;
      const checked = result.checked;
      const rawUnfilled = result.unfilled;
      const unfilled = rawUnfilled ?? [];
      const unfilledSummary = unfilled
        .map((entry) => {
          const missingList = entry.missing.join(", ");
          return `${entry.productName} (${missingList})`;
        })
        .join("; ");
      if (enriched > 0 && unfilled.length === 0) {
        showToast(`Filled specs on ${enriched} of ${checked} paints.`, "success");
      } else if (enriched > 0 && unfilled.length > 0) {
        showToast(
          `Filled ${enriched}; still missing on ${unfilled.length}: ${unfilledSummary}. Set these by hand.`,
          "warning",
        );
      } else if (unfilled.length > 0) {
        showToast(
          `Could not fill ${unfilled.length} paint${unfilled.length === 1 ? "" : "s"}: ${unfilledSummary}. Set these by hand.`,
          "warning",
        );
      } else {
        showToast("No missing specs were found to fill.", "info");
      }
    } catch {
      showToast("Could not look up the missing specs — please try again.", "error");
    } finally {
      hideExtraction();
    }
  }, [enrichSpecs, showExtraction, hideExtraction, showToast]);

  const handleConfirmImport = useCallback(() => {
    const preview = importPreview;
    if (!preview) return;
    commitImport.mutate(
      { supplierName: preview.supplierName, replaceSupplier, rows: preview.rows },
      {
        onSuccess: (result) => {
          showToast(`Imported ${result.imported} paints.`, "success");
          setImportPreview(null);
        },
        onError: () => showToast("Could not import the price list — please try again.", "error"),
      },
    );
  }, [importPreview, replaceSupplier, commitImport, showToast]);

  const handleBulkUplift = useCallback(async () => {
    const trimmed = bulkUpliftValue.trim();
    const parsedValue = trimmed === "" ? 0 : numberOrNull(bulkUpliftValue);
    if (parsedValue === null || parsedValue < 0) {
      showToast("Enter a valid uplift percentage (0 or more) to apply.", "warning");
      return;
    }
    const parsed = parsedValue;
    const confirmed = await confirm({
      title: "Apply bulk uplift",
      message: `Set the uplift to ${parsed}% on every paint in the list? This overwrites the uplift on all rows.`,
      confirmLabel: "Apply to all",
      variant: "warning",
    });
    if (!confirmed) return;
    bulkUplift.mutate(parsed, {
      onSuccess: (result) => {
        const updated = result.updated;
        showToast(
          `Applied ${parsed}% uplift to ${updated} paint${updated === 1 ? "" : "s"}.`,
          "success",
        );
        setBulkUpliftValue("");
      },
      onError: () => showToast("Could not apply the bulk uplift — please try again.", "error"),
    });
  }, [bulkUpliftValue, confirm, bulkUplift, showToast]);

  const updateConfigNumber = useCallback(
    (field: "applicationCostPerM2" | "markupFactor" | "lossPct", value: string) => {
      const parsed = numberOrNull(value);
      setConfigDraft((prev) => {
        if (!prev) return prev;
        return { ...prev, [field]: parsed ?? 0 };
      });
    },
    [],
  );

  const addTier = useCallback(() => {
    setConfigDraft((prev) => {
      if (!prev) return prev;
      const nextTiers = [...prev.discountTiers, { name: "", discountPercent: 0 }];
      const nextTierNames = nextTiers.map((tier) => tier.name);
      return {
        ...prev,
        discountTiers: nextTiers,
        blastGrades: seedBlastGrades(prev.blastGrades, nextTierNames),
      };
    });
  }, []);

  const removeTier = useCallback((index: number) => {
    setConfigDraft((prev) => {
      if (!prev) return prev;
      const nextTiers = prev.discountTiers.filter((_, idx) => idx !== index);
      const nextTierNames = nextTiers.map((tier) => tier.name);
      return {
        ...prev,
        discountTiers: nextTiers,
        blastGrades: seedBlastGrades(prev.blastGrades, nextTierNames),
      };
    });
  }, []);

  const updateTier = useCallback((index: number, field: keyof PaintDiscountTier, value: string) => {
    setConfigDraft((prev) => {
      if (!prev) return prev;
      const previousTier = prev.discountTiers[index];
      const previousName = previousTier ? previousTier.name : "";
      const nextTiers = prev.discountTiers.map((tier, idx) => {
        if (idx !== index) return tier;
        if (field === "name") return { ...tier, name: value };
        const parsedDiscount = numberOrNull(value);
        return { ...tier, discountPercent: parsedDiscount ?? 0 };
      });
      if (field !== "name") {
        return { ...prev, discountTiers: nextTiers };
      }
      const renamedGrades = prev.blastGrades.map((grade) => ({
        grade: grade.grade,
        pricePerM2: grade.pricePerM2,
        tierPrices: grade.tierPrices.map((tier) =>
          tier.name === previousName ? { name: value, pricePerM2: tier.pricePerM2 } : tier,
        ),
      }));
      const nextTierNames = nextTiers.map((tier) => tier.name);
      return {
        ...prev,
        discountTiers: nextTiers,
        blastGrades: seedBlastGrades(renamedGrades, nextTierNames),
      };
    });
  }, []);

  const updateBlastGradePrice = useCallback((gradeIndex: number, value: string) => {
    const parsed = numberOrNull(value);
    setConfigDraft((prev) => {
      if (!prev) return prev;
      const nextGrades = prev.blastGrades.map((grade, idx) => {
        if (idx !== gradeIndex) return grade;
        return { ...grade, pricePerM2: parsed ?? 0 };
      });
      return { ...prev, blastGrades: nextGrades };
    });
  }, []);

  const updateBlastTierPrice = useCallback(
    (gradeIndex: number, tierName: string, value: string) => {
      const parsed = numberOrNull(value);
      setConfigDraft((prev) => {
        if (!prev) return prev;
        const nextGrades = prev.blastGrades.map((grade, idx) => {
          if (idx !== gradeIndex) return grade;
          const nextTierPrices = grade.tierPrices.map((tier) =>
            tier.name === tierName ? { name: tier.name, pricePerM2: parsed ?? 0 } : tier,
          );
          return { ...grade, tierPrices: nextTierPrices };
        });
        return { ...prev, blastGrades: nextGrades };
      });
    },
    [],
  );

  const setRowField = useCallback((field: EditableField, value: string) => {
    setRowDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setNewField = useCallback((field: EditableField, value: string) => {
    setNewDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setRowPreferred = useCallback((value: boolean) => {
    setRowDraft((prev) => ({ ...prev, preferred: value }));
  }, []);

  const setNewPreferred = useCallback((value: boolean) => {
    setNewDraft((prev) => ({ ...prev, preferred: value }));
  }, []);

  const queryIsLoading = query.isLoading;
  const queryIsError = query.isError;

  if (queryIsLoading) {
    return <div className="p-8 text-center text-gray-500">Loading paint pricing…</div>;
  }

  if (queryIsError || !data || !configDraft) {
    return (
      <div className="p-8 text-center text-gray-500">
        Could not load paint pricing — please try again.
      </div>
    );
  }

  const previewSupplierName = importPreview ? importPreview.supplierName : "";
  const previewRows = importPreview ? importPreview.rows : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paint Pricing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Maintain the paint price list and the markup, application cost and discount tiers used to
          quote coating work per square metre.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Pricing settings</h2>
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={saveConfig.isPending}
            className="inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {saveConfig.isPending ? "Saving…" : "Save settings"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Application cost (R/m²)</span>
            <input
              type="number"
              step="0.01"
              value={configDraft.applicationCostPerM2}
              onChange={(e) => updateConfigNumber("applicationCostPerM2", e.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Markup factor</span>
            <input
              type="number"
              step="0.01"
              value={configDraft.markupFactor}
              onChange={(e) => updateConfigNumber("markupFactor", e.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Flat-plate loss %</span>
            <input
              type="number"
              step="0.1"
              value={configDraft.lossPct}
              onChange={(e) => updateConfigNumber("lossPct", e.target.value)}
              className={INPUT_CLASS}
            />
          </label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Discount tiers</span>
            <button
              type="button"
              onClick={addTier}
              className="text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              + Add tier
            </button>
          </div>
          {configDraft.discountTiers.length === 0 ? (
            <p className="text-sm text-gray-400">No discount tiers configured.</p>
          ) : (
            <div className="space-y-2">
              {configDraft.discountTiers.map((tier, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={tier.name}
                    placeholder="Tier name"
                    onChange={(e) => updateTier(index, "name", e.target.value)}
                    className={`${INPUT_CLASS} max-w-xs`}
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      value={tier.discountPercent}
                      onChange={(e) => updateTier(index, "discountPercent", e.target.value)}
                      className={`${INPUT_CLASS} w-24`}
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTier(index)}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-gray-100 pt-4">
          <span className="text-sm font-medium text-gray-700">Blasting prices (R/m²)</span>
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className={TH_CLASS}>Grade</th>
                  <th className={TH_CLASS}>Standard R/m²</th>
                  {configDraft.discountTiers.map((tier, index) => (
                    <th key={index} className={TH_CLASS}>
                      {tier.name ? tier.name : `Tier ${index + 1}`} R/m²
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {configDraft.blastGrades.map((grade, gradeIndex) => (
                  <tr key={grade.grade}>
                    <td className={`${TD_CLASS} font-medium text-gray-900`}>{grade.grade}</td>
                    <td className={TD_CLASS}>
                      <input
                        type="number"
                        step="0.01"
                        value={grade.pricePerM2}
                        onChange={(e) => updateBlastGradePrice(gradeIndex, e.target.value)}
                        aria-label={`${grade.grade} standard price per square metre`}
                        className={`${INPUT_CLASS} w-28`}
                      />
                    </td>
                    {configDraft.discountTiers.map((tier, tierIndex) => {
                      const tierName = tier.name;
                      const tierPrice = grade.tierPrices.find((entry) => entry.name === tierName);
                      const priceValue = tierPrice ? tierPrice.pricePerM2 : 0;
                      return (
                        <td key={tierIndex} className={TD_CLASS}>
                          <input
                            type="number"
                            step="0.01"
                            value={priceValue}
                            onChange={(e) =>
                              updateBlastTierPrice(gradeIndex, tierName, e.target.value)
                            }
                            aria-label={`${grade.grade} ${tierName || `tier ${tierIndex + 1}`} price per square metre`}
                            className={`${INPUT_CLASS} w-28`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">
            Blank or zero tier prices fall back to the standard rate when quoting.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Paint price list</h2>
            <p className="text-sm text-gray-500 mt-1">
              {filtersActive
                ? `Showing ${pricingRowsShown} of ${totalProducts} products`
                : `${totalProducts} product${totalProducts === 1 ? "" : "s"}`}
              . Products sold in several pack sizes show once at the higher per-litre price; expand
              a row to see all packs (purchasing picks the best pack per job). Computed coverage and
              pricing columns are read-only. Upload a supplier price list (PDF or Excel) to populate
              it.
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
                className="inline-flex items-center justify-center rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {bulkUpliftPending ? "Applying…" : "Apply to all"}
              </button>
            </div>
            <button
              type="button"
              onClick={handleEnrichSpecs}
              disabled={enrichPending || !hasRows}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {enrichPending ? "Finding…" : "Find missing specs (Nix)"}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importPending}
              className="inline-flex items-center justify-center rounded-md border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
            >
              {importPending ? "Reading…" : "Upload supplier price list"}
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium whitespace-nowrap">Supplier</span>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              aria-label="Filter by supplier"
              className={`${INPUT_CLASS} w-44`}
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
            <span className="font-medium whitespace-nowrap">Coat type</span>
            <select
              value={coatFilter}
              onChange={(e) => setCoatFilter(e.target.value)}
              aria-label="Filter by coat type"
              className={`${INPUT_CLASS} w-44`}
            >
              <option value="all">All coat types</option>
              {COAT_TYPES.map((coat) => (
                <option key={coat.value} value={coat.value}>
                  {coat.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium whitespace-nowrap">Paint type</span>
            <select
              value={paintTypeFilter}
              onChange={(e) => setPaintTypeFilter(e.target.value)}
              aria-label="Filter by paint type"
              className={`${INPUT_CLASS} w-44`}
            >
              <option value="all">All paint types</option>
              {paintTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-auto max-h-[70vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={FROZEN_TH_FIRST}>Supplier</th>
                <th className={FROZEN_TH_SECOND}>Product</th>
                <th className={STICKY_TH}>Preferred</th>
                <th className={STICKY_TH}>Paint type</th>
                <th className={STICKY_TH}>Technology</th>
                <th className={STICKY_TH}>Coat type</th>
                <th className={STICKY_TH}>Pack (L)</th>
                <th className={STICKY_TH}>Vol solids %</th>
                <th className={STICKY_TH}>Cost/L</th>
                <th className={STICKY_TH}>Cost/kit</th>
                <th className={STICKY_TH}>Uplift %</th>
                <th className={STICKY_TH_PLAIN}>Rec µm</th>
                <th className={STICKY_TH_PLAIN}>µm override</th>
                <th className={STICKY_TH}>Thinner</th>
                <th className={STICKY_TH}>Thinner R/L</th>
                <th className={STICKY_TH}>Max thin %</th>
                <th className={STICKY_TH}>Flat-plate cover (m²/L)</th>
                <th className={STICKY_TH}>Cover after loss</th>
                <th className={STICKY_TH}>Thinner cost/m²</th>
                <th className={STICKY_TH}>Cost/m²</th>
                <th className={STICKY_TH}>Sale/m²</th>
                {tierNames.map((name) => (
                  <th key={name} className={STICKY_TH}>
                    {name} /m²
                  </th>
                ))}
                <th className={STICKY_TH}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((row) => {
                const isEditing = editingId === row.item.id;
                const item = row.item;
                const pricing = row.pricing;
                const editGenericType = item.genericType;
                if (isEditing) {
                  return (
                    <tr key={item.id} className="bg-teal-50/40">
                      <td className={FROZEN_TD_FIRST_EDIT}>
                        <input
                          type="text"
                          value={rowDraft.supplierName}
                          onChange={(e) => setRowField("supplierName", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={FROZEN_TD_SECOND_EDIT}>
                        <input
                          type="text"
                          value={rowDraft.productName}
                          onChange={(e) => setRowField("productName", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={`${TD_CLASS} text-center`}>
                        <input
                          type="checkbox"
                          checked={rowDraft.preferred}
                          onChange={(e) => setRowPreferred(e.target.checked)}
                          aria-label="Preferred"
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="text"
                          value={rowDraft.paintType}
                          onChange={(e) => setRowField("paintType", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <select
                          defaultValue={editGenericType ?? ""}
                          key={`generic-${item.id}-${editGenericType ?? ""}`}
                          onChange={(e) => handleInlineGenericTypeSave(item, e.target.value)}
                          aria-label="Technology"
                          className={`${INPUT_CLASS} w-40`}
                        >
                          <option value="">—</option>
                          {GENERIC_TYPES.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={TD_CLASS}>
                        <select
                          value={rowDraft.coatType}
                          onChange={(e) => setRowField("coatType", e.target.value)}
                          className={INPUT_CLASS}
                        >
                          <option value="">—</option>
                          {COAT_TYPES.map((coat) => (
                            <option key={coat.value} value={coat.value}>
                              {coat.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="0.1"
                          value={rowDraft.packSizeLitres}
                          onChange={(e) => setRowField("packSizeLitres", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="0.1"
                          value={rowDraft.volumeSolidsPercent}
                          onChange={(e) => setRowField("volumeSolidsPercent", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="0.01"
                          value={rowDraft.costPerLitre}
                          onChange={(e) => setRowField("costPerLitre", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="0.01"
                          value={rowDraft.costPerKit}
                          onChange={(e) => setRowField("costPerKit", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="0.1"
                          value={rowDraft.upliftPercent}
                          onChange={(e) => setRowField("upliftPercent", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="1"
                          value={rowDraft.recommendedMicrons}
                          onChange={(e) => setRowField("recommendedMicrons", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="1"
                          value={rowDraft.micronsOverride}
                          onChange={(e) => setRowField("micronsOverride", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="text"
                          value={rowDraft.thinnerName}
                          onChange={(e) => setRowField("thinnerName", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="0.01"
                          value={rowDraft.thinnerPricePerLitre}
                          onChange={(e) => setRowField("thinnerPricePerLitre", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="0.1"
                          value={rowDraft.maxThinningPercent}
                          onChange={(e) => setRowField("maxThinningPercent", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        {decimal(pricing.flatPlateCoverageM2PerLitre, 2)}
                      </td>
                      <td className={TD_CLASS}>
                        {decimal(pricing.coverageAfterLossM2PerLitre, 2)}
                      </td>
                      <td className={TD_CLASS}>{money(pricing.thinnerCostPerM2)}</td>
                      <td className={TD_CLASS}>{money(pricing.costPerM2)}</td>
                      <td className={TD_CLASS}>{money(pricing.salePerM2)}</td>
                      {pricing.tierPrices.map((tier) => (
                        <td key={tier.name} className={TD_CLASS}>
                          {money(tier.pricePerM2)}
                        </td>
                      ))}
                      <td className={TD_CLASS}>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            disabled={updateItem.isPending}
                            className="text-sm font-medium text-teal-600 hover:text-teal-700 disabled:opacity-50"
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
                const paintTypeValue = item.paintType;
                const paintTypeDisplay = paintTypeValue ?? "—";
                const rawGenericType = item.genericType;
                const rawCoatType = item.coatType;
                const packValue = item.packSizeLitres;
                const packDisplay = packValue ?? "—";
                const packVariants = row.packVariants;
                const packCount = packVariants.length;
                const hasMultiplePacks = packCount > 1;
                const isExpanded = expandedRowIds.has(item.id);
                const totalColumns = 22 + tierNames.length;
                const recMicronsValue = item.recommendedMicrons;
                const recMicronsDisplay = recMicronsValue ?? "—";
                const micronsOverrideValue = item.micronsOverride;
                const thinnerNameValue = item.thinnerName;
                const thinnerNameDisplay = thinnerNameValue ?? "—";
                const maxThinValue = item.maxThinningPercent;
                const maxThinDisplay = maxThinValue ?? "—";
                return (
                  <Fragment key={item.id}>
                    <tr className="hover:bg-gray-50">
                      <td className={FROZEN_TD_FIRST}>{item.supplierName}</td>
                      <td className={FROZEN_TD_SECOND}>{item.productName}</td>
                      <td className={`${TD_CLASS} text-center`}>
                        <input
                          type="checkbox"
                          checked={item.preferred === true}
                          onChange={(e) => handleTogglePreferred(item, e.target.checked)}
                          aria-label="Preferred"
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                      </td>
                      <td className={TD_CLASS}>{paintTypeDisplay}</td>
                      <td className={TD_CLASS}>
                        <select
                          defaultValue={rawGenericType ?? ""}
                          key={`generic-${item.id}-${rawGenericType ?? ""}`}
                          onChange={(e) => handleInlineGenericTypeSave(item, e.target.value)}
                          aria-label="Technology"
                          className={`${INPUT_CLASS} w-40`}
                        >
                          <option value="">—</option>
                          {GENERIC_TYPES.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={TD_CLASS}>
                        <select
                          defaultValue={rawCoatType ?? ""}
                          key={`coat-${item.id}-${rawCoatType ?? ""}`}
                          onChange={(e) => handleInlineCoatSave(item, e.target.value)}
                          aria-label="Coat type"
                          className={`${INPUT_CLASS} w-32`}
                        >
                          <option value="">—</option>
                          {COAT_TYPES.map((coat) => (
                            <option key={coat.value} value={coat.value}>
                              {coat.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={TD_CLASS}>
                        <div className="flex items-center gap-2">
                          <span>{packDisplay}</span>
                          {hasMultiplePacks ? (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(item.id)}
                              aria-label={`${isExpanded ? "Hide" : "Show"} all ${packCount} packs`}
                              className="inline-flex items-center gap-0.5 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 hover:bg-teal-100"
                            >
                              <span>{isExpanded ? "▴" : "▾"}</span>
                              <span>{packCount} packs</span>
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className={TD_CLASS}>{item.volumeSolidsPercent}</td>
                      <td className={TD_CLASS}>{money(item.costPerLitre)}</td>
                      <td className={TD_CLASS}>
                        {item.costPerKit === null ? "—" : money(item.costPerKit)}
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
                      <td className={TD_CLASS}>{recMicronsDisplay}</td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="1"
                          defaultValue={micronsOverrideValue ?? ""}
                          key={`mo-${item.id}-${micronsOverrideValue ?? ""}`}
                          onBlur={(e) => handleInlineSave(item, "micronsOverride", e.target.value)}
                          aria-label="Microns override"
                          className={`${INPUT_CLASS} w-20`}
                        />
                      </td>
                      <td className={TD_CLASS}>{thinnerNameDisplay}</td>
                      <td className={TD_CLASS}>
                        {item.thinnerPricePerLitre === null
                          ? "—"
                          : money(item.thinnerPricePerLitre)}
                      </td>
                      <td className={TD_CLASS}>{maxThinDisplay}</td>
                      <td className={TD_CLASS}>
                        {decimal(pricing.flatPlateCoverageM2PerLitre, 2)}
                      </td>
                      <td className={TD_CLASS}>
                        {decimal(pricing.coverageAfterLossM2PerLitre, 2)}
                      </td>
                      <td className={TD_CLASS}>{money(pricing.thinnerCostPerM2)}</td>
                      <td className={TD_CLASS}>{money(pricing.costPerM2)}</td>
                      <td className={`${TD_CLASS} font-semibold text-gray-900`}>
                        {money(pricing.salePerM2)}
                      </td>
                      {pricing.tierPrices.map((tier) => (
                        <td key={tier.name} className={TD_CLASS}>
                          {money(tier.pricePerM2)}
                        </td>
                      ))}
                      <td className={TD_CLASS}>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            className="text-sm font-medium text-teal-600 hover:text-teal-700"
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
                    {hasMultiplePacks && isExpanded ? (
                      <tr className="bg-gray-50">
                        <td
                          className={`${TD_CLASS} sticky left-0 z-10 bg-gray-50`}
                          colSpan={totalColumns}
                        >
                          <div className="space-y-1.5 py-1">
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              All packs for {item.productName}
                            </div>
                            {packVariants.map((variant) => {
                              const variantPack = variant.packSizeLitres;
                              const variantPackDisplay =
                                variantPack === null ? "—" : `${variantPack} L`;
                              const variantKit = variant.costPerKit;
                              const variantKitDisplay =
                                variantKit === null ? "—" : money(variantKit);
                              const isPricingPack = variant.id === item.id;
                              return (
                                <div
                                  key={variant.id}
                                  className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-700"
                                >
                                  <span className="w-20 font-medium text-gray-900">
                                    {variantPackDisplay}
                                  </span>
                                  <span className="w-32">{money(variant.costPerLitre)} / L</span>
                                  <span className="w-32">Kit {variantKitDisplay}</span>
                                  {isPricingPack ? (
                                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                                      pricing
                                    </span>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePack(item.productName, variant)}
                                    disabled={deleteItem.isPending}
                                    className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                                  >
                                    Delete
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}

              <tr className="bg-gray-50/60">
                <td className={FROZEN_TD_FIRST_NEW}>
                  <input
                    type="text"
                    value={newDraft.supplierName}
                    placeholder="Supplier"
                    onChange={(e) => setNewField("supplierName", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={FROZEN_TD_SECOND_NEW}>
                  <input
                    type="text"
                    value={newDraft.productName}
                    placeholder="Product"
                    onChange={(e) => setNewField("productName", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={`${TD_CLASS} text-center`}>
                  <input
                    type="checkbox"
                    checked={newDraft.preferred}
                    onChange={(e) => setNewPreferred(e.target.checked)}
                    aria-label="Preferred"
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="text"
                    value={newDraft.paintType}
                    placeholder="Paint type"
                    onChange={(e) => setNewField("paintType", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={TD_CLASS}>
                  <span className="text-xs text-gray-400">Set after saving</span>
                </td>
                <td className={TD_CLASS}>
                  <select
                    value={newDraft.coatType}
                    onChange={(e) => setNewField("coatType", e.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value="">—</option>
                    {COAT_TYPES.map((coat) => (
                      <option key={coat.value} value={coat.value}>
                        {coat.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="number"
                    step="0.1"
                    value={newDraft.packSizeLitres}
                    onChange={(e) => setNewField("packSizeLitres", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="number"
                    step="0.1"
                    value={newDraft.volumeSolidsPercent}
                    onChange={(e) => setNewField("volumeSolidsPercent", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="number"
                    step="0.01"
                    value={newDraft.costPerLitre}
                    onChange={(e) => setNewField("costPerLitre", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="number"
                    step="0.01"
                    value={newDraft.costPerKit}
                    onChange={(e) => setNewField("costPerKit", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="number"
                    step="0.1"
                    value={newDraft.upliftPercent}
                    onChange={(e) => setNewField("upliftPercent", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="number"
                    step="1"
                    value={newDraft.recommendedMicrons}
                    onChange={(e) => setNewField("recommendedMicrons", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="number"
                    step="1"
                    value={newDraft.micronsOverride}
                    onChange={(e) => setNewField("micronsOverride", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="text"
                    value={newDraft.thinnerName}
                    onChange={(e) => setNewField("thinnerName", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="number"
                    step="0.01"
                    value={newDraft.thinnerPricePerLitre}
                    onChange={(e) => setNewField("thinnerPricePerLitre", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="number"
                    step="0.1"
                    value={newDraft.maxThinningPercent}
                    onChange={(e) => setNewField("maxThinningPercent", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={TD_CLASS} colSpan={5 + tierNames.length}>
                  <span className="text-xs text-gray-400">Computed once saved</span>
                </td>
                <td className={TD_CLASS}>
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={createItem.isPending}
                    className="inline-flex items-center justify-center rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {createItem.isPending ? "Adding…" : "Add paint"}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <FormModal
        isOpen={importPreview !== null}
        onClose={() => setImportPreview(null)}
        onSubmit={handleConfirmImport}
        title="Review extracted price list"
        submitLabel="Confirm import"
        loading={commitImport.isPending}
        submitDisabled={previewRows.length === 0}
        maxWidth="max-w-5xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Found {previewRows.length} paint{previewRows.length === 1 ? "" : "s"}
            {previewSupplierName ? <> from {previewSupplierName}</> : null}.
          </p>

          <div className="overflow-auto max-h-[55vh] border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className={TH_CLASS}>Supplier</th>
                  <th className={TH_CLASS}>Product</th>
                  <th className={TH_CLASS}>Paint type</th>
                  <th className={TH_CLASS}>Coat type</th>
                  <th className={TH_CLASS}>Pack (L)</th>
                  <th className={TH_CLASS}>Vol solids %</th>
                  <th className={TH_CLASS_PLAIN}>Rec µm</th>
                  <th className={TH_CLASS}>Cost/L</th>
                  <th className={TH_CLASS}>Thinner</th>
                  <th className={TH_CLASS}>Thinner R/L</th>
                  <th className={TH_CLASS}>Max thin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewRows.map((row, index) => {
                  const coatType = row.coatType;
                  const coatMatch = coatType
                    ? COAT_TYPES.find((coat) => coat.value === coatType)
                    : null;
                  const coatLabel = coatMatch ? coatMatch.label : "—";
                  const packValue = row.packSizeLitres;
                  const packDisplay = packValue == null ? "—" : packValue;
                  const thinnerNameValue = row.thinnerName;
                  const thinnerDisplay = thinnerNameValue ? thinnerNameValue : "—";
                  const maxThinValue = row.maxThinningPercent;
                  const maxThinDisplay = maxThinValue == null ? "—" : maxThinValue;
                  const recMicronsValue = row.recommendedMicrons;
                  const recMicronsDisplay = recMicronsValue == null ? "—" : recMicronsValue;
                  const paintTypeValue = row.paintType;
                  const paintTypeDisplay = paintTypeValue ?? "—";
                  const thinnerPriceValue = row.thinnerPricePerLitre;
                  const thinnerPriceDisplay =
                    thinnerPriceValue == null ? "—" : money(thinnerPriceValue);
                  const solidsValue = row.volumeSolidsPercent;
                  const solidsDisplay = solidsValue > 0 ? solidsValue : "—";
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className={TD_CLASS}>{row.supplierName}</td>
                      <td className={TD_CLASS}>{row.productName}</td>
                      <td className={TD_CLASS}>{paintTypeDisplay}</td>
                      <td className={TD_CLASS}>{coatLabel}</td>
                      <td className={TD_CLASS}>{packDisplay}</td>
                      <td className={TD_CLASS}>{solidsDisplay}</td>
                      <td className={TD_CLASS}>{recMicronsDisplay}</td>
                      <td className={TD_CLASS}>{money(row.costPerLitre)}</td>
                      <td className={TD_CLASS}>{thinnerDisplay}</td>
                      <td className={TD_CLASS}>{thinnerPriceDisplay}</td>
                      <td className={TD_CLASS}>{maxThinDisplay}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={replaceSupplier}
              onChange={(e) => setReplaceSupplier(e.target.checked)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            Replace all existing {previewSupplierName ? previewSupplierName : "supplier"} rows
          </label>
        </div>
      </FormModal>

      {ConfirmDialog}
    </div>
  );
}
