import { AppDataSource } from '../src/config/data-source';

interface BoqItem {
  lineNumber: number;
  description: string;
  quantity: number;
  unit: string;
  unitWeightKg: number;
  totalWeightKg: number;
}

interface ConsolidatedItem {
  description: string;
  qty: number;
  unit: string;
  weightKg: number;
  entries: number[];
}

function parseNbFromDescription(description: string): number {
  const match = description.match(/(\d+)NB/i);
  return match ? parseInt(match[1]) : 100;
}

function parseStubFromDescription(description: string): { nb: number; flangeConfig: string } | null {
  const stubMatch = description.match(/(\d+)NB\s*x\s*\d+mm\s*Stub\s*(\w+)/i);
  if (stubMatch) {
    return {
      nb: parseInt(stubMatch[1]),
      flangeConfig: stubMatch[2].toUpperCase()
    };
  }
  return null;
}

function parseFlangeConfigFromDescription(description: string, itemType: string): {
  mainFlanges: number;
  branchFlanges: number;
  blankFlanges: number;
} {
  const result = { mainFlanges: 0, branchFlanges: 0, blankFlanges: 0 };

  if (itemType === 'straight_pipe') {
    const rfMatch = description.match(/(\d+)X\s*R\/F/i);
    const lfMatch = description.match(/(\d+)X\s*L\/F/i);
    if (rfMatch) result.mainFlanges += parseInt(rfMatch[1]);
    if (lfMatch) result.mainFlanges += parseInt(lfMatch[1]);
  } else if (itemType === 'bend') {
    if (description.includes('C/F')) result.mainFlanges += 1;
    if (description.includes('2xLF')) {
      const stubInfo = parseStubFromDescription(description);
      if (stubInfo) {
        result.branchFlanges = 2;
      }
    }
  } else if (itemType === 'fitting') {
    if (description.includes('F2E')) {
      result.mainFlanges = 2;
    } else if (description.includes('FAE') || description.includes('FFF')) {
      result.mainFlanges = 2;
      result.branchFlanges = 1;
    }
    if (description.match(/\+\s*R\/F/i) || description.match(/\+\s*B\/F/i)) {
      result.blankFlanges = 1;
    }
  }

  return result;
}

function getBnwSetInfo(nb: number, pressureClass: string): { boltSize: string; holesPerFlange: number; weightPerSet: number } {
  const pnMatch = pressureClass.match(/PN(\d+)/i) || pressureClass.match(/1000\/(\d+)/);
  const pn = pnMatch ? parseInt(pnMatch[1]) : 16;

  const boltData: Record<number, Record<number, { boltSize: string; holes: number; weight: number }>> = {
    50: { 16: { boltSize: 'M16', holes: 4, weight: 1.0 }, 25: { boltSize: 'M16', holes: 4, weight: 1.2 }, 40: { boltSize: 'M16', holes: 4, weight: 1.4 } },
    80: { 16: { boltSize: 'M16', holes: 8, weight: 2.0 }, 25: { boltSize: 'M16', holes: 8, weight: 2.4 }, 40: { boltSize: 'M20', holes: 8, weight: 4.0 } },
    100: { 16: { boltSize: 'M16', holes: 8, weight: 2.4 }, 25: { boltSize: 'M20', holes: 8, weight: 4.0 }, 40: { boltSize: 'M20', holes: 8, weight: 4.8 } },
    150: { 16: { boltSize: 'M20', holes: 8, weight: 4.0 }, 25: { boltSize: 'M20', holes: 8, weight: 4.8 }, 40: { boltSize: 'M24', holes: 8, weight: 7.2 } },
    200: { 16: { boltSize: 'M20', holes: 8, weight: 4.8 }, 25: { boltSize: 'M20', holes: 12, weight: 8.4 }, 40: { boltSize: 'M24', holes: 12, weight: 12.0 } },
    250: { 16: { boltSize: 'M20', holes: 12, weight: 8.4 }, 25: { boltSize: 'M24', holes: 12, weight: 12.0 }, 40: { boltSize: 'M27', holes: 12, weight: 15.6 } },
    300: { 16: { boltSize: 'M20', holes: 12, weight: 9.6 }, 25: { boltSize: 'M24', holes: 12, weight: 13.2 }, 40: { boltSize: 'M27', holes: 16, weight: 24.0 } },
    350: { 16: { boltSize: 'M20', holes: 12, weight: 10.8 }, 25: { boltSize: 'M24', holes: 16, weight: 19.2 }, 40: { boltSize: 'M30', holes: 16, weight: 28.8 } },
    400: { 16: { boltSize: 'M24', holes: 16, weight: 16.0 }, 25: { boltSize: 'M27', holes: 16, weight: 22.4 }, 40: { boltSize: 'M30', holes: 16, weight: 32.0 } },
    450: { 16: { boltSize: 'M24', holes: 16, weight: 17.6 }, 25: { boltSize: 'M27', holes: 20, weight: 30.0 }, 40: { boltSize: 'M33', holes: 20, weight: 46.0 } },
    500: { 16: { boltSize: 'M24', holes: 20, weight: 24.0 }, 25: { boltSize: 'M30', holes: 20, weight: 34.0 }, 40: { boltSize: 'M33', holes: 20, weight: 50.0 } },
    600: { 16: { boltSize: 'M27', holes: 20, weight: 28.0 }, 25: { boltSize: 'M30', holes: 20, weight: 38.0 }, 40: { boltSize: 'M36', holes: 20, weight: 60.0 } },
  };

  const closestNb = Object.keys(boltData).map(Number).reduce((prev, curr) =>
    Math.abs(curr - nb) < Math.abs(prev - nb) ? curr : prev
  );

  const closestPn = [16, 25, 40].reduce((prev, curr) =>
    Math.abs(curr - pn) < Math.abs(prev - pn) ? curr : prev
  );

  const data = boltData[closestNb]?.[closestPn] || { boltSize: 'M20', holes: 8, weight: 4.0 };
  return { boltSize: data.boltSize, holesPerFlange: data.holes, weightPerSet: data.weight };
}

