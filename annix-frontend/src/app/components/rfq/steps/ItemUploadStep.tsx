'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { log } from '@/app/lib/logger';
import { useOptionalCustomerAuth } from '@/app/context/CustomerAuthContext';
import {
  flangesPerPipe as getFlangesPerPipe,
  boltSetCountPerBend as getBoltSetCountPerBend,
  boltSetCountPerPipe as getBoltSetCountPerPipe,
  boltSetCountPerFitting as getBoltSetCountPerFitting,
} from '@/app/lib/config/rfq';
import {
  NB_TO_OD_LOOKUP,
  blankFlangeWeightSync as getBlankFlangeWeight,
  blankFlangeSurfaceAreaSync as getBlankFlangeSurfaceArea,
  bnwSetInfoSync as getBnwSetInfo,
  gasketWeightSync as getGasketWeight,
} from '@/app/lib/hooks/useFlangeWeights';
import {
  calculateTotalSurfaceArea,
  calculateInsideDiameter,
} from '@/app/lib/utils/pipeCalculations';
import { roundToWeldIncrement } from '@/app/lib/utils/weldThicknessLookup';

const Pipe3DPreview = dynamic(() => import('@/app/components/rfq/Pipe3DPreview'), { ssr: false, loading: () => <div className="h-64 bg-slate-100 rounded-md animate-pulse mb-4" /> });
const Bend3DPreview = dynamic(() => import('@/app/components/rfq/CSGBend3DPreview'), { ssr: false, loading: () => <div className="h-64 bg-slate-100 rounded-md animate-pulse mb-4" /> });
const Tee3DPreview = dynamic(() => import('@/app/components/rfq/Tee3DPreview'), { ssr: false, loading: () => <div className="h-64 bg-slate-100 rounded-md animate-pulse mb-4" /> });
import { BendForm, FittingForm, StraightPipeForm, PipeSteelWorkForm, ExpansionJointForm } from '@/app/components/rfq/forms';

interface ItemWrapperProps {
  entry: any;
  index: number;
  entriesCount: number;
  globalSpecs: any;
  masterData: any;
  onUpdateEntry: (id: string, updates: any) => void;
  onRemoveEntry: (id: string) => void;
  onDuplicateEntry: (entry: any, index: number) => void;
  onCopyEntry: (entry: any) => void;
  copiedItemId: string | null;
  onCalculate?: () => void;
  onCalculateBend?: (id: string) => void;
  onCalculateFitting?: (id: string) => void;
  generateItemDescription: (entry: any) => string;
  Pipe3DPreview: React.ComponentType<any> | null;
  Bend3DPreview: React.ComponentType<any> | null;
  Tee3DPreview: React.ComponentType<any> | null;
  availableNominalBores: number[];
  availableSchedulesMap: Record<string, any[]>;
  setAvailableSchedulesMap: (map: Record<string, any[]> | ((prev: Record<string, any[]>) => Record<string, any[]>)) => void;
  fetchAvailableSchedules: (entryId: string, steelSpecId: number, nominalBoreMm: number) => Promise<any[]>;
  pressureClassesByStandard: Record<number, any[]>;
  getFilteredPressureClasses: (standardId: number) => Promise<any[]>;
  requiredProducts: string[];
  isUnregisteredCustomer: boolean;
  onShowRestrictionPopup: (type: 'fittings' | 'itemLimit' | 'quantityLimit' | 'drawings') => (e: React.MouseEvent) => void;
}

const ItemWrapper = memo(function ItemWrapper({
  entry,
  index,
  entriesCount,
  globalSpecs,
  masterData,
  onUpdateEntry,
  onRemoveEntry,
  onDuplicateEntry,
  onCopyEntry,
  copiedItemId,
  onCalculate,
  onCalculateBend,
  onCalculateFitting,
  generateItemDescription,
  Pipe3DPreview,
  Bend3DPreview,
  Tee3DPreview,
  availableNominalBores,
  availableSchedulesMap,
  setAvailableSchedulesMap,
  fetchAvailableSchedules,
  pressureClassesByStandard,
  getFilteredPressureClasses,
  requiredProducts,
  isUnregisteredCustomer,
  onShowRestrictionPopup,
}: ItemWrapperProps) {
  const handleClientItemNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateEntry(entry.id, { clientItemNumber: e.target.value });
  }, [entry.id, onUpdateEntry]);

  const handleSequentialNumberingChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateEntry(entry.id, { useSequentialNumbering: e.target.checked });
  }, [entry.id, onUpdateEntry]);

  const handleDuplicate = useCallback(() => {
    onDuplicateEntry(entry, index);
  }, [entry, index, onDuplicateEntry]);

  const handleCopy = useCallback(() => {
    onCopyEntry(entry);
  }, [entry, onCopyEntry]);

  return (
    <div className="border-2 border-gray-200 rounded-lg p-5 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-base font-semibold text-gray-800">Item</span>
            <input
              type="text"
              value={entry.clientItemNumber || `#${index + 1}`}
              onChange={handleClientItemNumberChange}
              className="min-w-32 px-2 py-0.5 text-base font-semibold text-gray-800 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              style={{ width: `${Math.max(10, (entry.clientItemNumber || `#${index + 1}`).length + 2)}ch` }}
              placeholder={`#${index + 1}`}
            />
          </div>
          <span className={`px-3 py-1 ${
            entry.itemType === 'bend' ? 'bg-purple-100 text-purple-800' :
            entry.itemType === 'fitting' ? 'bg-green-100 text-green-800' :
            'bg-blue-100 text-blue-800'
          } text-xs font-semibold rounded-full`}>
            {entry.itemType === 'bend' ? 'Bend Section' :
             entry.itemType === 'fitting' ? 'Fittings' :
             'Straight Pipe'}
          </span>
          {entry.specs?.quantityValue > 1 && (
            <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer ml-2">
              <input
                type="checkbox"
                checked={entry.useSequentialNumbering || false}
                onChange={handleSequentialNumberingChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Sequential (e.g., {entry.clientItemNumber || `#${index + 1}`}-01, -02)</span>
            </label>
          )}
        </div>
      </div>

      {entry.itemType === 'bend' ? (
        <BendForm
          entry={entry}
          index={index}
          entriesCount={entriesCount}
          globalSpecs={globalSpecs}
          masterData={masterData}
          onUpdateEntry={onUpdateEntry}
          onRemoveEntry={onRemoveEntry}
          onDuplicateEntry={handleDuplicate}
          onCopyEntry={handleCopy}
          copiedItemId={copiedItemId}
          onCalculateBend={onCalculateBend}
          generateItemDescription={generateItemDescription}
          Bend3DPreview={Bend3DPreview}
          pressureClassesByStandard={pressureClassesByStandard}
          getFilteredPressureClasses={getFilteredPressureClasses}
          requiredProducts={requiredProducts}
          isUnregisteredCustomer={isUnregisteredCustomer}
          onShowRestrictionPopup={onShowRestrictionPopup}
        />
      ) : entry.itemType === 'fitting' ? (
        <FittingForm
          entry={entry}
          index={index}
          entriesCount={entriesCount}
          globalSpecs={globalSpecs}
          masterData={masterData}
          onUpdateEntry={onUpdateEntry}
          onRemoveEntry={onRemoveEntry}
          onDuplicateEntry={handleDuplicate}
          onCopyEntry={handleCopy}
          copiedItemId={copiedItemId}
          onCalculateFitting={onCalculateFitting}
          generateItemDescription={generateItemDescription}
          Tee3DPreview={Tee3DPreview}
          pressureClassesByStandard={pressureClassesByStandard}
          getFilteredPressureClasses={getFilteredPressureClasses}
          requiredProducts={requiredProducts}
          isUnregisteredCustomer={isUnregisteredCustomer}
          onShowRestrictionPopup={onShowRestrictionPopup}
        />
      ) : entry.itemType === 'pipe_steel_work' ? (
        <PipeSteelWorkForm
          entry={entry}
          index={index}
          entriesCount={entriesCount}
          globalSpecs={globalSpecs}
          masterData={masterData}
          onUpdateEntry={onUpdateEntry}
          onRemoveEntry={onRemoveEntry}
          generateItemDescription={generateItemDescription}
          requiredProducts={requiredProducts}
        />
      ) : entry.itemType === 'expansion_joint' ? (
        <ExpansionJointForm
          entry={entry}
          index={index}
          entriesCount={entriesCount}
          globalSpecs={globalSpecs}
          masterData={masterData}
          onUpdateEntry={onUpdateEntry}
          onRemoveEntry={onRemoveEntry}
          generateItemDescription={generateItemDescription}
          requiredProducts={requiredProducts}
        />
      ) : (
        <StraightPipeForm
          entry={entry}
          index={index}
          entriesCount={entriesCount}
          globalSpecs={globalSpecs}
          masterData={masterData}
          onUpdateEntry={onUpdateEntry}
          onRemoveEntry={onRemoveEntry}
          onDuplicateEntry={handleDuplicate}
          onCopyEntry={handleCopy}
          copiedItemId={copiedItemId}
          onCalculate={onCalculate}
          generateItemDescription={generateItemDescription}
          Pipe3DPreview={Pipe3DPreview}
          nominalBores={availableNominalBores}
          availableSchedulesMap={availableSchedulesMap}
          setAvailableSchedulesMap={setAvailableSchedulesMap}
          fetchAvailableSchedules={fetchAvailableSchedules}
          pressureClassesByStandard={pressureClassesByStandard}
          getFilteredPressureClasses={getFilteredPressureClasses}
          isUnregisteredCustomer={isUnregisteredCustomer}
          onShowRestrictionPopup={onShowRestrictionPopup}
        />
      )}
    </div>
  );
});

// Render counter for performance debugging
let itemUploadStepRenderCount = 0;

