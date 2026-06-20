"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/app/components/ui/SearchableSelect";
import type {
  CoatingSystemOption,
  MultiCoatQuoteInput,
  MultiCoatQuoteResult,
  PreferredPaintOption,
  QuoteCatalogItem,
} from "@/app/lib/api/stockControlApi";
import {
  useBranding,
  useCreateMultiCoatQuote,
  usePaintCoatingSystems,
  usePaintPricing,
  usePaintQuoteCatalog,
  usePreferredPaints,
} from "@/app/lib/query/hooks";

const STANDARD_TIER = "__standard__";
const NO_BLAST = "__none__";

type CoatSlot = "primer" | "intermediate" | "final";

const COAT_SLOTS: { slot: CoatSlot; label: string }[] = [
  { slot: "primer", label: "Primer" },
  { slot: "intermediate", label: "Intermediate" },
  { slot: "final", label: "Final" },
];

interface CoatRowState {
  itemId: number | null;
  microns: string;
}

interface ComparisonCoat {
  slot: CoatSlot;
  itemId: number | null;
  productName: string | null;
  genericType: string | null;
  microns: string;
}

interface ComparisonBlock {
  supplierName: string;
  coats: ComparisonCoat[];
  result: MultiCoatQuoteResult | null;
}

const EMPTY_COAT: CoatRowState = { itemId: null, microns: "" };

function formatZar(value: number): string {
  return value.toLocaleString("en-ZA", { style: "currency", currency: "ZAR" });
}

function optionLabel(item: QuoteCatalogItem): string {
  return `${item.supplierName} — ${item.productName}`;
}

function preferredForSlot(catalog: QuoteCatalogItem[], slot: CoatSlot): QuoteCatalogItem | null {
  const match = catalog.find((item) => item.preferred && item.coatType === slot);
  return match || null;
}

function preferredPaintForSupplier(
  preferred: PreferredPaintOption[],
  supplierName: string,
  slot: CoatSlot,
): PreferredPaintOption | null {
  const match = preferred.find(
    (paint) => paint.supplierName === supplierName && paint.coatType === slot,
  );
  return match || null;
}

const CHEMISTRY_FAMILY: Record<string, string> = {
  "zinc-rich-epoxy": "zinc",
  "zinc-silicate": "zinc",
  epoxy: "epoxy",
  "epoxy-mio": "epoxy",
  "epoxy-mastic": "epoxy",
  "epoxy-phenolic": "epoxy",
  "epoxy-glass-flake": "epoxy",
  "coal-tar-epoxy": "epoxy",
  polyurethane: "pu",
  polysiloxane: "pu",
  polyurea: "pu",
  acrylic: "acrylic",
  alkyd: "alkyd",
  vinyl: "vinyl",
  "high-temp-silicone": "hightemp",
  intumescent: "intumescent",
  fbe: "fbe",
  "3lpe": "3lpe",
  bitumen: "bitumen",
};

function familyOf(genericType: string | null): string | null {
  const g = genericType;
  if (!g) {
    return null;
  }
  const family = CHEMISTRY_FAMILY[g];
  return family ?? null;
}

function isDeepShade(item: QuoteCatalogItem): boolean {
  return /deep shade/i.test(item.productName);
}

function bestOf(items: QuoteCatalogItem[]): QuoteCatalogItem | null {
  const ranked = [...items].sort((a, b) => {
    const preferredA = a.preferred === true ? 0 : 1;
    const preferredB = b.preferred === true ? 0 : 1;
    if (preferredA !== preferredB) {
      return preferredA - preferredB;
    }
    const deepA = isDeepShade(a) ? 0 : 1;
    const deepB = isDeepShade(b) ? 0 : 1;
    if (deepA !== deepB) {
      return deepA - deepB;
    }
    return a.salePerM2 - b.salePerM2;
  });
  const best = ranked[0];
  return best || null;
}

function bestOfForSlot(items: QuoteCatalogItem[], slot: CoatSlot): QuoteCatalogItem | null {
  const ranked = [...items].sort((a, b) => {
    const preferredA = a.preferred === true ? 0 : 1;
    const preferredB = b.preferred === true ? 0 : 1;
    if (preferredA !== preferredB) {
      return preferredA - preferredB;
    }
    const slotA = a.coatType === slot ? 0 : 1;
    const slotB = b.coatType === slot ? 0 : 1;
    if (slotA !== slotB) {
      return slotA - slotB;
    }
    const deepA = isDeepShade(a) ? 0 : 1;
    const deepB = isDeepShade(b) ? 0 : 1;
    if (deepA !== deepB) {
      return deepA - deepB;
    }
    return a.salePerM2 - b.salePerM2;
  });
  const best = ranked[0];
  return best || null;
}

