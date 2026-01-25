import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingHelperTables1775600000000 implements MigrationInterface {
  name = 'AddMissingHelperTables1775600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding missing helper tables...');

    await this.extendNpsDnMappingWithTubing(queryRunner);
    await this.createPipeSizeEquivalentsView(queryRunner);
    await this.createPipeFlowCapacityTable(queryRunner);
    await this.createPipeFlangeCompatibilityTable(queryRunner);

    console.warn('Missing helper tables completed.');
  }

  private async extendNpsDnMappingWithTubing(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn('Extending nps_dn_mapping with tubing OD alternatives...');

    const tubingColumnExists = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'nps_dn_mapping' AND column_name = 'has_tubing_equivalent'
    `);

    if (tubingColumnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE nps_dn_mapping
        ADD COLUMN has_tubing_equivalent BOOLEAN DEFAULT false,
        ADD COLUMN tubing_od_mm NUMERIC(10,2),
        ADD COLUMN tubing_od_inch NUMERIC(10,4)
      `);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tubing_sizes (
        id SERIAL PRIMARY KEY,
        tubing_od_mm NUMERIC(10,2) NOT NULL,
        tubing_od_inch NUMERIC(10,4) NOT NULL,
        equivalent_nps VARCHAR(10),
        equivalent_dn_mm INTEGER,
        tubing_type VARCHAR(50) NOT NULL,
        wall_thickness_mm NUMERIC(8,3),
        wall_thickness_inch NUMERIC(8,4),
        standard_reference VARCHAR(100),
        material_category VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tubing_od_mm, tubing_type, wall_thickness_mm)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tubing_sizes_od ON tubing_sizes(tubing_od_mm)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tubing_sizes_type ON tubing_sizes(tubing_type)
    `);

    const tubingSizes = [
      {
        odMm: 6.35,
        odInch: 0.25,
        nps: '1/8',
        dn: 6,
        type: 'Fractional OD',
        wall: 0.89,
        wallInch: 0.035,
        std: 'ASTM A269',
        mat: 'Stainless',
        notes: '1/4" OD tubing',
      },
      {
        odMm: 9.53,
        odInch: 0.375,
        nps: '1/4',
        dn: 8,
        type: 'Fractional OD',
        wall: 0.89,
        wallInch: 0.035,
        std: 'ASTM A269',
        mat: 'Stainless',
        notes: '3/8" OD tubing',
      },
      {
        odMm: 12.7,
        odInch: 0.5,
        nps: '3/8',
        dn: 10,
        type: 'Fractional OD',
        wall: 0.89,
        wallInch: 0.035,
        std: 'ASTM A269',
        mat: 'Stainless',
        notes: '1/2" OD tubing',
      },
      {
        odMm: 15.88,
        odInch: 0.625,
        nps: '1/2',
        dn: 15,
        type: 'Fractional OD',
        wall: 1.24,
        wallInch: 0.049,
        std: 'ASTM A269',
        mat: 'Stainless',
        notes: '5/8" OD tubing',
      },
      {
        odMm: 19.05,
        odInch: 0.75,
        nps: '1/2',
        dn: 15,
        type: 'Fractional OD',
        wall: 1.65,
        wallInch: 0.065,
        std: 'ASTM A269',
        mat: 'Stainless',
        notes: '3/4" OD tubing',
      },
      {
        odMm: 25.4,
        odInch: 1.0,
        nps: '3/4',
        dn: 20,
        type: 'Fractional OD',
        wall: 1.65,
        wallInch: 0.065,
        std: 'ASTM A269',
        mat: 'Stainless',
        notes: '1" OD tubing',
      },
      {
        odMm: 31.75,
        odInch: 1.25,
        nps: '1',
        dn: 25,
        type: 'Fractional OD',
        wall: 1.65,
        wallInch: 0.065,
        std: 'ASTM A269',
        mat: 'Stainless',
        notes: '1-1/4" OD tubing',
      },
      {
        odMm: 38.1,
        odInch: 1.5,
        nps: '1-1/4',
        dn: 32,
        type: 'Fractional OD',
        wall: 1.65,
        wallInch: 0.065,
        std: 'ASTM A269',
        mat: 'Stainless',
        notes: '1-1/2" OD tubing',
      },
      {
        odMm: 50.8,
        odInch: 2.0,
        nps: '1-1/2',
        dn: 40,
        type: 'Fractional OD',
        wall: 1.65,
        wallInch: 0.065,
        std: 'ASTM A269',
        mat: 'Stainless',
        notes: '2" OD tubing',
      },

      {
        odMm: 25.0,
        odInch: 0.984,
        nps: '3/4',
        dn: 20,
        type: 'Metric OD',
        wall: 1.5,
        wallInch: 0.059,
        std: 'EN 10216-5',
        mat: 'Stainless',
        notes: '25mm metric tubing',
      },
      {
        odMm: 30.0,
        odInch: 1.181,
        nps: '1',
        dn: 25,
        type: 'Metric OD',
        wall: 1.5,
        wallInch: 0.059,
        std: 'EN 10216-5',
        mat: 'Stainless',
        notes: '30mm metric tubing',
      },
      {
        odMm: 38.0,
        odInch: 1.496,
        nps: '1-1/4',
        dn: 32,
        type: 'Metric OD',
        wall: 1.5,
        wallInch: 0.059,
        std: 'EN 10216-5',
        mat: 'Stainless',
        notes: '38mm metric tubing',
      },
      {
        odMm: 42.0,
        odInch: 1.654,
        nps: '1-1/4',
        dn: 32,
        type: 'Metric OD',
        wall: 2.0,
        wallInch: 0.079,
        std: 'EN 10216-5',
        mat: 'Stainless',
        notes: '42mm metric tubing',
      },
      {
        odMm: 48.0,
        odInch: 1.89,
        nps: '1-1/2',
        dn: 40,
        type: 'Metric OD',
        wall: 2.0,
        wallInch: 0.079,
        std: 'EN 10216-5',
        mat: 'Stainless',
        notes: '48mm metric tubing',
      },
      {
        odMm: 54.0,
        odInch: 2.126,
        nps: '2',
        dn: 50,
        type: 'Metric OD',
        wall: 2.0,
        wallInch: 0.079,
        std: 'EN 10216-5',
        mat: 'Stainless',
        notes: '54mm metric tubing',
      },
      {
        odMm: 60.0,
        odInch: 2.362,
        nps: '2',
        dn: 50,
        type: 'Metric OD',
        wall: 2.0,
        wallInch: 0.079,
        std: 'EN 10216-5',
        mat: 'Stainless',
        notes: '60mm metric tubing',
      },
      {
        odMm: 76.1,
        odInch: 2.996,
        nps: '2-1/2',
        dn: 65,
        type: 'Metric OD',
        wall: 2.0,
        wallInch: 0.079,
        std: 'EN 10216-5',
        mat: 'Stainless',
        notes: '76.1mm metric tubing',
      },
      {
        odMm: 88.9,
        odInch: 3.5,
        nps: '3',
        dn: 80,
        type: 'Metric OD',
        wall: 2.0,
        wallInch: 0.079,
        std: 'EN 10216-5',
        mat: 'Stainless',
        notes: '88.9mm matches NPS 3',
      },
      {
        odMm: 101.6,
        odInch: 4.0,
        nps: '3-1/2',
        dn: 90,
        type: 'Metric OD',
        wall: 2.0,
        wallInch: 0.079,
        std: 'EN 10216-5',
        mat: 'Stainless',
        notes: '101.6mm matches NPS 3-1/2',
      },

      {
        odMm: 25.4,
        odInch: 1.0,
        nps: '3/4',
        dn: 20,
        type: 'Sanitary OD',
        wall: 1.65,
        wallInch: 0.065,
        std: 'ASME BPE',
        mat: 'Stainless',
        notes: '1" sanitary tubing (3-A)',
      },
      {
        odMm: 38.1,
        odInch: 1.5,
        nps: '1-1/4',
        dn: 32,
        type: 'Sanitary OD',
        wall: 1.65,
        wallInch: 0.065,
        std: 'ASME BPE',
        mat: 'Stainless',
        notes: '1-1/2" sanitary tubing (3-A)',
      },
      {
        odMm: 50.8,
        odInch: 2.0,
        nps: '1-1/2',
        dn: 40,
        type: 'Sanitary OD',
        wall: 1.65,
        wallInch: 0.065,
        std: 'ASME BPE',
        mat: 'Stainless',
        notes: '2" sanitary tubing (3-A)',
      },
      {
        odMm: 63.5,
        odInch: 2.5,
        nps: '2',
        dn: 50,
        type: 'Sanitary OD',
        wall: 1.65,
        wallInch: 0.065,
        std: 'ASME BPE',
        mat: 'Stainless',
        notes: '2-1/2" sanitary tubing (3-A)',
      },
      {
        odMm: 76.2,
        odInch: 3.0,
        nps: '2-1/2',
        dn: 65,
        type: 'Sanitary OD',
        wall: 1.65,
        wallInch: 0.065,
        std: 'ASME BPE',
        mat: 'Stainless',
        notes: '3" sanitary tubing (3-A)',
      },
      {
        odMm: 101.6,
        odInch: 4.0,
        nps: '3-1/2',
        dn: 90,
        type: 'Sanitary OD',
        wall: 2.11,
        wallInch: 0.083,
        std: 'ASME BPE',
        mat: 'Stainless',
        notes: '4" sanitary tubing (3-A)',
      },

      {
        odMm: 6.0,
        odInch: 0.236,
        nps: null,
        dn: null,
        type: 'Instrumentation',
        wall: 1.0,
        wallInch: 0.039,
        std: 'ASTM A269',
        mat: 'Stainless',
        notes: '6mm instrument tubing',
      },
      {
        odMm: 8.0,
        odInch: 0.315,
        nps: null,
        dn: null,
        type: 'Instrumentation',
        wall: 1.0,
        wallInch: 0.039,
        std: 'ASTM A269',
        mat: 'Stainless',
        notes: '8mm instrument tubing',
      },
      {
        odMm: 10.0,
        odInch: 0.394,
        nps: null,
        dn: null,
        type: 'Instrumentation',
        wall: 1.0,
        wallInch: 0.039,
        std: 'ASTM A269',
        mat: 'Stainless',
        notes: '10mm instrument tubing',
      },
      {
        odMm: 12.0,
        odInch: 0.472,
        nps: null,
        dn: null,
        type: 'Instrumentation',
        wall: 1.5,
        wallInch: 0.059,
        std: 'ASTM A269',
        mat: 'Stainless',
        notes: '12mm instrument tubing',
      },

      {
        odMm: 15.88,
        odInch: 0.625,
        nps: null,
        dn: null,
        type: 'Hydraulic',
        wall: 1.65,
        wallInch: 0.065,
        std: 'SAE J524',
        mat: 'Carbon Steel',
        notes: '5/8" hydraulic tubing',
      },
      {
        odMm: 19.05,
        odInch: 0.75,
        nps: null,
        dn: null,
        type: 'Hydraulic',
        wall: 2.11,
        wallInch: 0.083,
        std: 'SAE J524',
        mat: 'Carbon Steel',
        notes: '3/4" hydraulic tubing',
      },
      {
        odMm: 25.4,
        odInch: 1.0,
        nps: null,
        dn: null,
        type: 'Hydraulic',
        wall: 2.77,
        wallInch: 0.109,
        std: 'SAE J524',
        mat: 'Carbon Steel',
        notes: '1" hydraulic tubing',
      },
      {
        odMm: 31.75,
        odInch: 1.25,
        nps: null,
        dn: null,
        type: 'Hydraulic',
        wall: 3.4,
        wallInch: 0.134,
        std: 'SAE J524',
        mat: 'Carbon Steel',
        notes: '1-1/4" hydraulic tubing',
      },

      {
        odMm: 22.22,
        odInch: 0.875,
        nps: null,
        dn: null,
        type: 'Copper',
        wall: 0.89,
        wallInch: 0.035,
        std: 'ASTM B88 Type L',
        mat: 'Copper',
        notes: '7/8" copper Type L',
      },
      {
        odMm: 28.58,
        odInch: 1.125,
        nps: '3/4',
        dn: 20,
        type: 'Copper',
        wall: 1.02,
        wallInch: 0.04,
        std: 'ASTM B88 Type L',
        mat: 'Copper',
        notes: '1-1/8" copper Type L (nominal 1")',
      },
      {
        odMm: 34.93,
        odInch: 1.375,
        nps: '1',
        dn: 25,
        type: 'Copper',
        wall: 1.24,
        wallInch: 0.049,
        std: 'ASTM B88 Type L',
        mat: 'Copper',
        notes: '1-3/8" copper Type L (nominal 1-1/4")',
      },
      {
        odMm: 41.28,
        odInch: 1.625,
        nps: '1-1/4',
        dn: 32,
        type: 'Copper',
        wall: 1.4,
        wallInch: 0.055,
        std: 'ASTM B88 Type L',
        mat: 'Copper',
        notes: '1-5/8" copper Type L (nominal 1-1/2")',
      },
      {
        odMm: 53.98,
        odInch: 2.125,
        nps: '1-1/2',
        dn: 40,
        type: 'Copper',
        wall: 1.52,
        wallInch: 0.06,
        std: 'ASTM B88 Type L',
        mat: 'Copper',
        notes: '2-1/8" copper Type L (nominal 2")',
      },
    ];

    for (const tube of tubingSizes) {
      await queryRunner.query(
        `
        INSERT INTO tubing_sizes (tubing_od_mm, tubing_od_inch, equivalent_nps, equivalent_dn_mm, tubing_type, wall_thickness_mm, wall_thickness_inch, standard_reference, material_category, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (tubing_od_mm, tubing_type, wall_thickness_mm) DO UPDATE SET
          equivalent_nps = EXCLUDED.equivalent_nps,
          equivalent_dn_mm = EXCLUDED.equivalent_dn_mm,
          notes = EXCLUDED.notes
      `,
        [
          tube.odMm,
          tube.odInch,
          tube.nps,
          tube.dn,
          tube.type,
          tube.wall,
          tube.wallInch,
          tube.std,
          tube.mat,
          tube.notes,
        ],
      );
    }

    const npsWithTubing = [
      '1/8',
      '1/4',
      '3/8',
      '1/2',
      '3/4',
      '1',
      '1-1/4',
      '1-1/2',
      '2',
      '2-1/2',
      '3',
      '3-1/2',
    ];
    for (const nps of npsWithTubing) {
      const tubeMatch = tubingSizes.find(
        (t) => t.nps === nps && t.type === 'Fractional OD',
      );
      if (tubeMatch) {
        await queryRunner.query(
          `
          UPDATE nps_dn_mapping
          SET has_tubing_equivalent = true, tubing_od_mm = $2, tubing_od_inch = $3
          WHERE nps_inch = $1
        `,
          [nps, tubeMatch.odMm, tubeMatch.odInch],
        );
      }
    }

    console.warn(`Added ${tubingSizes.length} tubing size records`);
  }

  private async createPipeSizeEquivalentsView(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn('Creating pipe_size_equivalents view...');

    await queryRunner.query(`DROP VIEW IF EXISTS pipe_size_equivalents`);

    await queryRunner.query(`
      CREATE VIEW pipe_size_equivalents AS
      SELECT
        n.id,
        n.nps_inch,
        n.nps_decimal,
        n.dn_mm,
        n.outside_diameter_mm AS pipe_od_mm,
        n.outside_diameter_inch AS pipe_od_inch,
        n.has_tubing_equivalent,
        n.tubing_od_mm,
        n.tubing_od_inch,
        CASE
          WHEN n.dn_mm < 15 THEN 'Small Bore'
          WHEN n.dn_mm <= 50 THEN 'Medium Bore'
          WHEN n.dn_mm <= 300 THEN 'Large Bore'
          ELSE 'Extra Large Bore'
        END AS size_category,
        CASE
          WHEN n.nps_decimal < 14 THEN 'ASME B16.5'
          WHEN n.nps_decimal <= 24 THEN 'ASME B16.5/B16.47'
          ELSE 'ASME B16.47'
        END AS applicable_flange_standard,
        ROUND(n.outside_diameter_mm * 3.14159, 2) AS pipe_circumference_mm,
        ROUND(n.outside_diameter_mm * 3.14159 / 1000, 4) AS pipe_circumference_m,
        n.notes
      FROM nps_dn_mapping n
      ORDER BY n.nps_decimal
    `);

    await queryRunner.query(`
      CREATE VIEW pipe_tubing_cross_reference AS
      SELECT
        n.nps_inch,
        n.dn_mm,
        n.outside_diameter_mm AS nps_od_mm,
        t.tubing_od_mm,
        t.tubing_type,
        t.wall_thickness_mm,
        t.standard_reference,
        t.material_category,
        ABS(n.outside_diameter_mm - t.tubing_od_mm) AS od_difference_mm,
        CASE
          WHEN ABS(n.outside_diameter_mm - t.tubing_od_mm) < 1 THEN 'Direct Match'
          WHEN ABS(n.outside_diameter_mm - t.tubing_od_mm) < 5 THEN 'Close Match'
          ELSE 'Different'
        END AS match_type,
        t.notes
      FROM nps_dn_mapping n
      CROSS JOIN tubing_sizes t
      WHERE t.equivalent_nps = n.nps_inch
         OR ABS(n.outside_diameter_mm - t.tubing_od_mm) < 10
      ORDER BY n.nps_decimal, t.tubing_od_mm
    `);

    console.warn(
      'Created pipe_size_equivalents and pipe_tubing_cross_reference views',
    );
  }

  private async createPipeFlowCapacityTable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn('Creating pipe_flow_capacity table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fluid_types (
        id SERIAL PRIMARY KEY,
        code VARCHAR(30) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        density_kg_m3 NUMERIC(10,2) NOT NULL,
        viscosity_cp NUMERIC(10,4) NOT NULL,
        temperature_c NUMERIC(8,2) DEFAULT 20,
        is_compressible BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    const fluidTypes = [
      {
        code: 'WATER',
        name: 'Water',
        density: 998,
        viscosity: 1.0,
        temp: 20,
        compress: false,
        notes: 'Standard fresh water at 20°C',
      },
      {
        code: 'WATER_60C',
        name: 'Water (60°C)',
        density: 983,
        viscosity: 0.47,
        temp: 60,
        compress: false,
        notes: 'Hot water',
      },
      {
        code: 'WATER_80C',
        name: 'Water (80°C)',
        density: 972,
        viscosity: 0.35,
        temp: 80,
        compress: false,
        notes: 'Very hot water',
      },
      {
        code: 'SEAWATER',
        name: 'Seawater',
        density: 1025,
        viscosity: 1.08,
        temp: 20,
        compress: false,
        notes: '3.5% salinity',
      },
      {
        code: 'STEAM_SAT',
        name: 'Saturated Steam',
        density: 0.6,
        viscosity: 0.012,
        temp: 100,
        compress: true,
        notes: 'At atmospheric pressure',
      },
      {
        code: 'STEAM_10BAR',
        name: 'Steam (10 bar)',
        density: 5.1,
        viscosity: 0.014,
        temp: 180,
        compress: true,
        notes: 'Saturated at 10 bar',
      },
      {
        code: 'AIR',
        name: 'Air',
        density: 1.2,
        viscosity: 0.018,
        temp: 20,
        compress: true,
        notes: 'At atmospheric pressure',
      },
      {
        code: 'NITROGEN',
        name: 'Nitrogen',
        density: 1.16,
        viscosity: 0.018,
        temp: 20,
        compress: true,
        notes: 'At atmospheric pressure',
      },
      {
        code: 'OIL_LIGHT',
        name: 'Light Oil',
        density: 850,
        viscosity: 10,
        temp: 20,
        compress: false,
        notes: 'Hydraulic oil, low viscosity',
      },
      {
        code: 'OIL_MEDIUM',
        name: 'Medium Oil',
        density: 880,
        viscosity: 50,
        temp: 20,
        compress: false,
        notes: 'Lubricating oil',
      },
      {
        code: 'OIL_HEAVY',
        name: 'Heavy Oil',
        density: 920,
        viscosity: 200,
        temp: 20,
        compress: false,
        notes: 'Fuel oil',
      },
      {
        code: 'SLURRY_10',
        name: 'Slurry (10% solids)',
        density: 1100,
        viscosity: 5,
        temp: 20,
        compress: false,
        notes: 'Mining slurry, low concentration',
      },
      {
        code: 'SLURRY_30',
        name: 'Slurry (30% solids)',
        density: 1300,
        viscosity: 20,
        temp: 20,
        compress: false,
        notes: 'Mining slurry, medium concentration',
      },
      {
        code: 'SLURRY_50',
        name: 'Slurry (50% solids)',
        density: 1500,
        viscosity: 100,
        temp: 20,
        compress: false,
        notes: 'Mining slurry, high concentration',
      },
      {
        code: 'ACID_H2SO4',
        name: 'Sulfuric Acid (98%)',
        density: 1840,
        viscosity: 24,
        temp: 20,
        compress: false,
        notes: 'Concentrated sulfuric',
      },
      {
        code: 'ACID_HCL',
        name: 'Hydrochloric Acid (30%)',
        density: 1150,
        viscosity: 1.9,
        temp: 20,
        compress: false,
        notes: 'Dilute HCl',
      },
      {
        code: 'CAUSTIC_50',
        name: 'Caustic Soda (50%)',
        density: 1520,
        viscosity: 78,
        temp: 20,
        compress: false,
        notes: 'Sodium hydroxide solution',
      },
    ];

    for (const fluid of fluidTypes) {
      await queryRunner.query(
        `
        INSERT INTO fluid_types (code, name, density_kg_m3, viscosity_cp, temperature_c, is_compressible, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (code) DO UPDATE SET
          density_kg_m3 = EXCLUDED.density_kg_m3,
          viscosity_cp = EXCLUDED.viscosity_cp
      `,
        [
          fluid.code,
          fluid.name,
          fluid.density,
          fluid.viscosity,
          fluid.temp,
          fluid.compress,
          fluid.notes,
        ],
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pipe_flow_capacity (
        id SERIAL PRIMARY KEY,
        nps_inch VARCHAR(10) NOT NULL,
        dn_mm INTEGER NOT NULL,
        schedule VARCHAR(20) NOT NULL,
        internal_diameter_mm NUMERIC(10,2) NOT NULL,
        fluid_type_id INTEGER REFERENCES fluid_types(id) ON DELETE CASCADE,
        velocity_m_s NUMERIC(8,3) NOT NULL,
        flow_rate_m3_hr NUMERIC(12,4) NOT NULL,
        flow_rate_l_min NUMERIC(12,2) NOT NULL,
        reynolds_number INTEGER,
        friction_factor NUMERIC(10,6),
        pressure_drop_bar_per_100m NUMERIC(10,4),
        flow_regime VARCHAR(20),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(nps_inch, schedule, fluid_type_id, velocity_m_s)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pipe_flow_nps ON pipe_flow_capacity(nps_inch)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pipe_flow_fluid ON pipe_flow_capacity(fluid_type_id)
    `);

    const waterId = await queryRunner.query(
      `SELECT id FROM fluid_types WHERE code = 'WATER'`,
    );
    const waterFluidId = waterId.length > 0 ? waterId[0].id : null;

    if (waterFluidId) {
      const pipeFlowData = [
        {
          nps: '1/2',
          dn: 15,
          sch: 'STD',
          id: 15.8,
          vel: 1.0,
          notes: 'Typical residential',
        },
        {
          nps: '1/2',
          dn: 15,
          sch: 'STD',
          id: 15.8,
          vel: 2.0,
          notes: 'Maximum recommended',
        },
        {
          nps: '3/4',
          dn: 20,
          sch: 'STD',
          id: 20.9,
          vel: 1.0,
          notes: 'Typical residential',
        },
        {
          nps: '3/4',
          dn: 20,
          sch: 'STD',
          id: 20.9,
          vel: 2.0,
          notes: 'Maximum recommended',
        },
        {
          nps: '1',
          dn: 25,
          sch: 'STD',
          id: 26.6,
          vel: 1.0,
          notes: 'Light duty',
        },
        {
          nps: '1',
          dn: 25,
          sch: 'STD',
          id: 26.6,
          vel: 2.0,
          notes: 'Normal duty',
        },
        {
          nps: '1',
          dn: 25,
          sch: 'STD',
          id: 26.6,
          vel: 3.0,
          notes: 'Heavy duty',
        },
        {
          nps: '1-1/2',
          dn: 40,
          sch: 'STD',
          id: 40.9,
          vel: 1.5,
          notes: 'Normal flow',
        },
        {
          nps: '1-1/2',
          dn: 40,
          sch: 'STD',
          id: 40.9,
          vel: 3.0,
          notes: 'High flow',
        },
        {
          nps: '2',
          dn: 50,
          sch: 'STD',
          id: 52.5,
          vel: 1.5,
          notes: 'Normal flow',
        },
        {
          nps: '2',
          dn: 50,
          sch: 'STD',
          id: 52.5,
          vel: 3.0,
          notes: 'High flow',
        },
        {
          nps: '3',
          dn: 80,
          sch: 'STD',
          id: 77.9,
          vel: 2.0,
          notes: 'Industrial',
        },
        {
          nps: '3',
          dn: 80,
          sch: 'STD',
          id: 77.9,
          vel: 3.0,
          notes: 'High velocity',
        },
        {
          nps: '4',
          dn: 100,
          sch: 'STD',
          id: 102.3,
          vel: 2.0,
          notes: 'Industrial',
        },
        {
          nps: '4',
          dn: 100,
          sch: 'STD',
          id: 102.3,
          vel: 3.0,
          notes: 'High velocity',
        },
        {
          nps: '6',
          dn: 150,
          sch: 'STD',
          id: 154.1,
          vel: 2.0,
          notes: 'Main line',
        },
        {
          nps: '6',
          dn: 150,
          sch: 'STD',
          id: 154.1,
          vel: 3.0,
          notes: 'High capacity',
        },
        {
          nps: '8',
          dn: 200,
          sch: 'STD',
          id: 202.7,
          vel: 2.0,
          notes: 'Main line',
        },
        {
          nps: '8',
          dn: 200,
          sch: 'STD',
          id: 202.7,
          vel: 3.0,
          notes: 'High capacity',
        },
        {
          nps: '10',
          dn: 250,
          sch: 'STD',
          id: 254.5,
          vel: 2.0,
          notes: 'Trunk line',
        },
        {
          nps: '10',
          dn: 250,
          sch: 'STD',
          id: 254.5,
          vel: 3.0,
          notes: 'High capacity',
        },
        {
          nps: '12',
          dn: 300,
          sch: 'STD',
          id: 303.2,
          vel: 2.0,
          notes: 'Trunk line',
        },
        {
          nps: '12',
          dn: 300,
          sch: 'STD',
          id: 303.2,
          vel: 3.0,
          notes: 'High capacity',
        },
        {
          nps: '14',
          dn: 350,
          sch: 'STD',
          id: 333.4,
          vel: 2.5,
          notes: 'Large bore',
        },
        {
          nps: '16',
          dn: 400,
          sch: 'STD',
          id: 381.0,
          vel: 2.5,
          notes: 'Large bore',
        },
        {
          nps: '18',
          dn: 450,
          sch: 'STD',
          id: 428.7,
          vel: 2.5,
          notes: 'Large bore',
        },
        {
          nps: '20',
          dn: 500,
          sch: 'STD',
          id: 477.8,
          vel: 2.5,
          notes: 'Large bore',
        },
        {
          nps: '24',
          dn: 600,
          sch: 'STD',
          id: 574.6,
          vel: 2.5,
          notes: 'Very large bore',
        },
      ];

      for (const flow of pipeFlowData) {
        const area = Math.PI * Math.pow(flow.id / 2000, 2);
        const flowM3Hr = flow.vel * area * 3600;
        const flowLMin = (flowM3Hr * 1000) / 60;
        const reynolds = Math.round(
          (998 * flow.vel * (flow.id / 1000)) / 0.001,
        );
        const regime =
          reynolds > 4000
            ? 'Turbulent'
            : reynolds > 2300
              ? 'Transitional'
              : 'Laminar';
        const f = regime === 'Turbulent' ? 0.02 : 64 / reynolds;
        const pressureDrop =
          (f * 100 * 998 * Math.pow(flow.vel, 2)) /
          (2 * (flow.id / 1000)) /
          100000;

        await queryRunner.query(
          `
          INSERT INTO pipe_flow_capacity (nps_inch, dn_mm, schedule, internal_diameter_mm, fluid_type_id, velocity_m_s, flow_rate_m3_hr, flow_rate_l_min, reynolds_number, friction_factor, pressure_drop_bar_per_100m, flow_regime, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (nps_inch, schedule, fluid_type_id, velocity_m_s) DO UPDATE SET
            flow_rate_m3_hr = EXCLUDED.flow_rate_m3_hr,
            pressure_drop_bar_per_100m = EXCLUDED.pressure_drop_bar_per_100m
        `,
          [
            flow.nps,
            flow.dn,
            flow.sch,
            flow.id,
            waterFluidId,
            flow.vel,
            flowM3Hr,
            flowLMin,
            reynolds,
            f,
            pressureDrop,
            regime,
            flow.notes,
          ],
        );
      }

      console.warn(
        `Added ${fluidTypes.length} fluid types and ${pipeFlowData.length} flow capacity records`,
      );
    }
  }

  private async createPipeFlangeCompatibilityTable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn('Creating pipe_flange_compatibility table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pipe_flange_compatibility (
        id SERIAL PRIMARY KEY,
        nps_inch VARCHAR(10) NOT NULL,
        dn_mm INTEGER NOT NULL,
        pipe_schedule VARCHAR(20) NOT NULL,
        pipe_od_mm NUMERIC(10,2) NOT NULL,
        pipe_wall_mm NUMERIC(8,3) NOT NULL,
        flange_standard_id INTEGER REFERENCES flange_standards(id) ON DELETE CASCADE,
        flange_type_id INTEGER REFERENCES flange_types(id) ON DELETE SET NULL,
        pressure_class_id INTEGER REFERENCES flange_pressure_classes(id) ON DELETE CASCADE,
        is_compatible BOOLEAN NOT NULL DEFAULT true,
        fit_type VARCHAR(30),
        bore_match VARCHAR(30),
        weld_prep_required BOOLEAN DEFAULT true,
        special_considerations TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(nps_inch, pipe_schedule, flange_standard_id, flange_type_id, pressure_class_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pipe_flange_nps ON pipe_flange_compatibility(nps_inch)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pipe_flange_standard ON pipe_flange_compatibility(flange_standard_id)
    `);

    const asmeB165 = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.5'`,
    );
    const sabs1123 = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'SABS 1123'`,
    );

    const wnType = await queryRunner.query(
      `SELECT id FROM flange_types WHERE code = '/2'`,
    );
    const soType = await queryRunner.query(
      `SELECT id FROM flange_types WHERE code = '/3'`,
    );
    const swType = await queryRunner.query(
      `SELECT id FROM flange_types WHERE code = '/5'`,
    );

    const asmeB165Id = asmeB165.length > 0 ? asmeB165[0].id : null;
    const sabs1123Id = sabs1123.length > 0 ? sabs1123[0].id : null;
    const wnTypeId = wnType.length > 0 ? wnType[0].id : null;
    const soTypeId = soType.length > 0 ? soType[0].id : null;
    const swTypeId = swType.length > 0 ? swType[0].id : null;

    if (asmeB165Id) {
      const class150 = await queryRunner.query(
        `SELECT id FROM flange_pressure_classes WHERE designation = 'Class 150' AND "standardId" = $1`,
        [asmeB165Id],
      );
      const class300 = await queryRunner.query(
        `SELECT id FROM flange_pressure_classes WHERE designation = 'Class 300' AND "standardId" = $1`,
        [asmeB165Id],
      );
      const class600 = await queryRunner.query(
        `SELECT id FROM flange_pressure_classes WHERE designation = 'Class 600' AND "standardId" = $1`,
        [asmeB165Id],
      );

      const class150Id = class150.length > 0 ? class150[0].id : null;
      const class300Id = class300.length > 0 ? class300[0].id : null;
      const class600Id = class600.length > 0 ? class600[0].id : null;

      const compatibilityData = [
        {
          nps: '1/2',
          dn: 15,
          sch: 'STD',
          od: 21.3,
          wall: 2.77,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class150Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Standard configuration',
        },
        {
          nps: '1/2',
          dn: 15,
          sch: 'XS',
          od: 21.3,
          wall: 3.73,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class300Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Extra strong for Class 300',
        },
        {
          nps: '1/2',
          dn: 15,
          sch: 'Sch 80',
          od: 21.3,
          wall: 3.73,
          stdId: asmeB165Id,
          typeId: swTypeId,
          classId: class600Id,
          fit: 'Socket Weld',
          bore: 'Socket Bore',
          weld: true,
          notes: 'Small bore socket weld',
        },
        {
          nps: '3/4',
          dn: 20,
          sch: 'STD',
          od: 26.7,
          wall: 2.87,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class150Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Standard configuration',
        },
        {
          nps: '3/4',
          dn: 20,
          sch: 'XS',
          od: 26.7,
          wall: 3.91,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class300Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Extra strong for Class 300',
        },
        {
          nps: '1',
          dn: 25,
          sch: 'STD',
          od: 33.4,
          wall: 3.38,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class150Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Standard configuration',
        },
        {
          nps: '1',
          dn: 25,
          sch: 'STD',
          od: 33.4,
          wall: 3.38,
          stdId: asmeB165Id,
          typeId: soTypeId,
          classId: class150Id,
          fit: 'Slip-On',
          bore: 'Raised Face',
          weld: true,
          notes: 'Fillet weld both sides',
        },
        {
          nps: '1',
          dn: 25,
          sch: 'XS',
          od: 33.4,
          wall: 4.55,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class300Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Extra strong',
        },
        {
          nps: '2',
          dn: 50,
          sch: 'STD',
          od: 60.3,
          wall: 3.91,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class150Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Standard configuration',
        },
        {
          nps: '2',
          dn: 50,
          sch: 'STD',
          od: 60.3,
          wall: 3.91,
          stdId: asmeB165Id,
          typeId: soTypeId,
          classId: class150Id,
          fit: 'Slip-On',
          bore: 'Raised Face',
          weld: true,
          notes: 'Fillet weld both sides',
        },
        {
          nps: '2',
          dn: 50,
          sch: 'XS',
          od: 60.3,
          wall: 5.54,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class300Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Extra strong',
        },
        {
          nps: '2',
          dn: 50,
          sch: 'Sch 160',
          od: 60.3,
          wall: 8.74,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class600Id,
          fit: 'Butt Weld',
          bore: 'Reduced Bore',
          weld: true,
          notes: 'Heavy wall for high pressure',
        },
        {
          nps: '3',
          dn: 80,
          sch: 'STD',
          od: 88.9,
          wall: 5.49,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class150Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Standard configuration',
        },
        {
          nps: '3',
          dn: 80,
          sch: 'XS',
          od: 88.9,
          wall: 7.62,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class300Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Extra strong',
        },
        {
          nps: '4',
          dn: 100,
          sch: 'STD',
          od: 114.3,
          wall: 6.02,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class150Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Standard configuration',
        },
        {
          nps: '4',
          dn: 100,
          sch: 'STD',
          od: 114.3,
          wall: 6.02,
          stdId: asmeB165Id,
          typeId: soTypeId,
          classId: class150Id,
          fit: 'Slip-On',
          bore: 'Raised Face',
          weld: true,
          notes: 'Fillet weld both sides',
        },
        {
          nps: '4',
          dn: 100,
          sch: 'XS',
          od: 114.3,
          wall: 8.56,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class300Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Extra strong',
        },
        {
          nps: '6',
          dn: 150,
          sch: 'STD',
          od: 168.3,
          wall: 7.11,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class150Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Standard configuration',
        },
        {
          nps: '6',
          dn: 150,
          sch: 'XS',
          od: 168.3,
          wall: 10.97,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class300Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Extra strong',
        },
        {
          nps: '8',
          dn: 200,
          sch: 'STD',
          od: 219.1,
          wall: 8.18,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class150Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Standard configuration',
        },
        {
          nps: '8',
          dn: 200,
          sch: 'XS',
          od: 219.1,
          wall: 12.7,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class300Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Extra strong',
        },
        {
          nps: '10',
          dn: 250,
          sch: 'STD',
          od: 273.0,
          wall: 9.27,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class150Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Standard configuration',
        },
        {
          nps: '12',
          dn: 300,
          sch: 'STD',
          od: 323.9,
          wall: 9.53,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class150Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Standard configuration',
        },
        {
          nps: '14',
          dn: 350,
          sch: 'STD',
          od: 355.6,
          wall: 9.53,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class150Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Standard configuration',
        },
        {
          nps: '16',
          dn: 400,
          sch: 'STD',
          od: 406.4,
          wall: 9.53,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class150Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Standard configuration',
        },
        {
          nps: '18',
          dn: 450,
          sch: 'STD',
          od: 457.2,
          wall: 9.53,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class150Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Standard configuration',
        },
        {
          nps: '20',
          dn: 500,
          sch: 'STD',
          od: 508.0,
          wall: 9.53,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class150Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Standard configuration',
        },
        {
          nps: '24',
          dn: 600,
          sch: 'STD',
          od: 609.6,
          wall: 9.53,
          stdId: asmeB165Id,
          typeId: wnTypeId,
          classId: class150Id,
          fit: 'Butt Weld',
          bore: 'Standard Bore',
          weld: true,
          notes: 'Standard configuration',
        },
      ];

      for (const compat of compatibilityData) {
        if (!compat.stdId || !compat.classId) continue;

        await queryRunner.query(
          `
          INSERT INTO pipe_flange_compatibility (nps_inch, dn_mm, pipe_schedule, pipe_od_mm, pipe_wall_mm, flange_standard_id, flange_type_id, pressure_class_id, fit_type, bore_match, weld_prep_required, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (nps_inch, pipe_schedule, flange_standard_id, flange_type_id, pressure_class_id) DO UPDATE SET
            pipe_od_mm = EXCLUDED.pipe_od_mm,
            pipe_wall_mm = EXCLUDED.pipe_wall_mm,
            fit_type = EXCLUDED.fit_type,
            bore_match = EXCLUDED.bore_match,
            notes = EXCLUDED.notes
        `,
          [
            compat.nps,
            compat.dn,
            compat.sch,
            compat.od,
            compat.wall,
            compat.stdId,
            compat.typeId,
            compat.classId,
            compat.fit,
            compat.bore,
            compat.weld,
            compat.notes,
          ],
        );
      }

      console.warn(
        `Added ${compatibilityData.length} pipe-flange compatibility records`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('Reverting missing helper tables...');

    await queryRunner.query(
      `DROP TABLE IF EXISTS pipe_flange_compatibility CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS pipe_flow_capacity CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS fluid_types CASCADE`);
    await queryRunner.query(`DROP VIEW IF EXISTS pipe_tubing_cross_reference`);
    await queryRunner.query(`DROP VIEW IF EXISTS pipe_size_equivalents`);
    await queryRunner.query(`DROP TABLE IF EXISTS tubing_sizes CASCADE`);

    const columnExists = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'nps_dn_mapping' AND column_name = 'has_tubing_equivalent'
    `);

    if (columnExists.length > 0) {
      await queryRunner.query(`
        ALTER TABLE nps_dn_mapping
        DROP COLUMN IF EXISTS has_tubing_equivalent,
        DROP COLUMN IF EXISTS tubing_od_mm,
        DROP COLUMN IF EXISTS tubing_od_inch
      `);
    }

    console.warn('Missing helper tables reverted.');
  }
}