export default function ItemUploadStep({ entries, globalSpecs, masterData, onAddEntry, onAddBendEntry, onAddFittingEntry, onAddPipeSteelWorkEntry, onAddExpansionJointEntry, onUpdateEntry, onRemoveEntry, onDuplicateEntry, onCalculate, onCalculateBend, onCalculateFitting, errors: _errors, loading: _loading, fetchAvailableSchedules, availableSchedulesMap, setAvailableSchedulesMap, fetchBendOptions: _fetchBendOptions, fetchCenterToFace: _fetchCenterToFace, bendOptionsCache: _bendOptionsCache, autoSelectFlangeSpecs: _autoSelectFlangeSpecs, requiredProducts = [], pressureClassesByStandard = {}, getFilteredPressureClasses, hideDrawings = false, onReady }: any) {
  itemUploadStepRenderCount++;
  log.info(`🔄 ItemUploadStep RENDER #${itemUploadStepRenderCount} - entries: ${entries?.length}`);

  const autoFocusedEntriesRef = useRef<Set<string>>(new Set());
  const fetchedSchedulesRef = useRef<Set<string>>(new Set());
  const [availableNominalBores, setAvailableNominalBores] = useState<number[]>([]);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [drawingsHidden, setDrawingsHidden] = useState(hideDrawings);
  const hasCalledOnReady = useRef(false);

  // Authentication status for unregistered customer restrictions
  const { isAuthenticated } = useOptionalCustomerAuth();
  const isUnregisteredCustomer = !isAuthenticated;

  // Restriction popup state - supports different popup types
  type RestrictionPopupType = 'fittings' | 'itemLimit' | 'quantityLimit' | 'drawings';
  const [restrictionPopup, setRestrictionPopup] = useState<{ type: RestrictionPopupType; x: number; y: number } | null>(null);

  const showRestrictionPopup = useCallback((type: RestrictionPopupType) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRestrictionPopup({ type, x: e.clientX, y: e.clientY });
  }, []);

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
      log.error('Failed to copy item to clipboard:', err);
    }
  }, []);

  const duplicateItem = useCallback((entry: any, index: number) => {
    if (onDuplicateEntry) {
      onDuplicateEntry(entry, index);
    }
  }, [onDuplicateEntry]);

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
      if ('requestIdleCallback' in window) {
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

          const hasSteelSpec = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;

          if (entry.itemType === 'fitting') {
            autoFocusedEntriesRef.current.add(entry.id);
            const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
            const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');
            if (!entry.specs?.fittingType) {
              focusAndOpenSelect(`fitting-type-${entry.id}`);
            } else if (!entry.specs?.nominalDiameterMm) {
              focusAndOpenSelect(`fitting-nb-${entry.id}`);
            } else if (effectiveStandard === 'SABS719' && !entry.specs?.scheduleNumber) {
              focusAndOpenSelect(`fitting-schedule-${entry.id}`);
            }
          } else if (entry.itemType === 'bend' && hasSteelSpec) {
            autoFocusedEntriesRef.current.add(entry.id);
            const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
            if (isSABS719 && !entry.specs?.bendRadiusType) {
              focusAndOpenSelect(`bend-radius-type-${entry.id}`);
            } else if (!isSABS719 && !entry.specs?.bendType) {
              focusAndOpenSelect(`bend-type-${entry.id}`);
            } else if (!entry.specs?.nominalBoreMm) {
              focusAndOpenSelect(`bend-nb-${entry.id}`);
            } else if (!entry.specs?.bendDegrees) {
              focusAndOpenSelect(`bend-angle-${entry.id}`);
            }
          } else if (entry.itemType === 'straight_pipe') {
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
    if (globalSpecs?.flangeStandardId && typeof globalSpecs.flangeStandardId === 'number') {
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
    standardsToFetch.forEach(standardId => {
      if (!pressureClassesByStandard[standardId] && getFilteredPressureClasses) {
        getFilteredPressureClasses(standardId);
      }
    });
  }, [entries, globalSpecs?.flangeStandardId, pressureClassesByStandard, getFilteredPressureClasses]);

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
    'SABS 62': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
    'SANS 62': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
    // South African Standards - SABS/SANS 719 (Large bore from 200mm)
    'SABS 719': [200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200],
    'SANS 719': [200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200],
    // ASTM A106 - Seamless Carbon Steel (full standard range)
    'ASTM A106': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600],
    // ASTM A53 - Welded and Seamless (full standard range)
    'ASTM A53': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600],
    // API 5L - Line Pipe (wide range including large sizes)
    'API 5L': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200],
    // ASTM A333 - Low Temperature Service
    'ASTM A333': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600],
    // ASTM A179 - Heat Exchanger Tubes (smaller sizes)
    'ASTM A179': [15, 20, 25, 32, 40, 50, 65, 80, 100],
    // ASTM A192 - Boiler Tubes (smaller sizes)
    'ASTM A192': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125],
    // ASTM A500 - Structural Tubing
    'ASTM A500': [25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500],
    // ASTM A335 - Alloy Steel for High Temperature
    'ASTM A335': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600],
    // ASTM A312 - Stainless Steel Pipe
    'ASTM A312': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600],
  };

  // Get fallback NBs based on steel spec name
  const getFallbackNBsForSteelSpec = (steelSpecName: string): number[] | null => {
    if (!steelSpecName) return null;

    // Check each key pattern
    for (const [pattern, nbs] of Object.entries(STEEL_SPEC_NB_FALLBACK)) {
      if (steelSpecName.includes(pattern)) {
        return nbs;
      }
    }
    return null;
  };

  // Use nominal bores from master data, fallback to hardcoded values
  // Remove duplicates using Set and sort
  // Handle both snake_case (from API) and camelCase (from fallback data) property names
  const allNominalBores = (masterData.nominalBores?.length > 0
    ? Array.from(new Set(masterData.nominalBores.map((nb: any) => (nb.nominal_diameter_mm ?? nb.nominalDiameterMm) as number))).sort((a, b) => (a as number) - (b as number))
    : [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1200, 1400, 1600, 1800, 2000]) as number[]; // fallback values

  // Filter available NB sizes based on the selected steel specification
  // Uses the STEEL_SPEC_NB_FALLBACK mapping to ensure correct NB ranges for each steel type
  useEffect(() => {
    const steelSpecId = globalSpecs?.steelSpecificationId;

    if (!steelSpecId) {
      // No steel spec selected, show all NBs
      log.debug('[ItemUploadStep] No steel spec selected, showing all NBs');
      setAvailableNominalBores(allNominalBores);
      return;
    }

    // Get the steel spec name for lookup
    const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === steelSpecId);
    const steelSpecName = steelSpec?.steelSpecName || '';

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

  const formatWeight = (weight: number | undefined) => {
    if (weight === undefined) return 'Not calculated';
    return `${weight.toFixed(2)} kg`;
  };

  const getTotalWeight = () => {
    // Check if BNW should be included
    const showBnw = requiredProducts.includes('fasteners_gaskets');

    return entries.reduce((total: number, entry: any) => {
      const qty = entry.calculation?.calculatedPipeCount || entry.specs?.quantityValue || 0;

      // Calculate item weight based on type
      let entryTotal = 0;
      if (entry.itemType === 'bend') {
        // For bends, use component weights (per-unit) * qty
        const bendWeightPerUnit = entry.calculation?.bendWeight || 0;
        const tangentWeightPerUnit = entry.calculation?.tangentWeight || 0;
        const flangeWeightPerUnit = entry.calculation?.flangeWeight || 0;
        entryTotal = (bendWeightPerUnit + tangentWeightPerUnit + flangeWeightPerUnit) * qty;
      } else if (entry.itemType === 'fitting') {
        entryTotal = entry.calculation?.totalWeight || 0;
      } else {
        // Straight pipes - totalSystemWeight is already total
        entryTotal = entry.calculation?.totalSystemWeight || 0;
      }

      // Add BNW and gasket weights if applicable
      let bnwWeight = 0;
      let gasketWeight = 0;
      let stubBnwWeight = 0;
      let stubGasketWeight = 0;

      if (showBnw) {
        const pressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
        const pressureClass = pressureClassId
          ? masterData.pressureClasses?.find((p: any) => p.id === pressureClassId)?.designation
          : 'PN16';
        const nbMm = entry.specs?.nominalBoreMm || 100;

        // Determine if item has flanges based on type
        let hasFlanges = false;
        if (entry.itemType === 'bend') {
          const bendEndConfig = entry.specs?.bendEndConfiguration || 'PE';
          hasFlanges = bendEndConfig !== 'PE';
        } else if (entry.itemType === 'straight_pipe' || !entry.itemType) {
          const pipeEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
          hasFlanges = pipeEndConfig !== 'PE';
        }

        if (hasFlanges && qty > 0) {
          const bnwInfo = getBnwSetInfo(nbMm, pressureClass || 'PN16');
          const bnwWeightPerSet = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;
          bnwWeight = bnwWeightPerSet * qty;

          // Add gasket weight
          if (globalSpecs?.gasketType) {
            const singleGasketWeight = getGasketWeight(globalSpecs.gasketType, nbMm);
            gasketWeight = singleGasketWeight * qty;
          }
        }

        // Add stub BNW and gasket weights for bends
        if (entry.itemType === 'bend' && entry.specs?.stubs?.length > 0) {
          entry.specs.stubs.forEach((stub: any) => {
            if (stub?.nominalBoreMm) {
              const stubNb = stub.nominalBoreMm;
              const stubBnwInfo = getBnwSetInfo(stubNb, pressureClass || 'PN16');
              const stubBnwWeightPerSet = stubBnwInfo.weightPerHole * stubBnwInfo.holesPerFlange;
              stubBnwWeight += stubBnwWeightPerSet * qty;

              if (globalSpecs?.gasketType) {
                const stubSingleGasketWeight = getGasketWeight(globalSpecs.gasketType, stubNb);
                stubGasketWeight += stubSingleGasketWeight * qty;
              }
            }
          });
        }
      }

      return total + entryTotal + bnwWeight + gasketWeight + stubBnwWeight + stubGasketWeight;
    }, 0);
  };

  const generateItemDescription = useCallback((entry: any) => {
    // Handle bend items
    if (entry.itemType === 'bend') {
      const nb = entry.specs?.nominalBoreMm || 'XX';
      // Clean schedule to avoid "SchSch" - remove any existing "Sch" prefix
      let schedule = entry.specs?.scheduleNumber || 'XX';
      if (schedule.toString().toLowerCase().startsWith('sch')) {
        schedule = schedule.substring(3);
      }
      const bendTypeRaw = entry.specs?.bendRadiusType || entry.specs?.bendType || 'X.XD';
      const bendAngle = entry.specs?.bendDegrees || 'XX';
      const centerToFace = entry.specs?.centerToFaceMm;
      const bendEndConfig = entry.specs?.bendEndConfiguration || 'PE';

      // Format bend type for description - add "Radius" where needed
      const bendType = bendTypeRaw === 'elbow' ? 'Short Radius' :
                       bendTypeRaw === 'medium' ? 'Medium Radius' :
                       bendTypeRaw === 'long' ? 'Long Radius' :
                       bendTypeRaw === '1.5D' ? '1.5D (Short Radius)' :
                       bendTypeRaw === '3D' ? '3D (Long Radius)' :
                       bendTypeRaw === '5D' ? '5D (Extra Long Radius)' :
                       bendTypeRaw;

      // Get steel spec name and ID for format determination
      const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
      const steelSpec = steelSpecId
        ? masterData.steelSpecs.find((s: any) => s.id === steelSpecId)?.steelSpecName
        : undefined;

      // Check if SABS 719 (ERW steel - id 8) - uses W/T format instead of Schedule
      const isSABS719Bend = steelSpecId === 8;
      // For SABS 719, prioritize user-selected W/T; for others, use calculation (schedule-derived) first
      const wallThicknessBend = isSABS719Bend
        ? (entry.specs?.wallThicknessMm || entry.calculation?.wallThicknessMm)
        : (entry.calculation?.wallThicknessMm || entry.specs?.wallThicknessMm);

      // Get flange specs
      const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
      const flangePressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
      const flangeStandard = flangeStandardId
        ? masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId)?.code
        : '';
      const pressureClass = flangePressureClassId
        ? masterData.pressureClasses?.find((p: any) => p.id === flangePressureClassId)?.designation
        : '';

      // Build description with different format based on steel spec:
      // SABS 719: "80NB W/T 6mm SABS 719 ERW 45° 3D Bend"
      // SABS 62/ASTM: "80NB Sch 40 (6.02mm) ASTM A106 45° 3D Bend"
      let description = `${nb}NB`;

      if (isSABS719Bend) {
        // SABS 719: Show W/T only, no schedule
        if (wallThicknessBend) {
          description += ` W/T ${wallThicknessBend}mm`;
        }
        if (steelSpec) {
          description += ` ${steelSpec}`;
        }
      } else {
        // SABS 62/ASTM: Show Sch with WT in brackets
        description += ` Sch ${schedule}`;
        if (wallThicknessBend) {
          description += ` (${wallThicknessBend}mm)`;
        }
        if (steelSpec) {
          description += ` ${steelSpec}`;
        }
      }

      // Add segment count for SABS 719 segmented bends
      const numSegments = entry.specs?.numberOfSegments || 0;
      if (numSegments > 1) {
        description += ` ${bendAngle}° ${bendType} ${numSegments} Seg Bend`;
      } else {
        description += ` ${bendAngle}° ${bendType} Bend`;
      }

      // Add C/F - if tangents are present, show C/F + tangent for each end
      const tangentLengths = entry.specs?.tangentLengths || [];
      const tangent1 = tangentLengths[0] || 0;
      const tangent2 = tangentLengths[1] || 0;
      const numTangents = entry.specs?.numberOfTangents || 0;

      if (centerToFace) {
        const cf = Number(centerToFace);
        if (numTangents > 0 && (tangent1 > 0 || tangent2 > 0)) {
          // Show C/F + tangent lengths: "455x555 C/F" or "455 C/F" for single tangent
          const end1 = cf + tangent1;
          const end2 = cf + tangent2;
          if (numTangents === 2 && tangent1 > 0 && tangent2 > 0) {
            description += ` ${end1.toFixed(0)}x${end2.toFixed(0)} C/F`;
          } else if (tangent1 > 0) {
            description += ` ${end1.toFixed(0)}x${cf.toFixed(0)} C/F`;
          } else if (tangent2 > 0) {
            description += ` ${cf.toFixed(0)}x${end2.toFixed(0)} C/F`;
          } else {
            description += ` C/F ${cf.toFixed(0)}mm`;
          }
        } else {
          description += ` C/F ${cf.toFixed(0)}mm`;
        }
      }

      // Add stub info if present (before flange config so config label can account for stubs)
      const numStubs = entry.specs?.numberOfStubs || 0;
      const stubs = entry.specs?.stubs || [];
      const stub1NB = stubs[0]?.nominalBoreMm;
      const stub1Length = stubs[0]?.length;
      const stub2NB = stubs[1]?.nominalBoreMm;
      const stub2Length = stubs[1]?.length;
      const stub1HasFlange = stubs[0]?.hasFlangeOverride || (stubs[0]?.flangeStandardId && stubs[0]?.flangePressureClassId);
      const stub2HasFlange = stubs[1]?.hasFlangeOverride || (stubs[1]?.flangeStandardId && stubs[1]?.flangePressureClassId);

      if (numStubs > 0) {
        if (numStubs === 1 && stub1NB && stub1Length) {
          description += ` + ${stub1NB}NB x ${stub1Length}mm Stub`;
        } else if (numStubs === 2 && stub1NB && stub1Length && stub2NB && stub2Length) {
          if (stub1NB === stub2NB && stub1Length === stub2Length) {
            description += ` + 2x${stub1NB}NB x ${stub1Length}mm Stubs`;
          } else {
            description += ` + ${stub1NB}NB x ${stub1Length}mm Stub + ${stub2NB}NB x ${stub2Length}mm Stub`;
          }
        }
      }

      // Add flange config and specs if not plain ended
      // Format: F2E+R/F when stub has rotating flange, F2E+L/F for loose flange, etc.
      if (bendEndConfig && bendEndConfig !== 'PE') {
        let configLabel = bendEndConfig === 'FBE' ? 'FBE' :
                           bendEndConfig === 'FOE' ? 'FOE' :
                           bendEndConfig === 'FOE_LF' ? 'FOE+L/F' :
                           bendEndConfig === 'FOE_RF' ? 'FOE+R/F' :
                           bendEndConfig === '2xLF' ? '2xL/F' :
                           bendEndConfig === '2X_RF' ? '2xR/F' : bendEndConfig;

        // If stubs have flanges, add the stub flange type to the config label
        if (numStubs > 0 && (stub1HasFlange || stub2HasFlange)) {
          const stub1FlangeType = stubs[0]?.flangeType || 'S/O';
          const stub2FlangeType = stubs[1]?.flangeType || 'S/O';

          // Build stub flange suffix
          const stubFlangeLabels: string[] = [];
          if (stub1HasFlange && stubs[0]?.nominalBoreMm) {
            stubFlangeLabels.push(stub1FlangeType);
          }
          if (stub2HasFlange && stubs[1]?.nominalBoreMm) {
            stubFlangeLabels.push(stub2FlangeType);
          }

          if (stubFlangeLabels.length > 0) {
            // Convert main config to F2E format if FBE
            const mainConfigLabel = bendEndConfig === 'FBE' ? 'F2E' :
                                    bendEndConfig === 'FOE' ? 'FOE' :
                                    bendEndConfig === 'FOE_LF' ? 'FOE+L/F' :
                                    bendEndConfig === 'FOE_RF' ? 'FOE+R/F' :
                                    bendEndConfig === '2xLF' ? '2xL/F' :
                                    bendEndConfig === '2X_RF' ? '2xR/F' : bendEndConfig;
            configLabel = `${mainConfigLabel}+${stubFlangeLabels.join('+')}`;
          }
        } else if (numStubs > 0) {
          // Stubs without flanges: F2E+OE
          configLabel = bendEndConfig === 'FBE' ? 'F2E+OE' : configLabel;
        }

        description += ` ${configLabel}`;
        if (flangeStandard && pressureClass) {
          description += ` ${flangeStandard} ${pressureClass}`;
        }
      }

      return description;
    }

    // Handle fitting items
    if (entry.itemType === 'fitting') {
      const fittingNb = entry.specs?.nominalDiameterMm || entry.specs?.nominalBoreMm || 'XX';
      const fittingTypeRaw = entry.specs?.fittingType || 'Fitting';
      const fittingStandard = entry.specs?.fittingStandard || '';
      const fittingSchedule = entry.specs?.scheduleNumber || '';
      const fittingWallThickness = entry.specs?.wallThicknessMm;
      const fittingEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
      const pipeLengthA = entry.specs?.pipeLengthAMm;
      const pipeLengthB = entry.specs?.pipeLengthBMm;

      // Get steel spec name if available
      const fittingSteelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
      const fittingSteelSpec = fittingSteelSpecId
        ? masterData.steelSpecs.find((s: any) => s.id === fittingSteelSpecId)?.steelSpecName
        : undefined;

      // Format fitting type: remove underscores, proper case, add "Equal" for equal Tees
      // e.g., "SHORT_TEE" → "Short Equal Tee", "GUSSET_TEE" → "Gusset Equal Tee"
      let fittingType = fittingTypeRaw
        .replace(/_/g, ' ')
        .toLowerCase()
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Add "Equal" before "Tee" for equal tees (SHORT_TEE, GUSSET_TEE, EQUAL_TEE)
      // But NOT for UNEQUAL_TEE, UNEQUAL_SHORT_TEE, etc.
      const isEqualTeeType = ['SHORT_TEE', 'GUSSET_TEE', 'EQUAL_TEE'].includes(fittingTypeRaw);
      if (isEqualTeeType && !fittingType.includes('Equal')) {
        fittingType = fittingType.replace(/\bTee\b/i, 'Equal Tee');
      }

      let fittingDesc = `${fittingNb}NB ${fittingType}`;

      // Check if SABS 719 (ERW steel - id 8) - uses W/T format instead of Schedule
      const isSABS719Fitting = fittingSteelSpecId === 8;

      // Add schedule/WT with different format based on steel spec:
      // SABS 719: "100NB Short Equal Tee W/T 6mm SABS 719 ERW"
      // SABS 62/ASTM: "100NB Short Equal Tee Sch40 (6.02mm) ASTM A106"
      if (isSABS719Fitting) {
        // SABS 719: Show W/T only, no schedule
        if (fittingWallThickness) {
          fittingDesc += ` W/T ${fittingWallThickness}mm`;
        }
        if (fittingSteelSpec) {
          fittingDesc += ` ${fittingSteelSpec}`;
        } else if (fittingStandard) {
          fittingDesc += ` ${fittingStandard}`;
        }
      } else {
        // SABS 62/ASTM: Show Sch with WT in brackets
        if (fittingSchedule) {
          const cleanSchedule = fittingSchedule.replace('Sch', '').replace('sch', '');
          fittingDesc += ` Sch${cleanSchedule}`;
          if (fittingWallThickness) {
            fittingDesc += ` (${fittingWallThickness}mm)`;
          }
        }
        // Add steel spec (only once)
        if (fittingStandard) {
          fittingDesc += ` ${fittingStandard}`;
        } else if (fittingSteelSpec) {
          fittingDesc += ` ${fittingSteelSpec}`;
        }
      }

      // Add C/F dimensions (pipe lengths A x B)
      if (pipeLengthA || pipeLengthB) {
        const lenA = pipeLengthA ? Math.round(pipeLengthA) : 0;
        const lenB = pipeLengthB ? Math.round(pipeLengthB) : 0;
        if (lenA > 0 && lenB > 0) {
          fittingDesc += ` (${lenA}x${lenB})`;
        } else if (lenA > 0) {
          fittingDesc += ` (${lenA}mm)`;
        } else if (lenB > 0) {
          fittingDesc += ` (${lenB}mm)`;
        }
      }

      // Add flange config (replacing 2nd SABS 719 reference)
      if (fittingEndConfig && fittingEndConfig !== 'PE') {
        const configLabel = fittingEndConfig === 'F2E' ? 'F2E' :
                             fittingEndConfig === 'F2E_LF' ? 'F2E+L/F' :
                             fittingEndConfig === 'F2E_RF' ? 'F2E+R/F' :
                             fittingEndConfig === '3X_RF' ? '3xR/F' :
                             fittingEndConfig === '2X_RF_FOE' ? '2xR/F+FOE' : fittingEndConfig;
        fittingDesc += ` ${configLabel}`;

        // Add flange standard and pressure class if not PE
        const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
        const flangePressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
        const flangeStandard = flangeStandardId
          ? masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId)?.code
          : '';
        const pressureClass = flangePressureClassId
          ? masterData.pressureClasses?.find((p: any) => p.id === flangePressureClassId)?.designation
          : '';

        if (flangeStandard && pressureClass) {
          fittingDesc += ` ${flangeStandard} ${pressureClass}`;
        }
      }

      return fittingDesc;
    }

    // Handle straight pipe items
    const nb = entry.specs.nominalBoreMm || 'XX';
    let schedule = entry.specs.scheduleNumber || (entry.specs.wallThicknessMm ? `${entry.specs.wallThicknessMm}WT` : 'XX');
    const wallThickness = entry.specs.wallThicknessMm;
    const pipeLength = entry.specs.individualPipeLength;
    const pipeEndConfig = entry.specs.pipeEndConfiguration || 'PE';

    if(schedule.startsWith('Sch')){
      schedule = schedule.substring(3);
    }

    // Convert pipe end config to flange display format
    const getFlangeDisplay = (config: string): string => {
      switch (config) {
        case 'FOE': return '1X R/F';
        case 'FBE': return '2X R/F';
        case 'FOE_LF': return '1X R/F, 1X L/F';
        case 'FOE_RF': return '2X R/F';
        case '2X_RF': return '2X R/F';
        case 'PE':
        default: return '';
      }
    };

    // Get flange standard and pressure class
    const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
    const flangePressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
    const flangeStandard = flangeStandardId
      ? masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId)?.code
      : '';
    const pressureClass = flangePressureClassId
      ? masterData.pressureClasses?.find((p: any) => p.id === flangePressureClassId)?.designation
      : '';

    // Get steel spec name for pipes (moved up to include in description early)
    const pipesteelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
    const pipeSteelSpec = pipesteelSpecId
      ? masterData.steelSpecs.find((s: any) => s.id === pipesteelSpecId)?.steelSpecName
      : undefined;

    // Check if SABS 719 (ERW steel - id 8) - uses W/T format instead of Schedule
    const isSABS719 = pipesteelSpecId === 8;

    // Build description with different format based on steel spec:
    // SABS 719: "500NB W/T 6mm SABS 719 ERW Pipe"
    // SABS 62/ASTM: "500NB Sch 40 (6.02mm) ASTM A106 Gr B Pipe"
    let description = `${nb}NB`;

    if (isSABS719) {
      // SABS 719: Show W/T only, no schedule
      if (wallThickness) {
        description += ` W/T ${wallThickness}mm`;
      }
      if (pipeSteelSpec) {
        description += ` ${pipeSteelSpec}`;
      }
    } else {
      // SABS 62/ASTM: Show Sch with WT in brackets
      description += ` Sch ${schedule}`;
      if (wallThickness) {
        description += ` (${wallThickness}mm)`;
      }
      if (pipeSteelSpec) {
        description += ` ${pipeSteelSpec}`;
      }
    }

    description += ' Pipe';

    // Add pipe length if available
    if (pipeLength) {
      description += `, ${pipeLength}Lg`;
    }

    // Add flange configuration if not plain ended
    const flangeDisplay = getFlangeDisplay(pipeEndConfig);
    if (flangeDisplay) {
      description += `, ${flangeDisplay}`;
    }

    // Add flange spec and class if available and has flanges
    if (flangeDisplay && flangeStandard && pressureClass) {
      description += `, ${flangeStandard} ${pressureClass}`;
    }

    return description;
  }, [globalSpecs, masterData.steelSpecs, masterData.flangeStandards, masterData.pressureClasses]);

  // Update item descriptions when globalSpecs.workingPressureBar changes
  useEffect(() => {
    if (globalSpecs?.workingPressureBar) {
      entries.forEach((entry: any) => {
        // Only update if the entry has required specs and a description
        if (entry.specs?.nominalBoreMm && entry.description) {
          const newDescription = generateItemDescription(entry);
          // Only update if description actually changed
          if (newDescription !== entry.description) {
            log.debug(`[Description Update] Updating description for entry ${entry.id} with new pressure: ${globalSpecs.workingPressureBar} bar`);
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
        if (entry.itemType !== 'straight_pipe' && entry.itemType !== undefined) continue;

        const nominalBore = entry.specs?.nominalBoreMm;
        if (!nominalBore) continue;

        // Use ref to track fetches - prevents infinite loop from stale closure
        if (fetchedSchedulesRef.current.has(entry.id)) continue;
        if (availableSchedulesMap[entry.id]?.length > 0) continue;

        // Mark as fetching before the async call to prevent duplicate fetches
        fetchedSchedulesRef.current.add(entry.id);

        const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId || 2;
        await fetchAvailableSchedules(entry.id, steelSpecId, nominalBore);
      }
    };

    prefetchSchedules();
  }, [masterData.nominalBores?.length, entries, availableSchedulesMap, globalSpecs?.steelSpecificationId, fetchAvailableSchedules]);

  const addItemButtons = (insertAtStart?: boolean) => (
    <div className="flex gap-2">
      <button
        onClick={!canAddMoreItems ? showRestrictionPopup('itemLimit') : () => {
          // Track existing pipe NB select IDs before adding
          const existingIds = new Set(
            Array.from(document.querySelectorAll('[id^="pipe-nb-"]')).map(el => el.id)
          );

          onAddEntry(undefined, insertAtStart);

          // Focus the NB field of the new pipe after a delay to ensure DOM is ready
          const tryFocus = (attempt: number) => {
            if (attempt > 10) return;
            setTimeout(() => {
              // Find the new NB select that wasn't there before
              const allNbSelects = document.querySelectorAll('[id^="pipe-nb-"]');
              let newSelect: Element | null = null;

              for (const select of allNbSelects) {
                if (!existingIds.has(select.id)) {
                  newSelect = select;
                  break;
                }
              }

              if (newSelect) {
                // Click and scroll to the new select
                const button = newSelect as HTMLElement;
                button.click();
                button.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } else {
                // New element not found yet, retry
                tryFocus(attempt + 1);
              }
            }, 150 + (attempt * 100));
          };
          tryFocus(0);
        }}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-md border transition-colors ${
          !canAddMoreItems
            ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
            : 'bg-blue-100 hover:bg-blue-200 border-blue-300'
        }`}
      >
        {!canAddMoreItems && (
          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        )}
        <svg className={`w-4 h-4 ${!canAddMoreItems ? 'text-gray-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className={`text-xs font-semibold ${!canAddMoreItems ? 'text-gray-500' : 'text-blue-700'}`}>Pipe</span>
      </button>
      <button
        onClick={!canAddMoreItems ? showRestrictionPopup('itemLimit') : () => onAddBendEntry(undefined, insertAtStart)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-md border transition-colors ${
          !canAddMoreItems
            ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
            : 'bg-purple-100 hover:bg-purple-200 border-purple-300'
        }`}
      >
        {!canAddMoreItems && (
          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        )}
        <svg className={`w-4 h-4 ${!canAddMoreItems ? 'text-gray-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className={`text-xs font-semibold ${!canAddMoreItems ? 'text-gray-500' : 'text-purple-700'}`}>Bend</span>
      </button>
      <button
        onClick={isUnregisteredCustomer ? showRestrictionPopup('fittings') : () => onAddFittingEntry(undefined, insertAtStart)}
        onMouseEnter={isUnregisteredCustomer ? showRestrictionPopup('fittings') : undefined}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-md border transition-colors ${
          isUnregisteredCustomer
            ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
            : 'bg-green-100 hover:bg-green-200 border-green-300'
        }`}
      >
        {isUnregisteredCustomer && (
          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        )}
        <svg className={`w-4 h-4 ${isUnregisteredCustomer ? 'text-gray-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className={`text-xs font-semibold ${isUnregisteredCustomer ? 'text-gray-500' : 'text-green-700'}`}>Fitting</span>
      </button>
      {requiredProducts.includes('pipe_steel_work') && onAddPipeSteelWorkEntry && (
        <button
          onClick={() => onAddPipeSteelWorkEntry(undefined, insertAtStart)}
          className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 rounded-md border border-orange-300 transition-colors"
        >
          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-xs font-semibold text-orange-700">Steel Work</span>
        </button>
      )}
      {requiredProducts.includes('expansion_joint') && onAddExpansionJointEntry && (
        <button
          onClick={() => onAddExpansionJointEntry(undefined, insertAtStart)}
          className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 rounded-md border border-purple-300 transition-colors"
        >
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-xs font-semibold text-purple-700">Expansion Joint</span>
        </button>
      )}
    </div>
  );

  return (
    <div>
      {/* Show item type selection buttons when no items exist */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Your First Item</h2>
          <p className="text-gray-600 mb-8">Select the type of steel item you want to add to this RFQ</p>
          <div className="flex gap-6">
            <button
              onClick={() => onAddEntry()}
              className="flex flex-col items-center justify-center w-48 h-40 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-lg font-semibold">Straight Pipe</span>
              <span className="text-xs text-blue-200 mt-1">Standard pipeline sections</span>
            </button>
            <button
              onClick={() => onAddBendEntry()}
              className="flex flex-col items-center justify-center w-48 h-40 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h4l3-7 4 14 3-7h4" />
              </svg>
              <span className="text-lg font-semibold">Bend Section</span>
              <span className="text-xs text-blue-200 mt-1">Elbows and custom bends</span>
            </button>
            <button
              onClick={isUnregisteredCustomer ? showRestrictionPopup('fittings') : () => onAddFittingEntry()}
              onMouseEnter={isUnregisteredCustomer ? showRestrictionPopup('fittings') : undefined}
              className={`flex flex-col items-center justify-center w-48 h-40 rounded-xl focus:outline-none focus:ring-4 transition-all shadow-lg relative ${
                isUnregisteredCustomer
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed focus:ring-gray-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl focus:ring-blue-300'
              }`}
            >
              {isUnregisteredCustomer && (
                <div className="absolute top-2 right-2">
                  <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-lg font-semibold">Fittings</span>
              <span className={`text-xs mt-1 ${isUnregisteredCustomer ? 'text-gray-300' : 'text-blue-200'}`}>
                {isUnregisteredCustomer ? 'Coming soon' : 'Tees, laterals, and other fittings'}
              </span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Items</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={isUnregisteredCustomer ? showRestrictionPopup('drawings') : () => setDrawingsHidden(!drawingsHidden)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                  isUnregisteredCustomer
                    ? 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200'
                    : effectiveDrawingsHidden
                      ? 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                      : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                }`}
              >
                {isUnregisteredCustomer && (
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}
                {effectiveDrawingsHidden ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
                <span className="text-sm font-medium">{effectiveDrawingsHidden ? 'Show 3D Drawings' : 'Hide 3D Drawings'}</span>
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-green-700 font-semibold">Auto-calculating</span>
                <span className="text-xs text-green-600">Results update automatically</span>
              </div>
              {addItemButtons()}
            </div>
          </div>

          <div className="space-y-3">
            {entries.map((entry: any, index: number) => (
              <ItemWrapper
                key={entry.id}
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
                Pipe3DPreview={isUnregisteredCustomer ? Pipe3DPreview : (effectiveDrawingsHidden ? null : Pipe3DPreview)}
                Bend3DPreview={isUnregisteredCustomer ? Bend3DPreview : (effectiveDrawingsHidden ? null : Bend3DPreview)}
                Tee3DPreview={isUnregisteredCustomer ? Tee3DPreview : (effectiveDrawingsHidden ? null : Tee3DPreview)}
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
            ))}
          </div>

        {/* Total Summary */}
        <div className="border-2 border-blue-200 rounded-md p-3 bg-blue-50">
          {/* Header row with title and add buttons */}
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-base font-bold text-blue-900">Project Summary</h3>
            {/* Add Item Buttons - inline with title */}
            {addItemButtons()}
          </div>
          {/* Items table - each item on its own line */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-300">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-blue-800">Item #</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-blue-800">Description</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-blue-800">Weld WT</th>
                  {requiredProducts.includes('surface_protection') && (
                    <th className="text-center py-2 px-2 text-xs font-semibold text-blue-800">Ext m²</th>
                  )}
                  {requiredProducts.includes('surface_protection') && (
                    <th className="text-center py-2 px-2 text-xs font-semibold text-blue-800">Int m²</th>
                  )}
                  <th className="text-center py-2 px-2 text-xs font-semibold text-blue-800">Qty</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-blue-800">Weight/Item</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-blue-800">Line Weight</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry: any, index: number) => {
                  const itemNumber = entry.clientItemNumber || `#${index + 1}`;
                  const qty = entry.calculation?.calculatedPipeCount || entry.specs?.quantityValue || 0;

                  // Calculate weights differently for bends vs straight pipes
                  let totalWeight = 0;
                  let weightPerItem = 0;

                  if (entry.itemType === 'bend') {
                    // For bends, use component weights (bendWeight + tangentWeight are per-unit)
                    const bendWeightPerUnit = entry.calculation?.bendWeight || 0;
                    const tangentWeightPerUnit = entry.calculation?.tangentWeight || 0;
                    // Flange weight from calculation (already per-unit in API response)
                    const flangeWeightPerUnit = entry.calculation?.flangeWeight || 0;
                    weightPerItem = bendWeightPerUnit + tangentWeightPerUnit + flangeWeightPerUnit;
                    totalWeight = weightPerItem * qty;
                  } else if (entry.itemType === 'fitting') {
                    // For fittings, totalWeight may not be set - fall back to sum of components
                    const fittingCalc = entry.calculation || {};
                    totalWeight = fittingCalc.totalWeight ||
                      ((fittingCalc.fittingWeight || 0) +
                       (fittingCalc.pipeWeight || 0) +
                       (fittingCalc.flangeWeight || 0) +
                       (fittingCalc.boltWeight || 0) +
                       (fittingCalc.nutWeight || 0));
                    weightPerItem = qty > 0 ? totalWeight / qty : 0;
                  } else {
                    // For straight pipes, totalSystemWeight is already total
                    totalWeight = entry.calculation?.totalSystemWeight || 0;
                    weightPerItem = qty > 0 ? totalWeight / qty : 0;
                  }

                  // Calculate BNW info if fasteners_gaskets is selected and item has flanges
                  const showBnw = requiredProducts?.includes('fasteners_gaskets');

                  // Calculate flanges per item based on item type
                  let flangesPerPipe = 0;
                  let stubFlangesPerItem = 0;
                  let boltSetsPerItem = 0;

                  if (entry.itemType === 'straight_pipe' || !entry.itemType) {
                    const pipeEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
                    flangesPerPipe = getFlangesPerPipe(pipeEndConfig);
                    boltSetsPerItem = getBoltSetCountPerPipe(pipeEndConfig);
                  } else if (entry.itemType === 'bend') {
                    // Calculate main bend flanges based on bendEndConfiguration
                    const bendEndConfig = entry.specs?.bendEndConfiguration || 'PE';
                    if (bendEndConfig === 'FBE' || bendEndConfig === 'FOE_RF' || bendEndConfig === '2X_RF' || bendEndConfig === '2xLF') {
                      flangesPerPipe = 2;
                    } else if (bendEndConfig === 'FOE' || bendEndConfig === 'FOE_LF') {
                      flangesPerPipe = 1;
                    }
                    // Bolt sets: 2 same-sized flanged ends = 1 bolt set
                    boltSetsPerItem = getBoltSetCountPerBend(bendEndConfig);
                    // Add stub flanges (each stub has 1 flange AND 1 bolt set)
                    stubFlangesPerItem = entry.specs?.numberOfStubs || 0;
                  } else if (entry.itemType === 'fitting') {
                    // Calculate fitting flanges based on pipeEndConfiguration
                    const fittingEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
                    if (fittingEndConfig === 'F2E') flangesPerPipe = 2;
                    else if (fittingEndConfig === 'F2E_LF') flangesPerPipe = 2;
                    else if (fittingEndConfig === 'F2E_RF') flangesPerPipe = 2;
                    else if (fittingEndConfig === '3X_RF') flangesPerPipe = 3;
                    else if (fittingEndConfig === '2X_RF_FOE') flangesPerPipe = 3;
                    else if (fittingEndConfig !== 'PE') flangesPerPipe = 1;
                    // Bolt sets for fittings handled separately below
                  }

                  const totalFlanges = flangesPerPipe * qty;
                  const totalStubFlanges = stubFlangesPerItem * qty;
                  const totalBoltSets = boltSetsPerItem * qty;

                  // Get pressure class for BNW lookup
                  const pressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
                  const pressureClass = pressureClassId
                    ? masterData.pressureClasses?.find((p: any) => p.id === pressureClassId)?.designation
                    : 'PN16';

                  // Get flange standard for dynamic spec display (e.g., "SANS 1123 1000/3")
                  const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                  const flangeStandardCode = flangeStandardId
                    ? masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId)?.code
                    : null;
                  const flangeSpec = flangeStandardCode && pressureClass
                    ? `${flangeStandardCode} ${pressureClass}`
                    : (pressureClass || 'PN16');

                  const nbMm = entry.specs?.nominalBoreMm || 100;

                  // Get BNW set info
                  const bnwInfo = getBnwSetInfo(nbMm, pressureClass || 'PN16');
                  const bnwWeightPerSet = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;

                  // Calculate weld thickness for flange welds
                  const getWeldThickness = () => {
                    // For fittings (tees/laterals), use wall thickness from specs
                    if (entry.itemType === 'fitting') {
                      const fittingWt = entry.specs?.wallThicknessMm || entry.calculation?.wallThicknessMm;
                      if (fittingWt) {
                        return { thickness: fittingWt, label: 'Fitting WT' };
                      }
                      return null;
                    }

                    const dn = entry.specs?.nominalBoreMm;
                    const schedule = entry.specs?.scheduleNumber || '';
                    const pipeWallThickness = entry.calculation?.wallThicknessMm || entry.specs?.wallThicknessMm;
                    if (!dn && !pipeWallThickness) return null;

                    // Check for SABS 719 - use pattern matching on spec name
                    const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                    const steelSpec = masterData?.steelSpecs?.find((s: any) => s.id === steelSpecId);
                    const steelSpecName = steelSpec?.steelSpecName || '';
                    const isSABS719 = steelSpecName.includes('SABS 719') || steelSpecName.includes('SANS 719');

                    // For SABS 719: use pipe WT rounded to 1.5mm increments (min 6mm)
                    if (isSABS719) {
                      const roundedWt = pipeWallThickness ? roundToWeldIncrement(pipeWallThickness) : null;
                      return { thickness: roundedWt, label: 'SABS 719 WT' };
                    }

                    const scheduleUpper = schedule.toUpperCase();
                    const fittingClass = scheduleUpper.includes('160') || scheduleUpper.includes('XXS') || scheduleUpper.includes('XXH')
                      ? 'XXH' : scheduleUpper.includes('80') || scheduleUpper.includes('XS') || scheduleUpper.includes('XH')
                        ? 'XH' : 'STD';

                    const FITTING_WT: Record<string, Record<number, number>> = {
                      'STD': { 15: 2.77, 20: 2.87, 25: 3.38, 32: 3.56, 40: 3.68, 50: 3.91, 65: 5.16, 80: 5.49, 90: 5.74, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53, 350: 9.53, 400: 9.53, 450: 9.53, 500: 9.53, 600: 9.53, 700: 9.53, 750: 9.53, 800: 9.53, 900: 9.53, 1000: 9.53, 1050: 9.53, 1200: 9.53 },
                      'XH': { 15: 3.73, 20: 3.91, 25: 4.55, 32: 4.85, 40: 5.08, 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.70, 250: 12.70, 300: 12.70, 350: 12.70, 400: 12.70, 450: 12.70, 500: 12.70, 600: 12.70, 700: 12.70, 750: 12.70, 800: 12.70, 900: 12.70, 1000: 12.70, 1050: 12.70, 1200: 12.70 },
                      'XXH': { 15: 7.47, 20: 7.82, 25: 9.09, 32: 9.70, 40: 10.16, 50: 11.07, 65: 14.02, 80: 15.24, 100: 17.12, 125: 19.05, 150: 22.23, 200: 22.23, 250: 25.40, 300: 25.40 }
                    };

                    const fittingWt = dn ? FITTING_WT[fittingClass]?.[dn] : null;
                    const effectiveWt = fittingWt || pipeWallThickness;
                    const label = fittingWt ? fittingClass : 'Pipe WT';
                    return { thickness: effectiveWt, label };
                  };

                  // Calculate per-unit surface areas
                  const getPerUnitSurfaceAreas = () => {
                    // Handle bends - calculate surface area for arc + tangents + stubs
                    if (entry.itemType === 'bend') {
                      const odMm = entry.calculation?.outsideDiameterMm || entry.specs?.outsideDiameterMm;
                      const wtMm = entry.calculation?.wallThicknessMm || entry.specs?.wallThicknessMm;
                      if (!odMm || !wtMm) return { external: null, internal: null };

                      const idMm = odMm - (2 * wtMm);
                      const odM = odMm / 1000;
                      const idM = idMm / 1000;

                      // Get bend radius and angle
                      const bendRadiusMm = entry.specs?.bendRadiusMm || entry.calculation?.bendRadiusMm ||
                        (entry.specs?.centerToFaceMm ? entry.specs.centerToFaceMm : (entry.specs?.nominalBoreMm || 100) * 1.5);
                      const bendAngleDeg = entry.specs?.bendDegrees || 90;
                      const bendAngleRad = (bendAngleDeg * Math.PI) / 180;

                      // Arc length in meters
                      const arcLengthM = (bendRadiusMm / 1000) * bendAngleRad;

                      // Bend arc surface areas
                      let externalArea = odM * Math.PI * arcLengthM;
                      let internalArea = idM * Math.PI * arcLengthM;

                      // Add tangent surface areas
                      const tangentLengths = entry.specs?.tangentLengths || [];
                      const tangent1Mm = tangentLengths[0] || 0;
                      const tangent2Mm = tangentLengths[1] || 0;

                      if (tangent1Mm > 0) {
                        const t1LengthM = tangent1Mm / 1000;
                        externalArea += odM * Math.PI * t1LengthM;
                        internalArea += idM * Math.PI * t1LengthM;
                      }
                      if (tangent2Mm > 0) {
                        const t2LengthM = tangent2Mm / 1000;
                        externalArea += odM * Math.PI * t2LengthM;
                        internalArea += idM * Math.PI * t2LengthM;
                      }

                      // Add stub surface areas
                      if (entry.specs?.stubs?.length > 0) {
                        entry.specs.stubs.forEach((stub: any) => {
                          if (stub?.nominalBoreMm && stub?.length) {
                            // Get stub OD from nominal bore (approximate)
                            const stubOdMm = stub.outsideDiameterMm || (stub.nominalBoreMm * 1.1);
                            const stubWtMm = stub.wallThicknessMm || (stubOdMm * 0.08);
                            const stubIdMm = stubOdMm - (2 * stubWtMm);
                            const stubLengthM = stub.length / 1000;

                            externalArea += (stubOdMm / 1000) * Math.PI * stubLengthM;
                            internalArea += (stubIdMm / 1000) * Math.PI * stubLengthM;
                          }
                        });
                      }

                      return { external: externalArea, internal: internalArea };
                    }

                    // Handle fittings (tees/laterals)
                    if (entry.itemType === 'fitting') {
                      const nb = entry.specs?.nominalDiameterMm;
                      const branchNb = entry.specs?.branchNominalDiameterMm || nb; // Equal tee if no branch NB
                      const wt = entry.specs?.wallThicknessMm || 10;
                      const lengthA = entry.specs?.pipeLengthAMm || 0;
                      const lengthB = entry.specs?.pipeLengthBMm || 0;

                      if (!nb || (!lengthA && !lengthB)) return { external: null, internal: null };

                      // Get OD from NB using lookup
                      const mainOd = NB_TO_OD_LOOKUP[nb] || (nb * 1.05);
                      const branchOd = NB_TO_OD_LOOKUP[branchNb] || (branchNb * 1.05);
                      const mainId = mainOd - (2 * wt);
                      const branchId = branchOd - (2 * wt);

                      // Calculate lengths in meters
                      const runLengthM = (lengthA + lengthB) / 1000;
                      // Branch length = C/F value or estimate as 2× branch OD
                      const branchLengthM = (branchOd * 2) / 1000;

                      // External surface area (m²)
                      // Run pipe: π × OD × length
                      const runExternalArea = (mainOd / 1000) * Math.PI * runLengthM;
                      // Branch pipe: π × OD × length
                      const branchExternalArea = (branchOd / 1000) * Math.PI * branchLengthM;
                      // Subtract overlap at intersection (approximation: branch OD × wt)
                      const overlapExternal = (branchOd / 1000) * (wt / 1000) * Math.PI;
                      const externalArea = runExternalArea + branchExternalArea - overlapExternal;

                      // Internal surface area (m²)
                      // Run pipe: π × ID × length
                      const runInternalArea = (mainId / 1000) * Math.PI * runLengthM;
                      // Branch pipe: π × ID × length
                      const branchInternalArea = (branchId / 1000) * Math.PI * branchLengthM;
                      // Subtract hole cut for branch (circular area): π × r²
                      const holeCutArea = Math.PI * Math.pow((branchId / 1000) / 2, 2);
                      const internalArea = runInternalArea + branchInternalArea - holeCutArea;

                      return { external: externalArea, internal: internalArea };
                    }

                    // Handle straight pipes
                    if (!entry.calculation?.outsideDiameterMm || !entry.specs?.wallThicknessMm) return { external: null, internal: null };

                    // Get pressure class - use entry override if available, otherwise global
                    const pcId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
                    const pcDesignation = pcId
                      ? masterData.pressureClasses?.find((p: any) => p.id === pcId)?.designation
                      : undefined;

                    const surfaceArea = calculateTotalSurfaceArea({
                      outsideDiameterMm: entry.calculation.outsideDiameterMm,
                      insideDiameterMm: calculateInsideDiameter(entry.calculation.outsideDiameterMm, entry.specs.wallThicknessMm),
                      individualPipeLengthM: entry.specs.individualPipeLength || 0,
                      numberOfPipes: 1, // Per unit
                      hasFlangeEnd1: (entry.specs.pipeEndConfiguration || 'PE') !== 'PE',
                      hasFlangeEnd2: ['FBE', 'FOE_RF', '2X_RF'].includes(entry.specs.pipeEndConfiguration || 'PE'),
                      dn: entry.specs.nominalBoreMm,
                      pressureClass: pcDesignation,
                    });

                    return {
                      external: surfaceArea.perPipe.totalExternalAreaM2,
                      internal: surfaceArea.perPipe.totalInternalAreaM2
                    };
                  };

                  const weldThickness = getWeldThickness();
                  const surfaceAreas = getPerUnitSurfaceAreas();

                  return (
                    <React.Fragment key={entry.id}>
                      <tr className="border-b border-blue-100 hover:bg-blue-100/50">
                        <td className="py-2 px-2 font-medium text-blue-900">{itemNumber}</td>
                        <td className="py-2 px-2 text-gray-800 max-w-xs truncate" title={entry.description}>
                          {entry.description || 'No description'}
                        </td>
                        <td className="py-2 px-2 text-center text-gray-700 text-xs">
                          {weldThickness ? (
                            <span title={weldThickness.label}>{weldThickness.thickness?.toFixed(2)}mm</span>
                          ) : '-'}
                        </td>
                        {requiredProducts.includes('surface_protection') && (
                          <td className="py-2 px-2 text-center text-gray-700 text-xs">
                            {surfaceAreas.external !== null ? surfaceAreas.external.toFixed(2) : '-'}
                          </td>
                        )}
                        {requiredProducts.includes('surface_protection') && (
                          <td className="py-2 px-2 text-center text-gray-700 text-xs">
                            {surfaceAreas.internal !== null ? surfaceAreas.internal.toFixed(2) : '-'}
                          </td>
                        )}
                        <td className="py-2 px-2 text-center font-medium text-gray-900">{qty}</td>
                        <td className="py-2 px-2 text-right text-gray-700">{formatWeight(weightPerItem)}</td>
                        <td className="py-2 px-2 text-right font-semibold text-blue-900">{formatWeight(totalWeight)}</td>
                      </tr>
                      {/* BNW Line Item - only show if fasteners selected and item has flanges (not for fittings - handled separately) */}
                      {showBnw && totalBoltSets > 0 && entry.itemType !== 'fitting' && (
                        <tr className="border-b border-orange-100 bg-orange-50/50 hover:bg-orange-100/50">
                          <td className="py-2 px-2 font-medium text-orange-800">BNW-{itemNumber.replace(/#?AIS-?/g, '')}</td>
                          <td className="py-2 px-2 text-orange-700 text-xs">
                            {entry.itemType === 'bend' ? `Main Flange: ` : ''}{bnwInfo.boltSize} BNW Set x{bnwInfo.holesPerFlange} (1 each) - {nbMm}NB {flangeSpec}
                          </td>
                          <td className="py-2 px-2 text-center text-orange-600">-</td>
                          {requiredProducts.includes('surface_protection') && (
                            <td className="py-2 px-2 text-center text-orange-600">-</td>
                          )}
                          {requiredProducts.includes('surface_protection') && (
                            <td className="py-2 px-2 text-center text-orange-600">-</td>
                          )}
                          <td className="py-2 px-2 text-center font-medium text-orange-800">{totalBoltSets}</td>
                          <td className="py-2 px-2 text-right text-orange-700">{formatWeight(bnwWeightPerSet)}</td>
                          <td className="py-2 px-2 text-right font-semibold text-orange-800">{formatWeight(bnwWeightPerSet * totalBoltSets)}</td>
                        </tr>
                      )}
                      {/* Gasket Line Item - only show if fasteners selected and item has flanges (not for fittings - handled separately) */}
                      {showBnw && totalBoltSets > 0 && globalSpecs?.gasketType && entry.itemType !== 'fitting' && (() => {
                        const gasketWeight = getGasketWeight(globalSpecs.gasketType, entry.specs?.nominalBoreMm || 100);
                        const gasketTotalWeight = gasketWeight * totalBoltSets;
                        return (
                          <tr className="border-b border-green-100 bg-green-50/50 hover:bg-green-100/50">
                            <td className="py-2 px-2 font-medium text-green-800">GAS-{itemNumber.replace(/#?AIS-?/g, '')}</td>
                            <td className="py-2 px-2 text-green-700 text-xs">
                              {globalSpecs.gasketType} Gasket (1 each) - {entry.specs?.nominalBoreMm || 100}NB {flangeSpec}
                            </td>
                            <td className="py-2 px-2 text-center text-green-600">-</td>
                            {requiredProducts.includes('surface_protection') && (
                              <td className="py-2 px-2 text-center text-green-600">-</td>
                            )}
                            {requiredProducts.includes('surface_protection') && (
                              <td className="py-2 px-2 text-center text-green-600">-</td>
                            )}
                            <td className="py-2 px-2 text-center font-medium text-green-800">{totalBoltSets}</td>
                            <td className="py-2 px-2 text-right text-green-700">{gasketWeight.toFixed(2)} kg</td>
                            <td className="py-2 px-2 text-right font-semibold text-green-800">{gasketTotalWeight.toFixed(2)} kg</td>
                          </tr>
                        );
                      })()}
                      {/* Fitting BNW and Gasket Line Items - for tees/laterals with flanges */}
                      {showBnw && totalFlanges > 0 && entry.itemType === 'fitting' && (() => {
                        const mainNb = entry.specs?.nominalDiameterMm || entry.specs?.nominalBoreMm || 100;
                        const branchNb = entry.specs?.branchNominalDiameterMm || entry.specs?.branchNominalBoreMm || mainNb;
                        const isEqualTee = mainNb === branchNb;
                        const fittingEndConfig = entry.specs?.pipeEndConfiguration || 'PE';

                        // Use bolt set function: 3 same-sized ends = 2 bolt sets, 2 same-sized ends = 1 bolt set
                        const fittingBoltSets = getBoltSetCountPerFitting(fittingEndConfig, isEqualTee);
                        const mainBoltSetCount = fittingBoltSets.mainBoltSets;
                        const branchBoltSetCount = fittingBoltSets.branchBoltSets;

                        if (mainBoltSetCount === 0 && branchBoltSetCount === 0) return null;

                        const mainBnwInfo = getBnwSetInfo(mainNb, pressureClass || 'PN16');
                        const mainBnwWeightPerSet = mainBnwInfo.weightPerHole * mainBnwInfo.holesPerFlange;
                        const mainGasketWeight = globalSpecs?.gasketType ? getGasketWeight(globalSpecs.gasketType, mainNb) : 0;

                        const branchBnwInfo = branchBoltSetCount > 0 ? getBnwSetInfo(branchNb, pressureClass || 'PN16') : null;
                        const branchBnwWeightPerSet = branchBnwInfo ? branchBnwInfo.weightPerHole * branchBnwInfo.holesPerFlange : 0;
                        const branchGasketWeight = branchBoltSetCount > 0 && globalSpecs?.gasketType ? getGasketWeight(globalSpecs.gasketType, branchNb) : 0;

                        return (
                          <>
                            {/* Main NB BNW Sets */}
                            {mainBoltSetCount > 0 && (
                              <tr className="border-b border-orange-100 bg-orange-50/50 hover:bg-orange-100/50">
                                <td className="py-2 px-2 font-medium text-orange-800">BNW-{itemNumber.replace(/#?AIS-?/g, '')}</td>
                                <td className="py-2 px-2 text-orange-700 text-xs">
                                  {mainBnwInfo.boltSize} BNW Set x{mainBnwInfo.holesPerFlange} (1 set per pipe end × {mainBoltSetCount} ends) - {mainNb}NB {flangeSpec}
                                </td>
                                <td className="py-2 px-2 text-center text-orange-600">-</td>
                                {requiredProducts.includes('surface_protection') && (
                                  <td className="py-2 px-2 text-center text-orange-600">-</td>
                                )}
                                {requiredProducts.includes('surface_protection') && (
                                  <td className="py-2 px-2 text-center text-orange-600">-</td>
                                )}
                                <td className="py-2 px-2 text-center font-medium text-orange-800">{mainBoltSetCount * qty}</td>
                                <td className="py-2 px-2 text-right text-orange-700">{formatWeight(mainBnwWeightPerSet)}</td>
                                <td className="py-2 px-2 text-right font-semibold text-orange-800">{formatWeight(mainBnwWeightPerSet * mainBoltSetCount * qty)}</td>
                              </tr>
                            )}
                            {/* Branch NB BNW Sets - only if different size from main */}
                            {branchBoltSetCount > 0 && (
                              <tr className="border-b border-purple-100 bg-purple-50/50 hover:bg-purple-100/50">
                                <td className="py-2 px-2 font-medium text-purple-800">BNW-{itemNumber.replace(/#?AIS-?/g, '')}-B</td>
                                <td className="py-2 px-2 text-purple-700 text-xs">
                                  Branch: {branchBnwInfo?.boltSize} BNW Set x{branchBnwInfo?.holesPerFlange} ({branchBoltSetCount} {branchBoltSetCount === 1 ? 'set' : 'sets'}) - {branchNb}NB {flangeSpec}
                                </td>
                                <td className="py-2 px-2 text-center text-purple-600">-</td>
                                {requiredProducts.includes('surface_protection') && (
                                  <td className="py-2 px-2 text-center text-purple-600">-</td>
                                )}
                                {requiredProducts.includes('surface_protection') && (
                                  <td className="py-2 px-2 text-center text-purple-600">-</td>
                                )}
                                <td className="py-2 px-2 text-center font-medium text-purple-800">{branchBoltSetCount * qty}</td>
                                <td className="py-2 px-2 text-right text-purple-700">{formatWeight(branchBnwWeightPerSet)}</td>
                                <td className="py-2 px-2 text-right font-semibold text-purple-800">{formatWeight(branchBnwWeightPerSet * branchBoltSetCount * qty)}</td>
                              </tr>
                            )}
                            {/* Main NB Gaskets */}
                            {mainBoltSetCount > 0 && globalSpecs?.gasketType && (
                              <tr className="border-b border-green-100 bg-green-50/50 hover:bg-green-100/50">
                                <td className="py-2 px-2 font-medium text-green-800">GAS-{itemNumber.replace(/#?AIS-?/g, '')}</td>
                                <td className="py-2 px-2 text-green-700 text-xs">
                                  {globalSpecs.gasketType} Gasket (1 per pipe end × {mainBoltSetCount} ends) - {mainNb}NB {flangeSpec}
                                </td>
                                <td className="py-2 px-2 text-center text-green-600">-</td>
                                {requiredProducts.includes('surface_protection') && (
                                  <td className="py-2 px-2 text-center text-green-600">-</td>
                                )}
                                {requiredProducts.includes('surface_protection') && (
                                  <td className="py-2 px-2 text-center text-green-600">-</td>
                                )}
                                <td className="py-2 px-2 text-center font-medium text-green-800">{mainBoltSetCount * qty}</td>
                                <td className="py-2 px-2 text-right text-green-700">{mainGasketWeight.toFixed(2)} kg</td>
                                <td className="py-2 px-2 text-right font-semibold text-green-800">{(mainGasketWeight * mainBoltSetCount * qty).toFixed(2)} kg</td>
                              </tr>
                            )}
                            {/* Branch NB Gaskets - only if different from main */}
                            {branchBoltSetCount > 0 && globalSpecs?.gasketType && (
                              <tr className="border-b border-teal-100 bg-teal-50/50 hover:bg-teal-100/50">
                                <td className="py-2 px-2 font-medium text-teal-800">GAS-{itemNumber.replace(/#?AIS-?/g, '')}-B</td>
                                <td className="py-2 px-2 text-teal-700 text-xs">
                                  Branch: {globalSpecs.gasketType} Gasket ({branchBoltSetCount} {branchBoltSetCount === 1 ? 'pc' : 'pcs'}) - {branchNb}NB {flangeSpec}
                                </td>
                                <td className="py-2 px-2 text-center text-teal-600">-</td>
                                {requiredProducts.includes('surface_protection') && (
                                  <td className="py-2 px-2 text-center text-teal-600">-</td>
                                )}
                                {requiredProducts.includes('surface_protection') && (
                                  <td className="py-2 px-2 text-center text-teal-600">-</td>
                                )}
                                <td className="py-2 px-2 text-center font-medium text-teal-800">{branchBoltSetCount * qty}</td>
                                <td className="py-2 px-2 text-right text-teal-700">{branchGasketWeight.toFixed(2)} kg</td>
                                <td className="py-2 px-2 text-right font-semibold text-teal-800">{(branchGasketWeight * branchBoltSetCount * qty).toFixed(2)} kg</td>
                              </tr>
                            )}
                          </>
                        );
                      })()}
                      {/* Stub BNW Line Items - only for bends with stubs */}
                      {showBnw && totalStubFlanges > 0 && entry.itemType === 'bend' && entry.specs?.stubs?.map((stub: any, stubIndex: number) => {
                        if (!stub?.nominalBoreMm) return null;
                        const stubNb = stub.nominalBoreMm;
                        const stubBnwInfo = getBnwSetInfo(stubNb, pressureClass || 'PN16');
                        const stubBnwWeightPerSet = stubBnwInfo.weightPerHole * stubBnwInfo.holesPerFlange;
                        const stubBnwTotalWeight = stubBnwWeightPerSet * qty;
                        return (
                          <tr key={`stub-bnw-${stubIndex}`} className="border-b border-purple-100 bg-purple-50/50 hover:bg-purple-100/50">
                            <td className="py-2 px-2 font-medium text-purple-800">BNW-{itemNumber.replace(/#?AIS-?/g, '')}-S{stubIndex + 1}</td>
                            <td className="py-2 px-2 text-purple-700 text-xs">
                              Stub {stubIndex + 1}: {stubBnwInfo.boltSize} BNW Set x{stubBnwInfo.holesPerFlange} (1 each) - {stubNb}NB {flangeSpec}
                            </td>
                            <td className="py-2 px-2 text-center text-purple-600">-</td>
                            {requiredProducts.includes('surface_protection') && (
                              <td className="py-2 px-2 text-center text-purple-600">-</td>
                            )}
                            {requiredProducts.includes('surface_protection') && (
                              <td className="py-2 px-2 text-center text-purple-600">-</td>
                            )}
                            <td className="py-2 px-2 text-center font-medium text-purple-800">{qty}</td>
                            <td className="py-2 px-2 text-right text-purple-700">{formatWeight(stubBnwWeightPerSet)}</td>
                            <td className="py-2 px-2 text-right font-semibold text-purple-800">{formatWeight(stubBnwTotalWeight)}</td>
                          </tr>
                        );
                      })}
                      {/* Stub Gasket Line Items - only for bends with stubs */}
                      {showBnw && totalStubFlanges > 0 && globalSpecs?.gasketType && entry.itemType === 'bend' && entry.specs?.stubs?.map((stub: any, stubIndex: number) => {
                        if (!stub?.nominalBoreMm) return null;
                        const stubNb = stub.nominalBoreMm;
                        const stubGasketWeight = getGasketWeight(globalSpecs.gasketType, stubNb);
                        const stubGasketTotalWeight = stubGasketWeight * qty;
                        return (
                          <tr key={`stub-gas-${stubIndex}`} className="border-b border-teal-100 bg-teal-50/50 hover:bg-teal-100/50">
                            <td className="py-2 px-2 font-medium text-teal-800">GAS-{itemNumber.replace(/#?AIS-?/g, '')}-S{stubIndex + 1}</td>
                            <td className="py-2 px-2 text-teal-700 text-xs">
                              Stub {stubIndex + 1}: {globalSpecs.gasketType} Gasket (1 each) - {stubNb}NB {flangeSpec}
                            </td>
                            <td className="py-2 px-2 text-center text-teal-600">-</td>
                            {requiredProducts.includes('surface_protection') && (
                              <td className="py-2 px-2 text-center text-teal-600">-</td>
                            )}
                            {requiredProducts.includes('surface_protection') && (
                              <td className="py-2 px-2 text-center text-teal-600">-</td>
                            )}
                            <td className="py-2 px-2 text-center font-medium text-teal-800">{qty}</td>
                            <td className="py-2 px-2 text-right text-teal-700">{stubGasketWeight.toFixed(2)} kg</td>
                            <td className="py-2 px-2 text-right font-semibold text-teal-800">{stubGasketTotalWeight.toFixed(2)} kg</td>
                          </tr>
                        );
                      })}
                      {/* Blank Flange Line Items - for any item type with addBlankFlange enabled */}
                      {entry.specs?.addBlankFlange && (() => {
                        // Get nominal bore based on item type
                        const blankNb = entry.itemType === 'fitting'
                          ? (entry.specs?.nominalDiameterMm || entry.specs?.nominalBoreMm || 100)
                          : (entry.specs?.nominalBoreMm || 100);
                        const blankFlangeCount = entry.specs?.blankFlangeCount || 1;
                        const blankFlangeWeight = getBlankFlangeWeight(blankNb, pressureClass || 'PN16');
                        const blankFlangeSurfaceArea = getBlankFlangeSurfaceArea(blankNb);
                        const totalBlankFlanges = blankFlangeCount * qty;
                        const totalBlankWeight = blankFlangeWeight * totalBlankFlanges;

                        return (
                          <tr className="border-b border-red-100 bg-red-50/50 hover:bg-red-100/50">
                            <td className="py-2 px-2 font-medium text-red-800">BKF-{itemNumber.replace(/#?AIS-?/g, '')}</td>
                            <td className="py-2 px-2 text-red-700 text-xs">
                              Blank Flange ({blankFlangeCount} per item) - {blankNb}NB {flangeSpec}
                            </td>
                            <td className="py-2 px-2 text-center text-red-600">-</td>
                            {requiredProducts.includes('surface_protection') && (
                              <td className="py-2 px-2 text-center text-red-700 text-xs">
                                {blankFlangeSurfaceArea.external.toFixed(3)}
                              </td>
                            )}
                            {requiredProducts.includes('surface_protection') && (
                              <td className="py-2 px-2 text-center text-red-700 text-xs">
                                {blankFlangeSurfaceArea.internal.toFixed(3)}
                              </td>
                            )}
                            <td className="py-2 px-2 text-center font-medium text-red-800">{totalBlankFlanges}</td>
                            <td className="py-2 px-2 text-right text-red-700">{formatWeight(blankFlangeWeight)}</td>
                            <td className="py-2 px-2 text-right font-semibold text-red-800">{formatWeight(totalBlankWeight)}</td>
                          </tr>
                        );
                      })()}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-blue-400 bg-blue-100">
                  <td className="py-2 px-2 font-bold text-blue-900" colSpan={2}>TOTAL</td>
                  <td className="py-2 px-2"></td>
                  {requiredProducts.includes('surface_protection') && <td className="py-2 px-2"></td>}
                  {requiredProducts.includes('surface_protection') && <td className="py-2 px-2"></td>}
                  <td className="py-2 px-2 text-center font-bold text-blue-900">
                    {(() => {
                      const showBnw = requiredProducts?.includes('fasteners_gaskets');
                      let totalQty = 0;

                      entries.forEach((entry: any) => {
                        const qty = entry.calculation?.calculatedPipeCount || entry.specs?.quantityValue || 0;
                        // Add base item quantity
                        totalQty += qty;

                        // Check if item has flanges
                        let hasFlanges = false;
                        let flangeCount = 0;
                        if (entry.itemType === 'straight_pipe' || !entry.itemType) {
                          const pipeEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
                          hasFlanges = pipeEndConfig !== 'PE';
                        } else if (entry.itemType === 'bend') {
                          const bendEndConfig = entry.specs?.bendEndConfiguration || 'PE';
                          hasFlanges = bendEndConfig !== 'PE';
                        } else if (entry.itemType === 'fitting') {
                          const fittingEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
                          // Count flanges based on configuration
                          if (fittingEndConfig === 'F2E') flangeCount = 2;
                          else if (fittingEndConfig === 'F2E_LF') flangeCount = 2;
                          else if (fittingEndConfig === 'F2E_RF') flangeCount = 2;
                          else if (fittingEndConfig === '3X_RF') flangeCount = 3;
                          else if (fittingEndConfig === '2X_RF_FOE') flangeCount = 3;
                          else if (fittingEndConfig !== 'PE') flangeCount = 1;
                          hasFlanges = flangeCount > 0;
                        }

                        // Add BNW set (using bolt set count: 2 same-sized ends = 1 bolt set)
                        if (showBnw && hasFlanges) {
                          let boltSetCount = 0;
                          if (entry.itemType === 'straight_pipe' || !entry.itemType) {
                            const pipeEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
                            boltSetCount = getBoltSetCountPerPipe(pipeEndConfig);
                          } else if (entry.itemType === 'bend') {
                            const bendEndConfig = entry.specs?.bendEndConfiguration || 'PE';
                            boltSetCount = getBoltSetCountPerBend(bendEndConfig);
                          } else if (entry.itemType === 'fitting') {
                            const fittingEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
                            const mainNb = entry.specs?.nominalDiameterMm || 100;
                            const branchNb = entry.specs?.branchNominalDiameterMm || mainNb;
                            const fittingBoltSets = getBoltSetCountPerFitting(fittingEndConfig, mainNb === branchNb);
                            boltSetCount = fittingBoltSets.mainBoltSets + fittingBoltSets.branchBoltSets;
                          }
                          totalQty += boltSetCount * qty;
                        }

                        // Add Gasket (same as bolt sets)
                        if (showBnw && hasFlanges && globalSpecs?.gasketType) {
                          let boltSetCount = 0;
                          if (entry.itemType === 'straight_pipe' || !entry.itemType) {
                            const pipeEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
                            boltSetCount = getBoltSetCountPerPipe(pipeEndConfig);
                          } else if (entry.itemType === 'bend') {
                            const bendEndConfig = entry.specs?.bendEndConfiguration || 'PE';
                            boltSetCount = getBoltSetCountPerBend(bendEndConfig);
                          } else if (entry.itemType === 'fitting') {
                            const fittingEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
                            const mainNb = entry.specs?.nominalDiameterMm || 100;
                            const branchNb = entry.specs?.branchNominalDiameterMm || mainNb;
                            const fittingBoltSets = getBoltSetCountPerFitting(fittingEndConfig, mainNb === branchNb);
                            boltSetCount = fittingBoltSets.mainBoltSets + fittingBoltSets.branchBoltSets;
                          }
                          totalQty += boltSetCount * qty;
                        }

                        // Add stub BNW and gaskets for bends
                        if (showBnw && entry.itemType === 'bend' && entry.specs?.stubs?.length > 0) {
                          const stubCount = entry.specs.stubs.filter((s: any) => s?.nominalBoreMm).length;
                          totalQty += stubCount * qty; // Stub BNW sets
                          if (globalSpecs?.gasketType) {
                            totalQty += stubCount * qty; // Stub gaskets
                          }
                        }

                        // Add blank flanges
                        if (entry.specs?.addBlankFlange) {
                          totalQty += (entry.specs.blankFlangeCount || 1) * qty;
                        }
                      });

                      return totalQty;
                    })()}
                  </td>
                  <td className="py-2 px-2"></td>
                  <td className="py-2 px-2 text-right font-bold text-blue-900">{formatWeight(getTotalWeight())}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
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
            <svg className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {restrictionPopup.type === 'fittings' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-7a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            <div className="flex-1">
              {restrictionPopup.type === 'fittings' && (
                <>
                  <p className="text-sm font-semibold text-amber-400">Feature Under Construction</p>
                  <p className="text-xs text-gray-300 mt-2">
                    The Fittings module is currently being developed and will be available in a future update.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    This feature will include support for tees, laterals, reducers, and other pipe fittings with automatic calculation of weights and materials.
                  </p>
                  <div className="mt-3 pt-2 border-t border-slate-600">
                    <p className="text-xs text-gray-300">
                      In the meantime, you can add straight pipes and bends to your RFQ.{' '}
                      <Link href="/register" className="text-blue-400 hover:text-blue-300 underline" onClick={() => setRestrictionPopup(null)}>
                        Create an account
                      </Link>
                      {' '}to be notified when this feature launches.
                    </p>
                  </div>
                </>
              )}
              {restrictionPopup.type === 'itemLimit' && (
                <>
                  <p className="text-sm font-semibold text-amber-400">Item Limit Reached</p>
                  <p className="text-xs text-gray-300 mt-2">
                    Unregistered users can add a maximum of {MAX_ITEMS_UNREGISTERED} items to an RFQ.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    You have reached this limit. To add more items to your request for quote, please create a free account.
                  </p>
                  <div className="mt-3 pt-2 border-t border-slate-600">
                    <p className="text-xs text-gray-300">
                      <Link href="/register" className="text-blue-400 hover:text-blue-300 underline" onClick={() => setRestrictionPopup(null)}>
                        Create a free account
                      </Link>
                      {' '}to add unlimited items and access all features.
                    </p>
                  </div>
                </>
              )}
              {restrictionPopup.type === 'quantityLimit' && (
                <>
                  <p className="text-sm font-semibold text-amber-400">Quantity Limit Reached</p>
                  <p className="text-xs text-gray-300 mt-2">
                    Unregistered users can set a maximum quantity of {MAX_QUANTITY_UNREGISTERED} units per item.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    To request larger quantities, please create a free account.
                  </p>
                  <div className="mt-3 pt-2 border-t border-slate-600">
                    <p className="text-xs text-gray-300">
                      <Link href="/register" className="text-blue-400 hover:text-blue-300 underline" onClick={() => setRestrictionPopup(null)}>
                        Create a free account
                      </Link>
                      {' '}to request unlimited quantities and access all features.
                    </p>
                  </div>
                </>
              )}
              {restrictionPopup.type === 'drawings' && (
                <>
                  <p className="text-sm font-semibold text-amber-400">3D Preview - Registered Feature</p>
                  <p className="text-xs text-gray-300 mt-2">
                    Interactive 3D drawings and previews are available to registered users.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Create a free account to visualize your pipes, bends, and fittings in 3D before submitting your RFQ.
                  </p>
                  <div className="mt-3 pt-2 border-t border-slate-600">
                    <p className="text-xs text-gray-300">
                      <Link href="/register" className="text-blue-400 hover:text-blue-300 underline" onClick={() => setRestrictionPopup(null)}>
                        Create a free account
                      </Link>
                      {' '}to access 3D previews and all features.
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
