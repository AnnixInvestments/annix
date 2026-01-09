'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { getPipeEndConfigurationDetails } from '@/app/lib/utils/systemUtils';
import { masterDataApi, pipeScheduleApi } from '@/app/lib/api/client';
import {
  PIPE_END_OPTIONS,
  BEND_END_OPTIONS,
  FITTING_END_OPTIONS,
  SABS719_BEND_TYPES,
  sabs719ValidSegments as getSABS719ValidSegments,
  sabs719ColumnBySegments as getSABS719ColumnBySegments,
  sabs719CenterToFaceBySegments as getSABS719CenterToFaceBySegments,
  weldCountPerBend as getWeldCountPerBend,
  weldCountPerFitting as getWeldCountPerFitting,
  weldCountPerPipe as getWeldCountPerPipe,
  flangesPerPipe as getFlangesPerPipe,
  physicalFlangeCount as getPhysicalFlangeCount,
  fittingFlangeConfig as getFittingFlangeConfig,
  hasLooseFlange,
  fixedFlangeCount as getFixedFlangeCount,
  blankFlangeWeight as getBlankFlangeWeight,
  blankFlangeSurfaceArea as getBlankFlangeSurfaceArea,
  NB_TO_OD_LOOKUP,
  FLANGE_WEIGHT_BY_PRESSURE_CLASS,
  NB_TO_FLANGE_WEIGHT_LOOKUP,
  BOLT_HOLES_BY_NB_AND_PRESSURE,
  BNW_SET_WEIGHT_PER_HOLE,
  boltHolesPerFlange as getBoltHolesPerFlange,
  bnwSetInfo as getBnwSetInfo,
  gasketWeight as getGasketWeight,
  normalizePressureClass,
  flangeWeight as getFlangeWeight,
  getScheduleListForSpec,
  boltSetCountPerBend as getBoltSetCountPerBend,
  boltSetCountPerPipe as getBoltSetCountPerPipe,
  boltSetCountPerFitting as getBoltSetCountPerFitting,
} from '@/app/lib/config/rfq';
import {
  calculateMaxAllowablePressure,
  calculateMinWallThickness,
  validateScheduleForPressure,
  findRecommendedSchedule,
  calculateTotalSurfaceArea,
  calculateInsideDiameter,
} from '@/app/lib/utils/pipeCalculations';
import { recommendWallThicknessCarbonPipe } from '@/app/lib/utils/weldThicknessLookup';
import {
  SABS62_NB_OPTIONS,
  SABS62_BEND_RADIUS,
  getSabs62CFInterpolated,
  getSabs62AvailableAngles,
  SABS62BendType,
} from '@/app/lib/utils/sabs62CfData';

const Pipe3DPreview = dynamic(() => import('@/app/components/rfq/Pipe3DPreview'), { ssr: false, loading: () => <div className="h-64 bg-slate-100 rounded-md animate-pulse mb-4" /> });
const Bend3DPreview = dynamic(() => import('@/app/components/rfq/Bend3DPreview'), { ssr: false, loading: () => <div className="h-64 bg-slate-100 rounded-md animate-pulse mb-4" /> });
const Tee3DPreview = dynamic(() => import('@/app/components/rfq/Tee3DPreview'), { ssr: false, loading: () => <div className="h-64 bg-slate-100 rounded-md animate-pulse mb-4" /> });
import SplitPaneLayout from '@/app/components/rfq/SplitPaneLayout';

