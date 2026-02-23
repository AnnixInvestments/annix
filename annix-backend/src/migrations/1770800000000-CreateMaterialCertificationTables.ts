import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMaterialCertificationTables1770800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chemical_compositions" (
        "id" SERIAL PRIMARY KEY,
        "carbon_pct" DECIMAL(5,3),
        "manganese_pct" DECIMAL(5,3),
        "phosphorus_pct" DECIMAL(5,4),
        "sulfur_pct" DECIMAL(5,4),
        "silicon_pct" DECIMAL(5,3),
        "chromium_pct" DECIMAL(5,3),
        "molybdenum_pct" DECIMAL(5,3),
        "nickel_pct" DECIMAL(5,3),
        "vanadium_pct" DECIMAL(5,4),
        "copper_pct" DECIMAL(5,3),
        "niobium_pct" DECIMAL(5,4),
        "titanium_pct" DECIMAL(5,4),
        "aluminum_pct" DECIMAL(5,4),
        "nitrogen_pct" DECIMAL(5,4),
        "boron_pct" DECIMAL(6,5),
        "heat_number" VARCHAR(50),
        "mtc_reference" VARCHAR(100),
        "rfq_item_id" INT REFERENCES "rfq_items"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tensile_test_results" (
        "id" SERIAL PRIMARY KEY,
        "yield_mpa" DECIMAL(7,2),
        "ultimate_mpa" DECIMAL(7,2),
        "elongation_pct" DECIMAL(5,2),
        "reduction_of_area_pct" DECIMAL(5,2),
        "test_temperature_c" DECIMAL(5,1),
        "specimen_orientation" VARCHAR(5),
        "specimen_location" VARCHAR(20),
        "heat_number" VARCHAR(50),
        "mtc_reference" VARCHAR(100),
        "rfq_item_id" INT REFERENCES "rfq_items"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "welding_requirements" (
        "id" SERIAL PRIMARY KEY,
        "p_number" VARCHAR(10) NOT NULL,
        "group_number" VARCHAR(10),
        "material_description" VARCHAR(100) NOT NULL,
        "typical_specifications" TEXT,
        "preheat_min_c" INT,
        "interpass_max_c" INT,
        "pwht_required" BOOLEAN DEFAULT FALSE,
        "pwht_temp_min_c" INT,
        "pwht_temp_max_c" INT,
        "pwht_hold_hrs_per_inch" DECIMAL(4,2),
        "pwht_min_hold_hrs" DECIMAL(4,2),
        "heating_rate_max_c_per_hr" INT,
        "cooling_rate_max_c_per_hr" INT,
        "pwht_thickness_threshold_mm" DECIMAL(6,2),
        "recommended_filler_metal" VARCHAR(50),
        "notes" TEXT,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("p_number", "group_number")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_chemical_compositions_rfq_item" ON "chemical_compositions"("rfq_item_id");
      CREATE INDEX IF NOT EXISTS "idx_chemical_compositions_heat_number" ON "chemical_compositions"("heat_number");
      CREATE INDEX IF NOT EXISTS "idx_tensile_test_results_rfq_item" ON "tensile_test_results"("rfq_item_id");
      CREATE INDEX IF NOT EXISTS "idx_tensile_test_results_heat_number" ON "tensile_test_results"("heat_number");
      CREATE INDEX IF NOT EXISTS "idx_welding_requirements_p_number" ON "welding_requirements"("p_number");
    `);

    await queryRunner.query(`
      INSERT INTO "welding_requirements"
        ("p_number", "group_number", "material_description", "typical_specifications",
         "preheat_min_c", "interpass_max_c", "pwht_required", "pwht_temp_min_c", "pwht_temp_max_c",
         "pwht_hold_hrs_per_inch", "pwht_min_hold_hrs", "heating_rate_max_c_per_hr", "cooling_rate_max_c_per_hr",
         "pwht_thickness_threshold_mm", "recommended_filler_metal", "notes")
      VALUES
        ('1', '1', 'Carbon Steel', 'A106 Gr.A, A53 Gr.A, A36',
         10, 315, false, 595, 650, 1.0, 0.25, 220, 280, 19.0, 'E7018',
         'PWHT required for thickness >19mm per ASME B31.3'),

        ('1', '2', 'Carbon Steel (Higher Strength)', 'A106 Gr.B, A53 Gr.B, A516 Gr.70',
         10, 315, false, 595, 650, 1.0, 0.25, 220, 280, 19.0, 'E7018',
         'PWHT required for thickness >19mm per ASME B31.3'),

        ('1', '3', 'Carbon Steel (High Strength)', 'A333 Gr.6, A420 Gr.WPL6',
         10, 315, false, 595, 650, 1.0, 0.25, 220, 280, 19.0, 'E7018-1',
         'Low temperature service. PWHT required for thickness >19mm'),

        ('5A', '1', 'Cr-Mo Steel (1/2Cr-1/2Mo)', 'A335 P2, A234 WP2',
         150, 315, true, 705, 745, 1.0, 0.5, 165, 165, 13.0, 'E8018-B2',
         'Mandatory PWHT. Preheat 150°C minimum'),

        ('5A', '2', 'Cr-Mo Steel (1Cr-1/2Mo)', 'A335 P12, A234 WP12',
         150, 315, true, 705, 745, 1.0, 0.5, 165, 165, 13.0, 'E8018-B2L',
         'Mandatory PWHT. Preheat 150°C minimum'),

        ('5B', '1', 'Cr-Mo Steel (2-1/4Cr-1Mo)', 'A335 P22, A234 WP22',
         200, 315, true, 705, 760, 1.0, 0.5, 110, 110, 13.0, 'E9018-B3',
         'Mandatory PWHT. Higher preheat required'),

        ('5B', '2', 'Cr-Mo Steel (9Cr-1Mo-V) P91', 'A335 P91, A234 WP91',
         200, 315, true, 745, 775, 2.0, 1.0, 80, 80, 0.0, 'E9015-B9',
         'P91 requires strict PWHT control. Always PWHT regardless of thickness. Temper bead not permitted'),

        ('15E', '1', 'Ferritic Stainless Steel', 'A268 TP405, A268 TP409',
         150, 315, true, 730, 790, 1.0, 0.5, 165, 165, 10.0, 'E309L',
         'Mandatory PWHT to restore ductility')
      ON CONFLICT ("p_number", "group_number") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "welding_requirements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tensile_test_results"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chemical_compositions"`);
  }
}
