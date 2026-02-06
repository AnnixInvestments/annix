import {
  flangeWeightSync as getFlangeWeight,
  bnwSetInfoSync as getBnwSetInfo,
  gasketWeightSync as getGasketWeight,
  blankFlangeSurfaceAreaSync as blankFlangeSurfaceArea,
  sansBlankFlangeWeightSync as sansBlankFlangeWeight,
  blankFlangeWeightSync as blankFlangeWeight,
} from '@/app/lib/hooks/useFlangeWeights';
import {
  boltSetCountPerBend,
  boltSetCountPerPipe,
  boltSetCountPerFitting,
} from '@/app/lib/config/rfq/pipeEndOptions';
import { ConsolidatedBoqDataDto, ConsolidatedItemDto } from '@/app/lib/api/client';

export interface ConsolidationInput {
  entries: any[];
  globalSpecs?: {
    gasketType?: string;
    pressureClassDesignation?: string;
    flangeStandardId?: number;
    flangePressureClassId?: number;
    flangeTypeCode?: string;
  };
  masterData?: {
    flangeStandards?: { id: number; code: string }[];
    pressureClasses?: { id: number; designation: string }[];
    steelSpecs?: { id: number; steelSpecName: string }[];
  };
}

interface ConsolidatedItem {
  description: string;
  qty: number;
  unit: string;
  weight: number;
  entries: number[];
  welds?: Record<string, number>;
  intAreaM2?: number;
  extAreaM2?: number;
}

function flangeSpec(
  entry: any,
  globalSpecs?: ConsolidationInput['globalSpecs'],
  masterData?: ConsolidationInput['masterData']
): { spec: string; standard: string; pressureClass: string; flangeTypeCode?: string } {
  const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
  const flangePressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
  const flangeStandard = flangeStandardId && masterData?.flangeStandards
    ? masterData.flangeStandards.find((s) => s.id === flangeStandardId)?.code || ''
    : '';
  const pressureClass = flangePressureClassId && masterData?.pressureClasses
    ? masterData.pressureClasses.find((p) => p.id === flangePressureClassId)?.designation || globalSpecs?.pressureClassDesignation || 'PN16'
    : globalSpecs?.pressureClassDesignation || 'PN16';
  const flangeTypeCode = entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;
  const spec = flangeStandard && pressureClass ? `${flangeStandard} ${pressureClass}` : pressureClass;
  return { spec, standard: flangeStandard, pressureClass, flangeTypeCode };
}

function getFlangeCountFromConfig(config: string, itemType: string): { main: number; branch: number } {
  if (itemType === 'bend' || itemType === 'straight_pipe' || !itemType) {
    switch (config) {
      case 'PE': return { main: 0, branch: 0 };
      case 'FOE': return { main: 1, branch: 0 };
      case 'FBE': return { main: 2, branch: 0 };
      case 'FOE_LF': return { main: 2, branch: 0 };
      case 'FOE_RF': return { main: 2, branch: 0 };
      case '2X_RF': return { main: 2, branch: 0 };
      case '2xLF': return { main: 4, branch: 0 };
      default: return { main: 0, branch: 0 };
    }
  }
  if (itemType === 'fitting') {
    switch (config) {
      case 'PE': return { main: 0, branch: 0 };
      case 'FAE': case 'FFF': return { main: 2, branch: 1 };
      case 'F2E': case 'FFP': return { main: 2, branch: 0 };
      case 'F2E_RF': case 'F2E_LF': return { main: 1, branch: 1 };
      case 'PFF': return { main: 1, branch: 1 };
      case 'PPF': return { main: 0, branch: 1 };
      case 'FPP': return { main: 1, branch: 0 };
      case 'PFP': return { main: 1, branch: 0 };
      default: return { main: 0, branch: 0 };
    }
  }
  return { main: 0, branch: 0 };
}

function getFlangeTypeName(config: string): string {
  if (!config || config === 'PE') return 'Slip On';
  if (config.includes('LF') || config.includes('_L')) return 'Slip On';
  if (config.includes('RF') || config.includes('_R')) return 'Rotating';
  return 'Slip On';
}