function getFlangeWeight(nb: number, pressureClass: string): number {
  const pnMatch = pressureClass.match(/PN(\d+)/i) || pressureClass.match(/1000\/(\d+)/);
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

function getGasketWeight(nb: number): number {
  return Math.max(0.5, nb * 0.003);
}

function extractFlangeStandard(description: string): string {
  const sabsMatch = description.match(/SABS\s*1123\s*(\d+\/\d+)/i);
  if (sabsMatch) {
    return `SABS 1123 ${sabsMatch[1]}`;
  }
  return 'SABS 1123 1000/3';
}

async function fixBoqSections() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();

  try {
    console.log('\n1. Deleting existing accessory sections...');
    await AppDataSource.query(`
      DELETE FROM boq_sections
      WHERE boq_id = 1 AND section_type IN ('flanges', 'bnw_sets', 'gaskets', 'blank_flanges')
    `);
    console.log('   Deleted existing accessory sections');

    console.log('\n2. Loading RFQ items...');
    const rfqItems = await AppDataSource.query(`
      SELECT id, line_number, item_type, description, quantity
      FROM rfq_items
      WHERE rfq_id = 3
      ORDER BY line_number
    `);
    console.log(`   Found ${rfqItems.length} items`);

    const consolidatedFlanges: Map<string, ConsolidatedItem> = new Map();
    const consolidatedBnwSets: Map<string, ConsolidatedItem> = new Map();
    const consolidatedGaskets: Map<string, ConsolidatedItem> = new Map();
    const consolidatedBlankFlanges: Map<string, ConsolidatedItem> = new Map();

    console.log('\n3. Processing items...');

    for (const item of rfqItems) {
      const lineNumber = item.line_number;
      const description = item.description;
      const itemType = item.item_type;
      const qty = item.quantity || 1;
      const flangeStandard = extractFlangeStandard(description);

      console.log(`   Line ${lineNumber}: ${itemType} - ${description.substring(0, 60)}...`);

      const mainNb = parseNbFromDescription(description);
      const flangeConfig = parseFlangeConfigFromDescription(description, itemType);
      const stubInfo = parseStubFromDescription(description);

      console.log(`     Main NB: ${mainNb}, Config: main=${flangeConfig.mainFlanges}, branch=${flangeConfig.branchFlanges}, blank=${flangeConfig.blankFlanges}`);
      if (stubInfo) {
        console.log(`     Stub: ${stubInfo.nb}NB with ${stubInfo.flangeConfig}`);
      }

      if (flangeConfig.mainFlanges > 0) {
        addToMap(consolidatedFlanges, `FLANGE_${mainNb}`, {
          description: `${mainNb}NB Weld Neck Flange ${flangeStandard}`,
          qty: flangeConfig.mainFlanges * qty,
          unit: 'Each',
          weightKg: getFlangeWeight(mainNb, flangeStandard) * flangeConfig.mainFlanges * qty,
          entries: [lineNumber]
        });

        const bnwInfo = getBnwSetInfo(mainNb, flangeStandard);
        const boltSetQty = Math.ceil((flangeConfig.mainFlanges * qty) / 2);
        addToMap(consolidatedBnwSets, `BNW_${mainNb}`, {
          description: `${bnwInfo.boltSize} BNW Set x${bnwInfo.holesPerFlange} for ${mainNb}NB ${flangeStandard}`,
          qty: boltSetQty,
          unit: 'sets',
          weightKg: bnwInfo.weightPerSet * boltSetQty,
          entries: [lineNumber]
        });

        addToMap(consolidatedGaskets, `GASKET_${mainNb}`, {
          description: `NBR Gasket ${mainNb}NB ${flangeStandard}`,
          qty: boltSetQty,
          unit: 'Each',
          weightKg: getGasketWeight(mainNb) * boltSetQty,
          entries: [lineNumber]
        });
      }

      if (stubInfo && (stubInfo.flangeConfig === '2xLF' || stubInfo.flangeConfig === 'FBE')) {
        const stubFlangeCount = 2;
        addToMap(consolidatedFlanges, `FLANGE_${stubInfo.nb}`, {
          description: `${stubInfo.nb}NB Weld Neck Flange ${flangeStandard}`,
          qty: stubFlangeCount * qty,
          unit: 'Each',
          weightKg: getFlangeWeight(stubInfo.nb, flangeStandard) * stubFlangeCount * qty,
          entries: [lineNumber]
        });

        const stubBnwInfo = getBnwSetInfo(stubInfo.nb, flangeStandard);
        const stubBoltSetQty = Math.ceil((stubFlangeCount * qty) / 2);
        addToMap(consolidatedBnwSets, `BNW_${stubInfo.nb}`, {
          description: `${stubBnwInfo.boltSize} BNW Set x${stubBnwInfo.holesPerFlange} for ${stubInfo.nb}NB ${flangeStandard}`,
          qty: stubBoltSetQty,
          unit: 'sets',
          weightKg: stubBnwInfo.weightPerSet * stubBoltSetQty,
          entries: [lineNumber]
        });

        addToMap(consolidatedGaskets, `GASKET_${stubInfo.nb}`, {
          description: `NBR Gasket ${stubInfo.nb}NB ${flangeStandard}`,
          qty: stubBoltSetQty,
          unit: 'Each',
          weightKg: getGasketWeight(stubInfo.nb) * stubBoltSetQty,
          entries: [lineNumber]
        });
      }

      if (flangeConfig.blankFlanges > 0) {
        addToMap(consolidatedBlankFlanges, `BLANK_${mainNb}`, {
          description: `${mainNb}NB Blank Flange ${flangeStandard}`,
          qty: flangeConfig.blankFlanges * qty,
          unit: 'Each',
          weightKg: getFlangeWeight(mainNb, flangeStandard) * 0.6 * flangeConfig.blankFlanges * qty,
          entries: [lineNumber]
        });
      }
    }

    console.log('\n4. Creating new sections...');

    if (consolidatedFlanges.size > 0) {
      const items = mapToBoqItems(consolidatedFlanges);
      await insertSection('flanges', 'Flanges', 'fabricated_steel', items);
      console.log(`   Created FLANGES section with ${items.length} items`);
    }

    if (consolidatedBnwSets.size > 0) {
      const items = mapToBoqItems(consolidatedBnwSets);
      await insertSection('bnw_sets', 'Bolt, Nut & Washer Sets', 'fasteners_gaskets', items);
      console.log(`   Created BNW_SETS section with ${items.length} items`);
    }

    if (consolidatedGaskets.size > 0) {
      const items = mapToBoqItems(consolidatedGaskets);
      await insertSection('gaskets', 'Gaskets', 'fasteners_gaskets', items);
      console.log(`   Created GASKETS section with ${items.length} items`);
    }

    if (consolidatedBlankFlanges.size > 0) {
      const items = mapToBoqItems(consolidatedBlankFlanges);
      await insertSection('blank_flanges', 'Blank Flanges', 'fabricated_steel', items);
      console.log(`   Created BLANK_FLANGES section with ${items.length} items`);
    }

    console.log('\n5. Verifying results...');
    const sections = await AppDataSource.query(`
      SELECT section_type, section_title, item_count, total_weight_kg
      FROM boq_sections
      WHERE boq_id = 1
    `);

    console.log('\nFinal BOQ sections:');
    for (const s of sections) {
      console.log(`   ${s.section_type}: ${s.item_count} items, ${s.total_weight_kg}kg`);
    }

    console.log('\nDone!');
  } finally {
    await AppDataSource.destroy();
  }
}

function addToMap(map: Map<string, ConsolidatedItem>, key: string, item: ConsolidatedItem) {
  const existing = map.get(key);
  if (existing) {
    existing.qty += item.qty;
    existing.weightKg += item.weightKg;
    existing.entries.push(...item.entries);
  } else {
    map.set(key, item);
  }
}

function mapToBoqItems(map: Map<string, ConsolidatedItem>): BoqItem[] {
  return Array.from(map.values()).map((item, idx) => ({
    lineNumber: idx + 1,
    description: item.description,
    quantity: item.qty,
    unit: item.unit,
    unitWeightKg: Math.round((item.weightKg / item.qty) * 100) / 100,
    totalWeightKg: Math.round(item.weightKg * 100) / 100,
  }));
}

async function insertSection(sectionType: string, sectionTitle: string, capabilityKey: string, items: BoqItem[]) {
  const totalWeight = items.reduce((sum, i) => sum + i.totalWeightKg, 0);
  await AppDataSource.query(`
    INSERT INTO boq_sections (boq_id, section_type, capability_key, section_title, items, item_count, total_weight_kg)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [1, sectionType, capabilityKey, sectionTitle, JSON.stringify(items), items.length, totalWeight]);
}

fixBoqSections().catch(console.error);
