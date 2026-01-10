import { AppDataSource } from '../src/config/data-source';

async function checkData() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();

  try {
    const items = await AppDataSource.query(`
      SELECT
        ri.id, ri.line_number, ri.item_type, ri.description, ri.quantity,
        sp.nominal_bore_mm as sp_nb, sp.pipe_end_configuration, sp.number_of_flanges,
        bd.nominal_bore_mm as bend_nb, bd.bend_type,
        fd.nominal_diameter_mm as fit_nb, fd.fitting_type, fd.pipe_end_configuration as fit_pe,
        fd.add_blank_flange, fd.blank_flange_count, fd.blank_flange_positions, fd.number_of_flanges as fit_flanges
      FROM rfq_items ri
      LEFT JOIN straight_pipe_rfqs sp ON sp.rfq_item_id = ri.id
      LEFT JOIN bend_rfqs bd ON bd.rfq_item_id = ri.id
      LEFT JOIN fitting_rfqs fd ON fd.rfq_item_id = ri.id
      WHERE ri.rfq_id = 3
      ORDER BY ri.line_number
    `);

    console.log('RFQ Items for BOQ-2026-0003:');
    console.log(JSON.stringify(items, null, 2));

    const sections = await AppDataSource.query(`
      SELECT section_type, section_title, items, item_count, total_weight_kg
      FROM boq_sections
      WHERE boq_id = 1
    `);

    console.log('\nCurrent BOQ Sections:');
    for (const s of sections) {
      console.log(`\n${s.section_type} - ${s.section_title}:`);
      console.log(JSON.stringify(s.items, null, 2));
    }
  } finally {
    await AppDataSource.destroy();
  }
}

checkData().catch(console.error);