export default function ItemUploadStep({ entries, globalSpecs, masterData, onAddEntry, onAddBendEntry, onAddFittingEntry, onUpdateEntry, onRemoveEntry, onCalculate, onCalculateBend, onCalculateFitting, errors, loading, fetchAvailableSchedules, availableSchedulesMap, setAvailableSchedulesMap, fetchBendOptions, fetchCenterToFace, bendOptionsCache, autoSelectFlangeSpecs, requiredProducts = [], pressureClassesByStandard = {}, getFilteredPressureClasses }: any) {
  // State for hiding/showing 3D drawings per item
  const [hiddenDrawings, setHiddenDrawings] = React.useState<Record<string, boolean>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const showSurfaceProtection = requiredProducts.includes('surface_protection');
  const processedEntriesRef = useRef<Set<string>>(new Set());
  // Track entries that have been manually updated by onChange - these should NOT be overwritten by useEffect
  const manuallyUpdatedEntriesRef = useRef<Set<string>>(new Set());
  const [availableNominalBores, setAvailableNominalBores] = useState<number[]>([]);
  const [isLoadingNominalBores, setIsLoadingNominalBores] = useState(false);

  const focusAndOpenSelect = useCallback((selectId: string) => {
    setTimeout(() => {
      const selectElement = document.getElementById(selectId) as HTMLSelectElement;
      if (selectElement) {
        selectElement.focus();
        if (typeof selectElement.showPicker === 'function') {
          try {
            selectElement.showPicker();
          } catch {
            const length = selectElement.options.length;
            selectElement.size = Math.min(length, 10);
            const resetSize = () => {
              selectElement.size = 1;
              selectElement.removeEventListener('blur', resetSize);
              selectElement.removeEventListener('change', resetSize);
            };
            selectElement.addEventListener('blur', resetSize);
            selectElement.addEventListener('change', resetSize);
          }
        } else {
          const length = selectElement.options.length;
          selectElement.size = Math.min(length, 10);
          const resetSize = () => {
            selectElement.size = 1;
            selectElement.removeEventListener('blur', resetSize);
            selectElement.removeEventListener('change', resetSize);
          };
          selectElement.addEventListener('blur', resetSize);
          selectElement.addEventListener('change', resetSize);
        }
      }
    }, 150);
  }, []);

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
  

// SABS 719 ERW wall thickness options for pipe dimensions
// These use "WT" prefix format (Wall Thickness in mm)
const getMinimumWallThickness = (nominalBore: number, pressure: number): number => {
    const odLookup: Record<number, number> = {
      15: 21.3, 20: 26.7, 25: 33.4, 32: 42.2, 40: 48.3, 50: 60.3, 65: 73.0, 80: 88.9,
      100: 114.3, 125: 141.3, 150: 168.3, 200: 219.1, 250: 273.0, 300: 323.9,
      350: 355.6, 400: 406.4, 450: 457.2, 500: 508.0, 600: 609.6, 700: 711.2,
      800: 812.8, 900: 914.4, 1000: 1016.0, 1200: 1219.2
    };
    const od = odLookup[nominalBore] || (nominalBore * 1.05);
    const pressureMpa = pressure * 0.1;
    const allowableStress = 137.9; // MPa for A106 Gr B
    const jointEfficiency = 1.0;
    const safetyFactor = 1.2;
    return (pressureMpa * od * safetyFactor) / (2 * allowableStress * jointEfficiency);
  };

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
      console.log('[ItemUploadStep] No steel spec selected, showing all NBs');
      setAvailableNominalBores(allNominalBores);
      return;
    }

    // Get the steel spec name for lookup
    const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === steelSpecId);
    const steelSpecName = steelSpec?.steelSpecName || '';

    console.log(`[ItemUploadStep] Steel spec selected: ${steelSpecId} - "${steelSpecName}"`);

    // ALWAYS use the fallback mapping based on steel spec name
    // This ensures proper filtering (e.g., SABS 719 only shows 200mm+)
    const filteredNBs = getFallbackNBsForSteelSpec(steelSpecName);

    if (filteredNBs && filteredNBs.length > 0) {
      console.log(`[ItemUploadStep] Filtered NBs for "${steelSpecName}":`, filteredNBs);
      setAvailableNominalBores(filteredNBs);
    } else {
      // No specific mapping found - show all NBs as fallback
      console.log(`[ItemUploadStep] No NB mapping for "${steelSpecName}", showing all NBs`);
      setAvailableNominalBores(allNominalBores);
    }
  }, [globalSpecs?.steelSpecificationId, masterData.steelSpecs]);

  // Use filtered NB list for the dropdown
  const nominalBores = availableNominalBores.length > 0 ? availableNominalBores : allNominalBores;

  // Check for potentially invalid schedules - these are now supported so removing this warning
  // const hasInvalidSchedules = entries.some((entry: StraightPipeEntry) => {
  //   const schedule = entry.specs.scheduleNumber;
  //   return schedule && (schedule === 'Sch10' || schedule === 'Sch20' || schedule === 'Sch30' || schedule === 'Sch5');
  // });

  const fixInvalidSchedules = () => {
    // This function is no longer needed since we support all standard schedules
    // entries.forEach((entry: StraightPipeEntry) => {
    //   const schedule = entry.specs.scheduleNumber;
    //   if (schedule === 'Sch10' || schedule === 'Sch20' || schedule === 'Sch30' || schedule === 'Sch5') {
    //     onUpdateEntry(entry.id, {
    //       specs: { ...entry.specs, scheduleNumber: 'STD' } // Default to STD
    //     });
    //   }
    // });
    // alert('Invalid schedules have been changed to STD. Please review and adjust if needed.');
  };

  const handleCalculateAll = async () => {
    setIsCalculating(true);
    try {
      await onCalculate();
    } catch (error) {
      console.error('Calculation failed:', error);
    } finally {
      setIsCalculating(false);
    }
  };

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

  const generateItemDescription = (entry: any) => {
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
      const wallThicknessBend = entry.calculation?.wallThicknessMm || entry.specs?.wallThicknessMm;

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

      description += ` ${bendAngle}° ${bendType} Bend`;

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
      // Modify config label if stubs have flanges: FBE becomes FAE, or F2E+OE if no stub flange
      if (bendEndConfig && bendEndConfig !== 'PE') {
        let configLabel = bendEndConfig === 'FBE' ? 'FBE' :
                           bendEndConfig === 'FOE' ? 'FOE' :
                           bendEndConfig === 'FOE_LF' ? 'FOE+L/F' :
                           bendEndConfig === 'FOE_RF' ? 'FOE+R/F' :
                           bendEndConfig === '2X_RF' ? '2xR/F' : bendEndConfig;

        // If stubs are present, modify the end config label
        if (numStubs > 0) {
          const anyStubHasFlange = stub1HasFlange || stub2HasFlange;
          if (anyStubHasFlange) {
            // FAE = Flanged All Ends (bend ends + stub flanges)
            configLabel = 'FAE';
          } else {
            // F2E+OE = Flanged 2 Ends + Open Ended stubs
            configLabel = bendEndConfig === 'FBE' ? 'F2E+OE' : configLabel;
          }
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
  };

  // Update item descriptions when globalSpecs.workingPressureBar changes
  useEffect(() => {
    if (globalSpecs?.workingPressureBar) {
      entries.forEach((entry: any) => {
        // Only update if the entry has required specs and a description
        if (entry.specs?.nominalBoreMm && entry.description) {
          const newDescription = generateItemDescription(entry);
          // Only update if description actually changed
          if (newDescription !== entry.description) {
            console.log(`[Description Update] Updating description for entry ${entry.id} with new pressure: ${globalSpecs.workingPressureBar} bar`);
            onUpdateEntry(entry.id, { description: newDescription });
          }
        }
      });
    }
  }, [globalSpecs?.workingPressureBar]);

  // Auto-calculate schedule and wall thickness when pressure and NB are available
  // Uses the new ASME B31.3 pipe schedule API for accurate pressure/temperature-based recommendations
  const autoCalculateSpecs = async (entry: any) => {
    const pressure = globalSpecs?.workingPressureBar;
    const nominalBore = entry.specs.nominalBoreMm;
    const temperature = entry.specs.workingTemperatureC || globalSpecs?.workingTemperatureC || 20;

    console.log('🔍 Auto-calculating specs using ASME B31.3:', { pressure, nominalBore, temperature });

    if (pressure && nominalBore) {
      try {
        const { pipeScheduleApi } = await import('@/app/lib/api/client');

        console.log('📡 Calling pipe-schedule API with:', {
          nbMm: nominalBore,
          pressureBar: pressure,
          temperatureCelsius: temperature
        });

        const recommended = await pipeScheduleApi.recommend({
          nbMm: nominalBore,
          pressureBar: pressure,
          temperatureCelsius: temperature,
          materialCode: 'ASTM_A106_Grade_B', // Default to carbon steel A106 Grade B
        });

        console.log('✅ Pipe schedule API returned:', recommended);

        // Also get available schedules for upgrade options
        let availableUpgrades: any[] = [];
        try {
          const allSchedules = await pipeScheduleApi.getSchedulesByNb(nominalBore);
          // Filter schedules that are thicker than the recommended one
          availableUpgrades = allSchedules
            .filter((s: any) => s.wallThicknessMm > recommended.recommendedWallMm)
            .map((s: any) => ({
              id: s.id,
              schedule_designation: s.schedule,
              wall_thickness_mm: s.wallThicknessMm
            }));
        } catch (err) {
          console.log('Could not fetch upgrade schedules:', err);
        }

        // CRITICAL FIX: Always use fallback schedule data for the schedule name
        // Find the lightest schedule that meets the minimum wall thickness requirement
        const fbEffectiveSpecId = entry?.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
        const fallbackSchedules = getScheduleListForSpec(nominalBore, fbEffectiveSpecId);
        const minWT = recommended.minRequiredThicknessMm;

        const eligibleSchedules = fallbackSchedules
          .filter(s => s.wallThicknessMm >= minWT)
          .sort((a, b) => a.wallThicknessMm - b.wallThicknessMm);

        let finalScheduleName: string;
        let finalWT: number;

        if (eligibleSchedules.length > 0) {
          finalScheduleName = eligibleSchedules[0].scheduleDesignation;
          finalWT = eligibleSchedules[0].wallThicknessMm;
          console.log(`🔄 Using fallback schedule: ${finalScheduleName} (${finalWT}mm) for minWT=${minWT.toFixed(2)}mm`);
        } else if (fallbackSchedules.length > 0) {
          // No schedule meets requirements - use thickest available
          const sorted = [...fallbackSchedules].sort((a, b) => b.wallThicknessMm - a.wallThicknessMm);
          finalScheduleName = sorted[0].scheduleDesignation;
          finalWT = sorted[0].wallThicknessMm;
          console.warn(`⚠️ No schedule meets ${minWT.toFixed(2)}mm minWT, using thickest: ${finalScheduleName} (${finalWT}mm)`);
        } else {
          // No fallback data - use API values as last resort
          finalScheduleName = recommended.recommendedSchedule;
          finalWT = recommended.recommendedWallMm;
          console.warn(`⚠️ No fallback data for ${nominalBore}mm, using API: ${finalScheduleName}`);
        }

        return {
          scheduleNumber: finalScheduleName,
          wallThicknessMm: finalWT,
          workingPressureBar: pressure,
          minimumSchedule: finalScheduleName,
          minimumWallThickness: minWT,
          availableUpgrades: availableUpgrades,
          isScheduleOverridden: false,
          scheduleWarnings: recommended.warnings
        };
      } catch (error) {
        // Silently handle API errors - fallback calculation will be used
        // Only log for debugging (not as error)
        console.log('ℹ️ Pipe schedule API unavailable, using Barlow formula fallback');

        // Fallback to Barlow formula calculation for ASTM A106 Grade B carbon steel
        // Barlow formula: t = (P × D) / (2 × S × E)
        // Where: P = pressure (bar), D = OD (mm), S = allowable stress (MPa), E = joint efficiency
        // For ASTM A106 Gr B: S ≈ 137.9 MPa (20,000 psi) at ambient, E = 1.0 for seamless
        // Simplified: t_min = (P_bar × 0.1 × OD_mm) / (2 × 137.9 × 1.0)

        // OD lookup based on NB (approximate values)
        const odLookup: Record<number, number> = {
          100: 114.3, 150: 168.3, 200: 219.1, 250: 273.0, 300: 323.9,
          350: 355.6, 400: 406.4, 450: 457.2, 500: 508.0, 600: 609.6
        };
        const od = odLookup[nominalBore] || (nominalBore * 1.05); // Fallback estimate

        // Calculate minimum wall thickness using Barlow formula with safety factor
        const pressureMpa = pressure * 0.1; // Convert bar to MPa
        const allowableStress = 137.9; // MPa for A106 Gr B
        const jointEfficiency = 1.0;
        const safetyFactor = 1.2; // Add 20% safety margin
        const minWallThickness = (pressureMpa * od * safetyFactor) / (2 * allowableStress * jointEfficiency);

        console.log(`🔧 Barlow calculation: ${minWallThickness.toFixed(2)}mm min WT for ${nominalBore}NB (OD=${od}mm) at ${pressure} bar`);

        // Find the best matching schedule from fallback data
        const fbEffectiveSpecId = entry?.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
        const fallbackSchedules = getScheduleListForSpec(nominalBore, fbEffectiveSpecId);
        let matchedSchedule = null;
        let matchedWT = minWallThickness;

        if (fallbackSchedules.length > 0) {
          // Find the first schedule that meets or exceeds minimum wall thickness
          const eligibleSchedules = fallbackSchedules
            .filter(s => s.wallThicknessMm >= minWallThickness)
            .sort((a, b) => a.wallThicknessMm - b.wallThicknessMm);

          if (eligibleSchedules.length > 0) {
            matchedSchedule = eligibleSchedules[0].scheduleDesignation;
            matchedWT = eligibleSchedules[0].wallThicknessMm;
          } else {
            // Use thickest available if none meet minimum
            const sorted = [...fallbackSchedules].sort((a, b) => b.wallThicknessMm - a.wallThicknessMm);
            matchedSchedule = sorted[0].scheduleDesignation;
            matchedWT = sorted[0].wallThicknessMm;
          }
        }

        console.log(`🔧 Fallback matched schedule: ${matchedSchedule} (${matchedWT}mm) for min ${minWallThickness.toFixed(2)}mm`);

        return {
          scheduleNumber: matchedSchedule,
          wallThicknessMm: matchedWT,
          workingPressureBar: pressure,
          minimumSchedule: matchedSchedule,
          minimumWallThickness: minWallThickness,
          availableUpgrades: [],
          isScheduleOverridden: false
        };
      }
    } else {
      console.log('⚠️ Skipping auto-calculation - missing pressure or nominal bore:', { pressure, nominalBore });
    }
    return {};
  };

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

        // Only fetch if we don't already have schedules for this entry
        if (availableSchedulesMap[entry.id]?.length > 0) continue;

        const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId || 2;
        await fetchAvailableSchedules(entry.id, steelSpecId, nominalBore);
      }
    };

    prefetchSchedules();
  }, [masterData.nominalBores?.length]);

  const calculateQuantities = (entry: any, field: string, value: number) => {
    const pipeLength = entry.specs.individualPipeLength || 12.192;
    
    if (field === 'totalLength') {
      // User changed total length -> calculate quantity
      const quantity = Math.ceil(value / pipeLength);
      return {
        ...entry,
        specs: {
          ...entry.specs,
          quantityValue: value,
          quantityType: 'total_length'
        },
        calculatedPipes: quantity
      };
    } else if (field === 'numberOfPipes') {
      // User changed quantity -> calculate total length
      const totalLength = value * pipeLength;
      return {
        ...entry,
        specs: {
          ...entry.specs,
          quantityValue: value,  // Store number of pipes
          quantityType: 'number_of_pipes'  // Set correct type
        },
        calculatedPipes: value
      };
    }
    return entry;
  };

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
              onClick={() => onAddFittingEntry()}
              className="flex flex-col items-center justify-center w-48 h-40 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-lg font-semibold">Fittings</span>
              <span className="text-xs text-blue-200 mt-1">Tees, laterals, and other fittings</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Items</h2>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-green-700 font-semibold">Auto-calculating</span>
              <span className="text-xs text-green-600">Results update automatically</span>
            </div>
          </div>

          <div className="space-y-3">
        {entries.map((entry: any, index: number) => (
          <div key={`${entry.id}-${index}`} className="border-2 border-gray-200 rounded-lg p-5 bg-white shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                {/* Editable Item Number - dynamic width based on content */}
                <div className="flex items-center gap-1">
                  <span className="text-base font-semibold text-gray-800">Item</span>
                  <input
                    type="text"
                    value={entry.clientItemNumber || `#${index + 1}`}
                    onChange={(e) => onUpdateEntry(entry.id, { clientItemNumber: e.target.value })}
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
                {/* Sequential numbering checkbox */}
                {entry.specs?.quantityValue > 1 && (
                  <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer ml-2">
                    <input
                      type="checkbox"
                      checked={entry.useSequentialNumbering || false}
                      onChange={(e) => onUpdateEntry(entry.id, { useSequentialNumbering: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Sequential (e.g., {entry.clientItemNumber || `#${index + 1}`}-01, -02)</span>
                  </label>
                )}
              </div>
            </div>

            {entry.itemType === 'bend' ? (
              /* Bend Item Fields */
              <SplitPaneLayout
                entryId={entry.id}
                itemType="bend"
                showSplitToggle={entry.specs?.nominalBoreMm && entry.specs?.bendDegrees}
                formContent={
                  <>
                {/* Item Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                    Item Description *
                  </label>
                  <textarea
                    value={entry.description || ''}
                    onChange={(e) => onUpdateEntry(entry.id, { description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                    rows={2}
                    placeholder="e.g., 40NB 90° 1.5D Bend"
                    required
                  />
                </div>

                {/* Conditional Bend Layout - SABS 719 vs SABS 62 */}
                {(() => {
                  const effectiveSteelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                  const isSABS719 = effectiveSteelSpecId === 8;

                  // Common Steel Spec dropdown (used in both layouts)
                  const SteelSpecDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Steel Specification
                        {(() => {
                          const isUsingGlobal = !entry.specs?.steelSpecificationId && globalSpecs?.steelSpecificationId;
                          const isOverride = entry.specs?.steelSpecificationId && entry.specs.steelSpecificationId !== globalSpecs?.steelSpecificationId;
                          if (isUsingGlobal) return <span className="text-green-600 text-xs ml-2">(From Global)</span>;
                          if (isOverride) return <span className="text-orange-600 text-xs ml-2">(Override)</span>;
                          return null;
                        })()}
                      </label>
                      <select
                        id={`bend-steel-spec-${entry.id}`}
                        value={entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId || ''}
                        onChange={(e) => {
                          const newSpecId = e.target.value ? Number(e.target.value) : undefined;
                          const updatedEntry: any = {
                            ...entry,
                            specs: {
                              ...entry.specs,
                              steelSpecificationId: newSpecId,
                              nominalBoreMm: undefined,
                              scheduleNumber: undefined,
                              wallThicknessMm: undefined,
                              bendType: undefined,
                              bendRadiusType: undefined,
                              bendDegrees: undefined,
                              numberOfSegments: undefined,
                              centerToFaceMm: undefined,
                              bendRadiusMm: undefined
                            }
                          };
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);

                          if (newSpecId) {
                            const isSABS719 = newSpecId === 8;
                            const nextFieldId = isSABS719
                              ? `bend-radius-type-${entry.id}`
                              : `bend-type-${entry.id}`;
                            focusAndOpenSelect(nextFieldId);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                      >
                        <option value="">Select Steel Spec</option>
                        {masterData.steelSpecs?.map((spec: any) => (
                          <option key={spec.id} value={spec.id}>{spec.steelSpecName}</option>
                        ))}
                      </select>
                    </div>
                  );

                  // NB Dropdown (shared logic but different placement)
                  const NBDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Nominal Bore (mm) *
                        {!isSABS719 && !entry.specs?.bendType && (
                          <span className="text-orange-500 text-xs ml-1">(Select Bend Type first)</span>
                        )}
                      </label>
                      <select
                        id={`bend-nb-${entry.id}`}
                        value={entry.specs?.nominalBoreMm || ''}
                        onChange={async (e) => {
                          const nominalBore = parseInt(e.target.value);
                          if (!nominalBore) return;

                          const pressure = globalSpecs?.workingPressureBar || 0;
                          const nbEffectiveSpecId = entry?.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                        const schedules = getScheduleListForSpec(nominalBore, nbEffectiveSpecId);

                          let matchedSchedule: string | null = null;
                          let matchedWT = 0;

                          if (pressure > 0 && schedules.length > 0) {
                            const od = NB_TO_OD_LOOKUP[nominalBore] || (nominalBore * 1.05);
                            const pressureMpa = pressure * 0.1;
                            const allowableStress = 137.9;
                            const safetyFactor = 1.2;
                            const minWT = (pressureMpa * od * safetyFactor) / (2 * allowableStress * 1.0);

                            const eligibleSchedules = schedules
                              .filter(s => s.wallThicknessMm >= minWT)
                              .sort((a, b) => a.wallThicknessMm - b.wallThicknessMm);

                            if (eligibleSchedules.length > 0) {
                              matchedSchedule = eligibleSchedules[0].scheduleDesignation;
                              matchedWT = eligibleSchedules[0].wallThicknessMm;
                            } else {
                              const sorted = [...schedules].sort((a, b) => b.wallThicknessMm - a.wallThicknessMm);
                              matchedSchedule = sorted[0].scheduleDesignation;
                              matchedWT = sorted[0].wallThicknessMm;
                            }
                          } else if (schedules.length > 0) {
                            const sch40 = schedules.find(s => s.scheduleDesignation === '40' || s.scheduleDesignation === 'Sch 40');
                            if (sch40) {
                              matchedSchedule = sch40.scheduleDesignation;
                              matchedWT = sch40.wallThicknessMm;
                            } else {
                              matchedSchedule = schedules[0].scheduleDesignation;
                              matchedWT = schedules[0].wallThicknessMm;
                            }
                          }

                          let newCenterToFace: number | undefined = undefined;
                          let newBendRadius: number | undefined = undefined;

                          if (isSABS719 && entry.specs?.bendRadiusType && entry.specs?.numberOfSegments) {
                            const cfResult = getSABS719CenterToFaceBySegments(
                              entry.specs.bendRadiusType,
                              nominalBore,
                              entry.specs.numberOfSegments
                            );
                            if (cfResult) {
                              newCenterToFace = cfResult.centerToFace;
                              newBendRadius = cfResult.radius;
                            }
                          }

                          // For SABS 62, calculate C/F if bend type and angle are set
                          if (!isSABS719 && entry.specs?.bendType && entry.specs?.bendDegrees) {
                            const bendType = entry.specs.bendType as SABS62BendType;
                            newCenterToFace = getSabs62CFInterpolated(bendType, entry.specs.bendDegrees, nominalBore);
                            newBendRadius = SABS62_BEND_RADIUS[bendType]?.[nominalBore];
                          }

                          const updatedEntry: any = {
                            ...entry,
                            specs: {
                              ...entry.specs,
                              nominalBoreMm: nominalBore,
                              scheduleNumber: matchedSchedule,
                              wallThicknessMm: matchedWT,
                              centerToFaceMm: newCenterToFace,
                              bendRadiusMm: newBendRadius
                            }
                          };
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);

                          const hasBendSpecs = isSABS719
                            ? (entry.specs?.bendRadiusType && entry.specs?.bendDegrees)
                            : (entry.specs?.bendType && entry.specs?.bendDegrees);
                          if (matchedSchedule && hasBendSpecs) {
                            setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                          }

                          if (!entry.specs?.bendDegrees) {
                            focusAndOpenSelect(`bend-angle-${entry.id}`);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        disabled={!isSABS719 && !entry.specs?.bendType}
                      >
                        <option value="">{!isSABS719 && !entry.specs?.bendType ? 'Select Bend Type first' : 'Select NB'}</option>
                        {(() => {
                          if (!isSABS719 && entry.specs?.bendType) {
                            const bendType = entry.specs.bendType as SABS62BendType;
                            const sabs62NBs = SABS62_NB_OPTIONS[bendType] || [];
                            return sabs62NBs.map((nb: number) => (
                              <option key={nb} value={nb}>{nb} NB</option>
                            ));
                          }
                          // SABS 719 or no bend type - show fallback
                          const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === effectiveSteelSpecId);
                          const steelSpecName = steelSpec?.steelSpecName || '';
                          const fallbackNBs = Object.entries(STEEL_SPEC_NB_FALLBACK).find(([pattern]) => steelSpecName.includes(pattern))?.[1];
                          const nbs = fallbackNBs || [40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600];
                          return nbs.map((nb: number) => (
                            <option key={nb} value={nb}>{nb} NB</option>
                          ));
                        })()}
                      </select>
                    </div>
                  );

                  // Schedule Dropdown (shared)
                  const ScheduleDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Schedule *
                        {entry.specs?.scheduleNumber && globalSpecs?.workingPressureBar && (
                          <span className="text-green-600 text-xs ml-2">(Auto)</span>
                        )}
                      </label>
                      <select
                        value={entry.specs?.scheduleNumber || ''}
                        onChange={(e) => {
                          const schedule = e.target.value;
                          const effectiveSteelSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                          const schedules = getScheduleListForSpec(entry.specs?.nominalBoreMm || 0, effectiveSteelSpecId);
                          const scheduleData = schedules.find((s: any) => s.scheduleDesignation === schedule);
                          const updatedEntry: any = {
                            ...entry,
                            specs: { ...entry.specs, scheduleNumber: schedule, wallThicknessMm: scheduleData?.wallThicknessMm }
                          };
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        disabled={!entry.specs?.nominalBoreMm}
                      >
                        <option value="">{entry.specs?.nominalBoreMm ? 'Select Schedule' : 'Select NB first'}</option>
                        {(() => {
                          const effectiveSteelSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                          const schedules = getScheduleListForSpec(entry.specs?.nominalBoreMm || 0, effectiveSteelSpecId);
                          return schedules.map((s: any) => (
                            <option key={s.scheduleDesignation} value={s.scheduleDesignation}>
                              {s.scheduleDesignation} ({s.wallThicknessMm}mm)
                            </option>
                          ));
                        })()}
                      </select>
                      {entry.specs?.wallThicknessMm && (
                        <p className="text-xs text-green-700 mt-0.5">WT: {entry.specs.wallThicknessMm}mm</p>
                      )}
                    </div>
                  );

                  // SABS 62 Bend Type Dropdown
                  const BendTypeDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Bend Type *
                        <span className="text-purple-600 text-xs ml-1">(SABS 62)</span>
                      </label>
                      <select
                        id={`bend-type-${entry.id}`}
                        value={entry.specs?.bendType || ''}
                        onChange={(e) => {
                          const bendType = e.target.value;
                          // Clear dependent fields since different bend types have different NB options and angles
                          const updatedEntry: any = {
                            ...entry,
                            specs: {
                              ...entry.specs,
                              bendType: bendType || undefined,
                              nominalBoreMm: undefined, // Clear NB when bend type changes
                              bendDegrees: undefined, // Clear angle since each bend type has different valid angles
                              centerToFaceMm: undefined,
                              bendRadiusMm: undefined
                            }
                          };
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);

                          if (bendType) {
                            focusAndOpenSelect(`bend-nb-${entry.id}`);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900"
                      >
                        <option value="">Select Bend Type</option>
                        <option value="1D">1D (Elbow)</option>
                        <option value="1.5D">1.5D (Short Radius)</option>
                        <option value="2D">2D (Standard)</option>
                        <option value="3D">3D (Long Radius)</option>
                        <option value="5D">5D (Extra Long)</option>
                      </select>
                    </div>
                  );

                  // SABS 719 Radius Type Dropdown
                  const RadiusTypeDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Bend Radius *
                        <span className="text-blue-600 text-xs ml-1">(SABS 719)</span>
                      </label>
                      <select
                        id={`bend-radius-type-${entry.id}`}
                        value={entry.specs?.bendRadiusType || ''}
                        onChange={(e) => {
                          const radiusType = e.target.value || undefined;
                          const updatedEntry: any = {
                            ...entry,
                            specs: { ...entry.specs, bendRadiusType: radiusType, bendType: undefined, numberOfSegments: undefined, centerToFaceMm: undefined, bendDegrees: undefined }
                          };
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);

                          if (radiusType) {
                            focusAndOpenSelect(`bend-nb-${entry.id}`);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900"
                      >
                        <option value="">Select Radius Type</option>
                        {SABS719_BEND_TYPES.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  );

                  // Angle Dropdown (shared) - uses getSabs62AvailableAngles for SABS 62 bends
                  // This pulls ALL available angles from the Excel data for the selected bend type AND NB
                  const sabs62BendType = entry.specs?.bendType as SABS62BendType | undefined;
                  const sabs62NB = entry.specs?.nominalBoreMm;
                  const availableAngles = !isSABS719 && sabs62BendType && sabs62NB
                    ? getSabs62AvailableAngles(sabs62BendType, sabs62NB)
                    : []; // SABS 719 will use a different range

                  const AngleDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Bend Angle *
                        {!isSABS719 && sabs62BendType && (
                          <span className="text-purple-600 text-xs ml-1">({sabs62BendType})</span>
                        )}
                      </label>
                      <select
                        id={`bend-angle-${entry.id}`}
                        value={entry.specs?.bendDegrees || ''}
                        onChange={(e) => {
                          const bendDegrees = e.target.value ? parseFloat(e.target.value) : undefined;
                          let centerToFaceMm: number | undefined;
                          let bendRadiusMm: number | undefined;
                          if (!isSABS719 && bendDegrees && entry.specs?.nominalBoreMm && entry.specs?.bendType) {
                            const bendType = entry.specs.bendType as SABS62BendType;
                            centerToFaceMm = getSabs62CFInterpolated(bendType, bendDegrees, entry.specs.nominalBoreMm);
                            bendRadiusMm = SABS62_BEND_RADIUS[bendType]?.[entry.specs.nominalBoreMm];
                          }
                          const updatedEntry: any = {
                            ...entry,
                            specs: { ...entry.specs, bendDegrees, centerToFaceMm, bendRadiusMm, numberOfSegments: isSABS719 ? undefined : entry.specs?.numberOfSegments }
                          };
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);
                          if (bendDegrees && entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber && entry.specs?.bendType) {
                            setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                          }
                        }}
                        disabled={!isSABS719 && !sabs62BendType}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 ${
                          !isSABS719 && !sabs62BendType ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                      >
                        <option value="">{!isSABS719 && !sabs62BendType ? 'Select Bend Type first' : 'Select Angle'}</option>
                        {!isSABS719 ? (
                          // SABS 62: Show only angles valid for the selected bend type
                          availableAngles.map(deg => (
                            <option key={deg} value={deg}>{deg}°</option>
                          ))
                        ) : (
                          // SABS 719: Show full range of angles
                          <>
                            {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22].map(deg => (
                              <option key={deg} value={deg}>{deg}°</option>
                            ))}
                            <option value="22.5">22.5°</option>
                            {[23,24,25,26,27,28,29,30,31,32,33,34,35,36,37].map(deg => (
                              <option key={deg} value={deg}>{deg}°</option>
                            ))}
                            <option value="37.5">37.5°</option>
                            {[38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90].map(deg => (
                              <option key={deg} value={deg}>{deg}°</option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>
                  );

                  // SABS 62 C/F Display
                  const CFDisplay = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        C/F (mm)
                        {entry.specs?.centerToFaceMm && <span className="text-green-600 text-xs ml-1">(Auto)</span>}
                      </label>
                      <input
                        type="text"
                        value={
                          entry.specs?.centerToFaceMm
                            ? `${Number(entry.specs.centerToFaceMm).toFixed(1)} mm`
                            : 'Select specs'
                        }
                        disabled
                        className={`w-full px-3 py-2 border rounded-md text-sm cursor-not-allowed ${
                          entry.specs?.centerToFaceMm ? 'bg-green-50 border-green-300 text-green-900 font-medium' : 'bg-gray-100 border-gray-300 text-gray-600'
                        }`}
                      />
                    </div>
                  );

                  // SABS 719 Segments Dropdown
                  const SegmentsDropdown = (
                    <div>
                      {(() => {
                        const bendRadiusType = entry.specs?.bendRadiusType;
                        const bendDeg = entry.specs?.bendDegrees || 0;
                        const nominalBore = entry.specs?.nominalBoreMm || 0;

                        if (!bendRadiusType || bendDeg <= 0) {
                          return (
                            <>
                              <label className="block text-xs font-semibold text-gray-900 mb-1">
                                Segments <span className="text-blue-600 text-xs ml-1">(SABS 719)</span>
                              </label>
                              <input type="text" value="Select radius & angle" disabled className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
                            </>
                          );
                        }

                        const getSegmentOptions = (deg: number): number[] => {
                          if (deg <= 11) return [2];
                          if (deg <= 37) return [2, 3];
                          if (deg <= 59) return [3, 4];
                          return [5, 6, 7];
                        };

                        const segmentOptions = getSegmentOptions(bendDeg);
                        const isAutoFill = bendDeg <= 11;

                        if (isAutoFill && entry.specs?.numberOfSegments !== 2) {
                          setTimeout(() => {
                            const cfResult = getSABS719CenterToFaceBySegments(bendRadiusType, nominalBore, 2);
                            const updatedEntry: any = {
                              ...entry,
                              specs: {
                                ...entry.specs,
                                numberOfSegments: 2,
                                centerToFaceMm: cfResult?.centerToFace,
                                bendRadiusMm: cfResult?.radius
                              }
                            };
                            updatedEntry.description = generateItemDescription(updatedEntry);
                            onUpdateEntry(entry.id, updatedEntry);
                            if (nominalBore && entry.specs?.scheduleNumber) {
                              setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                            }
                          }, 50);
                        }

                        if (isAutoFill) {
                          return (
                            <>
                              <label className="block text-xs font-semibold text-gray-900 mb-1">
                                Segments <span className="text-green-600 text-xs ml-1">(Auto: 2)</span>
                              </label>
                              <input type="text" value="2 segments" disabled className="w-full px-3 py-2 border border-green-300 rounded-md text-sm bg-green-50 text-green-900 font-medium cursor-not-allowed" />
                              {entry.specs?.centerToFaceMm && (
                                <p className="text-xs text-green-600 mt-0.5">C/F: {Number(entry.specs.centerToFaceMm).toFixed(1)}mm</p>
                              )}
                            </>
                          );
                        }

                        return (
                          <>
                            <label className="block text-xs font-semibold text-gray-900 mb-1">
                              Segments * <span className="text-blue-600 text-xs ml-1">({segmentOptions.join(' or ')})</span>
                            </label>
                            <select
                              value={entry.specs?.numberOfSegments || ''}
                              onChange={(e) => {
                                const segments = e.target.value ? parseInt(e.target.value) : undefined;
                                let centerToFace: number | undefined;
                                let bendRadius: number | undefined;
                                if (segments && bendRadiusType && nominalBore) {
                                  const cfResult = getSABS719CenterToFaceBySegments(bendRadiusType, nominalBore, segments);
                                  if (cfResult) { centerToFace = cfResult.centerToFace; bendRadius = cfResult.radius; }
                                }
                                const updatedEntry: any = {
                                  ...entry,
                                  specs: { ...entry.specs, numberOfSegments: segments, centerToFaceMm: centerToFace, bendRadiusMm: bendRadius }
                                };
                                updatedEntry.description = generateItemDescription(updatedEntry);
                                onUpdateEntry(entry.id, updatedEntry);
                                if (segments && nominalBore && entry.specs?.scheduleNumber) {
                                  setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900"
                            >
                              <option value="">Select</option>
                              {segmentOptions.map(seg => (
                                <option key={seg} value={seg}>{seg} segments</option>
                              ))}
                            </select>
                            {entry.specs?.centerToFaceMm && (
                              <p className="text-xs text-green-600 mt-0.5">C/F: {Number(entry.specs.centerToFaceMm).toFixed(1)}mm</p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  );

                  // Render the appropriate layout
                  if (isSABS719) {
                    // SABS 719 Layout: Steel Spec -> NB -> Schedule | Radius Type -> Angle -> Segments
                    return (
                      <>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {SteelSpecDropdown}
                            {NBDropdown}
                            {ScheduleDropdown}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                          {RadiusTypeDropdown}
                          {AngleDropdown}
                          {SegmentsDropdown}
                        </div>
                      </>
                    );
                  } else {
                    // SABS 62 Layout: Steel Spec -> Bend Type -> NB | Schedule -> Angle -> C/F
                    return (
                      <>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {SteelSpecDropdown}
                            {BendTypeDropdown}
                            {NBDropdown}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                          {ScheduleDropdown}
                          {AngleDropdown}
                          {CFDisplay}
                        </div>
                      </>
                    );
                  }
                })()}

                {/* Two-Column Layout Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                  {/* LEFT COLUMN - Quantity & Options */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 border-b border-purple-500 pb-1.5">
                      Quantity & Options
                    </h4>

                    {/* Quantity */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={entry.specs?.quantityValue || ''}
                        onChange={(e) => {
                          const quantity = parseInt(e.target.value) || 1;
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, quantityValue: quantity }
                          });
                          if (entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber && entry.specs?.bendType && entry.specs?.bendDegrees) {
                            setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900"
                        min="1"
                        placeholder="1"
                      />
                    </div>

                    {/* Center-to-Face Display */}
                    {entry.specs?.centerToFaceMm && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <h5 className="text-xs font-bold text-green-900 mb-1">Center-to-Face</h5>
                        <p className="text-sm font-bold text-green-800">{Number(entry.specs.centerToFaceMm).toFixed(1)} mm</p>
                        {entry.specs?.bendRadiusMm && (
                          <p className="text-xs text-green-700 mt-0.5">Radius: {Number(entry.specs.bendRadiusMm).toFixed(1)} mm</p>
                        )}
                      </div>
                    )}

                    {/* Tangents Section */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h5 className="text-xs font-bold text-blue-900 mb-2">Tangent Extensions</h5>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Number of Tangents
                        </label>
                        <select
                          value={entry.specs?.numberOfTangents || 0}
                          onChange={(e) => {
                            const count = parseInt(e.target.value) || 0;
                            const currentLengths = entry.specs?.tangentLengths || [];
                            const newLengths = count === 0 ? [] :
                                             count === 1 ? [currentLengths[0] || 150] :
                                             [currentLengths[0] || 150, currentLengths[1] || 150];
                            const updatedEntry = {
                              ...entry,
                              specs: {
                                ...entry.specs,
                                numberOfTangents: count,
                                tangentLengths: newLengths
                              }
                            };
                            updatedEntry.description = generateItemDescription(updatedEntry);
                            onUpdateEntry(entry.id, updatedEntry);
                            if (entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber && entry.specs?.bendType && entry.specs?.bendDegrees) {
                              setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                        >
                          <option value="0">0 - No Tangents</option>
                          <option value="1">1 - Single Tangent</option>
                          <option value="2">2 - Both Tangents</option>
                        </select>
                      </div>

                      {(entry.specs?.numberOfTangents || 0) >= 1 && (
                        <div className="mt-2">
                          <label className="block text-xs font-semibold text-gray-900 mb-1">
                            Tangent 1 Length (mm)
                          </label>
                          <input
                            type="number"
                            value={entry.specs?.tangentLengths?.[0] || ''}
                            onChange={(e) => {
                              const lengths = [...(entry.specs?.tangentLengths || [])];
                              lengths[0] = parseInt(e.target.value) || 0;
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, tangentLengths: lengths }
                              });
                              if (entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber && entry.specs?.bendType && entry.specs?.bendDegrees) {
                                setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                            min="0"
                            placeholder="150"
                          />
                        </div>
                      )}

                      {(entry.specs?.numberOfTangents || 0) >= 2 && (
                        <div className="mt-2">
                          <label className="block text-xs font-semibold text-gray-900 mb-1">
                            Tangent 2 Length (mm)
                          </label>
                          <input
                            type="number"
                            value={entry.specs?.tangentLengths?.[1] || ''}
                            onChange={(e) => {
                              const lengths = [...(entry.specs?.tangentLengths || [])];
                              lengths[1] = parseInt(e.target.value) || 0;
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, tangentLengths: lengths }
                              });
                              if (entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber && entry.specs?.bendType && entry.specs?.bendDegrees) {
                                setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                            min="0"
                            placeholder="150"
                          />
                        </div>
                      )}

                      {/* Tangent Buttweld Data - shows when tangents are added */}
                      {(entry.specs?.numberOfTangents || 0) > 0 && (
                        <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <h6 className="text-xs font-bold text-orange-900 mb-1">Tangent Buttweld Data</h6>
                          {(() => {
                            const dn = entry.specs?.nominalBoreMm;
                            const schedule = entry.specs?.scheduleNumber || '';
                            const pipeWallThickness = entry.specs?.wallThicknessMm;
                            const numTangents = entry.specs?.numberOfTangents || 0;
                            const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                            const isSABS719 = steelSpecId === 8;

                            // Weld thickness lookup (ASTM/ASME only - SABS 719 uses pipe WT directly)
                            const FITTING_WALL_THICKNESS: Record<string, Record<number, number>> = {
                              'STD': { 15: 2.77, 20: 2.87, 25: 3.38, 32: 3.56, 40: 3.68, 50: 3.91, 65: 5.16, 80: 5.49, 90: 5.74, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53 },
                              'XH': { 15: 3.73, 20: 3.91, 25: 4.55, 32: 4.85, 40: 5.08, 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.70, 250: 12.70, 300: 12.70 },
                              'XXH': { 15: 7.47, 20: 7.82, 25: 9.09, 32: 9.70, 40: 10.16, 50: 11.07, 65: 14.02, 80: 15.24, 100: 17.12, 125: 19.05, 150: 22.23, 200: 22.23, 250: 25.40, 300: 25.40 }
                            };

                            let effectiveThickness: number | null = null;
                            let fittingClass = 'STD';
                            let weldThickness: number | null = null;

                            if (isSABS719) {
                              // SABS 719: Use pipe wall thickness directly
                              effectiveThickness = pipeWallThickness;
                            } else {
                              const scheduleUpper = schedule.toUpperCase();
                              fittingClass =
                                scheduleUpper.includes('160') || scheduleUpper.includes('XXS') || scheduleUpper.includes('XXH')
                                  ? 'XXH'
                                  : scheduleUpper.includes('80') || scheduleUpper.includes('XS') || scheduleUpper.includes('XH')
                                    ? 'XH'
                                    : 'STD';
                              weldThickness = dn ? FITTING_WALL_THICKNESS[fittingClass]?.[dn] : null;
                              effectiveThickness = weldThickness || pipeWallThickness;
                            }

                            // Calculate circumference
                            const od = dn ? (NB_TO_OD_LOOKUP[dn] || (dn * 1.05)) : 0;
                            const circumference = Math.PI * od;
                            const totalWeldLength = circumference * numTangents;

                            if (!dn || !effectiveThickness) {
                              return (
                                <p className="text-xs text-orange-700">
                                  Select NB and schedule for weld data
                                </p>
                              );
                            }

                            return (
                              <>
                                <p className="text-xs text-orange-800">
                                  <span className="font-medium">{numTangents} full penetration weld{numTangents > 1 ? 's' : ''}</span>
                                </p>
                                <p className="text-xs text-orange-700">
                                  Weld thickness: {effectiveThickness.toFixed(2)}mm ({isSABS719 ? 'SABS 719 WT' : weldThickness ? fittingClass : 'from schedule'})
                                </p>
                                <p className="text-xs text-orange-700">
                                  Linear meterage: {totalWeldLength.toFixed(0)}mm ({numTangents} x {circumference.toFixed(0)}mm circ)
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Flange Weld Data - Bend flanges and Stub flanges */}
                    {(() => {
                      const weldCount = getWeldCountPerBend(entry.specs?.bendEndConfiguration || 'PE');
                      const dn = entry.specs?.nominalBoreMm;
                      const schedule = entry.specs?.scheduleNumber || '';
                      const pipeWallThickness = entry.specs?.wallThicknessMm;
                      const numStubs = entry.specs?.numberOfStubs || 0;
                      const stubs = entry.specs?.stubs || [];
                      // Use item-level steel spec with global fallback
                      const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                      const isSABS719 = steelSpecId === 8;

                      // Weld thickness lookup table (ASTM/ASME only)
                      const FITTING_WALL_THICKNESS: Record<string, Record<number, number>> = {
                        'STD': { 15: 2.77, 20: 2.87, 25: 3.38, 32: 3.56, 40: 3.68, 50: 3.91, 65: 5.16, 80: 5.49, 90: 5.74, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53 },
                        'XH': { 15: 3.73, 20: 3.91, 25: 4.55, 32: 4.85, 40: 5.08, 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.70, 250: 12.70, 300: 12.70 },
                        'XXH': { 15: 7.47, 20: 7.82, 25: 9.09, 32: 9.70, 40: 10.16, 50: 11.07, 65: 14.02, 80: 15.24, 100: 17.12, 125: 19.05, 150: 22.23, 200: 22.23, 250: 25.40, 300: 25.40 }
                      };

                      let effectiveWeldThickness: number | undefined | null = null;
                      let fittingClass = 'STD';
                      let weldThickness: number | null = null;
                      let usingScheduleThickness = false;

                      if (isSABS719) {
                        // SABS 719: Use pipe wall thickness directly
                        effectiveWeldThickness = pipeWallThickness;
                        usingScheduleThickness = true;
                      } else {
                        const scheduleUpper = schedule.toUpperCase();
                        fittingClass =
                          scheduleUpper.includes('160') || scheduleUpper.includes('XXS') || scheduleUpper.includes('XXH')
                            ? 'XXH'
                            : scheduleUpper.includes('80') || scheduleUpper.includes('XS') || scheduleUpper.includes('XH')
                              ? 'XH'
                              : 'STD';
                        weldThickness = dn ? FITTING_WALL_THICKNESS[fittingClass]?.[dn] : null;
                        effectiveWeldThickness = weldThickness || pipeWallThickness;
                        usingScheduleThickness = !weldThickness && !!pipeWallThickness;
                      }

                      // Calculate circumference for bend flanges
                      const od = dn ? (NB_TO_OD_LOOKUP[dn] || (dn * 1.05)) : 0;
                      const circumference = Math.PI * od;

                      // Stub flange info - also use SABS 719 logic for stubs
                      const stub1NB = stubs[0]?.nominalBoreMm;
                      const stub2NB = stubs[1]?.nominalBoreMm;
                      const stub1HasFlange = stubs[0]?.hasFlangeOverride || (stubs[0]?.flangeStandardId && stubs[0]?.flangePressureClassId);
                      const stub2HasFlange = stubs[1]?.hasFlangeOverride || (stubs[1]?.flangeStandardId && stubs[1]?.flangePressureClassId);
                      const stub1OD = stub1NB ? (NB_TO_OD_LOOKUP[stub1NB] || (stub1NB * 1.05)) : 0;
                      const stub2OD = stub2NB ? (NB_TO_OD_LOOKUP[stub2NB] || (stub2NB * 1.05)) : 0;
                      const stub1Circumference = Math.PI * stub1OD;
                      const stub2Circumference = Math.PI * stub2OD;
                      // For SABS 719, use pipe WT; for others, use fitting lookup
                      const stub1Thickness = isSABS719
                        ? (pipeWallThickness || 0)
                        : (stub1NB ? (FITTING_WALL_THICKNESS[fittingClass]?.[stub1NB] || pipeWallThickness) : 0);
                      const stub2Thickness = isSABS719
                        ? (pipeWallThickness || 0)
                        : (stub2NB ? (FITTING_WALL_THICKNESS[fittingClass]?.[stub2NB] || pipeWallThickness) : 0);

                      // Only show if there are bend flanges or stubs
                      if (weldCount === 0 && numStubs === 0) return null;

                      return (
                        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                          <h6 className="text-xs font-bold text-green-900 mb-2">Flange Weld Data</h6>

                          {/* Bend Flange Welds */}
                          {weldCount > 0 && dn && effectiveWeldThickness && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-green-800">Bend Flanges ({weldCount}):</p>
                              <p className="text-xs text-green-700">
                                {dn}NB - {effectiveWeldThickness?.toFixed(2)}mm weld{isSABS719 ? ' (SABS 719 WT)' : usingScheduleThickness ? ' (sch)' : ` (${fittingClass})`}
                              </p>
                              <p className="text-xs text-green-600">
                                Weld length: {(circumference * 2 * weldCount).toFixed(0)}mm ({weldCount}x2x{circumference.toFixed(0)}mm circ)
                              </p>
                            </div>
                          )}

                          {/* Stub Flange Welds */}
                          {numStubs > 0 && (
                            <div className={weldCount > 0 ? 'pt-2 border-t border-green-200' : ''}>
                              <p className="text-xs font-medium text-green-800">Stub Flanges:</p>
                              {numStubs >= 1 && stub1NB && (
                                <div className="ml-2">
                                  {stub1HasFlange ? (
                                    <>
                                      <p className="text-xs text-green-700">
                                        Stub 1: {stub1NB}NB - {stub1Thickness?.toFixed(2)}mm weld
                                      </p>
                                      <p className="text-xs text-green-600">
                                        Weld length: {(stub1Circumference * 2).toFixed(0)}mm (2x{stub1Circumference.toFixed(0)}mm circ)
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-xs text-gray-500">Stub 1: {stub1NB}NB - OE (no weld data)</p>
                                  )}
                                </div>
                              )}
                              {numStubs >= 2 && stub2NB && (
                                <div className="ml-2 mt-1">
                                  {stub2HasFlange ? (
                                    <>
                                      <p className="text-xs text-green-700">
                                        Stub 2: {stub2NB}NB - {stub2Thickness?.toFixed(2)}mm weld
                                      </p>
                                      <p className="text-xs text-green-600">
                                        Weld length: {(stub2Circumference * 2).toFixed(0)}mm (2x{stub2Circumference.toFixed(0)}mm circ)
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-xs text-gray-500">Stub 2: {stub2NB}NB - OE (no weld data)</p>
                                  )}
                                </div>
                              )}
                              {numStubs >= 1 && !stub1NB && (
                                <p className="text-xs text-amber-600 ml-2">Stub 1: Select NB</p>
                              )}
                              {numStubs >= 2 && !stub2NB && (
                                <p className="text-xs text-amber-600 ml-2">Stub 2: Select NB</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Total Bend Length - Auto-calculated */}
                    {entry.specs?.centerToFaceMm && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <h5 className="text-xs font-bold text-purple-900 mb-1">Total Bend Length</h5>
                        {(() => {
                          const cf = Number(entry.specs.centerToFaceMm) || 0;
                          const tangent1 = entry.specs?.tangentLengths?.[0] || 0;
                          const tangent2 = entry.specs?.tangentLengths?.[1] || 0;
                          const numTangents = entry.specs?.numberOfTangents || 0;
                          const numStubs = entry.specs?.numberOfStubs || 0;
                          const stubs = entry.specs?.stubs || [];
                          const stub1Length = stubs[0]?.length || 0;
                          const stub2Length = stubs[1]?.length || 0;
                          const stubsTotal = stub1Length + stub2Length;

                          const totalLength = (cf * 2) + tangent1 + tangent2 + stubsTotal;
                          const end1 = cf + tangent1;
                          const end2 = cf + tangent2;

                          // Format like description: "455x555 C/F" or "C/F 305mm"
                          let cfDisplay = '';
                          if (numTangents > 0 && (tangent1 > 0 || tangent2 > 0)) {
                            if (numTangents === 2 && tangent1 > 0 && tangent2 > 0) {
                              cfDisplay = `${end1.toFixed(0)}x${end2.toFixed(0)} C/F`;
                            } else if (tangent1 > 0) {
                              cfDisplay = `${end1.toFixed(0)}x${cf.toFixed(0)} C/F`;
                            } else if (tangent2 > 0) {
                              cfDisplay = `${cf.toFixed(0)}x${end2.toFixed(0)} C/F`;
                            }
                          } else {
                            cfDisplay = `C/F ${cf.toFixed(0)}mm`;
                          }

                          // Format stub display
                          let stubDisplay = '';
                          if (numStubs === 1 && stub1Length > 0) {
                            stubDisplay = ` + ${stub1Length}mm Stub`;
                          } else if (numStubs === 2 && stub1Length > 0 && stub2Length > 0) {
                            if (stub1Length === stub2Length) {
                              stubDisplay = ` + 2xStubs ${stub1Length}mm`;
                            } else {
                              stubDisplay = ` + 1xStub ${stub1Length}mm and 1xStub ${stub2Length}mm`;
                            }
                          }

                          return (
                            <>
                              <p className="text-sm font-bold text-purple-800">{totalLength.toFixed(0)} mm</p>
                              <p className="text-xs text-purple-700 mt-0.5">{cfDisplay}{stubDisplay}</p>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN - Flanges & Options */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5">
                      Flanges & Options
                    </h4>

                    {/* Bend End Configuration */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Bend End Configuration
                      </label>
                      <select
                        value={entry.specs?.bendEndConfiguration || 'PE'}
                        onChange={(e) => {
                          const newConfig = e.target.value;
                          const updatedEntry: any = {
                            ...entry,
                            specs: { ...entry.specs, bendEndConfiguration: newConfig }
                          };
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);
                          if (entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber && entry.specs?.bendType && entry.specs?.bendDegrees) {
                            setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900"
                      >
                        {BEND_END_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {entry.specs?.bendEndConfiguration && entry.specs.bendEndConfiguration !== 'PE' && (
                        <p className="mt-1 text-xs text-purple-600 font-medium">
                          {entry.specs.bendEndConfiguration === 'LF_BE'
                            ? '2 x tack weld ends (no flange welds)'
                            : `${getWeldCountPerBend(entry.specs.bendEndConfiguration)} weld${getWeldCountPerBend(entry.specs.bendEndConfiguration) !== 1 ? 's' : ''} per bend`}
                        </p>
                      )}
                    </div>

                    {/* Closure Length Field - Only shown when L/F configuration is selected */}
                    {hasLooseFlange(entry.specs?.bendEndConfiguration || '') && (() => {
                      const isLFBothEnds = entry.specs?.bendEndConfiguration === 'LF_BE';
                      return (
                        <div>
                          <label className="block text-xs font-semibold text-gray-900 mb-1">
                            Closure Length (mm) *
                            <span className="text-purple-600 text-xs ml-2">
                              {isLFBothEnds
                                ? '(Same length applies to both ends)'
                                : '(Site weld extension past L/F)'}
                            </span>
                          </label>
                          <input
                            type="number"
                            value={entry.specs?.closureLengthMm || ''}
                            onChange={(e) => {
                              const closureLength = e.target.value ? Number(e.target.value) : undefined;
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, closureLengthMm: closureLength }
                              });
                            }}
                            placeholder="e.g., 150"
                            min={50}
                            max={500}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900"
                          />
                          <p className="mt-0.5 text-xs text-gray-500">
                            {isLFBothEnds
                              ? 'Pipe extension past each loose flange for site weld connection - same length both ends (typically 100-200mm)'
                              : 'Additional pipe length extending past the loose flange for site weld connection (typically 100-200mm)'}
                          </p>
                          {/* Tack Weld Information */}
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                            <p className="text-xs font-bold text-amber-800">
                              Loose Flange Tack Welds Required:
                            </p>
                            <ul className="text-xs text-amber-700 mt-1 list-disc list-inside">
                              {isLFBothEnds ? (
                                <>
                                  <li>16 tack welds total (~20mm each) - 8 per L/F end</li>
                                  <li>4 tack welds on each side of each loose flange</li>
                                </>
                              ) : (
                                <>
                                  <li>8 tack welds total (~20mm each)</li>
                                  <li>4 tack welds on each side of loose flange</li>
                                </>
                              )}
                            </ul>
                            <p className="text-xs text-amber-600 mt-1 italic">
                              Tack weld charge applies per L/F end{isLFBothEnds ? ' (x2)' : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })()}


                    {/* Blank Flange Option for Bends - Position selector */}
                    {(() => {
                      const bendEndConfig = entry.specs?.bendEndConfiguration || 'PE';
                      const configUpper = bendEndConfig.toUpperCase();
                      // Determine available flange positions based on config
                      const hasInletFlange = ['FOE', 'FBE', 'FOE_LF', 'FOE_RF', '2X_RF', 'LF_BE'].includes(configUpper);
                      const hasOutletFlange = ['FBE', 'FOE_LF', 'FOE_RF', '2X_RF', 'LF_BE'].includes(configUpper);

                      const availablePositions: { key: string; label: string; hasFlange: boolean }[] = [
                        { key: 'inlet', label: 'Inlet (Bottom)', hasFlange: hasInletFlange },
                        { key: 'outlet', label: 'Outlet (Top)', hasFlange: hasOutletFlange },
                      ].filter(p => p.hasFlange);

                      if (availablePositions.length === 0) return null;

                      const currentPositions = entry.specs?.blankFlangePositions || [];

                      return (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-green-800">Add Blank Flange(s)</span>
                            <span className="text-xs text-slate-500">({availablePositions.length} positions available)</span>
                          </div>
                          <div className="flex flex-wrap gap-4">
                            {availablePositions.map(pos => (
                              <label key={pos.key} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={currentPositions.includes(pos.key)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    let newPositions: string[];
                                    if (checked) {
                                      newPositions = [...currentPositions, pos.key];
                                    } else {
                                      newPositions = currentPositions.filter((p: string) => p !== pos.key);
                                    }
                                    onUpdateEntry(entry.id, {
                                      specs: {
                                        ...entry.specs,
                                        addBlankFlange: newPositions.length > 0,
                                        blankFlangeCount: newPositions.length,
                                        blankFlangePositions: newPositions
                                      }
                                    });
                                  }}
                                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <span className="text-sm text-slate-700">{pos.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    {/* Flange Specifications - Uses Global Specs with Override Option */}
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="text-xs font-bold text-gray-900">
                          Flanges
                          {entry.hasFlangeOverride ? (
                            <span className="text-blue-600 text-xs ml-2 font-normal">(Override Active)</span>
                          ) : globalSpecs?.flangeStandardId ? (
                            <span className="text-green-600 text-xs ml-2 font-normal">(From Global Specs)</span>
                          ) : (
                            <span className="text-gray-500 text-xs ml-2 font-normal">(Not Set)</span>
                          )}
                        </h5>
                        {globalSpecs?.flangeStandardId && (
                          <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                            <span className="text-gray-500 italic">(click to change)</span>
                            <input
                              type="checkbox"
                              checked={entry.hasFlangeOverride || false}
                              onChange={(e) => {
                                const override = e.target.checked;
                                onUpdateEntry(entry.id, {
                                  hasFlangeOverride: override,
                                  flangeOverrideConfirmed: false,
                                  specs: override ? {
                                    ...entry.specs,
                                    flangeStandardId: entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId,
                                    flangePressureClassId: entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId
                                  } : {
                                    ...entry.specs,
                                    flangeStandardId: undefined,
                                    flangePressureClassId: undefined
                                  }
                                });
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-medium">Override</span>
                          </label>
                        )}
                      </div>

                      {/* Warning if deviating from recommended pressure class */}
                      {(() => {
                        const currentClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
                        const recommendedClassId = globalSpecs?.flangePressureClassId;
                        const isOverride = entry.hasFlangeOverride && currentClassId && recommendedClassId && currentClassId !== recommendedClassId;

                        if (isOverride) {
                          const currentClass = masterData.pressureClasses?.find((p: any) => p.id === currentClassId);
                          const recommendedClass = masterData.pressureClasses?.find((p: any) => p.id === recommendedClassId);
                          return (
                            <div className="bg-red-50 border-2 border-red-400 rounded-lg p-2 mb-2">
                              <div className="flex items-start gap-2">
                                <span className="text-red-600 text-base">⚠️</span>
                                <div className="flex-1">
                                  <p className="text-xs font-bold text-red-900">Pressure Rating Override</p>
                                  <p className="text-xs text-red-700 mt-0.5">
                                    Selected <span className="font-semibold">{currentClass?.designation}</span> instead of recommended{' '}
                                    <span className="font-semibold">{recommendedClass?.designation}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {globalSpecs?.flangeStandardId && !entry.hasFlangeOverride ? (
                        <div className="bg-green-50 p-2 rounded-md">
                          <p className="text-green-800 text-xs mb-1">
                            Using global flange standard from specifications page
                          </p>
                          {globalSpecs?.flangePressureClassId && (
                            <div className="bg-blue-50 p-2 rounded border-l-2 border-blue-300">
                              <p className="text-blue-800 text-xs font-semibold">
                                Flange Spec:
                                <span className="ml-1">
                                  {(() => {
                                    const pressureClass = masterData.pressureClasses?.find(
                                      (pc: any) => pc.id === globalSpecs.flangePressureClassId
                                    );
                                    const flangeStandard = masterData.flangeStandards?.find(
                                      (fs: any) => fs.id === globalSpecs.flangeStandardId
                                    );
                                    if (pressureClass && flangeStandard) {
                                      return `${flangeStandard.code}/${pressureClass.designation}`;
                                    }
                                    return 'N/A';
                                  })()}
                                </span>
                              </p>
                              <p className="text-blue-600 text-xs mt-0.5">
                                For {globalSpecs?.workingPressureBar || 'N/A'} bar working pressure
                              </p>
                            </div>
                          )}
                        </div>
                      ) : !globalSpecs?.flangeStandardId ? (
                        <p className="text-xs text-gray-500">Set flange specs in Global Specifications</p>
                      ) : (
                        <div className="space-y-2">
                          {entry.flangeOverrideConfirmed ? (
                            <div className="bg-blue-50 border-2 border-blue-400 p-2 rounded-md">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                                  <span className="text-green-600">✓</span> Item-Specific Flange Confirmed
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateEntry(entry.id, { flangeOverrideConfirmed: false })}
                                  className="px-2 py-0.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                                >
                                  Edit
                                </button>
                              </div>
                              <div className="bg-white p-1.5 rounded border border-blue-200">
                                <p className="text-sm font-bold text-blue-800">
                                  {(() => {
                                    const flangeStandard = masterData.flangeStandards?.find(
                                      (fs: any) => fs.id === entry.specs?.flangeStandardId
                                    );
                                    const pressureClass = masterData.pressureClasses?.find(
                                      (pc: any) => pc.id === entry.specs?.flangePressureClassId
                                    );
                                    if (flangeStandard && pressureClass) {
                                      return `${flangeStandard.code} / ${pressureClass.designation}`;
                                    }
                                    return 'N/A';
                                  })()}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                                    Flange Standard
                                  </label>
                                  <select
                                    value={entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId || ''}
                                    onChange={async (e) => {
                                      const standardId = parseInt(e.target.value) || undefined;
                                      onUpdateEntry(entry.id, {
                                        specs: { ...entry.specs, flangeStandardId: standardId, flangePressureClassId: undefined }
                                      });
                                      // Fetch pressure classes for this standard
                                      if (standardId) {
                                        getFilteredPressureClasses(standardId);
                                      }
                                    }}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                                  >
                                    <option value="">Select Standard</option>
                                    {masterData.flangeStandards?.map((standard: any) => (
                                      <option key={standard.id} value={standard.id}>
                                        {standard.code}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                                    Pressure Class
                                  </label>
                                  <select
                                    value={entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId || ''}
                                    onChange={(e) => onUpdateEntry(entry.id, {
                                      specs: {
                                        ...entry.specs,
                                        flangePressureClassId: parseInt(e.target.value) || undefined
                                      }
                                    })}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                                  >
                                    <option value="">Select Class</option>
                                    {(() => {
                                      const stdId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                                      const filtered = stdId ? (pressureClassesByStandard[stdId] || []) : masterData.pressureClasses || [];
                                      return filtered.map((pressureClass: any) => (
                                        <option key={pressureClass.id} value={pressureClass.id}>
                                          {pressureClass.designation}
                                        </option>
                                      ));
                                    })()}
                                  </select>
                                </div>
                              </div>

                              {entry.hasFlangeOverride && entry.specs?.flangeStandardId && entry.specs?.flangePressureClassId && (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => onUpdateEntry(entry.id, { flangeOverrideConfirmed: true })}
                                    className="flex-1 px-2 py-1.5 text-xs font-semibold text-white bg-green-600 rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                                  >
                                    <span>✓</span> Confirm Override
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onUpdateEntry(entry.id, {
                                        hasFlangeOverride: false,
                                        flangeOverrideConfirmed: false,
                                        specs: {
                                          ...entry.specs,
                                          flangeStandardId: undefined,
                                          flangePressureClassId: undefined
                                        }
                                      });
                                    }}
                                    className="px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Stubs Section - Compact */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h5 className="text-xs font-bold text-green-900 mb-2">Stub Connections</h5>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Number of Stubs
                        </label>
                        <select
                          value={entry.specs?.numberOfStubs || 0}
                          onChange={(e) => {
                            const count = parseInt(e.target.value) || 0;
                            const currentStubs = entry.specs?.stubs || [];
                            const newStubs = count === 0 ? [] :
                                            count === 1 ? [currentStubs[0] || { nominalBoreMm: 40, length: 150, flangeSpec: '' }] :
                                            [
                                              currentStubs[0] || { nominalBoreMm: 40, length: 150, flangeSpec: '' },
                                              currentStubs[1] || { nominalBoreMm: 40, length: 150, flangeSpec: '' }
                                            ];
                            const updatedEntry = {
                              ...entry,
                              specs: {
                                ...entry.specs,
                                numberOfStubs: count,
                                stubs: newStubs
                              }
                            };
                            // Auto-update description
                            updatedEntry.description = generateItemDescription(updatedEntry);
                            onUpdateEntry(entry.id, updatedEntry);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        >
                          <option value="0">0 - No Stubs</option>
                          <option value="1">1 - Single Stub</option>
                          <option value="2">2 - Both Stubs</option>
                        </select>
                      </div>

                      {(entry.specs?.numberOfStubs || 0) >= 1 && (
                        <div className="mt-2 p-2 bg-white rounded border border-green-300">
                          <p className="text-xs font-medium text-green-900 mb-1">Stub 1 <span className="text-gray-500 font-normal">(on horizontal tangent - vertical stub)</span></p>
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <div>
                              <label className="block text-xs text-gray-600 mb-0.5">NB</label>
                              <select
                                value={entry.specs?.stubs?.[0]?.nominalBoreMm || ''}
                                onChange={(e) => {
                                  const stubs = [...(entry.specs?.stubs || [])];
                                  stubs[0] = { ...stubs[0], nominalBoreMm: parseInt(e.target.value) || 0 };
                                  const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                  updatedEntry.description = generateItemDescription(updatedEntry);
                                  onUpdateEntry(entry.id, updatedEntry);
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 text-gray-900"
                              >
                                <option value="">Select NB</option>
                                {(() => {
                                  const effectiveSteelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                                  const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === effectiveSteelSpecId);
                                  const steelSpecName = steelSpec?.steelSpecName || '';
                                  const fallbackNBs = Object.entries(STEEL_SPEC_NB_FALLBACK).find(([pattern]) => steelSpecName.includes(pattern))?.[1];
                                  const nbs = fallbackNBs || [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300];
                                  return nbs.map((nb: number) => (
                                    <option key={nb} value={nb}>{nb} NB</option>
                                  ));
                                })()}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-0.5">Length (mm)</label>
                              <input
                                type="number"
                                value={entry.specs?.stubs?.[0]?.length || ''}
                                onChange={(e) => {
                                  const stubs = [...(entry.specs?.stubs || [])];
                                  stubs[0] = { ...stubs[0], length: parseInt(e.target.value) || 0 };
                                  const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                  updatedEntry.description = generateItemDescription(updatedEntry);
                                  onUpdateEntry(entry.id, updatedEntry);
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 text-gray-900"
                                placeholder="150"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-0.5">Location (mm)</label>
                              <input
                                type="number"
                                value={entry.specs?.stubs?.[0]?.locationFromFlange || ''}
                                onChange={(e) => {
                                  const stubs = [...(entry.specs?.stubs || [])];
                                  stubs[0] = { ...stubs[0], locationFromFlange: parseInt(e.target.value) || 0 };
                                  const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                  updatedEntry.description = generateItemDescription(updatedEntry);
                                  onUpdateEntry(entry.id, updatedEntry);
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 text-gray-900"
                                placeholder="From flange"
                              />
                            </div>
                          </div>
                          {/* Stub 1 Flange - Global with Override */}
                          <div className="bg-orange-50 border border-orange-200 rounded p-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium text-orange-900">
                                Flange
                                {entry.specs?.stubs?.[0]?.hasFlangeOverride ? (
                                  <span className="text-blue-600 ml-1">(Override)</span>
                                ) : globalSpecs?.flangeStandardId ? (
                                  <span className="text-green-600 ml-1">(Global)</span>
                                ) : null}
                              </span>
                              {globalSpecs?.flangeStandardId && (
                                <label className="flex items-center gap-1 text-xs cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={entry.specs?.stubs?.[0]?.hasFlangeOverride || false}
                                    onChange={(e) => {
                                      const stubs = [...(entry.specs?.stubs || [])];
                                      stubs[0] = {
                                        ...stubs[0],
                                        hasFlangeOverride: e.target.checked,
                                        flangeStandardId: e.target.checked ? (stubs[0]?.flangeStandardId || globalSpecs?.flangeStandardId) : undefined,
                                        flangePressureClassId: e.target.checked ? (stubs[0]?.flangePressureClassId || globalSpecs?.flangePressureClassId) : undefined
                                      };
                                      onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                                    }}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-gray-600">Override</span>
                                </label>
                              )}
                            </div>
                            {!entry.specs?.stubs?.[0]?.hasFlangeOverride && globalSpecs?.flangeStandardId ? (
                              <p className="text-xs text-orange-800">
                                {(() => {
                                  const flangeStandard = masterData.flangeStandards?.find((fs: any) => fs.id === globalSpecs.flangeStandardId);
                                  const pressureClass = masterData.pressureClasses?.find((pc: any) => pc.id === globalSpecs.flangePressureClassId);
                                  return flangeStandard && pressureClass ? `${flangeStandard.code}/${pressureClass.designation}` : 'Using global';
                                })()}
                              </p>
                            ) : entry.specs?.stubs?.[0]?.hasFlangeOverride ? (
                              <div className="grid grid-cols-2 gap-1">
                                <select
                                  value={entry.specs?.stubs?.[0]?.flangeStandardId || ''}
                                  onChange={async (e) => {
                                    const standardId = parseInt(e.target.value) || undefined;
                                    const stubs = [...(entry.specs?.stubs || [])];
                                    stubs[0] = { ...stubs[0], flangeStandardId: standardId, flangePressureClassId: undefined };
                                    onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                                    // Fetch pressure classes for this standard
                                    if (standardId) {
                                      getFilteredPressureClasses(standardId);
                                    }
                                  }}
                                  className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900"
                                >
                                  <option value="">Standard</option>
                                  {masterData.flangeStandards?.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.code}</option>
                                  ))}
                                </select>
                                <select
                                  value={entry.specs?.stubs?.[0]?.flangePressureClassId || ''}
                                  onChange={(e) => {
                                    const stubs = [...(entry.specs?.stubs || [])];
                                    stubs[0] = { ...stubs[0], flangePressureClassId: parseInt(e.target.value) || undefined };
                                    onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                                  }}
                                  className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900"
                                >
                                  <option value="">Class</option>
                                  {(() => {
                                    const stdId = entry.specs?.stubs?.[0]?.flangeStandardId;
                                    const filtered = stdId ? (pressureClassesByStandard[stdId] || []) : masterData.pressureClasses || [];
                                    return filtered.map((p: any) => (
                                      <option key={p.id} value={p.id}>{p.designation}</option>
                                    ));
                                  })()}
                                </select>
                              </div>
                            ) : (
                              <p className="text-xs text-orange-700">Set in Global Specs</p>
                            )}
                          </div>
                        </div>
                      )}

                      {(entry.specs?.numberOfStubs || 0) >= 2 && (
                        <div className="mt-2 p-2 bg-white rounded border border-green-300">
                          <p className="text-xs font-medium text-green-900 mb-1">Stub 2 <span className="text-gray-500 font-normal">(on vertical tangent - horizontal stub)</span></p>
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <div>
                              <label className="block text-xs text-gray-600 mb-0.5">NB</label>
                              <select
                                value={entry.specs?.stubs?.[1]?.nominalBoreMm || ''}
                                onChange={(e) => {
                                  const stubs = [...(entry.specs?.stubs || [])];
                                  stubs[1] = { ...stubs[1], nominalBoreMm: parseInt(e.target.value) || 0 };
                                  const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                  updatedEntry.description = generateItemDescription(updatedEntry);
                                  onUpdateEntry(entry.id, updatedEntry);
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 text-gray-900"
                              >
                                <option value="">Select NB</option>
                                {(() => {
                                  const effectiveSteelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                                  const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === effectiveSteelSpecId);
                                  const steelSpecName = steelSpec?.steelSpecName || '';
                                  const fallbackNBs = Object.entries(STEEL_SPEC_NB_FALLBACK).find(([pattern]) => steelSpecName.includes(pattern))?.[1];
                                  const nbs = fallbackNBs || [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300];
                                  return nbs.map((nb: number) => (
                                    <option key={nb} value={nb}>{nb} NB</option>
                                  ));
                                })()}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-0.5">Length (mm)</label>
                              <input
                                type="number"
                                value={entry.specs?.stubs?.[1]?.length || ''}
                                onChange={(e) => {
                                  const stubs = [...(entry.specs?.stubs || [])];
                                  stubs[1] = { ...stubs[1], length: parseInt(e.target.value) || 0 };
                                  const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                  updatedEntry.description = generateItemDescription(updatedEntry);
                                  onUpdateEntry(entry.id, updatedEntry);
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 text-gray-900"
                                placeholder="150"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-0.5">Location (mm)</label>
                              <input
                                type="number"
                                value={entry.specs?.stubs?.[1]?.locationFromFlange || ''}
                                onChange={(e) => {
                                  const stubs = [...(entry.specs?.stubs || [])];
                                  stubs[1] = { ...stubs[1], locationFromFlange: parseInt(e.target.value) || 0 };
                                  const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                  updatedEntry.description = generateItemDescription(updatedEntry);
                                  onUpdateEntry(entry.id, updatedEntry);
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 text-gray-900"
                                placeholder="From flange"
                              />
                            </div>
                          </div>
                          {/* Stub 2 Flange - Global with Override */}
                          <div className="bg-orange-50 border border-orange-200 rounded p-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium text-orange-900">
                                Flange
                                {entry.specs?.stubs?.[1]?.hasFlangeOverride ? (
                                  <span className="text-blue-600 ml-1">(Override)</span>
                                ) : globalSpecs?.flangeStandardId ? (
                                  <span className="text-green-600 ml-1">(Global)</span>
                                ) : null}
                              </span>
                              {globalSpecs?.flangeStandardId && (
                                <label className="flex items-center gap-1 text-xs cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={entry.specs?.stubs?.[1]?.hasFlangeOverride || false}
                                    onChange={(e) => {
                                      const stubs = [...(entry.specs?.stubs || [])];
                                      stubs[1] = {
                                        ...stubs[1],
                                        hasFlangeOverride: e.target.checked,
                                        flangeStandardId: e.target.checked ? (stubs[1]?.flangeStandardId || globalSpecs?.flangeStandardId) : undefined,
                                        flangePressureClassId: e.target.checked ? (stubs[1]?.flangePressureClassId || globalSpecs?.flangePressureClassId) : undefined
                                      };
                                      onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                                    }}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-gray-600">Override</span>
                                </label>
                              )}
                            </div>
                            {!entry.specs?.stubs?.[1]?.hasFlangeOverride && globalSpecs?.flangeStandardId ? (
                              <p className="text-xs text-orange-800">
                                {(() => {
                                  const flangeStandard = masterData.flangeStandards?.find((fs: any) => fs.id === globalSpecs.flangeStandardId);
                                  const pressureClass = masterData.pressureClasses?.find((pc: any) => pc.id === globalSpecs.flangePressureClassId);
                                  return flangeStandard && pressureClass ? `${flangeStandard.code}/${pressureClass.designation}` : 'Using global';
                                })()}
                              </p>
                            ) : entry.specs?.stubs?.[1]?.hasFlangeOverride ? (
                              <div className="grid grid-cols-2 gap-1">
                                <select
                                  value={entry.specs?.stubs?.[1]?.flangeStandardId || ''}
                                  onChange={async (e) => {
                                    const standardId = parseInt(e.target.value) || undefined;
                                    const stubs = [...(entry.specs?.stubs || [])];
                                    stubs[1] = { ...stubs[1], flangeStandardId: standardId, flangePressureClassId: undefined };
                                    onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                                    // Fetch pressure classes for this standard
                                    if (standardId) {
                                      getFilteredPressureClasses(standardId);
                                    }
                                  }}
                                  className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900"
                                >
                                  <option value="">Standard</option>
                                  {masterData.flangeStandards?.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.code}</option>
                                  ))}
                                </select>
                                <select
                                  value={entry.specs?.stubs?.[1]?.flangePressureClassId || ''}
                                  onChange={(e) => {
                                    const stubs = [...(entry.specs?.stubs || [])];
                                    stubs[1] = { ...stubs[1], flangePressureClassId: parseInt(e.target.value) || undefined };
                                    onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                                  }}
                                  className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900"
                                >
                                  <option value="">Class</option>
                                  {(() => {
                                    const stdId = entry.specs?.stubs?.[1]?.flangeStandardId;
                                    const filtered = stdId ? (pressureClassesByStandard[stdId] || []) : masterData.pressureClasses || [];
                                    return filtered.map((p: any) => (
                                      <option key={p.id} value={p.id}>{p.designation}</option>
                                    ));
                                  })()}
                                </select>
                              </div>
                            ) : (
                              <p className="text-xs text-orange-700">Set in Global Specs</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tee Welds - for stub connections */}
                      {(entry.specs?.numberOfStubs || 0) > 0 && (
                        <div className="mt-3 bg-teal-50 border border-teal-200 rounded-lg p-3">
                          <h6 className="text-xs font-bold text-teal-900 mb-1">Tee Welds</h6>
                          {(() => {
                            const dn = entry.specs?.nominalBoreMm;
                            const schedule = entry.specs?.scheduleNumber || '';
                            const pipeWallThickness = entry.specs?.wallThicknessMm;
                            const numStubs = entry.specs?.numberOfStubs || 0;
                            const stubs = entry.specs?.stubs || [];

                            // Check for SABS 719 - use item-level steel spec with global fallback
                            const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                            const isSABS719 = steelSpecId === 8;

                            // Weld thickness lookup (for ASTM/ASME only)
                            const FITTING_WALL_THICKNESS: Record<string, Record<number, number>> = {
                              'STD': { 15: 2.77, 20: 2.87, 25: 3.38, 32: 3.56, 40: 3.68, 50: 3.91, 65: 5.16, 80: 5.49, 90: 5.74, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53 },
                              'XH': { 15: 3.73, 20: 3.91, 25: 4.55, 32: 4.85, 40: 5.08, 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.70, 250: 12.70, 300: 12.70 },
                              'XXH': { 15: 7.47, 20: 7.82, 25: 9.09, 32: 9.70, 40: 10.16, 50: 11.07, 65: 14.02, 80: 15.24, 100: 17.12, 125: 19.05, 150: 22.23, 200: 22.23, 250: 25.40, 300: 25.40 }
                            };

                            const scheduleUpper = schedule.toUpperCase();
                            const fittingClass =
                              scheduleUpper.includes('160') || scheduleUpper.includes('XXS') || scheduleUpper.includes('XXH')
                                ? 'XXH'
                                : scheduleUpper.includes('80') || scheduleUpper.includes('XS') || scheduleUpper.includes('XH')
                                  ? 'XH'
                                  : 'STD';

                            const stub1NB = stubs[0]?.nominalBoreMm;
                            const stub2NB = stubs[1]?.nominalBoreMm;
                            const stub1OD = stub1NB ? (NB_TO_OD_LOOKUP[stub1NB] || (stub1NB * 1.05)) : 0;
                            const stub2OD = stub2NB ? (NB_TO_OD_LOOKUP[stub2NB] || (stub2NB * 1.05)) : 0;
                            const stub1Circumference = Math.PI * stub1OD;
                            const stub2Circumference = Math.PI * stub2OD;
                            // For SABS 719: use pipe WT directly; for ASTM/ASME: use fitting lookup
                            const stub1Thickness = isSABS719
                              ? (pipeWallThickness || 0)
                              : (stub1NB ? (FITTING_WALL_THICKNESS[fittingClass]?.[stub1NB] || pipeWallThickness) : 0);
                            const stub2Thickness = isSABS719
                              ? (pipeWallThickness || 0)
                              : (stub2NB ? (FITTING_WALL_THICKNESS[fittingClass]?.[stub2NB] || pipeWallThickness) : 0);

                            if (!stub1NB && !stub2NB) {
                              return (
                                <p className="text-xs text-teal-700">
                                  Select stub NB to see tee weld data
                                </p>
                              );
                            }

                            return (
                              <>
                                <p className="text-xs text-teal-800 mb-1">
                                  <span className="font-medium">{numStubs} Tee weld{numStubs > 1 ? 's' : ''}</span> (full penetration)
                                  {isSABS719 && <span className="text-blue-600 ml-1">(SABS 719 WT)</span>}
                                </p>
                                {numStubs >= 1 && stub1NB && (
                                  <p className="text-xs text-teal-700">
                                    Stub 1: {stub1NB}NB - {stub1Thickness?.toFixed(2)}mm weld x {stub1Circumference.toFixed(0)}mm circ
                                  </p>
                                )}
                                {numStubs >= 2 && stub2NB && (
                                  <p className="text-xs text-teal-700">
                                    Stub 2: {stub2NB}NB - {stub2Thickness?.toFixed(2)}mm weld x {stub2Circumference.toFixed(0)}mm circ
                                  </p>
                                )}
                                <p className="text-xs text-teal-600 mt-1">
                                  Total linear meterage: {((numStubs >= 1 && stub1NB ? stub1Circumference : 0) + (numStubs >= 2 && stub2NB ? stub2Circumference : 0)).toFixed(0)}mm
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Operating Conditions - Hidden: Uses global specs for working pressure/temp */}

                {/* Remove Item Button */}
                {entries.length > 1 && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => onRemoveEntry(entry.id)}
                      className="px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 text-sm font-medium border border-red-300 rounded-md transition-colors"
                    >
                      Remove Item
                    </button>
                  </div>
                )}

                {/* Calculation Results - Compact Layout matching Pipe style */}
                {entry.calculation && (
                  <div className="mt-4">
                    <h4 className="text-sm font-bold text-gray-900 border-b-2 border-purple-500 pb-1.5 mb-3">
                      Calculation Results
                    </h4>
                    <div className="bg-purple-50 border border-purple-200 p-3 rounded-md">
                      {(() => {
                        // Calculate all values needed for display
                        const cf = Number(entry.specs?.centerToFaceMm) || 0;
                        const tangent1 = entry.specs?.tangentLengths?.[0] || 0;
                        const tangent2 = entry.specs?.tangentLengths?.[1] || 0;
                        const numTangents = entry.specs?.numberOfTangents || 0;
                        const numStubs = entry.specs?.numberOfStubs || 0;
                        const stubs = entry.specs?.stubs || [];
                        const stub1NB = stubs[0]?.nominalBoreMm;
                        const stub2NB = stubs[1]?.nominalBoreMm;
                        // Stubs always have flanges by default when they exist (have NB set)
                        const stub1HasFlange = stub1NB ? true : false;
                        const stub2HasFlange = stub2NB ? true : false;
                        const bendEndConfig = entry.specs?.bendEndConfiguration || 'PE';

                        // C/F display with tangents
                        const end1 = cf + tangent1;
                        const end2 = cf + tangent2;
                        let cfDisplay = '';
                        if (numTangents > 0 && (tangent1 > 0 || tangent2 > 0)) {
                          if (numTangents === 2 && tangent1 > 0 && tangent2 > 0) {
                            cfDisplay = `${end1.toFixed(0)}x${end2.toFixed(0)}`;
                          } else if (tangent1 > 0) {
                            cfDisplay = `${end1.toFixed(0)}x${cf.toFixed(0)}`;
                          } else if (tangent2 > 0) {
                            cfDisplay = `${cf.toFixed(0)}x${end2.toFixed(0)}`;
                          }
                        } else {
                          cfDisplay = `${cf.toFixed(0)}`;
                        }

                        // Count total flanges from all sources
                        // FBE = Flanged Both Ends (2), LF_BE = Loose Flange Both Ends (2), 2X_RF = 2x Rotating Flange (2)
                        // FOE = Flanged One End (1), FOE_LF = Flanged One End Loose Flange (1), FOE_RF = Flanged One End Rotating Flange (1)
                        const bendFlangeCount = ['FBE', 'LF_BE', '2X_RF'].includes(bendEndConfig) ? 2
                          : ['FOE', 'FOE_LF', 'FOE_RF'].includes(bendEndConfig) ? 1 : 0;
                        const stub1FlangeCount = stub1HasFlange ? 1 : 0;
                        const stub2FlangeCount = stub2HasFlange ? 1 : 0;
                        const numSegments = entry.specs?.numberOfSegments || 0;
                        const totalFlanges = bendFlangeCount + stub1FlangeCount + stub2FlangeCount;

                        // Weld thickness lookup
                        const dn = entry.specs?.nominalBoreMm;
                        const schedule = entry.specs?.scheduleNumber || '';
                        const pipeWallThickness = entry.calculation?.wallThicknessMm;

                        // Check for SABS 719 - use item-level steel spec with global fallback
                        const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                        const isSABS719 = steelSpecId === 8;

                        const scheduleUpper = schedule.toUpperCase();
                        const fittingClass = scheduleUpper.includes('160') || scheduleUpper.includes('XXS') || scheduleUpper.includes('XXH') ? 'XXH' : scheduleUpper.includes('80') || scheduleUpper.includes('XS') || scheduleUpper.includes('XH') ? 'XH' : 'STD';
                        const FITTING_WT: Record<string, Record<number, number>> = {
                          'STD': { 15: 2.77, 20: 2.87, 25: 3.38, 32: 3.56, 40: 3.68, 50: 3.91, 65: 5.16, 80: 5.49, 90: 5.74, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53, 350: 9.53, 400: 9.53, 450: 9.53, 500: 9.53, 600: 9.53, 750: 9.53, 900: 9.53, 1000: 9.53, 1050: 9.53, 1200: 9.53 },
                          'XH': { 15: 3.73, 20: 3.91, 25: 4.55, 32: 4.85, 40: 5.08, 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.70, 250: 12.70, 300: 12.70, 350: 12.70, 400: 12.70, 450: 12.70, 500: 12.70, 600: 12.70, 750: 12.70, 900: 12.70, 1000: 12.70, 1050: 12.70, 1200: 12.70 },
                          'XXH': { 15: 7.47, 20: 7.82, 25: 9.09, 32: 9.70, 40: 10.16, 50: 11.07, 65: 14.02, 80: 15.24, 100: 17.12, 125: 19.05, 150: 22.23, 200: 22.23, 250: 25.40, 300: 25.40, 350: 25.40, 400: 25.40, 450: 25.40, 500: 25.40, 600: 25.40 }
                        };
                        const NB_TO_OD: Record<number, number> = { 15: 21.3, 20: 26.7, 25: 33.4, 32: 42.2, 40: 48.3, 50: 60.3, 65: 73.0, 80: 88.9, 100: 114.3, 125: 141.3, 150: 168.3, 200: 219.1, 250: 273.0, 300: 323.9, 350: 355.6, 400: 406.4, 450: 457.2, 500: 508.0, 600: 609.6, 700: 711.2, 750: 762.0, 800: 812.8, 900: 914.4, 1000: 1016.0, 1050: 1066.8, 1200: 1219.2 };
                        // For SABS 719: use pipe WT directly; for ASTM/ASME: use fitting lookup
                        const fittingWt = isSABS719 ? null : (dn ? FITTING_WT[fittingClass]?.[dn] : null);
                        const effectiveWt = isSABS719 ? pipeWallThickness : (fittingWt || pipeWallThickness);
                        const usingPipeThickness = isSABS719 || !fittingWt;

                        // Calculate stub weights using proper pipe weight formula
                        // Weight = π × (OD² - ID²) / 4 × density × length / 1000000
                        // Steel density = 7850 kg/m³
                        const calculateStubWeight = (stubNB: number | null, stubLength: number, stubWt?: number): number => {
                          if (!stubNB || stubLength <= 0) return 0;
                          const stubOD = NB_TO_OD[stubNB] || stubNB * 1.1;
                          // Use provided WT or lookup from FITTING_WT, or estimate as 5% of OD
                          const stubWT = stubWt || FITTING_WT[fittingClass]?.[stubNB] || (stubOD * 0.05);
                          const stubID = stubOD - (2 * stubWT);
                          const crossSectionalArea = Math.PI * (Math.pow(stubOD, 2) - Math.pow(stubID, 2)) / 4; // mm²
                          const weightPerMeter = crossSectionalArea * 7850 / 1000000; // kg/m
                          return weightPerMeter * (stubLength / 1000); // kg
                        };
                        const stub1Weight = calculateStubWeight(stub1NB, stubs[0]?.length || 0, stubs[0]?.wallThicknessMm);
                        const stub2Weight = calculateStubWeight(stub2NB, stubs[1]?.length || 0, stubs[1]?.wallThicknessMm);
                        const stubsWeight = stub1Weight + stub2Weight;

                        // Stub weld thicknesses (for flange and tee welds) - SABS 719 uses pipe WT
                        const stub1Wt = isSABS719
                          ? (pipeWallThickness || 5)
                          : (stub1NB ? (FITTING_WT[fittingClass]?.[stub1NB] || pipeWallThickness || 5) : 0);
                        const stub2Wt = isSABS719
                          ? (pipeWallThickness || 5)
                          : (stub2NB ? (FITTING_WT[fittingClass]?.[stub2NB] || pipeWallThickness || 5) : 0);

                        // Calculate flange weights dynamically based on NB and pressure class
                        // Bend flanges - use bend's NB and pressure class
                        const bendPressureClass = masterData.pressureClasses?.find((p: any) => p.id === (entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId))?.designation;
                        const bendFlangeWeight = bendFlangeCount > 0 ? getFlangeWeight(dn || 100, bendPressureClass) * bendFlangeCount : 0;

                        // Stub 1 flange - use stub's own NB and pressure class
                        const stub1PressureClass = stubs[0]?.flangePressureClassId
                          ? masterData.pressureClasses?.find((p: any) => p.id === stubs[0].flangePressureClassId)?.designation
                          : bendPressureClass;
                        const stub1FlangeWeight = stub1FlangeCount > 0 ? getFlangeWeight(stub1NB || dn || 100, stub1PressureClass) : 0;

                        // Stub 2 flange - use stub's own NB and pressure class
                        const stub2PressureClass = stubs[1]?.flangePressureClassId
                          ? masterData.pressureClasses?.find((p: any) => p.id === stubs[1].flangePressureClassId)?.designation
                          : bendPressureClass;
                        const stub2FlangeWeight = stub2FlangeCount > 0 ? getFlangeWeight(stub2NB || dn || 100, stub2PressureClass) : 0;

                        // Total calculated flange weight
                        const totalCalcFlangeWeight = bendFlangeWeight + stub1FlangeWeight + stub2FlangeWeight;

                        return (
                          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
                            {/* Quantity */}
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-600 font-medium">Qty Bends</p>
                              <p className="text-lg font-bold text-gray-900">{entry.specs?.quantityValue || 1}</p>
                              <p className="text-xs text-gray-500">pieces</p>
                            </div>

                            {/* Combined Dimensions - C/F and Stubs */}
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-600 font-medium">Dimensions</p>
                              <p className="text-sm font-bold text-purple-900">C/F: {cfDisplay} mm</p>
                              {numTangents > 0 && <p className="text-[10px] text-gray-500">incl. tangents</p>}
                              {numStubs > 0 && (
                                <div className="mt-1 pt-1 border-t border-gray-200">
                                  {stub1NB && (
                                    <p className="text-[10px] text-gray-700">Stub 1 Length: {stubs[0]?.length || 0}mm</p>
                                  )}
                                  {stub2NB && (
                                    <p className="text-[10px] text-gray-700">Stub 2 Length: {stubs[1]?.length || 0}mm</p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Surface Area - for coating calculations */}
                            {(() => {
                              const odMm = entry.calculation?.outsideDiameterMm || entry.specs?.outsideDiameterMm;
                              const wtMm = entry.calculation?.wallThicknessMm || entry.specs?.wallThicknessMm;
                              if (!odMm || !wtMm) return null;

                              const idMm = odMm - (2 * wtMm);
                              const odM = odMm / 1000;
                              const idM = idMm / 1000;

                              // Get bend radius and angle
                              const bendRadiusMm = entry.specs?.bendRadiusMm || entry.calculation?.bendRadiusMm ||
                                (entry.specs?.centerToFaceMm ? entry.specs.centerToFaceMm : (entry.specs?.nominalBoreMm || 100) * 1.5);
                              const bendAngleDeg = entry.specs?.bendDegrees || 90;
                              const bendAngleRad = (bendAngleDeg * Math.PI) / 180;
                              const arcLengthM = (bendRadiusMm / 1000) * bendAngleRad;

                              let extArea = odM * Math.PI * arcLengthM;
                              let intArea = idM * Math.PI * arcLengthM;

                              // Add tangents
                              const tangentLengths = entry.specs?.tangentLengths || [];
                              if (tangentLengths[0] > 0) {
                                extArea += odM * Math.PI * (tangentLengths[0] / 1000);
                                intArea += idM * Math.PI * (tangentLengths[0] / 1000);
                              }
                              if (tangentLengths[1] > 0) {
                                extArea += odM * Math.PI * (tangentLengths[1] / 1000);
                                intArea += idM * Math.PI * (tangentLengths[1] / 1000);
                              }

                              // Add stubs
                              if (entry.specs?.stubs?.length > 0) {
                                entry.specs.stubs.forEach((stub: any) => {
                                  if (stub?.nominalBoreMm && stub?.length) {
                                    const stubOdMm = stub.outsideDiameterMm || (stub.nominalBoreMm * 1.1);
                                    const stubWtMm = stub.wallThicknessMm || (stubOdMm * 0.08);
                                    const stubIdMm = stubOdMm - (2 * stubWtMm);
                                    extArea += (stubOdMm / 1000) * Math.PI * (stub.length / 1000);
                                    intArea += (stubIdMm / 1000) * Math.PI * (stub.length / 1000);
                                  }
                                });
                              }

                              return (
                                <div className="bg-indigo-50 p-2 rounded text-center border border-indigo-200">
                                  <p className="text-xs text-indigo-700 font-medium">Surface Area</p>
                                  <div className="mt-1 space-y-0.5">
                                    <p className="text-xs text-indigo-900">
                                      <span className="font-medium">Ext:</span> {extArea.toFixed(3)} m²
                                    </p>
                                    <p className="text-xs text-indigo-900">
                                      <span className="font-medium">Int:</span> {intArea.toFixed(3)} m²
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Total Weight - calculated from all components including backing rings */}
                            {(() => {
                              const bendConfig = (entry.specs?.bendEndConfiguration || 'PE').toUpperCase();
                              // Only R/F (rotating flange) configurations require backing rings
                              const hasRotatingFlange = ['FOE_RF', '2X_RF'].includes(bendConfig);

                              let backingRingWeight = 0;
                              if (hasRotatingFlange) {
                                const getBackingRingCountBend = () => {
                                  if (bendConfig === 'FOE_RF') return 1;
                                  if (bendConfig === '2X_RF') return 2;
                                  return 0;
                                };
                                const backingRingCount = getBackingRingCountBend();

                                const getFlangeODBend = (nb: number) => {
                                  const flangeODs: Record<number, number> = {
                                    15: 95, 20: 105, 25: 115, 32: 140, 40: 150, 50: 165, 65: 185, 80: 200,
                                    100: 220, 125: 250, 150: 285, 200: 340, 250: 405, 300: 460, 350: 520,
                                    400: 580, 450: 640, 500: 670, 600: 780
                                  };
                                  return flangeODs[nb] || nb * 1.5;
                                };

                                const pipeOD = entry.calculation?.outsideDiameterMm || (dn * 1.1);
                                const flangeOD = getFlangeODBend(dn || 100);
                                const ringOD = flangeOD - 10;
                                const ringID = pipeOD;
                                const ringThickness = 10;
                                const steelDensity = 7.85;

                                const volumeCm3 = Math.PI * (Math.pow(ringOD/20, 2) - Math.pow(ringID/20, 2)) * (ringThickness/10);
                                const weightPerRing = volumeCm3 * steelDensity / 1000;
                                backingRingWeight = weightPerRing * backingRingCount;
                              }

                              const totalWeight = (entry.calculation.bendWeight || 0) + (entry.calculation.tangentWeight || 0) + totalCalcFlangeWeight + stubsWeight + backingRingWeight;

                              return (
                                <div className="bg-white p-2 rounded text-center">
                                  <p className="text-xs text-gray-600 font-medium">Total Weight</p>
                                  <p className="text-lg font-bold text-purple-900">
                                    {totalWeight.toFixed(1)} kg
                                  </p>
                                  {backingRingWeight > 0 && (
                                    <p className="text-xs text-purple-600">
                                      (incl. {backingRingWeight.toFixed(1)}kg rings)
                                    </p>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Weight Breakdown - Bend first, then Tangent, Flange, Stubs, Rings */}
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-600 font-medium">Weight Breakdown</p>
                              <p className="text-xs text-gray-700 mt-1">Bend: {entry.calculation.bendWeight?.toFixed(1) || '0'}kg</p>
                              <p className="text-xs text-gray-700">Tangent: {entry.calculation.tangentWeight?.toFixed(1) || '0'}kg</p>
                              <p className="text-xs text-gray-700">Flange: {totalCalcFlangeWeight.toFixed(1)}kg</p>
                              {bendFlangeCount > 0 && <p className="text-[10px] text-gray-500 ml-2">({bendFlangeCount}x bend @ {bendFlangeWeight.toFixed(1)}kg)</p>}
                              {stub1FlangeCount > 0 && <p className="text-[10px] text-gray-500 ml-2">(stub1 @ {stub1FlangeWeight.toFixed(1)}kg)</p>}
                              {stub2FlangeCount > 0 && <p className="text-[10px] text-gray-500 ml-2">(stub2 @ {stub2FlangeWeight.toFixed(1)}kg)</p>}
                              {numStubs > 0 && <p className="text-xs text-gray-700">Stubs: {stubsWeight.toFixed(1)}kg</p>}
                            </div>

                            {/* Flanges & Backing Rings - Combined field */}
                            {(() => {
                              const bendConfig = (entry.specs?.bendEndConfiguration || 'PE').toUpperCase();
                              // Only R/F (rotating flange) configurations require backing rings
                              const hasRotatingFlange = ['FOE_RF', '2X_RF'].includes(bendConfig);

                              // Get backing ring count and weight if applicable
                              let backingRingCount = 0;
                              let backingRingWeight = 0;
                              if (hasRotatingFlange) {
                                if (bendConfig === 'FOE_RF') backingRingCount = 1;
                                else if (bendConfig === '2X_RF') backingRingCount = 2;

                                if (backingRingCount > 0) {
                                  const getFlangeOD = (nb: number) => {
                                    const flangeODs: Record<number, number> = {
                                      15: 95, 20: 105, 25: 115, 32: 140, 40: 150, 50: 165, 65: 185, 80: 200,
                                      100: 220, 125: 250, 150: 285, 200: 340, 250: 405, 300: 460, 350: 520,
                                      400: 580, 450: 640, 500: 670, 600: 780
                                    };
                                    return flangeODs[nb] || nb * 1.5;
                                  };
                                  const pipeOD = entry.calculation?.outsideDiameterMm || (dn * 1.1);
                                  const flangeOD = getFlangeOD(dn || 100);
                                  const ringOD = flangeOD - 10;
                                  const ringID = pipeOD;
                                  const ringThickness = 10;
                                  const steelDensity = 7.85;
                                  const volumeCm3 = Math.PI * (Math.pow(ringOD/20, 2) - Math.pow(ringID/20, 2)) * (ringThickness/10);
                                  const weightPerRing = volumeCm3 * steelDensity / 1000;
                                  backingRingWeight = weightPerRing * backingRingCount;
                                }
                              }

                              return (
                                <div className="bg-white p-2 rounded text-center">
                                  <p className="text-xs text-gray-600 font-medium">Flanges{backingRingCount > 0 ? ' & Rings' : ''}</p>
                                  <p className="text-lg font-bold text-gray-900">{totalFlanges}</p>
                                  <div className="text-left mt-1 space-y-0.5">
                                    {bendFlangeCount > 0 && (
                                      <p className="text-[10px] text-gray-700">{bendFlangeCount} x {dn}NB Flange</p>
                                    )}
                                    {/* Stub flanges - combine if same NB, separate if different */}
                                    {stub1FlangeCount > 0 && stub2FlangeCount > 0 && stub1NB === stub2NB ? (
                                      <p className="text-[10px] text-purple-700">2 x {stub1NB}NB Stub Flange</p>
                                    ) : (
                                      <>
                                        {stub1FlangeCount > 0 && stub1NB && (
                                          <p className="text-[10px] text-purple-700">1 x {stub1NB}NB Stub Flange</p>
                                        )}
                                        {stub2FlangeCount > 0 && stub2NB && (
                                          <p className="text-[10px] text-purple-700">1 x {stub2NB}NB Stub Flange</p>
                                        )}
                                      </>
                                    )}
                                    {backingRingCount > 0 && (
                                      <p className="text-[10px] text-purple-700 mt-1 pt-1 border-t border-purple-200">
                                        {backingRingCount} x Backing Ring ({backingRingWeight.toFixed(1)}kg)
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Weld Summary */}
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-600 font-medium">Weld Summary</p>
                              <div className="text-left mt-1 space-y-0.5">
                                {bendFlangeCount > 0 && (
                                  <p className="text-[10px] text-green-700">Bend Flange: {bendFlangeCount * 2} welds @ {effectiveWt?.toFixed(1) || '?'}mm</p>
                                )}
                                {numTangents > 0 && (
                                  <p className="text-[10px] text-blue-700">Tangent Buttweld: {numTangents} @ {effectiveWt?.toFixed(1) || '?'}mm</p>
                                )}
                                {numSegments > 1 && (
                                  <p className="text-[10px] text-red-700">Mitre Weld: {numSegments - 1} @ {effectiveWt?.toFixed(1) || '?'}mm</p>
                                )}
                                {stub1NB && (
                                  <p className="text-[10px] text-purple-700">Stub 1 Tee: 1 weld @ {stub1Wt?.toFixed(1) || '?'}mm</p>
                                )}
                                {stub2NB && (
                                  <p className="text-[10px] text-purple-700">Stub 2 Tee: 1 weld @ {stub2Wt?.toFixed(1) || '?'}mm</p>
                                )}
                                {stub1FlangeCount > 0 && (
                                  <p className="text-[10px] text-orange-700">Stub 1 Flange: 2 welds @ {stub1Wt?.toFixed(1) || '?'}mm</p>
                                )}
                                {stub2FlangeCount > 0 && (
                                  <p className="text-[10px] text-orange-700">Stub 2 Flange: 2 welds @ {stub2Wt?.toFixed(1) || '?'}mm</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
                  </>
                }
                previewContent={
                  <Bend3DPreview
                    nominalBore={entry.specs.nominalBoreMm}
                    outerDiameter={entry.calculation?.outsideDiameterMm || NB_TO_OD_LOOKUP[entry.specs.nominalBoreMm] || (entry.specs.nominalBoreMm * 1.05)}
                    wallThickness={entry.calculation?.wallThicknessMm || 5}
                    bendAngle={entry.specs.bendDegrees}
                    bendType={entry.specs.bendType || '1.5D'}
                    tangent1={entry.specs?.tangentLengths?.[0] || 0}
                    tangent2={entry.specs?.tangentLengths?.[1] || 0}
                    schedule={entry.specs.scheduleNumber}
                    materialName={masterData.steelSpecs.find((s: any) => s.id === (entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId))?.steelSpecName}
                    numberOfSegments={entry.specs?.numberOfSegments}
                    isSegmented={(entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId) === 8}
                    stubs={entry.specs?.stubs}
                    numberOfStubs={entry.specs?.numberOfStubs || 0}
                    flangeConfig={entry.specs?.bendEndConfiguration || 'PE'}
                    closureLengthMm={entry.specs?.closureLengthMm || 0}
                    addBlankFlange={entry.specs?.addBlankFlange}
                    blankFlangePositions={entry.specs?.blankFlangePositions}
                  />
                }
              />
            ) : entry.itemType === 'fitting' ? (
              <>
              {/* Fitting Item Fields with Split-Pane Layout */}
              <SplitPaneLayout
                entryId={entry.id}
                itemType="fitting"
                showSplitToggle={entry.specs?.fittingType && ['SHORT_TEE', 'GUSSET_TEE', 'UNEQUAL_SHORT_TEE', 'UNEQUAL_GUSSET_TEE', 'SHORT_REDUCING_TEE', 'GUSSET_REDUCING_TEE', 'EQUAL_TEE', 'UNEQUAL_TEE', 'SWEEP_TEE', 'GUSSETTED_TEE'].includes(entry.specs?.fittingType)}
                formContent={
                  <>
                {/* Item Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                    Item Description *
                  </label>
                  <textarea
                    value={entry.description || generateItemDescription(entry)}
                    onChange={(e) => onUpdateEntry(entry.id, { description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                    rows={2}
                    placeholder="e.g., 100NB Short Equal Tee Sch40 SABS719"
                    required
                  />
                  <div className="flex justify-between items-center mt-0.5">
                    <p className="text-xs text-gray-500">
                      Edit the description or use the auto-generated one
                    </p>
                    {entry.description && entry.description !== generateItemDescription(entry) && (
                      <button
                        type="button"
                        onClick={() => onUpdateEntry(entry.id, { description: generateItemDescription(entry) })}
                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                      >
                        Reset to Auto-generated
                      </button>
                    )}
                  </div>
                </div>

                {/* Fitting Specifications Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Column 1 - Basic Specs */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5">
                      Fitting Specifications
                    </h4>

                    {/* Fitting Standard - Auto from Global Steel Spec (ID 8 = SABS 719), can be overridden */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Fitting Standard *
                        {(() => {
                          const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                          const derived = isSABS719 ? 'SABS719' : 'SABS62';
                          const hasGlobal = !!globalSpecs?.steelSpecificationId;
                          const current = entry.specs?.fittingStandard || derived;
                          if (hasGlobal && current === derived) return <span className="text-green-600 text-xs ml-2 font-normal">(From Steel Spec)</span>;
                          if (hasGlobal && current !== derived) return <span className="text-blue-600 text-xs ml-2 font-normal">(Override)</span>;
                          return null;
                        })()}
                      </label>
                      <div className="flex gap-2">
                        <select
                          id={`fitting-standard-${entry.id}`}
                          value={entry.specs?.fittingStandard || ((entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8 ? 'SABS719' : 'SABS62')}
                          onChange={(e) => {
                            const updatedEntry = {
                              ...entry,
                              specs: { ...entry.specs, fittingStandard: e.target.value as 'SABS62' | 'SABS719', nominalDiameterMm: undefined }
                            };
                            updatedEntry.description = generateItemDescription(updatedEntry);
                            onUpdateEntry(entry.id, updatedEntry);

                            if (!entry.specs?.fittingType) {
                              focusAndOpenSelect(`fitting-type-${entry.id}`);
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        >
                          <option value="SABS62">SABS62 (Standard Fittings)</option>
                          <option value="SABS719">SABS719 (Fabricated Fittings)</option>
                        </select>
                        {(() => {
                          const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                          const derived = isSABS719 ? 'SABS719' : 'SABS62';
                          const hasGlobal = !!globalSpecs?.steelSpecificationId;
                          const current = entry.specs?.fittingStandard;
                          if (hasGlobal && current && current !== derived) {
                            return (
                              <button
                                type="button"
                                onClick={() => onUpdateEntry(entry.id, { specs: { ...entry.specs, fittingStandard: undefined, nominalDiameterMm: undefined } })}
                                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded"
                              >
                                Reset
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {(entry.specs?.fittingStandard || ((entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8 ? 'SABS719' : 'SABS62')) === 'SABS719'
                          ? 'Uses pipe table for cut lengths, tee/lateral weld + flange welds'
                          : 'Uses standard fitting dimensions from tables'}
                      </p>
                    </div>

                    {/* Fitting Type */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Fitting Type *
                      </label>
                      <select
                        id={`fitting-type-${entry.id}`}
                        value={entry.specs?.fittingType || ''}
                        onChange={async (e) => {
                          const fittingType = e.target.value;
                          const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                          const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');

                          // Check if switching to equal tee or reducing tee
                          const isReducingTee = ['SHORT_REDUCING_TEE', 'GUSSET_REDUCING_TEE'].includes(fittingType);
                          const isEqualTee = ['SHORT_TEE', 'GUSSET_TEE', 'EQUAL_TEE'].includes(fittingType);

                          // Fetch fitting dimensions for pipe lengths if NB is selected
                          let pipeLengthA = entry.specs?.pipeLengthAMm;
                          let pipeLengthB = entry.specs?.pipeLengthBMm;
                          let pipeLengthAMmAuto = entry.specs?.pipeLengthAMmAuto;
                          let pipeLengthBMmAuto = entry.specs?.pipeLengthBMmAuto;

                          if (fittingType && entry.specs?.nominalDiameterMm) {
                            try {
                              const dims = await masterDataApi.getFittingDimensions(
                                effectiveStandard as 'SABS62' | 'SABS719',
                                fittingType,
                                entry.specs.nominalDiameterMm,
                                entry.specs?.angleRange
                              );
                              if (dims) {
                                // Parse string values to numbers (API returns decimal strings)
                                const dimA = dims.dimensionAMm ? Number(dims.dimensionAMm) : null;
                                const dimB = dims.dimensionBMm ? Number(dims.dimensionBMm) : null;
                                // For equal tees, ALWAYS use the table values (ignore overrides)
                                // For other types, respect existing overrides
                                if (dimA && (isEqualTee || !entry.specs?.pipeLengthAOverride)) {
                                  pipeLengthA = dimA;
                                  pipeLengthAMmAuto = dimA;
                                }
                                if (dimB && (isEqualTee || !entry.specs?.pipeLengthBOverride)) {
                                  pipeLengthB = dimB;
                                  pipeLengthBMmAuto = dimB;
                                }
                              }
                            } catch (err) {
                              console.log('Could not fetch fitting dimensions:', err);
                            }
                          }

                          const updatedEntry = {
                            ...entry,
                            specs: {
                              ...entry.specs,
                              fittingType,
                              pipeLengthAMm: pipeLengthA,
                              pipeLengthBMm: pipeLengthB,
                              pipeLengthAMmAuto,
                              pipeLengthBMmAuto,
                              // Clear branch NB when not a reducing tee
                              branchNominalDiameterMm: isReducingTee ? entry.specs?.branchNominalDiameterMm : undefined,
                              // Clear stub location for equal tees (they use standard C/F from tables)
                              stubLocation: isEqualTee ? undefined : entry.specs?.stubLocation,
                              // Clear pipe length overrides for equal tees
                              pipeLengthAOverride: isEqualTee ? false : entry.specs?.pipeLengthAOverride,
                              pipeLengthBOverride: isEqualTee ? false : entry.specs?.pipeLengthBOverride
                            }
                          };
                          // Regenerate description with new specs
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);
                          // Auto-calculate fitting
                          setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);

                          if (fittingType && !entry.specs?.nominalDiameterMm) {
                            focusAndOpenSelect(`fitting-nb-${entry.id}`);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                      >
                        <option value="">Select fitting type...</option>
                        {(entry.specs?.fittingStandard || ((entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8 ? 'SABS719' : 'SABS62')) === 'SABS62' ? (
                          <>
                            <option value="EQUAL_TEE">Equal Tee</option>
                            <option value="UNEQUAL_TEE">Unequal Tee</option>
                            <option value="LATERAL">Lateral</option>
                            <option value="SWEEP_TEE">Sweep Tee</option>
                            <option value="Y_PIECE">Y-Piece</option>
                            <option value="GUSSETTED_TEE">Gussetted Tee</option>
                            <option value="EQUAL_CROSS">Equal Cross</option>
                            <option value="UNEQUAL_CROSS">Unequal Cross</option>
                          </>
                        ) : (
                          <>
                            <option value="SHORT_TEE">Short Tee (Equal)</option>
                            <option value="UNEQUAL_SHORT_TEE">Short Tee (Unequal)</option>
                            <option value="SHORT_REDUCING_TEE">Short Reducing Tee</option>
                            <option value="GUSSET_TEE">Gusset Tee (Equal)</option>
                            <option value="UNEQUAL_GUSSET_TEE">Gusset Tee (Unequal)</option>
                            <option value="GUSSET_REDUCING_TEE">Gusset Reducing Tee</option>
                            <option value="LATERAL">Lateral</option>
                            <option value="DUCKFOOT_SHORT">Duckfoot (Short)</option>
                            <option value="DUCKFOOT_GUSSETTED">Duckfoot (Gussetted)</option>
                            <option value="SWEEP_LONG_RADIUS">Sweep (Long Radius)</option>
                            <option value="SWEEP_MEDIUM_RADIUS">Sweep (Medium Radius)</option>
                            <option value="SWEEP_ELBOW">Sweep Elbow</option>
                          </>
                        )}
                        <option value="CON_REDUCER">Concentric Reducer</option>
                        <option value="ECCENTRIC_REDUCER">Eccentric Reducer</option>
                      </select>
                    </div>

                    {/* Nominal Diameter - Linked to Steel Specification */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Nominal Diameter (mm) *
                        {globalSpecs?.steelSpecificationId && (
                          <span className="text-green-600 text-xs ml-2">(From Steel Spec)</span>
                        )}
                      </label>
                      <select
                        id={`fitting-nb-${entry.id}`}
                        value={entry.specs?.nominalDiameterMm || ''}
                        onChange={async (e) => {
                          const nominalDiameter = Number(e.target.value);

                          // Get effective fitting standard (ID 8 = SABS 719)
                          const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                          const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');

                          // Auto-populate schedule for SABS719 fittings
                          let matchedSchedule = entry.specs?.scheduleNumber;
                          let matchedWT = entry.specs?.wallThicknessMm;

                          if (effectiveStandard === 'SABS719' && globalSpecs?.workingPressureBar) {
                            const effectiveSpecId2 = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                            const availableSchedules = getScheduleListForSpec(nominalDiameter, effectiveSpecId2);
                            if (availableSchedules.length > 0) {
                              const minWT = getMinimumWallThickness(nominalDiameter, globalSpecs.workingPressureBar);
                              const sorted = [...availableSchedules].sort((a: any, b: any) =>
                                (a.wallThicknessMm || 0) - (b.wallThicknessMm || 0)
                              );
                              const suitable = sorted.find((s: any) => (s.wallThicknessMm || 0) >= minWT);
                              if (suitable) {
                                matchedSchedule = suitable.scheduleDesignation;
                                matchedWT = suitable.wallThicknessMm;
                              } else if (sorted.length > 0) {
                                const thickest = sorted[sorted.length - 1];
                                matchedSchedule = thickest.scheduleDesignation;
                                matchedWT = thickest.wallThicknessMm;
                              }
                            }
                          }

                          // Fetch fitting dimensions for pipe lengths
                          let pipeLengthA = entry.specs?.pipeLengthAMm;
                          let pipeLengthB = entry.specs?.pipeLengthBMm;
                          let pipeLengthAMmAuto = entry.specs?.pipeLengthAMmAuto;
                          let pipeLengthBMmAuto = entry.specs?.pipeLengthBMmAuto;

                          if (entry.specs?.fittingType && nominalDiameter) {
                            try {
                              const dims = await masterDataApi.getFittingDimensions(
                                effectiveStandard as 'SABS62' | 'SABS719',
                                entry.specs.fittingType,
                                nominalDiameter,
                                entry.specs?.angleRange
                              );
                              if (dims) {
                                // Parse string values to numbers (API returns decimal strings)
                                const dimA = dims.dimensionAMm ? Number(dims.dimensionAMm) : null;
                                const dimB = dims.dimensionBMm ? Number(dims.dimensionBMm) : null;
                                if (dimA && !entry.specs?.pipeLengthAOverride) {
                                  pipeLengthA = dimA;
                                  pipeLengthAMmAuto = dimA;
                                }
                                if (dimB && !entry.specs?.pipeLengthBOverride) {
                                  pipeLengthB = dimB;
                                  pipeLengthBMmAuto = dimB;
                                }
                              }
                            } catch (err) {
                              console.log('Could not fetch fitting dimensions:', err);
                            }
                          }

                          const updatedEntry = {
                            ...entry,
                            specs: {
                              ...entry.specs,
                              nominalDiameterMm: nominalDiameter,
                              scheduleNumber: matchedSchedule,
                              wallThicknessMm: matchedWT,
                              pipeLengthAMm: pipeLengthA,
                              pipeLengthBMm: pipeLengthB,
                              pipeLengthAMmAuto: pipeLengthAMmAuto,
                              pipeLengthBMmAuto: pipeLengthBMmAuto
                            }
                          };
                          // Regenerate description with new specs
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);
                          // Auto-calculate fitting
                          setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);

                          const isReducingTee = ['SHORT_REDUCING_TEE', 'GUSSET_REDUCING_TEE'].includes(entry.specs?.fittingType || '');
                          if (nominalDiameter && isReducingTee && !entry.specs?.branchNominalDiameterMm) {
                            focusAndOpenSelect(`fitting-branch-nb-${entry.id}`);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                      >
                        <option value="">Select diameter...</option>
                        {(() => {
                          const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                          const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');
                          const sizes = effectiveStandard === 'SABS719'
                            ? [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900]
                            : [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150];
                          return sizes.map((nb: number) => (
                            <option key={nb} value={nb}>{nb}mm</option>
                          ));
                        })()}
                      </select>
                      {(() => {
                        const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                        const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');
                        const sizes = effectiveStandard === 'SABS719'
                          ? [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900]
                          : [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150];
                        return (
                          <p className="mt-1 text-xs text-gray-500">
                            {sizes.length} sizes available ({effectiveStandard})
                          </p>
                        );
                      })()}
                    </div>

                    {/* Branch Nominal Diameter - For Reducing Tees */}
                    {(entry.specs?.fittingType === 'SHORT_REDUCING_TEE' || entry.specs?.fittingType === 'GUSSET_REDUCING_TEE') && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          Branch Nominal Diameter (mm) *
                          <span className="text-blue-600 text-xs ml-2">(Tee Outlet Size)</span>
                        </label>
                        <select
                          id={`fitting-branch-nb-${entry.id}`}
                          value={entry.specs?.branchNominalDiameterMm || ''}
                          onChange={(e) => {
                            const branchDiameter = Number(e.target.value);
                            onUpdateEntry(entry.id, {
                              specs: {
                                ...entry.specs,
                                branchNominalDiameterMm: branchDiameter
                              }
                            });
                            // Auto-calculate fitting
                            setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                        >
                          <option value="">Select branch diameter...</option>
                          {(() => {
                            const mainNB = entry.specs?.nominalDiameterMm || 0;
                            // Branch sizes should be smaller than main pipe
                            const sizes = [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900]
                              .filter(nb => nb < mainNB);
                            return sizes.map((nb: number) => (
                              <option key={nb} value={nb}>{nb}mm</option>
                            ));
                          })()}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          Branch/outlet size must be smaller than main pipe ({entry.specs?.nominalDiameterMm || '--'}mm)
                        </p>
                      </div>
                    )}

                    {/* Pipe Lengths - Auto-filled from fitting dimensions */}
                    {(() => {
                      const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                      const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');
                      const fittingType = entry.specs?.fittingType;
                      const nb = entry.specs?.nominalDiameterMm;
                      const hasRequiredData = fittingType && nb;
                      const isAutoA = entry.specs?.pipeLengthAMmAuto && !entry.specs?.pipeLengthAOverride;
                      const isAutoB = entry.specs?.pipeLengthBMmAuto && !entry.specs?.pipeLengthBOverride;

                      // Equal tees use standard C/F from tables only - no length/location customization
                      const isEqualTee = ['SHORT_TEE', 'GUSSET_TEE', 'EQUAL_TEE'].includes(fittingType || '');

                      // Function to fetch and set dimensions
                      const fetchDimensions = async () => {
                        if (!fittingType || !nb) return;
                        try {
                          const dims = await masterDataApi.getFittingDimensions(effectiveStandard as 'SABS62' | 'SABS719', fittingType, nb, entry.specs?.angleRange);
                          if (dims) {
                            // Parse string values to numbers (API returns decimal strings)
                            const dimA = dims.dimensionAMm ? Number(dims.dimensionAMm) : null;
                            const dimB = dims.dimensionBMm ? Number(dims.dimensionBMm) : null;
                            const updates: any = { specs: { ...entry.specs } };
                            if (dimA && !entry.specs?.pipeLengthAOverride) {
                              updates.specs.pipeLengthAMm = dimA;
                              updates.specs.pipeLengthAMmAuto = dimA;
                            }
                            if (dimB && !entry.specs?.pipeLengthBOverride) {
                              updates.specs.pipeLengthBMm = dimB;
                              updates.specs.pipeLengthBMmAuto = dimB;
                            }
                            onUpdateEntry(entry.id, updates);
                          }
                        } catch (err) {
                          console.log('Could not fetch fitting dimensions:', err);
                        }
                      };

                      return (
                        <>
                          {/* Pipe Length A */}
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-xs font-semibold text-gray-900">
                                Pipe Length A (mm) *
                                {isEqualTee && <span className="text-gray-500 text-xs ml-1 font-normal">(Standard C/F)</span>}
                                {!isEqualTee && isAutoA && <span className="text-green-600 text-xs ml-1 font-normal">(Auto)</span>}
                                {!isEqualTee && entry.specs?.pipeLengthAOverride && <span className="text-blue-600 text-xs ml-1 font-normal">(Override)</span>}
                              </label>
                              {!isEqualTee && hasRequiredData && !entry.specs?.pipeLengthAMmAuto && (
                                <button
                                  type="button"
                                  onClick={fetchDimensions}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  Fetch
                                </button>
                              )}
                              {!isEqualTee && entry.specs?.pipeLengthAOverride && entry.specs?.pipeLengthAMmAuto && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateEntry(entry.id, {
                                    specs: { ...entry.specs, pipeLengthAMm: entry.specs?.pipeLengthAMmAuto, pipeLengthAOverride: false }
                                  })}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                            <input
                              type="number"
                              value={entry.specs?.pipeLengthAMm || ''}
                              onChange={(e) => {
                                if (isEqualTee) return; // Don't allow changes for equal tees
                                const newValue = Number(e.target.value);
                                const isOverride = entry.specs?.pipeLengthAMmAuto && newValue !== entry.specs?.pipeLengthAMmAuto;
                                onUpdateEntry(entry.id, {
                                  specs: { ...entry.specs, pipeLengthAMm: newValue, pipeLengthAOverride: isOverride }
                                });
                              }}
                              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 ${
                                isEqualTee
                                  ? 'bg-green-100 border-green-400 text-green-900 cursor-not-allowed font-medium'
                                  : 'border-gray-300 focus:ring-green-500 text-gray-900'
                              }`}
                              placeholder="e.g., 1000"
                              min="0"
                              readOnly={isEqualTee}
                            />
                            {isEqualTee && entry.specs?.pipeLengthAMm && (
                              <p className="mt-0.5 text-xs text-green-700">Standard C/F dimension from tables</p>
                            )}
                          </div>

                          {/* Pipe Length B */}
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-xs font-semibold text-gray-900">
                                Pipe Length B (mm) *
                                {isEqualTee && <span className="text-gray-500 text-xs ml-1 font-normal">(Standard C/F)</span>}
                                {!isEqualTee && isAutoB && <span className="text-green-600 text-xs ml-1 font-normal">(Auto)</span>}
                                {!isEqualTee && entry.specs?.pipeLengthBOverride && <span className="text-blue-600 text-xs ml-1 font-normal">(Override)</span>}
                              </label>
                              {!isEqualTee && entry.specs?.pipeLengthBOverride && entry.specs?.pipeLengthBMmAuto && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateEntry(entry.id, {
                                    specs: { ...entry.specs, pipeLengthBMm: entry.specs?.pipeLengthBMmAuto, pipeLengthBOverride: false }
                                  })}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                            <input
                              type="number"
                              value={entry.specs?.pipeLengthBMm || ''}
                              onChange={(e) => {
                                if (isEqualTee) return; // Don't allow changes for equal tees
                                const newValue = Number(e.target.value);
                                const isOverride = entry.specs?.pipeLengthBMmAuto && newValue !== entry.specs?.pipeLengthBMmAuto;
                                onUpdateEntry(entry.id, {
                                  specs: { ...entry.specs, pipeLengthBMm: newValue, pipeLengthBOverride: isOverride }
                                });
                              }}
                              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 ${
                                isEqualTee
                                  ? 'bg-green-100 border-green-400 text-green-900 cursor-not-allowed font-medium'
                                  : 'border-gray-300 focus:ring-green-500 text-gray-900'
                              }`}
                              placeholder="e.g., 1000"
                              min="0"
                              readOnly={isEqualTee}
                            />
                            {isEqualTee && entry.specs?.pipeLengthBMm && (
                              <p className="mt-0.5 text-xs text-green-700">Standard C/F dimension from tables</p>
                            )}
                          </div>
                        </>
                      );
                    })()}

                    {/* Angle Range (for Laterals and Y-Pieces) */}
                    {(entry.specs?.fittingType === 'LATERAL' || entry.specs?.fittingType === 'Y_PIECE') && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          Angle Range *
                        </label>
                        <select
                          value={entry.specs?.angleRange || ''}
                          onChange={async (e) => {
                            const angleRange = e.target.value;
                            const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                            const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');

                            // Fetch fitting dimensions for pipe lengths with new angle
                            let pipeLengthA = entry.specs?.pipeLengthAMm;
                            let pipeLengthB = entry.specs?.pipeLengthBMm;
                            let pipeLengthAMmAuto = entry.specs?.pipeLengthAMmAuto;
                            let pipeLengthBMmAuto = entry.specs?.pipeLengthBMmAuto;

                            if (entry.specs?.fittingType && entry.specs?.nominalDiameterMm && angleRange) {
                              try {
                                const dims = await masterDataApi.getFittingDimensions(
                                  effectiveStandard as 'SABS62' | 'SABS719',
                                  entry.specs.fittingType,
                                  entry.specs.nominalDiameterMm,
                                  angleRange
                                );
                                if (dims) {
                                  // Parse string values to numbers (API returns decimal strings)
                                  const dimA = dims.dimensionAMm ? Number(dims.dimensionAMm) : null;
                                  const dimB = dims.dimensionBMm ? Number(dims.dimensionBMm) : null;
                                  if (dimA && !entry.specs?.pipeLengthAOverride) {
                                    pipeLengthA = dimA;
                                    pipeLengthAMmAuto = dimA;
                                  }
                                  if (dimB && !entry.specs?.pipeLengthBOverride) {
                                    pipeLengthB = dimB;
                                    pipeLengthBMmAuto = dimB;
                                  }
                                }
                              } catch (err) {
                                console.log('Could not fetch fitting dimensions:', err);
                              }
                            }

                            onUpdateEntry(entry.id, {
                              specs: {
                                ...entry.specs,
                                angleRange,
                                pipeLengthAMm: pipeLengthA,
                                pipeLengthBMm: pipeLengthB,
                                pipeLengthAMmAuto,
                                pipeLengthBMmAuto
                              }
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        >
                          <option value="">Select angle range...</option>
                          <option value="60-90">60° - 90°</option>
                          <option value="45-59">45° - 59°</option>
                          <option value="30-44">30° - 44°</option>
                        </select>
                      </div>
                    )}

                    {/* Degrees (for Laterals) */}
                    {entry.specs?.fittingType === 'LATERAL' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          Degrees *
                        </label>
                        <input
                          type="number"
                          value={entry.specs?.degrees || ''}
                          onChange={(e) => {
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, degrees: Number(e.target.value) }
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                          placeholder="e.g., 45, 60, 90"
                          min="30"
                          max="90"
                        />
                      </div>
                    )}

                    {/* Quantity */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={entry.specs?.quantityValue || 1}
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, quantityValue: Number(e.target.value) }
                          });
                          // Auto-calculate fitting
                          setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        min="1"
                      />
                    </div>
                  </div>

                  {/* Column 2 - Configuration & Ends */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5">
                      📐 Configuration
                    </h4>

                    {/* Schedule - Required for SABS719 fabricated fittings */}
                    {(() => {
                      const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                      const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');
                      return effectiveStandard === 'SABS719';
                    })() && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          Schedule *
                          {globalSpecs?.workingPressureBar ? (
                            <span className="text-green-600 text-xs ml-2">(Automated)</span>
                          ) : (
                            <span className="text-orange-600 text-xs ml-2">(Manual)</span>
                          )}
                        </label>
                        {globalSpecs?.workingPressureBar && entry.specs?.nominalDiameterMm ? (
                          <div className="bg-green-50 p-2 rounded-md">
                            <p className="text-green-800 font-medium text-xs mb-2">
                              Auto-calculated for {globalSpecs.workingPressureBar} bar @ {entry.specs.nominalDiameterMm}NB
                            </p>
                            <select
                              value={entry.specs?.scheduleNumber || ''}
                              onChange={(e) => {
                                const schedule = e.target.value;
                                const effectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                                const availableSchedules = getScheduleListForSpec(entry.specs?.nominalDiameterMm || 0, effectiveSpecId);
                                const selectedDim = availableSchedules.find((dim: any) =>
                                  (dim.scheduleDesignation || dim.scheduleNumber?.toString()) === schedule
                                );
                                onUpdateEntry(entry.id, {
                                  specs: {
                                    ...entry.specs,
                                    scheduleNumber: schedule,
                                    wallThicknessMm: selectedDim?.wallThicknessMm || entry.specs?.wallThicknessMm
                                  }
                                });
                                // Auto-calculate fitting
                                setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);
                              }}
                              className="w-full px-2 py-1.5 text-black border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                            >
                              <option value="">Select schedule...</option>
                              {(() => {
                                const nbValue = entry.specs?.nominalDiameterMm || 0;
                                const fitEffectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                                const allSchedules = getScheduleListForSpec(nbValue, fitEffectiveSpecId);
                                const minWT = getMinimumWallThickness(nbValue, globalSpecs?.workingPressureBar || 0);
                                const eligibleSchedules = allSchedules
                                  .filter((dim: any) => (dim.wallThicknessMm || 0) >= minWT)
                                  .sort((a: any, b: any) => (a.wallThicknessMm || 0) - (b.wallThicknessMm || 0));

                                return eligibleSchedules.map((dim: any, idx: number) => {
                                  const scheduleValue = dim.scheduleDesignation || dim.scheduleNumber?.toString() || 'Unknown';
                                  const wt = dim.wallThicknessMm || 0;
                                  const isRecommended = idx === 0;
                                  const label = isRecommended
                                    ? `★ ${scheduleValue} (${wt}mm) - RECOMMENDED`
                                    : `${scheduleValue} (${wt}mm)`;
                                  return (
                                    <option key={dim.id || scheduleValue} value={scheduleValue}>
                                      {label}
                                    </option>
                                  );
                                });
                              })()}
                            </select>
                          </div>
                        ) : (
                          <select
                            value={entry.specs?.scheduleNumber || ''}
                            onChange={(e) => {
                              const scheduleNumber = e.target.value;
                              // Get wall thickness from schedule
                              const nbValue = entry.specs?.nominalDiameterMm || 0;
                              const fitEffectiveSpecId2 = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                              const schedules = getScheduleListForSpec(nbValue, fitEffectiveSpecId2);
                              const matchingSchedule = schedules.find((s: any) =>
                                (s.scheduleDesignation || s.scheduleNumber?.toString()) === scheduleNumber
                              );
                              const wallThickness = matchingSchedule?.wallThicknessMm;

                              const updatedEntry = {
                                ...entry,
                                specs: {
                                  ...entry.specs,
                                  scheduleNumber,
                                  wallThicknessMm: wallThickness
                                }
                              };
                              // Regenerate description
                              updatedEntry.description = generateItemDescription(updatedEntry);
                              onUpdateEntry(entry.id, updatedEntry);
                              // Auto-calculate fitting
                              setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                          >
                            <option value="">Select Schedule</option>
                            {(() => {
                              const nbValue = entry.specs?.nominalDiameterMm || 0;
                              const fitEffectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                                const allSchedules = getScheduleListForSpec(nbValue, fitEffectiveSpecId);
                              if (allSchedules.length > 0) {
                                return allSchedules.map((dim: any) => {
                                  const scheduleValue = dim.scheduleDesignation || dim.scheduleNumber?.toString();
                                  return (
                                    <option key={dim.id || scheduleValue} value={scheduleValue}>
                                      {scheduleValue} ({dim.wallThicknessMm}mm)
                                    </option>
                                  );
                                });
                              }
                              return (
                                <>
                                  <option value="10">Sch 10</option>
                                  <option value="40">Sch 40</option>
                                  <option value="80">Sch 80</option>
                                  <option value="160">Sch 160</option>
                                </>
                              );
                            })()}
                          </select>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Required for fabricated SABS719 fittings
                        </p>
                      </div>
                    )}

                    {/* Stub/Lateral Location - Only for Unequal and Reducing Tees */}
                    {!['SHORT_TEE', 'GUSSET_TEE', 'EQUAL_TEE'].includes(entry.specs?.fittingType || '') && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          Location of Stub/Lateral (mm from left flange)
                        </label>
                        <input
                          type="text"
                          value={entry.specs?.stubLocation || ''}
                          onChange={(e) => {
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, stubLocation: e.target.value }
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                          placeholder="e.g., 500"
                        />
                        <p className="mt-0.5 text-xs text-gray-500">
                          Distance from left flange to center of tee outlet
                        </p>
                      </div>
                    )}

                    {/* Fitting End Configuration */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Fitting End Configuration *
                      </label>
                      <select
                        value={entry.specs?.pipeEndConfiguration || 'PE'}
                        onChange={async (e) => {
                          const newConfig = e.target.value as any;

                          // Get weld details for this configuration
                          let weldDetails = null;
                          try {
                            weldDetails = await getPipeEndConfigurationDetails(newConfig);
                          } catch (error) {
                            console.warn('Could not get pipe end configuration details:', error);
                          }

                          const updatedEntry: any = {
                            specs: { ...entry.specs, pipeEndConfiguration: newConfig },
                            // Store weld count information if available
                            ...(weldDetails && { weldInfo: weldDetails })
                          };

                          // Auto-update description
                          updatedEntry.description = generateItemDescription({ ...entry, ...updatedEntry });

                          onUpdateEntry(entry.id, updatedEntry);
                          // Auto-calculate fitting
                          setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        required
                      >
                        {FITTING_END_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <p className="mt-0.5 text-xs text-gray-700">
                        Select how the fitting ends should be configured
                        {entry.specs?.pipeEndConfiguration && (
                          <span className="ml-2 text-blue-600 font-medium">
                            • {getWeldCountPerFitting(entry.specs.pipeEndConfiguration)} weld{getWeldCountPerFitting(entry.specs.pipeEndConfiguration) !== 1 ? 's' : ''} per fitting
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Closure Length Field - Only shown when L/F configuration is selected */}
                    {hasLooseFlange(entry.specs?.pipeEndConfiguration || '') && (
                      <div className="mt-3">
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          Closure Length (mm) *
                          <span className="text-blue-600 text-xs ml-2">(Site weld extension past L/F)</span>
                        </label>
                        <input
                          type="number"
                          value={entry.specs?.closureLengthMm || ''}
                          onChange={(e) => {
                            const closureLength = e.target.value ? Number(e.target.value) : undefined;
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, closureLengthMm: closureLength }
                            });
                          }}
                          placeholder="e.g., 150"
                          min={50}
                          max={500}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        />
                        <p className="mt-0.5 text-xs text-gray-500">
                          Additional pipe length extending past the loose flange for site weld connection (typically 100-200mm)
                        </p>
                        {/* Tack Weld Information */}
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                          <p className="text-xs font-bold text-amber-800">
                            Loose Flange Tack Welds Required:
                          </p>
                          <ul className="text-xs text-amber-700 mt-1 list-disc list-inside">
                            <li>8 tack welds total (~20mm each)</li>
                            <li>4 tack welds on each side of loose flange</li>
                          </ul>
                          <p className="text-xs text-amber-600 mt-1 italic">
                            Tack weld charge applies per L/F end
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Blank Flange Option for Fittings - with position selection */}
                    {(() => {
                      const fittingEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
                      const fittingFlangeConfig = getFittingFlangeConfig(fittingEndConfig);
                      // Get available flange positions (any type of flange can have a blank)
                      const availablePositions: { key: string; label: string; hasFlange: boolean }[] = [
                        { key: 'inlet', label: 'Inlet (Left)', hasFlange: fittingFlangeConfig.hasInlet },
                        { key: 'outlet', label: 'Outlet (Right)', hasFlange: fittingFlangeConfig.hasOutlet },
                        { key: 'branch', label: 'Branch (Top)', hasFlange: fittingFlangeConfig.hasBranch },
                      ].filter(p => p.hasFlange);

                      if (availablePositions.length === 0) return null;

                      const currentPositions = entry.specs?.blankFlangePositions || [];

                      return (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2 mt-2">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-green-800">Add Blank Flange(s)</span>
                            <span className="text-xs text-green-600">({availablePositions.length} positions available)</span>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {availablePositions.map(pos => (
                              <label key={pos.key} className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={currentPositions.includes(pos.key)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    let newPositions: string[];
                                    if (checked) {
                                      newPositions = [...currentPositions, pos.key];
                                    } else {
                                      newPositions = currentPositions.filter((p: string) => p !== pos.key);
                                    }
                                    onUpdateEntry(entry.id, {
                                      specs: {
                                        ...entry.specs,
                                        addBlankFlange: newPositions.length > 0,
                                        blankFlangeCount: newPositions.length,
                                        blankFlangePositions: newPositions
                                      }
                                    });
                                  }}
                                  className="w-3.5 h-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <span className="text-xs text-green-700">{pos.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Flange Specifications - Uses Global Specs with Override Option */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-3">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="text-xs font-bold text-orange-900">
                          Flanges
                          {entry.hasFlangeOverride ? (
                            <span className="text-blue-600 text-xs ml-1 font-normal">(Override)</span>
                          ) : globalSpecs?.flangeStandardId ? (
                            <span className="text-green-600 text-xs ml-1 font-normal">(Global)</span>
                          ) : (
                            <span className="text-orange-600 text-xs ml-1 font-normal">(Not Set)</span>
                          )}
                        </h5>
                        {globalSpecs?.flangeStandardId && (
                          <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={entry.hasFlangeOverride || false}
                              onChange={(e) => {
                                const override = e.target.checked;
                                onUpdateEntry(entry.id, {
                                  hasFlangeOverride: override,
                                  flangeOverrideConfirmed: false,
                                  specs: override ? {
                                    ...entry.specs,
                                    flangeStandardId: entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId,
                                    flangePressureClassId: entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId
                                  } : {
                                    ...entry.specs,
                                    flangeStandardId: undefined,
                                    flangePressureClassId: undefined
                                  }
                                });
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-medium text-xs">Override</span>
                          </label>
                        )}
                      </div>

                      {globalSpecs?.flangeStandardId && !entry.hasFlangeOverride ? (
                        <div className="bg-green-50 p-2 rounded-md">
                          <p className="text-green-800 text-xs font-semibold">
                            {(() => {
                              const pressureClass = masterData.pressureClasses?.find(
                                (pc: any) => pc.id === globalSpecs.flangePressureClassId
                              );
                              const flangeStandard = masterData.flangeStandards?.find(
                                (fs: any) => fs.id === globalSpecs.flangeStandardId
                              );
                              if (pressureClass && flangeStandard) {
                                return `${flangeStandard.code} / ${pressureClass.designation}`;
                              }
                              return 'Using global specs';
                            })()}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId || ''}
                              onChange={async (e) => {
                                const standardId = parseInt(e.target.value) || undefined;
                                onUpdateEntry(entry.id, {
                                  specs: { ...entry.specs, flangeStandardId: standardId, flangePressureClassId: undefined }
                                });
                                if (standardId) {
                                  getFilteredPressureClasses(standardId);
                                }
                              }}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900"
                            >
                              <option value="">Standard...</option>
                              {masterData.flangeStandards?.map((standard: any) => (
                                <option key={standard.id} value={standard.id}>
                                  {standard.code}
                                </option>
                              ))}
                            </select>
                            <select
                              value={entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId || ''}
                              onChange={(e) => onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  flangePressureClassId: parseInt(e.target.value) || undefined
                                }
                              })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900"
                            >
                              <option value="">Class...</option>
                              {(() => {
                                const stdId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                                const filtered = stdId ? (pressureClassesByStandard[stdId] || []) : masterData.pressureClasses || [];
                                return filtered.map((pressureClass: any) => (
                                  <option key={pressureClass.id} value={pressureClass.id}>
                                    {pressureClass.designation}
                                  </option>
                                ));
                              })()}
                            </select>
                          </div>
                          {entry.hasFlangeOverride && entry.specs?.flangeStandardId && entry.specs?.flangePressureClassId && (
                            <button
                              type="button"
                              onClick={() => onUpdateEntry(entry.id, { flangeOverrideConfirmed: true })}
                              className="w-full px-2 py-1 text-xs font-semibold text-white bg-green-600 rounded hover:bg-green-700"
                            >
                              ✓ Confirm
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>


                {/* Operating Conditions - Hidden: Uses global specs for working pressure/temp */}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    value={entry.notes || ''}
                    onChange={(e) => onUpdateEntry(entry.id, { notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                    rows={2}
                    placeholder="Any special requirements or notes..."
                  />
                </div>
                  </>
                }
                previewContent={
                  <>
                    {(() => {
                      const fittingType = entry.specs?.fittingType || '';
                      const isTeeType = ['SHORT_TEE', 'GUSSET_TEE', 'UNEQUAL_SHORT_TEE', 'UNEQUAL_GUSSET_TEE', 'SHORT_REDUCING_TEE', 'GUSSET_REDUCING_TEE', 'EQUAL_TEE', 'UNEQUAL_TEE', 'SWEEP_TEE', 'GUSSETTED_TEE'].includes(fittingType);

                      if (!isTeeType) return null;

                      const teeType = ['GUSSET_TEE', 'UNEQUAL_GUSSET_TEE', 'GUSSET_REDUCING_TEE', 'GUSSETTED_TEE'].includes(fittingType)
                        ? 'gusset' as const
                        : 'short' as const;

                      const nominalBore = entry.specs?.nominalDiameterMm || 500;
                      const branchNominalBore = entry.specs?.branchNominalDiameterMm;
                      const wallThickness = entry.specs?.wallThicknessMm || entry.calculation?.wallThicknessMm || 8;
                      const outerDiameter = entry.calculation?.outsideDiameterMm;

                      const steelSpec = masterData.steelSpecs?.find((s: any) =>
                        s.id === (entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId)
                      );

                      return (
                        <Tee3DPreview
                          nominalBore={nominalBore}
                          branchNominalBore={branchNominalBore}
                          outerDiameter={outerDiameter}
                          wallThickness={wallThickness}
                          teeType={teeType}
                          runLength={entry.specs?.pipeLengthAMm}
                          branchPositionMm={(() => {
                            const loc = entry.specs?.stubLocation;
                            if (!loc) return undefined;
                            const match = loc.match(/(\d+)/);
                            return match ? Number(match[1]) : undefined;
                          })()}
                          materialName={steelSpec?.steelSpecName}
                          hasInletFlange={getFittingFlangeConfig(entry.specs?.pipeEndConfiguration || '').hasInlet}
                          hasOutletFlange={getFittingFlangeConfig(entry.specs?.pipeEndConfiguration || '').hasOutlet}
                          hasBranchFlange={getFittingFlangeConfig(entry.specs?.pipeEndConfiguration || '').hasBranch}
                          inletFlangeType={getFittingFlangeConfig(entry.specs?.pipeEndConfiguration || '').inletType}
                          outletFlangeType={getFittingFlangeConfig(entry.specs?.pipeEndConfiguration || '').outletType}
                          branchFlangeType={getFittingFlangeConfig(entry.specs?.pipeEndConfiguration || '').branchType}
                          closureLengthMm={entry.specs?.closureLengthMm || 150}
                          addBlankFlange={entry.specs?.addBlankFlange}
                          blankFlangeCount={entry.specs?.blankFlangeCount}
                          blankFlangePositions={entry.specs?.blankFlangePositions}
                        />
                      );
                    })()}
                  </>
                }
              />

                {/* Calculate button removed - calculation happens automatically on spec changes */}

                {/* Calculation Results - Compact Layout matching Bend style */}
                {entry.calculation && (
                  <div className="mt-4">
                    <h4 className="text-sm font-bold text-gray-900 border-b-2 border-green-500 pb-1.5 mb-3">
                      📊 Calculation Results
                    </h4>
                    <div className="bg-green-50 border border-green-200 p-3 rounded-md">
                      {(() => {
                        // Get fitting configuration values
                        const fittingType = entry.specs?.fittingType || 'Tee';
                        const nominalBore = entry.specs?.nominalDiameterMm || entry.specs?.nominalBoreMm || 0;
                        const branchNB = entry.specs?.branchNominalDiameterMm || entry.specs?.branchNominalBoreMm || nominalBore;
                        const pipeALength = entry.specs?.pipeLengthAMm || 0;
                        const pipeBLength = entry.specs?.pipeLengthBMm || 0;
                        const teeHeight = entry.specs?.teeHeightMm || 0;
                        const quantity = entry.specs?.quantityValue || 1;

                        // Get flange configuration
                        const flangeConfig = getFittingFlangeConfig(entry.specs?.pipeEndConfiguration || 'PE');
                        const numFlanges = (flangeConfig.hasInlet ? 1 : 0) + (flangeConfig.hasOutlet ? 1 : 0) + (flangeConfig.hasBranch ? 1 : 0);

                        // Calculate flange weights
                        const pressureClass = masterData.pressureClasses?.find((p: any) => p.id === (entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId))?.designation;
                        const inletFlangeWeight = flangeConfig.hasInlet ? getFlangeWeight(nominalBore, pressureClass) : 0;
                        const outletFlangeWeight = flangeConfig.hasOutlet ? getFlangeWeight(nominalBore, pressureClass) : 0;
                        const branchFlangeWeight = flangeConfig.hasBranch ? getFlangeWeight(branchNB, pressureClass) : 0;
                        const totalFlangeWeight = inletFlangeWeight + outletFlangeWeight + branchFlangeWeight;

                        // Weld thickness lookup
                        const schedule = entry.specs?.scheduleNumber || '';
                        const pipeWallThickness = entry.calculation?.wallThicknessMm;

                        // Check for SABS 719 - use item-level steel spec with global fallback
                        const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                        const isSABS719 = steelSpecId === 8;

                        const scheduleUpper = schedule.toUpperCase();
                        const fittingClass = scheduleUpper.includes('160') || scheduleUpper.includes('XXS') ? 'XXH' : scheduleUpper.includes('80') || scheduleUpper.includes('XS') ? 'XH' : 'STD';

                        // SABS 719 ERW Pipe Wall Thickness Table (Class B - Standard)
                        const SABS_719_WT: Record<number, number> = {
                          200: 5.2, 250: 5.2, 300: 6.4, 350: 6.4, 400: 6.4, 450: 6.4, 500: 6.4,
                          550: 6.4, 600: 6.4, 650: 8.0, 700: 8.0, 750: 8.0, 800: 8.0, 850: 9.5,
                          900: 9.5, 1000: 9.5, 1050: 9.5, 1200: 12.7
                        };

                        // ASTM/ASME Carbon Steel Weld Fittings wall thickness (WPB Grade)
                        const FITTING_WT: Record<string, Record<number, number>> = {
                          'STD': { 50: 3.91, 65: 5.16, 80: 5.49, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53, 350: 9.53, 400: 9.53, 450: 9.53, 500: 9.53, 600: 9.53 },
                          'XH': { 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.70, 250: 12.70, 300: 12.70, 350: 12.70, 400: 12.70, 450: 12.70, 500: 12.70, 600: 12.70 },
                          'XXH': { 50: 11.07, 65: 14.02, 80: 15.24, 100: 17.12, 125: 19.05, 150: 22.23, 200: 22.23, 250: 25.40, 300: 25.40, 350: 25.40, 400: 25.40, 450: 25.40, 500: 25.40, 600: 25.40 }
                        };

                        // Get SABS 719 wall thickness with closest size lookup
                        const getSabs719Wt = (nb: number): number => {
                          const sizes = Object.keys(SABS_719_WT).map(Number).sort((a, b) => a - b);
                          let closest = sizes[0];
                          for (const size of sizes) {
                            if (size <= nb) closest = size;
                            else break;
                          }
                          return SABS_719_WT[closest] || 6.4;
                        };

                        // For SABS 719: use SABS 719 WT table; for ASTM/ASME: use fitting lookup
                        const fittingWeldThickness = isSABS719
                          ? getSabs719Wt(nominalBore)
                          : (FITTING_WT[fittingClass]?.[nominalBore] || pipeWallThickness || 6);
                        const branchWeldThickness = isSABS719
                          ? getSabs719Wt(branchNB)
                          : (FITTING_WT[fittingClass]?.[branchNB] || fittingWeldThickness);

                        // Weld count calculation
                        const weldConfig = getWeldCountPerFitting(entry.specs?.pipeEndConfiguration || 'PE');
                        const teeWeldCount = 1; // Always 1 tee junction weld

                        return (
                          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
                            {/* Qty & Dimensions Combined */}
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-600 font-medium">Qty & Dimensions</p>
                              <p className="text-lg font-bold text-gray-900">{quantity} × {fittingType}</p>
                              <div className="mt-1 space-y-0.5 text-left">
                                <p className="text-[10px] text-gray-700">Main: {nominalBore}NB</p>
                                {branchNB !== nominalBore && (
                                  <p className="text-[10px] text-gray-700">Branch: {branchNB}NB</p>
                                )}
                                {pipeALength > 0 && (
                                  <p className="text-[10px] text-gray-700">Pipe A: {pipeALength}mm</p>
                                )}
                                {pipeBLength > 0 && (
                                  <p className="text-[10px] text-gray-700">Pipe B: {pipeBLength}mm</p>
                                )}
                                {teeHeight > 0 && (
                                  <p className="text-[10px] text-gray-700">Height: {teeHeight}mm</p>
                                )}
                              </div>
                            </div>

                            {/* Total Weight - Use API value directly */}
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-600 font-medium">Total Weight</p>
                              <p className="text-lg font-bold text-green-900">
                                {(entry.calculation.totalWeight || ((entry.calculation.fittingWeight || 0) + (entry.calculation.pipeWeight || 0) + (entry.calculation.flangeWeight || 0) + (entry.calculation.boltWeight || 0) + (entry.calculation.nutWeight || 0))).toFixed(1)} kg
                              </p>
                              <p className="text-[10px] text-gray-500">per fitting</p>
                            </div>

                            {/* Weight Breakdown - Use API values directly */}
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-600 font-medium">Weight Breakdown</p>
                              <div className="text-left mt-1 space-y-0.5">
                                {(entry.calculation.fittingWeight || 0) > 0 && (
                                  <p className="text-[10px] text-gray-700">Fitting Body: {entry.calculation.fittingWeight.toFixed(1)}kg</p>
                                )}
                                {(entry.calculation.pipeWeight || 0) > 0 && (
                                  <p className="text-[10px] text-gray-700">Pipe Sections: {entry.calculation.pipeWeight.toFixed(1)}kg</p>
                                )}
                                {(entry.calculation.flangeWeight || 0) > 0 && (
                                  <p className="text-[10px] text-gray-700">Flanges: {entry.calculation.flangeWeight.toFixed(1)}kg</p>
                                )}
                                {(entry.calculation.boltWeight || 0) > 0 && (
                                  <p className="text-[10px] text-gray-700">Bolts: {entry.calculation.boltWeight.toFixed(1)}kg</p>
                                )}
                                {(entry.calculation.nutWeight || 0) > 0 && (
                                  <p className="text-[10px] text-gray-700">Nuts: {entry.calculation.nutWeight.toFixed(1)}kg</p>
                                )}
                              </div>
                            </div>

                            {/* Total Flanges - Use API value */}
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-600 font-medium">Total Flanges</p>
                              <p className="text-lg font-bold text-gray-900">{entry.calculation.numberOfFlanges || numFlanges}</p>
                              <div className="text-left mt-1 space-y-0.5">
                                {flangeConfig.hasInlet && (
                                  <p className="text-[10px] text-gray-700">1 x {nominalBore}NB {flangeConfig.inletType === 'loose' ? 'L/F' : flangeConfig.inletType === 'rotating' ? 'R/F' : 'Flange'}</p>
                                )}
                                {flangeConfig.hasOutlet && (
                                  <p className="text-[10px] text-gray-700">1 x {nominalBore}NB {flangeConfig.outletType === 'loose' ? 'L/F' : flangeConfig.outletType === 'rotating' ? 'R/F' : 'Flange'}</p>
                                )}
                                {flangeConfig.hasBranch && (
                                  <p className="text-[10px] text-green-700">1 x {branchNB}NB {flangeConfig.branchType === 'loose' ? 'L/F' : flangeConfig.branchType === 'rotating' ? 'R/F' : 'Flange'}</p>
                                )}
                              </div>
                            </div>

                            {/* Weld Summary - Consolidated display */}
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-600 font-medium">Weld Summary</p>
                              {(() => {
                                // Calculate tee junction weld (always 1 for tees)
                                const teeOd = entry.calculation?.outsideDiameterMm || nominalBore * 1.1;
                                const teeWeldLengthM = (Math.PI * teeOd / 1000); // Circumference in meters

                                // Count fixed flanges (not loose) for weld calculations
                                const mainFixedFlanges = (flangeConfig.hasInlet && flangeConfig.inletType !== 'loose' ? 1 : 0)
                                                       + (flangeConfig.hasOutlet && flangeConfig.outletType !== 'loose' ? 1 : 0);
                                const branchFixedFlanges = flangeConfig.hasBranch && flangeConfig.branchType !== 'loose' ? 1 : 0;
                                const totalFixedFlanges = mainFixedFlanges + branchFixedFlanges;

                                // Flange weld calculations (x2 for inside + outside welds)
                                const mainFlangeOd = entry.calculation?.outsideDiameterMm || nominalBore * 1.1;
                                const branchFlangeOd = branchNB * 1.1; // Approximate branch OD
                                const mainFlangeWeldLengthPerFlange = Math.PI * mainFlangeOd / 1000; // Circumference in m
                                const branchFlangeWeldLengthPerFlange = Math.PI * branchFlangeOd / 1000;

                                // Total flange weld length = (count x circumference x 2) for inside + outside
                                const totalMainFlangeWeldLength = mainFixedFlanges * mainFlangeWeldLengthPerFlange * 2;
                                const totalBranchFlangeWeldLength = branchFixedFlanges * branchFlangeWeldLengthPerFlange * 2;
                                const totalFlangeWeldLength = totalMainFlangeWeldLength + totalBranchFlangeWeldLength;
                                const totalFlangeWeldCount = totalFixedFlanges * 2; // x2 for inside + outside

                                // Count loose flanges
                                const looseFlangeCount = (flangeConfig.hasInlet && flangeConfig.inletType === 'loose' ? 1 : 0)
                                                       + (flangeConfig.hasOutlet && flangeConfig.outletType === 'loose' ? 1 : 0)
                                                       + (flangeConfig.hasBranch && flangeConfig.branchType === 'loose' ? 1 : 0);

                                return (
                                  <div className="text-left mt-1 space-y-0.5">
                                    {/* Tee Junction Weld */}
                                    <p className="text-[10px] text-blue-700 font-medium">
                                      Tee Junction: 1 weld @ {branchWeldThickness?.toFixed(1)}mm ({teeWeldLengthM.toFixed(2)}m)
                                    </p>

                                    {/* Combined Flange Welds (inside + outside) */}
                                    {totalFixedFlanges > 0 && (
                                      <p className="text-[10px] text-green-700 font-medium">
                                        Flange Welds: {totalFlangeWeldCount} @ {fittingWeldThickness?.toFixed(1)}mm ({totalFlangeWeldLength.toFixed(2)}m)
                                      </p>
                                    )}
                                    {totalFixedFlanges > 0 && (
                                      <p className="text-[9px] text-gray-500 pl-2">
                                        ({totalFixedFlanges} flange{totalFixedFlanges > 1 ? 's' : ''} × 2 welds for inside+outside)
                                      </p>
                                    )}

                                    {/* Loose flanges - tack welds only */}
                                    {looseFlangeCount > 0 && (
                                      <p className="text-[10px] text-purple-700">
                                        Loose Flanges: {looseFlangeCount} × 8 tack welds
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            

                            {/* External m² - Separate box */}
                            {requiredProducts?.includes('surface_protection') && globalSpecs?.externalCoatingConfirmed && (() => {
                              const odMm = entry.calculation?.outsideDiameterMm || nominalBore * 1.1;
                              const wtMm = entry.calculation?.wallThicknessMm || 6;
                              const odM = odMm / 1000;

                              // Count open ends and add 100mm allowance per end
                              const FLANGE_ALLOWANCE_MM = 100;
                              let mainEndCount = 0;
                              let branchEndCount = 0;
                              if (flangeConfig.hasInlet) mainEndCount++;
                              if (flangeConfig.hasOutlet) mainEndCount++;
                              if (flangeConfig.hasBranch) branchEndCount++;

                              // Calculate external surface areas
                              let pipeRunExtArea = 0;
                              let branchExtArea = 0;

                              const mainEndAllowance = (mainEndCount * FLANGE_ALLOWANCE_MM) / 1000;
                              const runLength = ((pipeALength + pipeBLength) / 1000) + mainEndAllowance;
                              if (runLength > 0) {
                                pipeRunExtArea = odM * Math.PI * runLength;
                              }

                              if (teeHeight > 0) {
                                const branchOdMm = branchNB * 1.1;
                                const branchEndAllowance = (branchEndCount * FLANGE_ALLOWANCE_MM) / 1000;
                                const branchLength = (teeHeight / 1000) + branchEndAllowance;
                                branchExtArea = (branchOdMm / 1000) * Math.PI * branchLength;
                              }

                              const itemExtArea = pipeRunExtArea + branchExtArea;
                              const totalExtArea = itemExtArea * quantity;

                              const branchOdMm = branchNB * 1.1;
                              const branchEndAllowanceCalc = (branchEndCount * FLANGE_ALLOWANCE_MM) / 1000;
                              const branchLengthCalc = (teeHeight / 1000) + branchEndAllowanceCalc;

                              return (
                                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded text-center border border-indigo-200 dark:border-indigo-700">
                                  <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">🛡️ External m²</p>
                                  <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">{totalExtArea.toFixed(3)} m²</p>
                                  <div className="text-left mt-1 space-y-0.5">
                                    {runLength > 0 && (
                                      <p className="text-[9px] text-indigo-700 dark:text-indigo-300">
                                        Run: {pipeRunExtArea.toFixed(4)} m² <span className="text-indigo-500 dark:text-indigo-400">(OD {odMm.toFixed(1)}mm × π × {runLength.toFixed(3)}m)</span>
                                      </p>
                                    )}
                                    {mainEndCount > 0 && (
                                      <p className="text-[8px] text-indigo-500 dark:text-indigo-400 pl-2">
                                        Length: {((pipeALength + pipeBLength) / 1000).toFixed(3)}m + {mainEndCount}×0.1m allowance
                                      </p>
                                    )}
                                    {teeHeight > 0 && (
                                      <p className="text-[9px] text-indigo-700 dark:text-indigo-300">
                                        Branch: {branchExtArea.toFixed(4)} m² <span className="text-indigo-500 dark:text-indigo-400">(OD {branchOdMm.toFixed(1)}mm × π × {branchLengthCalc.toFixed(3)}m)</span>
                                      </p>
                                    )}
                                    {teeHeight > 0 && branchEndCount > 0 && (
                                      <p className="text-[8px] text-indigo-500 dark:text-indigo-400 pl-2">
                                        Length: {(teeHeight / 1000).toFixed(3)}m + {branchEndCount}×0.1m allowance
                                      </p>
                                    )}
                                    <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-medium pt-0.5 border-t border-indigo-200 dark:border-indigo-600 mt-1">
                                      Per item: {itemExtArea.toFixed(4)} m² × {quantity} = {totalExtArea.toFixed(3)} m²
                                    </p>
                                    {globalSpecs?.coatingType && (
                                      <p className="text-[9px] text-indigo-500 dark:text-indigo-400 italic">{globalSpecs.coatingType}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Internal m² - Separate box */}
                            {requiredProducts?.includes('surface_protection') && globalSpecs?.internalLiningConfirmed && (() => {
                              const odMm = entry.calculation?.outsideDiameterMm || nominalBore * 1.1;
                              const wtMm = entry.calculation?.wallThicknessMm || 6;
                              const idMm = odMm - (2 * wtMm);
                              const idM = idMm / 1000;

                              // Count open ends and add 100mm allowance per end
                              const FLANGE_ALLOWANCE_MM = 100;
                              let mainEndCount = 0;
                              let branchEndCount = 0;
                              if (flangeConfig.hasInlet) mainEndCount++;
                              if (flangeConfig.hasOutlet) mainEndCount++;
                              if (flangeConfig.hasBranch) branchEndCount++;

                              // Calculate internal surface areas
                              let pipeRunIntArea = 0;
                              let branchIntArea = 0;

                              const mainEndAllowance = (mainEndCount * FLANGE_ALLOWANCE_MM) / 1000;
                              const runLength = ((pipeALength + pipeBLength) / 1000) + mainEndAllowance;
                              if (runLength > 0) {
                                pipeRunIntArea = idM * Math.PI * runLength;
                              }

                              if (teeHeight > 0) {
                                const branchIdMm = (branchNB * 1.1) - (2 * wtMm);
                                const branchEndAllowance = (branchEndCount * FLANGE_ALLOWANCE_MM) / 1000;
                                const branchLength = (teeHeight / 1000) + branchEndAllowance;
                                branchIntArea = (branchIdMm / 1000) * Math.PI * branchLength;
                              }

                              const itemIntArea = pipeRunIntArea + branchIntArea;
                              const totalIntArea = itemIntArea * quantity;

                              const branchIdMmCalc = (branchNB * 1.1) - (2 * wtMm);
                              const branchEndAllowanceCalc = (branchEndCount * FLANGE_ALLOWANCE_MM) / 1000;
                              const branchLengthCalc = (teeHeight / 1000) + branchEndAllowanceCalc;

                              return (
                                <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded text-center border border-purple-200 dark:border-purple-700">
                                  <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">🛡️ Internal m²</p>
                                  <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{totalIntArea.toFixed(3)} m²</p>
                                  <div className="text-left mt-1 space-y-0.5">
                                    {runLength > 0 && (
                                      <p className="text-[9px] text-purple-700 dark:text-purple-300">
                                        Run: {pipeRunIntArea.toFixed(4)} m² <span className="text-purple-500 dark:text-purple-400">(ID {idMm.toFixed(1)}mm × π × {runLength.toFixed(3)}m)</span>
                                      </p>
                                    )}
                                    {mainEndCount > 0 && (
                                      <p className="text-[8px] text-purple-500 dark:text-purple-400 pl-2">
                                        Length: {((pipeALength + pipeBLength) / 1000).toFixed(3)}m + {mainEndCount}×0.1m allowance
                                      </p>
                                    )}
                                    {teeHeight > 0 && (
                                      <p className="text-[9px] text-purple-700 dark:text-purple-300">
                                        Branch: {branchIntArea.toFixed(4)} m² <span className="text-purple-500 dark:text-purple-400">(ID {branchIdMmCalc.toFixed(1)}mm × π × {branchLengthCalc.toFixed(3)}m)</span>
                                      </p>
                                    )}
                                    {teeHeight > 0 && branchEndCount > 0 && (
                                      <p className="text-[8px] text-purple-500 dark:text-purple-400 pl-2">
                                        Length: {(teeHeight / 1000).toFixed(3)}m + {branchEndCount}×0.1m allowance
                                      </p>
                                    )}
                                    <p className="text-[9px] text-purple-600 dark:text-purple-400 font-medium pt-0.5 border-t border-purple-200 dark:border-purple-600 mt-1">
                                      Per item: {itemIntArea.toFixed(4)} m² × {quantity} = {totalIntArea.toFixed(3)} m²
                                    </p>
                                    {globalSpecs?.liningType && (
                                      <p className="text-[9px] text-purple-500 dark:text-purple-400 italic">{globalSpecs.liningType}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Remove Item Button */}
                {entries.length > 1 && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => onRemoveEntry(entry.id)}
                      className="px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 text-sm font-medium border border-red-300 rounded-md transition-colors"
                    >
                      Remove Item
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
              {/* Straight Pipe Fields */}
              <SplitPaneLayout
                entryId={entry.id}
                itemType="straight_pipe"
                showSplitToggle={entry.specs?.nominalBoreMm}
                formContent={
                  <>
                {/* Item Description - Single Field */}
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                    Item Description *
                  </label>
                  <textarea
                    value={entry.description || generateItemDescription(entry)}
                    onChange={(e) => onUpdateEntry(entry.id, { description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    rows={2}
                    placeholder="Enter item description..."
                    required
                  />
                  <div className="flex justify-between items-center mt-0.5">
                    <p className="text-xs text-gray-500">
                      Edit the description or use the auto-generated one
                    </p>
                    {entry.description && entry.description !== generateItemDescription(entry) && (
                      <button
                        type="button"
                        onClick={() => onUpdateEntry(entry.id, { description: generateItemDescription(entry) })}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Reset to Auto-generated
                      </button>
                    )}
                  </div>
                </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Column 1 - Specifications */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-900 border-b border-blue-500 pb-1.5">
                    Pipe Specifications
                  </h4>

                  {/* Steel Specification - Auto from Global but can be overridden */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Steel Specification *
                      {(() => {
                        const globalSpecId = globalSpecs?.steelSpecificationId;
                        const entrySpecId = entry.specs?.steelSpecificationId;
                        if (globalSpecId && (!entrySpecId || entrySpecId === globalSpecId)) {
                          return <span className="text-green-600 text-xs ml-2 font-normal">(From Global Spec)</span>;
                        }
                        if (entrySpecId && entrySpecId !== globalSpecId) {
                          return <span className="text-blue-600 text-xs ml-2 font-normal">(Override)</span>;
                        }
                        return null;
                      })()}
                    </label>
                    <div className="flex gap-2">
                      <select
                        id={`pipe-steel-spec-${entry.id}`}
                        value={entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId || ''}
                        onChange={(e) => {
                          const specId = e.target.value ? Number(e.target.value) : undefined;
                          onUpdateEntry(entry.id, {
                            specs: {
                              ...entry.specs,
                              steelSpecificationId: specId
                            }
                          });
                          if (specId && !entry.specs?.nominalBoreMm) {
                            focusAndOpenSelect(`pipe-nb-${entry.id}`);
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="">Select steel spec...</option>
                        {masterData.steelSpecs?.map((spec: any) => (
                          <option key={spec.id} value={spec.id}>
                            {spec.steelSpecName}
                          </option>
                        ))}
                      </select>
                      {entry.specs?.steelSpecificationId && entry.specs?.steelSpecificationId !== globalSpecs?.steelSpecificationId && (
                        <button
                          type="button"
                          onClick={() => onUpdateEntry(entry.id, {
                            specs: {
                              ...entry.specs,
                              steelSpecificationId: undefined
                            }
                          })}
                          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {(() => {
                        const specId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                        const spec = masterData.steelSpecs?.find((s: any) => s.id === specId);
                        return spec ? `Material: ${spec.steelSpecName}` : 'Select a steel specification';
                      })()}
                    </p>
                  </div>

                  {/* Nominal Bore */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Nominal Bore (mm) *
                    </label>
                    <select
                      id={`pipe-nb-${entry.id}`}
                      value={entry.specs.nominalBoreMm}
                      onChange={async (e) => {
                        const nominalBore = Number(e.target.value);
                        if (!nominalBore) return;

                        console.log(`[NB onChange] Selected NB: ${nominalBore}mm`);

                        // Get steel spec ID and temperature
                        const steelSpecId = entry.specs.steelSpecificationId || globalSpecs?.steelSpecificationId || 2;
                        const pressure = globalSpecs?.workingPressureBar || 0;
                        const temperature = globalSpecs?.workingTemperatureC || 20;

                        // Get schedules from fallback data directly for synchronous dropdown update
                        const nbEffectiveSpecId = entry?.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                        const schedules = getScheduleListForSpec(nominalBore, nbEffectiveSpecId);
                        console.log(`[NB onChange] Using ${schedules.length} fallback schedules for ${nominalBore}mm`);

                        // CRITICAL: Set the availableSchedulesMap SYNCHRONOUSLY before updating entry
                        if (schedules.length > 0) {
                          setAvailableSchedulesMap((prev: Record<string, any[]>) => ({
                            ...prev,
                            [entry.id]: schedules
                          }));
                          console.log(`[NB onChange] Set availableSchedulesMap for entry ${entry.id} with ${schedules.length} schedules`);
                        }

                        // Try backend API for ASME B31.3 compliant schedule recommendation
                        let matchedSchedule: string | null = null;
                        let matchedWT = 0;
                        let minWT = 0;
                        let apiSucceeded = false;

                        if (pressure > 0) {
                          try {
                            console.log(`[NB onChange] Calling pipeScheduleApi.recommend with NB=${nominalBore}, P=${pressure}bar, T=${temperature}°C`);
                            const recommendation = await pipeScheduleApi.recommend({
                              nbMm: nominalBore,
                              pressureBar: pressure,
                              temperatureCelsius: temperature,
                              materialCode: steelSpecId === 1 ? 'ASTM_A53_Grade_B' : 'ASTM_A106_Grade_B'
                            });

                            if (recommendation && recommendation.minRequiredThicknessMm) {
                              minWT = recommendation.minRequiredThicknessMm;
                              console.log(`[NB onChange] API returned minWT: ${minWT.toFixed(2)}mm`);

                              if (recommendation.warnings?.length > 0) {
                                console.warn('[NB onChange] API warnings:', recommendation.warnings);
                              }

                              // CRITICAL FIX: Always use fallback schedule data for the schedule name
                              // Find the lightest schedule that meets the minimum wall thickness requirement
                              const eligibleSchedules = schedules
                                .filter(s => s.wallThicknessMm >= minWT)
                                .sort((a, b) => a.wallThicknessMm - b.wallThicknessMm);

                              if (eligibleSchedules.length > 0) {
                                matchedSchedule = eligibleSchedules[0].scheduleDesignation;
                                matchedWT = eligibleSchedules[0].wallThicknessMm;
                                apiSucceeded = true;
                                console.log(`[NB onChange] Using fallback schedule: ${matchedSchedule} (${matchedWT}mm) for minWT=${minWT.toFixed(2)}mm`);
                              } else {
                                // No schedule meets requirements - use thickest available
                                const sorted = [...schedules].sort((a, b) => b.wallThicknessMm - a.wallThicknessMm);
                                matchedSchedule = sorted[0].scheduleDesignation;
                                matchedWT = sorted[0].wallThicknessMm;
                                apiSucceeded = true;
                                console.warn(`[NB onChange] No schedule meets ${minWT.toFixed(2)}mm minWT, using thickest: ${matchedSchedule} (${matchedWT}mm)`);
                              }
                            }
                          } catch (error) {
                            console.warn('[NB onChange] API call failed, using local calculation:', error);
                          }
                        }

                        // Fallback to local ASME B31.3 calculation if API failed
                        if (!apiSucceeded && schedules.length > 0) {
                          if (pressure > 0) {
                            // OD lookup based on NB
                            const od = NB_TO_OD_LOOKUP[nominalBore] || (nominalBore * 1.05);
                            const materialCode = steelSpecId === 1 ? 'ASTM_A53_Grade_B' : 'ASTM_A106_Grade_B';

                            // Use ASME B31.3 formula: P = (2 × S × E × t) / OD
                            // Calculate minimum required wall thickness with 1.2x safety factor
                            minWT = calculateMinWallThickness(od, pressure, materialCode, temperature, 1.0, 0, 1.2);

                            console.log(`[NB onChange] ASME B31.3 calc minWT: ${minWT.toFixed(2)}mm for ${pressure} bar @ ${temperature}°C, OD=${od}mm`);

                            // Find recommended schedule using ASME B31.3 validation
                            const recommendation = findRecommendedSchedule(
                              schedules,
                              od,
                              pressure,
                              materialCode,
                              temperature,
                              1.2 // Minimum 1.2x safety factor
                            );

                            if (recommendation.schedule) {
                              matchedSchedule = recommendation.schedule.scheduleDesignation;
                              matchedWT = recommendation.schedule.wallThicknessMm;
                              const maxPressure = recommendation.validation?.maxAllowablePressure || 0;
                              const margin = recommendation.validation?.safetyMargin || 0;
                              console.log(`[NB onChange] ASME B31.3 recommended: ${matchedSchedule} (${matchedWT}mm), max ${maxPressure.toFixed(1)} bar, ${margin.toFixed(1)}x margin`);
                            } else {
                              // No schedule meets requirements - use thickest available with warning
                              const sorted = [...schedules].sort((a, b) => b.wallThicknessMm - a.wallThicknessMm);
                              matchedSchedule = sorted[0].scheduleDesignation;
                              matchedWT = sorted[0].wallThicknessMm;
                              const validation = validateScheduleForPressure(od, matchedWT, pressure, materialCode, temperature);
                              console.warn(`[NB onChange] No schedule meets ${minWT.toFixed(2)}mm minWT, using thickest: ${matchedSchedule} (${matchedWT}mm). ${validation.message}`);
                            }
                          } else {
                            // No pressure set - use lightest schedule (Sch 10 or STD)
                            const sorted = [...schedules].sort((a, b) => a.wallThicknessMm - b.wallThicknessMm);
                            matchedSchedule = sorted[0].scheduleDesignation;
                            matchedWT = sorted[0].wallThicknessMm;
                            console.log(`[NB onChange] No pressure set, using lightest schedule: ${matchedSchedule}`);
                          }
                        }

                        // Build the update object
                        const updatedEntry: any = {
                          ...entry,
                          minimumSchedule: matchedSchedule,
                          minimumWallThickness: minWT,
                          isScheduleOverridden: false,
                          specs: {
                            ...entry.specs,
                            nominalBoreMm: nominalBore,
                            scheduleNumber: matchedSchedule,
                            wallThicknessMm: matchedWT,
                          }
                        };

                        // Update description
                        updatedEntry.description = generateItemDescription(updatedEntry);

                        console.log(`[NB onChange] Updating entry ${entry.id} with schedule: ${matchedSchedule}, WT: ${matchedWT}mm (API: ${apiSucceeded})`);
                        onUpdateEntry(entry.id, updatedEntry);

                        // Also fetch from API to potentially get better data (runs async in background)
                        fetchAvailableSchedules(entry.id, steelSpecId, nominalBore);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      required
                      disabled={isLoadingNominalBores}
                    >
                      <option value="">{isLoadingNominalBores ? 'Loading available sizes...' : 'Please Select NB'}</option>
                      {nominalBores.map((nb: number) => (
                        <option key={nb} value={nb}>
                          {nb}NB
                        </option>
                      ))}
                    </select>
                    {globalSpecs?.steelSpecificationId && nominalBores.length > 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        {nominalBores.length} sizes available for selected steel specification
                      </p>
                    )}
                    {errors[`pipe_${index}_nb`] && (
                      <p className="mt-1 text-xs text-red-600">{errors[`pipe_${index}_nb`]}</p>
                    )}
                  </div>

                  {/* Schedule/Wall Thickness - Auto/Manual with Upgrade Option */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Schedule/Wall Thickness
                      {globalSpecs?.workingPressureBar ? (
                        <span className="text-green-600 text-xs ml-2">(Automated)</span>
                      ) : (
                        <span className="text-orange-600 text-xs ml-2">(Manual Selection Required)</span>
                      )}
                      {entry.isScheduleOverridden && (
                        <span className="text-blue-600 text-xs ml-2 font-bold">(User Override)</span>
                      )}
                    </label>

                    {globalSpecs?.workingPressureBar && entry.specs.nominalBoreMm ? (
                      <>
                        <div className="bg-green-50 p-2 rounded-md space-y-2">
                          <p className="text-green-800 font-medium text-xs mb-2">
                            Auto-calculated based on {globalSpecs.workingPressureBar} bar and {entry.specs.nominalBoreMm}NB
                          </p>

                          {/* Schedule Dropdown with Recommended + Upgrades */}
                          <div>
                            <label className="block text-xs font-medium text-black mb-1">
                              Schedule *
                            </label>
                            <select
                              value={entry.specs.scheduleNumber || ''}
                              onChange={async (e) => {
                                const newSchedule = e.target.value;

                                // Find the selected dimension to get wall thickness
                                // Handle both camelCase and snake_case property names
                                const availableSchedules = availableSchedulesMap[entry.id] || [];
                                const selectedDimension = availableSchedules.find((dim: any) => {
                                  const schedName = dim.scheduleDesignation || dim.schedule_designation || dim.scheduleNumber?.toString() || dim.schedule_number?.toString();
                                  return schedName === newSchedule;
                                });

                                // Use wall thickness from API data (handle both naming conventions)
                                const autoWallThickness = selectedDimension?.wallThicknessMm || selectedDimension?.wall_thickness_mm || null;

                                const updatedEntry: any = {
                                  specs: {
                                    ...entry.specs,
                                    scheduleNumber: newSchedule,
                                    wallThicknessMm: autoWallThickness || entry.specs.wallThicknessMm
                                  },
                                  isScheduleOverridden: newSchedule !== entry.minimumSchedule
                                };

                                // Auto-update description
                                updatedEntry.description = generateItemDescription({ ...entry, ...updatedEntry });

                                onUpdateEntry(entry.id, updatedEntry);
                              }}
                              className="w-full px-2 py-1.5 text-black border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Select schedule...</option>
                              {(() => {
                                // ALWAYS prefer FALLBACK_PIPE_SCHEDULES to ensure consistent schedule names
                                // API data may have different designations (e.g. "5S" for stainless) that break calculations
                                const fallbackEffectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                                const fallbackSchedules = getScheduleListForSpec(entry.specs.nominalBoreMm, fallbackEffectiveSpecId);
                                const mapSchedules = availableSchedulesMap[entry.id] || [];
                                // Only use API data if no fallback exists
                                const allSchedules = fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;
                                const minimumWT = entry.minimumWallThickness || 0;

                                // Filter to only show schedules >= minimum wall thickness, sorted by wall thickness
                                // Handle both camelCase and snake_case property names
                                const eligibleSchedules = allSchedules
                                  .filter((dim: any) => {
                                    const wt = dim.wallThicknessMm || dim.wall_thickness_mm || 0;
                                    return wt >= minimumWT;
                                  })
                                  .sort((a: any, b: any) => {
                                    const wtA = a.wallThicknessMm || a.wall_thickness_mm || 0;
                                    const wtB = b.wallThicknessMm || b.wall_thickness_mm || 0;
                                    return wtA - wtB;
                                  });

                                // Find the recommended schedule (closest to minimum wall thickness)
                                const recommendedSchedule = eligibleSchedules.length > 0 ? eligibleSchedules[0] : null;

                                if (eligibleSchedules.length === 0) {
                                  return null; // Will show "No schedules available" below
                                }

                                return eligibleSchedules.map((dim: any) => {
                                  const scheduleValue = dim.scheduleDesignation || dim.schedule_designation || dim.scheduleNumber?.toString() || dim.schedule_number?.toString() || 'Unknown';
                                  const wt = dim.wallThicknessMm || dim.wall_thickness_mm || 0;
                                  const isRecommended = recommendedSchedule && dim.id === recommendedSchedule.id;
                                  const label = isRecommended
                                    ? `★ ${scheduleValue} (${wt}mm) - RECOMMENDED`
                                    : `${scheduleValue} (${wt}mm)`;
                                  return (
                                    <option key={dim.id} value={scheduleValue}>
                                      {label}
                                    </option>
                                  );
                                });
                              })()}
                              {(() => {
                                // ALWAYS prefer FALLBACK_PIPE_SCHEDULES for consistent schedule names
                                const fallbackEffectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                                const fallbackSchedules = getScheduleListForSpec(entry.specs.nominalBoreMm, fallbackEffectiveSpecId);
                                const mapSchedules = availableSchedulesMap[entry.id] || [];
                                const allSchedules = fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;
                                const minimumWT = entry.minimumWallThickness || 0;
                                const eligibleSchedules = allSchedules.filter((dim: any) => {
                                  const wt = dim.wallThicknessMm || dim.wall_thickness_mm || 0;
                                  return wt >= minimumWT;
                                });
                                if (eligibleSchedules.length === 0) {
                                  return <option disabled>No schedules available - select nominal bore first</option>;
                                }
                                return null;
                              })()}
                            </select>
                            {entry.minimumSchedule && entry.minimumWallThickness && (
                              <p className="text-xs text-green-700 mt-1">
                                ASME B31.3 min WT: {Number(entry.minimumWallThickness).toFixed(2)}mm (schedule {entry.minimumSchedule} selected: {entry.specs.wallThicknessMm?.toFixed(2)}mm)
                              </p>
                            )}
                          </div>

                          {/* Wall Thickness (Read-only, derived from schedule) */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Wall Thickness (mm)
                            </label>
                            <input
                              type="text"
                              value={entry.specs.wallThicknessMm ? `${entry.specs.wallThicknessMm}mm` : 'Select schedule above'}
                              readOnly
                              className="w-full px-2 py-1.5 text-black bg-gray-100 border border-gray-300 rounded-md text-xs"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <select
                          value={entry.specs.scheduleNumber || ''}
                          onChange={(e) => {
                            const newSchedule = e.target.value;

                            // Find the selected dimension to get wall thickness
                            // ALWAYS prefer FALLBACK_PIPE_SCHEDULES for consistent schedule names
                            const fallbackEffectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                                const fallbackSchedules = getScheduleListForSpec(entry.specs.nominalBoreMm, fallbackEffectiveSpecId);
                            const mapSchedules = availableSchedulesMap[entry.id] || [];
                            const availableSchedules = fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;
                            const selectedDimension = availableSchedules.find((dim: any) => {
                              const schedName = dim.scheduleDesignation || dim.schedule_designation || dim.scheduleNumber?.toString() || dim.schedule_number?.toString();
                              return schedName === newSchedule;
                            });

                            // Use wall thickness from data (handle both naming conventions)
                            const autoWallThickness = selectedDimension?.wallThicknessMm || selectedDimension?.wall_thickness_mm || null;

                            const updatedEntry: any = {
                              specs: {
                                ...entry.specs,
                                scheduleNumber: newSchedule,
                                wallThicknessMm: autoWallThickness || entry.specs.wallThicknessMm
                              }
                            };

                            // Auto-update description
                            updatedEntry.description = generateItemDescription({ ...entry, ...updatedEntry });

                            onUpdateEntry(entry.id, updatedEntry);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        >
                          <option value="">Select schedule...</option>
                          {(() => {
                            // ALWAYS prefer FALLBACK_PIPE_SCHEDULES for consistent schedule names
                            const fallbackEffectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                                const fallbackSchedules = getScheduleListForSpec(entry.specs.nominalBoreMm, fallbackEffectiveSpecId);
                            const mapSchedules = availableSchedulesMap[entry.id] || [];
                            const allSchedules = fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;

                            if (allSchedules.length === 0) {
                              return <option disabled>No schedules available - select nominal bore first</option>;
                            }

                            return allSchedules.map((dim: any) => {
                              const scheduleValue = dim.scheduleDesignation || dim.schedule_designation || dim.scheduleNumber?.toString() || dim.schedule_number?.toString() || 'Unknown';
                              const wt = dim.wallThicknessMm || dim.wall_thickness_mm || 0;
                              const label = `${scheduleValue} (${wt}mm)`;
                              return (
                                <option key={dim.id} value={scheduleValue}>
                                  {label}
                                </option>
                              );
                            });
                          })()}
                        </select>
                        <p className="mt-0.5 text-xs text-gray-700">
                          Select a schedule from available options for the selected nominal bore and steel specification.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Pipe Lengths */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Length of Each Pipe (m) *
                    </label>
                    <div className="flex gap-2 mb-1">
                      <button
                        type="button"
                        onClick={() => {
                          const pipeLength = 6.1;
                          const numPipes = entry.specs.quantityType === 'number_of_pipes'
                            ? (entry.specs.quantityValue || 1)
                            : Math.ceil((entry.specs.quantityValue || pipeLength) / pipeLength);
                          const updatedEntry = { ...entry, specs: { ...entry.specs, individualPipeLength: pipeLength } };
                          const newDescription = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, individualPipeLength: pipeLength },
                            calculatedPipes: numPipes,
                            description: newDescription
                          });
                        }}
                        className={`px-2 py-1 text-black text-xs rounded border ${entry.specs.individualPipeLength === 6.1 ? 'bg-blue-100 border-blue-300 font-medium' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'}`}
                      >
                        6.1m
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const pipeLength = 9.144;
                          const numPipes = entry.specs.quantityType === 'number_of_pipes'
                            ? (entry.specs.quantityValue || 1)
                            : Math.ceil((entry.specs.quantityValue || pipeLength) / pipeLength);
                          const updatedEntry = { ...entry, specs: { ...entry.specs, individualPipeLength: pipeLength } };
                          const newDescription = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, individualPipeLength: pipeLength },
                            calculatedPipes: numPipes,
                            description: newDescription
                          });
                        }}
                        className={`px-2 py-1 text-black text-xs rounded border ${entry.specs.individualPipeLength === 9.144 ? 'bg-blue-100 border-blue-300 font-medium' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'}`}
                      >
                        9.144m
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const pipeLength = 12.192;
                          const numPipes = entry.specs.quantityType === 'number_of_pipes'
                            ? (entry.specs.quantityValue || 1)
                            : Math.ceil((entry.specs.quantityValue || pipeLength) / pipeLength);
                          const updatedEntry = { ...entry, specs: { ...entry.specs, individualPipeLength: pipeLength } };
                          const newDescription = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, individualPipeLength: pipeLength },
                            calculatedPipes: numPipes,
                            description: newDescription
                          });
                        }}
                        className={`px-2 py-1 text-black text-xs rounded border ${entry.specs.individualPipeLength === 12.192 ? 'bg-blue-100 border-blue-300 font-medium' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'}`}
                      >
                        12.192m (Standard)
                      </button>
                    </div>
                    <input
                      type="number"
                      step="0.001"
                      value={entry.specs.individualPipeLength || ''}
                      onChange={(e) => {
                        const pipeLength = e.target.value ? Number(e.target.value) : undefined;
                        const numPipes = pipeLength && entry.specs.quantityType === 'number_of_pipes'
                          ? (entry.specs.quantityValue || 1)
                          : pipeLength ? Math.ceil((entry.specs.quantityValue || pipeLength) / pipeLength) : undefined;
                        const updatedEntry = { ...entry, specs: { ...entry.specs, individualPipeLength: pipeLength } };
                        const newDescription = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, individualPipeLength: pipeLength },
                          calculatedPipes: numPipes,
                          description: newDescription
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="Enter length or select above"
                      required
                    />
                    <p className="mt-0.5 text-xs text-gray-700">
                      Standard imported lengths: 6.1m, 9.144m, or 12.192m (can be custom)
                    </p>
                  </div>
                </div>

                {/* Column 2 - Quantities & Configurations */}
                <div className="space-y-3">
                  <h4 className="text-base font-bold text-gray-900 border-b-2 border-green-500 pb-2 mb-4">
                    Quantities & Configuration
                  </h4>

                  {/* Pipe End Configuration - NEW FIELD */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Pipe End Configuration *
                    </label>
                    <select
                      value={entry.specs.pipeEndConfiguration || 'PE'}
                      onChange={async (e) => {
                        const newConfig = e.target.value as any;
                        
                        // Get weld details for this configuration
                        let weldDetails = null;
                        try {
                          weldDetails = await getPipeEndConfigurationDetails(newConfig);
                        } catch (error) {
                          console.warn('Could not get pipe end configuration details:', error);
                        }
                        
                        const updatedEntry: any = {
                          specs: { ...entry.specs, pipeEndConfiguration: newConfig },
                          // Store weld count information if available
                          ...(weldDetails && { weldInfo: weldDetails })
                        };
                        
                        // Auto-update description
                        updatedEntry.description = generateItemDescription({ ...entry, ...updatedEntry });
                        
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      required
                    >
                      {PIPE_END_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <p className="mt-0.5 text-xs text-gray-700">
                      Select how the pipe ends should be configured
                      {/* Show weld count based on selected configuration */}
                      {entry.specs.pipeEndConfiguration && (
                        <span className="ml-2 text-blue-600 font-medium">
                          • {getWeldCountPerPipe(entry.specs.pipeEndConfiguration)} weld{getWeldCountPerPipe(entry.specs.pipeEndConfiguration) !== 1 ? 's' : ''} per pipe
                        </span>
                      )}
                    </p>
                    {/* Weld Thickness Display - from fitting wall thickness tables (ASME B31.1) or pipe WT for SABS 719 */}
                    {(() => {
                      const weldCount = getWeldCountPerPipe(entry.specs.pipeEndConfiguration || 'PE');
                      const dn = entry.specs.nominalBoreMm;
                      const schedule = entry.specs.scheduleNumber || '';
                      const steelSpecId = entry.specs.steelSpecificationId || globalSpecs?.steelSpecificationId;
                      const isSABS719 = steelSpecId === 8; // SABS 719 ERW uses WT schedules

                      // Carbon Steel Weld Fittings wall thickness lookup (WPB Grade, ASME B31.1)
                      // Only used for ASTM/ASME pipes, not SABS 719
                      const FITTING_WALL_THICKNESS: Record<string, Record<number, number>> = {
                        'STD': { 15: 2.77, 20: 2.87, 25: 3.38, 32: 3.56, 40: 3.68, 50: 3.91, 65: 5.16, 80: 5.49, 90: 5.74, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53 },
                        'XH': { 15: 3.73, 20: 3.91, 25: 4.55, 32: 4.85, 40: 5.08, 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.70, 250: 12.70, 300: 12.70 },
                        'XXH': { 15: 7.47, 20: 7.82, 25: 9.09, 32: 9.70, 40: 10.16, 50: 11.07, 65: 14.02, 80: 15.24, 100: 17.12, 125: 19.05, 150: 22.23, 200: 22.23, 250: 25.40, 300: 25.40 }
                      };

                      // Show weld thickness if pipe has welds and DN is set
                      if (weldCount === 0) {
                        return null; // No welds for PE configuration
                      }

                      if (!dn) {
                        return (
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                            <p className="text-xs text-amber-700">
                              Select Nominal Bore to see recommended weld thickness
                            </p>
                          </div>
                        );
                      }

                      // For SABS 719, always use the actual pipe wall thickness (WT schedules)
                      // SABS 719 specifies wall thickness directly (WT6 = 6mm, WT8 = 8mm, etc.)
                      const pipeWallThickness = entry.specs.wallThicknessMm;

                      let effectiveWeldThickness: number | null = null;
                      let usingPipeThickness = false;
                      let fittingClass = 'STD';

                      if (isSABS719) {
                        // SABS 719: Use pipe wall thickness directly - this IS the weld thickness
                        effectiveWeldThickness = pipeWallThickness;
                        usingPipeThickness = true;
                      } else {
                        // ASTM/ASME: Look up from fitting class tables
                        const scheduleUpper = schedule.toUpperCase();
                        fittingClass =
                          scheduleUpper.includes('160') || scheduleUpper.includes('XXS') || scheduleUpper.includes('XXH')
                            ? 'XXH'
                            : scheduleUpper.includes('80') || scheduleUpper.includes('XS') || scheduleUpper.includes('XH')
                              ? 'XH'
                              : 'STD';

                        const weldThickness = dn ? FITTING_WALL_THICKNESS[fittingClass]?.[dn] : null;
                        effectiveWeldThickness = weldThickness || pipeWallThickness;
                        usingPipeThickness = !weldThickness && !!pipeWallThickness;
                      }

                      if (!effectiveWeldThickness) {
                        return (
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                            <p className="text-xs text-amber-700">
                              Weld thickness data not available for DN {dn}mm - set pipe wall thickness
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className={`mt-2 p-2 ${isSABS719 ? 'bg-amber-50 border border-amber-200' : usingPipeThickness ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'} rounded-md`}>
                          <p className={`text-xs font-bold ${isSABS719 ? 'text-amber-800' : usingPipeThickness ? 'text-blue-800' : 'text-green-800'}`}>
                            Flange Weld Thickness: {effectiveWeldThickness.toFixed(2)} mm
                          </p>
                          <p className={`text-xs ${isSABS719 ? 'text-amber-700' : usingPipeThickness ? 'text-blue-700' : 'text-green-700'}`}>
                            {isSABS719
                              ? `SABS 719 ERW - using pipe wall thickness (${schedule || 'WT'})`
                              : usingPipeThickness
                                ? 'Using pipe wall thickness (no fitting data for this DN)'
                                : `Based on ${fittingClass} fitting class (ASME B31.1)`}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            2 welds per flange (inside + outside)
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Closure Length Field - Only shown when L/F configuration is selected */}
                  {hasLooseFlange(entry.specs.pipeEndConfiguration || '') && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Closure Length (mm) *
                        <span className="text-blue-600 text-xs ml-2">(Site weld extension past L/F)</span>
                      </label>
                      <input
                        type="number"
                        value={entry.specs?.closureLengthMm || ''}
                        onChange={(e) => {
                          const closureLength = e.target.value ? Number(e.target.value) : undefined;
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, closureLengthMm: closureLength }
                          });
                        }}
                        placeholder="e.g., 150"
                        min={50}
                        max={500}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      />
                      <p className="mt-0.5 text-xs text-gray-500">
                        Additional pipe length extending past the loose flange for site weld connection (typically 100-200mm)
                      </p>
                      {/* Tack Weld Information */}
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                        <p className="text-xs font-bold text-amber-800">
                          Loose Flange Tack Welds Required:
                        </p>
                        <ul className="text-xs text-amber-700 mt-1 list-disc list-inside">
                          <li>8 tack welds total (~20mm each)</li>
                          <li>4 tack welds on each side of loose flange</li>
                        </ul>
                        <p className="text-xs text-amber-600 mt-1 italic">
                          Tack weld charge applies per L/F end
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Blank Flange Option - Position selector for pipes */}
                  {(() => {
                    const pipeEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
                    const configUpper = pipeEndConfig.toUpperCase();
                    // Determine available flange positions based on config
                    const hasInletFlange = ['FBE', 'FOE_LF', 'FOE_RF', '2X_RF', 'LF_BE'].includes(configUpper);
                    const hasOutletFlange = ['FOE', 'FBE', 'FOE_LF', 'FOE_RF', '2X_RF', 'LF_BE'].includes(configUpper);

                    const availablePositions: { key: string; label: string; hasFlange: boolean }[] = [
                      { key: 'inlet', label: 'End A (Inlet)', hasFlange: hasInletFlange },
                      { key: 'outlet', label: 'End B (Outlet)', hasFlange: hasOutletFlange },
                    ].filter(p => p.hasFlange);

                    if (availablePositions.length === 0) return null;

                    const currentPositions = entry.specs?.blankFlangePositions || [];

                    return (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-green-800">Add Blank Flange(s)</span>
                          <span className="text-xs text-slate-500">({availablePositions.length} positions available)</span>
                        </div>
                        <div className="flex flex-wrap gap-4">
                          {availablePositions.map(pos => (
                            <label key={pos.key} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={currentPositions.includes(pos.key)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  let newPositions: string[];
                                  if (checked) {
                                    newPositions = [...currentPositions, pos.key];
                                  } else {
                                    newPositions = currentPositions.filter((p: string) => p !== pos.key);
                                  }
                                  onUpdateEntry(entry.id, {
                                    specs: {
                                      ...entry.specs,
                                      addBlankFlange: newPositions.length > 0,
                                      blankFlangeCount: newPositions.length,
                                      blankFlangePositions: newPositions
                                    }
                                  });
                                }}
                                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              />
                              <span className="text-sm text-slate-700">{pos.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Total Length - MOVED ABOVE QUANTITY */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Total Length of Line (m) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={
                        entry.specs.quantityType === 'total_length'
                          ? Number(entry.specs.quantityValue || 0).toFixed(3)
                          : Number((entry.specs.quantityValue || 1) * (entry.specs.individualPipeLength || 0)).toFixed(3)
                      }
                      onChange={(e) => {
                        const totalLength = Number(e.target.value);
                        const updatedEntry = calculateQuantities(entry, 'totalLength', totalLength);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="8000"
                      required
                    />
                    <p className="mt-0.5 text-xs text-gray-700">
                      Total pipeline length required
                    </p>
                  </div>

                  {/* Quantity of Items - MOVED BELOW TOTAL LENGTH */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Quantity of Items (Each) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={
                        entry.specs.quantityType === 'number_of_pipes'
                          ? entry.specs.quantityValue || 1
                          : entry.specs.individualPipeLength ? Math.ceil((entry.specs.quantityValue || 0) / entry.specs.individualPipeLength) : 0
                      }
                      onChange={(e) => {
                        const numberOfPipes = Number(e.target.value);
                        const updatedEntry = calculateQuantities(entry, 'numberOfPipes', numberOfPipes);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="1000"
                      required
                    />
                    <p className="mt-0.5 text-xs text-gray-700">
                      Number of individual pipes required
                    </p>
                  </div>

                  {/* Flange Specifications */}
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <label className="block text-xs font-semibold text-gray-900">
                        Flanges
                        {entry.hasFlangeOverride ? (
                          <span className="text-blue-600 text-xs ml-2">(Override Active)</span>
                        ) : globalSpecs?.flangeStandardId ? (
                          <span className="text-green-600 text-xs ml-2">(From Global Specs)</span>
                        ) : (
                          <span className="text-orange-600 text-xs ml-2">(Item Specific)</span>
                        )}
                      </label>
                      {globalSpecs?.flangeStandardId && (
                        <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                          <span className="text-gray-500 italic">(click here to change flanges)</span>
                          <input
                            type="checkbox"
                            checked={entry.hasFlangeOverride || false}
                            onChange={(e) => {
                              const override = e.target.checked;
                              onUpdateEntry(entry.id, {
                                hasFlangeOverride: override,
                                flangeOverrideConfirmed: false,
                                specs: override ? {
                                  ...entry.specs,
                                  // Copy global values to entry specs when enabling override
                                  flangeStandardId: entry.specs.flangeStandardId || globalSpecs?.flangeStandardId,
                                  flangePressureClassId: entry.specs.flangePressureClassId || globalSpecs?.flangePressureClassId
                                } : {
                                  ...entry.specs,
                                  flangeStandardId: undefined,
                                  flangePressureClassId: undefined
                                }
                              });
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium">Override</span>
                        </label>
                      )}
                    </div>

                    {/* Warning if deviating from recommended pressure class */}
                    {(() => {
                      const currentClassId = entry.specs.flangePressureClassId || globalSpecs?.flangePressureClassId;
                      const recommendedClassId = globalSpecs?.flangePressureClassId;
                      const isOverride = entry.hasFlangeOverride && currentClassId && recommendedClassId && currentClassId !== recommendedClassId;
                      
                      if (isOverride) {
                        const currentClass = masterData.pressureClasses?.find((p: any) => p.id === currentClassId);
                        const recommendedClass = masterData.pressureClasses?.find((p: any) => p.id === recommendedClassId);
                        return (
                          <div className="bg-red-50 border-2 border-red-400 rounded-lg p-2 mb-2">
                            <div className="flex items-start gap-2">
                              <span className="text-red-600 text-base">⚠️</span>
                              <div className="flex-1">
                                <p className="text-xs font-bold text-red-900">Pressure Rating Override</p>
                                <p className="text-xs text-red-700 mt-0.5">
                                  Selected <span className="font-semibold">{currentClass?.designation}</span> instead of recommended{' '}
                                  <span className="font-semibold">{recommendedClass?.designation}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {globalSpecs?.flangeStandardId && !entry.hasFlangeOverride ? (
                      <div className="bg-green-50 p-2 rounded-md space-y-2">
                        <p className="text-green-800 text-xs">
                          Using global flange standard from specifications page
                        </p>
                        {/* Display recommended flange specification */}
                        {globalSpecs?.flangePressureClassId && (
                          <div className="bg-blue-50 p-2 rounded border-l-2 border-blue-300">
                            <p className="text-blue-800 text-xs font-semibold">
                              Recommended Flange Spec:
                              <span className="ml-1">
                                {(() => {
                                  // Find pressure class designation
                                  const pressureClass = masterData.pressureClasses.find(
                                    (pc: any) => pc.id === globalSpecs.flangePressureClassId
                                  );
                                  // Find flange standard code
                                  const flangeStandard = masterData.flangeStandards.find(
                                    (fs: any) => fs.id === globalSpecs.flangeStandardId
                                  );

                                  if (pressureClass && flangeStandard) {
                                    return `${flangeStandard.code}/${pressureClass.designation}`;
                                  }
                                  return 'N/A';
                                })()}
                              </span>
                            </p>
                            <p className="text-blue-600 text-xs mt-1">
                              For {entry.specs.workingPressureBar || globalSpecs?.workingPressureBar || 'N/A'} bar working pressure
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Show confirmed override summary when confirmed */}
                        {entry.flangeOverrideConfirmed ? (
                          <div className="bg-blue-50 border-2 border-blue-400 p-3 rounded-md">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                                <span className="text-green-600">✓</span> Item-Specific Flange Confirmed
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateEntry(entry.id, { flangeOverrideConfirmed: false })}
                                className="px-3 py-1 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                              >
                                Edit
                              </button>
                            </div>
                            <div className="bg-white p-2 rounded border border-blue-200">
                              <p className="text-sm font-bold text-blue-800">
                                {(() => {
                                  const flangeStandard = masterData.flangeStandards.find(
                                    (fs: any) => fs.id === entry.specs.flangeStandardId
                                  );
                                  const pressureClass = masterData.pressureClasses.find(
                                    (pc: any) => pc.id === entry.specs.flangePressureClassId
                                  );
                                  if (flangeStandard && pressureClass) {
                                    return `${flangeStandard.code} / ${pressureClass.designation}`;
                                  }
                                  return 'N/A';
                                })()}
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                This flange specification is locked for this item only
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <select
                              value={entry.specs.flangeStandardId || globalSpecs?.flangeStandardId || ''}
                              onChange={(e) => {
                                const newFlangeStandardId = e.target.value ? Number(e.target.value) : undefined;
                                const updatedEntry = { ...entry, specs: { ...entry.specs, flangeStandardId: newFlangeStandardId } };
                                const newDescription = generateItemDescription(updatedEntry);
                                onUpdateEntry(entry.id, {
                                  specs: { ...entry.specs, flangeStandardId: newFlangeStandardId },
                                  description: newDescription
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            >
                              <option value="">Select flange standard...</option>
                              {masterData.flangeStandards.map((standard: any) => (
                                <option key={standard.id} value={standard.id}>
                                  {standard.code}
                                </option>
                              ))}
                            </select>

                            <select
                              value={entry.specs.flangePressureClassId || globalSpecs?.flangePressureClassId || ''}
                              onChange={(e) => {
                                const newFlangePressureClassId = e.target.value ? Number(e.target.value) : undefined;
                                const updatedEntry = { ...entry, specs: { ...entry.specs, flangePressureClassId: newFlangePressureClassId } };
                                const newDescription = generateItemDescription(updatedEntry);
                                onUpdateEntry(entry.id, {
                                  specs: { ...entry.specs, flangePressureClassId: newFlangePressureClassId },
                                  description: newDescription
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            >
                              <option value="">Select pressure class...</option>
                              {masterData.pressureClasses.map((pc: any) => (
                                <option key={pc.id} value={pc.id}>
                                  {pc.designation}
                                </option>
                              ))}
                            </select>

                            {/* Confirm/Edit Buttons for Override */}
                            {entry.hasFlangeOverride && entry.specs.flangeStandardId && entry.specs.flangePressureClassId && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => onUpdateEntry(entry.id, { flangeOverrideConfirmed: true })}
                                  className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-green-600 rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                                >
                                  <span>✓</span> Confirm Override
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Reset to global specs
                                    onUpdateEntry(entry.id, {
                                      hasFlangeOverride: false,
                                      flangeOverrideConfirmed: false,
                                      specs: {
                                        ...entry.specs,
                                        flangeStandardId: undefined,
                                        flangePressureClassId: undefined
                                      }
                                    });
                                  }}
                                  className="flex-1 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                                >
                                  Use Global
                                </button>
                              </div>
                            )}

                            {/* Individual Item Flange Specification Display */}
                            {entry.specs.flangeStandardId && entry.specs.flangePressureClassId && !entry.hasFlangeOverride && (
                              <div className="bg-blue-50 border border-blue-200 p-3 rounded-md mt-2">
                                <h5 className="text-sm font-semibold text-blue-800 mb-2">
                                  Item-Specific Flange Specification
                                </h5>
                                <div className="bg-white p-2 rounded border border-blue-200">
                                  <p className="text-sm font-medium text-blue-900">
                                    Selected Specification:
                                    <span className="ml-2 font-bold text-lg text-blue-800">
                                      {(() => {
                                        const flangeStandard = masterData.flangeStandards.find(
                                          (fs: any) => fs.id === entry.specs.flangeStandardId
                                        );
                                        const pressureClass = masterData.pressureClasses.find(
                                          (pc: any) => pc.id === entry.specs.flangePressureClassId
                                        );

                                        if (flangeStandard && pressureClass) {
                                          return `${flangeStandard.code}/${pressureClass.designation}`;
                                        }
                                        return 'N/A';
                                      })()}
                                    </span>
                                  </p>
                                  <div className="text-xs text-blue-600 mt-1 grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="font-medium">Standard:</span> {masterData.flangeStandards.find((fs: any) => fs.id === entry.specs.flangeStandardId)?.code || 'N/A'}
                                    </div>
                                    <div>
                                      <span className="font-medium">Pressure Class:</span> {masterData.pressureClasses.find((pc: any) => pc.id === entry.specs.flangePressureClassId)?.designation || 'N/A'}
                                    </div>
                                  </div>
                                  <p className="text-blue-600 text-xs mt-2">
                                    💡 This item uses individual flange specification (overrides global settings)
                                  </p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                </div>

              </div>
                  </>
                }
                previewContent={
                  <Pipe3DPreview
                    length={entry.specs.individualPipeLength || 12.192}
                    outerDiameter={entry.calculation?.outsideDiameterMm || (entry.specs.nominalBoreMm * 1.1)}
                    wallThickness={entry.calculation?.wallThicknessMm || entry.specs.wallThicknessMm || 5}
                    endConfiguration={entry.specs.pipeEndConfiguration || 'PE'}
                    materialName={masterData.steelSpecs.find((s: any) => s.id === (entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId))?.steelSpecName}
                    nominalBoreMm={entry.specs.nominalBoreMm}
                    pressureClass={globalSpecs?.pressureClassDesignation || 'PN16'}
                    addBlankFlange={entry.specs?.addBlankFlange}
                    blankFlangePositions={entry.specs?.blankFlangePositions}
                  />
                }
              />

              {/* Remove Item Button */}
              {entries.length > 1 && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => onRemoveEntry(entry.id)}
                    className="px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 text-sm font-medium border border-red-300 rounded-md transition-colors"
                  >
                    Remove Item
                  </button>
                </div>
              )}

              {/* Calculation Results - Full Width Compact Layout */}
              <div className="mt-4">
                <h4 className="text-sm font-bold text-gray-900 border-b-2 border-purple-500 pb-1.5 mb-3">
                  📊 Calculation Results
                </h4>

                {entry.calculation ? (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                    {/* Compact horizontal grid layout - equal width columns that fill container */}
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
                      {/* Quantity of Pipes */}
                      <div className="bg-white p-2 rounded text-center">
                        <p className="text-xs text-gray-600 font-medium">Qty Pipes</p>
                        <p className="text-lg font-bold text-gray-900">{entry.calculation.calculatedPipeCount}</p>
                        <p className="text-xs text-gray-500">pieces</p>
                      </div>

                      {/* Total Length */}
                      <div className="bg-white p-2 rounded text-center">
                        <p className="text-xs text-gray-600 font-medium">Total Length</p>
                        <p className="text-lg font-bold text-gray-900">{entry.calculation.calculatedTotalLength?.toFixed(1)}m</p>
                      </div>

                      {/* Total System Weight - includes backing ring weight for R/F configs */}
                      {(() => {
                        const configUpper = (entry.specs.pipeEndConfiguration || 'PE').toUpperCase();
                        // Only R/F (rotating flange) configurations require backing rings
                        const hasRotatingFlange = ['FOE_RF', '2X_RF'].includes(configUpper);

                        // Calculate backing ring weight if R/F or L/F
                        let backingRingTotalWeight = 0;
                        if (hasRotatingFlange) {
                          const getBackingRingCountForTotal = () => {
                            if (configUpper === 'FOE_RF') return 1;
                            if (configUpper === '2X_RF') return 2;
                            return 0;
                          };
                          const backingRingCountPerPipe = getBackingRingCountForTotal();
                          const totalBackingRings = backingRingCountPerPipe * (entry.calculation?.calculatedPipeCount || 0);

                          const getFlangeODForTotal = (nb: number) => {
                            const flangeODs: Record<number, number> = {
                              15: 95, 20: 105, 25: 115, 32: 140, 40: 150, 50: 165, 65: 185, 80: 200,
                              100: 220, 125: 250, 150: 285, 200: 340, 250: 405, 300: 460, 350: 520,
                              400: 580, 450: 640, 500: 670, 600: 780
                            };
                            return flangeODs[nb] || nb * 1.5;
                          };

                          const nb = entry.specs.nominalBoreMm || 100;
                          const pipeOD = entry.calculation?.outsideDiameterMm || (nb * 1.1);
                          const flangeOD = getFlangeODForTotal(nb);
                          const ringOD = flangeOD - 10;
                          const ringID = pipeOD;
                          const ringThickness = 10;
                          const steelDensity = 7.85;

                          const volumeCm3 = Math.PI * (Math.pow(ringOD/20, 2) - Math.pow(ringID/20, 2)) * (ringThickness/10);
                          const weightPerRing = volumeCm3 * steelDensity / 1000;
                          backingRingTotalWeight = weightPerRing * totalBackingRings;
                        }

                        const totalWithRings = (entry.calculation.totalSystemWeight || 0) + backingRingTotalWeight;

                        return (
                          <div className="bg-white p-2 rounded text-center">
                            <p className="text-xs text-gray-600 font-medium">Total Weight</p>
                            <p className="text-lg font-bold text-blue-900">{formatWeight(totalWithRings)}</p>
                            <p className="text-xs text-gray-500">
                              (Pipe: {formatWeight(entry.calculation.totalPipeWeight)})
                            </p>
                            {backingRingTotalWeight > 0 && (
                              <p className="text-xs text-purple-600">
                                (incl. {backingRingTotalWeight.toFixed(1)}kg rings)
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      {/* Total Flange Weight */}
                      <div className="bg-white p-2 rounded text-center">
                        <p className="text-xs text-gray-600 font-medium">Total Flange Weight</p>
                        <p className="text-lg font-bold text-gray-900">{formatWeight(entry.calculation.totalFlangeWeight)}</p>
                        <p className="text-xs text-gray-500">
                          {(() => {
                            const physicalFlanges = getPhysicalFlangeCount(entry.specs.pipeEndConfiguration || 'PE');
                            return physicalFlanges * (entry.calculation?.calculatedPipeCount || 0);
                          })()} flanges
                        </p>
                      </div>

                      {/* Backing Ring Weight - only for R/F and L/F configurations */}
                      {(() => {
                        const configUpper = (entry.specs.pipeEndConfiguration || 'PE').toUpperCase();
                        // Only R/F (rotating flange) configurations require backing rings
                        const hasRotatingFlange = ['FOE_RF', '2X_RF'].includes(configUpper);
                        if (!hasRotatingFlange) return null;

                        // Get backing ring count based on configuration
                        const getBackingRingCount = () => {
                          if (configUpper === 'FOE_RF') return 1;
                          if (configUpper === '2X_RF') return 2;
                          return 0;
                        };
                        const backingRingCountPerPipe = getBackingRingCount();
                        const totalBackingRings = backingRingCountPerPipe * (entry.calculation?.calculatedPipeCount || 0);

                        // Calculate backing ring weight
                        // Flange lookup for ring dimensions
                        const getFlangeOD = (nb: number) => {
                          const flangeODs: Record<number, number> = {
                            15: 95, 20: 105, 25: 115, 32: 140, 40: 150, 50: 165, 65: 185, 80: 200,
                            100: 220, 125: 250, 150: 285, 200: 340, 250: 405, 300: 460, 350: 520,
                            400: 580, 450: 640, 500: 670, 600: 780
                          };
                          return flangeODs[nb] || nb * 1.5;
                        };

                        const nb = entry.specs.nominalBoreMm || 100;
                        const pipeOD = entry.calculation?.outsideDiameterMm || (nb * 1.1);
                        const flangeOD = getFlangeOD(nb);
                        const ringOD = flangeOD - 10; // mm
                        const ringID = pipeOD; // mm
                        const ringThickness = 10; // mm
                        const steelDensity = 7.85; // kg/dm³

                        // Volume = π × (R²outer - R²inner) × thickness in cm³
                        const volumeCm3 = Math.PI * (Math.pow(ringOD/20, 2) - Math.pow(ringID/20, 2)) * (ringThickness/10);
                        const weightPerRing = volumeCm3 * steelDensity / 1000; // kg
                        const totalWeight = weightPerRing * totalBackingRings;

                        return (
                          <div className="bg-purple-50 p-2 rounded text-center border border-purple-200">
                            <p className="text-xs text-purple-700 font-medium">Backing Rings (R/F)</p>
                            <p className="text-lg font-bold text-purple-900">{totalWeight.toFixed(1)} kg</p>
                            <p className="text-xs text-purple-600">
                              {totalBackingRings} rings × {weightPerRing.toFixed(2)}kg
                            </p>
                          </div>
                        );
                      })()}

                      {/* Flange Welds */}
                      <div className="bg-white p-2 rounded text-center">
                        <p className="text-xs text-gray-600 font-medium">Flange Welds</p>
                        <p className="text-lg font-bold text-gray-900">{entry.calculation.numberOfFlangeWelds}</p>
                        <p className="text-xs text-gray-500">{entry.calculation.totalFlangeWeldLength?.toFixed(2)}m</p>
                        <p className="text-[10px] text-gray-400">(2 per flange: in+out)</p>
                        {(() => {
                          const dn = entry.specs.nominalBoreMm;
                          const schedule = entry.specs.scheduleNumber || '';
                          const pipeWallThickness = entry.specs.wallThicknessMm;
                          if (!dn && !pipeWallThickness) return null;

                          // Check for SABS 719 - use item-level steel spec with global fallback
                          const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                          const isSABS719 = steelSpecId === 8;

                          // Determine fitting class from schedule
                          const scheduleUpper = schedule.toUpperCase();
                          const fittingClass =
                            scheduleUpper.includes('160') || scheduleUpper.includes('XXS') || scheduleUpper.includes('XXH')
                              ? 'XXH'
                              : scheduleUpper.includes('80') || scheduleUpper.includes('XS') || scheduleUpper.includes('XH')
                                ? 'XH'
                                : 'STD';

                          // Carbon Steel Weld Fittings wall thickness (ASME B31.1) - for ASTM/ASME only
                          const FITTING_WT: Record<string, Record<number, number>> = {
                            'STD': { 15: 2.77, 20: 2.87, 25: 3.38, 32: 3.56, 40: 3.68, 50: 3.91, 65: 5.16, 80: 5.49, 90: 5.74, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53, 350: 9.53, 400: 9.53, 450: 9.53, 500: 9.53, 600: 9.53, 750: 9.53, 900: 9.53, 1000: 9.53, 1050: 9.53, 1200: 9.53 },
                            'XH': { 15: 3.73, 20: 3.91, 25: 4.55, 32: 4.85, 40: 5.08, 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.70, 250: 12.70, 300: 12.70, 350: 12.70, 400: 12.70, 450: 12.70, 500: 12.70, 600: 12.70, 750: 12.70, 900: 12.70, 1000: 12.70, 1050: 12.70, 1200: 12.70 },
                            'XXH': { 15: 7.47, 20: 7.82, 25: 9.09, 32: 9.70, 40: 10.16, 50: 11.07, 65: 14.02, 80: 15.24, 100: 17.12, 125: 19.05, 150: 22.23, 200: 22.23, 250: 25.40, 300: 25.40, 350: 25.40, 400: 25.40, 450: 25.40, 500: 25.40, 600: 25.40 }
                          };

                          // For SABS 719: use pipe WT directly; for ASTM/ASME: use fitting lookup
                          const fittingWt = isSABS719 ? null : (dn ? FITTING_WT[fittingClass]?.[dn] : null);
                          const effectiveWt = isSABS719 ? pipeWallThickness : (fittingWt || pipeWallThickness);
                          const usingPipeThickness = isSABS719 || (!fittingWt && pipeWallThickness);

                          if (!effectiveWt) return null;
                          return (
                            <div className={`mt-1 p-1 ${usingPipeThickness ? 'bg-blue-100' : 'bg-green-100'} rounded`}>
                              <p className={`text-xs font-bold ${usingPipeThickness ? 'text-blue-700' : 'text-green-700'}`}>
                                Weld: {effectiveWt.toFixed(2)}mm
                              </p>
                              <p className={`text-[10px] ${usingPipeThickness ? 'text-blue-600' : 'text-green-600'}`}>
                                {isSABS719 ? 'SABS 719 WT' : (usingPipeThickness ? 'Pipe WT' : fittingClass)}
                              </p>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Surface Protection m² - External (only show if surface protection selected) */}
                      {showSurfaceProtection && entry.calculation?.outsideDiameterMm && entry.specs.wallThicknessMm && (() => {
                        // Get pressure class - use entry override if available, otherwise global
                        const pressureClassId = entry.specs.flangePressureClassId || globalSpecs?.flangePressureClassId;
                        const pressureClassDesignation = pressureClassId
                          ? masterData.pressureClasses?.find((p: any) => p.id === pressureClassId)?.designation
                          : undefined;
                        return (
                          <div className="bg-indigo-50 p-2 rounded text-center border border-indigo-200">
                            <p className="text-xs text-indigo-700 font-medium">External m²</p>
                            <p className="text-lg font-bold text-indigo-900">
                              {calculateTotalSurfaceArea({
                                outsideDiameterMm: entry.calculation.outsideDiameterMm,
                                insideDiameterMm: calculateInsideDiameter(entry.calculation.outsideDiameterMm, entry.specs.wallThicknessMm),
                                individualPipeLengthM: entry.specs.individualPipeLength || 0,
                                numberOfPipes: entry.calculation?.calculatedPipeCount || 0,
                                hasFlangeEnd1: (entry.specs.pipeEndConfiguration || 'PE') !== 'PE',
                                hasFlangeEnd2: ['FBE', 'FOE_RF', '2X_RF'].includes(entry.specs.pipeEndConfiguration || 'PE'),
                                dn: entry.specs.nominalBoreMm,
                                pressureClass: pressureClassDesignation,
                              }).total.totalExternalAreaM2.toFixed(2)}
                            </p>
                            <p className="text-xs text-indigo-600">coating area</p>
                          </div>
                        );
                      })()}

                      {/* Surface Protection m² - Internal (only show if surface protection selected) */}
                      {showSurfaceProtection && entry.calculation?.outsideDiameterMm && entry.specs.wallThicknessMm && (() => {
                        // Get pressure class - use entry override if available, otherwise global
                        const pressureClassId = entry.specs.flangePressureClassId || globalSpecs?.flangePressureClassId;
                        const pressureClassDesignation = pressureClassId
                          ? masterData.pressureClasses?.find((p: any) => p.id === pressureClassId)?.designation
                          : undefined;
                        return (
                          <div className="bg-purple-50 p-2 rounded text-center border border-purple-200">
                            <p className="text-xs text-purple-700 font-medium">Internal m²</p>
                            <p className="text-lg font-bold text-purple-900">
                              {calculateTotalSurfaceArea({
                                outsideDiameterMm: entry.calculation.outsideDiameterMm,
                                insideDiameterMm: calculateInsideDiameter(entry.calculation.outsideDiameterMm, entry.specs.wallThicknessMm),
                                individualPipeLengthM: entry.specs.individualPipeLength || 0,
                                numberOfPipes: entry.calculation?.calculatedPipeCount || 0,
                                hasFlangeEnd1: (entry.specs.pipeEndConfiguration || 'PE') !== 'PE',
                                hasFlangeEnd2: ['FBE', 'FOE_RF', '2X_RF'].includes(entry.specs.pipeEndConfiguration || 'PE'),
                                dn: entry.specs.nominalBoreMm,
                                pressureClass: pressureClassDesignation,
                              }).total.totalInternalAreaM2.toFixed(2)}
                            </p>
                            <p className="text-xs text-purple-600">lining area</p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Weight breakdown (compact) */}
                    {(entry.calculation.totalBoltWeight > 0 || entry.calculation.totalNutWeight > 0) && (
                      <div className="mt-2 flex gap-4 text-xs text-gray-600 justify-center">
                        {entry.calculation.totalBoltWeight > 0 && (
                          <span>Bolts: {formatWeight(entry.calculation.totalBoltWeight)}</span>
                        )}
                        {entry.calculation.totalNutWeight > 0 && (
                          <span>Nuts: {formatWeight(entry.calculation.totalNutWeight)}</span>
                        )}
                      </div>
                    )}

                    {/* Weld Thickness Recommendation */}
                    {(() => {
                      const dn = entry.specs.nominalBoreMm;
                      const pressure = globalSpecs?.workingPressureBar || 0;
                      const temp = entry.specs.workingTemperatureC || globalSpecs?.workingTemperatureC || 20;
                      const schedule = entry.specs.scheduleNumber;

                      if (!dn || !pressure) return null;

                      const recommendation = recommendWallThicknessCarbonPipe(dn, pressure, temp, schedule);
                      if (!recommendation) return null;

                      return (
                        <div className={`mt-3 p-3 rounded-lg border-2 ${recommendation.isAdequate ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-300'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            {recommendation.isAdequate ? (
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            )}
                            <span className={`text-sm font-semibold ${recommendation.isAdequate ? 'text-green-800' : 'text-amber-800'}`}>
                              Weld Thickness Verification
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div className="text-gray-600">Design Conditions:</div>
                            <div className="font-medium text-gray-900">{pressure} bar @ {temp}°C</div>
                            <div className="text-gray-600">Recommended Schedule:</div>
                            <div className="font-medium text-gray-900">{recommendation.recommendedSchedule}</div>
                            <div className="text-gray-600">Recommended Wall:</div>
                            <div className="font-medium text-gray-900">{recommendation.recommendedWallMm.toFixed(2)} mm</div>
                            <div className="text-gray-600">Max Allowable Pressure:</div>
                            <div className="font-medium text-gray-900">{recommendation.maxPressureBar} bar</div>
                            {schedule && (
                              <>
                                <div className="text-gray-600">Selected Schedule:</div>
                                <div className={`font-medium ${recommendation.isAdequate ? 'text-green-700' : 'text-amber-700'}`}>
                                  {schedule} {recommendation.currentWallMm ? `(${recommendation.currentWallMm.toFixed(2)} mm)` : ''}
                                </div>
                              </>
                            )}
                          </div>
                          {recommendation.warning && (
                            <div className="mt-2 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
                              {recommendation.warning}
                            </div>
                          )}
                          {recommendation.isAdequate && (
                            <div className="mt-2 text-xs text-green-700">
                              Selected schedule meets ASME B31.3 / ASTM A106 requirements
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Surface Area Calculations - Show when surface protection is selected */}
                    {requiredProducts.includes('surface_protection') && entry.specs.outsideDiameterMm && entry.specs.wallThicknessMm && entry.calculation && (
                      (() => {
                        const odMm = entry.specs.outsideDiameterMm;
                        const wtMm = entry.specs.wallThicknessMm;
                        const idMm = calculateInsideDiameter(odMm, wtMm);
                        const pipeEndConfig = entry.specs.pipeEndConfiguration || 'PE';
                        const hasFlangeEnd1 = pipeEndConfig !== 'PE';
                        const hasFlangeEnd2 = ['FBE', 'FOE_RF', '2X_RF'].includes(pipeEndConfig);
                        const individualPipeLengthM = entry.specs.individualPipeLength || 0;
                        const numberOfPipes = entry.calculation.calculatedPipeCount || 0;
                        const dn = entry.specs.nominalBoreMm;

                        const surfaceArea = calculateTotalSurfaceArea({
                          outsideDiameterMm: odMm,
                          insideDiameterMm: idMm,
                          individualPipeLengthM,
                          numberOfPipes,
                          hasFlangeEnd1,
                          hasFlangeEnd2,
                          dn,
                        });

                        const showExternal = globalSpecs?.externalCoatingConfirmed || globalSpecs?.externalCoatingType;
                        const showInternal = globalSpecs?.internalLiningConfirmed || globalSpecs?.internalLiningType;

                        if (!showExternal && !showInternal) return null;

                        return (
                          <div className="mt-3 p-3 rounded-lg border-2 bg-indigo-50 border-indigo-200">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <span className="text-sm font-semibold text-indigo-800">
                                Surface Area for Coating
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {/* External Surface Area */}
                              {showExternal && (
                                <div className="bg-white p-2 rounded border border-indigo-200">
                                  <p className="text-xs font-bold text-indigo-700 mb-1">External Coating Area</p>
                                  <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">Per Pipe:</span>
                                      <span className="font-medium text-gray-900">{surfaceArea.perPipe.totalExternalAreaM2.toFixed(3)} m²</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">Total ({numberOfPipes} pipes):</span>
                                      <span className="font-bold text-indigo-900">{surfaceArea.total.totalExternalAreaM2.toFixed(3)} m²</span>
                                    </div>
                                    {surfaceArea.perPipe.externalFlangeBackAreaM2 > 0 && (
                                      <div className="text-[10px] text-gray-500 mt-1 border-t pt-1">
                                        Includes flange back: {(surfaceArea.perPipe.externalFlangeBackAreaM2 * numberOfPipes).toFixed(3)} m²
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Internal Surface Area */}
                              {showInternal && (
                                <div className="bg-white p-2 rounded border border-indigo-200">
                                  <p className="text-xs font-bold text-indigo-700 mb-1">Internal Lining Area</p>
                                  <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">Per Pipe:</span>
                                      <span className="font-medium text-gray-900">{surfaceArea.perPipe.totalInternalAreaM2.toFixed(3)} m²</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">Total ({numberOfPipes} pipes):</span>
                                      <span className="font-bold text-indigo-900">{surfaceArea.total.totalInternalAreaM2.toFixed(3)} m²</span>
                                    </div>
                                    {surfaceArea.perPipe.internalFlangeFaceAreaM2 > 0 && (
                                      <div className="text-[10px] text-gray-500 mt-1 border-t pt-1">
                                        Includes flange face: {(surfaceArea.perPipe.internalFlangeFaceAreaM2 * numberOfPipes).toFixed(3)} m²
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Combined total */}
                            {showExternal && showInternal && (
                              <div className="mt-2 pt-2 border-t border-indigo-200 flex justify-between text-xs">
                                <span className="text-gray-600 font-medium">Combined Surface Area:</span>
                                <span className="font-bold text-indigo-900">{surfaceArea.total.totalSurfaceAreaM2.toFixed(3)} m²</span>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 p-3 rounded-md">
                    <p className="text-sm text-gray-600 text-center">
                      Fill in pipe specifications to see calculated results
                    </p>
                    {/* Debug info */}
                    <p className="text-xs text-gray-400 text-center mt-1">
                      NB={entry.specs.nominalBoreMm || '-'}, Sch={entry.specs.scheduleNumber || '-'}, Length={entry.specs.individualPipeLength || '-'}, Qty={entry.specs.quantityValue || '-'}
                    </p>
                    {entry.specs.nominalBoreMm && entry.specs.scheduleNumber && entry.specs.individualPipeLength && entry.specs.quantityValue && globalSpecs?.workingPressureBar && (
                      <div className="text-center mt-2">
                        <button
                          type="button"
                          onClick={() => onCalculate && onCalculate()}
                          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Calculate Now
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              </>
            )}
          </div>
        ))}
        </div>

        {/* Total Summary */}
        <div className="border-2 border-blue-200 rounded-md p-3 bg-blue-50">
          {/* Header row with title and add buttons */}
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-base font-bold text-blue-900">Project Summary</h3>
            {/* Add Item Buttons - inline with title */}
            <div className="flex gap-2">
              <button
                onClick={() => onAddEntry()}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 rounded-md border border-blue-300 transition-colors"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-semibold text-blue-700">Pipe</span>
              </button>
              <button
                onClick={() => onAddBendEntry()}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 rounded-md border border-purple-300 transition-colors"
              >
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-semibold text-purple-700">Bend</span>
              </button>
              <button
                onClick={() => onAddFittingEntry()}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-100 hover:bg-green-200 rounded-md border border-green-300 transition-colors"
              >
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-semibold text-green-700">Fitting</span>
              </button>
            </div>
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
                    // For fittings, totalWeight is already total
                    totalWeight = entry.calculation?.totalWeight || 0;
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
                    if (bendEndConfig === 'FBE' || bendEndConfig === 'FOE_RF' || bendEndConfig === '2X_RF' || bendEndConfig === 'LF_BE') {
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
                  const totalStubBoltSets = stubFlangesPerItem * qty;

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
                  // Weight per set = weight for 1 flange (holesPerFlange × weightPerHole)
                  const bnwWeightPerSet = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;
                  const bnwTotalWeight = bnwWeightPerSet * qty;

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

                    // Check for SABS 719 - use item-level steel spec with global fallback
                    const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                    const isSABS719 = steelSpecId === 8;

                    // For SABS 719: use pipe WT directly
                    if (isSABS719) {
                      return { thickness: pipeWallThickness, label: 'SABS 719 WT' };
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
    </div>
  );
}
