import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWeldThicknessTables1768700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create pressure class/temperature combinations table
    await queryRunner.query(`
      CREATE TABLE weld_thickness_pressure_classes (
        id SERIAL PRIMARY KEY,
        class_name VARCHAR(50) NOT NULL UNIQUE,
        pressure_bar DECIMAL(10,2) NOT NULL,
        temperature_celsius INTEGER NOT NULL,
        material_type VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create pipe weld thickness recommendations table
    await queryRunner.query(`
      CREATE TABLE weld_thickness_pipe_recommendations (
        id SERIAL PRIMARY KEY,
        steel_type VARCHAR(50) NOT NULL,
        nominal_bore_mm INTEGER NOT NULL,
        schedule VARCHAR(20) NOT NULL,
        wall_thickness_mm DECIMAL(10,2) NOT NULL,
        temperature_celsius INTEGER NOT NULL,
        max_pressure_bar DECIMAL(10,2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create fitting weld thickness recommendations table
    await queryRunner.query(`
      CREATE TABLE weld_thickness_fitting_recommendations (
        id SERIAL PRIMARY KEY,
        fitting_type VARCHAR(50) NOT NULL,
        fitting_class VARCHAR(20) NOT NULL,
        nominal_bore_mm INTEGER NOT NULL,
        wall_thickness_mm DECIMAL(10,2) NOT NULL,
        temperature_celsius INTEGER NOT NULL,
        max_pressure_bar DECIMAL(10,2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add indexes for performance
    await queryRunner.query(`
      CREATE INDEX idx_pipe_recommendations_lookup
      ON weld_thickness_pipe_recommendations(steel_type, nominal_bore_mm, temperature_celsius);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_fitting_recommendations_lookup
      ON weld_thickness_fitting_recommendations(fitting_type, nominal_bore_mm, temperature_celsius);
    `);

    // Seed sample carbon steel pipe data (15mm DN, various schedules)
    // Note: Full data migration would parse weld-thickness.data.ts
    await queryRunner.query(`
      INSERT INTO weld_thickness_pipe_recommendations
      (steel_type, nominal_bore_mm, schedule, wall_thickness_mm, temperature_celsius, max_pressure_bar, notes)
      VALUES
      -- DN 15 (1/2") schedules at -29°C to 38°C
      ('CARBON_STEEL', 15, 'STD (40)', 2.77, 38, 344, 'ASTM A106/API 5L/ASTM A53 Equivalent'),
      ('CARBON_STEEL', 15, 'XS (80)', 3.73, 38, 481, 'ASTM A106/API 5L/ASTM A53 Equivalent'),
      ('CARBON_STEEL', 15, '160', 4.78, 38, 628, 'ASTM A106/API 5L/ASTM A53 Equivalent'),
      ('CARBON_STEEL', 15, 'XXS', 7.47, 38, 982, 'ASTM A106/API 5L/ASTM A53 Equivalent'),

      -- DN 15 at higher temperatures
      ('CARBON_STEEL', 15, 'STD (40)', 2.77, 205, 325, 'ASTM A106 at 205°C'),
      ('CARBON_STEEL', 15, 'STD (40)', 2.77, 350, 289, 'ASTM A106 at 350°C'),
      ('CARBON_STEEL', 15, 'STD (40)', 2.77, 400, 224, 'ASTM A106 at 400°C'),

      -- DN 20 (3/4") schedules
      ('CARBON_STEEL', 20, 'STD (40)', 2.87, 38, 281, 'ASTM A106/API 5L/ASTM A53 Equivalent'),
      ('CARBON_STEEL', 20, 'XS (80)', 3.91, 38, 394, 'ASTM A106/API 5L/ASTM A53 Equivalent'),
      ('CARBON_STEEL', 20, '160', 5.56, 38, 582, 'ASTM A106/API 5L/ASTM A53 Equivalent'),
      ('CARBON_STEEL', 20, 'XXS', 7.82, 38, 831, 'ASTM A106/API 5L/ASTM A53 Equivalent'),

      -- DN 25 (1") schedules
      ('CARBON_STEEL', 25, 'STD (40)', 3.38, 38, 250, 'ASTM A106/API 5L/ASTM A53 Equivalent'),
      ('CARBON_STEEL', 25, 'XS (80)', 4.55, 38, 345, 'ASTM A106/API 5L/ASTM A53 Equivalent'),
      ('CARBON_STEEL', 25, '160', 6.35, 38, 497, 'ASTM A106/API 5L/ASTM A53 Equivalent'),
      ('CARBON_STEEL', 25, 'XXS', 9.09, 38, 722, 'ASTM A106/API 5L/ASTM A53 Equivalent'),

      -- DN 50 (2") schedules
      ('CARBON_STEEL', 50, 'STD (40)', 3.91, 38, 152, 'ASTM A106/API 5L/ASTM A53 Equivalent'),
      ('CARBON_STEEL', 50, 'XS (80)', 5.54, 38, 221, 'ASTM A106/API 5L/ASTM A53 Equivalent'),
      ('CARBON_STEEL', 50, '160', 8.74, 38, 357, 'ASTM A106/API 5L/ASTM A53 Equivalent'),
      ('CARBON_STEEL', 50, 'XXS', 11.07, 38, 458, 'ASTM A106/API 5L/ASTM A53 Equivalent'),

      -- DN 100 (4") schedules
      ('CARBON_STEEL', 100, 'STD (40)', 6.02, 38, 124, 'ASTM A106/API 5L/ASTM A53 Equivalent'),
      ('CARBON_STEEL', 100, 'XS (80)', 8.56, 38, 181, 'ASTM A106/API 5L/ASTM A53 Equivalent'),
      ('CARBON_STEEL', 100, '160', 13.49, 38, 292, 'ASTM A106/API 5L/ASTM A53 Equivalent'),
      ('CARBON_STEEL', 100, 'XXS', 17.12, 38, 375, 'ASTM A106/API 5L/ASTM A53 Equivalent'),

      -- DN 200 (8") schedules
      ('CARBON_STEEL', 200, 'STD (40)', 8.18, 38, 88, 'ASTM A106/API 5L/ASTM A53 Equivalent'),
      ('CARBON_STEEL', 200, 'XS (80)', 12.70, 38, 140, 'ASTM A106/API 5L/ASTM A53 Equivalent'),
      ('CARBON_STEEL', 200, '160', 18.26, 38, 204, 'ASTM A106/API 5L/ASTM A53 Equivalent'),

      -- Stainless steel samples (ASTM A312)
      ('STAINLESS_STEEL', 15, 'SCH 10S', 1.65, 38, 193, 'ASTM A312 / ASME SA312'),
      ('STAINLESS_STEEL', 15, 'SCH 40S', 2.77, 38, 344, 'ASTM A312 / ASME SA312'),
      ('STAINLESS_STEEL', 50, 'SCH 10S', 2.11, 38, 83, 'ASTM A312 / ASME SA312'),
      ('STAINLESS_STEEL', 50, 'SCH 40S', 3.91, 38, 152, 'ASTM A312 / ASME SA312'),
      ('STAINLESS_STEEL', 100, 'SCH 10S', 3.05, 38, 63, 'ASTM A312 / ASME SA312'),
      ('STAINLESS_STEEL', 100, 'SCH 40S', 6.02, 38, 124, 'ASTM A312 / ASME SA312')
    `);

    // Seed sample fitting data
    await queryRunner.query(`
      INSERT INTO weld_thickness_fitting_recommendations
      (fitting_type, fitting_class, nominal_bore_mm, wall_thickness_mm, temperature_celsius, max_pressure_bar, notes)
      VALUES
      -- 45° Elbows - Standard
      ('45E', 'STD', 25, 3.18, 20, 257, 'WPB Grade ASME B31.1'),
      ('45E', 'STD', 50, 3.91, 20, 191, 'WPB Grade ASME B31.1'),
      ('45E', 'STD', 100, 6.35, 20, 155, 'WPB Grade ASME B31.1'),
      ('45E', 'STD', 200, 8.18, 20, 105, 'WPB Grade ASME B31.1'),

      -- 90° Elbows - Standard
      ('90E', 'STD', 25, 3.18, 20, 257, 'WPB Grade ASME B31.1'),
      ('90E', 'STD', 50, 3.91, 20, 191, 'WPB Grade ASME B31.1'),
      ('90E', 'STD', 100, 6.35, 20, 155, 'WPB Grade ASME B31.1'),
      ('90E', 'STD', 200, 8.18, 20, 105, 'WPB Grade ASME B31.1'),

      -- Tees - Standard
      ('TEE', 'STD', 25, 3.18, 20, 257, 'WPB Grade ASME B31.1'),
      ('TEE', 'STD', 50, 3.91, 20, 191, 'WPB Grade ASME B31.1'),
      ('TEE', 'STD', 100, 6.35, 20, 155, 'WPB Grade ASME B31.1'),
      ('TEE', 'STD', 200, 8.18, 20, 105, 'WPB Grade ASME B31.1'),

      -- Reducers - Standard
      ('BW_RED', 'STD', 50, 3.91, 20, 191, 'WPB Grade ASME B31.1'),
      ('BW_RED', 'STD', 100, 6.35, 20, 155, 'WPB Grade ASME B31.1'),
      ('BW_RED', 'STD', 200, 8.18, 20, 105, 'WPB Grade ASME B31.1'),

      -- Extra Heavy Schedule
      ('45E', 'XH', 25, 4.55, 20, 368, 'WPB Grade ASME B31.1 XH'),
      ('45E', 'XH', 50, 5.54, 20, 271, 'WPB Grade ASME B31.1 XH'),
      ('90E', 'XH', 25, 4.55, 20, 368, 'WPB Grade ASME B31.1 XH'),
      ('90E', 'XH', 50, 5.54, 20, 271, 'WPB Grade ASME B31.1 XH'),

      -- Double Extra Heavy
      ('45E', 'XXH', 25, 6.35, 20, 515, 'WPB Grade ASME B31.1 XXH'),
      ('90E', 'XXH', 25, 6.35, 20, 515, 'WPB Grade ASME B31.1 XXH')
    `);

    // Create note about full data migration
    await queryRunner.query(`
      COMMENT ON TABLE weld_thickness_pipe_recommendations IS
      'Sample data seeded. Full migration requires parsing weld-thickness.data.ts with 2000+ rows across all DN sizes, schedules, and temperature ranges.'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS weld_thickness_fitting_recommendations");
    await queryRunner.query("DROP TABLE IF EXISTS weld_thickness_pipe_recommendations");
    await queryRunner.query("DROP TABLE IF EXISTS weld_thickness_pressure_classes");
  }
}
