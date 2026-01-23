import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFrontendDataToDatabase1775500000000 implements MigrationInterface {
  name = 'AddFrontendDataToDatabase1775500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Moving frontend hardcoded data to database...');

    await this.createSteelMaterialsTables(queryRunner);
    await this.createMaterialLimitsTable(queryRunner);
    await this.createPwhtRecommendationsTable(queryRunner);

    console.warn('Frontend data migration completed.');
  }

  private async createSteelMaterialsTables(queryRunner: QueryRunner): Promise<void> {
    console.warn('Creating steel_materials tables...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS steel_material_categories (
        id SERIAL PRIMARY KEY,
        code VARCHAR(30) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    const categories = [
      { code: 'carbon', name: 'Carbon Steel', description: 'Cost-effective general purpose steels', order: 1 },
      { code: 'alloy', name: 'Alloy Steel', description: 'High-temperature and pressure resistant', order: 2 },
      { code: 'stainless', name: 'Stainless Steel', description: 'Corrosion resistant for harsh environments', order: 3 },
      { code: 'wear-resistant', name: 'Wear-Resistant Steel', description: 'Abrasion resistant for mining applications', order: 4 },
      { code: 'duplex', name: 'Duplex Stainless', description: 'Combined strength and corrosion resistance', order: 5 },
      { code: 'nickel-alloy', name: 'Nickel Alloy', description: 'Extreme corrosion and temperature resistance', order: 6 },
    ];

    for (const cat of categories) {
      await queryRunner.query(`
        INSERT INTO steel_material_categories (code, name, description, display_order)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
      `, [cat.code, cat.name, cat.description, cat.order]);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS steel_materials (
        id SERIAL PRIMARY KEY,
        code VARCHAR(30) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        category_id INTEGER REFERENCES steel_material_categories(id) ON DELETE SET NULL,
        density_kg_m3 NUMERIC(10,2) NOT NULL DEFAULT 7850,
        default_cost_per_kg_zar NUMERIC(10,2),
        specifications TEXT[],
        asme_p_number VARCHAR(10),
        asme_group_number VARCHAR(10),
        uns_number VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_steel_materials_category ON steel_materials(category_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_steel_materials_p_number ON steel_materials(asme_p_number)
    `);

    const carbonCat = await queryRunner.query(`SELECT id FROM steel_material_categories WHERE code = 'carbon'`);
    const alloyCat = await queryRunner.query(`SELECT id FROM steel_material_categories WHERE code = 'alloy'`);
    const stainlessCat = await queryRunner.query(`SELECT id FROM steel_material_categories WHERE code = 'stainless'`);
    const wearCat = await queryRunner.query(`SELECT id FROM steel_material_categories WHERE code = 'wear-resistant'`);
    const duplexCat = await queryRunner.query(`SELECT id FROM steel_material_categories WHERE code = 'duplex'`);
    const nickelCat = await queryRunner.query(`SELECT id FROM steel_material_categories WHERE code = 'nickel-alloy'`);

    const carbonId = carbonCat.length > 0 ? carbonCat[0].id : null;
    const alloyId = alloyCat.length > 0 ? alloyCat[0].id : null;
    const stainlessId = stainlessCat.length > 0 ? stainlessCat[0].id : null;
    const wearId = wearCat.length > 0 ? wearCat[0].id : null;
    const duplexId = duplexCat.length > 0 ? duplexCat[0].id : null;
    const nickelId = nickelCat.length > 0 ? nickelCat[0].id : null;

    const materials = [
      { code: 'CS-A53B', name: 'Carbon Steel (ASTM A53 Grade B)', desc: 'General purpose carbon steel for mining piping, cost-effective with good strength', catId: carbonId, density: 7850, cost: 32, specs: ['ASTM A53 Grade B', 'API 5L Grade B'], pNum: '1', pGroup: '1' },
      { code: 'CS-A106B', name: 'Carbon Steel (ASTM A106 Grade B)', desc: 'Seamless carbon steel for high-temperature service', catId: carbonId, density: 7850, cost: 38, specs: ['ASTM A106 Grade B'], pNum: '1', pGroup: '1' },
      { code: 'CS-A106C', name: 'Carbon Steel (ASTM A106 Grade C)', desc: 'Higher strength seamless carbon steel', catId: carbonId, density: 7850, cost: 42, specs: ['ASTM A106 Grade C'], pNum: '1', pGroup: '2' },
      { code: 'CS-A333-6', name: 'Low-Temp Carbon Steel (ASTM A333 Gr.6)', desc: 'For low temperature service down to -46°C', catId: carbonId, density: 7850, cost: 48, specs: ['ASTM A333 Grade 6'], pNum: '1', pGroup: '1' },
      { code: 'CS-A516-70', name: 'Carbon Steel Plate (ASTM A516 Gr.70)', desc: 'Pressure vessel plate for moderate and lower temperature service', catId: carbonId, density: 7850, cost: 35, specs: ['ASTM A516 Grade 70'], pNum: '1', pGroup: '2' },
      { code: 'CS-API5L-B', name: 'Line Pipe (API 5L Grade B)', desc: 'Oil and gas pipeline specification', catId: carbonId, density: 7850, cost: 34, specs: ['API 5L Grade B', 'PSL1', 'PSL2'], pNum: '1', pGroup: '1' },
      { code: 'CS-API5L-X52', name: 'Line Pipe (API 5L X52)', desc: 'Higher strength pipeline steel', catId: carbonId, density: 7850, cost: 40, specs: ['API 5L X52', 'PSL2'], pNum: '1', pGroup: '2' },
      { code: 'CS-API5L-X60', name: 'Line Pipe (API 5L X60)', desc: 'High strength pipeline steel', catId: carbonId, density: 7850, cost: 45, specs: ['API 5L X60', 'PSL2'], pNum: '1', pGroup: '2' },
      { code: 'CS-SABS62', name: 'SABS 62 ERW Pipe', desc: 'South African standard ERW pipe', catId: carbonId, density: 7850, cost: 28, specs: ['SABS 62'], pNum: '1', pGroup: '1' },
      { code: 'CS-SABS719', name: 'SABS 719 ERW Pipe', desc: 'South African standard large bore ERW pipe', catId: carbonId, density: 7850, cost: 30, specs: ['SABS 719'], pNum: '1', pGroup: '1' },

      { code: 'AS-P1', name: 'Alloy Steel (ASTM A335 P1)', desc: '0.5Mo alloy for elevated temperature service', catId: alloyId, density: 7850, cost: 65, specs: ['ASTM A335 P1', 'ASTM A234 WP1'], pNum: '3', pGroup: '1' },
      { code: 'AS-P11', name: 'Alloy Steel (ASTM A335 P11)', desc: '1.25Cr-0.5Mo for high temperature service', catId: alloyId, density: 7850, cost: 75, specs: ['ASTM A335 P11', 'ASTM A234 WP11'], pNum: '4', pGroup: '1' },
      { code: 'AS-P12', name: 'Alloy Steel (ASTM A335 P12)', desc: '1Cr-0.5Mo for high temperature service', catId: alloyId, density: 7850, cost: 72, specs: ['ASTM A335 P12'], pNum: '4', pGroup: '1' },
      { code: 'AS-P22', name: 'Alloy Steel (ASTM A335 P22)', desc: '2.25Cr-1Mo for severe high temperature service', catId: alloyId, density: 7850, cost: 85, specs: ['ASTM A335 P22', 'ASTM A234 WP22'], pNum: '5A', pGroup: '1' },
      { code: 'AS-P5', name: 'Alloy Steel (ASTM A335 P5)', desc: '5Cr-0.5Mo for high temperature service', catId: alloyId, density: 7850, cost: 90, specs: ['ASTM A335 P5'], pNum: '5B', pGroup: '1' },
      { code: 'AS-P9', name: 'Alloy Steel (ASTM A335 P9)', desc: '9Cr-1Mo for high temperature service', catId: alloyId, density: 7850, cost: 95, specs: ['ASTM A335 P9'], pNum: '5B', pGroup: '2' },
      { code: 'AS-P91', name: 'Alloy Steel (ASTM A335 P91)', desc: '9Cr-1Mo-V advanced creep resistant steel', catId: alloyId, density: 7850, cost: 120, specs: ['ASTM A335 P91'], pNum: '15E', pGroup: '1' },
      { code: 'AS-P92', name: 'Alloy Steel (ASTM A335 P92)', desc: '9Cr-2W advanced creep resistant steel', catId: alloyId, density: 7850, cost: 135, specs: ['ASTM A335 P92'], pNum: '15E', pGroup: '2' },

      { code: 'SS-304', name: 'Stainless Steel 304/304L', desc: 'Austenitic stainless steel for general corrosion resistance', catId: stainlessId, density: 7930, cost: 95, specs: ['ASTM A312 TP304', 'ASTM A312 TP304L'], pNum: '8', pGroup: '1' },
      { code: 'SS-316', name: 'Stainless Steel 316/316L', desc: 'Marine-grade stainless for acidic and chloride environments', catId: stainlessId, density: 8000, cost: 120, specs: ['ASTM A312 TP316', 'ASTM A312 TP316L'], pNum: '8', pGroup: '1' },
      { code: 'SS-321', name: 'Stainless Steel 321', desc: 'Titanium stabilized for high temperature service', catId: stainlessId, density: 7900, cost: 130, specs: ['ASTM A312 TP321', 'ASTM A312 TP321H'], pNum: '8', pGroup: '1' },
      { code: 'SS-347', name: 'Stainless Steel 347', desc: 'Niobium stabilized for high temperature service', catId: stainlessId, density: 7900, cost: 135, specs: ['ASTM A312 TP347', 'ASTM A312 TP347H'], pNum: '8', pGroup: '1' },
      { code: 'SS-309', name: 'Stainless Steel 309S', desc: 'High temperature oxidation resistance', catId: stainlessId, density: 7900, cost: 145, specs: ['ASTM A312 TP309S'], pNum: '8', pGroup: '2' },
      { code: 'SS-310', name: 'Stainless Steel 310S', desc: 'Highest temperature austenitic stainless', catId: stainlessId, density: 8000, cost: 160, specs: ['ASTM A312 TP310S'], pNum: '8', pGroup: '2' },
      { code: 'SS-410', name: 'Stainless Steel 410', desc: 'Martensitic stainless for wear and corrosion', catId: stainlessId, density: 7800, cost: 85, specs: ['ASTM A268 TP410'], pNum: '6', pGroup: '1' },

      { code: 'DSS-2205', name: 'Duplex Stainless 2205', desc: '22Cr duplex for strength and corrosion resistance', catId: duplexId, density: 7800, cost: 180, specs: ['ASTM A790 S31803', 'ASTM A790 S32205'], pNum: '10H', pGroup: '1' },
      { code: 'DSS-2507', name: 'Super Duplex 2507', desc: '25Cr super duplex for severe environments', catId: duplexId, density: 7800, cost: 250, specs: ['ASTM A790 S32750', 'ASTM A790 S32760'], pNum: '10H', pGroup: '1' },

      { code: 'NI-400', name: 'Monel 400', desc: 'Nickel-copper alloy for marine and chemical service', catId: nickelId, density: 8800, cost: 350, specs: ['ASTM B165', 'UNS N04400'], pNum: '42', pGroup: null },
      { code: 'NI-600', name: 'Inconel 600', desc: 'Nickel-chromium alloy for high temperature oxidation', catId: nickelId, density: 8470, cost: 420, specs: ['ASTM B168', 'UNS N06600'], pNum: '43', pGroup: null },
      { code: 'NI-625', name: 'Inconel 625', desc: 'Nickel-chromium-molybdenum for severe corrosion', catId: nickelId, density: 8440, cost: 520, specs: ['ASTM B444', 'UNS N06625'], pNum: '43', pGroup: null },
      { code: 'NI-C276', name: 'Hastelloy C-276', desc: 'Nickel-molybdenum-chromium for most aggressive environments', catId: nickelId, density: 8890, cost: 650, specs: ['ASTM B619', 'UNS N10276'], pNum: '43', pGroup: null },

      { code: 'AR-400', name: 'Abrasion-Resistant Steel (AR400)', desc: 'High-hardness steel for handling abrasive mining materials', catId: wearId, density: 7850, cost: 65, specs: ['AR400', 'Hardox 400 equivalent'], pNum: null, pGroup: null },
      { code: 'AR-450', name: 'Abrasion-Resistant Steel (AR450)', desc: 'Extra-hard steel for extreme abrasion resistance', catId: wearId, density: 7850, cost: 75, specs: ['AR450', 'Hardox 450 equivalent'], pNum: null, pGroup: null },
      { code: 'AR-500', name: 'Abrasion-Resistant Steel (AR500)', desc: 'Maximum hardness for the most demanding abrasive applications', catId: wearId, density: 7850, cost: 85, specs: ['AR500', 'Hardox 500 equivalent'], pNum: null, pGroup: null },
    ];

    for (const mat of materials) {
      await queryRunner.query(`
        INSERT INTO steel_materials (code, name, description, category_id, density_kg_m3, default_cost_per_kg_zar, specifications, asme_p_number, asme_group_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          category_id = EXCLUDED.category_id,
          density_kg_m3 = EXCLUDED.density_kg_m3,
          default_cost_per_kg_zar = EXCLUDED.default_cost_per_kg_zar,
          specifications = EXCLUDED.specifications,
          asme_p_number = EXCLUDED.asme_p_number,
          asme_group_number = EXCLUDED.asme_group_number,
          updated_at = NOW()
      `, [mat.code, mat.name, mat.desc, mat.catId, mat.density, mat.cost, mat.specs, mat.pNum, mat.pGroup]);
    }

    console.warn(`Added ${categories.length} categories and ${materials.length} steel materials`);
  }

  private async createMaterialLimitsTable(queryRunner: QueryRunner): Promise<void> {
    console.warn('Creating material_limits table...');

    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'material_limits'
      )
    `);

    if (tableExists[0]?.exists) {
      const columnExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'material_limits' AND column_name = 'specification_pattern'
        )
      `);

      if (!columnExists[0]?.exists) {
        console.warn('Dropping malformed material_limits table from previous run...');
        await queryRunner.query(`DROP TABLE material_limits CASCADE`);
      }
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS material_limits (
        id SERIAL PRIMARY KEY,
        specification_pattern VARCHAR(100) NOT NULL UNIQUE,
        material_type VARCHAR(100) NOT NULL,
        min_temp_c NUMERIC(8,2) NOT NULL,
        max_temp_c NUMERIC(8,2) NOT NULL,
        max_pressure_bar NUMERIC(10,2) NOT NULL,
        asme_p_number VARCHAR(10),
        asme_group_number VARCHAR(10),
        default_grade VARCHAR(30),
        notes TEXT,
        is_seamless BOOLEAN,
        is_welded BOOLEAN,
        standard_code VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_material_limits_spec ON material_limits(specification_pattern)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_material_limits_p_number ON material_limits(asme_p_number)
    `);

    const limits = [
      { spec: 'SABS 62', type: 'Carbon Steel ERW', minT: -20, maxT: 400, maxP: 100, pNum: '1', pGrp: '1', grade: null, notes: 'General purpose ERW pipe', seamless: false, welded: true, std: 'SABS' },
      { spec: 'SABS 719', type: 'Carbon Steel ERW', minT: -20, maxT: 400, maxP: 100, pNum: '1', pGrp: '1', grade: null, notes: 'Large bore ERW pipe', seamless: false, welded: true, std: 'SABS' },
      { spec: 'ASTM A106 Gr. A', type: 'Carbon Steel Seamless', minT: -29, maxT: 427, maxP: 400, pNum: '1', pGrp: '1', grade: 'A', notes: 'High temperature seamless pipe', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM A106 Gr. B', type: 'Carbon Steel Seamless', minT: -29, maxT: 427, maxP: 400, pNum: '1', pGrp: '1', grade: 'B', notes: 'High temperature seamless pipe', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM A106 Gr. C', type: 'Carbon Steel Seamless', minT: -29, maxT: 427, maxP: 400, pNum: '1', pGrp: '2', grade: 'C', notes: 'High temperature seamless pipe (higher strength)', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM A106', type: 'Carbon Steel Seamless', minT: -29, maxT: 427, maxP: 400, pNum: '1', pGrp: '1', grade: 'B', notes: 'High temperature seamless pipe', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM A53 Gr. A', type: 'Carbon Steel', minT: -29, maxT: 400, maxP: 250, pNum: '1', pGrp: '1', grade: 'A', notes: 'General purpose pipe', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A53 Gr. B', type: 'Carbon Steel', minT: -29, maxT: 400, maxP: 250, pNum: '1', pGrp: '1', grade: 'B', notes: 'General purpose pipe', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A53', type: 'Carbon Steel', minT: -29, maxT: 400, maxP: 250, pNum: '1', pGrp: '1', grade: 'B', notes: 'General purpose pipe - seamless or welded', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A333 Gr. 6', type: 'Low-Temp Carbon Steel', minT: -100, maxT: 400, maxP: 250, pNum: '1', pGrp: '1', grade: '6', notes: 'For temperatures down to -46°C', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM A333 Gr. 3', type: 'Low-Temp 3.5Ni Steel', minT: -100, maxT: 400, maxP: 250, pNum: '9A', pGrp: '1', grade: '3', notes: 'For temperatures down to -100°C', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM A333 Gr. 8', type: 'Cryogenic 9Ni Steel', minT: -196, maxT: 400, maxP: 250, pNum: '11A', pGrp: '1', grade: '8', notes: 'For cryogenic service down to -196°C', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM A333', type: 'Low-Temp Carbon Steel', minT: -100, maxT: 400, maxP: 250, pNum: '1', pGrp: '1', grade: '6', notes: 'For temperatures down to -100°C', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'API 5L Gr. B', type: 'Line Pipe Carbon Steel', minT: -29, maxT: 400, maxP: 250, pNum: '1', pGrp: '1', grade: 'B', notes: 'Oil and gas pipeline', seamless: null, welded: null, std: 'API' },
      { spec: 'API 5L X52', type: 'Line Pipe Carbon Steel', minT: -29, maxT: 400, maxP: 250, pNum: '1', pGrp: '2', grade: 'X52', notes: 'Higher strength pipeline', seamless: null, welded: null, std: 'API' },
      { spec: 'API 5L X60', type: 'Line Pipe Carbon Steel', minT: -29, maxT: 400, maxP: 250, pNum: '1', pGrp: '2', grade: 'X60', notes: 'High strength pipeline', seamless: null, welded: null, std: 'API' },
      { spec: 'API 5L X65', type: 'Line Pipe Carbon Steel', minT: -29, maxT: 400, maxP: 250, pNum: '1', pGrp: '3', grade: 'X65', notes: 'High strength pipeline', seamless: null, welded: null, std: 'API' },
      { spec: 'API 5L X70', type: 'Line Pipe Carbon Steel', minT: -29, maxT: 400, maxP: 250, pNum: '1', pGrp: '3', grade: 'X70', notes: 'Very high strength pipeline', seamless: null, welded: null, std: 'API' },
      { spec: 'API 5L', type: 'Line Pipe Carbon Steel', minT: -29, maxT: 400, maxP: 250, pNum: '1', pGrp: '1', grade: 'B', notes: 'Oil and gas pipeline', seamless: null, welded: null, std: 'API' },
      { spec: 'ASTM A179', type: 'Heat Exchanger Tube', minT: -29, maxT: 400, maxP: 160, pNum: '1', pGrp: '1', grade: null, notes: 'Cold-drawn seamless', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM A192', type: 'Boiler Tube', minT: -29, maxT: 454, maxP: 250, pNum: '1', pGrp: '1', grade: null, notes: 'High-pressure boiler service', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM A500', type: 'Structural Tubing', minT: -29, maxT: 200, maxP: 100, pNum: null, pGrp: null, grade: null, notes: 'Not for pressure service', seamless: false, welded: true, std: 'ASTM' },
      { spec: 'ASTM A335 P1', type: 'Alloy Steel 0.5Mo', minT: -29, maxT: 538, maxP: 400, pNum: '3', pGrp: '1', grade: 'P1', notes: 'Elevated temperature service', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM A335 P11', type: 'Alloy Steel 1.25Cr-0.5Mo', minT: -29, maxT: 593, maxP: 400, pNum: '4', pGrp: '1', grade: 'P11', notes: 'High temperature service', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM A335 P12', type: 'Alloy Steel 1Cr-0.5Mo', minT: -29, maxT: 593, maxP: 400, pNum: '4', pGrp: '1', grade: 'P12', notes: 'High temperature service', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM A335 P22', type: 'Alloy Steel 2.25Cr-1Mo', minT: -29, maxT: 593, maxP: 400, pNum: '5A', pGrp: '1', grade: 'P22', notes: 'High temperature service', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM A335 P5', type: 'Alloy Steel 5Cr-0.5Mo', minT: -29, maxT: 593, maxP: 400, pNum: '5B', pGrp: '1', grade: 'P5', notes: 'High temperature service', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM A335 P9', type: 'Alloy Steel 9Cr-1Mo', minT: -29, maxT: 593, maxP: 400, pNum: '5B', pGrp: '2', grade: 'P9', notes: 'High temperature service', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM A335 P91', type: 'Alloy Steel 9Cr-1Mo-V', minT: -29, maxT: 649, maxP: 400, pNum: '15E', pGrp: '1', grade: 'P91', notes: 'Advanced high temperature service', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM A335 P92', type: 'Alloy Steel 9Cr-2W', minT: -29, maxT: 649, maxP: 400, pNum: '15E', pGrp: '1', grade: 'P92', notes: 'Advanced high temperature service', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM A335', type: 'Alloy Steel Chrome-Moly', minT: -29, maxT: 593, maxP: 400, pNum: '4', pGrp: '1', grade: null, notes: 'High temperature alloy', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM A312 TP304', type: 'Stainless Steel 18Cr-8Ni', minT: -196, maxT: 816, maxP: 400, pNum: '8', pGrp: '1', grade: 'TP304', notes: 'General purpose austenitic', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A312 TP304L', type: 'Stainless Steel 18Cr-8Ni Low C', minT: -196, maxT: 816, maxP: 400, pNum: '8', pGrp: '1', grade: 'TP304L', notes: 'Improved weldability', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A312 TP304H', type: 'Stainless Steel 18Cr-8Ni High C', minT: -196, maxT: 816, maxP: 400, pNum: '8', pGrp: '1', grade: 'TP304H', notes: 'High temperature version', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A312 TP316', type: 'Stainless Steel 16Cr-12Ni-2Mo', minT: -196, maxT: 816, maxP: 400, pNum: '8', pGrp: '1', grade: 'TP316', notes: 'Improved corrosion resistance', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A312 TP316L', type: 'Stainless Steel 16Cr-12Ni-2Mo Low C', minT: -196, maxT: 816, maxP: 400, pNum: '8', pGrp: '1', grade: 'TP316L', notes: 'Improved weldability + corrosion resistance', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A312 TP316H', type: 'Stainless Steel 16Cr-12Ni-2Mo High C', minT: -196, maxT: 816, maxP: 400, pNum: '8', pGrp: '1', grade: 'TP316H', notes: 'High temperature version', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A312 TP321', type: 'Stainless Steel 18Cr-10Ni-Ti', minT: -196, maxT: 816, maxP: 400, pNum: '8', pGrp: '1', grade: 'TP321', notes: 'Stabilized for high temperature', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A312 TP321H', type: 'Stainless Steel 18Cr-10Ni-Ti High C', minT: -196, maxT: 816, maxP: 400, pNum: '8', pGrp: '1', grade: 'TP321H', notes: 'High temperature stabilized', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A312 TP347', type: 'Stainless Steel 18Cr-10Ni-Nb', minT: -196, maxT: 816, maxP: 400, pNum: '8', pGrp: '1', grade: 'TP347', notes: 'Stabilized for high temperature', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A312 TP347H', type: 'Stainless Steel 18Cr-10Ni-Nb High C', minT: -196, maxT: 816, maxP: 400, pNum: '8', pGrp: '1', grade: 'TP347H', notes: 'High temperature stabilized', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A312 TP309S', type: 'Stainless Steel 23Cr-12Ni', minT: -196, maxT: 1038, maxP: 400, pNum: '8', pGrp: '2', grade: 'TP309S', notes: 'High temperature oxidation resistance', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A312 TP310S', type: 'Stainless Steel 25Cr-20Ni', minT: -196, maxT: 1093, maxP: 400, pNum: '8', pGrp: '2', grade: 'TP310S', notes: 'Highest temperature austenitic', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A312', type: 'Stainless Steel', minT: -196, maxT: 816, maxP: 400, pNum: '8', pGrp: '1', grade: 'TP304', notes: 'Austenitic stainless - wide temp range', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A358', type: 'Stainless Steel Welded', minT: -196, maxT: 816, maxP: 400, pNum: '8', pGrp: '1', grade: null, notes: 'Electric-fusion welded stainless', seamless: false, welded: true, std: 'ASTM' },
      { spec: 'ASTM A790 S31803', type: 'Duplex Stainless 22Cr', minT: -46, maxT: 315, maxP: 400, pNum: '10H', pGrp: '1', grade: 'S31803', notes: 'Duplex 2205', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A790 S32205', type: 'Duplex Stainless 22Cr', minT: -46, maxT: 315, maxP: 400, pNum: '10H', pGrp: '1', grade: 'S32205', notes: 'Duplex 2205', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A790 S32750', type: 'Super Duplex 25Cr', minT: -46, maxT: 315, maxP: 400, pNum: '10H', pGrp: '1', grade: 'S32750', notes: 'Super Duplex 2507', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A790 S32760', type: 'Super Duplex 25Cr', minT: -46, maxT: 315, maxP: 400, pNum: '10H', pGrp: '1', grade: 'S32760', notes: 'Super Duplex Zeron 100', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM A790', type: 'Duplex/Super Duplex', minT: -46, maxT: 315, maxP: 400, pNum: '10H', pGrp: '1', grade: null, notes: 'Duplex stainless steel', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM B165', type: 'Nickel-Copper Alloy 400', minT: -196, maxT: 480, maxP: 400, pNum: '42', pGrp: null, grade: null, notes: 'Monel 400', seamless: true, welded: false, std: 'ASTM' },
      { spec: 'ASTM B168', type: 'Nickel-Chromium Alloy 600', minT: -196, maxT: 1093, maxP: 400, pNum: '43', pGrp: null, grade: null, notes: 'Inconel 600', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM B444', type: 'Nickel-Chromium-Molybdenum Alloy 625', minT: -196, maxT: 982, maxP: 400, pNum: '43', pGrp: null, grade: null, notes: 'Inconel 625', seamless: null, welded: null, std: 'ASTM' },
      { spec: 'ASTM B619', type: 'Nickel-Molybdenum-Chromium Alloy C-276', minT: -196, maxT: 1093, maxP: 400, pNum: '43', pGrp: null, grade: null, notes: 'Hastelloy C-276', seamless: null, welded: null, std: 'ASTM' },
    ];

    for (const lim of limits) {
      await queryRunner.query(`
        INSERT INTO material_limits (specification_pattern, material_type, min_temp_c, max_temp_c, max_pressure_bar, asme_p_number, asme_group_number, default_grade, notes, is_seamless, is_welded, standard_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (specification_pattern) DO UPDATE SET
          material_type = EXCLUDED.material_type,
          min_temp_c = EXCLUDED.min_temp_c,
          max_temp_c = EXCLUDED.max_temp_c,
          max_pressure_bar = EXCLUDED.max_pressure_bar,
          asme_p_number = EXCLUDED.asme_p_number,
          asme_group_number = EXCLUDED.asme_group_number,
          default_grade = EXCLUDED.default_grade,
          notes = EXCLUDED.notes
      `, [lim.spec, lim.type, lim.minT, lim.maxT, lim.maxP, lim.pNum, lim.pGrp, lim.grade, lim.notes, lim.seamless, lim.welded, lim.std]);
    }

    console.warn(`Added ${limits.length} material limit records`);
  }

  private async createPwhtRecommendationsTable(queryRunner: QueryRunner): Promise<void> {
    console.warn('Creating pwht_recommendations table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pwht_recommendations (
        id SERIAL PRIMARY KEY,
        asme_p_number VARCHAR(10) NOT NULL,
        asme_group_number VARCHAR(10),
        min_thickness_mm NUMERIC(8,2),
        max_thickness_mm NUMERIC(8,2),
        pwht_required BOOLEAN NOT NULL DEFAULT false,
        min_temp_c NUMERIC(8,2),
        max_temp_c NUMERIC(8,2),
        min_hold_time_per_25mm_hr NUMERIC(6,2),
        max_heating_rate_c_per_hr NUMERIC(8,2),
        max_cooling_rate_c_per_hr NUMERIC(8,2),
        exemption_conditions TEXT,
        code_reference VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(asme_p_number, asme_group_number, min_thickness_mm)
      )
    `);

    const pwhtRecommendations = [
      { pNum: '1', pGrp: '1', minThk: 0, maxThk: 32, pwht: false, minT: null, maxT: null, holdTime: null, notes: 'PWHT not required for thickness <= 32mm per ASME B31.3', code: 'ASME B31.3 Table 331.1.1' },
      { pNum: '1', pGrp: '1', minThk: 32, maxThk: null, pwht: true, minT: 595, maxT: 650, holdTime: 1, notes: 'PWHT required for thickness > 32mm', code: 'ASME B31.3 Table 331.1.1' },
      { pNum: '1', pGrp: '2', minThk: 0, maxThk: 19, pwht: false, minT: null, maxT: null, holdTime: null, notes: 'PWHT not required for thickness <= 19mm', code: 'ASME B31.3 Table 331.1.1' },
      { pNum: '1', pGrp: '2', minThk: 19, maxThk: null, pwht: true, minT: 595, maxT: 650, holdTime: 1, notes: 'PWHT required for thickness > 19mm', code: 'ASME B31.3 Table 331.1.1' },
      { pNum: '3', pGrp: '1', minThk: 0, maxThk: 16, pwht: false, minT: null, maxT: null, holdTime: null, notes: 'PWHT not required for thickness <= 16mm', code: 'ASME B31.3 Table 331.1.1' },
      { pNum: '3', pGrp: '1', minThk: 16, maxThk: null, pwht: true, minT: 595, maxT: 720, holdTime: 1, notes: 'PWHT required for 0.5Mo steels', code: 'ASME B31.3 Table 331.1.1' },
      { pNum: '4', pGrp: '1', minThk: 0, maxThk: 13, pwht: false, minT: null, maxT: null, holdTime: null, notes: 'PWHT not required for thickness <= 13mm with preheat', code: 'ASME B31.3 Table 331.1.1' },
      { pNum: '4', pGrp: '1', minThk: 13, maxThk: null, pwht: true, minT: 705, maxT: 760, holdTime: 1, notes: 'PWHT required for 1-1.25Cr-Mo steels', code: 'ASME B31.3 Table 331.1.1' },
      { pNum: '5A', pGrp: '1', minThk: 0, maxThk: 13, pwht: false, minT: null, maxT: null, holdTime: null, notes: 'PWHT not required for thickness <= 13mm with preheat >= 150°C', code: 'ASME B31.3 Table 331.1.1' },
      { pNum: '5A', pGrp: '1', minThk: 13, maxThk: null, pwht: true, minT: 705, maxT: 760, holdTime: 1, notes: 'PWHT required for 2.25Cr-1Mo steels', code: 'ASME B31.3 Table 331.1.1' },
      { pNum: '5B', pGrp: '1', minThk: 0, maxThk: null, pwht: true, minT: 705, maxT: 760, holdTime: 2, notes: 'PWHT always required for 5Cr-0.5Mo steels', code: 'ASME B31.3 Table 331.1.1' },
      { pNum: '5B', pGrp: '2', minThk: 0, maxThk: null, pwht: true, minT: 705, maxT: 760, holdTime: 2, notes: 'PWHT always required for 9Cr-1Mo steels', code: 'ASME B31.3 Table 331.1.1' },
      { pNum: '15E', pGrp: '1', minThk: 0, maxThk: null, pwht: true, minT: 730, maxT: 760, holdTime: 2, notes: 'PWHT always required for P91/P92 grade steels - critical temperature control', code: 'ASME B31.3 + AWS D10.10' },
      { pNum: '6', pGrp: '1', minThk: 0, maxThk: null, pwht: true, minT: 730, maxT: 790, holdTime: 1, notes: 'PWHT required for martensitic stainless', code: 'ASME B31.3 Table 331.1.1' },
      { pNum: '7', pGrp: '1', minThk: 0, maxThk: null, pwht: false, minT: null, maxT: null, holdTime: null, notes: 'PWHT generally not required for ferritic stainless but may be specified', code: 'ASME B31.3 Table 331.1.1' },
      { pNum: '8', pGrp: '1', minThk: 0, maxThk: null, pwht: false, minT: null, maxT: null, holdTime: null, notes: 'PWHT not required and generally not performed on austenitic stainless', code: 'ASME B31.3 Table 331.1.1', exemption: 'Solution annealing may be required after cold work' },
      { pNum: '8', pGrp: '2', minThk: 0, maxThk: null, pwht: false, minT: null, maxT: null, holdTime: null, notes: 'PWHT not required for high-alloy austenitic stainless', code: 'ASME B31.3 Table 331.1.1' },
      { pNum: '10H', pGrp: '1', minThk: 0, maxThk: null, pwht: false, minT: null, maxT: null, holdTime: null, notes: 'PWHT not required for duplex stainless - may cause sigma phase', code: 'ASME B31.3 + NORSOK M-601' },
      { pNum: '41', pGrp: null, minThk: 0, maxThk: null, pwht: false, minT: null, maxT: null, holdTime: null, notes: 'PWHT not required for nickel alloys', code: 'ASME B31.3 Table 331.1.1' },
      { pNum: '43', pGrp: null, minThk: 0, maxThk: null, pwht: false, minT: null, maxT: null, holdTime: null, notes: 'PWHT not required for Ni-Cr-Mo alloys', code: 'ASME B31.3 Table 331.1.1' },
    ];

    for (const rec of pwhtRecommendations) {
      await queryRunner.query(`
        INSERT INTO pwht_recommendations (asme_p_number, asme_group_number, min_thickness_mm, max_thickness_mm, pwht_required, min_temp_c, max_temp_c, min_hold_time_per_25mm_hr, code_reference, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (asme_p_number, asme_group_number, min_thickness_mm) DO UPDATE SET
          pwht_required = EXCLUDED.pwht_required,
          min_temp_c = EXCLUDED.min_temp_c,
          max_temp_c = EXCLUDED.max_temp_c,
          min_hold_time_per_25mm_hr = EXCLUDED.min_hold_time_per_25mm_hr,
          notes = EXCLUDED.notes
      `, [rec.pNum, rec.pGrp, rec.minThk, rec.maxThk, rec.pwht, rec.minT, rec.maxT, rec.holdTime, rec.code, rec.notes]);
    }

    console.warn(`Added ${pwhtRecommendations.length} PWHT recommendation records`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('Reverting frontend data migration...');

    await queryRunner.query(`DROP TABLE IF EXISTS pwht_recommendations CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS material_limits CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS steel_materials CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS steel_material_categories CASCADE`);

    console.warn('Frontend data migration reverted.');
  }
}
