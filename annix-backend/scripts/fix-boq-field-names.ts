import { AppDataSource } from "../src/config/data-source";

interface OldItem {
  lineNumber: number;
  description: string;
  quantity: number;
  unit: string;
  unitWeightKg: number;
  totalWeightKg: number;
}

interface NewItem {
  description: string;
  qty: number;
  unit: string;
  weightKg: number;
  entries: number[];
}

async function fixFieldNames() {
  console.log("Connecting to database...");
  await AppDataSource.initialize();

  try {
    const sections = await AppDataSource.query(`
      SELECT id, section_type, items
      FROM boq_sections
      WHERE boq_id = 1 AND section_type IN ('flanges', 'bnw_sets', 'gaskets', 'blank_flanges')
    `);

    console.log(`Found ${sections.length} sections to fix\n`);

    for (const section of sections) {
      const oldItems: OldItem[] = section.items;
      const newItems: NewItem[] = oldItems.map((item, idx) => ({
        description: item.description,
        qty: item.quantity,
        unit: item.unit,
        weightKg: item.totalWeightKg,
        entries: [idx + 1],
      }));

      console.log(`Fixing ${section.section_type}:`);
      console.log(`  Before: ${JSON.stringify(oldItems[0])}`);
      console.log(`  After:  ${JSON.stringify(newItems[0])}`);

      await AppDataSource.query(
        `
        UPDATE boq_sections
        SET items = $1
        WHERE id = $2
      `,
        [JSON.stringify(newItems), section.id],
      );

      console.log("  Updated!\n");
    }

    console.log("Verifying...");
    const result = await AppDataSource.query(`
      SELECT section_type, items
      FROM boq_sections
      WHERE boq_id = 1 AND section_type IN ('flanges', 'bnw_sets', 'gaskets', 'blank_flanges')
    `);

    for (const s of result) {
      console.log(`\n${s.section_type}:`);
      for (const item of s.items) {
        console.log(`  - ${item.description}: qty=${item.qty}, weightKg=${item.weightKg}`);
      }
    }

    console.log("\nDone!");
  } finally {
    await AppDataSource.destroy();
  }
}

fixFieldNames().catch(console.error);
