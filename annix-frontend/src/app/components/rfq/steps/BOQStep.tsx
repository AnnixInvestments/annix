'use client';

import React from 'react';
import * as XLSX from 'xlsx';
import { RfqFormData, GlobalSpecs } from '@/app/lib/hooks/useRfqForm';
import { flangeWeight as getFlangeWeight, bnwSetInfo as getBnwSetInfo, gasketWeight as getGasketWeight, blankFlangeSurfaceArea } from '@/app/lib/config/rfq';
import { boltSetCountPerBend, boltSetCountPerPipe, boltSetCountPerFitting } from '@/app/lib/config/rfq/pipeEndOptions';

export default function BOQStep({ rfqData, entries, globalSpecs, requiredProducts, masterData, onPrevStep, onSubmit, loading }: {
  rfqData: RfqFormData;
  entries: any[];
  globalSpecs: GlobalSpecs;
  requiredProducts: string[];
  masterData?: any;
  onPrevStep?: () => void;
  onSubmit?: () => void;
  loading?: boolean;
}) {
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Not specified';
    const d = new Date(date);
    return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatWeight = (weight: number | undefined) => {
    if (!weight || isNaN(weight)) return '0.00 kg';
    return `${weight.toFixed(2)} kg`;
  };

  // Get flange spec string
  const getFlangeSpec = (entry: any) => {
    const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
    const flangePressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
    const flangeStandard = flangeStandardId && masterData?.flangeStandards
      ? masterData.flangeStandards.find((s: any) => s.id === flangeStandardId)?.code
      : '';
    const pressureClass = flangePressureClassId && masterData?.pressureClasses
      ? masterData.pressureClasses.find((p: any) => p.id === flangePressureClassId)?.designation
      : '';
    return flangeStandard && pressureClass ? `${flangeStandard} ${pressureClass}` : 'PN16';
  };

  // Get steel spec name
  const getSteelSpecName = (entry: any) => {
    const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
    return steelSpecId && masterData?.steelSpecs
      ? masterData.steelSpecs.find((s: any) => s.id === steelSpecId)?.steelSpecName || 'Steel'
      : 'Steel';
  };

  // ======================
  // CONSOLIDATION LOGIC
  // ======================

  // Extended type for consolidated items with weld and surface area data
  type ConsolidatedItem = {
    description: string;
    qty: number;
    unit: string;
    weight: number;
    entries: string[];
    welds?: Record<string, number>;  // e.g., { "Pipe Weld": 2.5, "Flange Weld": 1.2 }
    intAreaM2?: number;
    extAreaM2?: number;
  };

  // Maps to store consolidated items
  const consolidatedPipes: Map<string, ConsolidatedItem> = new Map();
  const consolidatedBends: Map<string, ConsolidatedItem> = new Map();
  const consolidatedFittings: Map<string, ConsolidatedItem> = new Map();
  const consolidatedFlanges: Map<string, ConsolidatedItem> = new Map();
  const consolidatedBnwSets: Map<string, ConsolidatedItem> = new Map();
  const consolidatedGaskets: Map<string, ConsolidatedItem> = new Map();
  const consolidatedBlankFlanges: Map<string, ConsolidatedItem> = new Map();

  // Helper to get PHYSICAL flange count from end configuration (includes loose flanges)
  // Returns: { fixed: number of weld-neck flanges, loose: number of loose/slip-on flanges, rotating: number of rotating flanges }
  const getPhysicalFlangeCount = (config: string, itemType: string): { fixed: number; loose: number; rotating: number } => {
    // Pipe and Bend configurations
    if (itemType === 'bend' || itemType === 'straight_pipe' || !itemType) {
      switch (config) {
        case 'PE': return { fixed: 0, loose: 0, rotating: 0 };
        case 'FOE': return { fixed: 1, loose: 0, rotating: 0 };
        case 'FBE': return { fixed: 2, loose: 0, rotating: 0 };
        case 'FOE_LF': return { fixed: 1, loose: 1, rotating: 0 }; // 1 fixed + 1 loose = 2 physical flanges
        case 'FOE_RF': return { fixed: 1, loose: 0, rotating: 1 }; // 1 fixed + 1 rotating = 2 physical flanges
        case '2X_RF': return { fixed: 0, loose: 0, rotating: 2 }; // 2 rotating flanges
        case 'LF_BE': return { fixed: 0, loose: 4, rotating: 0 }; // 2 stub-on + 2 loose backing flanges = 4 flanges
        default: return { fixed: 0, loose: 0, rotating: 0 };
      }
    }
    // Fitting configurations
    if (itemType === 'fitting') {
      switch (config) {
        case 'PE': return { fixed: 0, loose: 0, rotating: 0 };
        case 'FAE': return { fixed: 3, loose: 0, rotating: 0 }; // Flanged All Ends (3 fixed)
        case 'F2E': return { fixed: 2, loose: 0, rotating: 0 };
        case 'F2E_LF': return { fixed: 2, loose: 1, rotating: 0 }; // 2 fixed + 1 loose
        case 'F2E_RF': return { fixed: 2, loose: 0, rotating: 1 }; // 2 fixed + 1 rotating
        case '3X_RF': return { fixed: 0, loose: 0, rotating: 3 }; // 3 rotating
        case '2X_RF_FOE': return { fixed: 1, loose: 0, rotating: 2 }; // 1 fixed + 2 rotating
        default: return { fixed: 0, loose: 0, rotating: 0 };
      }
    }
    return { fixed: 0, loose: 0, rotating: 0 };
  };

  // Legacy helper for backward compatibility - returns total main flanges
  const getFlangeCountFromConfig = (config: string, itemType: string): { main: number; branch: number } => {
    const counts = getPhysicalFlangeCount(config, itemType);
    const totalMain = counts.fixed + counts.loose + counts.rotating;
    // For fittings, branch flanges are handled separately
    if (itemType === 'fitting') {
      if (config === 'FAE' || config === 'F2E_LF' || config === 'F2E_RF' || config === '3X_RF' || config === '2X_RF_FOE') {
        return { main: 2, branch: 1 }; // Main run has 2 flanges, branch has 1
      }
      if (config === 'F2E') return { main: 2, branch: 0 };
      if (config === 'PE') return { main: 0, branch: 0 };
      return { main: totalMain, branch: 0 };
    }
    return { main: totalMain, branch: 0 };
  };

  // Process each entry
  entries.forEach((entry) => {
    const itemNumber = entry.clientItemNumber || entry.id;
    const qty = entry.specs?.quantityValue || entry.calculation?.calculatedPipeCount || 1;
    const steelSpec = getSteelSpecName(entry);
    const flangeSpec = getFlangeSpec(entry);

    if (entry.itemType === 'bend') {
      // BEND
      const nb = entry.specs?.nominalBoreMm || 100;
      const angle = entry.specs?.bendDegrees || 90;
      const bendType = entry.specs?.bendRadiusType || entry.specs?.bendType || '1.5D';
      const schedule = entry.specs?.scheduleNumber || '';

      const key = `BEND_${nb}_${angle}_${bendType}_${steelSpec}_${schedule}`;
      const existing = consolidatedBends.get(key);
      const bendWeight = entry.calculation?.totalWeight || ((entry.calculation?.bendWeight || 0) + (entry.calculation?.tangentWeight || 0));

      // Calculate bend weld lengths
      const segments = entry.specs?.numberOfSegments || 5;
      const mitreWelds = segments - 1;
      const od = entry.calculation?.outsideDiameterMm || 0;
      const wt = entry.calculation?.wallThicknessMm || 0;
      const mitreWeldLength = mitreWelds * qty * (Math.PI * od / 1000);

      // Calculate bend surface areas from specs (like ReviewSubmitStep)
      const bendRadiusType = entry.specs?.bendType || entry.specs?.bendRadiusType || '1.5D';
      const radiusFactor = parseFloat(bendRadiusType.replace('D', '')) || 1.5;
      const bendRadiusMm = nb * radiusFactor;
      const bendAngleRad = ((angle) * Math.PI) / 180;
      const arcLengthM = (bendRadiusMm / 1000) * bendAngleRad;

      // Add tangent lengths
      const tangentLengths = entry.specs?.tangentLengths || [];
      let tangentLengthM = 0;
      if (tangentLengths[0]) tangentLengthM += tangentLengths[0] / 1000;
      if (tangentLengths[1]) tangentLengthM += tangentLengths[1] / 1000;

      const totalBendLengthM = arcLengthM + tangentLengthM;
      const odM = od / 1000;
      const idM = (od - 2 * wt) / 1000;
      const extAreaM2 = Math.PI * odM * totalBendLengthM * qty;
      const intAreaM2 = Math.PI * idM * totalBendLengthM * qty;

      // Build welds object
      const welds: Record<string, number> = {};
      if (mitreWeldLength > 0) welds['Mitre Weld'] = mitreWeldLength;

      // Flange welds for bends
      const bendEndConfig = entry.specs?.bendEndConfiguration || 'PE';
      const bendFlangeCount = getFlangeCountFromConfig(bendEndConfig, 'bend');
      if (bendFlangeCount.main > 0) {
        const flangeWeldLength = bendFlangeCount.main * qty * (Math.PI * od / 1000) * 2; // x2 for inside + outside
        if (flangeWeldLength > 0) welds['Flange Weld'] = flangeWeldLength;
      }

      if (existing) {
        existing.qty += qty;
        existing.weight += bendWeight * qty;
        existing.entries.push(itemNumber);
        // Accumulate welds and areas
        if (mitreWeldLength > 0) existing.welds = { ...existing.welds, 'Mitre Weld': (existing.welds?.['Mitre Weld'] || 0) + mitreWeldLength };
        if (welds['Flange Weld']) existing.welds = { ...existing.welds, 'Flange Weld': (existing.welds?.['Flange Weld'] || 0) + welds['Flange Weld'] };
        existing.intAreaM2 = (existing.intAreaM2 || 0) + intAreaM2;
        existing.extAreaM2 = (existing.extAreaM2 || 0) + extAreaM2;
      } else {
        consolidatedBends.set(key, {
          description: `${nb}NB ${angle}° ${bendType} Bend ${steelSpec} ${schedule ? 'Sch' + schedule.replace('Sch', '') : ''}`.trim(),
          qty: qty,
          unit: 'Each',
          weight: bendWeight * qty,
          entries: [itemNumber],
          welds: Object.keys(welds).length > 0 ? welds : undefined,
          intAreaM2: intAreaM2 > 0 ? intAreaM2 : undefined,
          extAreaM2: extAreaM2 > 0 ? extAreaM2 : undefined,
        });
      }

      // Flanges for bends (using bendEndConfig declared above)
      const flangeCount = getFlangeCountFromConfig(bendEndConfig, 'bend');
      if (flangeCount.main > 0) {
        const flangeKey = `FLANGE_${nb}_${flangeSpec}_WN`;
        const existingFlange = consolidatedFlanges.get(flangeKey);
        const flangeQty = flangeCount.main * qty;
        const flangeWeight = getFlangeWeight(nb, flangeSpec.split(' ').pop() || 'PN16');

        if (existingFlange) {
          existingFlange.qty += flangeQty;
          existingFlange.weight += flangeWeight * flangeQty;
          existingFlange.entries.push(itemNumber);
        } else {
          consolidatedFlanges.set(flangeKey, {
            description: `${nb}NB Flange ${flangeSpec}`,
            qty: flangeQty,
            unit: 'Each',
            weight: flangeWeight * flangeQty,
            entries: [itemNumber]
          });
        }

        // BNW for bend flanges - use bolt set count (2 same-sized ends = 1 bolt set)
        const bnwInfo = getBnwSetInfo(nb, flangeSpec.split(' ').pop() || 'PN16');
        const bnwKey = `BNW_${bnwInfo.boltSize}_x${bnwInfo.holesPerFlange}_${nb}NB_${flangeSpec}`;
        const existingBnw = consolidatedBnwSets.get(bnwKey);
        const bnwWeight = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;
        const boltSetQty = boltSetCountPerBend(bendEndConfig) * qty;

        if (existingBnw) {
          existingBnw.qty += boltSetQty;
          existingBnw.weight += bnwWeight * boltSetQty;
          existingBnw.entries.push(itemNumber);
        } else {
          consolidatedBnwSets.set(bnwKey, {
            description: `${bnwInfo.boltSize} BNW Set x${bnwInfo.holesPerFlange} for ${nb}NB ${flangeSpec}`,
            qty: boltSetQty,
            unit: 'sets',
            weight: bnwWeight * boltSetQty,
            entries: [itemNumber]
          });
        }

        // Gaskets for bend flanges
        if (globalSpecs?.gasketType) {
          const gasketKey = `GASKET_${globalSpecs.gasketType}_${nb}NB_${flangeSpec}`;
          const existingGasket = consolidatedGaskets.get(gasketKey);
          const gasketWeight = getGasketWeight(globalSpecs.gasketType, nb);

          if (existingGasket) {
            existingGasket.qty += flangeQty;
            existingGasket.weight += gasketWeight * flangeQty;
            existingGasket.entries.push(itemNumber);
          } else {
            consolidatedGaskets.set(gasketKey, {
              description: `${globalSpecs.gasketType} Gasket ${nb}NB ${flangeSpec}`,
              qty: flangeQty,
              unit: 'Each',
              weight: gasketWeight * flangeQty,
              entries: [itemNumber]
            });
          }
        }
      }

      // Handle stub flanges for bends
      // Stubs always have flanges when they have a nominalBoreMm set
      const stubs = entry.specs?.stubs || [];
      stubs.forEach((stub: any, stubIndex: number) => {
        const stubNb = stub.nominalBoreMm;

        // A stub has a flange if it has a valid NB (stubs are always flanged by design)
        if (stubNb && stubNb > 0) {
          // Stub flange
          const stubFlangeKey = `FLANGE_${stubNb}_${flangeSpec}_WN`;
          const existingStubFlange = consolidatedFlanges.get(stubFlangeKey);
          const stubFlangeWeight = getFlangeWeight(stubNb, flangeSpec.split(' ').pop() || 'PN16');

          if (existingStubFlange) {
            existingStubFlange.qty += qty;
            existingStubFlange.weight += stubFlangeWeight * qty;
            if (!existingStubFlange.entries.includes(itemNumber)) {
              existingStubFlange.entries.push(itemNumber);
            }
          } else {
            consolidatedFlanges.set(stubFlangeKey, {
              description: `${stubNb}NB Flange ${flangeSpec}`,
              qty: qty,
              unit: 'Each',
              weight: stubFlangeWeight * qty,
              entries: [itemNumber]
            });
          }

          // Stub BNW set - each stub flange needs its own bolt set
          const stubBnwInfo = getBnwSetInfo(stubNb, flangeSpec.split(' ').pop() || 'PN16');
          const stubBnwKey = `BNW_${stubBnwInfo.boltSize}_x${stubBnwInfo.holesPerFlange}_${stubNb}NB_${flangeSpec}`;
          const existingStubBnw = consolidatedBnwSets.get(stubBnwKey);
          const stubBnwWeight = stubBnwInfo.weightPerHole * stubBnwInfo.holesPerFlange;

          if (existingStubBnw) {
            existingStubBnw.qty += qty;
            existingStubBnw.weight += stubBnwWeight * qty;
            if (!existingStubBnw.entries.includes(itemNumber)) {
              existingStubBnw.entries.push(itemNumber);
            }
          } else {
            consolidatedBnwSets.set(stubBnwKey, {
              description: `${stubBnwInfo.boltSize} BNW Set x${stubBnwInfo.holesPerFlange} for ${stubNb}NB ${flangeSpec}`,
              qty: qty,
              unit: 'sets',
              weight: stubBnwWeight * qty,
              entries: [itemNumber]
            });
          }

          // Stub gasket
          if (globalSpecs?.gasketType) {
            const stubGasketKey = `GASKET_${globalSpecs.gasketType}_${stubNb}NB_${flangeSpec}`;
            const existingStubGasket = consolidatedGaskets.get(stubGasketKey);
            const stubGasketWeight = getGasketWeight(globalSpecs.gasketType, stubNb);

            if (existingStubGasket) {
              existingStubGasket.qty += qty;
              existingStubGasket.weight += stubGasketWeight * qty;
              if (!existingStubGasket.entries.includes(itemNumber)) {
                existingStubGasket.entries.push(itemNumber);
              }
            } else {
              consolidatedGaskets.set(stubGasketKey, {
                description: `${globalSpecs.gasketType} Gasket ${stubNb}NB ${flangeSpec}`,
                qty: qty,
                unit: 'Each',
                weight: stubGasketWeight * qty,
                entries: [itemNumber]
              });
            }
          }
        }
      });

      // Blank flanges for bends
      if (entry.specs?.addBlankFlange && entry.specs?.blankFlangeCount > 0) {
        const blankNb = entry.specs?.blankFlangeNominalBoreMm || nb;
        const blankFlangeKey = `BLANK_FLANGE_${blankNb}_${flangeSpec}`;
        const existingBlank = consolidatedBlankFlanges.get(blankFlangeKey);
        const blankQty = entry.specs.blankFlangeCount * qty;
        const blankWeight = getFlangeWeight(blankNb, flangeSpec.split(' ').pop() || 'PN16') * 0.6;
        const blankSurfaceArea = blankFlangeSurfaceArea(blankNb);
        const blankExtArea = blankSurfaceArea.external * blankQty;
        const blankIntArea = blankSurfaceArea.internal * blankQty;

        if (existingBlank) {
          existingBlank.qty += blankQty;
          existingBlank.weight += blankWeight * blankQty;
          existingBlank.extAreaM2 = (existingBlank.extAreaM2 || 0) + blankExtArea;
          existingBlank.intAreaM2 = (existingBlank.intAreaM2 || 0) + blankIntArea;
          if (!existingBlank.entries.includes(itemNumber)) {
            existingBlank.entries.push(itemNumber);
          }
        } else {
          consolidatedBlankFlanges.set(blankFlangeKey, {
            description: `${blankNb}NB Blank Flange ${flangeSpec}`,
            qty: blankQty,
            unit: 'Each',
            weight: blankWeight * blankQty,
            entries: [itemNumber],
            extAreaM2: blankExtArea,
            intAreaM2: blankIntArea
          });
        }
      }

    } else if (entry.itemType === 'fitting') {
      // FITTING
      const nb = entry.specs?.nominalDiameterMm || entry.specs?.nominalBoreMm || 100;
      const branchNb = entry.specs?.branchNominalDiameterMm || entry.specs?.branchNominalBoreMm || nb;
      const fittingType = entry.specs?.fittingType || 'TEE';
      const schedule = entry.specs?.scheduleNumber || '';

      const key = `FITTING_${fittingType}_${nb}_${branchNb}_${steelSpec}_${schedule}`;
      const existing = consolidatedFittings.get(key);
      const fittingWeight = entry.calculation?.totalWeight || entry.calculation?.fittingWeight || 0;

      // Format fitting type for display
      let displayType = fittingType.replace(/_/g, ' ').toLowerCase()
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      if (['SHORT_TEE', 'GUSSET_TEE', 'EQUAL_TEE'].includes(fittingType)) {
        displayType = displayType.replace(/Tee/i, 'Equal Tee');
      }

      // Calculate fitting weld lengths and surface areas
      const od = entry.calculation?.outsideDiameterMm || 0;
      const wt = entry.calculation?.wallThicknessMm || 0;
      const fittingEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
      const fittingFlangeCount = getFlangeCountFromConfig(fittingEndConfig, 'fitting');

      // Branch dimensions
      const branchOd = entry.calculation?.branchOutsideDiameterMm || od;
      const branchWt = entry.calculation?.branchWallThicknessMm || wt;

      // Calculate fitting welds (tee weld + flange welds)
      const teeWeldLength = qty * (Math.PI * od / 1000); // One tee weld per fitting
      let flangeWeldLength = 0;
      if (fittingFlangeCount.main > 0) {
        flangeWeldLength = fittingFlangeCount.main * qty * (Math.PI * od / 1000) * 2;
      }
      if (fittingFlangeCount.branch > 0) {
        flangeWeldLength += fittingFlangeCount.branch * qty * (Math.PI * branchOd / 1000) * 2;
      }

      // Calculate fitting surface area from specs (like ReviewSubmitStep)
      const lengthA = entry.specs?.pipeLengthAMm || 0;
      const lengthB = entry.specs?.pipeLengthBMm || 0;
      const teeHeight = entry.specs?.teeHeightMm || entry.calculation?.teeHeightMm || (branchNb * 2);

      // Run length = Section A + Section B
      const runLengthM = (lengthA + lengthB) / 1000;
      // Branch length approximation = tee height or 2x branch OD
      const branchLengthM = teeHeight / 1000;

      const odM = od / 1000;
      const idM = (od - 2 * wt) / 1000;
      const branchOdM = branchOd / 1000;
      const branchIdM = (branchOd - 2 * branchWt) / 1000;

      // Calculate areas (run + branch)
      const runExtArea = Math.PI * odM * runLengthM;
      const branchExtArea = Math.PI * branchOdM * branchLengthM;
      const runIntArea = Math.PI * idM * runLengthM;
      const branchIntArea = Math.PI * branchIdM * branchLengthM;

      const extAreaM2 = qty * (runExtArea + branchExtArea);
      const intAreaM2 = qty * (runIntArea + branchIntArea);

      // Build welds object
      const welds: Record<string, number> = {};
      if (teeWeldLength > 0) welds['Tee Weld'] = teeWeldLength;
      if (flangeWeldLength > 0) welds['Flange Weld'] = flangeWeldLength;

      if (existing) {
        existing.qty += qty;
        existing.weight += fittingWeight * qty;
        existing.entries.push(itemNumber);
        // Accumulate welds and areas
        if (teeWeldLength > 0) existing.welds = { ...existing.welds, 'Tee Weld': (existing.welds?.['Tee Weld'] || 0) + teeWeldLength };
        if (flangeWeldLength > 0) existing.welds = { ...existing.welds, 'Flange Weld': (existing.welds?.['Flange Weld'] || 0) + flangeWeldLength };
        existing.intAreaM2 = (existing.intAreaM2 || 0) + intAreaM2;
        existing.extAreaM2 = (existing.extAreaM2 || 0) + extAreaM2;
      } else {
        consolidatedFittings.set(key, {
          description: `${nb}NB${branchNb !== nb ? 'x' + branchNb + 'NB' : ''} ${displayType} ${steelSpec} ${schedule ? 'Sch' + schedule.replace('Sch', '') : ''}`.trim(),
          qty: qty,
          unit: 'Each',
          weight: fittingWeight * qty,
          entries: [itemNumber],
          welds: Object.keys(welds).length > 0 ? welds : undefined,
          intAreaM2: intAreaM2 > 0 ? intAreaM2 : undefined,
          extAreaM2: extAreaM2 > 0 ? extAreaM2 : undefined,
        });
      }

      // Flanges for fittings (using fittingEndConfig declared above)
      const flangeCount = getFlangeCountFromConfig(fittingEndConfig, 'fitting');
      const isEqualBranch = branchNb === nb;
      const fittingBoltSets = boltSetCountPerFitting(fittingEndConfig, isEqualBranch);

      // Main flanges
      if (flangeCount.main > 0) {
        const flangeKey = `FLANGE_${nb}_${flangeSpec}_WN`;
        const existingFlange = consolidatedFlanges.get(flangeKey);
        const flangeQty = flangeCount.main * qty;
        const flangeWeight = getFlangeWeight(nb, flangeSpec.split(' ').pop() || 'PN16');

        if (existingFlange) {
          existingFlange.qty += flangeQty;
          existingFlange.weight += flangeWeight * flangeQty;
          existingFlange.entries.push(itemNumber);
        } else {
          consolidatedFlanges.set(flangeKey, {
            description: `${nb}NB Flange ${flangeSpec}`,
            qty: flangeQty,
            unit: 'Each',
            weight: flangeWeight * flangeQty,
            entries: [itemNumber]
          });
        }

        // BNW for main flanges - use bolt set count (3 same-sized ends = 2 bolt sets)
        const bnwInfo = getBnwSetInfo(nb, flangeSpec.split(' ').pop() || 'PN16');
        const bnwKey = `BNW_${bnwInfo.boltSize}_x${bnwInfo.holesPerFlange}_${nb}NB_${flangeSpec}`;
        const existingBnw = consolidatedBnwSets.get(bnwKey);
        const bnwWeight = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;
        const mainBoltSetQty = fittingBoltSets.mainBoltSets * qty;

        if (mainBoltSetQty > 0) {
          if (existingBnw) {
            existingBnw.qty += mainBoltSetQty;
            existingBnw.weight += bnwWeight * mainBoltSetQty;
            existingBnw.entries.push(itemNumber);
          } else {
            consolidatedBnwSets.set(bnwKey, {
              description: `${bnwInfo.boltSize} BNW Set x${bnwInfo.holesPerFlange} for ${nb}NB ${flangeSpec}`,
              qty: mainBoltSetQty,
              unit: 'sets',
              weight: bnwWeight * mainBoltSetQty,
              entries: [itemNumber]
            });
          }
        }

        // Gaskets for main flanges
        if (globalSpecs?.gasketType) {
          const gasketKey = `GASKET_${globalSpecs.gasketType}_${nb}NB_${flangeSpec}`;
          const existingGasket = consolidatedGaskets.get(gasketKey);
          const gasketWeight = getGasketWeight(globalSpecs.gasketType, nb);

          if (existingGasket) {
            existingGasket.qty += flangeQty;
            existingGasket.weight += gasketWeight * flangeQty;
            existingGasket.entries.push(itemNumber);
          } else {
            consolidatedGaskets.set(gasketKey, {
              description: `${globalSpecs.gasketType} Gasket ${nb}NB ${flangeSpec}`,
              qty: flangeQty,
              unit: 'Each',
              weight: gasketWeight * flangeQty,
              entries: [itemNumber]
            });
          }
        }
      }

      // Branch flanges (if different NB)
      if (flangeCount.branch > 0) {
        const branchFlangeKey = `FLANGE_${branchNb}_${flangeSpec}_WN`;
        const existingBranchFlange = consolidatedFlanges.get(branchFlangeKey);
        const branchFlangeQty = flangeCount.branch * qty;
        const branchFlangeWeight = getFlangeWeight(branchNb, flangeSpec.split(' ').pop() || 'PN16');

        if (existingBranchFlange) {
          existingBranchFlange.qty += branchFlangeQty;
          existingBranchFlange.weight += branchFlangeWeight * branchFlangeQty;
          existingBranchFlange.entries.push(itemNumber);
        } else {
          consolidatedFlanges.set(branchFlangeKey, {
            description: `${branchNb}NB Flange ${flangeSpec}`,
            qty: branchFlangeQty,
            unit: 'Each',
            weight: branchFlangeWeight * branchFlangeQty,
            entries: [itemNumber]
          });
        }

        // BNW for branch flanges - use bolt set count for branch (only counts when different size)
        const branchBnwInfo = getBnwSetInfo(branchNb, flangeSpec.split(' ').pop() || 'PN16');
        const branchBnwKey = `BNW_${branchBnwInfo.boltSize}_x${branchBnwInfo.holesPerFlange}_${branchNb}NB_${flangeSpec}`;
        const existingBranchBnw = consolidatedBnwSets.get(branchBnwKey);
        const branchBnwWeight = branchBnwInfo.weightPerHole * branchBnwInfo.holesPerFlange;
        const branchBoltSetQty = fittingBoltSets.branchBoltSets * qty;

        if (branchBoltSetQty > 0) {
          if (existingBranchBnw) {
            existingBranchBnw.qty += branchBoltSetQty;
            existingBranchBnw.weight += branchBnwWeight * branchBoltSetQty;
            existingBranchBnw.entries.push(itemNumber);
          } else {
            consolidatedBnwSets.set(branchBnwKey, {
              description: `${branchBnwInfo.boltSize} BNW Set x${branchBnwInfo.holesPerFlange} for ${branchNb}NB ${flangeSpec}`,
              qty: branchBoltSetQty,
              unit: 'sets',
              weight: branchBnwWeight * branchBoltSetQty,
              entries: [itemNumber]
            });
          }
        }

        // Gaskets for branch flanges
        if (globalSpecs?.gasketType) {
          const branchGasketKey = `GASKET_${globalSpecs.gasketType}_${branchNb}NB_${flangeSpec}`;
          const existingBranchGasket = consolidatedGaskets.get(branchGasketKey);
          const branchGasketWeight = getGasketWeight(globalSpecs.gasketType, branchNb);

          if (existingBranchGasket) {
            existingBranchGasket.qty += branchFlangeQty;
            existingBranchGasket.weight += branchGasketWeight * branchFlangeQty;
            existingBranchGasket.entries.push(itemNumber);
          } else {
            consolidatedGaskets.set(branchGasketKey, {
              description: `${globalSpecs.gasketType} Gasket ${branchNb}NB ${flangeSpec}`,
              qty: branchFlangeQty,
              unit: 'Each',
              weight: branchGasketWeight * branchFlangeQty,
              entries: [itemNumber]
            });
          }
        }
      }

      // Blank flanges for fittings
      if (entry.specs?.addBlankFlange && entry.specs?.blankFlangeCount > 0) {
        const blankNb = entry.specs?.blankFlangeNominalBoreMm || nb;
        const blankFlangeKey = `BLANK_FLANGE_${blankNb}_${flangeSpec}`;
        const existingBlank = consolidatedBlankFlanges.get(blankFlangeKey);
        const blankQty = entry.specs.blankFlangeCount * qty;
        const blankWeight = getFlangeWeight(blankNb, flangeSpec.split(' ').pop() || 'PN16') * 0.6;
        const blankSurfaceArea = blankFlangeSurfaceArea(blankNb);
        const blankExtArea = blankSurfaceArea.external * blankQty;
        const blankIntArea = blankSurfaceArea.internal * blankQty;

        if (existingBlank) {
          existingBlank.qty += blankQty;
          existingBlank.weight += blankWeight * blankQty;
          existingBlank.extAreaM2 = (existingBlank.extAreaM2 || 0) + blankExtArea;
          existingBlank.intAreaM2 = (existingBlank.intAreaM2 || 0) + blankIntArea;
          if (!existingBlank.entries.includes(itemNumber)) {
            existingBlank.entries.push(itemNumber);
          }
        } else {
          consolidatedBlankFlanges.set(blankFlangeKey, {
            description: `${blankNb}NB Blank Flange ${flangeSpec}`,
            qty: blankQty,
            unit: 'Each',
            weight: blankWeight * blankQty,
            entries: [itemNumber],
            extAreaM2: blankExtArea,
            intAreaM2: blankIntArea
          });
        }
      }

    } else {
      // STRAIGHT PIPE
      const nb = entry.specs?.nominalBoreMm || 100;
      const schedule = entry.specs?.scheduleNumber || '';
      const pipeLength = entry.specs?.individualPipeLength || 12.192;
      const pipeQty = entry.calculation?.calculatedPipeCount || qty;

      const key = `PIPE_${nb}_${schedule}_${steelSpec}_${pipeLength}`;
      const existing = consolidatedPipes.get(key);
      const pipeWeight = entry.calculation?.totalPipeWeight || 0;

      // Calculate weld lengths from entry calculation
      const pipeEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
      const flangeWeldLength = entry.calculation?.totalFlangeWeldLength || 0;
      const pipeWeldCount = entry.calculation?.pipeWeldsPerUnit || 0;
      const od = entry.calculation?.outsideDiameterMm || 0;
      const pipeWeldLength = pipeWeldCount * pipeQty * (Math.PI * od / 1000); // circumference per weld

      // Calculate surface areas
      const totalLength = entry.calculation?.calculatedTotalLength || pipeLength * pipeQty;
      const wt = entry.calculation?.wallThicknessMm || 0;
      const odM = od / 1000;
      const idM = (od - 2 * wt) / 1000;
      const extAreaM2 = Math.PI * odM * totalLength;
      const intAreaM2 = Math.PI * idM * totalLength;

      // Build welds object
      const welds: Record<string, number> = {};
      if (pipeWeldLength > 0) welds['Pipe Weld'] = pipeWeldLength;
      if (flangeWeldLength > 0) welds['Flange Weld'] = flangeWeldLength;

      if (existing) {
        existing.qty += pipeQty;
        existing.weight += pipeWeight;
        existing.entries.push(itemNumber);
        // Accumulate welds and areas
        if (pipeWeldLength > 0) existing.welds = { ...existing.welds, 'Pipe Weld': (existing.welds?.['Pipe Weld'] || 0) + pipeWeldLength };
        if (flangeWeldLength > 0) existing.welds = { ...existing.welds, 'Flange Weld': (existing.welds?.['Flange Weld'] || 0) + flangeWeldLength };
        existing.intAreaM2 = (existing.intAreaM2 || 0) + intAreaM2;
        existing.extAreaM2 = (existing.extAreaM2 || 0) + extAreaM2;
      } else {
        consolidatedPipes.set(key, {
          description: `${nb}NB ${schedule ? 'Sch' + schedule.replace('Sch', '') : ''} ${steelSpec} Pipe x${pipeLength}m`.trim(),
          qty: pipeQty,
          unit: 'Each',
          weight: pipeWeight,
          entries: [itemNumber],
          welds: Object.keys(welds).length > 0 ? welds : undefined,
          intAreaM2: intAreaM2 > 0 ? intAreaM2 : undefined,
          extAreaM2: extAreaM2 > 0 ? extAreaM2 : undefined,
        });
      }

      // Flanges for pipes (using pipeEndConfig declared above)
      const flangeCount = getFlangeCountFromConfig(pipeEndConfig, 'pipe');
      if (flangeCount.main > 0) {
        const flangeKey = `FLANGE_${nb}_${flangeSpec}_WN`;
        const existingFlange = consolidatedFlanges.get(flangeKey);
        const flangeQty = flangeCount.main * pipeQty;
        const flangeWeight = getFlangeWeight(nb, flangeSpec.split(' ').pop() || 'PN16');

        if (existingFlange) {
          existingFlange.qty += flangeQty;
          existingFlange.weight += flangeWeight * flangeQty;
          existingFlange.entries.push(itemNumber);
        } else {
          consolidatedFlanges.set(flangeKey, {
            description: `${nb}NB Flange ${flangeSpec}`,
            qty: flangeQty,
            unit: 'Each',
            weight: flangeWeight * flangeQty,
            entries: [itemNumber]
          });
        }

        // BNW for pipe flanges - use bolt set count (2 same-sized ends = 1 bolt set)
        const bnwInfo = getBnwSetInfo(nb, flangeSpec.split(' ').pop() || 'PN16');
        const bnwKey = `BNW_${bnwInfo.boltSize}_x${bnwInfo.holesPerFlange}_${nb}NB_${flangeSpec}`;
        const existingBnw = consolidatedBnwSets.get(bnwKey);
        const bnwWeight = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;
        const pipeBoltSetQty = boltSetCountPerPipe(pipeEndConfig) * pipeQty;

        if (pipeBoltSetQty > 0) {
          if (existingBnw) {
            existingBnw.qty += pipeBoltSetQty;
            existingBnw.weight += bnwWeight * pipeBoltSetQty;
            existingBnw.entries.push(itemNumber);
          } else {
            consolidatedBnwSets.set(bnwKey, {
              description: `${bnwInfo.boltSize} BNW Set x${bnwInfo.holesPerFlange} for ${nb}NB ${flangeSpec}`,
              qty: pipeBoltSetQty,
              unit: 'sets',
              weight: bnwWeight * pipeBoltSetQty,
              entries: [itemNumber]
            });
          }
        }

        // Gaskets for pipe flanges
        if (globalSpecs?.gasketType) {
          const gasketKey = `GASKET_${globalSpecs.gasketType}_${nb}NB_${flangeSpec}`;
          const existingGasket = consolidatedGaskets.get(gasketKey);
          const gasketWeight = getGasketWeight(globalSpecs.gasketType, nb);

          if (existingGasket) {
            existingGasket.qty += flangeQty;
            existingGasket.weight += gasketWeight * flangeQty;
            existingGasket.entries.push(itemNumber);
          } else {
            consolidatedGaskets.set(gasketKey, {
              description: `${globalSpecs.gasketType} Gasket ${nb}NB ${flangeSpec}`,
              qty: flangeQty,
              unit: 'Each',
              weight: gasketWeight * flangeQty,
              entries: [itemNumber]
            });
          }
        }
      }

      // Blank flanges
      if (entry.specs?.addBlankFlange && entry.specs?.blankFlangeCount > 0) {
        const blankNb = entry.specs?.blankFlangeNominalBoreMm || nb;
        const blankFlangeKey = `BLANK_FLANGE_${blankNb}_${flangeSpec}`;
        const existingBlank = consolidatedBlankFlanges.get(blankFlangeKey);
        const blankQty = entry.specs.blankFlangeCount * pipeQty;
        const blankWeight = getFlangeWeight(blankNb, flangeSpec.split(' ').pop() || 'PN16') * 0.6;
        const blankSurfaceArea = blankFlangeSurfaceArea(blankNb);
        const blankExtArea = blankSurfaceArea.external * blankQty;
        const blankIntArea = blankSurfaceArea.internal * blankQty;

        if (existingBlank) {
          existingBlank.qty += blankQty;
          existingBlank.weight += blankWeight * blankQty;
          existingBlank.extAreaM2 = (existingBlank.extAreaM2 || 0) + blankExtArea;
          existingBlank.intAreaM2 = (existingBlank.intAreaM2 || 0) + blankIntArea;
          existingBlank.entries.push(itemNumber);
        } else {
          consolidatedBlankFlanges.set(blankFlangeKey, {
            description: `${blankNb}NB Blank Flange ${flangeSpec}`,
            qty: blankQty,
            unit: 'Each',
            weight: blankWeight * blankQty,
            entries: [itemNumber],
            extAreaM2: blankExtArea,
            intAreaM2: blankIntArea
          });
        }
      }
    }
  });

  // Calculate totals
  let totalWeight = 0;
  consolidatedPipes.forEach(item => totalWeight += item.weight);
  consolidatedBends.forEach(item => totalWeight += item.weight);
  consolidatedFittings.forEach(item => totalWeight += item.weight);
  consolidatedFlanges.forEach(item => totalWeight += item.weight);
  consolidatedBnwSets.forEach(item => totalWeight += item.weight);
  consolidatedGaskets.forEach(item => totalWeight += item.weight);
  consolidatedBlankFlanges.forEach(item => totalWeight += item.weight);

  // Dark mode background mapping for header rows
  const darkBgMap: Record<string, string> = {
    'bg-blue-50': 'dark:bg-blue-900/30',
    'bg-purple-50': 'dark:bg-purple-900/30',
    'bg-green-50': 'dark:bg-green-900/30',
    'bg-cyan-50': 'dark:bg-cyan-900/30',
    'bg-gray-50': 'dark:bg-gray-800/50',
    'bg-orange-50': 'dark:bg-orange-900/30',
    'bg-teal-50': 'dark:bg-teal-900/30',
  };

  // Dark mode text color mapping
  const darkTextMap: Record<string, string> = {
    'text-blue-700': 'dark:text-blue-300',
    'text-purple-700': 'dark:text-purple-300',
    'text-green-700': 'dark:text-green-300',
    'text-cyan-700': 'dark:text-cyan-300',
    'text-gray-700': 'dark:text-gray-300',
    'text-orange-700': 'dark:text-orange-300',
    'text-teal-700': 'dark:text-teal-300',
  };

  // Render consolidated BOQ table with consistent columns
  const renderConsolidatedTable = (
    title: string,
    items: Map<string, { description: string; qty: number; unit: string; weight: number; entries: string[]; welds?: Record<string, number>; intAreaM2?: number; extAreaM2?: number }>,
    bgColor: string,
    textColor: string,
    showWeldColumns: boolean = false,
    showAreaColumns: boolean = false
  ) => {
    if (items.size === 0) return null;

    const itemsArray = Array.from(items.values());
    const sectionWeight = itemsArray.reduce((sum, item) => sum + item.weight, 0);
    const sectionTotalQty = itemsArray.reduce((sum, item) => sum + item.qty, 0);

    // Collect all unique weld types across items
    const allWeldTypes = new Set<string>();
    if (showWeldColumns) {
      itemsArray.forEach(item => {
        if (item.welds) {
          Object.keys(item.welds).forEach(wt => allWeldTypes.add(wt));
        }
      });
    }
    const weldTypesList = Array.from(allWeldTypes);

    // Check if any items have area data
    const hasAreaData = showAreaColumns && itemsArray.some(item => (item.intAreaM2 && item.intAreaM2 > 0) || (item.extAreaM2 && item.extAreaM2 > 0));

    // Get dark mode variants
    const darkBg = darkBgMap[bgColor] || 'dark:bg-gray-800/50';
    const darkText = darkTextMap[textColor] || 'dark:text-gray-300';

    return (
      <div className="mb-6">
        <h4 className={`text-md font-semibold ${textColor} ${darkText} mb-2 flex items-center justify-between`}>
          <span>{title} ({sectionTotalQty} total, {items.size} {items.size === 1 ? 'type' : 'types'})</span>
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">Section Weight: {formatWeight(sectionWeight)}</span>
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse table-fixed">
            <thead>
              <tr className={`${bgColor} ${darkBg} border-b-2 border-gray-300 dark:border-gray-600`}>
                <th className={`text-left py-2 px-2 font-semibold text-xs ${textColor} ${darkText} w-20`}>From</th>
                <th className={`text-center py-2 px-2 font-semibold ${textColor} ${darkText} w-10`}>#</th>
                <th className={`text-left py-2 px-2 font-semibold ${textColor} ${darkText}`}>Description</th>
                <th className={`text-center py-2 px-2 font-semibold ${textColor} ${darkText} w-14`}>Qty</th>
                <th className={`text-center py-2 px-2 font-semibold ${textColor} ${darkText} w-14`}>Unit</th>
                {showWeldColumns && (
                  <th className={`text-right py-2 px-2 font-semibold text-xs ${textColor} ${darkText} w-20`}>Weld (m)</th>
                )}
                {showAreaColumns && (
                  <>
                    <th className={`text-right py-2 px-2 font-semibold text-xs ${textColor} ${darkText} w-16`}>Int m²</th>
                    <th className={`text-right py-2 px-2 font-semibold text-xs ${textColor} ${darkText} w-16`}>Ext m²</th>
                  </>
                )}
                <th className={`text-right py-2 px-2 font-semibold ${textColor} ${darkText} w-24`}>Weight</th>
              </tr>
            </thead>
            <tbody>
              {itemsArray.map((item, idx) => {
                const totalWeld = item.welds ? Object.values(item.welds).reduce((sum, v) => sum + v, 0) : 0;
                const rowBg = idx % 2 === 0
                  ? 'bg-transparent'
                  : 'bg-gray-50 dark:bg-gray-800/30';
                return (
                  <tr
                    key={idx}
                    className={`border-b border-gray-200 dark:border-gray-700 ${rowBg} hover:bg-gray-100 dark:hover:bg-gray-700/50`}
                  >
                    <td className="py-2 px-2 text-xs text-gray-600 dark:text-gray-400 truncate" title={item.entries.join(', ')}>{item.entries.join(', ')}</td>
                    <td className="py-2 px-2 text-center text-gray-900 dark:text-gray-100">{idx + 1}</td>
                    <td className="py-2 px-2 text-gray-900 dark:text-gray-100 truncate" title={item.description}>{item.description}</td>
                    <td className="py-2 px-2 text-center font-medium text-gray-900 dark:text-gray-100">{item.qty}</td>
                    <td className="py-2 px-2 text-center text-gray-700 dark:text-gray-300">{item.unit}</td>
                    {showWeldColumns && (
                      <td className="py-2 px-2 text-right text-xs text-gray-700 dark:text-gray-300">{totalWeld > 0 ? totalWeld.toFixed(1) : '-'}</td>
                    )}
                    {showAreaColumns && (
                      <>
                        <td className="py-2 px-2 text-right text-xs text-gray-700 dark:text-gray-300">{item.intAreaM2 ? item.intAreaM2.toFixed(2) : '-'}</td>
                        <td className="py-2 px-2 text-right text-xs text-gray-700 dark:text-gray-300">{item.extAreaM2 ? item.extAreaM2.toFixed(2) : '-'}</td>
                      </>
                    )}
                    <td className="py-2 px-2 text-right text-gray-900 dark:text-gray-100">{formatWeight(item.weight)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Excel Export function
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Helper to convert Map to array for Excel (for individual sheets)
    const mapToExcelData = (
      items: Map<string, ConsolidatedItem>,
      sectionName: string,
      includeWelds: boolean = false,
      includeAreas: boolean = false
    ) => {
      const data: any[] = [];
      let rowNum = 1;

      // Collect all weld types if needed
      const allWeldTypes = new Set<string>();
      if (includeWelds) {
        Array.from(items.values()).forEach(item => {
          if (item.welds) {
            Object.keys(item.welds).forEach(wt => allWeldTypes.add(wt));
          }
        });
      }
      const weldTypesList = Array.from(allWeldTypes);

      Array.from(items.values()).forEach(item => {
        const row: any = {
          'From Items': item.entries.join(', '),
          '#': rowNum++,
          'Description': item.description,
          'Qty': item.qty,
          'Unit': item.unit,
        };

        // Add weld columns
        if (includeWelds) {
          weldTypesList.forEach(wt => {
            row[`${wt} (m)`] = item.welds?.[wt]?.toFixed(2) || '';
          });
        }

        // Add area columns
        if (includeAreas) {
          row['Int m²'] = item.intAreaM2?.toFixed(2) || '';
          row['Ext m²'] = item.extAreaM2?.toFixed(2) || '';
        }

        row['Weight (kg)'] = item.weight.toFixed(2);
        data.push(row);
      });

      return data;
    };

    // Create combined BOQ sheet with all items
    const combinedData: any[] = [];
    let globalRowNum = 1;

    const addToCombined = (items: Map<string, ConsolidatedItem>, category: string) => {
      Array.from(items.values()).forEach(item => {
        const totalWeld = item.welds ? Object.values(item.welds).reduce((sum, v) => sum + v, 0) : 0;
        combinedData.push({
          '#': globalRowNum++,
          'Category': category,
          'Description': item.description,
          'Qty': item.qty,
          'Unit': item.unit,
          'Weld (m)': totalWeld > 0 ? totalWeld.toFixed(2) : '',
          'Int m²': item.intAreaM2?.toFixed(2) || '',
          'Ext m²': item.extAreaM2?.toFixed(2) || '',
          'Weight (kg)': item.weight.toFixed(2),
          'From Items': item.entries.join(', '),
        });
      });
    };

    // Add all categories to combined sheet
    addToCombined(consolidatedPipes, 'Straight Pipes');
    addToCombined(consolidatedBends, 'Bends');
    addToCombined(consolidatedFittings, 'Fittings');
    addToCombined(consolidatedFlanges, 'Flanges');
    addToCombined(consolidatedBlankFlanges, 'Blank Flanges');
    addToCombined(consolidatedBnwSets, 'BNW Sets');
    addToCombined(consolidatedGaskets, 'Gaskets');

    // Add Combined BOQ as first sheet
    if (combinedData.length > 0) {
      const combinedWs = XLSX.utils.json_to_sheet(combinedData);
      XLSX.utils.book_append_sheet(workbook, combinedWs, 'Combined BOQ');
    }

    // Add sheets for each category
    if (consolidatedPipes.size > 0) {
      const pipesData = mapToExcelData(consolidatedPipes, 'Straight Pipes', true, true);
      const ws = XLSX.utils.json_to_sheet(pipesData);
      XLSX.utils.book_append_sheet(workbook, ws, 'Straight Pipes');
    }

    if (consolidatedBends.size > 0) {
      const bendsData = mapToExcelData(consolidatedBends, 'Bends', true, true);
      const ws = XLSX.utils.json_to_sheet(bendsData);
      XLSX.utils.book_append_sheet(workbook, ws, 'Bends');
    }

    if (consolidatedFittings.size > 0) {
      const fittingsData = mapToExcelData(consolidatedFittings, 'Fittings', true, true);
      const ws = XLSX.utils.json_to_sheet(fittingsData);
      XLSX.utils.book_append_sheet(workbook, ws, 'Fittings');
    }

    if (consolidatedFlanges.size > 0) {
      const flangesData = mapToExcelData(consolidatedFlanges, 'Flanges');
      const ws = XLSX.utils.json_to_sheet(flangesData);
      XLSX.utils.book_append_sheet(workbook, ws, 'Flanges');
    }

    if (consolidatedBlankFlanges.size > 0) {
      const blankFlangesData = mapToExcelData(consolidatedBlankFlanges, 'Blank Flanges', false, true);
      const ws = XLSX.utils.json_to_sheet(blankFlangesData);
      XLSX.utils.book_append_sheet(workbook, ws, 'Blank Flanges');
    }

    if (consolidatedBnwSets.size > 0) {
      const bnwData = mapToExcelData(consolidatedBnwSets, 'BNW Sets');
      const ws = XLSX.utils.json_to_sheet(bnwData);
      XLSX.utils.book_append_sheet(workbook, ws, 'BNW Sets');
    }

    if (consolidatedGaskets.size > 0) {
      const gasketsData = mapToExcelData(consolidatedGaskets, 'Gaskets');
      const ws = XLSX.utils.json_to_sheet(gasketsData);
      XLSX.utils.book_append_sheet(workbook, ws, 'Gaskets');
    }

    // Calculate total quantities for summary
    const totalPipeQty = Array.from(consolidatedPipes.values()).reduce((sum, item) => sum + item.qty, 0);
    const totalBendQty = Array.from(consolidatedBends.values()).reduce((sum, item) => sum + item.qty, 0);
    const totalFittingQty = Array.from(consolidatedFittings.values()).reduce((sum, item) => sum + item.qty, 0);
    const totalFlangeQty = Array.from(consolidatedFlanges.values()).reduce((sum, item) => sum + item.qty, 0);
    const totalBlankFlangeQty = Array.from(consolidatedBlankFlanges.values()).reduce((sum, item) => sum + item.qty, 0);
    const totalBnwSetQty = Array.from(consolidatedBnwSets.values()).reduce((sum, item) => sum + item.qty, 0);
    const totalGasketQty = Array.from(consolidatedGaskets.values()).reduce((sum, item) => sum + item.qty, 0);

    // Add a summary sheet
    const summaryData = [
      { 'Category': 'Project', 'Value': rfqData.projectName || 'Untitled' },
      { 'Category': 'Customer', 'Value': rfqData.customerName || '-' },
      { 'Category': 'Total Items', 'Value': entries.length },
      { 'Category': 'Total Estimated Weight (kg)', 'Value': totalWeight.toFixed(2) },
      { 'Category': '', 'Value': '' },
      { 'Category': 'Section', 'Value': 'Total Qty' },
      { 'Category': 'Straight Pipes', 'Value': totalPipeQty },
      { 'Category': 'Bends', 'Value': totalBendQty },
      { 'Category': 'Fittings', 'Value': totalFittingQty },
      { 'Category': 'Flanges', 'Value': totalFlangeQty },
      { 'Category': 'Blank Flanges', 'Value': totalBlankFlangeQty },
      { 'Category': 'BNW Sets', 'Value': totalBnwSetQty },
      { 'Category': 'Gaskets', 'Value': totalGasketQty },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWs, 'Summary');

    // Generate filename with project name and date
    const projectName = (rfqData.projectName || 'BOQ').replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${projectName}_BOQ_${dateStr}.xlsx`;

    // Write and download
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Bill of Quantities (BOQ)</h2>
            <p className="text-gray-600">Consolidated Material Requirements - Similar items pooled together</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Project</p>
            <p className="text-xl font-bold text-blue-600">{rfqData.projectName || 'Untitled'}</p>
          </div>
        </div>
      </div>

      {/* Project Info Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
          <div>
            <p className="text-gray-500 font-medium">Customer</p>
            <p className="text-gray-900">{rfqData.customerName || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Steel Spec</p>
            <p className="font-medium">{(() => {
              // Get effective steel spec for each item (item override or global fallback)
              const getEffectiveSteelSpecId = (entry: any) => entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
              const effectiveSpecs = entries.map((entry: any) => getEffectiveSteelSpecId(entry)).filter(Boolean);

              // If no specs from entries, try global directly
              if (effectiveSpecs.length === 0) {
                if (globalSpecs?.steelSpecificationId) {
                  return masterData?.steelSpecs?.find((s: any) => s.id === globalSpecs.steelSpecificationId)?.steelSpecName || '-';
                }
                return '-';
              }

              const firstSpec = effectiveSpecs[0];
              const allSame = effectiveSpecs.every((id: number) => id === firstSpec);
              if (allSame) {
                return masterData?.steelSpecs?.find((s: any) => s.id === firstSpec)?.steelSpecName || '-';
              }
              return 'SEE IN ITEM';
            })()}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Flange Standard</p>
            <p className="text-gray-900">{(() => {
              // Get effective flange standard for each item
              const getEffectiveFlangeStdId = (entry: any) => entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
              const getEffectivePressureClassId = (entry: any) => entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
              const effectiveFlanges = entries.map((entry: any) => ({
                stdId: getEffectiveFlangeStdId(entry),
                pcId: getEffectivePressureClassId(entry)
              })).filter((f: any) => f.stdId);

              // If no specs from entries, try global directly
              if (effectiveFlanges.length === 0) {
                if (globalSpecs?.flangeStandardId) {
                  const flangeCode = masterData?.flangeStandards?.find((s: any) => s.id === globalSpecs.flangeStandardId)?.code || '';
                  const pressureClass = globalSpecs?.flangePressureClassId
                    ? masterData?.pressureClasses?.find((p: any) => p.id === globalSpecs.flangePressureClassId)?.designation || ''
                    : '';
                  return (flangeCode + (pressureClass ? ' ' + pressureClass : '')).trim() || '-';
                }
                return '-';
              }

              const firstFlange = effectiveFlanges[0];
              const allSame = effectiveFlanges.every((f: any) => f.stdId === firstFlange.stdId && f.pcId === firstFlange.pcId);
              if (allSame) {
                const flangeCode = masterData?.flangeStandards?.find((s: any) => s.id === firstFlange.stdId)?.code || '';
                const pressureClass = masterData?.pressureClasses?.find((p: any) => p.id === firstFlange.pcId)?.designation || '';
                return (flangeCode + (pressureClass ? ' ' + pressureClass : '')).trim() || '-';
              }
              return 'SEE IN ITEM';
            })()}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Bolts & Nuts</p>
            <p className="text-gray-900">ISO 4014/4032 Gr 8.8 HDG</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Gasket Type</p>
            <p className="text-gray-900">{globalSpecs?.gasketType || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Total Items</p>
            <p className="text-gray-900">{entries.length} line items</p>
          </div>
        </div>
      </div>

      {/* Consolidated BOQ Tables */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
          Consolidated Bill of Quantities
        </h3>

        {/* Pipes - show weld and area columns */}
        {renderConsolidatedTable('Straight Pipes', consolidatedPipes, 'bg-blue-50', 'text-blue-700', true, true)}

        {/* Bends - show weld and area columns */}
        {renderConsolidatedTable('Bends', consolidatedBends, 'bg-purple-50', 'text-purple-700', true, true)}

        {/* Fittings - show weld and area columns */}
        {renderConsolidatedTable('Fittings (Tees, Laterals, Reducers)', consolidatedFittings, 'bg-green-50', 'text-green-700', true, true)}

        {/* Flanges */}
        {renderConsolidatedTable('Flanges', consolidatedFlanges, 'bg-cyan-50', 'text-cyan-700', false, false)}

        {/* Blank Flanges - show area columns */}
        {renderConsolidatedTable('Blank Flanges', consolidatedBlankFlanges, 'bg-gray-50', 'text-gray-700', false, true)}

        {/* BNW Sets - always show if there are flanges */}
        {(requiredProducts.includes('fasteners_gaskets') || consolidatedFlanges.size > 0 || consolidatedBlankFlanges.size > 0) && renderConsolidatedTable('Bolt, Nut & Washer Sets', consolidatedBnwSets, 'bg-orange-50', 'text-orange-700', false, false)}

        {/* Gaskets - always show if there are flanges */}
        {(requiredProducts.includes('fasteners_gaskets') || consolidatedFlanges.size > 0 || consolidatedBlankFlanges.size > 0) && renderConsolidatedTable('Gaskets', consolidatedGaskets, 'bg-teal-50', 'text-teal-700', false, false)}

        {/* Total Weight Summary */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center text-lg">
            <span className="font-semibold text-gray-700">Total Estimated Weight:</span>
            <span className="font-bold text-green-600">{formatWeight(totalWeight)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
        <p><strong className="text-gray-700">Note:</strong> This BOQ consolidates similar items across all line items. The "From Items" column shows which original line items contribute to each consolidated entry. Weights are estimates based on standard dimensions.</p>
      </div>

      {/* Navigation & Actions */}
      <div className="flex justify-between items-center gap-4 pt-4 border-t border-gray-200">
        <div className="flex gap-4">
          {onPrevStep && (
            <button
              onClick={onPrevStep}
              disabled={loading}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors font-semibold disabled:opacity-50"
            >
              ← Back to Review
            </button>
          )}
        </div>
        <div className="flex gap-4">
          <button
            onClick={exportToExcel}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2 text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors flex items-center gap-2 text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print BOQ
          </button>
          {onSubmit && (
            <button
              onClick={onSubmit}
              disabled={loading}
              className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  Submit RFQ for Quotation
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
