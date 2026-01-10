import { AppDataSource } from '../src/config/data-source';
import { Boq } from '../src/boq/entities/boq.entity';
import { BoqSection } from '../src/boq/entities/boq-section.entity';
import { RfqItem } from '../src/rfq/entities/rfq-item.entity';

interface ConsolidatedItem {
  description: string;
  qty: number;
  unit: string;
  weightKg: number;
  entries: number[];
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
      case 'LF_BE': return { main: 4, branch: 0 };
      default: return { main: 0, branch: 0 };
    }
  }
  if (itemType === 'fitting') {
    switch (config) {
      case 'PE': return { main: 0, branch: 0 };
      case 'FAE': case 'FFF': return { main: 2, branch: 1 };
      case 'F2E': case 'FFP': return { main: 2, branch: 0 };
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

function getBnwSetInfo(nb: number, pressureClass: string): { boltSize: string; holesPerFlange: number; weightPerHole: number } {
  const pnMatch = pressureClass.match(/PN(\d+)/i);
  const pn = pnMatch ? parseInt(pnMatch[1]) : 16;

  const boltData: Record<number, Record<number, { boltSize: string; holes: number; weight: number }>> = {
    50: { 16: { boltSize: 'M16', holes: 4, weight: 0.25 }, 25: { boltSize: 'M16', holes: 4, weight: 0.3 }, 40: { boltSize: 'M16', holes: 4, weight: 0.35 } },
    80: { 16: { boltSize: 'M16', holes: 8, weight: 0.25 }, 25: { boltSize: 'M16', holes: 8, weight: 0.3 }, 40: { boltSize: 'M20', holes: 8, weight: 0.5 } },
    100: { 16: { boltSize: 'M16', holes: 8, weight: 0.3 }, 25: { boltSize: 'M20', holes: 8, weight: 0.5 }, 40: { boltSize: 'M20', holes: 8, weight: 0.6 } },
    150: { 16: { boltSize: 'M20', holes: 8, weight: 0.5 }, 25: { boltSize: 'M20', holes: 8, weight: 0.6 }, 40: { boltSize: 'M24', holes: 8, weight: 0.9 } },
    200: { 16: { boltSize: 'M20', holes: 8, weight: 0.6 }, 25: { boltSize: 'M20', holes: 12, weight: 0.7 }, 40: { boltSize: 'M24', holes: 12, weight: 1.0 } },
    250: { 16: { boltSize: 'M20', holes: 12, weight: 0.7 }, 25: { boltSize: 'M24', holes: 12, weight: 1.0 }, 40: { boltSize: 'M27', holes: 12, weight: 1.3 } },
    300: { 16: { boltSize: 'M20', holes: 12, weight: 0.8 }, 25: { boltSize: 'M24', holes: 12, weight: 1.1 }, 40: { boltSize: 'M27', holes: 16, weight: 1.5 } },
    350: { 16: { boltSize: 'M20', holes: 12, weight: 0.9 }, 25: { boltSize: 'M24', holes: 16, weight: 1.2 }, 40: { boltSize: 'M30', holes: 16, weight: 1.8 } },
    400: { 16: { boltSize: 'M24', holes: 16, weight: 1.0 }, 25: { boltSize: 'M27', holes: 16, weight: 1.4 }, 40: { boltSize: 'M30', holes: 16, weight: 2.0 } },
    450: { 16: { boltSize: 'M24', holes: 16, weight: 1.1 }, 25: { boltSize: 'M27', holes: 20, weight: 1.5 }, 40: { boltSize: 'M33', holes: 20, weight: 2.3 } },
    500: { 16: { boltSize: 'M24', holes: 20, weight: 1.2 }, 25: { boltSize: 'M30', holes: 20, weight: 1.7 }, 40: { boltSize: 'M33', holes: 20, weight: 2.5 } },
    600: { 16: { boltSize: 'M27', holes: 20, weight: 1.4 }, 25: { boltSize: 'M30', holes: 20, weight: 1.9 }, 40: { boltSize: 'M36', holes: 20, weight: 3.0 } },
  };

  const closestNb = Object.keys(boltData).map(Number).reduce((prev, curr) =>
    Math.abs(curr - nb) < Math.abs(prev - nb) ? curr : prev
  );

  const closestPn = [16, 25, 40].reduce((prev, curr) =>
    Math.abs(curr - pn) < Math.abs(prev - pn) ? curr : prev
  );

  const data = boltData[closestNb]?.[closestPn] || { boltSize: 'M20', holes: 8, weight: 0.5 };
  return { boltSize: data.boltSize, holesPerFlange: data.holes, weightPerHole: data.weight };
}

function getFlangeWeight(nb: number, pressureClass: string): number {
  const pnMatch = pressureClass.match(/PN(\d+)/i);
  const pn = pnMatch ? parseInt(pnMatch[1]) : 16;

  const weights: Record<number, Record<number, number>> = {
    50: { 16: 2.5, 25: 3.5, 40: 5.0 },
    80: { 16: 4.5, 25: 6.0, 40: 9.0 },
    100: { 16: 6.0, 25: 8.5, 40: 13.0 },
    150: { 16: 9.0, 25: 14.0, 40: 22.0 },
    200: { 16: 13.0, 25: 20.0, 40: 32.0 },
    250: { 16: 18.0, 25: 28.0, 40: 45.0 },
    300: { 16: 24.0, 25: 38.0, 40: 62.0 },
    350: { 16: 32.0, 25: 50.0, 40: 80.0 },
    400: { 16: 42.0, 25: 65.0, 40: 105.0 },
    450: { 16: 52.0, 25: 80.0, 40: 130.0 },
    500: { 16: 65.0, 25: 100.0, 40: 160.0 },
    600: { 16: 90.0, 25: 140.0, 40: 220.0 },
  };

  const closestNb = Object.keys(weights).map(Number).reduce((prev, curr) =>
    Math.abs(curr - nb) < Math.abs(prev - nb) ? curr : prev
  );

  const closestPn = [16, 25, 40].reduce((prev, curr) =>
    Math.abs(curr - pn) < Math.abs(prev - pn) ? curr : prev
  );

  return weights[closestNb]?.[closestPn] || 10;
}

function getGasketWeight(gasketType: string, nb: number): number {
  const baseWeight = nb * 0.002;
  if (gasketType?.toLowerCase().includes('spiral')) return baseWeight * 1.5;
  if (gasketType?.toLowerCase().includes('ring')) return baseWeight * 2;
  return baseWeight;
}

function getCapabilityKey(sectionType: string): string {
  const mapping: Record<string, string> = {
    'flanges': 'fabricated_steel',
    'bnw_sets': 'fasteners_gaskets',
    'gaskets': 'fasteners_gaskets',
    'blank_flanges': 'fabricated_steel',
  };
  return mapping[sectionType] || 'fabricated_steel';
}

async function updateBoqSections() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();

  try {
    const boqRepo = AppDataSource.getRepository(Boq);
    const sectionRepo = AppDataSource.getRepository(BoqSection);
    const rfqItemRepo = AppDataSource.getRepository(RfqItem);

    const boqs = await boqRepo.find({
      relations: ['rfq'],
      order: { id: 'DESC' }
    });

    console.log(`Found ${boqs.length} BOQs`);

    for (const boq of boqs) {
      console.log(`\nProcessing BOQ ${boq.boqNumber} (ID: ${boq.id})...`);

      if (!boq.rfq) {
        console.log(`  - No linked RFQ, skipping`);
        continue;
      }

      const rfqItems = await rfqItemRepo.find({
        where: { rfq: { id: boq.rfq.id } },
        relations: ['straightPipeDetails', 'bendDetails', 'fittingDetails'],
        order: { lineNumber: 'ASC' }
      });

      console.log(`  - Found ${rfqItems.length} RFQ items`);

      const consolidatedFlanges: Map<string, ConsolidatedItem> = new Map();
      const consolidatedBnwSets: Map<string, ConsolidatedItem> = new Map();
      const consolidatedGaskets: Map<string, ConsolidatedItem> = new Map();
      const consolidatedBlankFlanges: Map<string, ConsolidatedItem> = new Map();

      const pressureClass = 'PN16';
      const gasketType = 'NBR';

      for (const item of rfqItems) {
        const lineNumber = item.lineNumber;
        let nb = 100;
        let endConfig = 'PE';
        let qty = item.quantity || 1;
        const itemType = item.itemType;
        let branchNb = nb;
        let addBlankFlange = false;
        let blankFlangeCount = 0;

        if (item.straightPipeDetails) {
          nb = item.straightPipeDetails.nominalBoreMm || 100;
          endConfig = item.straightPipeDetails.pipeEndConfiguration || 'PE';
          qty = item.straightPipeDetails.calculatedPipeCount || qty;
        } else if (item.bendDetails) {
          nb = item.bendDetails.nominalBoreMm || 100;
          endConfig = (item.bendDetails as any).bendEndConfiguration || 'PE';
        } else if (item.fittingDetails) {
          nb = item.fittingDetails.nominalDiameterMm || 100;
          branchNb = (item.fittingDetails as any).branchNominalDiameterMm || nb;
          endConfig = item.fittingDetails.pipeEndConfiguration || 'PE';
          addBlankFlange = item.fittingDetails.addBlankFlange || false;
          blankFlangeCount = item.fittingDetails.blankFlangeCount || 0;
        }

        const flangeCount = getFlangeCountFromConfig(endConfig, itemType);
        const flangeTypeName = getFlangeTypeName(endConfig);

        if (flangeCount.main > 0) {
          const flangeKey = `FLANGE_${nb}_${pressureClass}_${flangeTypeName}`;
          const existing = consolidatedFlanges.get(flangeKey);
          const flangeQty = flangeCount.main * qty;
          const flangeWeight = getFlangeWeight(nb, pressureClass);

          if (existing) {
            existing.qty += flangeQty;
            existing.weightKg += flangeWeight * flangeQty;
            existing.entries.push(lineNumber);
          } else {
            consolidatedFlanges.set(flangeKey, {
              description: `${nb}NB ${flangeTypeName} Flange ${pressureClass}`,
              qty: flangeQty,
              unit: 'Each',
              weightKg: flangeWeight * flangeQty,
              entries: [lineNumber]
            });
          }

          const bnwInfo = getBnwSetInfo(nb, pressureClass);
          const bnwKey = `BNW_${bnwInfo.boltSize}_x${bnwInfo.holesPerFlange}_${nb}NB`;
          const existingBnw = consolidatedBnwSets.get(bnwKey);
          const bnwWeight = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;
          const boltSetQty = Math.ceil(flangeQty / 2);

          if (boltSetQty > 0) {
            if (existingBnw) {
              existingBnw.qty += boltSetQty;
              existingBnw.weightKg += bnwWeight * boltSetQty;
              existingBnw.entries.push(lineNumber);
            } else {
              consolidatedBnwSets.set(bnwKey, {
                description: `${bnwInfo.boltSize} BNW Set x${bnwInfo.holesPerFlange} for ${nb}NB ${pressureClass}`,
                qty: boltSetQty,
                unit: 'sets',
                weightKg: bnwWeight * boltSetQty,
                entries: [lineNumber]
              });
            }
          }

          const gasketKey = `GASKET_${gasketType}_${nb}NB`;
          const existingGasket = consolidatedGaskets.get(gasketKey);
          const gasketWeight = getGasketWeight(gasketType, nb);

          if (boltSetQty > 0) {
            if (existingGasket) {
              existingGasket.qty += boltSetQty;
              existingGasket.weightKg += gasketWeight * boltSetQty;
              existingGasket.entries.push(lineNumber);
            } else {
              consolidatedGaskets.set(gasketKey, {
                description: `${gasketType} Gasket ${nb}NB ${pressureClass}`,
                qty: boltSetQty,
                unit: 'Each',
                weightKg: gasketWeight * boltSetQty,
                entries: [lineNumber]
              });
            }
          }
        }

        if (flangeCount.branch > 0 && branchNb !== nb) {
          const branchFlangeKey = `FLANGE_${branchNb}_${pressureClass}_${flangeTypeName}`;
          const existingBranch = consolidatedFlanges.get(branchFlangeKey);
          const branchFlangeQty = flangeCount.branch * qty;
          const branchFlangeWeight = getFlangeWeight(branchNb, pressureClass);

          if (existingBranch) {
            existingBranch.qty += branchFlangeQty;
            existingBranch.weightKg += branchFlangeWeight * branchFlangeQty;
            existingBranch.entries.push(lineNumber);
          } else {
            consolidatedFlanges.set(branchFlangeKey, {
              description: `${branchNb}NB ${flangeTypeName} Flange ${pressureClass}`,
              qty: branchFlangeQty,
              unit: 'Each',
              weightKg: branchFlangeWeight * branchFlangeQty,
              entries: [lineNumber]
            });
          }
        }

        if (addBlankFlange && blankFlangeCount > 0) {
          const blankKey = `BLANK_${nb}_${pressureClass}`;
          const existingBlank = consolidatedBlankFlanges.get(blankKey);
          const blankQty = blankFlangeCount * qty;
          const blankWeight = getFlangeWeight(nb, pressureClass) * 0.6;

          if (existingBlank) {
            existingBlank.qty += blankQty;
            existingBlank.weightKg += blankWeight * blankQty;
            existingBlank.entries.push(lineNumber);
          } else {
            consolidatedBlankFlanges.set(blankKey, {
              description: `${nb}NB Blank Flange ${pressureClass}`,
              qty: blankQty,
              unit: 'Each',
              weightKg: blankWeight * blankQty,
              entries: [lineNumber]
            });
          }
        }
      }

      const existingSections = await sectionRepo.find({ where: { boqId: boq.id } });
      const existingTypes = existingSections.map(s => s.sectionType);

      console.log(`  - Existing sections: ${existingTypes.join(', ') || 'none'}`);

      let sectionsAdded = 0;

      if (consolidatedFlanges.size > 0 && !existingTypes.includes('flanges')) {
        const items = Array.from(consolidatedFlanges.values());
        const section = sectionRepo.create({
          boqId: boq.id,
          sectionType: 'flanges',
          capabilityKey: getCapabilityKey('flanges'),
          sectionTitle: 'Flanges',
          items: items.map((item, idx) => ({
            lineNumber: idx + 1,
            description: item.description,
            quantity: item.qty,
            unit: item.unit,
            unitWeightKg: item.weightKg / item.qty,
            totalWeightKg: item.weightKg,
          })),
          itemCount: items.length,
          totalWeightKg: items.reduce((sum, i) => sum + i.weightKg, 0),
        });
        await sectionRepo.save(section);
        console.log(`  - Added FLANGES section with ${items.length} items`);
        sectionsAdded++;
      }

      if (consolidatedBnwSets.size > 0 && !existingTypes.includes('bnw_sets')) {
        const items = Array.from(consolidatedBnwSets.values());
        const section = sectionRepo.create({
          boqId: boq.id,
          sectionType: 'bnw_sets',
          capabilityKey: getCapabilityKey('bnw_sets'),
          sectionTitle: 'Bolt, Nut & Washer Sets',
          items: items.map((item, idx) => ({
            lineNumber: idx + 1,
            description: item.description,
            quantity: item.qty,
            unit: item.unit,
            unitWeightKg: item.weightKg / item.qty,
            totalWeightKg: item.weightKg,
          })),
          itemCount: items.length,
          totalWeightKg: items.reduce((sum, i) => sum + i.weightKg, 0),
        });
        await sectionRepo.save(section);
        console.log(`  - Added BNW_SETS section with ${items.length} items`);
        sectionsAdded++;
      }

      if (consolidatedGaskets.size > 0 && !existingTypes.includes('gaskets')) {
        const items = Array.from(consolidatedGaskets.values());
        const section = sectionRepo.create({
          boqId: boq.id,
          sectionType: 'gaskets',
          capabilityKey: getCapabilityKey('gaskets'),
          sectionTitle: 'Gaskets',
          items: items.map((item, idx) => ({
            lineNumber: idx + 1,
            description: item.description,
            quantity: item.qty,
            unit: item.unit,
            unitWeightKg: item.weightKg / item.qty,
            totalWeightKg: item.weightKg,
          })),
          itemCount: items.length,
          totalWeightKg: items.reduce((sum, i) => sum + i.weightKg, 0),
        });
        await sectionRepo.save(section);
        console.log(`  - Added GASKETS section with ${items.length} items`);
        sectionsAdded++;
      }

      if (consolidatedBlankFlanges.size > 0 && !existingTypes.includes('blank_flanges')) {
        const items = Array.from(consolidatedBlankFlanges.values());
        const section = sectionRepo.create({
          boqId: boq.id,
          sectionType: 'blank_flanges',
          capabilityKey: getCapabilityKey('blank_flanges'),
          sectionTitle: 'Blank Flanges',
          items: items.map((item, idx) => ({
            lineNumber: idx + 1,
            description: item.description,
            quantity: item.qty,
            unit: item.unit,
            unitWeightKg: item.weightKg / item.qty,
            totalWeightKg: item.weightKg,
          })),
          itemCount: items.length,
          totalWeightKg: items.reduce((sum, i) => sum + i.weightKg, 0),
        });
        await sectionRepo.save(section);
        console.log(`  - Added BLANK_FLANGES section with ${items.length} items`);
        sectionsAdded++;
      }

      if (sectionsAdded === 0) {
        console.log(`  - No new sections to add (items may have PE end config)`);
      } else {
        console.log(`  - Total sections added: ${sectionsAdded}`);
      }
    }

    console.log('\nDone!');
  } finally {
    await AppDataSource.destroy();
  }
}

updateBoqSections().catch(console.error);
