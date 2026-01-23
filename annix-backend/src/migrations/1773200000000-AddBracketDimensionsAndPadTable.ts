import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBracketDimensionsAndPadTable1773200000000 implements MigrationInterface {
  name = 'AddBracketDimensionsAndPadTable1773200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding bracket dimensions and reinforcement pad lookup tables...');

    await queryRunner.query(`
      ALTER TABLE bracket_types
      ADD COLUMN IF NOT EXISTS "dimension_a_mm" DECIMAL(8,2),
      ADD COLUMN IF NOT EXISTS "dimension_b_mm" DECIMAL(8,2),
      ADD COLUMN IF NOT EXISTS "rod_diameter_mm" DECIMAL(8,2),
      ADD COLUMN IF NOT EXISTS "width_mm" DECIMAL(8,2),
      ADD COLUMN IF NOT EXISTS "thickness_mm" DECIMAL(8,2),
      ADD COLUMN IF NOT EXISTS "length_mm" DECIMAL(8,2),
      ADD COLUMN IF NOT EXISTS "brace_length_mm" DECIMAL(8,2),
      ADD COLUMN IF NOT EXISTS "base_width_mm" DECIMAL(8,2),
      ADD COLUMN IF NOT EXISTS "base_length_mm" DECIMAL(8,2),
      ADD COLUMN IF NOT EXISTS "height_mm" DECIMAL(8,2),
      ADD COLUMN IF NOT EXISTS "weight_kg_per_unit" DECIMAL(8,3),
      ADD COLUMN IF NOT EXISTS "max_load_kg" DECIMAL(10,2)
    `);

    await queryRunner.query(`
      INSERT INTO bracket_types (
        type_code, display_name, description, min_nb_mm, max_nb_mm,
        weight_factor, base_cost_per_unit, insulated_suitable, allows_expansion, is_anchor_type
      )
      VALUES (
        'BAND_HANGER', 'Band Hanger', 'Light-duty hanger for small pipes, attaches around pipe with band',
        15, 100, 0.6, 120, false, true, false
      )
      ON CONFLICT (type_code) DO NOTHING
    `);

    const bracketDimensions = [
      { typeCode: 'CLEVIS_HANGER', dimA: 105, dimB: 151, rod: 12.7, weight: 0.57, maxLoad: 649 },
      { typeCode: 'THREE_BOLT_CLAMP', width: 51, thickness: 6.35, weight: 0.23, maxLoad: 454 },
      { typeCode: 'WELDED_BRACKET', length: 305, brace: 152, weight: 1.68, maxLoad: 1361 },
      { typeCode: 'PIPE_SADDLE', baseW: 152, baseL: 152, height: 203, weight: 2.69, maxLoad: 567 },
      { typeCode: 'U_BOLT', rod: 10, weight: 0.15, maxLoad: 227 },
      { typeCode: 'ROLLER_SUPPORT', baseW: 200, baseL: 300, height: 150, weight: 5.0, maxLoad: 2000 },
      { typeCode: 'SLIDE_PLATE', baseW: 250, baseL: 350, thickness: 10, weight: 6.5, maxLoad: 2500 },
      { typeCode: 'BAND_HANGER', width: 25, thickness: 2, weight: 0.10, maxLoad: 150 },
    ];

    for (const dim of bracketDimensions) {
      await queryRunner.query(`
        UPDATE bracket_types SET
          dimension_a_mm = COALESCE($2, dimension_a_mm),
          dimension_b_mm = COALESCE($3, dimension_b_mm),
          rod_diameter_mm = COALESCE($4, rod_diameter_mm),
          width_mm = COALESCE($5, width_mm),
          thickness_mm = COALESCE($6, thickness_mm),
          length_mm = COALESCE($7, length_mm),
          brace_length_mm = COALESCE($8, brace_length_mm),
          base_width_mm = COALESCE($9, base_width_mm),
          base_length_mm = COALESCE($10, base_length_mm),
          height_mm = COALESCE($11, height_mm),
          weight_kg_per_unit = COALESCE($12, weight_kg_per_unit),
          max_load_kg = COALESCE($13, max_load_kg)
        WHERE type_code = $1
      `, [
        dim.typeCode,
        dim.dimA || null,
        dim.dimB || null,
        dim.rod || null,
        dim.width || null,
        dim.thickness || null,
        dim.length || null,
        dim.brace || null,
        dim.baseW || null,
        dim.baseL || null,
        dim.height || null,
        dim.weight || null,
        dim.maxLoad || null,
      ]);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reinforcement_pad_standards (
        id SERIAL PRIMARY KEY,
        branch_nps VARCHAR(10) NOT NULL,
        branch_nb_mm INT NOT NULL,
        header_nps VARCHAR(10) NOT NULL,
        header_nb_mm INT NOT NULL,
        min_pad_width_mm DECIMAL(8,2) NOT NULL,
        min_pad_thickness_mm DECIMAL(8,2) NOT NULL,
        typical_weight_kg DECIMAL(8,3) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(branch_nb_mm, header_nb_mm)
      )
    `);

    const padStandards = [
      { branchNps: '1"', branchNb: 25, headerNps: '3"', headerNb: 80, width: 38, thick: 4.8, weight: 0.3 },
      { branchNps: '1"', branchNb: 25, headerNps: '4"', headerNb: 100, width: 38, thick: 4.8, weight: 0.4 },
      { branchNps: '2"', branchNb: 50, headerNps: '4"', headerNb: 100, width: 51, thick: 6.4, weight: 0.5 },
      { branchNps: '2"', branchNb: 50, headerNps: '6"', headerNb: 150, width: 51, thick: 6.4, weight: 0.7 },
      { branchNps: '3"', branchNb: 80, headerNps: '6"', headerNb: 150, width: 64, thick: 7.9, weight: 1.2 },
      { branchNps: '3"', branchNb: 80, headerNps: '8"', headerNb: 200, width: 64, thick: 7.9, weight: 1.5 },
      { branchNps: '4"', branchNb: 100, headerNps: '8"', headerNb: 200, width: 76, thick: 9.5, weight: 1.9 },
      { branchNps: '4"', branchNb: 100, headerNps: '10"', headerNb: 250, width: 76, thick: 9.5, weight: 2.3 },
      { branchNps: '6"', branchNb: 150, headerNps: '10"', headerNb: 250, width: 102, thick: 12.7, weight: 3.5 },
      { branchNps: '6"', branchNb: 150, headerNps: '12"', headerNb: 300, width: 102, thick: 12.7, weight: 4.2 },
      { branchNps: '8"', branchNb: 200, headerNps: '12"', headerNb: 300, width: 127, thick: 15.9, weight: 5.7 },
      { branchNps: '8"', branchNb: 200, headerNps: '16"', headerNb: 400, width: 127, thick: 15.9, weight: 6.8 },
      { branchNps: '10"', branchNb: 250, headerNps: '16"', headerNb: 400, width: 152, thick: 19.1, weight: 8.2 },
      { branchNps: '10"', branchNb: 250, headerNps: '20"', headerNb: 500, width: 152, thick: 19.1, weight: 9.5 },
      { branchNps: '12"', branchNb: 300, headerNps: '20"', headerNb: 500, width: 178, thick: 19.1, weight: 11.0 },
      { branchNps: '12"', branchNb: 300, headerNps: '24"', headerNb: 600, width: 178, thick: 19.1, weight: 12.5 },
    ];

    for (const pad of padStandards) {
      await queryRunner.query(`
        INSERT INTO reinforcement_pad_standards (
          branch_nps, branch_nb_mm, header_nps, header_nb_mm,
          min_pad_width_mm, min_pad_thickness_mm, typical_weight_kg
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (branch_nb_mm, header_nb_mm) DO UPDATE SET
          min_pad_width_mm = EXCLUDED.min_pad_width_mm,
          min_pad_thickness_mm = EXCLUDED.min_pad_thickness_mm,
          typical_weight_kg = EXCLUDED.typical_weight_kg
      `, [pad.branchNps, pad.branchNb, pad.headerNps, pad.headerNb, pad.width, pad.thick, pad.weight]);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bracket_dimensions_by_size (
        id SERIAL PRIMARY KEY,
        bracket_type_code VARCHAR(50) NOT NULL REFERENCES bracket_types(type_code),
        nps VARCHAR(10) NOT NULL,
        nb_mm INT NOT NULL,
        dimension_a_mm DECIMAL(8,2),
        dimension_b_mm DECIMAL(8,2),
        rod_diameter_mm DECIMAL(8,2),
        unit_weight_kg DECIMAL(8,3) NOT NULL,
        max_load_kg DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(bracket_type_code, nb_mm)
      )
    `);

    const clevisBySize = [
      { nps: '1/2"', nb: 15, dimA: 38, dimB: 57, rod: 10, weight: 0.20, load: 250 },
      { nps: '3/4"', nb: 20, dimA: 44, dimB: 64, rod: 10, weight: 0.23, load: 280 },
      { nps: '1"', nb: 25, dimA: 51, dimB: 73, rod: 10, weight: 0.27, load: 320 },
      { nps: '1-1/4"', nb: 32, dimA: 57, dimB: 83, rod: 10, weight: 0.32, load: 380 },
      { nps: '1-1/2"', nb: 40, dimA: 64, dimB: 92, rod: 10, weight: 0.36, load: 430 },
      { nps: '2"', nb: 50, dimA: 76, dimB: 111, rod: 10, weight: 0.45, load: 520 },
      { nps: '2-1/2"', nb: 65, dimA: 89, dimB: 127, rod: 10, weight: 0.54, load: 610 },
      { nps: '3"', nb: 80, dimA: 95, dimB: 137, rod: 12, weight: 0.64, load: 720 },
      { nps: '4"', nb: 100, dimA: 108, dimB: 156, rod: 12, weight: 0.82, load: 900 },
      { nps: '5"', nb: 125, dimA: 127, dimB: 181, rod: 16, weight: 1.05, load: 1100 },
      { nps: '6"', nb: 150, dimA: 146, dimB: 206, rod: 16, weight: 1.32, load: 1350 },
      { nps: '8"', nb: 200, dimA: 178, dimB: 254, rod: 20, weight: 1.86, load: 1800 },
      { nps: '10"', nb: 250, dimA: 216, dimB: 305, rod: 20, weight: 2.50, load: 2300 },
      { nps: '12"', nb: 300, dimA: 254, dimB: 356, rod: 24, weight: 3.20, load: 2800 },
      { nps: '14"', nb: 350, dimA: 279, dimB: 394, rod: 24, weight: 3.80, load: 3200 },
      { nps: '16"', nb: 400, dimA: 318, dimB: 445, rod: 30, weight: 4.50, load: 3700 },
      { nps: '18"', nb: 450, dimA: 356, dimB: 495, rod: 30, weight: 5.30, load: 4200 },
      { nps: '20"', nb: 500, dimA: 394, dimB: 546, rod: 30, weight: 6.20, load: 4700 },
      { nps: '24"', nb: 600, dimA: 470, dimB: 648, rod: 36, weight: 8.00, load: 5500 },
    ];

    for (const dim of clevisBySize) {
      await queryRunner.query(`
        INSERT INTO bracket_dimensions_by_size (
          bracket_type_code, nps, nb_mm, dimension_a_mm, dimension_b_mm,
          rod_diameter_mm, unit_weight_kg, max_load_kg
        )
        VALUES ('CLEVIS_HANGER', $1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (bracket_type_code, nb_mm) DO UPDATE SET
          dimension_a_mm = EXCLUDED.dimension_a_mm,
          dimension_b_mm = EXCLUDED.dimension_b_mm,
          rod_diameter_mm = EXCLUDED.rod_diameter_mm,
          unit_weight_kg = EXCLUDED.unit_weight_kg,
          max_load_kg = EXCLUDED.max_load_kg
      `, [dim.nps, dim.nb, dim.dimA, dim.dimB, dim.rod, dim.weight, dim.load]);
    }

    const pipeSaddleBySize = [
      { nps: '6"', nb: 150, baseW: 152, baseL: 152, height: 127, weight: 2.3, load: 900 },
      { nps: '8"', nb: 200, baseW: 178, baseL: 178, height: 152, weight: 3.2, load: 1200 },
      { nps: '10"', nb: 250, baseW: 203, baseL: 203, height: 178, weight: 4.3, load: 1500 },
      { nps: '12"', nb: 300, baseW: 229, baseL: 229, height: 203, weight: 5.5, load: 1900 },
      { nps: '14"', nb: 350, baseW: 254, baseL: 254, height: 229, weight: 6.8, load: 2300 },
      { nps: '16"', nb: 400, baseW: 279, baseL: 279, height: 254, weight: 8.2, load: 2700 },
      { nps: '18"', nb: 450, baseW: 305, baseL: 305, height: 279, weight: 9.8, load: 3100 },
      { nps: '20"', nb: 500, baseW: 330, baseL: 330, height: 305, weight: 11.5, load: 3600 },
      { nps: '24"', nb: 600, baseW: 381, baseL: 381, height: 356, weight: 15.0, load: 4500 },
      { nps: '30"', nb: 750, baseW: 457, baseL: 457, height: 432, weight: 22.0, load: 6000 },
      { nps: '36"', nb: 900, baseW: 533, baseL: 533, height: 508, weight: 30.0, load: 7500 },
    ];

    for (const dim of pipeSaddleBySize) {
      await queryRunner.query(`
        INSERT INTO bracket_dimensions_by_size (
          bracket_type_code, nps, nb_mm, dimension_a_mm, dimension_b_mm,
          rod_diameter_mm, unit_weight_kg, max_load_kg
        )
        VALUES ('PIPE_SADDLE', $1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (bracket_type_code, nb_mm) DO UPDATE SET
          dimension_a_mm = EXCLUDED.dimension_a_mm,
          dimension_b_mm = EXCLUDED.dimension_b_mm,
          unit_weight_kg = EXCLUDED.unit_weight_kg,
          max_load_kg = EXCLUDED.max_load_kg
      `, [dim.nps, dim.nb, dim.baseW, dim.baseL, dim.height, dim.weight, dim.load]);
    }

    console.warn('Bracket dimensions and reinforcement pad standards added successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS bracket_dimensions_by_size`);
    await queryRunner.query(`DROP TABLE IF EXISTS reinforcement_pad_standards`);

    await queryRunner.query(`
      ALTER TABLE bracket_types
      DROP COLUMN IF EXISTS "dimension_a_mm",
      DROP COLUMN IF EXISTS "dimension_b_mm",
      DROP COLUMN IF EXISTS "rod_diameter_mm",
      DROP COLUMN IF EXISTS "width_mm",
      DROP COLUMN IF EXISTS "thickness_mm",
      DROP COLUMN IF EXISTS "length_mm",
      DROP COLUMN IF EXISTS "brace_length_mm",
      DROP COLUMN IF EXISTS "base_width_mm",
      DROP COLUMN IF EXISTS "base_length_mm",
      DROP COLUMN IF EXISTS "height_mm",
      DROP COLUMN IF EXISTS "weight_kg_per_unit",
      DROP COLUMN IF EXISTS "max_load_kg"
    `);

    await queryRunner.query(`DELETE FROM bracket_types WHERE type_code = 'BAND_HANGER'`);
  }
}
