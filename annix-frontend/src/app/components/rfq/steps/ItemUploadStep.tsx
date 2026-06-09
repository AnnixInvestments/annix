"use client";

import { isNumber, toPairs } from "es-toolkit/compat";
import dynamic from "next/dynamic";
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useOptionalAdminAuth } from "@/app/context/AdminAuthContext";
import { useOptionalCustomerAuth } from "@/app/context/CustomerAuthContext";
import { log } from "@/app/lib/logger";
import {
  useAllBnwSetWeights,
  useAllFlangeTypeWeights,
  useAllGasketWeights,
  useNbToOdMap,
} from "@/app/lib/query/hooks";
import { useRfqWizardStore } from "@/app/lib/store/rfqWizardStore";
import { itemDescription } from "@/app/lib/utils/rfq/itemDescriptionGenerator";

const Pipe3DPreview = dynamic(() => import("@/app/components/rfq/previews/Pipe3DPreview"), {
  ssr: false,
  loading: () => <div className="h-64 bg-slate-100 rounded-md animate-pulse mb-4" />,
});
const Bend3DPreview = dynamic(() => import("@/app/components/rfq/previews/CSGBend3DPreview"), {
  ssr: false,
  loading: () => <div className="h-64 bg-slate-100 rounded-md animate-pulse mb-4" />,
});
const Tee3DPreview = dynamic(() => import("@/app/components/rfq/previews/Tee3DPreview"), {
  ssr: false,
  loading: () => <div className="h-64 bg-slate-100 rounded-md animate-pulse mb-4" />,
});
const Lateral3DPreview = dynamic(() => import("@/app/components/rfq/previews/Lateral3DPreview"), {
  ssr: false,
  loading: () => <div className="h-64 bg-slate-100 rounded-md animate-pulse mb-4" />,
});
const Reducer3DPreview = dynamic(() => import("@/app/components/rfq/previews/Reducer3DPreview"), {
  ssr: false,
  loading: () => <div className="h-64 bg-slate-100 rounded-md animate-pulse mb-4" />,
});
const OffsetBend3DPreview = dynamic(
  () => import("@/app/components/rfq/previews/OffsetBend3DPreview"),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-slate-100 rounded-md animate-pulse mb-4" />,
  },
);

import { LazyVisible } from "@/app/components/LazyVisible";
import { FirstItemMaterialSelector } from "@/app/components/rfq/selectors/MaterialTypeSelector";
import { AddItemButtonsBar } from "@/app/components/rfq/steps/AddItemButtonsBar";
import type { PipeMaterialType } from "@/app/lib/hooks/useRfqForm";
import { AddNextItemSection } from "./item-upload/AddNextItemSection";
import { ItemWrapper } from "./item-upload/ItemWrapper";
import { ProjectSummaryTable } from "./item-upload/ProjectSummaryTable";

// Render counter for performance debugging
let itemUploadStepRenderCount = 0;