function resolveSupplierCoat(
  catalog: QuoteCatalogItem[],
  supplierName: string,
  slot: CoatSlot,
  reference: QuoteCatalogItem | null,
): QuoteCatalogItem | null {
  const supplierItems = catalog.filter((item) => item.supplierName === supplierName);
  if (supplierItems.length === 0) {
    return null;
  }

  const referenceGenericType = reference ? reference.genericType : null;
  const referenceFinishType = reference ? reference.finishType : null;
  const referencePaintType = reference ? reference.paintType : null;

  if (referenceGenericType != null) {
    const exactGeneric = supplierItems.filter((item) => {
      const itemGenericType = item.genericType;
      return itemGenericType != null && itemGenericType === referenceGenericType;
    });
    if (exactGeneric.length > 0) {
      if (referenceFinishType != null) {
        const sameFinish = exactGeneric.filter((item) => {
          const itemFinishType = item.finishType;
          return itemFinishType != null && itemFinishType === referenceFinishType;
        });
        if (sameFinish.length > 0) {
          return bestOfForSlot(sameFinish, slot);
        }
      }
      return bestOfForSlot(exactGeneric, slot);
    }

    const referenceFamily = familyOf(referenceGenericType);
    if (referenceFamily != null) {
      const sameFamily = supplierItems.filter((item) => {
        const itemFamily = familyOf(item.genericType);
        return itemFamily != null && itemFamily === referenceFamily;
      });
      if (sameFamily.length > 0) {
        return bestOfForSlot(sameFamily, slot);
      }
    }
  }

  const slotMatches = supplierItems.filter((item) => item.coatType === slot);
  if (slotMatches.length === 0) {
    return null;
  }

  const chemistry = referencePaintType ? referencePaintType.trim().toLowerCase() : null;
  if (chemistry != null) {
    const sameChemistry = slotMatches.filter((item) => {
      const itemPaintType = item.paintType;
      return itemPaintType != null && itemPaintType.trim().toLowerCase() === chemistry;
    });
    if (sameChemistry.length > 0) {
      return bestOfForSlot(sameChemistry, slot);
    }
  }

  return bestOfForSlot(slotMatches, slot);
}

function resolveCoatByGeneric(
  catalog: QuoteCatalogItem[],
  slot: CoatSlot,
  genericType: string | null,
  supplierName: string | null,
): QuoteCatalogItem | null {
  const supplierScoped =
    supplierName != null ? catalog.filter((item) => item.supplierName === supplierName) : [];
  const pool = supplierScoped.length > 0 ? supplierScoped : catalog;
  if (pool.length === 0) {
    return null;
  }

  if (genericType != null) {
    const exact = pool.filter((item) => item.genericType === genericType);
    if (exact.length > 0) {
      return bestOfForSlot(exact, slot);
    }
    const targetFamily = familyOf(genericType);
    if (targetFamily != null) {
      const sameFamily = pool.filter((item) => familyOf(item.genericType) === targetFamily);
      if (sameFamily.length > 0) {
        return bestOfForSlot(sameFamily, slot);
      }
    }
  }

  const slotMatches = pool.filter((item) => item.coatType === slot);
  if (slotMatches.length > 0) {
    return bestOfForSlot(slotMatches, slot);
  }
  return null;
}

function micronsString(value: number | null): string {
  return value != null ? String(value) : "";
}

function buildCoatRow(item: QuoteCatalogItem, specMicrons: number | null): CoatRowState {
  const recommended = item.recommendedMicrons;
  const microns = specMicrons != null ? specMicrons : recommended;
  return { itemId: item.id, microns: micronsString(microns) };
}

function validMicronsOverride(microns: string): number | null {
  const value = microns ? Number(microns) : null;
  if (value != null && Number.isFinite(value) && value > 0) {
    return value;
  }
  return null;
}

const INPUT_CLASS =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500";

