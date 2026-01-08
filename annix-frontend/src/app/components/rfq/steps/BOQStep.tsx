'use client';

import React from 'react';
import * as XLSX from 'xlsx';
import { RfqFormData, GlobalSpecs } from '@/app/lib/hooks/useRfqForm';
import { flangeWeight as getFlangeWeight, bnwSetInfo as getBnwSetInfo, gasketWeight as getGasketWeight } from '@/app/lib/config/rfq';

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

  // Helper to get flange count from end configuration
  const getFlangeCountFromConfig = (config: string, itemType: string): { main: number; branch: number } => {
    if (itemType === 'fitting') {
      if (config === 'F2E' || config === 'F2E_LF' || config === 'F2E_RF') return { main: 2, branch: 0 };
      if (config === '3X_RF' || config === '2X_RF_FOE') return { main: 2, branch: 1 };
      if (config !== 'PE') return { main: 1, branch: 0 };
      return { main: 0, branch: 0 };
    } else if (itemType === 'bend') {
      if (config === 'FBE') return { main: 2, branch: 0 };
      if (config === 'FOE' || config === 'FOE_LF' || config === 'FOE_RF') return { main: 1, branch: 0 };
      if (config === '2X_RF') return { main: 2, branch: 0 };
      return { main: 0, branch: 0 };
    } else {
      // Straight pipe
      if (config === 'FBE' || config === '2X_RF') return { main: 2, branch: 0 };
      if (config === 'FOE' || config === 'FOE_LF' || config === 'FOE_RF') return { main: 1, branch: 0 };
      return { main: 0, branch: 0 };
    }
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
      const bendWeight = (entry.calculation?.bendWeight || 0) + (entry.calculation?.tangentWeight || 0);

      // Calculate bend weld lengths
      const segments = entry.specs?.numberOfSegments || 5;
      const mitreWelds = segments - 1;
      const od = entry.calculation?.outsideDiameterMm || 0;
      const wt = entry.calculation?.wallThicknessMm || 0;
      const mitreWeldLength = mitreWelds * qty * (Math.PI * od / 1000);

      // Calculate bend surface areas (approximation based on arc length)
      const arcLength = entry.calculation?.arcLength || 0;
      const tangent1 = entry.calculation?.tangent1Length || 0;
      const tangent2 = entry.calculation?.tangent2Length || 0;
      const totalBendLength = (arcLength + tangent1 + tangent2) / 1000; // convert to meters
      const odM = od / 1000;
      const idM = (od - 2 * wt) / 1000;
      const extAreaM2 = Math.PI * odM * totalBendLength * qty;
      const intAreaM2 = Math.PI * idM * totalBendLength * qty;

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

        // BNW for bend flanges
        const bnwInfo = getBnwSetInfo(nb, flangeSpec.split(' ').pop() || 'PN16');
        const bnwKey = `BNW_${bnwInfo.boltSize}_x${bnwInfo.holesPerFlange}_${nb}NB_${flangeSpec}`;
        const existingBnw = consolidatedBnwSets.get(bnwKey);
        const bnwWeight = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;

        if (existingBnw) {
          existingBnw.qty += flangeQty;
          existingBnw.weight += bnwWeight * flangeQty;
          existingBnw.entries.push(itemNumber);
        } else {
          consolidatedBnwSets.set(bnwKey, {
            description: `${bnwInfo.boltSize} BNW Set x${bnwInfo.holesPerFlange} for ${nb}NB ${flangeSpec}`,
            qty: flangeQty,
            unit: 'sets',
            weight: bnwWeight * flangeQty,
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

    } else if (entry.itemType === 'fitting') {
      // FITTING
      const nb = entry.specs?.nominalDiameterMm || entry.specs?.nominalBoreMm || 100;
      const branchNb = entry.specs?.branchNominalDiameterMm || entry.specs?.branchNominalBoreMm || nb;
      const fittingType = entry.specs?.fittingType || 'TEE';
      const schedule = entry.specs?.scheduleNumber || '';

      const key = `FITTING_${fittingType}_${nb}_${branchNb}_${steelSpec}_${schedule}`;
      const existing = consolidatedFittings.get(key);
      const fittingWeight = entry.calculation?.fittingWeight || 0;

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

      // Calculate fitting welds (tee weld + flange welds)
      const teeWeldLength = qty * (Math.PI * od / 1000); // One tee weld per fitting
      let flangeWeldLength = 0;
      if (fittingFlangeCount.main > 0) {
        flangeWeldLength = fittingFlangeCount.main * qty * (Math.PI * od / 1000) * 2;
      }
      if (fittingFlangeCount.branch > 0) {
        const branchOd = entry.calculation?.branchOutsideDiameterMm || od;
        flangeWeldLength += fittingFlangeCount.branch * qty * (Math.PI * branchOd / 1000) * 2;
      }

      // Estimate fitting surface area (simplified: main run + branch)
      const runLength = (entry.calculation?.runLength || 0) / 1000;
      const branchLength = (entry.calculation?.branchLength || 0) / 1000;
      const branchOd = entry.calculation?.branchOutsideDiameterMm || od;
      const branchWt = entry.calculation?.branchWallThicknessMm || wt;
      const odM = od / 1000;
      const idM = (od - 2 * wt) / 1000;
      const branchOdM = branchOd / 1000;
      const branchIdM = (branchOd - 2 * branchWt) / 1000;
      const extAreaM2 = qty * (Math.PI * odM * runLength + Math.PI * branchOdM * branchLength);
      const intAreaM2 = qty * (Math.PI * idM * runLength + Math.PI * branchIdM * branchLength);

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

        // BNW for main flanges
        const bnwInfo = getBnwSetInfo(nb, flangeSpec.split(' ').pop() || 'PN16');
        const bnwKey = `BNW_${bnwInfo.boltSize}_x${bnwInfo.holesPerFlange}_${nb}NB_${flangeSpec}`;
        const existingBnw = consolidatedBnwSets.get(bnwKey);
        const bnwWeight = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;

        if (existingBnw) {
          existingBnw.qty += flangeQty;
          existingBnw.weight += bnwWeight * flangeQty;
          existingBnw.entries.push(itemNumber);
        } else {
          consolidatedBnwSets.set(bnwKey, {
            description: `${bnwInfo.boltSize} BNW Set x${bnwInfo.holesPerFlange} for ${nb}NB ${flangeSpec}`,
            qty: flangeQty,
            unit: 'sets',
            weight: bnwWeight * flangeQty,
            entries: [itemNumber]
          });
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

        // BNW for branch flanges
        const branchBnwInfo = getBnwSetInfo(branchNb, flangeSpec.split(' ').pop() || 'PN16');
        const branchBnwKey = `BNW_${branchBnwInfo.boltSize}_x${branchBnwInfo.holesPerFlange}_${branchNb}NB_${flangeSpec}`;
        const existingBranchBnw = consolidatedBnwSets.get(branchBnwKey);
        const branchBnwWeight = branchBnwInfo.weightPerHole * branchBnwInfo.holesPerFlange;

        if (existingBranchBnw) {
          existingBranchBnw.qty += branchFlangeQty;
          existingBranchBnw.weight += branchBnwWeight * branchFlangeQty;
          existingBranchBnw.entries.push(itemNumber);
        } else {
          consolidatedBnwSets.set(branchBnwKey, {
            description: `${branchBnwInfo.boltSize} BNW Set x${branchBnwInfo.holesPerFlange} for ${branchNb}NB ${flangeSpec}`,
            qty: branchFlangeQty,
            unit: 'sets',
            weight: branchBnwWeight * branchFlangeQty,
            entries: [itemNumber]
          });
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

        // BNW for pipe flanges
        const bnwInfo = getBnwSetInfo(nb, flangeSpec.split(' ').pop() || 'PN16');
        const bnwKey = `BNW_${bnwInfo.boltSize}_x${bnwInfo.holesPerFlange}_${nb}NB_${flangeSpec}`;
        const existingBnw = consolidatedBnwSets.get(bnwKey);
        const bnwWeight = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;

        if (existingBnw) {
          existingBnw.qty += flangeQty;
          existingBnw.weight += bnwWeight * flangeQty;
          existingBnw.entries.push(itemNumber);
        } else {
          consolidatedBnwSets.set(bnwKey, {
            description: `${bnwInfo.boltSize} BNW Set x${bnwInfo.holesPerFlange} for ${nb}NB ${flangeSpec}`,
            qty: flangeQty,
            unit: 'sets',
            weight: bnwWeight * flangeQty,
            entries: [itemNumber]
          });
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
        const blankWeight = getFlangeWeight(blankNb, flangeSpec.split(' ').pop() || 'PN16') * 0.6; // Blank flange is ~60% of WN

        if (existingBlank) {
          existingBlank.qty += blankQty;
          existingBlank.weight += blankWeight * blankQty;
          existingBlank.entries.push(itemNumber);
        } else {
          consolidatedBlankFlanges.set(blankFlangeKey, {
            description: `${blankNb}NB Blank Flange ${flangeSpec}`,
            qty: blankQty,
            unit: 'Each',
            weight: blankWeight * blankQty,
            entries: [itemNumber]
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

  // Render consolidated BOQ table with extended columns
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

    return (
      <div className="mb-6">
        <h4 className={`text-md font-semibold ${textColor} mb-2 flex items-center justify-between`}>
          <span>{title} ({items.size} {items.size === 1 ? 'item' : 'items'})</span>
          <span className="text-sm font-normal text-gray-500">Section Weight: {formatWeight(sectionWeight)}</span>
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className={`${bgColor} border-b border-gray-200`}>
                <th className="text-left py-2 px-3 font-semibold text-xs text-gray-700">From Items</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">#</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Description</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-700">Qty</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Unit</th>
                {weldTypesList.map(wt => (
                  <th key={wt} className="text-right py-2 px-3 font-semibold text-xs text-gray-700">{wt} (m)</th>
                ))}
                {hasAreaData && (
                  <>
                    <th className="text-right py-2 px-3 font-semibold text-xs text-gray-700">Int m²</th>
                    <th className="text-right py-2 px-3 font-semibold text-xs text-gray-700">Ext m²</th>
                  </>
                )}
                <th className="text-right py-2 px-3 font-semibold text-gray-700">Weight</th>
              </tr>
            </thead>
            <tbody>
              {itemsArray.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 text-xs text-gray-500">{item.entries.join(', ')}</td>
                  <td className="py-2 px-3 text-gray-900">{idx + 1}</td>
                  <td className="py-2 px-3 text-gray-900">{item.description}</td>
                  <td className="py-2 px-3 text-right font-medium text-gray-900">{item.qty}</td>
                  <td className="py-2 px-3 text-gray-700">{item.unit}</td>
                  {weldTypesList.map(wt => (
                    <td key={wt} className="py-2 px-3 text-right text-xs text-gray-600">{item.welds?.[wt] ? item.welds[wt].toFixed(2) : '-'}</td>
                  ))}
                  {hasAreaData && (
                    <>
                      <td className="py-2 px-3 text-right text-xs text-gray-600">{item.intAreaM2 ? item.intAreaM2.toFixed(2) : '-'}</td>
                      <td className="py-2 px-3 text-right text-xs text-gray-600">{item.extAreaM2 ? item.extAreaM2.toFixed(2) : '-'}</td>
                    </>
                  )}
                  <td className="py-2 px-3 text-right text-gray-900">{formatWeight(item.weight)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Excel Export function
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Helper to convert Map to array for Excel
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
      const blankFlangesData = mapToExcelData(consolidatedBlankFlanges, 'Blank Flanges');
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

    // Add a summary sheet
    const summaryData = [
      { 'Category': 'Project', 'Value': rfqData.projectName || 'Untitled' },
      { 'Category': 'Customer', 'Value': rfqData.customerName || '-' },
      { 'Category': 'Total Items', 'Value': entries.length },
      { 'Category': 'Total Estimated Weight (kg)', 'Value': totalWeight.toFixed(2) },
      { 'Category': '', 'Value': '' },
      { 'Category': 'Section', 'Value': 'Item Count' },
      { 'Category': 'Straight Pipes', 'Value': consolidatedPipes.size },
      { 'Category': 'Bends', 'Value': consolidatedBends.size },
      { 'Category': 'Fittings', 'Value': consolidatedFittings.size },
      { 'Category': 'Flanges', 'Value': consolidatedFlanges.size },
      { 'Category': 'Blank Flanges', 'Value': consolidatedBlankFlanges.size },
      { 'Category': 'BNW Sets', 'Value': consolidatedBnwSets.size },
      { 'Category': 'Gaskets', 'Value': consolidatedGaskets.size },
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
              if (effectiveSpecs.length === 0) return '-';
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
              if (effectiveFlanges.length === 0) return '-';
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

        {/* Blank Flanges */}
        {renderConsolidatedTable('Blank Flanges', consolidatedBlankFlanges, 'bg-gray-50', 'text-gray-700', false, false)}

        {/* BNW Sets */}
        {requiredProducts.includes('fasteners_gaskets') && renderConsolidatedTable('Bolt, Nut & Washer Sets', consolidatedBnwSets, 'bg-orange-50', 'text-orange-700', false, false)}

        {/* Gaskets */}
        {requiredProducts.includes('fasteners_gaskets') && renderConsolidatedTable('Gaskets', consolidatedGaskets, 'bg-teal-50', 'text-teal-700', false, false)}

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
