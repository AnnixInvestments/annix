import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupportSpanAndNdtData1775700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pipe_support_spacing
      ADD COLUMN IF NOT EXISTS material_category VARCHAR(50) DEFAULT 'carbon_steel',
      ADD COLUMN IF NOT EXISTS modulus_of_elasticity_gpa DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS density_kg_m3 DECIMAL(10,1),
      ADD COLUMN IF NOT EXISTS standard_reference VARCHAR(50) DEFAULT 'MSS_SP_58'
    `);

    await queryRunner.query(`
      UPDATE pipe_support_spacing
      SET material_category = 'carbon_steel',
          modulus_of_elasticity_gpa = 200,
          density_kg_m3 = 7850,
          standard_reference = 'MSS_SP_58'
      WHERE material_category IS NULL OR material_category = 'carbon_steel'
    `);

    await this.addStainlessSteelSpans(queryRunner);
    await this.addDuplexStainlessSpans(queryRunner);
    await this.addNickelAlloySpans(queryRunner);
    await this.addHeavyScheduleSpans(queryRunner);

    await this.createTemperatureDeratingTable(queryRunner);
    await this.createNdtRequirementsTable(queryRunner);
  }

  private async addStainlessSteelSpans(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const stainlessSpanData = [
      { nb: 15, nps: '1/2"', water: 2.0, vapor: 2.6, rod: 10 },
      { nb: 20, nps: '3/4"', water: 2.3, vapor: 2.9, rod: 10 },
      { nb: 25, nps: '1"', water: 2.6, vapor: 3.2, rod: 10 },
      { nb: 32, nps: '1-1/4"', water: 2.9, vapor: 3.5, rod: 10 },
      { nb: 40, nps: '1-1/2"', water: 2.9, vapor: 3.5, rod: 10 },
      { nb: 50, nps: '2"', water: 3.2, vapor: 4.1, rod: 10 },
      { nb: 65, nps: '2-1/2"', water: 3.5, vapor: 4.4, rod: 10 },
      { nb: 80, nps: '3"', water: 3.5, vapor: 4.4, rod: 10 },
      { nb: 100, nps: '4"', water: 4.1, vapor: 5.0, rod: 12 },
      { nb: 125, nps: '5"', water: 4.4, vapor: 5.3, rod: 12 },
      { nb: 150, nps: '6"', water: 4.7, vapor: 5.5, rod: 16 },
      { nb: 200, nps: '8"', water: 5.0, vapor: 6.1, rod: 16 },
      { nb: 250, nps: '10"', water: 5.5, vapor: 6.7, rod: 20 },
      { nb: 300, nps: '12"', water: 6.1, vapor: 7.3, rod: 20 },
      { nb: 350, nps: '14"', water: 6.4, vapor: 7.6, rod: 24 },
      { nb: 400, nps: '16"', water: 6.7, vapor: 7.9, rod: 24 },
      { nb: 450, nps: '18"', water: 7.0, vapor: 8.2, rod: 24 },
      { nb: 500, nps: '20"', water: 7.3, vapor: 8.5, rod: 30 },
      { nb: 600, nps: '24"', water: 7.6, vapor: 8.8, rod: 30 },
    ];

    for (const data of stainlessSpanData) {
      await queryRunner.query(
        `
        INSERT INTO pipe_support_spacing (nb_mm, nps, schedule, water_filled_span_m, vapor_gas_span_m, rod_size_mm, material_category, modulus_of_elasticity_gpa, density_kg_m3, standard_reference)
        VALUES ($1, $2, 'Std', $3, $4, $5, 'stainless_steel', 193, 8000, 'MSS_SP_58')
        ON CONFLICT DO NOTHING
      `,
        [data.nb, data.nps, data.water, data.vapor, data.rod],
      );

      await queryRunner.query(
        `
        INSERT INTO pipe_support_spacing (nb_mm, nps, schedule, water_filled_span_m, vapor_gas_span_m, rod_size_mm, material_category, modulus_of_elasticity_gpa, density_kg_m3, standard_reference)
        VALUES ($1, $2, '10S', $3, $4, $5, 'stainless_steel', 193, 8000, 'MSS_SP_58')
        ON CONFLICT DO NOTHING
      `,
        [data.nb, data.nps, data.water * 0.85, data.vapor * 0.85, data.rod],
      );

      await queryRunner.query(
        `
        INSERT INTO pipe_support_spacing (nb_mm, nps, schedule, water_filled_span_m, vapor_gas_span_m, rod_size_mm, material_category, modulus_of_elasticity_gpa, density_kg_m3, standard_reference)
        VALUES ($1, $2, '40S', $3, $4, $5, 'stainless_steel', 193, 8000, 'MSS_SP_58')
        ON CONFLICT DO NOTHING
      `,
        [data.nb, data.nps, data.water * 1.1, data.vapor * 1.1, data.rod],
      );
    }
  }

  private async addDuplexStainlessSpans(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const duplexSpanData = [
      { nb: 15, nps: '1/2"', water: 2.1, vapor: 2.7, rod: 10 },
      { nb: 20, nps: '3/4"', water: 2.4, vapor: 3.0, rod: 10 },
      { nb: 25, nps: '1"', water: 2.7, vapor: 3.4, rod: 10 },
      { nb: 32, nps: '1-1/4"', water: 3.0, vapor: 3.7, rod: 10 },
      { nb: 40, nps: '1-1/2"', water: 3.0, vapor: 3.7, rod: 10 },
      { nb: 50, nps: '2"', water: 3.4, vapor: 4.3, rod: 10 },
      { nb: 65, nps: '2-1/2"', water: 3.7, vapor: 4.6, rod: 10 },
      { nb: 80, nps: '3"', water: 3.7, vapor: 4.6, rod: 10 },
      { nb: 100, nps: '4"', water: 4.3, vapor: 5.2, rod: 12 },
      { nb: 125, nps: '5"', water: 4.6, vapor: 5.5, rod: 12 },
      { nb: 150, nps: '6"', water: 4.9, vapor: 5.8, rod: 16 },
      { nb: 200, nps: '8"', water: 5.2, vapor: 6.4, rod: 16 },
      { nb: 250, nps: '10"', water: 5.8, vapor: 7.0, rod: 20 },
      { nb: 300, nps: '12"', water: 6.4, vapor: 7.6, rod: 20 },
      { nb: 350, nps: '14"', water: 6.7, vapor: 7.9, rod: 24 },
      { nb: 400, nps: '16"', water: 7.0, vapor: 8.2, rod: 24 },
      { nb: 450, nps: '18"', water: 7.3, vapor: 8.5, rod: 24 },
      { nb: 500, nps: '20"', water: 7.6, vapor: 8.8, rod: 30 },
      { nb: 600, nps: '24"', water: 7.9, vapor: 9.1, rod: 30 },
    ];

    for (const data of duplexSpanData) {
      await queryRunner.query(
        `
        INSERT INTO pipe_support_spacing (nb_mm, nps, schedule, water_filled_span_m, vapor_gas_span_m, rod_size_mm, material_category, modulus_of_elasticity_gpa, density_kg_m3, standard_reference)
        VALUES ($1, $2, 'Std', $3, $4, $5, 'duplex_stainless', 200, 7800, 'MSS_SP_58')
        ON CONFLICT DO NOTHING
      `,
        [data.nb, data.nps, data.water, data.vapor, data.rod],
      );
    }

    for (const data of duplexSpanData) {
      await queryRunner.query(
        `
        INSERT INTO pipe_support_spacing (nb_mm, nps, schedule, water_filled_span_m, vapor_gas_span_m, rod_size_mm, material_category, modulus_of_elasticity_gpa, density_kg_m3, standard_reference)
        VALUES ($1, $2, 'Std', $3, $4, $5, 'super_duplex', 200, 7800, 'MSS_SP_58')
        ON CONFLICT DO NOTHING
      `,
        [data.nb, data.nps, data.water, data.vapor, data.rod],
      );
    }
  }

  private async addNickelAlloySpans(queryRunner: QueryRunner): Promise<void> {
    const nickelSpanData = [
      {
        nb: 15,
        nps: '1/2"',
        water: 1.9,
        vapor: 2.4,
        rod: 10,
        modulus: 207,
        density: 8440,
      },
      {
        nb: 20,
        nps: '3/4"',
        water: 2.2,
        vapor: 2.7,
        rod: 10,
        modulus: 207,
        density: 8440,
      },
      {
        nb: 25,
        nps: '1"',
        water: 2.5,
        vapor: 3.1,
        rod: 10,
        modulus: 207,
        density: 8440,
      },
      {
        nb: 32,
        nps: '1-1/4"',
        water: 2.7,
        vapor: 3.4,
        rod: 10,
        modulus: 207,
        density: 8440,
      },
      {
        nb: 40,
        nps: '1-1/2"',
        water: 2.7,
        vapor: 3.4,
        rod: 10,
        modulus: 207,
        density: 8440,
      },
      {
        nb: 50,
        nps: '2"',
        water: 3.1,
        vapor: 3.9,
        rod: 10,
        modulus: 207,
        density: 8440,
      },
      {
        nb: 65,
        nps: '2-1/2"',
        water: 3.4,
        vapor: 4.2,
        rod: 10,
        modulus: 207,
        density: 8440,
      },
      {
        nb: 80,
        nps: '3"',
        water: 3.4,
        vapor: 4.2,
        rod: 10,
        modulus: 207,
        density: 8440,
      },
      {
        nb: 100,
        nps: '4"',
        water: 3.9,
        vapor: 4.8,
        rod: 12,
        modulus: 207,
        density: 8440,
      },
      {
        nb: 125,
        nps: '5"',
        water: 4.2,
        vapor: 5.1,
        rod: 12,
        modulus: 207,
        density: 8440,
      },
      {
        nb: 150,
        nps: '6"',
        water: 4.5,
        vapor: 5.3,
        rod: 16,
        modulus: 207,
        density: 8440,
      },
      {
        nb: 200,
        nps: '8"',
        water: 4.8,
        vapor: 5.9,
        rod: 16,
        modulus: 207,
        density: 8440,
      },
      {
        nb: 250,
        nps: '10"',
        water: 5.3,
        vapor: 6.5,
        rod: 20,
        modulus: 207,
        density: 8440,
      },
      {
        nb: 300,
        nps: '12"',
        water: 5.9,
        vapor: 7.0,
        rod: 20,
        modulus: 207,
        density: 8440,
      },
    ];

    const nickelAlloys = [
      { category: 'inconel_600', modulus: 214, density: 8470 },
      { category: 'inconel_625', modulus: 207, density: 8440 },
      { category: 'monel_400', modulus: 179, density: 8800 },
      { category: 'hastelloy_c276', modulus: 205, density: 8890 },
      { category: 'incoloy_800', modulus: 196, density: 7940 },
    ];

    for (const alloy of nickelAlloys) {
      const modulusFactor = alloy.modulus / 207;
      const densityFactor = 8440 / alloy.density;
      const spanFactor =
        Math.pow(modulusFactor, 0.25) * Math.pow(densityFactor, 0.5);

      for (const data of nickelSpanData) {
        await queryRunner.query(
          `
          INSERT INTO pipe_support_spacing (nb_mm, nps, schedule, water_filled_span_m, vapor_gas_span_m, rod_size_mm, material_category, modulus_of_elasticity_gpa, density_kg_m3, standard_reference)
          VALUES ($1, $2, 'Std', $3, $4, $5, $6, $7, $8, 'MSS_SP_58')
          ON CONFLICT DO NOTHING
        `,
          [
            data.nb,
            data.nps,
            Math.round(data.water * spanFactor * 100) / 100,
            Math.round(data.vapor * spanFactor * 100) / 100,
            data.rod,
            alloy.category,
            alloy.modulus,
            alloy.density,
          ],
        );
      }
    }
  }

  private async addHeavyScheduleSpans(queryRunner: QueryRunner): Promise<void> {
    const heavyScheduleFactors = [
      { schedule: 'XS', factor: 1.15 },
      { schedule: '80', factor: 1.15 },
      { schedule: '160', factor: 1.25 },
      { schedule: 'XXS', factor: 1.3 },
    ];

    const baseSpanData = [
      { nb: 25, nps: '1"', water: 2.7, vapor: 3.4, rod: 10 },
      { nb: 50, nps: '2"', water: 3.4, vapor: 4.3, rod: 10 },
      { nb: 80, nps: '3"', water: 3.7, vapor: 4.6, rod: 10 },
      { nb: 100, nps: '4"', water: 4.3, vapor: 5.2, rod: 12 },
      { nb: 150, nps: '6"', water: 4.9, vapor: 5.8, rod: 16 },
      { nb: 200, nps: '8"', water: 5.2, vapor: 6.4, rod: 16 },
      { nb: 250, nps: '10"', water: 5.8, vapor: 7.0, rod: 20 },
      { nb: 300, nps: '12"', water: 6.4, vapor: 7.6, rod: 20 },
    ];

    for (const schedFactor of heavyScheduleFactors) {
      for (const data of baseSpanData) {
        await queryRunner.query(
          `
          INSERT INTO pipe_support_spacing (nb_mm, nps, schedule, water_filled_span_m, vapor_gas_span_m, rod_size_mm, material_category, modulus_of_elasticity_gpa, density_kg_m3, standard_reference)
          VALUES ($1, $2, $3, $4, $5, $6, 'carbon_steel', 200, 7850, 'MSS_SP_58')
          ON CONFLICT DO NOTHING
        `,
          [
            data.nb,
            data.nps,
            schedFactor.schedule,
            Math.round(data.water * schedFactor.factor * 100) / 100,
            Math.round(data.vapor * schedFactor.factor * 100) / 100,
            data.rod,
          ],
        );
      }
    }
  }

  private async createTemperatureDeratingTable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS support_span_temperature_derating (
        id SERIAL PRIMARY KEY,
        material_category VARCHAR(50) NOT NULL,
        temperature_c INTEGER NOT NULL,
        derating_factor DECIMAL(5,3) NOT NULL,
        modulus_at_temp_gpa DECIMAL(10,2),
        notes TEXT,
        standard_reference VARCHAR(50) DEFAULT 'ASME_B31_3',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(material_category, temperature_c)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_span_derating_material_temp
      ON support_span_temperature_derating(material_category, temperature_c)
    `);

    const carbonSteelDerating = [
      { temp: 20, factor: 1.0, modulus: 200 },
      { temp: 50, factor: 0.995, modulus: 199 },
      { temp: 100, factor: 0.985, modulus: 197 },
      { temp: 150, factor: 0.97, modulus: 194 },
      { temp: 200, factor: 0.955, modulus: 191 },
      { temp: 250, factor: 0.935, modulus: 187 },
      { temp: 300, factor: 0.915, modulus: 183 },
      { temp: 350, factor: 0.89, modulus: 178 },
      { temp: 400, factor: 0.86, modulus: 172 },
      { temp: 450, factor: 0.825, modulus: 165 },
      { temp: 500, factor: 0.785, modulus: 157 },
      { temp: 550, factor: 0.74, modulus: 148 },
      { temp: 600, factor: 0.69, modulus: 138 },
    ];

    const stainlessSteelDerating = [
      { temp: 20, factor: 1.0, modulus: 193 },
      { temp: 50, factor: 0.997, modulus: 192 },
      { temp: 100, factor: 0.99, modulus: 191 },
      { temp: 150, factor: 0.98, modulus: 189 },
      { temp: 200, factor: 0.968, modulus: 187 },
      { temp: 250, factor: 0.955, modulus: 184 },
      { temp: 300, factor: 0.94, modulus: 181 },
      { temp: 350, factor: 0.923, modulus: 178 },
      { temp: 400, factor: 0.905, modulus: 175 },
      { temp: 450, factor: 0.885, modulus: 171 },
      { temp: 500, factor: 0.863, modulus: 167 },
      { temp: 550, factor: 0.84, modulus: 162 },
      { temp: 600, factor: 0.815, modulus: 157 },
      { temp: 650, factor: 0.788, modulus: 152 },
      { temp: 700, factor: 0.76, modulus: 147 },
      { temp: 750, factor: 0.73, modulus: 141 },
      { temp: 800, factor: 0.698, modulus: 135 },
    ];

    const duplexDerating = [
      { temp: 20, factor: 1.0, modulus: 200 },
      { temp: 50, factor: 0.997, modulus: 199 },
      { temp: 100, factor: 0.99, modulus: 198 },
      { temp: 150, factor: 0.98, modulus: 196 },
      { temp: 200, factor: 0.968, modulus: 194 },
      { temp: 250, factor: 0.953, modulus: 191 },
      { temp: 300, factor: 0.935, modulus: 187 },
    ];

    const nickelAlloyDerating = [
      { temp: 20, factor: 1.0, modulus: 207 },
      { temp: 100, factor: 0.99, modulus: 205 },
      { temp: 200, factor: 0.975, modulus: 202 },
      { temp: 300, factor: 0.958, modulus: 198 },
      { temp: 400, factor: 0.938, modulus: 194 },
      { temp: 500, factor: 0.915, modulus: 189 },
      { temp: 600, factor: 0.89, modulus: 184 },
      { temp: 700, factor: 0.862, modulus: 178 },
      { temp: 800, factor: 0.832, modulus: 172 },
      { temp: 900, factor: 0.798, modulus: 165 },
    ];

    for (const data of carbonSteelDerating) {
      await queryRunner.query(
        `
        INSERT INTO support_span_temperature_derating (material_category, temperature_c, derating_factor, modulus_at_temp_gpa, notes, standard_reference)
        VALUES ('carbon_steel', $1, $2, $3, 'Per ASME B31.3 Table C-6', 'ASME_B31_3')
        ON CONFLICT (material_category, temperature_c) DO UPDATE SET derating_factor = $2, modulus_at_temp_gpa = $3
      `,
        [data.temp, data.factor, data.modulus],
      );
    }

    for (const data of stainlessSteelDerating) {
      await queryRunner.query(
        `
        INSERT INTO support_span_temperature_derating (material_category, temperature_c, derating_factor, modulus_at_temp_gpa, notes, standard_reference)
        VALUES ('stainless_steel', $1, $2, $3, 'Per ASME B31.3 Table C-6 for austenitic SS', 'ASME_B31_3')
        ON CONFLICT (material_category, temperature_c) DO UPDATE SET derating_factor = $2, modulus_at_temp_gpa = $3
      `,
        [data.temp, data.factor, data.modulus],
      );
    }

    for (const data of duplexDerating) {
      await queryRunner.query(
        `
        INSERT INTO support_span_temperature_derating (material_category, temperature_c, derating_factor, modulus_at_temp_gpa, notes, standard_reference)
        VALUES ('duplex_stainless', $1, $2, $3, 'Duplex limited to 300C max operating temp', 'ASME_B31_3')
        ON CONFLICT (material_category, temperature_c) DO UPDATE SET derating_factor = $2, modulus_at_temp_gpa = $3
      `,
        [data.temp, data.factor, data.modulus],
      );

      await queryRunner.query(
        `
        INSERT INTO support_span_temperature_derating (material_category, temperature_c, derating_factor, modulus_at_temp_gpa, notes, standard_reference)
        VALUES ('super_duplex', $1, $2, $3, 'Super duplex limited to 300C max operating temp', 'ASME_B31_3')
        ON CONFLICT (material_category, temperature_c) DO UPDATE SET derating_factor = $2, modulus_at_temp_gpa = $3
      `,
        [data.temp, data.factor, data.modulus],
      );
    }

    for (const data of nickelAlloyDerating) {
      const nickelCategories = [
        'inconel_600',
        'inconel_625',
        'monel_400',
        'hastelloy_c276',
        'incoloy_800',
      ];

      for (const category of nickelCategories) {
        await queryRunner.query(
          `
          INSERT INTO support_span_temperature_derating (material_category, temperature_c, derating_factor, modulus_at_temp_gpa, notes, standard_reference)
          VALUES ($1, $2, $3, $4, 'Per ASME B31.3 for nickel alloys', 'ASME_B31_3')
          ON CONFLICT (material_category, temperature_c) DO UPDATE SET derating_factor = $3, modulus_at_temp_gpa = $4
        `,
          [category, data.temp, data.factor, data.modulus],
        );
      }
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pipe_content_weight_factors (
        id SERIAL PRIMARY KEY,
        content_type VARCHAR(50) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        density_kg_m3 DECIMAL(10,2) NOT NULL,
        specific_gravity DECIMAL(6,3) NOT NULL,
        viscosity_factor DECIMAL(5,3) DEFAULT 1.0,
        corrosion_allowance_mm DECIMAL(5,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const contentTypes = [
      {
        type: 'empty',
        name: 'Empty/Air',
        density: 1.2,
        sg: 0.001,
        viscosity: 1.0,
        corrosion: 0,
      },
      {
        type: 'water',
        name: 'Water (20°C)',
        density: 998,
        sg: 1.0,
        viscosity: 1.0,
        corrosion: 0.5,
      },
      {
        type: 'steam',
        name: 'Steam',
        density: 0.6,
        sg: 0.0006,
        viscosity: 1.0,
        corrosion: 0.5,
      },
      {
        type: 'hydrocarbon_light',
        name: 'Light Hydrocarbon',
        density: 700,
        sg: 0.7,
        viscosity: 0.5,
        corrosion: 0.3,
      },
      {
        type: 'hydrocarbon_heavy',
        name: 'Heavy Hydrocarbon',
        density: 900,
        sg: 0.9,
        viscosity: 2.0,
        corrosion: 0.5,
      },
      {
        type: 'crude_oil',
        name: 'Crude Oil',
        density: 870,
        sg: 0.87,
        viscosity: 1.5,
        corrosion: 1.0,
      },
      {
        type: 'natural_gas',
        name: 'Natural Gas',
        density: 0.8,
        sg: 0.0008,
        viscosity: 1.0,
        corrosion: 0.3,
      },
      {
        type: 'nitrogen',
        name: 'Nitrogen',
        density: 1.25,
        sg: 0.00125,
        viscosity: 1.0,
        corrosion: 0,
      },
      {
        type: 'compressed_air',
        name: 'Compressed Air',
        density: 12,
        sg: 0.012,
        viscosity: 1.0,
        corrosion: 0.3,
      },
      {
        type: 'ammonia',
        name: 'Ammonia',
        density: 680,
        sg: 0.68,
        viscosity: 0.3,
        corrosion: 0.5,
      },
      {
        type: 'caustic_soda',
        name: 'Caustic Soda (50%)',
        density: 1530,
        sg: 1.53,
        viscosity: 5.0,
        corrosion: 1.5,
      },
      {
        type: 'sulfuric_acid',
        name: 'Sulfuric Acid (98%)',
        density: 1840,
        sg: 1.84,
        viscosity: 3.0,
        corrosion: 3.0,
      },
      {
        type: 'hydrochloric_acid',
        name: 'Hydrochloric Acid',
        density: 1200,
        sg: 1.2,
        viscosity: 1.5,
        corrosion: 3.0,
      },
      {
        type: 'seawater',
        name: 'Seawater',
        density: 1025,
        sg: 1.025,
        viscosity: 1.0,
        corrosion: 1.5,
      },
      {
        type: 'slurry_light',
        name: 'Light Slurry (<20% solids)',
        density: 1200,
        sg: 1.2,
        viscosity: 3.0,
        corrosion: 1.0,
      },
      {
        type: 'slurry_heavy',
        name: 'Heavy Slurry (>20% solids)',
        density: 1500,
        sg: 1.5,
        viscosity: 10.0,
        corrosion: 2.0,
      },
    ];

    for (const content of contentTypes) {
      await queryRunner.query(
        `
        INSERT INTO pipe_content_weight_factors (content_type, display_name, density_kg_m3, specific_gravity, viscosity_factor, corrosion_allowance_mm, notes)
        VALUES ($1, $2, $3, $4, $5, $6, NULL)
        ON CONFLICT (content_type) DO UPDATE SET density_kg_m3 = $3, specific_gravity = $4
      `,
        [
          content.type,
          content.name,
          content.density,
          content.sg,
          content.viscosity,
          content.corrosion,
        ],
      );
    }
  }

  private async createNdtRequirementsTable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE ndt_method AS ENUM (
        'VT',
        'PT',
        'MT',
        'UT',
        'RT',
        'PAUT',
        'TOFD',
        'ET'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE ndt_acceptance_standard AS ENUM (
        'ASME_B31_3',
        'ASME_IX',
        'AWS_D1_1',
        'AWS_D1_6',
        'ISO_5817_B',
        'ISO_5817_C',
        'ISO_5817_D',
        'EN_ISO_17637',
        'API_1104',
        'ASME_VIII'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ndt_methods (
        id SERIAL PRIMARY KEY,
        method_code ndt_method NOT NULL UNIQUE,
        method_name VARCHAR(100) NOT NULL,
        full_name VARCHAR(200) NOT NULL,
        description TEXT,
        detectable_defects TEXT[],
        surface_access_required BOOLEAN DEFAULT true,
        can_detect_subsurface BOOLEAN DEFAULT false,
        can_detect_surface BOOLEAN DEFAULT true,
        minimum_wall_thickness_mm DECIMAL(6,2),
        maximum_wall_thickness_mm DECIMAL(6,2),
        temperature_limit_c INTEGER,
        requires_surface_prep BOOLEAN DEFAULT false,
        requires_couplant BOOLEAN DEFAULT false,
        radiation_hazard BOOLEAN DEFAULT false,
        typical_sensitivity_mm DECIMAL(5,2),
        relative_cost_factor DECIMAL(4,2) DEFAULT 1.0,
        typical_speed_factor DECIMAL(4,2) DEFAULT 1.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const ndtMethods = [
      {
        code: 'VT',
        name: 'Visual Testing',
        fullName: 'Visual Examination',
        description: 'Direct or remote visual examination of weld surfaces',
        defects: [
          'surface_cracks',
          'porosity',
          'undercut',
          'overlap',
          'misalignment',
          'spatter',
        ],
        surfaceAccess: true,
        subsurface: false,
        surface: true,
        minWt: null,
        maxWt: null,
        tempLimit: null,
        surfacePrep: false,
        couplant: false,
        radiation: false,
        sensitivity: 0.5,
        costFactor: 0.2,
        speedFactor: 3.0,
      },
      {
        code: 'PT',
        name: 'Penetrant Testing',
        fullName: 'Liquid Penetrant Examination',
        description:
          'Detection of surface-breaking defects using dye penetrants',
        defects: [
          'surface_cracks',
          'porosity',
          'laps',
          'seams',
          'lack_of_fusion',
        ],
        surfaceAccess: true,
        subsurface: false,
        surface: true,
        minWt: null,
        maxWt: null,
        tempLimit: 50,
        surfacePrep: true,
        couplant: false,
        radiation: false,
        sensitivity: 0.1,
        costFactor: 0.5,
        speedFactor: 0.8,
      },
      {
        code: 'MT',
        name: 'Magnetic Testing',
        fullName: 'Magnetic Particle Examination',
        description:
          'Detection of surface and near-surface defects in ferromagnetic materials',
        defects: [
          'surface_cracks',
          'subsurface_cracks',
          'laps',
          'seams',
          'inclusions',
        ],
        surfaceAccess: true,
        subsurface: true,
        surface: true,
        minWt: null,
        maxWt: null,
        tempLimit: 315,
        surfacePrep: true,
        couplant: false,
        radiation: false,
        sensitivity: 0.05,
        costFactor: 0.6,
        speedFactor: 1.5,
      },
      {
        code: 'UT',
        name: 'Ultrasonic Testing',
        fullName: 'Ultrasonic Examination',
        description: 'Volumetric examination using high-frequency sound waves',
        defects: [
          'internal_cracks',
          'lack_of_fusion',
          'lack_of_penetration',
          'porosity',
          'inclusions',
          'laminations',
        ],
        surfaceAccess: true,
        subsurface: true,
        surface: false,
        minWt: 6,
        maxWt: null,
        tempLimit: 200,
        surfacePrep: true,
        couplant: true,
        radiation: false,
        sensitivity: 1.0,
        costFactor: 1.0,
        speedFactor: 1.0,
      },
      {
        code: 'RT',
        name: 'Radiographic Testing',
        fullName: 'Radiographic Examination',
        description: 'Volumetric examination using X-rays or gamma rays',
        defects: [
          'porosity',
          'inclusions',
          'lack_of_fusion',
          'lack_of_penetration',
          'cracks',
          'internal_voids',
        ],
        surfaceAccess: true,
        subsurface: true,
        surface: true,
        minWt: 3,
        maxWt: 200,
        tempLimit: null,
        surfacePrep: false,
        couplant: false,
        radiation: true,
        sensitivity: 2.0,
        costFactor: 2.0,
        speedFactor: 0.3,
      },
      {
        code: 'PAUT',
        name: 'Phased Array UT',
        fullName: 'Phased Array Ultrasonic Testing',
        description: 'Advanced UT using electronically steered beam arrays',
        defects: [
          'internal_cracks',
          'lack_of_fusion',
          'lack_of_penetration',
          'porosity',
          'inclusions',
          'sizing_defects',
        ],
        surfaceAccess: true,
        subsurface: true,
        surface: false,
        minWt: 4,
        maxWt: null,
        tempLimit: 200,
        surfacePrep: true,
        couplant: true,
        radiation: false,
        sensitivity: 0.5,
        costFactor: 1.5,
        speedFactor: 1.5,
      },
      {
        code: 'TOFD',
        name: 'Time of Flight Diffraction',
        fullName: 'Time of Flight Diffraction',
        description: 'Advanced UT technique for accurate defect sizing',
        defects: ['internal_cracks', 'lack_of_fusion', 'height_sizing'],
        surfaceAccess: true,
        subsurface: true,
        surface: false,
        minWt: 8,
        maxWt: null,
        tempLimit: 200,
        surfacePrep: true,
        couplant: true,
        radiation: false,
        sensitivity: 0.3,
        costFactor: 1.8,
        speedFactor: 1.2,
      },
      {
        code: 'ET',
        name: 'Eddy Current Testing',
        fullName: 'Eddy Current Examination',
        description:
          'Electromagnetic examination for surface and near-surface defects',
        defects: [
          'surface_cracks',
          'corrosion',
          'wall_thinning',
          'conductivity_variations',
        ],
        surfaceAccess: true,
        subsurface: true,
        surface: true,
        minWt: null,
        maxWt: 10,
        tempLimit: 500,
        surfacePrep: false,
        couplant: false,
        radiation: false,
        sensitivity: 0.1,
        costFactor: 0.8,
        speedFactor: 2.0,
      },
    ];

    for (const method of ndtMethods) {
      await queryRunner.query(
        `
        INSERT INTO ndt_methods (method_code, method_name, full_name, description, detectable_defects, surface_access_required, can_detect_subsurface, can_detect_surface, minimum_wall_thickness_mm, maximum_wall_thickness_mm, temperature_limit_c, requires_surface_prep, requires_couplant, radiation_hazard, typical_sensitivity_mm, relative_cost_factor, typical_speed_factor)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (method_code) DO NOTHING
      `,
        [
          method.code,
          method.name,
          method.fullName,
          method.description,
          method.defects,
          method.surfaceAccess,
          method.subsurface,
          method.surface,
          method.minWt,
          method.maxWt,
          method.tempLimit,
          method.surfacePrep,
          method.couplant,
          method.radiation,
          method.sensitivity,
          method.costFactor,
          method.speedFactor,
        ],
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ndt_requirements (
        id SERIAL PRIMARY KEY,
        requirement_code VARCHAR(50) NOT NULL,
        description VARCHAR(200) NOT NULL,
        acceptance_standard ndt_acceptance_standard NOT NULL,
        weld_category VARCHAR(50) NOT NULL,
        service_class VARCHAR(50),
        material_group VARCHAR(50),
        min_wall_thickness_mm DECIMAL(6,2),
        max_wall_thickness_mm DECIMAL(6,2),
        min_design_pressure_bar DECIMAL(10,2),
        max_design_pressure_bar DECIMAL(10,2),
        min_design_temp_c DECIMAL(8,2),
        max_design_temp_c DECIMAL(8,2),
        required_methods ndt_method[] NOT NULL,
        optional_methods ndt_method[],
        extent_percent INTEGER NOT NULL DEFAULT 100,
        random_sample_percent INTEGER,
        retest_requirement TEXT,
        documentation_required TEXT[],
        operator_certification VARCHAR(50),
        procedure_required BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(requirement_code, acceptance_standard)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ndt_req_standard_category
      ON ndt_requirements(acceptance_standard, weld_category)
    `);

    const asmeB313Requirements = [
      {
        code: 'ASME_B31_3_NORMAL_CS',
        desc: 'Normal fluid service - Carbon steel butt welds',
        standard: 'ASME_B31_3',
        category: 'normal_fluid',
        service: 'normal',
        material: 'carbon_steel',
        minWt: null,
        maxWt: null,
        minP: null,
        maxP: null,
        minT: -29,
        maxT: 427,
        required: ['VT'],
        optional: ['RT', 'UT'],
        extent: 5,
        random: 5,
        cert: 'SNT_TC_1A_Level_II',
      },
      {
        code: 'ASME_B31_3_NORMAL_SS',
        desc: 'Normal fluid service - Stainless steel butt welds',
        standard: 'ASME_B31_3',
        category: 'normal_fluid',
        service: 'normal',
        material: 'stainless_steel',
        minWt: null,
        maxWt: null,
        minP: null,
        maxP: null,
        minT: -196,
        maxT: 816,
        required: ['VT'],
        optional: ['RT', 'UT', 'PT'],
        extent: 5,
        random: 5,
        cert: 'SNT_TC_1A_Level_II',
      },
      {
        code: 'ASME_B31_3_SEVERE_CYCLIC',
        desc: 'Severe cyclic service - All butt welds',
        standard: 'ASME_B31_3',
        category: 'severe_cyclic',
        service: 'cyclic',
        material: null,
        minWt: null,
        maxWt: null,
        minP: null,
        maxP: null,
        minT: null,
        maxT: null,
        required: ['VT', 'RT'],
        optional: ['UT'],
        extent: 100,
        random: null,
        cert: 'SNT_TC_1A_Level_II',
      },
      {
        code: 'ASME_B31_3_HIGH_PRESSURE',
        desc: 'High pressure service - All butt welds',
        standard: 'ASME_B31_3',
        category: 'high_pressure',
        service: 'high_pressure',
        material: null,
        minWt: null,
        maxWt: null,
        minP: 103.4,
        maxP: null,
        minT: null,
        maxT: null,
        required: ['VT', 'RT'],
        optional: ['UT', 'MT', 'PT'],
        extent: 100,
        random: null,
        cert: 'SNT_TC_1A_Level_II',
      },
      {
        code: 'ASME_B31_3_CATEGORY_D',
        desc: 'Category D fluid service - Low hazard',
        standard: 'ASME_B31_3',
        category: 'category_d',
        service: 'low_hazard',
        material: null,
        minWt: null,
        maxWt: null,
        minP: null,
        maxP: 10.3,
        minT: -29,
        maxT: 186,
        required: ['VT'],
        optional: null,
        extent: 100,
        random: null,
        cert: null,
      },
      {
        code: 'ASME_B31_3_CATEGORY_M',
        desc: 'Category M fluid service - High toxicity',
        standard: 'ASME_B31_3',
        category: 'category_m',
        service: 'high_toxicity',
        material: null,
        minWt: null,
        maxWt: null,
        minP: null,
        maxP: null,
        minT: null,
        maxT: null,
        required: ['VT', 'RT'],
        optional: ['UT', 'MT', 'PT'],
        extent: 100,
        random: null,
        cert: 'SNT_TC_1A_Level_II',
      },
      {
        code: 'ASME_B31_3_THICK_WALL',
        desc: 'Thick wall service (>19mm) - Butt welds',
        standard: 'ASME_B31_3',
        category: 'thick_wall',
        service: 'normal',
        material: null,
        minWt: 19,
        maxWt: null,
        minP: null,
        maxP: null,
        minT: null,
        maxT: null,
        required: ['VT', 'UT'],
        optional: ['RT', 'PAUT'],
        extent: 20,
        random: 20,
        cert: 'SNT_TC_1A_Level_II',
      },
    ];

    const awsRequirements = [
      {
        code: 'AWS_D1_1_STATIC',
        desc: 'Statically loaded structures - Complete joint penetration',
        standard: 'AWS_D1_1',
        category: 'static_structural',
        service: 'structural',
        material: 'carbon_steel',
        minWt: null,
        maxWt: null,
        minP: null,
        maxP: null,
        minT: null,
        maxT: null,
        required: ['VT'],
        optional: ['UT', 'RT', 'MT'],
        extent: 25,
        random: 25,
        cert: 'AWS_CWI',
      },
      {
        code: 'AWS_D1_1_CYCLIC',
        desc: 'Cyclically loaded structures - Complete joint penetration',
        standard: 'AWS_D1_1',
        category: 'cyclic_structural',
        service: 'structural',
        material: 'carbon_steel',
        minWt: null,
        maxWt: null,
        minP: null,
        maxP: null,
        minT: null,
        maxT: null,
        required: ['VT', 'UT'],
        optional: ['RT', 'MT'],
        extent: 100,
        random: null,
        cert: 'AWS_CWI',
      },
      {
        code: 'AWS_D1_6_SS',
        desc: 'Stainless steel structural welding',
        standard: 'AWS_D1_6',
        category: 'stainless_structural',
        service: 'structural',
        material: 'stainless_steel',
        minWt: null,
        maxWt: null,
        minP: null,
        maxP: null,
        minT: null,
        maxT: null,
        required: ['VT', 'PT'],
        optional: ['RT', 'UT'],
        extent: 100,
        random: null,
        cert: 'AWS_CWI',
      },
    ];

    const isoRequirements = [
      {
        code: 'ISO_5817_B_STRINGENT',
        desc: 'ISO 5817 Quality Level B - Stringent',
        standard: 'ISO_5817_B',
        category: 'quality_level_b',
        service: 'high_quality',
        material: null,
        minWt: null,
        maxWt: null,
        minP: null,
        maxP: null,
        minT: null,
        maxT: null,
        required: ['VT', 'RT'],
        optional: ['UT', 'MT', 'PT'],
        extent: 100,
        random: null,
        cert: 'ISO_9712_Level_2',
      },
      {
        code: 'ISO_5817_C_INTERMEDIATE',
        desc: 'ISO 5817 Quality Level C - Intermediate',
        standard: 'ISO_5817_C',
        category: 'quality_level_c',
        service: 'standard',
        material: null,
        minWt: null,
        maxWt: null,
        minP: null,
        maxP: null,
        minT: null,
        maxT: null,
        required: ['VT'],
        optional: ['RT', 'UT', 'MT', 'PT'],
        extent: 20,
        random: 20,
        cert: 'ISO_9712_Level_2',
      },
      {
        code: 'ISO_5817_D_MODERATE',
        desc: 'ISO 5817 Quality Level D - Moderate',
        standard: 'ISO_5817_D',
        category: 'quality_level_d',
        service: 'basic',
        material: null,
        minWt: null,
        maxWt: null,
        minP: null,
        maxP: null,
        minT: null,
        maxT: null,
        required: ['VT'],
        optional: null,
        extent: 10,
        random: 10,
        cert: null,
      },
    ];

    const allRequirements = [
      ...asmeB313Requirements,
      ...awsRequirements,
      ...isoRequirements,
    ];

    for (const req of allRequirements) {
      await queryRunner.query(
        `
        INSERT INTO ndt_requirements (
          requirement_code, description, acceptance_standard, weld_category,
          service_class, material_group, min_wall_thickness_mm, max_wall_thickness_mm,
          min_design_pressure_bar, max_design_pressure_bar, min_design_temp_c, max_design_temp_c,
          required_methods, optional_methods, extent_percent, random_sample_percent,
          operator_certification, procedure_required
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true)
        ON CONFLICT (requirement_code, acceptance_standard) DO UPDATE SET
          description = $2,
          required_methods = $13,
          extent_percent = $15
      `,
        [
          req.code,
          req.desc,
          req.standard,
          req.category,
          req.service,
          req.material,
          req.minWt,
          req.maxWt,
          req.minP,
          req.maxP,
          req.minT,
          req.maxT,
          req.required,
          req.optional,
          req.extent,
          req.random,
          req.cert,
        ],
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ndt_costs (
        id SERIAL PRIMARY KEY,
        method_code ndt_method NOT NULL,
        cost_type VARCHAR(50) NOT NULL,
        unit VARCHAR(20) NOT NULL,
        base_cost_zar DECIMAL(10,2) NOT NULL,
        base_cost_usd DECIMAL(10,2),
        min_wall_thickness_mm DECIMAL(6,2),
        max_wall_thickness_mm DECIMAL(6,2),
        min_diameter_mm INTEGER,
        max_diameter_mm INTEGER,
        thickness_multiplier DECIMAL(5,3) DEFAULT 1.0,
        diameter_multiplier DECIMAL(5,3) DEFAULT 1.0,
        setup_cost_zar DECIMAL(10,2) DEFAULT 0,
        mobilization_cost_zar DECIMAL(10,2) DEFAULT 0,
        report_cost_zar DECIMAL(10,2) DEFAULT 0,
        effective_date DATE DEFAULT CURRENT_DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(method_code, cost_type, min_wall_thickness_mm, min_diameter_mm)
      )
    `);

    const ndtCosts = [
      {
        method: 'VT',
        type: 'weld_inspection',
        unit: 'per_weld',
        baseZar: 150,
        baseUsd: 8,
        setup: 0,
        mob: 0,
        report: 100,
      },
      {
        method: 'VT',
        type: 'linear_meter',
        unit: 'per_meter',
        baseZar: 80,
        baseUsd: 4.5,
        setup: 0,
        mob: 0,
        report: 100,
      },
      {
        method: 'PT',
        type: 'weld_inspection',
        unit: 'per_weld',
        baseZar: 350,
        baseUsd: 19,
        setup: 200,
        mob: 500,
        report: 150,
      },
      {
        method: 'PT',
        type: 'linear_meter',
        unit: 'per_meter',
        baseZar: 220,
        baseUsd: 12,
        setup: 200,
        mob: 500,
        report: 150,
      },
      {
        method: 'MT',
        type: 'weld_inspection',
        unit: 'per_weld',
        baseZar: 400,
        baseUsd: 22,
        setup: 300,
        mob: 500,
        report: 150,
      },
      {
        method: 'MT',
        type: 'linear_meter',
        unit: 'per_meter',
        baseZar: 280,
        baseUsd: 15,
        setup: 300,
        mob: 500,
        report: 150,
      },
      {
        method: 'UT',
        type: 'weld_inspection',
        unit: 'per_weld',
        baseZar: 650,
        baseUsd: 36,
        setup: 500,
        mob: 800,
        report: 250,
      },
      {
        method: 'UT',
        type: 'linear_meter',
        unit: 'per_meter',
        baseZar: 380,
        baseUsd: 21,
        setup: 500,
        mob: 800,
        report: 250,
      },
      {
        method: 'UT',
        type: 'thickness_survey',
        unit: 'per_point',
        baseZar: 45,
        baseUsd: 2.5,
        setup: 200,
        mob: 500,
        report: 150,
      },
      {
        method: 'RT',
        type: 'weld_inspection',
        unit: 'per_weld',
        baseZar: 1200,
        baseUsd: 67,
        setup: 1000,
        mob: 1500,
        report: 500,
      },
      {
        method: 'RT',
        type: 'linear_meter',
        unit: 'per_meter',
        baseZar: 750,
        baseUsd: 42,
        setup: 1000,
        mob: 1500,
        report: 500,
      },
      {
        method: 'PAUT',
        type: 'weld_inspection',
        unit: 'per_weld',
        baseZar: 950,
        baseUsd: 53,
        setup: 800,
        mob: 1000,
        report: 400,
      },
      {
        method: 'PAUT',
        type: 'linear_meter',
        unit: 'per_meter',
        baseZar: 580,
        baseUsd: 32,
        setup: 800,
        mob: 1000,
        report: 400,
      },
      {
        method: 'TOFD',
        type: 'weld_inspection',
        unit: 'per_weld',
        baseZar: 1100,
        baseUsd: 61,
        setup: 900,
        mob: 1200,
        report: 450,
      },
      {
        method: 'TOFD',
        type: 'linear_meter',
        unit: 'per_meter',
        baseZar: 680,
        baseUsd: 38,
        setup: 900,
        mob: 1200,
        report: 450,
      },
      {
        method: 'ET',
        type: 'tube_inspection',
        unit: 'per_tube',
        baseZar: 180,
        baseUsd: 10,
        setup: 400,
        mob: 600,
        report: 200,
      },
      {
        method: 'ET',
        type: 'surface_scan',
        unit: 'per_m2',
        baseZar: 450,
        baseUsd: 25,
        setup: 400,
        mob: 600,
        report: 200,
      },
    ];

    for (const cost of ndtCosts) {
      await queryRunner.query(
        `
        INSERT INTO ndt_costs (method_code, cost_type, unit, base_cost_zar, base_cost_usd, setup_cost_zar, mobilization_cost_zar, report_cost_zar)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (method_code, cost_type, min_wall_thickness_mm, min_diameter_mm) DO UPDATE SET
          base_cost_zar = $4,
          base_cost_usd = $5
      `,
        [
          cost.method,
          cost.type,
          cost.unit,
          cost.baseZar,
          cost.baseUsd,
          cost.setup,
          cost.mob,
          cost.report,
        ],
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ndt_material_requirements (
        id SERIAL PRIMARY KEY,
        material_group VARCHAR(50) NOT NULL,
        p_number INTEGER,
        required_surface_ndt ndt_method[],
        required_volumetric_ndt ndt_method[],
        post_weld_heat_treatment BOOLEAN DEFAULT false,
        pwht_ndt_timing VARCHAR(50),
        special_requirements TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(material_group, p_number)
      )
    `);

    const materialNdtReqs = [
      {
        group: 'carbon_steel',
        pNum: 1,
        surfaceNdt: ['VT'],
        volNdt: null,
        pwht: false,
        timing: null,
        special: null,
      },
      {
        group: 'carbon_steel_fine_grain',
        pNum: 1,
        surfaceNdt: ['VT', 'MT'],
        volNdt: ['UT'],
        pwht: true,
        timing: 'after_pwht',
        special: 'Impact testing required below -29C',
      },
      {
        group: 'low_alloy_steel',
        pNum: 3,
        surfaceNdt: ['VT', 'MT'],
        volNdt: ['UT', 'RT'],
        pwht: true,
        timing: 'after_pwht',
        special: null,
      },
      {
        group: 'cr_mo_steel',
        pNum: 4,
        surfaceNdt: ['VT', 'MT'],
        volNdt: ['UT', 'RT'],
        pwht: true,
        timing: 'after_pwht',
        special: 'Preheat required',
      },
      {
        group: 'cr_mo_steel_high',
        pNum: 5,
        surfaceNdt: ['VT', 'MT'],
        volNdt: ['UT', 'RT'],
        pwht: true,
        timing: 'after_pwht',
        special: 'Preheat and interpass temp control required',
      },
      {
        group: 'austenitic_ss',
        pNum: 8,
        surfaceNdt: ['VT', 'PT'],
        volNdt: ['RT'],
        pwht: false,
        timing: null,
        special: 'Ferrite content check may be required',
      },
      {
        group: 'duplex_ss',
        pNum: 10,
        surfaceNdt: ['VT', 'PT'],
        volNdt: ['RT', 'UT'],
        pwht: false,
        timing: null,
        special: 'Ferrite/austenite ratio verification required',
      },
      {
        group: 'nickel_alloy',
        pNum: 41,
        surfaceNdt: ['VT', 'PT'],
        volNdt: ['RT'],
        pwht: false,
        timing: null,
        special: 'Low heat input required',
      },
      {
        group: 'nickel_alloy_high',
        pNum: 43,
        surfaceNdt: ['VT', 'PT'],
        volNdt: ['RT', 'UT'],
        pwht: true,
        timing: 'after_pwht',
        special: 'Special filler metal required',
      },
      {
        group: 'titanium',
        pNum: 51,
        surfaceNdt: ['VT', 'PT'],
        volNdt: ['RT'],
        pwht: false,
        timing: null,
        special: 'Inert gas shielding required, color inspection',
      },
      {
        group: 'aluminum',
        pNum: 21,
        surfaceNdt: ['VT', 'PT'],
        volNdt: ['RT'],
        pwht: false,
        timing: null,
        special: null,
      },
      {
        group: 'copper',
        pNum: 31,
        surfaceNdt: ['VT', 'PT'],
        volNdt: null,
        pwht: false,
        timing: null,
        special: null,
      },
    ];

    for (const req of materialNdtReqs) {
      await queryRunner.query(
        `
        INSERT INTO ndt_material_requirements (material_group, p_number, required_surface_ndt, required_volumetric_ndt, post_weld_heat_treatment, pwht_ndt_timing, special_requirements)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (material_group, p_number) DO UPDATE SET
          required_surface_ndt = $3,
          required_volumetric_ndt = $4
      `,
        [
          req.group,
          req.pNum,
          req.surfaceNdt,
          req.volNdt,
          req.pwht,
          req.timing,
          req.special,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ndt_material_requirements`);
    await queryRunner.query(`DROP TABLE IF EXISTS ndt_costs`);
    await queryRunner.query(`DROP TABLE IF EXISTS ndt_requirements`);
    await queryRunner.query(`DROP TABLE IF EXISTS ndt_methods`);
    await queryRunner.query(`DROP TYPE IF EXISTS ndt_acceptance_standard`);
    await queryRunner.query(`DROP TYPE IF EXISTS ndt_method`);
    await queryRunner.query(`DROP TABLE IF EXISTS pipe_content_weight_factors`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS support_span_temperature_derating`,
    );

    await queryRunner.query(`
      ALTER TABLE pipe_support_spacing
      DROP COLUMN IF EXISTS material_category,
      DROP COLUMN IF EXISTS modulus_of_elasticity_gpa,
      DROP COLUMN IF EXISTS density_kg_m3,
      DROP COLUMN IF EXISTS standard_reference
    `);
  }
}