export default function PaintQuotePage() {
  const catalogQuery = usePaintQuoteCatalog();
  const pricingQuery = usePaintPricing();
  const preferredQuery = usePreferredPaints();
  const systemsQuery = usePaintCoatingSystems();
  const createQuote = useCreateMultiCoatQuote();
  const brandingQuery = useBranding("stock-control");

  const mutateAsync = createQuote.mutateAsync;

  const [coats, setCoats] = useState<Record<CoatSlot, CoatRowState>>({
    primer: EMPTY_COAT,
    intermediate: EMPTY_COAT,
    final: EMPTY_COAT,
  });
  const [blastGrade, setBlastGrade] = useState(NO_BLAST);
  const [tier, setTier] = useState(STANDARD_TIER);
  const [result, setResult] = useState<MultiCoatQuoteResult | null>(null);
  const [comparisons, setComparisons] = useState<ComparisonBlock[]>([]);
  const [prefilled, setPrefilled] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");

  const liveSeqRef = useRef(0);

  const catalogData = catalogQuery.data;
  const catalog = useMemo(() => catalogData || [], [catalogData]);
  const preferredData = preferredQuery.data;
  const preferredPaints = useMemo(() => preferredData || [], [preferredData]);
  const systemsData = systemsQuery.data;
  const coatingSystems = useMemo(() => systemsData || [], [systemsData]);

  const coatOptions = useMemo<SearchableSelectOption[]>(() => {
    const paintOptions = catalog.map((item) => ({
      value: String(item.id),
      label: optionLabel(item),
      searchTerms: [item.productName, item.supplierName],
    }));
    return [{ value: "", label: "— none —" }, ...paintOptions];
  }, [catalog]);

  const pricingData = pricingQuery.data;
  const config = pricingData ? pricingData.config : null;
  const blastGrades = config ? config.blastGrades : [];
  const discountTiers = config ? config.discountTiers : [];

  useEffect(() => {
    if (prefilled || catalog.length === 0) {
      return;
    }
    const next: Record<CoatSlot, CoatRowState> = {
      primer: EMPTY_COAT,
      intermediate: EMPTY_COAT,
      final: EMPTY_COAT,
    };
    COAT_SLOTS.forEach((entry) => {
      const pick = preferredForSlot(catalog, entry.slot);
      if (pick) {
        next[entry.slot] = { itemId: pick.id, microns: micronsString(pick.recommendedMicrons) };
      }
    });
    setCoats(next);
    setPrefilled(true);
  }, [catalog, prefilled]);

  const branding = brandingQuery.data;
  const brandAccent = branding?.navbarColor;
  const accentColor = brandAccent || "var(--brand-navbar, #0d9488)";

  const primerCoat = coats.primer;
  const primerItemId = primerCoat.itemId;
  const primerCatalogItem = useMemo(() => {
    const match = catalog.find((item) => item.id === primerItemId);
    return match || null;
  }, [catalog, primerItemId]);
  const cardSupplier = primerCatalogItem ? primerCatalogItem.supplierName : null;

  const handleSelectPrimer = (value: string) => {
    const id = value ? Number(value) : null;
    const picked = catalog.find((item) => item.id === id);
    const pickedSupplier = picked ? picked.supplierName : null;
    const pickedMicrons = picked ? micronsString(picked.recommendedMicrons) : "";
    setCoats((prev) => {
      const previousPrimer = catalog.find((item) => item.id === prev.primer.itemId);
      const previousSupplier = previousPrimer ? previousPrimer.supplierName : null;
      const nextPrimer: CoatRowState = { itemId: id, microns: id != null ? pickedMicrons : "" };
      if (pickedSupplier == null || pickedSupplier === previousSupplier) {
        return { ...prev, primer: nextPrimer };
      }
      const syncedIntermediate = preferredPaintForSupplier(
        preferredPaints,
        pickedSupplier,
        "intermediate",
      );
      const syncedFinal = preferredPaintForSupplier(preferredPaints, pickedSupplier, "final");
      const intermediateRow: CoatRowState = syncedIntermediate
        ? {
            itemId: syncedIntermediate.id,
            microns: micronsString(syncedIntermediate.recommendedMicrons),
          }
        : EMPTY_COAT;
      const finalRow: CoatRowState = syncedFinal
        ? { itemId: syncedFinal.id, microns: micronsString(syncedFinal.recommendedMicrons) }
        : EMPTY_COAT;
      return { primer: nextPrimer, intermediate: intermediateRow, final: finalRow };
    });
  };

  const handleSelectCoat = (slot: CoatSlot, value: string) => {
    if (slot === "primer") {
      handleSelectPrimer(value);
      return;
    }
    const id = value ? Number(value) : null;
    const picked = catalog.find((item) => item.id === id);
    const rec = picked ? picked.recommendedMicrons : null;
    setCoats((prev) => ({
      ...prev,
      [slot]: { itemId: id, microns: id != null ? micronsString(rec) : "" },
    }));
  };

  const handleMicronsChange = (slot: CoatSlot, value: string) => {
    setCoats((prev) => ({ ...prev, [slot]: { ...prev[slot], microns: value } }));
  };

  const applyCoatingSystem = (option: CoatingSystemOption) => {
    const optionCoats = option.coats;
    const primerSpecRaw = optionCoats.find((coat) => coat.role === "primer");
    const primerSpec = primerSpecRaw ? primerSpecRaw : null;
    const intermediateSpecRaw = optionCoats.find((coat) => coat.role === "intermediate");
    const intermediateSpec = intermediateSpecRaw ? intermediateSpecRaw : null;
    const finalSpecRaw = optionCoats.find((coat) => coat.role === "final");
    const finalSpec = finalSpecRaw ? finalSpecRaw : null;

    const next: Record<CoatSlot, CoatRowState> = {
      primer: EMPTY_COAT,
      intermediate: EMPTY_COAT,
      final: EMPTY_COAT,
    };

    let supplier: string | null = null;
    if (primerSpec) {
      const primerItem = resolveCoatByGeneric(catalog, "primer", primerSpec.genericType, null);
      if (primerItem) {
        supplier = primerItem.supplierName;
        next.primer = buildCoatRow(primerItem, primerSpec.microns);
      }
    }
    if (intermediateSpec) {
      const item = resolveCoatByGeneric(
        catalog,
        "intermediate",
        intermediateSpec.genericType,
        supplier,
      );
      if (item) {
        next.intermediate = buildCoatRow(item, intermediateSpec.microns);
      }
    }
    if (finalSpec) {
      const item = resolveCoatByGeneric(catalog, "final", finalSpec.genericType, supplier);
      if (item) {
        next.final = buildCoatRow(item, finalSpec.microns);
      }
    }

    setCoats(next);
    setPrefilled(true);
  };

  const handleSelectSystem = (value: string) => {
    setSelectedCategory(value);
    if (!value) {
      return;
    }
    const optionRaw = coatingSystems.find((system) => system.category === value);
    const option = optionRaw ? optionRaw : null;
    if (option) {
      applyCoatingSystem(option);
    }
  };

  const coatsKey = useMemo(() => {
    return COAT_SLOTS.map((entry) => {
      const coat = coats[entry.slot];
      const itemId = coat.itemId;
      const idPart = itemId != null ? String(itemId) : "";
      return `${idPart}:${coat.microns}`;
    }).join("|");
  }, [coats]);

  const otherSupplierNames = useMemo(() => {
    if (cardSupplier == null) {
      return [];
    }
    const catalogNames = catalog
      .filter((item) => item.supplierName !== cardSupplier)
      .map((item) => item.supplierName);
    return Array.from(new Set(catalogNames));
  }, [catalog, cardSupplier]);

  useEffect(() => {
    if (catalog.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      const seq = liveSeqRef.current + 1;
      liveSeqRef.current = seq;

      const tierName = tier === STANDARD_TIER ? null : tier;
      const hasBlast = blastGrade !== NO_BLAST;
      const blastValue = hasBlast ? blastGrade : null;

      const selectedSlots = COAT_SLOTS.filter((entry) => coats[entry.slot].itemId != null);
      const cardCoatInputs = selectedSlots.map((entry) => {
        const coat = coats[entry.slot];
        const id = coat.itemId as number;
        return { itemId: id, micronsOverride: validMicronsOverride(coat.microns) };
      });

      const micronsBySlot: Record<CoatSlot, string> = {
        primer: coats.primer.microns,
        intermediate: coats.intermediate.microns,
        final: coats.final.microns,
      };

      const comparisonPlans = otherSupplierNames.map((supplierName) => {
        const blockCoats: ComparisonCoat[] = selectedSlots.map((entry) => {
          const slotMicrons = micronsBySlot[entry.slot];
          const referenceCoat = coats[entry.slot];
          const referenceId = referenceCoat.itemId;
          const referenceMatch = catalog.find((item) => item.id === referenceId);
          const reference = referenceMatch ? referenceMatch : null;
          const resolved = resolveSupplierCoat(catalog, supplierName, entry.slot, reference);
          if (resolved == null) {
            return {
              slot: entry.slot,
              itemId: null,
              productName: null,
              genericType: null,
              microns: slotMicrons,
            };
          }
          const resolvedId = resolved.id;
          const resolvedName = resolved.productName;
          const resolvedGenericType = resolved.genericType;
          return {
            slot: entry.slot,
            itemId: resolvedId,
            productName: resolvedName,
            genericType: resolvedGenericType,
            microns: slotMicrons,
          };
        });
        const blockInputs = blockCoats
          .filter((coat) => coat.itemId != null)
          .map((coat) => {
            const id = coat.itemId as number;
            return { itemId: id, micronsOverride: validMicronsOverride(coat.microns) };
          });
        return { supplierName, blockCoats, blockInputs };
      });

      const cardHasWork = cardCoatInputs.length > 0 || hasBlast;

      const cardPromise: Promise<MultiCoatQuoteResult | null> = cardHasWork
        ? mutateAsync({
            coats: cardCoatInputs,
            blastGrade: blastValue,
            areaM2: 0,
            tierName,
          } satisfies MultiCoatQuoteInput).catch(() => null)
        : Promise.resolve(null);

      const comparisonPromises = comparisonPlans.map((plan) => {
        const inputs = plan.blockInputs;
        if (inputs.length === 0) {
          return Promise.resolve<MultiCoatQuoteResult | null>(null);
        }
        return mutateAsync({
          coats: inputs,
          blastGrade: blastValue,
          areaM2: 0,
          tierName,
        } satisfies MultiCoatQuoteInput).catch(() => null);
      });

      Promise.all([cardPromise, Promise.all(comparisonPromises)])
        .then(([cardResult, comparisonResults]) => {
          if (liveSeqRef.current !== seq) {
            return;
          }
          setResult(cardResult);
          const blocks = comparisonPlans.map((plan, index) => {
            const blockResult = comparisonResults[index];
            return {
              supplierName: plan.supplierName,
              coats: plan.blockCoats,
              result: blockResult || null,
            } satisfies ComparisonBlock;
          });
          setComparisons(blocks);
        })
        .catch(() => {
          if (liveSeqRef.current === seq) {
            setResult(null);
            setComparisons([]);
          }
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [
    catalog,
    preferredPaints,
    coatsKey,
    coats,
    blastGrade,
    tier,
    otherSupplierNames,
    mutateAsync,
  ]);

  const catalogLoading = catalogQuery.isLoading;
  const pricingLoading = pricingQuery.isLoading;
  const catalogError = catalogQuery.isError;
  const pricingError = pricingQuery.isError;
  const isLoading = catalogLoading || pricingLoading;
  const isError = catalogError || pricingError;
  const isEmpty = !isLoading && !isError && catalog.length === 0;

  const selectedSystemRaw = coatingSystems.find((system) => system.category === selectedCategory);
  const selectedSystem = selectedSystemRaw ? selectedSystemRaw : null;
  let selectedSystemLabel: string | null = null;
  if (selectedSystem) {
    const systemCode = selectedSystem.systemCode;
    const totalDft = selectedSystem.totalDftUm;
    const codePart = systemCode ? `${systemCode} · ` : "";
    const totalPart = totalDft != null ? ` · ${totalDft} µm total` : "";
    selectedSystemLabel = `${codePart}${selectedSystem.systemLabel}${totalPart}`;
  }

  const resultTierName = result?.tierName;
  const resultTierLabel = resultTierName || "Standard";
  const resultBlast = result ? result.blast : null;
  const resultPaintPerM2 = result ? result.paintPricePerM2 : null;
  const resultBlastPerM2 = resultBlast ? resultBlast.pricePerM2 : null;
  const resultBlastPerM2Value = resultBlastPerM2 || 0;
  const resultPaintPerM2Value = resultPaintPerM2 || 0;
  const resultTotalPerM2 = result ? resultPaintPerM2Value + resultBlastPerM2Value : null;

  const priceForItem = (itemId: number | null): number | null => {
    if (itemId == null || result == null) {
      return null;
    }
    const line = result.coats.find((coat) => coat.itemId === itemId);
    return line ? line.pricePerM2 : null;
  };

  const comparisonPriceForItem = (block: ComparisonBlock, itemId: number | null): number | null => {
    if (itemId == null || block.result == null) {
      return null;
    }
    const line = block.result.coats.find((coat) => coat.itemId === itemId);
    return line ? line.pricePerM2 : null;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Paint Quote</h1>
        <p className="text-sm text-gray-500 mt-1">
          Build a coating system quote — pick a primer, intermediate and final coat, add blasting
          and a discount tier, and read off the live price per m². Area is applied later at the
          quote / job-card stage.
        </p>
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-sm text-gray-500">
          Loading paints…
        </div>
      )}

      {isError && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-sm text-gray-500">
          Could not load paints — please try again.
        </div>
      )}

      {isEmpty && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-sm text-gray-500">
          No paints available — add some in Paint Pricing.
        </div>
      )}

      {!isLoading && !isError && !isEmpty && coatingSystems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <label htmlFor="paint-system" className="block text-sm font-medium text-gray-700 mb-1">
            Paint system (ISO 12944)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Pick a corrosivity category to auto-fill the coats below from its recommended system —
            each supplier's matching paint and the film thicknesses are filled in for you. You can
            fine-tune any coat afterwards.
          </p>
          <select
            id="paint-system"
            value={selectedCategory}
            onChange={(e) => handleSelectSystem(e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">— Select a system —</option>
            {coatingSystems.map((system) => (
              <option key={system.category} value={system.category}>
                {system.category} — {system.description}
              </option>
            ))}
          </select>
          {selectedSystemLabel && (
            <p className="mt-2 text-xs text-gray-400">{selectedSystemLabel}</p>
          )}
        </div>
      )}

      {!isLoading && !isError && !isEmpty && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Your coating spec</h2>
              {cardSupplier && (
                <p className="text-sm text-gray-500 mt-1">Supplier: {cardSupplier}</p>
              )}
            </div>
            <div className="space-y-4">
              {COAT_SLOTS.map((entry) => {
                const coat = coats[entry.slot];
                const selectedValue = coat.itemId != null ? String(coat.itemId) : "";
                const coatPrice = priceForItem(coat.itemId);
                const selectedItem = catalog.find((item) => item.id === coat.itemId);
                const selectedGenericType = selectedItem ? selectedItem.genericType : null;
                return (
                  <div key={entry.slot} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor={`coat-${entry.slot}`}
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        {entry.label}
                      </label>
                      <SearchableSelect
                        id={`coat-${entry.slot}`}
                        value={selectedValue}
                        onChange={(value) => handleSelectCoat(entry.slot, value)}
                        options={coatOptions}
                        placeholder="Select a paint…"
                        searchPlaceholder="Type a product name…"
                      />
                      {selectedGenericType && (
                        <span className="mt-1 inline-block text-xs text-gray-400">
                          {selectedGenericType}
                        </span>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor={`microns-${entry.slot}`}
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Film thickness (µm)
                      </label>
                      <input
                        id={`microns-${entry.slot}`}
                        type="number"
                        min={0}
                        inputMode="decimal"
                        value={coat.microns}
                        onChange={(e) => handleMicronsChange(entry.slot, e.target.value)}
                        disabled={coat.itemId == null}
                        placeholder="e.g. 125"
                        className={`${INPUT_CLASS} disabled:bg-gray-50 disabled:text-gray-400`}
                      />
                      <div className="mt-1 text-xs text-right text-gray-500">
                        {coat.itemId == null ? (
                          <span className="text-gray-400">—</span>
                        ) : coatPrice != null ? (
                          <span>{formatZar(coatPrice)} / m²</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
              <div>
                <label
                  htmlFor="paint-quote-blast"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Blasting
                </label>
                <select
                  id="paint-quote-blast"
                  value={blastGrade}
                  onChange={(e) => setBlastGrade(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value={NO_BLAST}>— none —</option>
                  {blastGrades.map((grade) => (
                    <option key={grade.grade} value={grade.grade}>
                      {grade.grade}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="paint-quote-tier"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Discount tier
                </label>
                <select
                  id="paint-quote-tier"
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value={STANDARD_TIER}>Standard price</option>
                  {discountTiers.map((discountTier) => (
                    <option key={discountTier.name} value={discountTier.name}>
                      {discountTier.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {result && resultTotalPerM2 != null && (
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <p className="text-xs text-gray-400">{resultTierLabel}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Paint /m²</span>
                  <span className="font-medium text-gray-900">
                    {resultPaintPerM2 != null ? formatZar(resultPaintPerM2) : "—"}
                  </span>
                </div>
                {resultBlast && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Blast /m²</span>
                    <span className="font-medium text-gray-900">
                      {resultBlastPerM2 != null ? formatZar(resultBlastPerM2) : "—"}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-xs uppercase tracking-wide text-gray-400">Total /m²</span>
                  <span className="text-3xl font-bold" style={{ color: accentColor }}>
                    {formatZar(resultTotalPerM2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Compare other suppliers</h2>
              <p className="text-sm text-gray-500 mt-1">
                The same coating spec priced with each other supplier's coats — matched by coating
                technology, favouring their preferred paint within that technology — using the film
                thicknesses from your spec above, with blast and a total per m² per supplier.
              </p>
            </div>

            {cardSupplier == null && (
              <p className="text-sm text-gray-400">Pick a primer to compare other suppliers.</p>
            )}

            {cardSupplier != null && comparisons.length === 0 && (
              <p className="text-sm text-gray-400">No other suppliers in the catalog.</p>
            )}

            {cardSupplier != null && comparisons.length > 0 && (
              <div className="space-y-5">
                {comparisons.map((block) => {
                  const blockResult = block.result;
                  const blockPaintPerM2 = blockResult ? blockResult.paintPricePerM2 : null;
                  const blockBlast = blockResult ? blockResult.blast : null;
                  const blockBlastPerM2 = blockBlast ? blockBlast.pricePerM2 : null;
                  const blockPaintValue = blockPaintPerM2 || 0;
                  const blockBlastValue = blockBlastPerM2 || 0;
                  const blockTotalPerM2 = blockResult ? blockPaintValue + blockBlastValue : null;
                  const blockCoats = block.coats;
                  return (
                    <div
                      key={block.supplierName}
                      className="border border-gray-100 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-900 min-w-0 truncate">
                          {block.supplierName}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {blockCoats.map((coat) => {
                          const slotLabel = COAT_SLOTS.find((entry) => entry.slot === coat.slot);
                          const coatLabel = slotLabel ? slotLabel.label : coat.slot;
                          const coatItemId = coat.itemId;
                          const coatProduct = coat.productName;
                          const coatMicrons = coat.microns;
                          const coatGenericType = coat.genericType;
                          const coatPrice = comparisonPriceForItem(block, coatItemId);
                          return (
                            <div
                              key={coat.slot}
                              className="flex items-center justify-between gap-2 text-sm"
                            >
                              <div className="min-w-0 truncate">
                                <span className="text-gray-400 text-xs uppercase tracking-wide mr-2">
                                  {coatLabel}
                                </span>
                                {coatProduct ? (
                                  <span className="text-gray-700">
                                    {coatProduct}
                                    {coatMicrons && (
                                      <span className="text-gray-400"> · {coatMicrons} µm</span>
                                    )}
                                    {coatGenericType && (
                                      <span className="ml-2 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                                        {coatGenericType}
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </div>
                              <div className="text-right text-teal-700 whitespace-nowrap shrink-0">
                                {coatPrice != null ? (
                                  <span>{formatZar(coatPrice)} / m²</span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {blockTotalPerM2 != null && (
                        <div className="border-t border-gray-100 pt-3 space-y-2">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-gray-500 min-w-0 truncate">Paint /m²</span>
                            <span className="font-medium text-gray-900 whitespace-nowrap shrink-0">
                              {blockPaintPerM2 != null ? formatZar(blockPaintPerM2) : "—"}
                            </span>
                          </div>
                          {blockBlast && (
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="text-gray-500 min-w-0 truncate">Blast /m²</span>
                              <span className="font-medium text-gray-900 whitespace-nowrap shrink-0">
                                {blockBlastPerM2 != null ? formatZar(blockBlastPerM2) : "—"}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
                            <span className="text-xs uppercase tracking-wide text-gray-400 min-w-0 truncate">
                              Total /m²
                            </span>
                            <span
                              className="text-xl font-bold whitespace-nowrap shrink-0"
                              style={{ color: accentColor }}
                            >
                              {formatZar(blockTotalPerM2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
