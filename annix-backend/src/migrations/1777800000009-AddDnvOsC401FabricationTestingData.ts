import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDnvOsC401FabricationTestingData1777800000009 implements MigrationInterface {
  name = 'AddDnvOsC401FabricationTestingData1777800000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = async (tableName: string): Promise<boolean> => {
      const result = await queryRunner.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
        [tableName],
      );
      return result[0].exists;
    };

    if (!(await tableExists('dnv_fabrication_tolerances'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_fabrication_tolerances (
          id SERIAL PRIMARY KEY,
          detail VARCHAR(100) NOT NULL,
          tolerance_formula VARCHAR(50) NOT NULL,
          variable_description VARCHAR(200) NOT NULL,
          structure_type VARCHAR(50),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_fabrication_tolerances (detail, tolerance_formula, variable_description, structure_type, notes)
        VALUES
          ('Bars and frames - straightness', 'δ = 0.0015 × l', 'l = unsupported length', 'General', 'Max out of straightness'),
          ('Pillars, vertical columns', 'δ = 0.001 × l', 'l = unsupported length', 'General', 'Max inclination'),
          ('Stiffener webs relative to plate', 'δ = 0.0015 × l', 'l = unsupported stiffener length', 'Stiffened plate', NULL),
          ('Stiffener flanges relative to web', 'δ = 0.0015 × l', 'l = unsupported flange length', 'Stiffened plate', NULL),
          ('Parallel stiffener misalignment', 'δ = 0.02 × s', 's = stiffener spacing', 'Stiffened plate', NULL),
          ('Plate out-of-plane displacement', 'δ = 0.005 × s', 's = unsupported panel width', 'Stiffened plate', NULL),
          ('Cylindrical shell - radius deviation', 'δ = 0.005 × r', 'r = nominal shell radius', 'Cylindrical shell', 'At ring stiffener or bulkhead'),
          ('Cylindrical shell - longitudinal stiffeners', 'δ = 0.0015 × l', 'l = unsupported stiffener length', 'Cylindrical shell', NULL),
          ('Cylindrical shell - stiffener flanges', 'δ = 0.0015 × l', 'l = unsupported flange length', 'Cylindrical shell', NULL),
          ('Cylindrical shell - stiffener misalignment', 'δ = 0.02 × s', 's = stiffener spacing', 'Cylindrical shell', NULL),
          ('Cylindrical shell - local out of roundness', 'δ = 0.01g/(1+g/r)', 'g = template length, r = radius', 'Cylindrical shell', 'Template/rod method')
      `);
    }

    if (!(await tableExists('dnv_thickness_qualification_range'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_thickness_qualification_range (
          id SERIAL PRIMARY KEY,
          weld_type VARCHAR(50) NOT NULL,
          test_thickness_min_mm DECIMAL(6,1) NOT NULL,
          test_thickness_max_mm DECIMAL(6,1),
          qualified_min_formula VARCHAR(50) NOT NULL,
          qualified_max_formula VARCHAR(50) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_thickness_qualification_range (weld_type, test_thickness_min_mm, test_thickness_max_mm, qualified_min_formula, qualified_max_formula, notes)
        VALUES
          ('Butt weld (C-Mn steel)', 0, 3, '0.7t', '1.3t', NULL),
          ('Butt weld (C-Mn steel)', 3, 12, '3 mm', '1.3t', NULL),
          ('Butt weld (C-Mn steel)', 12, 100, '0.5t', '1.1t', NULL),
          ('Butt weld (C-Mn steel)', 100, NULL, '0.5t', '1.1t (max 2t)', 't > 100 mm'),
          ('Butt weld (Aluminium)', 0, 3, '0.5t', '2t', NULL),
          ('Butt weld (Aluminium)', 3, 20, '3 mm', '2t', NULL),
          ('Butt weld (Aluminium)', 20, NULL, '0.8t', 'unlimited', 't > 20 mm'),
          ('Fillet weld throat', 0, 10, '0.7a', '2a', 'C-Mn steel'),
          ('Fillet weld throat', 10, NULL, '5 mm', 'unlimited', 'C-Mn steel, a ≥ 10 mm'),
          ('Fillet weld throat (Al)', 0, 10, '0.75a', '1.5a', 'Aluminium'),
          ('Fillet weld throat (Al)', 10, NULL, '7.5 mm', 'unlimited', 'Aluminium, a ≥ 10 mm')
      `);
    }

    if (!(await tableExists('dnv_diameter_qualification_range'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_diameter_qualification_range (
          id SERIAL PRIMARY KEY,
          material_type VARCHAR(50) NOT NULL,
          test_diameter_min_mm INTEGER NOT NULL,
          test_diameter_max_mm INTEGER,
          qualified_min_formula VARCHAR(50) NOT NULL,
          qualified_max_formula VARCHAR(50) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_diameter_qualification_range (material_type, test_diameter_min_mm, test_diameter_max_mm, qualified_min_formula, qualified_max_formula, notes)
        VALUES
          ('C-Mn steel', 0, 25, '0.5D', '2D', NULL),
          ('C-Mn steel', 25, NULL, '0.5D', 'unlimited + plates', 'D > 25 mm'),
          ('Aluminium', 0, 25, '0.5D', '2D', NULL),
          ('Aluminium', 25, NULL, '0.5D', 'unlimited + plates', 'D > 25 mm')
      `);
    }

    if (!(await tableExists('dnv_ndt_extent'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_ndt_extent (
          id SERIAL PRIMARY KEY,
          inspection_category VARCHAR(20) NOT NULL,
          structural_category VARCHAR(20) NOT NULL,
          connection_type VARCHAR(100) NOT NULL,
          visual_pct INTEGER NOT NULL,
          mt_pt_pct VARCHAR(20) NOT NULL,
          rt_pct VARCHAR(20),
          ut_pct VARCHAR(20),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_ndt_extent (inspection_category, structural_category, connection_type, visual_pct, mt_pt_pct, rt_pct, ut_pct, notes)
        VALUES
          ('I', 'Special', 'Butt weld', 100, '100', '100', '100', NULL),
          ('I', 'Special', 'T-joints, full penetration', 100, '100', '-', '-', NULL),
          ('I', 'Special', 'T-joints, partial/fillet', 100, '100', '-', '-', NULL),
          ('II', 'Primary', 'Butt weld', 100, '20', '10', '20', NULL),
          ('II', 'Primary', 'T-joints, full penetration', 100, '20', '-', '-', NULL),
          ('II', 'Primary', 'T-joints, partial/fillet', 100, '20', '-', '-', NULL),
          ('III', 'Secondary', 'Butt weld', 100, '2-5', '2-5', '2-5', 'Spot check'),
          ('III', 'Secondary', 'T-joints, full penetration', 100, '2-5', '-', '2-5', 'Spot check'),
          ('III', 'Secondary', 'T-joints, partial/fillet', 100, '2-5', '-', '-', 'Spot check')
      `);
    }

    if (!(await tableExists('dnv_ndt_acceptance_criteria'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_ndt_acceptance_criteria (
          id SERIAL PRIMARY KEY,
          material_type VARCHAR(50) NOT NULL,
          structural_category VARCHAR(20) NOT NULL,
          acceptance_standard VARCHAR(50) NOT NULL,
          quality_level VARCHAR(20) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_ndt_acceptance_criteria (material_type, structural_category, acceptance_standard, quality_level, notes)
        VALUES
          ('Steel', 'Special', 'ISO 5817', 'Level B', NULL),
          ('Steel', 'Primary', 'ISO 5817', 'Level C', NULL),
          ('Steel', 'Secondary', 'ISO 5817', 'Level C', NULL),
          ('Aluminium', 'Special', 'ISO 10042', 'Level B', NULL),
          ('Aluminium', 'Primary', 'ISO 10042', 'Level C', NULL),
          ('Aluminium', 'Secondary', 'ISO 10042', 'Level C', NULL),
          ('Steel (UT)', 'Special', 'ISO 11666', 'Level 2', 'Planar defects rejected'),
          ('Steel (UT)', 'Primary', 'ISO 11666', 'Level 3', 'Planar defects rejected'),
          ('Steel (RT)', 'Special', 'ISO 10675', 'Level 1', NULL),
          ('Steel (RT)', 'Primary', 'ISO 10675', 'Level 2', NULL)
      `);
    }

    if (!(await tableExists('dnv_pwht_requirements'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_pwht_requirements (
          id SERIAL PRIMARY KEY,
          parameter VARCHAR(100) NOT NULL,
          value VARCHAR(100) NOT NULL,
          unit VARCHAR(20),
          condition VARCHAR(200),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_pwht_requirements (parameter, value, unit, condition, notes)
        VALUES
          ('Soaking temperature (min)', '550', '°C', 'C-Mn steels', NULL),
          ('Soaking temperature (max)', '620', '°C', 'C-Mn steels', NULL),
          ('Holding time', '2', 'min/mm', 'Minimum', NULL),
          ('Temperature difference (surfaces)', '30', '°C', 'Max during soaking', 'Outside to inside'),
          ('Temperature difference (symmetry)', '30', '°C', 'Max above 300°C', 'Along lines of symmetry'),
          ('Furnace distribution', '± 15', '°C', 'Throughout furnace', NULL),
          ('QT steel max PWHT temp', 'Tempering temp - 30', '°C', 'Quenched and tempered steels', 'Per material certificate')
      `);
    }

    if (!(await tableExists('dnv_cold_deformation_limits'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_cold_deformation_limits (
          id SERIAL PRIMARY KEY,
          deformation_min_pct DECIMAL(4,1) NOT NULL,
          deformation_max_pct DECIMAL(4,1),
          requirement TEXT NOT NULL,
          qualification_scope TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_cold_deformation_limits (deformation_min_pct, deformation_max_pct, requirement, qualification_scope)
        VALUES
          (0, 5, 'Allowed without qualification', NULL),
          (5, 12, 'Requires qualification by agreement', 'Impact testing of strained and strain-aged material'),
          (12, NULL, 'Special agreement required, heat treatment mandatory', 'Full base material qualification scope including weldability testing')
      `);
    }

    if (!(await tableExists('dnv_surface_preparation'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_surface_preparation (
          id SERIAL PRIMARY KEY,
          parameter VARCHAR(100) NOT NULL,
          requirement VARCHAR(100) NOT NULL,
          standard VARCHAR(50),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_surface_preparation (parameter, requirement, standard, notes)
        VALUES
          ('Cleanliness', 'Sa 2½', 'ISO 8501-1', 'External and seawater exposed surfaces'),
          ('Imperfection grade', 'P3', 'ISO 8501-3', NULL),
          ('Roughness', '50 - 85 μm', 'ISO 8503', NULL),
          ('Salt contamination (max)', '50 mg/m² NaCl equivalent', 'ISO 8502-6/9', NULL),
          ('Dust quantity/size', 'Rating 2', 'ISO 8502-3', NULL),
          ('Steel temp above dew point', '3°C', NULL, 'During blast cleaning and coating'),
          ('Relative humidity (max)', '85%', NULL, 'During coating application')
      `);
    }

    if (!(await tableExists('dnv_hydrogen_limits'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_hydrogen_limits (
          id SERIAL PRIMARY KEY,
          steel_type VARCHAR(100) NOT NULL,
          max_hydrogen_ml_per_100g INTEGER NOT NULL,
          suffix VARCHAR(10) NOT NULL,
          test_standard VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_hydrogen_limits (steel_type, max_hydrogen_ml_per_100g, suffix, test_standard)
        VALUES
          ('High strength steel', 10, 'H10', 'ISO 3690'),
          ('Extra high strength steel', 5, 'H5', 'ISO 3690')
      `);
    }

    if (!(await tableExists('dnv_bolt_requirements'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_bolt_requirements (
          id SERIAL PRIMARY KEY,
          environment VARCHAR(100) NOT NULL,
          max_property_class VARCHAR(20) NOT NULL,
          special_requirements TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_bolt_requirements (environment, max_property_class, special_requirements)
        VALUES
          ('Atmospheric', 'ISO 898 Class 10.9', NULL),
          ('Submerged in seawater', 'ISO 898 Class 8.8', NULL),
          ('H₂S service (NACE MR0175)', 'Lower than Class 8.8', 'Per NACE requirements'),
          ('Major structural (fy > 490 MPa)', 'N/A', 'Alloy steel required: (%Cr + %Mo + %Ni) ≥ 0.50, Q&T condition')
      `);
    }

    if (!(await tableExists('dnv_tightness_test_parameters'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_tightness_test_parameters (
          id SERIAL PRIMARY KEY,
          test_type VARCHAR(50) NOT NULL,
          parameter VARCHAR(100) NOT NULL,
          value VARCHAR(50) NOT NULL,
          unit VARCHAR(20),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_tightness_test_parameters (test_type, parameter, value, unit, notes)
        VALUES
          ('Air test', 'Maximum pressure', '0.2', 'bar', NULL),
          ('Air test', 'Inspection pressure', '0.15', 'bar', 'Minimum'),
          ('Hydraulic test', 'Minimum pressure at top', '25', 'kN/m²', NULL),
          ('Hydraulic test', 'Holding time', '20', 'minutes', 'Minimum'),
          ('Hose test', 'Pressure', '200', 'kN/m²', 'Minimum'),
          ('Hose test', 'Maximum distance', '1.5', 'm', NULL),
          ('Hose test', 'Nozzle diameter', '12.0', 'mm', 'Minimum')
      `);
    }

    if (!(await tableExists('dnv_ut_calibration_blocks'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_ut_calibration_blocks (
          id SERIAL PRIMARY KEY,
          material_thickness_min_mm INTEGER NOT NULL,
          material_thickness_max_mm INTEGER,
          block_thickness_mm VARCHAR(20) NOT NULL,
          hole_diameter_mm VARCHAR(20) NOT NULL,
          hole_positions VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_ut_calibration_blocks (material_thickness_min_mm, material_thickness_max_mm, block_thickness_mm, hole_diameter_mm, hole_positions)
        VALUES
          (10, 50, '40 or t', 'Ø3 ± 0.2', 't/2 and t/4'),
          (50, 100, '75 or t', 'Ø3 ± 0.2', 't/2 and t/4'),
          (100, 150, '125 or t', 'Ø6 ± 0.2', 't/2 and t/4'),
          (150, 200, '175 or t', 'Ø6 ± 0.2', 't/2 and t/4'),
          (200, 250, '225 or t', 'Ø6 ± 0.2', 't/2 and t/4'),
          (250, NULL, '275 or t', 'Ø6 ± 0.2', 't/2 and t/4')
      `);
    }

    if (!(await tableExists('dnv_ctod_requirements'))) {
      await queryRunner.query(`
        CREATE TABLE dnv_ctod_requirements (
          id SERIAL PRIMARY KEY,
          parameter VARCHAR(100) NOT NULL,
          value VARCHAR(100) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO dnv_ctod_requirements (parameter, value, notes)
        VALUES
          ('Minimum specimens per location', '3', 'Weld deposit and HAZ each'),
          ('Acceptance criterion', 'δ ≥ 0.15 mm', 'Critical CTOD'),
          ('Test temperature', '≤ service temperature', NULL),
          ('Heat input', 'Maximum in fabrication', NULL),
          ('Characteristic value (3-5 tests)', 'Lowest result', NULL),
          ('Characteristic value (6-10 tests)', 'Second lowest result', NULL),
          ('Characteristic value (11-15 tests)', 'Third lowest result', NULL)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_ctod_requirements`);
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_ut_calibration_blocks`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS dnv_tightness_test_parameters`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_bolt_requirements`);
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_hydrogen_limits`);
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_surface_preparation`);
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_cold_deformation_limits`);
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_pwht_requirements`);
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_ndt_acceptance_criteria`);
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_ndt_extent`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS dnv_diameter_qualification_range`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS dnv_thickness_qualification_range`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS dnv_fabrication_tolerances`);
  }
}