function getBlankFlangeWeight(nbMm: number, pressureClass: string, flangeStandard: string): number {
  const isSans = pressureClass.match(/^\d+\/\d$/) || flangeStandard.toUpperCase().includes('SANS') || flangeStandard.toUpperCase().includes('SABS');
  if (isSans) {
    return sansBlankFlangeWeight(nbMm, pressureClass);
  }
  return blankFlangeWeight(nbMm, pressureClass);
}

export function consolidateBoqData(input: ConsolidationInput): ConsolidatedBoqDataDto {
  const { entries, globalSpecs, masterData } = input;

  const consolidatedPipes: Map<string, ConsolidatedItem> = new Map();
  const consolidatedBends: Map<string, ConsolidatedItem> = new Map();
  const consolidatedFittings: Map<string, ConsolidatedItem> = new Map();
  const consolidatedFlanges: Map<string, ConsolidatedItem> = new Map();
  const consolidatedBnwSets: Map<string, ConsolidatedItem> = new Map();
  const consolidatedGaskets: Map<string, ConsolidatedItem> = new Map();
  const consolidatedBlankFlanges: Map<string, ConsolidatedItem> = new Map();
  const consolidatedValves: Map<string, ConsolidatedItem> = new Map();
  const consolidatedInstruments: Map<string, ConsolidatedItem> = new Map();

  entries.forEach((entry, index) => {
    const itemNumber = index + 1;
    const qty = entry.specs?.quantityValue || entry.calculation?.calculatedPipeCount || 1;
    const { spec: flangeSpecStr, standard: flangeStandard, pressureClass, flangeTypeCode } = flangeSpec(entry, globalSpecs, masterData);

    if (entry.itemType === 'bend') {
      const nb = entry.specs?.nominalBoreMm || 100;
      const bendEndConfig = entry.specs?.bendEndConfiguration || 'PE';
      const flangeCount = getFlangeCountFromConfig(bendEndConfig, 'bend');
      const flangeTypeName = getFlangeTypeName(bendEndConfig);

      if (flangeCount.main > 0) {
        const flangeKey = `FLANGE_${nb}_${flangeSpecStr}_${flangeTypeName}`;
        const existingFlange = consolidatedFlanges.get(flangeKey);
        const flangeQty = flangeCount.main * qty;
        const flangeWeight = getFlangeWeight(nb, pressureClass, flangeStandard, flangeTypeCode);

        if (existingFlange) {
          existingFlange.qty += flangeQty;
          existingFlange.weight += flangeWeight * flangeQty;
          existingFlange.entries.push(itemNumber);
        } else {
          consolidatedFlanges.set(flangeKey, {
            description: `${nb}NB ${flangeTypeName} Flange ${flangeSpecStr}`,
            qty: flangeQty,
            unit: 'Each',
            weight: flangeWeight * flangeQty,
            entries: [itemNumber],
          });
        }

        const bnwInfo = getBnwSetInfo(nb, pressureClass);
        const bnwKey = `BNW_${bnwInfo.boltSize}_x${bnwInfo.holesPerFlange}_${nb}NB_${flangeSpecStr}`;
        const existingBnw = consolidatedBnwSets.get(bnwKey);
        const bnwWeight = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;
        const boltSetQty = boltSetCountPerBend(bendEndConfig) * qty;

        if (boltSetQty > 0) {
          if (existingBnw) {
            existingBnw.qty += boltSetQty;
            existingBnw.weight += bnwWeight * boltSetQty;
            existingBnw.entries.push(itemNumber);
          } else {
            consolidatedBnwSets.set(bnwKey, {
              description: `${bnwInfo.boltSize} BNW Set x${bnwInfo.holesPerFlange} for ${nb}NB ${flangeSpecStr}`,
              qty: boltSetQty,
              unit: 'sets',
              weight: bnwWeight * boltSetQty,
              entries: [itemNumber],
            });
          }
        }

        if (globalSpecs?.gasketType) {
          const gasketKey = `GASKET_${globalSpecs.gasketType}_${nb}NB_${flangeSpecStr}`;
          const existingGasket = consolidatedGaskets.get(gasketKey);
          const gasketWeight = getGasketWeight(globalSpecs.gasketType, nb);
          const gasketQty = boltSetQty;

          if (gasketQty > 0) {
            if (existingGasket) {
              existingGasket.qty += gasketQty;
              existingGasket.weight += gasketWeight * gasketQty;
              existingGasket.entries.push(itemNumber);
            } else {
              consolidatedGaskets.set(gasketKey, {
                description: `${globalSpecs.gasketType} Gasket ${nb}NB ${flangeSpecStr}`,
                qty: gasketQty,
                unit: 'Each',
                weight: gasketWeight * gasketQty,
                entries: [itemNumber],
              });
            }
          }
        }
      }

      if (entry.specs?.addBlankFlange && entry.specs?.blankFlangeCount > 0) {
        const blankNb = entry.specs?.blankFlangeNominalBoreMm || nb;
        const blankFlangeKey = `BLANK_FLANGE_${blankNb}_${flangeSpecStr}`;
        const existingBlank = consolidatedBlankFlanges.get(blankFlangeKey);
        const blankQty = entry.specs.blankFlangeCount * qty;
        const blankWeight = getBlankFlangeWeight(blankNb, pressureClass, flangeStandard);
        const blankSurfaceArea = blankFlangeSurfaceArea(blankNb);

        if (existingBlank) {
          existingBlank.qty += blankQty;
          existingBlank.weight += blankWeight * blankQty;
          existingBlank.entries.push(itemNumber);
        } else {
          consolidatedBlankFlanges.set(blankFlangeKey, {
            description: `${blankNb}NB Blank Flange ${flangeSpecStr}`,
            qty: blankQty,
            unit: 'Each',
            weight: blankWeight * blankQty,
            entries: [itemNumber],
            extAreaM2: blankSurfaceArea.external * blankQty,
            intAreaM2: blankSurfaceArea.internal * blankQty,
          });
        }
      }
    } else if (entry.itemType === 'fitting') {
      const nb = entry.specs?.nominalDiameterMm || entry.specs?.nominalBoreMm || 100;
      const branchNb = entry.specs?.branchNominalDiameterMm || nb;
      const fittingEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
      const flangeCount = getFlangeCountFromConfig(fittingEndConfig, 'fitting');
      const flangeTypeName = getFlangeTypeName(fittingEndConfig);
      const isEqualBranch = branchNb === nb;
      const fittingBoltSets = boltSetCountPerFitting(fittingEndConfig, isEqualBranch);

      if (flangeCount.main > 0) {
        const flangeKey = `FLANGE_${nb}_${flangeSpecStr}_${flangeTypeName}`;
        const existingFlange = consolidatedFlanges.get(flangeKey);
        const flangeQty = flangeCount.main * qty;
        const flangeWeight = getFlangeWeight(nb, pressureClass, flangeStandard, flangeTypeCode);

        if (existingFlange) {
          existingFlange.qty += flangeQty;
          existingFlange.weight += flangeWeight * flangeQty;
          existingFlange.entries.push(itemNumber);
        } else {
          consolidatedFlanges.set(flangeKey, {
            description: `${nb}NB ${flangeTypeName} Flange ${flangeSpecStr}`,
            qty: flangeQty,
            unit: 'Each',
            weight: flangeWeight * flangeQty,
            entries: [itemNumber],
          });
        }

        const bnwInfo = getBnwSetInfo(nb, pressureClass);
        const bnwKey = `BNW_${bnwInfo.boltSize}_x${bnwInfo.holesPerFlange}_${nb}NB_${flangeSpecStr}`;
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
              description: `${bnwInfo.boltSize} BNW Set x${bnwInfo.holesPerFlange} for ${nb}NB ${flangeSpecStr}`,
              qty: mainBoltSetQty,
              unit: 'sets',
              weight: bnwWeight * mainBoltSetQty,
              entries: [itemNumber],
            });
          }
        }

        if (globalSpecs?.gasketType && mainBoltSetQty > 0) {
          const gasketKey = `GASKET_${globalSpecs.gasketType}_${nb}NB_${flangeSpecStr}`;
          const existingGasket = consolidatedGaskets.get(gasketKey);
          const gasketWeight = getGasketWeight(globalSpecs.gasketType, nb);

          if (existingGasket) {
            existingGasket.qty += mainBoltSetQty;
            existingGasket.weight += gasketWeight * mainBoltSetQty;
            existingGasket.entries.push(itemNumber);
          } else {
            consolidatedGaskets.set(gasketKey, {
              description: `${globalSpecs.gasketType} Gasket ${nb}NB ${flangeSpecStr}`,
              qty: mainBoltSetQty,
              unit: 'Each',
              weight: gasketWeight * mainBoltSetQty,
              entries: [itemNumber],
            });
          }
        }
      }

      if (flangeCount.branch > 0 && branchNb !== nb) {
        const branchFlangeKey = `FLANGE_${branchNb}_${flangeSpecStr}_${flangeTypeName}`;
        const existingBranchFlange = consolidatedFlanges.get(branchFlangeKey);
        const branchFlangeQty = flangeCount.branch * qty;
        const branchFlangeWeight = getFlangeWeight(branchNb, pressureClass, flangeStandard, flangeTypeCode);

        if (existingBranchFlange) {
          existingBranchFlange.qty += branchFlangeQty;
          existingBranchFlange.weight += branchFlangeWeight * branchFlangeQty;
          existingBranchFlange.entries.push(itemNumber);
        } else {
          consolidatedFlanges.set(branchFlangeKey, {
            description: `${branchNb}NB ${flangeTypeName} Flange ${flangeSpecStr}`,
            qty: branchFlangeQty,
            unit: 'Each',
            weight: branchFlangeWeight * branchFlangeQty,
            entries: [itemNumber],
          });
        }

        const branchBnwInfo = getBnwSetInfo(branchNb, pressureClass);
        const branchBnwKey = `BNW_${branchBnwInfo.boltSize}_x${branchBnwInfo.holesPerFlange}_${branchNb}NB_${flangeSpecStr}`;
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
              description: `${branchBnwInfo.boltSize} BNW Set x${branchBnwInfo.holesPerFlange} for ${branchNb}NB ${flangeSpecStr}`,
              qty: branchBoltSetQty,
              unit: 'sets',
              weight: branchBnwWeight * branchBoltSetQty,
              entries: [itemNumber],
            });
          }
        }

        if (globalSpecs?.gasketType && branchBoltSetQty > 0) {
          const branchGasketKey = `GASKET_${globalSpecs.gasketType}_${branchNb}NB_${flangeSpecStr}`;
          const existingBranchGasket = consolidatedGaskets.get(branchGasketKey);
          const branchGasketWeight = getGasketWeight(globalSpecs.gasketType, branchNb);

          if (existingBranchGasket) {
            existingBranchGasket.qty += branchBoltSetQty;
            existingBranchGasket.weight += branchGasketWeight * branchBoltSetQty;
            existingBranchGasket.entries.push(itemNumber);
          } else {
            consolidatedGaskets.set(branchGasketKey, {
              description: `${globalSpecs.gasketType} Gasket ${branchNb}NB ${flangeSpecStr}`,
              qty: branchBoltSetQty,
              unit: 'Each',
              weight: branchGasketWeight * branchBoltSetQty,
              entries: [itemNumber],
            });
          }
        }
      }

      if (entry.specs?.addBlankFlange && entry.specs?.blankFlangeCount > 0) {
        const blankNb = entry.specs?.blankFlangeNominalBoreMm || nb;
        const blankFlangeKey = `BLANK_FLANGE_${blankNb}_${flangeSpecStr}`;
        const existingBlank = consolidatedBlankFlanges.get(blankFlangeKey);
        const blankQty = entry.specs.blankFlangeCount * qty;
        const blankWeight = getBlankFlangeWeight(blankNb, pressureClass, flangeStandard);
        const blankSurfaceArea = blankFlangeSurfaceArea(blankNb);

        if (existingBlank) {
          existingBlank.qty += blankQty;
          existingBlank.weight += blankWeight * blankQty;
          existingBlank.entries.push(itemNumber);
        } else {
          consolidatedBlankFlanges.set(blankFlangeKey, {
            description: `${blankNb}NB Blank Flange ${flangeSpecStr}`,
            qty: blankQty,
            unit: 'Each',
            weight: blankWeight * blankQty,
            entries: [itemNumber],
            extAreaM2: blankSurfaceArea.external * blankQty,
            intAreaM2: blankSurfaceArea.internal * blankQty,
          });
        }
      }
    } else if (entry.itemType === 'valve') {
      const valveType = entry.specs?.valveType || 'valve';
      const size = entry.specs?.size || 'DN100';
      const pressureClass = entry.specs?.pressureClass || 'Class 150';
      const bodyMaterial = entry.specs?.bodyMaterial || 'CF8M';
      const actuatorType = entry.specs?.actuatorType || 'manual';

      const valveKey = `VALVE_${valveType}_${size}_${pressureClass}_${bodyMaterial}_${actuatorType}`;
      const existingValve = consolidatedValves.get(valveKey);

      const description = `${size} ${valveType.replace(/_/g, ' ')} ${pressureClass} ${bodyMaterial}${actuatorType !== 'manual' ? ` (${actuatorType})` : ''}`;

      if (existingValve) {
        existingValve.qty += qty;
        existingValve.entries.push(itemNumber);
      } else {
        consolidatedValves.set(valveKey, {
          description,
          qty,
          unit: 'Each',
          weight: 0,
          entries: [itemNumber],
        });
      }
    } else if (entry.itemType === 'instrument') {
      const instrumentType = entry.specs?.instrumentType || 'instrument';
      const instrumentCategory = entry.specs?.instrumentCategory || 'flow';
      const size = entry.specs?.size || '';
      const processConnection = entry.specs?.processConnection || '';

      const instrumentKey = `INSTRUMENT_${instrumentCategory}_${instrumentType}_${size}_${processConnection}`;
      const existingInstrument = consolidatedInstruments.get(instrumentKey);

      const description = `${instrumentType.replace(/_/g, ' ')}${size ? ` ${size}` : ''}${processConnection ? ` ${processConnection}` : ''}`;

      if (existingInstrument) {
        existingInstrument.qty += qty;
        existingInstrument.entries.push(itemNumber);
      } else {
        consolidatedInstruments.set(instrumentKey, {
          description,
          qty,
          unit: 'Each',
          weight: 0,
          entries: [itemNumber],
        });
      }
    } else {
      const nb = entry.specs?.nominalBoreMm || 100;
      const pipeEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
      const flangeCount = getFlangeCountFromConfig(pipeEndConfig, 'straight_pipe');
      const flangeTypeName = getFlangeTypeName(pipeEndConfig);
      const pipeQty = entry.calculation?.calculatedPipeCount || qty;

      if (flangeCount.main > 0) {
        const flangeKey = `FLANGE_${nb}_${flangeSpecStr}_${flangeTypeName}`;
        const existingFlange = consolidatedFlanges.get(flangeKey);
        const flangeQty = flangeCount.main * pipeQty;
        const flangeWeight = getFlangeWeight(nb, pressureClass, flangeStandard, flangeTypeCode);

        if (existingFlange) {
          existingFlange.qty += flangeQty;
          existingFlange.weight += flangeWeight * flangeQty;
          existingFlange.entries.push(itemNumber);
        } else {
          consolidatedFlanges.set(flangeKey, {
            description: `${nb}NB ${flangeTypeName} Flange ${flangeSpecStr}`,
            qty: flangeQty,
            unit: 'Each',
            weight: flangeWeight * flangeQty,
            entries: [itemNumber],
          });
        }

        const bnwInfo = getBnwSetInfo(nb, pressureClass);
        const bnwKey = `BNW_${bnwInfo.boltSize}_x${bnwInfo.holesPerFlange}_${nb}NB_${flangeSpecStr}`;
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
              description: `${bnwInfo.boltSize} BNW Set x${bnwInfo.holesPerFlange} for ${nb}NB ${flangeSpecStr}`,
              qty: pipeBoltSetQty,
              unit: 'sets',
              weight: bnwWeight * pipeBoltSetQty,
              entries: [itemNumber],
            });
          }
        }

        if (globalSpecs?.gasketType && pipeBoltSetQty > 0) {
          const gasketKey = `GASKET_${globalSpecs.gasketType}_${nb}NB_${flangeSpecStr}`;
          const existingGasket = consolidatedGaskets.get(gasketKey);
          const gasketWeight = getGasketWeight(globalSpecs.gasketType, nb);

          if (existingGasket) {
            existingGasket.qty += pipeBoltSetQty;
            existingGasket.weight += gasketWeight * pipeBoltSetQty;
            existingGasket.entries.push(itemNumber);
          } else {
            consolidatedGaskets.set(gasketKey, {
              description: `${globalSpecs.gasketType} Gasket ${nb}NB ${flangeSpecStr}`,
              qty: pipeBoltSetQty,
              unit: 'Each',
              weight: gasketWeight * pipeBoltSetQty,
              entries: [itemNumber],
            });
          }
        }
      }

      if (entry.specs?.addBlankFlange && entry.specs?.blankFlangeCount > 0) {
        const blankNb = entry.specs?.blankFlangeNominalBoreMm || nb;
        const blankFlangeKey = `BLANK_FLANGE_${blankNb}_${flangeSpecStr}`;
        const existingBlank = consolidatedBlankFlanges.get(blankFlangeKey);
        const blankQty = entry.specs.blankFlangeCount * pipeQty;
        const blankWeight = getBlankFlangeWeight(blankNb, pressureClass, flangeStandard);
        const blankSurfaceArea = blankFlangeSurfaceArea(blankNb);

        if (existingBlank) {
          existingBlank.qty += blankQty;
          existingBlank.weight += blankWeight * blankQty;
          existingBlank.entries.push(itemNumber);
        } else {
          consolidatedBlankFlanges.set(blankFlangeKey, {
            description: `${blankNb}NB Blank Flange ${flangeSpecStr}`,
            qty: blankQty,
            unit: 'Each',
            weight: blankWeight * blankQty,
            entries: [itemNumber],
            extAreaM2: blankSurfaceArea.external * blankQty,
            intAreaM2: blankSurfaceArea.internal * blankQty,
          });
        }
      }
    }
  });

  const mapToDto = (items: Map<string, ConsolidatedItem>): ConsolidatedItemDto[] => {
    return Array.from(items.values()).map((item) => ({
      description: item.description,
      qty: item.qty,
      unit: item.unit,
      weightKg: item.weight,
      entries: item.entries,
      welds: item.welds ? {
        pipeWeld: item.welds['Pipe Weld'],
        flangeWeld: item.welds['Flange Weld'],
        mitreWeld: item.welds['Mitre Weld'],
        teeWeld: item.welds['Tee Weld'],
      } : undefined,
      areas: (item.intAreaM2 || item.extAreaM2) ? {
        intAreaM2: item.intAreaM2,
        extAreaM2: item.extAreaM2,
      } : undefined,
    }));
  };

  return {
    flanges: consolidatedFlanges.size > 0 ? mapToDto(consolidatedFlanges) : undefined,
    blankFlanges: consolidatedBlankFlanges.size > 0 ? mapToDto(consolidatedBlankFlanges) : undefined,
    bnwSets: consolidatedBnwSets.size > 0 ? mapToDto(consolidatedBnwSets) : undefined,
    gaskets: consolidatedGaskets.size > 0 ? mapToDto(consolidatedGaskets) : undefined,
    valves: consolidatedValves.size > 0 ? mapToDto(consolidatedValves) : undefined,
    instruments: consolidatedInstruments.size > 0 ? mapToDto(consolidatedInstruments) : undefined,
  };
}