export default function ItemUploadStep(props: {
  onUpdateEntry: (id: string, updates: any) => void;
  onCalculate?: () => void;
  onCalculateBend?: (id: string) => void;
  onCalculateFitting?: (id: string) => void;
  fetchAvailableSchedules: (
    entryId: string,
    steelSpecId: number,
    nominalBoreMm: number,
  ) => Promise<any[]>;
  getFilteredPressureClasses: (standardId: number) => Promise<any[]>;
  onReady?: () => void;
}) {
  const {
    onUpdateEntry,
    onCalculate,
    onCalculateBend,
    onCalculateFitting,
    fetchAvailableSchedules,
    getFilteredPressureClasses,
    onReady,
  } = props;
  const rfqData = useRfqWizardStore((s) => s.rfqData);
  const masterData = useRfqWizardStore((s) => s.masterData);
  const { data: nbToOdMap = {} } = useNbToOdMap();
  const { data: allWeights = [] } = useAllFlangeTypeWeights();
  const { data: allBnwSets = [] } = useAllBnwSetWeights();
  const { data: allGaskets = [] } = useAllGasketWeights();
  const availableSchedulesMap = useRfqWizardStore((s) => s.availableSchedulesMap);
  const setAvailableSchedulesMap = useRfqWizardStore((s) => s.setAvailableSchedulesMap);
  const pressureClassesByStandard = useRfqWizardStore((s) => s.pressureClassesByStandard);
  const onAddEntry = useRfqWizardStore((s) => s.addStraightPipeEntry);
  const onAddBendEntry = useRfqWizardStore((s) => s.addBendEntry);
  const onAddFittingEntry = useRfqWizardStore((s) => s.addFittingEntry);
  const onAddPipeSteelWorkEntry = useRfqWizardStore((s) => s.addPipeSteelWorkEntry);
  const onAddExpansionJointEntry = useRfqWizardStore((s) => s.addExpansionJointEntry);
  const onAddValveEntry = useRfqWizardStore((s) => s.addValveEntry);
  const onAddInstrumentEntry = useRfqWizardStore((s) => s.addInstrumentEntry);
  const onAddPumpEntry = useRfqWizardStore((s) => s.addPumpEntry);
  const onAddTankChuteEntry = useRfqWizardStore((s) => s.addTankChuteEntry);
  const onAddFastenerEntry = useRfqWizardStore((s) => s.addFastenerEntry);
  const onRemoveEntry = useRfqWizardStore((s) => s.removeStraightPipeEntry);
  const onDuplicateEntry = useRfqWizardStore((s) => s.duplicateItem);
  const entries = rfqData.items.length > 0 ? rfqData.items : rfqData.straightPipeEntries;
  const globalSpecs = rfqData.globalSpecs;
  const rawRequiredProducts = rfqData.requiredProducts;
  const requiredProducts = rawRequiredProducts || [];
  const rawUseNix = rfqData.useNix;
  const hideDrawings = rawUseNix || false;
  itemUploadStepRenderCount++;
  log.info(`🔄 ItemUploadStep RENDER #${itemUploadStepRenderCount} - entries: ${entries?.length}`);

  const autoFocusedEntriesRef = useRef<Set<string>>(new Set());
  const fetchedSchedulesRef = useRef<Set<string>>(new Set());
  const [availableNominalBores, setAvailableNominalBores] = useState<number[]>([]);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [drawingsHidden, setDrawingsHidden] = useState(hideDrawings);
  const hasCalledOnReady = useRef(false);

  const PIPE_MATERIALS = ["fabricated_steel", "hdpe", "pvc"];
  const selectedPipeMaterials = requiredProducts.filter((p) => PIPE_MATERIALS.includes(p));

  // Authentication status for unregistered customer restrictions
  // Don't apply restrictions while auth is still loading to prevent flash of restricted state
  const { isAuthenticated: isCustomerAuthenticated, isLoading: isCustomerAuthLoading } =
    useOptionalCustomerAuth();
  const { isAuthenticated: isAdminAuthenticated, isLoading: isAdminAuthLoading } =
    useOptionalAdminAuth();
  const isAuthLoading = isCustomerAuthLoading || isAdminAuthLoading;
  const isUnregisteredCustomer =
    !isAuthLoading && !isCustomerAuthenticated && !isAdminAuthenticated;

  // Restriction popup state - supports different popup types
  type RestrictionPopupType = "itemLimit" | "quantityLimit" | "drawings";
  const [restrictionPopup, setRestrictionPopup] = useState<{
    type: RestrictionPopupType;
    x: number;
    y: number;
  } | null>(null);

  const showRestrictionPopup = useCallback(
    (type: RestrictionPopupType) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setRestrictionPopup({ type, x: e.clientX, y: e.clientY });
    },
    [],
  );

  // Constants for unregistered customer limits
  const MAX_ITEMS_UNREGISTERED = 5;
  const MAX_QUANTITY_UNREGISTERED = 1;

  // Check if user can add more items
  const canAddMoreItems = !isUnregisteredCustomer || entries.length < MAX_ITEMS_UNREGISTERED;

  // Force drawings hidden for unregistered customers
  const effectiveDrawingsHidden = isUnregisteredCustomer ? true : drawingsHidden;

  const copyItemToClipboard = useCallback(async (entry: any) => {
    const itemData = JSON.stringify(entry, null, 2);
    try {
      await navigator.clipboard.writeText(itemData);
      setCopiedItemId(entry.id);
      setTimeout(() => setCopiedItemId(null), 2000);
    } catch (err) {
      log.error("Failed to copy item to clipboard:", err);
    }
  }, []);

  const duplicateItem = useCallback(
    (entry: any, index: number) => {
      if (onDuplicateEntry) {
        onDuplicateEntry(entry, index);
      }
    },
    [onDuplicateEntry],
  );

  // AUTO-FOCUS DISABLED: This is a no-op stub for compatibility
  const focusAndOpenSelect = useCallback((_selectId: string, _retryCount = 0) => {}, []);

  // Track the last entry count to detect new entries
  const lastEntryCountRef = useRef<number>(0);

  useEffect(() => {
    if (onReady && !hasCalledOnReady.current && entries.length > 0) {
      hasCalledOnReady.current = true;
      const callback = () => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            onReady();
          }, 100);
        });
      };
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(callback, { timeout: 1000 });
      } else {
        setTimeout(callback, 500);
      }
    }
  }, [entries.length, onReady]);

  // Auto-focus on first empty required field for new entries
  useEffect(() => {
    const currentCount = entries.length;
    const previousCount = lastEntryCountRef.current;

    // If entries were added (not removed or unchanged)
    if (currentCount > previousCount) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        entries.forEach((entry: any) => {
          if (autoFocusedEntriesRef.current.has(entry.id)) return;

          const rawSteelSpecificationId = entry.specs?.steelSpecificationId;

          const hasSteelSpec = rawSteelSpecificationId || globalSpecs?.steelSpecificationId;

          if (entry.itemType === "fitting") {
            autoFocusedEntriesRef.current.add(entry.id);
            const rawSteelSpecificationId2 = entry.specs?.steelSpecificationId;
            const isSABS719 = (rawSteelSpecificationId2 || globalSpecs?.steelSpecificationId) === 8;
            const rawFittingStandard = entry.specs?.fittingStandard;
            const effectiveStandard = rawFittingStandard || (isSABS719 ? "SABS719" : "SABS62");
            if (!entry.specs?.fittingType) {
              focusAndOpenSelect(`fitting-type-${entry.id}`);
            } else if (!entry.specs?.nominalDiameterMm) {
              focusAndOpenSelect(`fitting-nb-${entry.id}`);
            } else if (effectiveStandard === "SABS719" && !entry.specs?.scheduleNumber) {
              focusAndOpenSelect(`fitting-schedule-${entry.id}`);
            }
          } else if (entry.itemType === "bend" && hasSteelSpec) {
            autoFocusedEntriesRef.current.add(entry.id);
            const rawSteelSpecificationId3 = entry.specs?.steelSpecificationId;
            const isSABS719 = (rawSteelSpecificationId3 || globalSpecs?.steelSpecificationId) === 8;
            if (isSABS719 && !entry.specs?.bendRadiusType) {
              focusAndOpenSelect(`bend-radius-type-${entry.id}`);
            } else if (!isSABS719 && !entry.specs?.bendType) {
              focusAndOpenSelect(`bend-type-${entry.id}`);
            } else if (!entry.specs?.nominalBoreMm) {
              focusAndOpenSelect(`bend-nb-${entry.id}`);
            } else if (!entry.specs?.bendDegrees) {
              focusAndOpenSelect(`bend-angle-${entry.id}`);
            }
          } else if (entry.itemType === "straight_pipe") {
            autoFocusedEntriesRef.current.add(entry.id);
            if (!entry.specs?.nominalBoreMm) {
              focusAndOpenSelect(`pipe-nb-${entry.id}`);
            }
          }
        });
      });
    }

    lastEntryCountRef.current = currentCount;
  }, [entries, globalSpecs?.steelSpecificationId, focusAndOpenSelect]);

  // Pre-fetch pressure classes for any standards that are already selected
  useEffect(() => {
    const standardsToFetch = new Set<number>();

    // Check global flange standard
    if (globalSpecs?.flangeStandardId && isNumber(globalSpecs.flangeStandardId)) {
      standardsToFetch.add(globalSpecs.flangeStandardId);
    }

    // Check each entry for flange standards
    entries.forEach((entry: any) => {
      if (entry.specs?.flangeStandardId) {
        standardsToFetch.add(entry.specs.flangeStandardId);
      }
      // Check stub flange standards
      entry.specs?.stubs?.forEach((stub: any) => {
        if (stub?.flangeStandardId) {
          standardsToFetch.add(stub.flangeStandardId);
        }
      });
    });

    // Fetch any standards not yet in cache
    standardsToFetch.forEach((standardId) => {
      if (!pressureClassesByStandard[standardId] && getFilteredPressureClasses) {
        getFilteredPressureClasses(standardId);
      }
    });
  }, [
    entries,
    globalSpecs?.flangeStandardId,
    pressureClassesByStandard,
    getFilteredPressureClasses,
  ]);

  // Helper function to calculate minimum wall thickness using Barlow formula

  // Fallback NB ranges for each steel specification type
  // Based on industry standards:
  // - SABS/SANS 62: Small bore ERW pipes up to 150mm (South African standard)
  // - SABS/SANS 719: Large bore ERW pipes from 200mm and above (South African standard)
  // - ASTM A106: Seamless carbon steel, full range
  // - ASTM A53: Welded and seamless, full range
  // - API 5L: Line pipe, full range including large sizes
  // - ASTM A333: Low temperature service, similar to A106
  // - ASTM A179/A192: Heat exchanger tubes, smaller sizes
  // - ASTM A500: Structural tubing
  // - ASTM A335: Alloy steel for high temp
  // - ASTM A312: Stainless steel pipe
  const STEEL_SPEC_NB_FALLBACK: Record<string, number[]> = {
    // South African Standards - SABS/SANS 62 (Small bore up to 150mm)
    "SABS 62": [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
    "SANS 62": [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
    // South African Standards - SABS/SANS 719 (Large bore from 200mm)
    "SABS 719": [200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200],
    "SANS 719": [200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200],
    // ASTM A106 - Seamless Carbon Steel (full standard range)
    "ASTM A106": [
      15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600,
    ],
    // ASTM A53 - Welded and Seamless (full standard range)
    "ASTM A53": [
      15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600,
    ],
    // API 5L - Line Pipe (wide range including large sizes)
    "API 5L": [
      15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700,
      750, 800, 900, 1000, 1050, 1200,
    ],
    // ASTM A333 - Low Temperature Service
    "ASTM A333": [
      15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600,
    ],
    // ASTM A179 - Heat Exchanger Tubes (smaller sizes)
    "ASTM A179": [15, 20, 25, 32, 40, 50, 65, 80, 100],
    // ASTM A192 - Boiler Tubes (smaller sizes)
    "ASTM A192": [15, 20, 25, 32, 40, 50, 65, 80, 100, 125],
    // ASTM A500 - Structural Tubing
    "ASTM A500": [25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500],
    // ASTM A335 - Alloy Steel for High Temperature
    "ASTM A335": [
      15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600,
    ],
    // ASTM A312 - Stainless Steel Pipe
    "ASTM A312": [
      15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600,
    ],
  };

  // Get fallback NBs based on steel spec name
  const getFallbackNBsForSteelSpec = (steelSpecName: string): number[] | null => {
    if (!steelSpecName) return null;

    // Check each key pattern
    for (const [pattern, nbs] of toPairs(STEEL_SPEC_NB_FALLBACK)) {
      if (steelSpecName.includes(pattern)) {
        return nbs;
      }
    }
    return null;
  };

  const rawLength = masterData.nominalBores?.length;

  // Use nominal bores from master data, fallback to hardcoded values
  // Remove duplicates using Set and sort
  // Handle both snake_case (from API) and camelCase (from fallback data) property names
  const allNominalBores = (
    (rawLength || 0) > 0
      ? Array.from(
          new Set(
            masterData.nominalBores!.map((nb: any) => {
              const rawNominal_diameter_mm = nb.nominal_diameter_mm;
              return (rawNominal_diameter_mm || nb.nominalDiameterMm) as number;
            }),
          ),
        ).sort((a, b) => (a as number) - (b as number))
      : [
          15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600,
          700, 800, 900, 1000, 1200, 1400, 1600, 1800, 2000,
        ]
  ) as number[];
  // fallback values

  // Filter available NB sizes based on the selected steel specification
  // Uses the STEEL_SPEC_NB_FALLBACK mapping to ensure correct NB ranges for each steel type
  useEffect(() => {
    const steelSpecId = globalSpecs?.steelSpecificationId;

    if (!steelSpecId) {
      // No steel spec selected, show all NBs
      log.debug("[ItemUploadStep] No steel spec selected, showing all NBs");
      setAvailableNominalBores(allNominalBores);
      return;
    }

    // Get the steel spec name for lookup
    const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === steelSpecId);
    const rawSteelSpecName = steelSpec?.steelSpecName;
    const steelSpecName = rawSteelSpecName || "";

    log.debug(`[ItemUploadStep] Steel spec selected: ${steelSpecId} - "${steelSpecName}"`);

    // ALWAYS use the fallback mapping based on steel spec name
    // This ensures proper filtering (e.g., SABS 719 only shows 200mm+)
    const filteredNBs = getFallbackNBsForSteelSpec(steelSpecName);

    if (filteredNBs && filteredNBs.length > 0) {
      log.debug(`[ItemUploadStep] Filtered NBs for "${steelSpecName}":`, filteredNBs);
      setAvailableNominalBores(filteredNBs);
    } else {
      // No specific mapping found - show all NBs as fallback
      log.debug(`[ItemUploadStep] No NB mapping for "${steelSpecName}", showing all NBs`);
      setAvailableNominalBores(allNominalBores);
    }
  }, [globalSpecs?.steelSpecificationId, masterData.steelSpecs]);

  const generateItemDescription = useCallback(
    (entry: any) => itemDescription(entry, globalSpecs, masterData),
    [globalSpecs, masterData.steelSpecs, masterData.flangeStandards, masterData.pressureClasses],
  );

  // Update item descriptions when globalSpecs.workingPressureBar changes
  useEffect(() => {
    if (globalSpecs?.workingPressureBar) {
      entries.forEach((entry: any) => {
        // Only update if the entry has required specs and a description
        if (entry.specs?.nominalBoreMm && entry.description) {
          const newDescription = generateItemDescription(entry);
          // Only update if description actually changed
          if (newDescription !== entry.description) {
            log.debug(
              `[Description Update] Updating description for entry ${entry.id} with new pressure: ${globalSpecs.workingPressureBar} bar`,
            );
            onUpdateEntry(entry.id, { description: newDescription });
          }
        }
      });
    }
  }, [globalSpecs?.workingPressureBar]);

  // Pre-fetch available schedules for entries that have NB set
  // NOTE: This effect only fetches schedules - it does NOT update the entry's scheduleNumber
  // The NB onChange handler is responsible for setting the schedule when user selects NB
  useEffect(() => {
    const prefetchSchedules = async () => {
      if (!masterData.nominalBores?.length) return;

      for (const entry of entries) {
        if (entry.itemType !== "straight_pipe" && entry.itemType !== undefined) continue;

        const nominalBore = entry.specs?.nominalBoreMm;
        if (!nominalBore) continue;

        // Use ref to track fetches - prevents infinite loop from stale closure
        if (fetchedSchedulesRef.current.has(entry.id)) continue;
        if (availableSchedulesMap[entry.id]?.length > 0) continue;

        // Mark as fetching before the async call to prevent duplicate fetches
        fetchedSchedulesRef.current.add(entry.id);

        const rawSteelSpecificationId7 = entry.specs?.steelSpecificationId;

        const rawGlobalSteelSpecId = globalSpecs?.steelSpecificationId;
        const steelSpecId = rawSteelSpecificationId7 || rawGlobalSteelSpecId || 2;
        await fetchAvailableSchedules(entry.id, steelSpecId, nominalBore);
      }
    };

    prefetchSchedules();
  }, [
    masterData.nominalBores?.length,
    entries,
    availableSchedulesMap,
    globalSpecs?.steelSpecificationId,
    fetchAvailableSchedules,
  ]);

  const handleAddPipe = (material: PipeMaterialType, insertAtStart?: boolean) => {
    const existingIds = new Set(
      Array.from(document.querySelectorAll('[id^="pipe-nb-"]')).map((el) => el.id),
    );

    onAddEntry(undefined, insertAtStart, material);

    const tryFocus = (attempt: number) => {
      if (attempt > 10) return;
      setTimeout(
        () => {
          const allNbSelects = document.querySelectorAll('[id^="pipe-nb-"]');
          let newSelect: Element | null = null;

          for (const select of allNbSelects) {
            if (!existingIds.has(select.id)) {
              newSelect = select;
              break;
            }
          }

          if (newSelect) {
            const button = newSelect as HTMLElement;
            button.click();
            button.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            tryFocus(attempt + 1);
          }
        },
        150 + attempt * 100,
      );
    };
    tryFocus(0);
  };

  return (
    <div>
      {/* Show item type selection buttons when no items exist */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Your First Item</h2>
          <p className="text-gray-600 mb-8">Select the type of item you want to add to this RFQ</p>
          <div className="flex flex-wrap gap-6 justify-center">
            {selectedPipeMaterials.length > 0 && (
              <FirstItemMaterialSelector
                selectedMaterials={requiredProducts}
                onAddItem={(material, itemType) => {
                  if (itemType === "pipe") {
                    handleAddPipe(material);
                  } else if (itemType === "bend") {
                    onAddBendEntry(undefined, false, material);
                  } else if (itemType === "fitting") {
                    onAddFittingEntry(undefined, false, material);
                  }
                }}
              />
            )}
            {requiredProducts.includes("valves_meters_instruments") && onAddValveEntry && (
              <button
                onClick={() => onAddValveEntry()}
                className="flex flex-col items-center justify-center w-48 h-40 bg-teal-600 text-white rounded-xl hover:bg-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-300 transition-all shadow-lg hover:shadow-xl"
              >
                <svg
                  className="w-12 h-12 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
                <span className="text-lg font-semibold">Valve</span>
                <span className="text-xs text-teal-200 mt-1">Industrial valves</span>
              </button>
            )}
            {requiredProducts.includes("valves_meters_instruments") && onAddInstrumentEntry && (
              <button
                onClick={() => onAddInstrumentEntry()}
                className="flex flex-col items-center justify-center w-48 h-40 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-300 transition-all shadow-lg hover:shadow-xl"
              >
                <svg
                  className="w-12 h-12 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <span className="text-lg font-semibold">Instrument</span>
                <span className="text-xs text-cyan-200 mt-1">Meters and gauges</span>
              </button>
            )}
            {requiredProducts.includes("pumps") && onAddPumpEntry && (
              <button
                onClick={() => onAddPumpEntry()}
                className="flex flex-col items-center justify-center w-48 h-40 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-all shadow-lg hover:shadow-xl"
              >
                <svg
                  className="w-12 h-12 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span className="text-lg font-semibold">Pump</span>
                <span className="text-xs text-indigo-200 mt-1">Industrial pumps</span>
              </button>
            )}
            {requiredProducts.includes("tanks_chutes") && (
              <button
                onClick={() => onAddTankChuteEntry()}
                className="flex flex-col items-center justify-center w-48 h-40 bg-amber-600 text-white rounded-xl hover:bg-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-300 transition-all shadow-lg hover:shadow-xl"
              >
                <svg
                  className="w-12 h-12 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <span className="text-lg font-semibold">Tank/Chute</span>
                <span className="text-xs text-amber-200 mt-1">Tanks, chutes, hoppers</span>
              </button>
            )}
            {requiredProducts.includes("fasteners_gaskets") && (
              <button
                onClick={() => onAddFastenerEntry()}
                className="flex flex-col items-center justify-center w-48 h-40 bg-lime-600 text-white rounded-xl hover:bg-lime-700 focus:outline-none focus:ring-4 focus:ring-lime-300 transition-all shadow-lg hover:shadow-xl"
              >
                <svg
                  className="w-12 h-12 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085"
                  />
                </svg>
                <span className="text-lg font-semibold">Fastener</span>
                <span className="text-xs text-lime-200 mt-1">Bolts, nuts, washers</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Items</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={
                  isUnregisteredCustomer
                    ? showRestrictionPopup("drawings")
                    : () => setDrawingsHidden(!drawingsHidden)
                }
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                  isUnregisteredCustomer
                    ? "bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200"
                    : effectiveDrawingsHidden
                      ? "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
                      : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                }`}
              >
                {isUnregisteredCustomer && (
                  <svg
                    className="w-3.5 h-3.5 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {effectiveDrawingsHidden ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
                <span className="text-sm font-medium">
                  {effectiveDrawingsHidden ? "Show 3D Drawings" : "Hide 3D Drawings"}
                </span>
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-green-700 font-semibold">Auto-calculating</span>
                <span className="text-xs text-green-600">Results update automatically</span>
              </div>
              <AddItemButtonsBar
                insertAtStart
                hasPipeMaterials={selectedPipeMaterials.length > 0}
                requiredProducts={requiredProducts}
                canAddMoreItems={canAddMoreItems}
                showRestrictionPopup={showRestrictionPopup}
                onAddPipe={handleAddPipe}
                onAddBendEntry={onAddBendEntry}
                onAddFittingEntry={onAddFittingEntry}
                onAddPipeSteelWorkEntry={onAddPipeSteelWorkEntry}
                onAddExpansionJointEntry={onAddExpansionJointEntry}
                onAddValveEntry={onAddValveEntry}
                onAddInstrumentEntry={onAddInstrumentEntry}
                onAddPumpEntry={onAddPumpEntry}
                onAddFastenerEntry={onAddFastenerEntry}
                onAddTankChuteEntry={onAddTankChuteEntry}
              />
            </div>
          </div>

          <div className="space-y-3">
            {entries.map((entry: any, index: number) => (
              <LazyVisible key={entry.id} placeholderMinHeight={440}>
                <ItemWrapper
                  entry={entry}
                  index={index}
                  entriesCount={entries.length}
                  globalSpecs={globalSpecs}
                  masterData={masterData}
                  onUpdateEntry={onUpdateEntry}
                  onRemoveEntry={onRemoveEntry}
                  onDuplicateEntry={duplicateItem}
                  onCopyEntry={copyItemToClipboard}
                  copiedItemId={copiedItemId}
                  onCalculate={onCalculate}
                  onCalculateBend={onCalculateBend}
                  onCalculateFitting={onCalculateFitting}
                  generateItemDescription={generateItemDescription}
                  Pipe3DPreview={
                    isUnregisteredCustomer
                      ? Pipe3DPreview
                      : effectiveDrawingsHidden
                        ? null
                        : Pipe3DPreview
                  }
                  Bend3DPreview={
                    isUnregisteredCustomer
                      ? Bend3DPreview
                      : effectiveDrawingsHidden
                        ? null
                        : Bend3DPreview
                  }
                  Tee3DPreview={
                    isUnregisteredCustomer
                      ? Tee3DPreview
                      : effectiveDrawingsHidden
                        ? null
                        : Tee3DPreview
                  }
                  Lateral3DPreview={
                    isUnregisteredCustomer
                      ? Lateral3DPreview
                      : effectiveDrawingsHidden
                        ? null
                        : Lateral3DPreview
                  }
                  Reducer3DPreview={
                    isUnregisteredCustomer
                      ? Reducer3DPreview
                      : effectiveDrawingsHidden
                        ? null
                        : Reducer3DPreview
                  }
                  OffsetBend3DPreview={
                    isUnregisteredCustomer
                      ? OffsetBend3DPreview
                      : effectiveDrawingsHidden
                        ? null
                        : OffsetBend3DPreview
                  }
                  availableNominalBores={availableNominalBores}
                  availableSchedulesMap={availableSchedulesMap}
                  setAvailableSchedulesMap={setAvailableSchedulesMap}
                  fetchAvailableSchedules={fetchAvailableSchedules}
                  pressureClassesByStandard={pressureClassesByStandard}
                  getFilteredPressureClasses={getFilteredPressureClasses}
                  requiredProducts={requiredProducts}
                  isUnregisteredCustomer={isUnregisteredCustomer}
                  onShowRestrictionPopup={showRestrictionPopup}
                />
              </LazyVisible>
            ))}
          </div>

          {/* Add Next Item Section - at the bottom of items */}
          <AddNextItemSection
            canAddMoreItems={canAddMoreItems}
            showRestrictionPopup={showRestrictionPopup}
          />

          {/* Total Summary */}
          <ProjectSummaryTable />
        </>
      )}
      {/* Restriction Popup for unregistered customers */}
      {restrictionPopup && (
        <div
          className="fixed z-[100] bg-slate-800 text-white px-4 py-4 rounded-lg shadow-xl border border-slate-600 max-w-sm"
          style={{
            left: Math.min(restrictionPopup.x - 150, window.innerWidth - 400),
            top: Math.min(restrictionPopup.y + 10, window.innerHeight - 250),
          }}
          onMouseLeave={() => setRestrictionPopup(null)}
        >
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-7a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              {restrictionPopup.type === "itemLimit" && (
                <>
                  <p className="text-sm font-semibold text-amber-400">Item Limit Reached</p>
                  <p className="text-xs text-gray-300 mt-2">
                    Unregistered users can add a maximum of {MAX_ITEMS_UNREGISTERED} items to an
                    RFQ.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    You have reached this limit. To add more items to your request for quote, please
                    create a free account.
                  </p>
                  <div className="mt-3 pt-2 border-t border-slate-600">
                    <p className="text-xs text-gray-300">
                      <Link
                        href="/register"
                        className="text-blue-400 hover:text-blue-300 underline"
                        onClick={() => setRestrictionPopup(null)}
                      >
                        Create a free account
                      </Link>{" "}
                      to add unlimited items and access all features.
                    </p>
                  </div>
                </>
              )}
              {restrictionPopup.type === "quantityLimit" && (
                <>
                  <p className="text-sm font-semibold text-amber-400">Quantity Limit Reached</p>
                  <p className="text-xs text-gray-300 mt-2">
                    Unregistered users can set a maximum quantity of {MAX_QUANTITY_UNREGISTERED}{" "}
                    units per item.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    To request larger quantities, please create a free account.
                  </p>
                  <div className="mt-3 pt-2 border-t border-slate-600">
                    <p className="text-xs text-gray-300">
                      <Link
                        href="/register"
                        className="text-blue-400 hover:text-blue-300 underline"
                        onClick={() => setRestrictionPopup(null)}
                      >
                        Create a free account
                      </Link>{" "}
                      to request unlimited quantities and access all features.
                    </p>
                  </div>
                </>
              )}
              {restrictionPopup.type === "drawings" && (
                <>
                  <p className="text-sm font-semibold text-amber-400">
                    3D Preview - Registered Feature
                  </p>
                  <p className="text-xs text-gray-300 mt-2">
                    Interactive 3D drawings and previews are available to registered users.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Create a free account to visualize your pipes, bends, and fittings in 3D before
                    submitting your RFQ.
                  </p>
                  <div className="mt-3 pt-2 border-t border-slate-600">
                    <p className="text-xs text-gray-300">
                      <Link
                        href="/register"
                        className="text-blue-400 hover:text-blue-300 underline"
                        onClick={() => setRestrictionPopup(null)}
                      >
                        Create a free account
                      </Link>{" "}
                      to access 3D previews and all features.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
