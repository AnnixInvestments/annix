import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsoJisAndSystemEnhancements1774900000000
  implements MigrationInterface
{
  name = 'AddIsoJisAndSystemEnhancements1774900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      'Adding ISO/JIS pipe standards and system enhancements (Pass 4)...'
    );

    // ============================================================
    // PART 1: ISO 1127 - Stainless Steel Tubes (Metric)
    // ============================================================
    console.warn('Adding ISO 1127 stainless steel tube dimensions...');

    const iso1127Dimensions = [
      { od: 10.2, wt: [1.0, 1.2, 1.6, 2.0] },
      { od: 13.5, wt: [1.0, 1.2, 1.6, 2.0, 2.3] },
      { od: 17.2, wt: [1.0, 1.2, 1.6, 2.0, 2.3, 2.6] },
      { od: 21.3, wt: [1.0, 1.2, 1.6, 2.0, 2.3, 2.6, 2.9] },
      { od: 26.9, wt: [1.0, 1.2, 1.6, 2.0, 2.3, 2.6, 2.9, 3.2] },
      { od: 33.7, wt: [1.2, 1.6, 2.0, 2.3, 2.6, 2.9, 3.2, 3.6, 4.0] },
      { od: 42.4, wt: [1.2, 1.6, 2.0, 2.3, 2.6, 2.9, 3.2, 3.6, 4.0] },
      { od: 48.3, wt: [1.2, 1.6, 2.0, 2.3, 2.6, 2.9, 3.2, 3.6, 4.0, 4.5] },
      { od: 60.3, wt: [1.6, 2.0, 2.3, 2.6, 2.9, 3.2, 3.6, 4.0, 4.5, 5.0] },
      { od: 76.1, wt: [1.6, 2.0, 2.3, 2.6, 2.9, 3.2, 3.6, 4.0, 4.5, 5.0, 5.6] },
      {
        od: 88.9,
        wt: [2.0, 2.3, 2.6, 2.9, 3.2, 3.6, 4.0, 4.5, 5.0, 5.6, 6.3],
      },
      {
        od: 101.6,
        wt: [2.0, 2.3, 2.6, 2.9, 3.2, 3.6, 4.0, 4.5, 5.0, 5.6, 6.3],
      },
      {
        od: 114.3,
        wt: [2.0, 2.6, 2.9, 3.2, 3.6, 4.0, 4.5, 5.0, 5.6, 6.3, 7.1],
      },
      {
        od: 139.7,
        wt: [2.6, 2.9, 3.2, 3.6, 4.0, 4.5, 5.0, 5.6, 6.3, 7.1, 8.0],
      },
      {
        od: 168.3,
        wt: [2.9, 3.2, 3.6, 4.0, 4.5, 5.0, 5.6, 6.3, 7.1, 8.0, 8.8],
      },
      {
        od: 219.1,
        wt: [3.2, 3.6, 4.0, 4.5, 5.0, 5.6, 6.3, 7.1, 8.0, 8.8, 10.0],
      },
      {
        od: 273.0,
        wt: [3.6, 4.0, 4.5, 5.0, 5.6, 6.3, 7.1, 8.0, 8.8, 10.0, 11.0],
      },
      {
        od: 323.9,
        wt: [4.0, 4.5, 5.0, 5.6, 6.3, 7.1, 8.0, 8.8, 10.0, 11.0, 12.5],
      },
    ];

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS iso_pipe_dimensions (
        id SERIAL PRIMARY KEY,
        standard VARCHAR(20) NOT NULL,
        outside_diameter_mm DECIMAL(10,2) NOT NULL,
        wall_thickness_mm DECIMAL(8,3) NOT NULL,
        inside_diameter_mm DECIMAL(10,2),
        mass_per_meter_kg DECIMAL(10,3),
        UNIQUE(standard, outside_diameter_mm, wall_thickness_mm)
      )
    `);

    for (const dim of iso1127Dimensions) {
      for (const wt of dim.wt) {
        const id = dim.od - 2 * wt;
        const mass = ((dim.od - wt) * wt * Math.PI * 7.93) / 1000;
        await queryRunner.query(
          `
          INSERT INTO iso_pipe_dimensions (standard, outside_diameter_mm, wall_thickness_mm, inside_diameter_mm, mass_per_meter_kg)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (standard, outside_diameter_mm, wall_thickness_mm) DO UPDATE SET
            inside_diameter_mm = EXCLUDED.inside_diameter_mm,
            mass_per_meter_kg = EXCLUDED.mass_per_meter_kg
        `,
          ['ISO 1127', dim.od, wt, id.toFixed(2), mass.toFixed(3)]
        );
      }
    }

    // ============================================================
    // PART 2: ISO 4200 - Plain End Steel Tubes (Carbon/Alloy)
    // ============================================================
    console.warn('Adding ISO 4200 plain end steel tube dimensions...');

    const iso4200Dimensions = [
      { od: 21.3, wt: [2.0, 2.3, 2.6, 2.9, 3.2, 3.6] },
      { od: 26.9, wt: [2.0, 2.3, 2.6, 2.9, 3.2, 3.6, 4.0] },
      { od: 33.7, wt: [2.3, 2.6, 2.9, 3.2, 3.6, 4.0, 4.5] },
      { od: 42.4, wt: [2.6, 2.9, 3.2, 3.6, 4.0, 4.5, 5.0] },
      { od: 48.3, wt: [2.6, 2.9, 3.2, 3.6, 4.0, 4.5, 5.0, 5.6] },
      { od: 60.3, wt: [2.9, 3.2, 3.6, 4.0, 4.5, 5.0, 5.6, 6.3] },
      { od: 76.1, wt: [2.9, 3.2, 3.6, 4.0, 4.5, 5.0, 5.6, 6.3, 7.1] },
      { od: 88.9, wt: [3.2, 3.6, 4.0, 4.5, 5.0, 5.6, 6.3, 7.1, 8.0] },
      { od: 101.6, wt: [3.6, 4.0, 4.5, 5.0, 5.6, 6.3, 7.1, 8.0, 8.8] },
      { od: 114.3, wt: [3.6, 4.0, 4.5, 5.0, 5.6, 6.3, 7.1, 8.0, 8.8, 10.0] },
      { od: 139.7, wt: [4.0, 4.5, 5.0, 5.6, 6.3, 7.1, 8.0, 8.8, 10.0, 11.0] },
      {
        od: 168.3,
        wt: [4.5, 5.0, 5.6, 6.3, 7.1, 8.0, 8.8, 10.0, 11.0, 12.5],
      },
      {
        od: 219.1,
        wt: [5.0, 5.6, 6.3, 7.1, 8.0, 8.8, 10.0, 11.0, 12.5, 14.2],
      },
      {
        od: 273.0,
        wt: [5.6, 6.3, 7.1, 8.0, 8.8, 10.0, 11.0, 12.5, 14.2, 16.0],
      },
      {
        od: 323.9,
        wt: [5.6, 6.3, 7.1, 8.0, 8.8, 10.0, 11.0, 12.5, 14.2, 16.0, 17.5],
      },
      {
        od: 355.6,
        wt: [6.3, 7.1, 8.0, 8.8, 10.0, 11.0, 12.5, 14.2, 16.0, 17.5, 20.0],
      },
      {
        od: 406.4,
        wt: [6.3, 7.1, 8.0, 8.8, 10.0, 11.0, 12.5, 14.2, 16.0, 17.5, 20.0],
      },
      {
        od: 457.0,
        wt: [6.3, 7.1, 8.0, 10.0, 11.0, 12.5, 14.2, 16.0, 17.5, 20.0, 22.2],
      },
      {
        od: 508.0,
        wt: [6.3, 7.1, 8.0, 10.0, 11.0, 12.5, 14.2, 16.0, 17.5, 20.0, 22.2],
      },
      {
        od: 610.0,
        wt: [6.3, 7.1, 8.0, 10.0, 12.5, 14.2, 16.0, 17.5, 20.0, 22.2, 25.0],
      },
    ];

    for (const dim of iso4200Dimensions) {
      for (const wt of dim.wt) {
        const id = dim.od - 2 * wt;
        const mass = ((dim.od - wt) * wt * Math.PI * 7.85) / 1000;
        await queryRunner.query(
          `
          INSERT INTO iso_pipe_dimensions (standard, outside_diameter_mm, wall_thickness_mm, inside_diameter_mm, mass_per_meter_kg)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (standard, outside_diameter_mm, wall_thickness_mm) DO UPDATE SET
            inside_diameter_mm = EXCLUDED.inside_diameter_mm,
            mass_per_meter_kg = EXCLUDED.mass_per_meter_kg
        `,
          ['ISO 4200', dim.od, wt, id.toFixed(2), mass.toFixed(3)]
        );
      }
    }

    // ============================================================
    // PART 3: JIS G3454 - Carbon Steel Pipes for Pressure Service
    // ============================================================
    console.warn('Adding JIS G3454/G3456 Japanese pipe standards...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS jis_pipe_dimensions (
        id SERIAL PRIMARY KEY,
        standard VARCHAR(20) NOT NULL,
        nominal_diameter VARCHAR(20) NOT NULL,
        outside_diameter_mm DECIMAL(10,2) NOT NULL,
        schedule VARCHAR(10),
        wall_thickness_mm DECIMAL(8,3) NOT NULL,
        mass_per_meter_kg DECIMAL(10,3),
        UNIQUE(standard, nominal_diameter, schedule, wall_thickness_mm)
      )
    `);

    const jisG3454Data = [
      { dn: '15A', od: 21.7, schedules: { Sch40: 2.8, Sch80: 3.7 } },
      { dn: '20A', od: 27.2, schedules: { Sch40: 2.9, Sch80: 3.9 } },
      { dn: '25A', od: 34.0, schedules: { Sch40: 3.4, Sch80: 4.5 } },
      { dn: '32A', od: 42.7, schedules: { Sch40: 3.6, Sch80: 4.9 } },
      { dn: '40A', od: 48.6, schedules: { Sch40: 3.7, Sch80: 5.1 } },
      { dn: '50A', od: 60.5, schedules: { Sch40: 3.9, Sch80: 5.5 } },
      { dn: '65A', od: 76.3, schedules: { Sch40: 4.2, Sch80: 6.0 } },
      { dn: '80A', od: 89.1, schedules: { Sch40: 4.2, Sch80: 6.6 } },
      { dn: '90A', od: 101.6, schedules: { Sch40: 4.2, Sch80: 6.6 } },
      { dn: '100A', od: 114.3, schedules: { Sch40: 4.5, Sch80: 7.1 } },
      { dn: '125A', od: 139.8, schedules: { Sch40: 4.9, Sch80: 8.1 } },
      { dn: '150A', od: 165.2, schedules: { Sch40: 5.0, Sch80: 8.7 } },
      { dn: '200A', od: 216.3, schedules: { Sch40: 6.4, Sch80: 10.3 } },
      { dn: '250A', od: 267.4, schedules: { Sch40: 6.4, Sch80: 12.7 } },
      { dn: '300A', od: 318.5, schedules: { Sch40: 6.4, Sch80: 14.3 } },
      { dn: '350A', od: 355.6, schedules: { Sch40: 7.9, Sch80: 15.1 } },
      { dn: '400A', od: 406.4, schedules: { Sch40: 7.9, Sch80: 16.7 } },
      { dn: '450A', od: 457.2, schedules: { Sch40: 7.9, Sch80: 19.1 } },
      { dn: '500A', od: 508.0, schedules: { Sch40: 9.5, Sch80: 20.6 } },
      { dn: '600A', od: 609.6, schedules: { Sch40: 9.5, Sch80: 24.6 } },
    ];

    for (const pipe of jisG3454Data) {
      for (const [sch, wt] of Object.entries(pipe.schedules)) {
        const mass = ((pipe.od - wt) * wt * Math.PI * 7.85) / 1000;
        await queryRunner.query(
          `
          INSERT INTO jis_pipe_dimensions (standard, nominal_diameter, outside_diameter_mm, schedule, wall_thickness_mm, mass_per_meter_kg)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (standard, nominal_diameter, schedule, wall_thickness_mm) DO UPDATE SET
            outside_diameter_mm = EXCLUDED.outside_diameter_mm,
            mass_per_meter_kg = EXCLUDED.mass_per_meter_kg
        `,
          ['JIS G3454', pipe.dn, pipe.od, sch, wt, mass.toFixed(3)]
        );
      }
    }

    // JIS G3456 - Carbon Steel Pipes for High Temperature Service
    const jisG3456Data = [
      {
        dn: '15A',
        od: 21.7,
        schedules: { Sch40: 2.8, Sch80: 3.7, Sch160: 4.7 },
      },
      {
        dn: '20A',
        od: 27.2,
        schedules: { Sch40: 2.9, Sch80: 3.9, Sch160: 5.5 },
      },
      {
        dn: '25A',
        od: 34.0,
        schedules: { Sch40: 3.4, Sch80: 4.5, Sch160: 6.4 },
      },
      {
        dn: '32A',
        od: 42.7,
        schedules: { Sch40: 3.6, Sch80: 4.9, Sch160: 6.4 },
      },
      {
        dn: '40A',
        od: 48.6,
        schedules: { Sch40: 3.7, Sch80: 5.1, Sch160: 7.1 },
      },
      {
        dn: '50A',
        od: 60.5,
        schedules: { Sch40: 3.9, Sch80: 5.5, Sch160: 8.7 },
      },
      {
        dn: '65A',
        od: 76.3,
        schedules: { Sch40: 4.2, Sch80: 6.0, Sch160: 9.5 },
      },
      {
        dn: '80A',
        od: 89.1,
        schedules: { Sch40: 4.2, Sch80: 6.6, Sch160: 11.1 },
      },
      {
        dn: '100A',
        od: 114.3,
        schedules: { Sch40: 4.5, Sch80: 7.1, Sch160: 13.5 },
      },
      {
        dn: '150A',
        od: 165.2,
        schedules: { Sch40: 5.0, Sch80: 8.7, Sch160: 18.2 },
      },
      {
        dn: '200A',
        od: 216.3,
        schedules: { Sch40: 6.4, Sch80: 10.3, Sch160: 23.0 },
      },
      {
        dn: '250A',
        od: 267.4,
        schedules: { Sch40: 6.4, Sch80: 12.7, Sch160: 28.6 },
      },
      {
        dn: '300A',
        od: 318.5,
        schedules: { Sch40: 6.4, Sch80: 14.3, Sch160: 33.3 },
      },
    ];

    for (const pipe of jisG3456Data) {
      for (const [sch, wt] of Object.entries(pipe.schedules)) {
        const mass = ((pipe.od - wt) * wt * Math.PI * 7.85) / 1000;
        await queryRunner.query(
          `
          INSERT INTO jis_pipe_dimensions (standard, nominal_diameter, outside_diameter_mm, schedule, wall_thickness_mm, mass_per_meter_kg)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (standard, nominal_diameter, schedule, wall_thickness_mm) DO UPDATE SET
            outside_diameter_mm = EXCLUDED.outside_diameter_mm,
            mass_per_meter_kg = EXCLUDED.mass_per_meter_kg
        `,
          ['JIS G3456', pipe.dn, pipe.od, sch, wt, mass.toFixed(3)]
        );
      }
    }

    // ============================================================
    // PART 4: ASME SA- Prefix Aliases
    // ============================================================
    console.warn('Adding ASME SA- prefix aliases for code compliance...');

    await queryRunner.query(`
      ALTER TABLE pipe_steel_grades
      ADD COLUMN IF NOT EXISTS asme_equivalent VARCHAR(50)
    `);

    const asmeAliases = [
      { astm: 'A53 Grade B', asme: 'SA-53 Grade B' },
      { astm: 'A106 Grade B', asme: 'SA-106 Grade B' },
      { astm: 'A106 Grade C', asme: 'SA-106 Grade C' },
      { astm: 'A312 TP304', asme: 'SA-312 TP304' },
      { astm: 'A312 TP304L', asme: 'SA-312 TP304L' },
      { astm: 'A312 TP304H', asme: 'SA-312 TP304H' },
      { astm: 'A312 TP316', asme: 'SA-312 TP316' },
      { astm: 'A312 TP316L', asme: 'SA-312 TP316L' },
      { astm: 'A312 TP316H', asme: 'SA-312 TP316H' },
      { astm: 'A312 TP321', asme: 'SA-312 TP321' },
      { astm: 'A312 TP321H', asme: 'SA-312 TP321H' },
      { astm: 'A312 TP347', asme: 'SA-312 TP347' },
      { astm: 'A312 TP347H', asme: 'SA-312 TP347H' },
      { astm: 'A333 Grade 6', asme: 'SA-333 Grade 6' },
      { astm: 'A335 P5', asme: 'SA-335 P5' },
      { astm: 'A335 P9', asme: 'SA-335 P9' },
      { astm: 'A335 P11', asme: 'SA-335 P11' },
      { astm: 'A335 P22', asme: 'SA-335 P22' },
      { astm: 'A335 P91', asme: 'SA-335 P91' },
      { astm: 'A790 S31803', asme: 'SA-790 S31803' },
      { astm: 'A790 S32205', asme: 'SA-790 S32205' },
      { astm: 'A790 S32750', asme: 'SA-790 S32750' },
    ];

    for (const alias of asmeAliases) {
      await queryRunner.query(
        `
        UPDATE pipe_steel_grades
        SET asme_equivalent = $2
        WHERE code = $1
      `,
        [alias.astm, alias.asme]
      );
    }

    // ============================================================
    // PART 5: Heat Treatment Condition Field
    // ============================================================
    console.warn('Adding heat treatment condition field...');

    await queryRunner.query(`
      ALTER TABLE pipe_steel_grades
      ADD COLUMN IF NOT EXISTS heat_treatment VARCHAR(50)
    `);

    const heatTreatments = [
      { code: 'A53 Grade B', treatment: 'As-Rolled' },
      { code: 'A106 Grade B', treatment: 'Normalized' },
      { code: 'A106 Grade C', treatment: 'Normalized' },
      { code: 'A312 TP304', treatment: 'Solution Annealed' },
      { code: 'A312 TP304L', treatment: 'Solution Annealed' },
      { code: 'A312 TP304H', treatment: 'Solution Annealed' },
      { code: 'A312 TP316', treatment: 'Solution Annealed' },
      { code: 'A312 TP316L', treatment: 'Solution Annealed' },
      { code: 'A312 TP316H', treatment: 'Solution Annealed' },
      { code: 'A312 TP321', treatment: 'Solution Annealed' },
      { code: 'A312 TP321H', treatment: 'Solution Annealed & Stabilized' },
      { code: 'A312 TP347', treatment: 'Solution Annealed' },
      { code: 'A312 TP347H', treatment: 'Solution Annealed & Stabilized' },
      { code: 'A333 Grade 6', treatment: 'Normalized' },
      { code: 'A335 P5', treatment: 'Normalized & Tempered' },
      { code: 'A335 P9', treatment: 'Normalized & Tempered' },
      { code: 'A335 P11', treatment: 'Normalized & Tempered' },
      { code: 'A335 P22', treatment: 'Normalized & Tempered' },
      { code: 'A335 P91', treatment: 'Normalized & Tempered' },
      { code: 'A335 P92', treatment: 'Normalized & Tempered' },
      { code: 'A790 S31803', treatment: 'Solution Annealed' },
      { code: 'A790 S32205', treatment: 'Solution Annealed' },
      { code: 'A790 S32750', treatment: 'Solution Annealed' },
      { code: 'A790 S32760', treatment: 'Solution Annealed' },
      { code: 'API 5L Grade B', treatment: 'As-Rolled or Normalized' },
      { code: 'API 5L X42', treatment: 'Normalized or Q&T' },
      { code: 'API 5L X52', treatment: 'Normalized or Q&T' },
      { code: 'API 5L X60', treatment: 'Q&T or TMCP' },
      { code: 'API 5L X65', treatment: 'Q&T or TMCP' },
      { code: 'API 5L X70', treatment: 'Q&T or TMCP' },
    ];

    for (const ht of heatTreatments) {
      await queryRunner.query(
        `
        UPDATE pipe_steel_grades
        SET heat_treatment = $2
        WHERE code = $1
      `,
        [ht.code, ht.treatment]
      );
    }

    // ============================================================
    // PART 6: Material Certification Tracking Fields (MTR)
    // ============================================================
    console.warn('Adding material certification tracking fields...');

    await queryRunner.query(`
      ALTER TABLE pipe_steel_grades
      ADD COLUMN IF NOT EXISTS requires_mtr BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS pmi_required BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS impact_test_required BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS min_impact_temp_c INTEGER
    `);

    const certRequirements = [
      { code: 'A333 Grade 6', impact: true, impactTemp: -46 },
      { code: 'A333 Grade 1', impact: true, impactTemp: -46 },
      { code: 'A333 Grade 3', impact: true, impactTemp: -101 },
      { code: 'A333 Grade 8', impact: true, impactTemp: -196 },
      { code: 'A312 TP304', pmi: true },
      { code: 'A312 TP304L', pmi: true },
      { code: 'A312 TP316', pmi: true },
      { code: 'A312 TP316L', pmi: true },
      { code: 'A335 P5', pmi: true },
      { code: 'A335 P9', pmi: true },
      { code: 'A335 P11', pmi: true },
      { code: 'A335 P22', pmi: true },
      { code: 'A335 P91', pmi: true },
      { code: 'A790 S31803', pmi: true },
      { code: 'A790 S32205', pmi: true },
      { code: 'A790 S32750', pmi: true },
    ];

    for (const req of certRequirements) {
      if (req.impact) {
        await queryRunner.query(
          `
          UPDATE pipe_steel_grades
          SET impact_test_required = true, min_impact_temp_c = $2
          WHERE code = $1
        `,
          [req.code, req.impactTemp]
        );
      }
      if (req.pmi) {
        await queryRunner.query(
          `
          UPDATE pipe_steel_grades
          SET pmi_required = true
          WHERE code = $1
        `,
          [req.code]
        );
      }
    }

    // ============================================================
    // PART 7: Corrosion Allowance Recommendations
    // ============================================================
    console.warn('Adding corrosion allowance recommendations...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS corrosion_allowance_recommendations (
        id SERIAL PRIMARY KEY,
        service_type VARCHAR(100) NOT NULL,
        fluid_category VARCHAR(50),
        material_category VARCHAR(50),
        recommended_ca_mm DECIMAL(5,2) NOT NULL,
        max_ca_mm DECIMAL(5,2),
        notes TEXT,
        UNIQUE(service_type, fluid_category, material_category)
      )
    `);

    const corrosionData = [
      {
        service: 'Steam',
        fluid: 'Clean Steam',
        material: 'Carbon Steel',
        ca: 1.6,
        max: 3.0,
      },
      {
        service: 'Steam',
        fluid: 'Clean Steam',
        material: 'Alloy Steel',
        ca: 0.8,
        max: 1.6,
      },
      {
        service: 'Steam',
        fluid: 'Condensate',
        material: 'Carbon Steel',
        ca: 3.0,
        max: 6.0,
      },
      {
        service: 'Hydrocarbon',
        fluid: 'Sweet Crude',
        material: 'Carbon Steel',
        ca: 3.0,
        max: 6.0,
      },
      {
        service: 'Hydrocarbon',
        fluid: 'Sour Crude',
        material: 'Carbon Steel',
        ca: 6.0,
        max: 12.0,
      },
      {
        service: 'Hydrocarbon',
        fluid: 'Natural Gas',
        material: 'Carbon Steel',
        ca: 1.6,
        max: 3.0,
      },
      {
        service: 'Water',
        fluid: 'Potable',
        material: 'Carbon Steel',
        ca: 1.6,
        max: 3.0,
      },
      {
        service: 'Water',
        fluid: 'Cooling Water',
        material: 'Carbon Steel',
        ca: 3.0,
        max: 6.0,
      },
      {
        service: 'Water',
        fluid: 'Seawater',
        material: 'Carbon Steel',
        ca: 6.0,
        max: 12.0,
      },
      {
        service: 'Water',
        fluid: 'Seawater',
        material: 'Duplex SS',
        ca: 0.0,
        max: 0.0,
      },
      {
        service: 'Chemical',
        fluid: 'Caustic',
        material: 'Carbon Steel',
        ca: 3.0,
        max: 6.0,
      },
      {
        service: 'Chemical',
        fluid: 'Acid',
        material: 'Stainless Steel',
        ca: 1.6,
        max: 3.0,
      },
      {
        service: 'Air',
        fluid: 'Instrument Air',
        material: 'Carbon Steel',
        ca: 0.0,
        max: 1.6,
      },
      {
        service: 'Air',
        fluid: 'Plant Air',
        material: 'Carbon Steel',
        ca: 1.6,
        max: 3.0,
      },
    ];

    for (const ca of corrosionData) {
      await queryRunner.query(
        `
        INSERT INTO corrosion_allowance_recommendations
          (service_type, fluid_category, material_category, recommended_ca_mm, max_ca_mm)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (service_type, fluid_category, material_category) DO UPDATE SET
          recommended_ca_mm = EXCLUDED.recommended_ca_mm,
          max_ca_mm = EXCLUDED.max_ca_mm
      `,
        [ca.service, ca.fluid, ca.material, ca.ca, ca.max]
      );
    }

    // ============================================================
    // PART 8: Schedule Designation Normalization
    // ============================================================
    console.warn('Adding schedule designation mapping table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS schedule_designation_aliases (
        id SERIAL PRIMARY KEY,
        canonical_name VARCHAR(20) NOT NULL,
        alias VARCHAR(20) NOT NULL,
        standard VARCHAR(20),
        UNIQUE(alias, standard)
      )
    `);

    const scheduleAliases = [
      { canonical: 'STD', alias: 'Standard', standard: 'ASME B36.10' },
      { canonical: 'STD', alias: 'Std', standard: 'ASME B36.10' },
      { canonical: 'STD', alias: '40S', standard: 'ASME B36.19' },
      { canonical: 'XS', alias: 'Extra Strong', standard: 'ASME B36.10' },
      { canonical: 'XS', alias: 'XH', standard: 'ASME B36.10' },
      { canonical: 'XS', alias: 'Extra Heavy', standard: 'ASME B36.10' },
      { canonical: 'XS', alias: '80S', standard: 'ASME B36.19' },
      { canonical: 'XXS', alias: 'Double Extra Strong', standard: 'ASME B36.10' },
      { canonical: 'XXS', alias: 'XXH', standard: 'ASME B36.10' },
      { canonical: '5S', alias: 'Sch 5S', standard: 'ASME B36.19' },
      { canonical: '10S', alias: 'Sch 10S', standard: 'ASME B36.19' },
      { canonical: '40', alias: 'Sch 40', standard: 'ASME B36.10' },
      { canonical: '80', alias: 'Sch 80', standard: 'ASME B36.10' },
      { canonical: '160', alias: 'Sch 160', standard: 'ASME B36.10' },
    ];

    for (const alias of scheduleAliases) {
      await queryRunner.query(
        `
        INSERT INTO schedule_designation_aliases (canonical_name, alias, standard)
        VALUES ($1, $2, $3)
        ON CONFLICT (alias, standard) DO UPDATE SET
          canonical_name = EXCLUDED.canonical_name
      `,
        [alias.canonical, alias.alias, alias.standard]
      );
    }

    console.warn('ISO/JIS pipe standards and system enhancements complete.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS schedule_designation_aliases`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS corrosion_allowance_recommendations`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS jis_pipe_dimensions`);
    await queryRunner.query(`DROP TABLE IF EXISTS iso_pipe_dimensions`);
    await queryRunner.query(
      `ALTER TABLE pipe_steel_grades DROP COLUMN IF EXISTS asme_equivalent`
    );
    await queryRunner.query(
      `ALTER TABLE pipe_steel_grades DROP COLUMN IF EXISTS heat_treatment`
    );
    await queryRunner.query(
      `ALTER TABLE pipe_steel_grades DROP COLUMN IF EXISTS requires_mtr`
    );
    await queryRunner.query(
      `ALTER TABLE pipe_steel_grades DROP COLUMN IF EXISTS pmi_required`
    );
    await queryRunner.query(
      `ALTER TABLE pipe_steel_grades DROP COLUMN IF EXISTS impact_test_required`
    );
    await queryRunner.query(
      `ALTER TABLE pipe_steel_grades DROP COLUMN IF EXISTS min_impact_temp_c`
    );
  }
}
