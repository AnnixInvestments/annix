import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDnvOsC101StructuralSteelData1777800000008
  implements MigrationInterface
{
  name = 'AddDnvOsC101StructuralSteelData1777800000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = async (tableName: string): Promise<boolean> => {
      const result = await queryRunner.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
        [tableName],
      );
      return result[0].exists;
    };

    if (!(await tableExists('dnv_load_factors'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_load_factors (
          id SERIAL PRIMARY KEY,
          limit_state VARCHAR(10) NOT NULL,
          combination VARCHAR(10),
          load_category VARCHAR(50) NOT NULL,
          factor DECIMAL(4,2) NOT NULL,
          condition VARCHAR(200),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_load_factors (limit_state, combination, load_category, factor, condition, notes)
        VALUES
          ('ULS', 'a', 'Permanent (G)', 1.30, NULL, 'Standard combination'),
          ('ULS', 'a', 'Variable (Q)', 1.30, NULL, 'Standard combination'),
          ('ULS', 'a', 'Environmental (E)', 0.70, NULL, 'Standard combination'),
          ('ULS', 'a', 'Deformation (D)', 1.00, NULL, 'Standard combination'),
          ('ULS', 'b', 'Permanent (G)', 1.00, NULL, 'Environmental dominant'),
          ('ULS', 'b', 'Variable (Q)', 1.00, NULL, 'Environmental dominant'),
          ('ULS', 'b', 'Environmental (E)', 1.30, NULL, 'Environmental dominant'),
          ('ULS', 'b', 'Deformation (D)', 1.00, NULL, 'Environmental dominant'),
          ('ULS', 'a', 'G and Q (well defined)', 1.20, 'Hydrostatic pressure', 'May be used when G and Q are well defined'),
          ('ULS', 'b', 'Environmental (E)', 1.15, 'Unmanned during extreme', 'Reduced factor for unmanned structures'),
          ('FLS', NULL, 'All categories', 1.00, NULL, 'All load categories'),
          ('SLS', NULL, 'All categories', 1.00, NULL, 'All load categories'),
          ('ALS', NULL, 'All categories', 1.00, NULL, 'All load categories')
      `);
    }

    if (!(await tableExists('dnv_material_factors'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_material_factors (
          id SERIAL PRIMARY KEY,
          application VARCHAR(100) NOT NULL,
          factor_symbol VARCHAR(20) NOT NULL,
          factor_value DECIMAL(4,2) NOT NULL,
          slenderness_condition VARCHAR(50),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_material_factors (application, factor_symbol, factor_value, slenderness_condition, notes)
        VALUES
          ('Plated structures', 'γM', 1.15, NULL, 'General material factor'),
          ('Tubular structures', 'γM', 1.15, NULL, 'General material factor'),
          ('Eurocode 3 Class 1,2,3 cross sections', 'γM0', 1.15, NULL, NULL),
          ('Eurocode 3 Class 4 cross sections', 'γM1', 1.15, NULL, NULL),
          ('Eurocode 3 buckling resistance', 'γM1', 1.15, NULL, NULL),
          ('Girders, beams, stiffeners on shells', 'γM', 1.15, 'λ ≤ 0.5', 'Buckling'),
          ('Girders, beams, stiffeners on shells', 'γM', 1.15, '0.5 < λ < 1.0', 'Buckling'),
          ('Girders, beams, stiffeners on shells', 'γM', 1.15, 'λ ≥ 1.0', 'Buckling'),
          ('Shells of single curvature', 'γM', 1.15, 'λ ≤ 0.5', 'Buckling'),
          ('Shells of single curvature', 'γM', 1.45, 'λ ≥ 1.0', 'Buckling, formula: 0.85 + 0.60λ for 0.5 < λ < 1.0'),
          ('Slip resistant bolts - standard clearance', 'γMs', 1.25, NULL, NULL),
          ('Slip resistant bolts - oversized holes', 'γMs', 1.40, NULL, NULL),
          ('Slip resistant bolts - long slotted holes', 'γMs', 1.40, NULL, NULL),
          ('Slip resistant bolts - load factor 1.0', 'γMs', 1.10, NULL, NULL)
      `);
    }

    if (!(await tableExists('dnv_structural_categories'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_structural_categories (
          id SERIAL PRIMARY KEY,
          category VARCHAR(20) NOT NULL,
          inspection_category VARCHAR(10) NOT NULL,
          description TEXT NOT NULL,
          examples TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_structural_categories (category, inspection_category, description, examples)
        VALUES
          ('Special', 'I', 'Parts where failure has substantial consequences AND stress conditions may increase brittle fracture probability', 'Complex joints with triaxial/biaxial stress patterns'),
          ('Primary', 'II', 'Parts where failure will have substantial consequences', 'Main structural members, load-bearing elements'),
          ('Secondary', 'III', 'Parts where failure will be without significant consequence', 'Non-load-bearing members, local stiffening')
      `);
    }

    if (!(await tableExists('dnv_steel_grades'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_steel_grades (
          id SERIAL PRIMARY KEY,
          designation VARCHAR(20) NOT NULL,
          strength_group VARCHAR(30) NOT NULL,
          min_yield_mpa INTEGER NOT NULL,
          grade VARCHAR(10) NOT NULL,
          test_temp_c INTEGER,
          improved_weldability BOOLEAN DEFAULT false,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_steel_grades (designation, strength_group, min_yield_mpa, grade, test_temp_c, improved_weldability, notes)
        VALUES
          ('NV', 'Normal Strength (NS)', 235, 'A', NULL, false, 'Not tested'),
          ('NV', 'Normal Strength (NS)', 235, 'B', 0, false, NULL),
          ('NV', 'Normal Strength (NS)', 235, 'BW', 0, true, 'Improved weldability'),
          ('NV', 'Normal Strength (NS)', 235, 'D', -20, false, NULL),
          ('NV', 'Normal Strength (NS)', 235, 'DW', -20, true, 'Improved weldability'),
          ('NV', 'Normal Strength (NS)', 235, 'E', -40, false, NULL),
          ('NV', 'Normal Strength (NS)', 235, 'EW', -40, true, 'Improved weldability'),
          ('NV-27', 'High Strength (HS)', 265, 'A', 0, false, NULL),
          ('NV-27', 'High Strength (HS)', 265, 'AW', 0, true, 'Improved weldability'),
          ('NV-27', 'High Strength (HS)', 265, 'D', -20, false, NULL),
          ('NV-27', 'High Strength (HS)', 265, 'DW', -20, true, 'Improved weldability'),
          ('NV-27', 'High Strength (HS)', 265, 'E', -40, false, NULL),
          ('NV-27', 'High Strength (HS)', 265, 'EW', -40, true, 'Improved weldability'),
          ('NV-27', 'High Strength (HS)', 265, 'F', -60, false, NULL),
          ('NV-32', 'High Strength (HS)', 315, 'A', 0, false, NULL),
          ('NV-32', 'High Strength (HS)', 315, 'D', -20, false, NULL),
          ('NV-32', 'High Strength (HS)', 315, 'E', -40, false, NULL),
          ('NV-32', 'High Strength (HS)', 315, 'F', -60, false, NULL),
          ('NV-36', 'High Strength (HS)', 355, 'A', 0, false, NULL),
          ('NV-36', 'High Strength (HS)', 355, 'D', -20, false, NULL),
          ('NV-36', 'High Strength (HS)', 355, 'E', -40, false, NULL),
          ('NV-36', 'High Strength (HS)', 355, 'F', -60, false, NULL),
          ('NV-40', 'High Strength (HS)', 390, 'A', 0, false, NULL),
          ('NV-40', 'High Strength (HS)', 390, 'D', -20, false, NULL),
          ('NV-40', 'High Strength (HS)', 390, 'E', -40, false, NULL),
          ('NV-40', 'High Strength (HS)', 390, 'F', -60, false, NULL),
          ('NV-420', 'Extra High Strength (EHS)', 420, 'A', 0, false, NULL),
          ('NV-420', 'Extra High Strength (EHS)', 420, 'D', -20, false, NULL),
          ('NV-420', 'Extra High Strength (EHS)', 420, 'E', -40, false, NULL),
          ('NV-420', 'Extra High Strength (EHS)', 420, 'F', -60, false, NULL),
          ('NV-460', 'Extra High Strength (EHS)', 460, 'A', 0, false, NULL),
          ('NV-460', 'Extra High Strength (EHS)', 460, 'D', -20, false, NULL),
          ('NV-460', 'Extra High Strength (EHS)', 460, 'E', -40, false, NULL),
          ('NV-460', 'Extra High Strength (EHS)', 460, 'F', -60, false, NULL),
          ('NV-500', 'Extra High Strength (EHS)', 500, 'A', 0, false, NULL),
          ('NV-500', 'Extra High Strength (EHS)', 500, 'D', -20, false, NULL),
          ('NV-500', 'Extra High Strength (EHS)', 500, 'DW', -20, true, 'Improved weldability'),
          ('NV-500', 'Extra High Strength (EHS)', 500, 'E', -40, false, NULL),
          ('NV-500', 'Extra High Strength (EHS)', 500, 'EW', -40, true, 'Improved weldability'),
          ('NV-500', 'Extra High Strength (EHS)', 500, 'F', -60, false, NULL),
          ('NV-550', 'Extra High Strength (EHS)', 550, 'A', 0, false, NULL),
          ('NV-550', 'Extra High Strength (EHS)', 550, 'D', -20, false, NULL),
          ('NV-550', 'Extra High Strength (EHS)', 550, 'E', -40, false, NULL),
          ('NV-550', 'Extra High Strength (EHS)', 550, 'F', -60, false, NULL),
          ('NV-620', 'Extra High Strength (EHS)', 620, 'A', 0, false, NULL),
          ('NV-620', 'Extra High Strength (EHS)', 620, 'D', -20, false, NULL),
          ('NV-620', 'Extra High Strength (EHS)', 620, 'E', -40, false, NULL),
          ('NV-620', 'Extra High Strength (EHS)', 620, 'F', -60, false, NULL),
          ('NV-690', 'Extra High Strength (EHS)', 690, 'A', 0, false, NULL),
          ('NV-690', 'Extra High Strength (EHS)', 690, 'D', -20, false, NULL),
          ('NV-690', 'Extra High Strength (EHS)', 690, 'E', -40, false, NULL),
          ('NV-690', 'Extra High Strength (EHS)', 690, 'F', -60, false, NULL)
      `);
    }

    if (!(await tableExists('dnv_thickness_limits'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_thickness_limits (
          id SERIAL PRIMARY KEY,
          structural_category VARCHAR(20) NOT NULL,
          grade VARCHAR(20) NOT NULL,
          service_temp_10c INTEGER,
          service_temp_0c INTEGER,
          service_temp_minus10c INTEGER,
          service_temp_minus20c INTEGER,
          service_temp_minus25c INTEGER,
          service_temp_minus30c INTEGER,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_thickness_limits (structural_category, grade, service_temp_10c, service_temp_0c, service_temp_minus10c, service_temp_minus20c, service_temp_minus25c, service_temp_minus30c, notes)
        VALUES
          ('Primary', 'A', 30, 20, 10, NULL, NULL, NULL, 'N.A. = not applicable'),
          ('Primary', 'B/BW', 40, 30, 25, 20, 15, 10, NULL),
          ('Primary', 'D/DW', 70, 60, 50, 40, 35, 30, NULL),
          ('Primary', 'E/EW', 150, 150, 100, 80, 70, 60, NULL),
          ('Primary', 'AH/AHW', 30, 25, 20, 15, 12, 10, 'High strength'),
          ('Primary', 'DH/DHW', 60, 50, 40, 30, 25, 20, 'High strength'),
          ('Primary', 'EH/EHW', 120, 100, 80, 60, 50, 40, 'High strength'),
          ('Primary', 'FH', 150, 150, 150, 150, NULL, NULL, 'Special consideration below -20C'),
          ('Primary', 'AEH', 35, 30, 25, 20, 17, 15, 'Extra high strength'),
          ('Primary', 'DEH/DEHW', 70, 60, 50, 40, 35, 30, 'Extra high strength'),
          ('Primary', 'EEH/EEHW', 150, 150, 100, 80, 70, 60, 'Extra high strength'),
          ('Primary', 'FEH', 150, 150, 150, 150, NULL, NULL, 'Special consideration below -20C'),
          ('Secondary', 'A', 35, 30, 25, 20, 15, 10, NULL),
          ('Secondary', 'B/BW', 70, 60, 50, 40, 30, 20, NULL),
          ('Secondary', 'D/DW', 150, 150, 100, 80, 70, 60, NULL),
          ('Secondary', 'E/EW', 150, 150, 150, 150, 120, 100, NULL),
          ('Special', 'D/DW', 35, 30, 25, 20, 17, 15, NULL),
          ('Special', 'E/EW', 70, 60, 50, 40, 35, 30, NULL),
          ('Special', 'AH/AHW', 15, 10, NULL, NULL, NULL, NULL, 'N.A. below 0C'),
          ('Special', 'DH/DHW', 30, 25, 20, 15, 12, 10, NULL),
          ('Special', 'EH/EHW', 60, 50, 40, 30, 25, 20, NULL),
          ('Special', 'FH', 120, 100, 80, 60, 50, 40, NULL)
      `);
    }

    if (!(await tableExists('dnv_deck_area_loads'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_deck_area_loads (
          id SERIAL PRIMARY KEY,
          area_type VARCHAR(100) NOT NULL,
          local_design_kpa VARCHAR(20) NOT NULL,
          point_load_kn VARCHAR(20) NOT NULL,
          primary_factor VARCHAR(20) NOT NULL,
          global_factor VARCHAR(50) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_deck_area_loads (area_type, local_design_kpa, point_load_kn, primary_factor, global_factor, notes)
        VALUES
          ('Storage areas', 'q', '1.5q', '1.0', '1.0', 'q to be evaluated for each case'),
          ('Lay down areas', 'q', '1.5q', 'f', 'f', 'Minimum 15 kN/m²'),
          ('Lifeboat platforms', '9.0', '9.0', '1.0', 'May be ignored', NULL),
          ('Area between equipment', '5.0', '5.0', 'f', 'May be ignored', NULL),
          ('Walkways, staircases, crew spaces', '4.0', '4.0', 'f', 'May be ignored', NULL),
          ('Walkways for inspection only', '3.0', '3.0', 'f', 'May be ignored', NULL),
          ('Areas not exposed to other loads', '2.5', '2.5', '1.0', '-', NULL)
      `);
    }

    if (!(await tableExists('dnv_friction_coefficients'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_friction_coefficients (
          id SERIAL PRIMARY KEY,
          surface_category VARCHAR(5) NOT NULL,
          friction_coefficient DECIMAL(3,2) NOT NULL,
          surface_treatment TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_friction_coefficients (surface_category, friction_coefficient, surface_treatment)
        VALUES
          ('A', 0.50, 'Shot/grit blasted with loose rust removed, spray metallised with Al or Zn-based coating'),
          ('B', 0.40, 'Shot/grit blasted, alkali-zinc silicate paint 50-80μm'),
          ('C', 0.30, 'Wire brushed or flame cleaned with loose rust removed'),
          ('D', 0.20, 'Surfaces not treated')
      `);
    }

    if (!(await tableExists('dnv_bolt_clearances'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_bolt_clearances (
          id SERIAL PRIMARY KEY,
          clearance_type VARCHAR(20) NOT NULL,
          bolt_diameter_min_mm INTEGER NOT NULL,
          bolt_diameter_max_mm INTEGER,
          clearance_mm INTEGER NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_bolt_clearances (clearance_type, bolt_diameter_min_mm, bolt_diameter_max_mm, clearance_mm, notes)
        VALUES
          ('Standard', 12, 14, 1, NULL),
          ('Standard', 16, 24, 2, NULL),
          ('Standard', 27, NULL, 3, '27mm and larger'),
          ('Oversized', 12, 12, 3, NULL),
          ('Oversized', 14, 22, 4, NULL),
          ('Oversized', 24, 24, 6, NULL),
          ('Oversized', 27, NULL, 8, '27mm and larger')
      `);
    }

    if (!(await tableExists('dnv_bending_moment_factors'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_bending_moment_factors (
          id SERIAL PRIMARY KEY,
          support_condition VARCHAR(100) NOT NULL,
          km_support_1 DECIMAL(4,1) NOT NULL,
          km_field DECIMAL(4,1),
          km_support_2 DECIMAL(4,1),
          kt_support_1 DECIMAL(4,2),
          kt_support_2 DECIMAL(4,2),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_bending_moment_factors (support_condition, km_support_1, km_field, km_support_2, kt_support_1, kt_support_2, notes)
        VALUES
          ('Simply supported both ends', 8.0, NULL, 8.0, 0.50, 0.50, NULL),
          ('Fixed both ends', 12.0, 24.0, 12.0, 0.50, 0.50, NULL),
          ('Fixed/simply supported', 14.2, 8.0, NULL, 0.38, 0.63, 'Fixed at position 1'),
          ('Continuous over supports', 10.0, NULL, 10.0, 0.70, 0.70, 'Intermediate condition'),
          ('Propped cantilever', 15.0, 23.3, 10.0, 0.30, 0.70, NULL),
          ('Fixed/propped', 16.8, 7.5, NULL, 0.20, 0.80, NULL),
          ('Cantilever', 7.8, NULL, NULL, 0.33, 0.67, NULL)
      `);
    }

    if (!(await tableExists('dnv_fatigue_design_factors'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_fatigue_design_factors (
          id SERIAL PRIMARY KEY,
          access_condition VARCHAR(100) NOT NULL,
          category_special DECIMAL(4,1) NOT NULL,
          category_primary DECIMAL(4,1) NOT NULL,
          category_secondary DECIMAL(4,1) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_fatigue_design_factors (access_condition, category_special, category_primary, category_secondary, notes)
        VALUES
          ('Below splash zone, no access', 10.0, 3.0, 2.0, 'Internal members not accessible'),
          ('Accessible for inspection', 3.0, 2.0, 1.0, 'Can be inspected during service'),
          ('Above splash zone', 2.0, 1.0, 1.0, 'Easily accessible')
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_fatigue_design_factors`);
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_bending_moment_factors`);
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_bolt_clearances`);
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_friction_coefficients`);
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_deck_area_loads`);
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_thickness_limits`);
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_steel_grades`);
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_structural_categories`);
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_material_factors`);
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_load_factors`);
  }
}
