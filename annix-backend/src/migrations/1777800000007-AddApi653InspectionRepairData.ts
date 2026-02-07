import { MigrationInterface, QueryRunner } from "typeorm";

export class AddApi653InspectionRepairData1777800000007 implements MigrationInterface {
  name = "AddApi653InspectionRepairData1777800000007";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = async (tableName: string): Promise<boolean> => {
      const result = await queryRunner.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
        [tableName],
      );
      return result[0].exists;
    };

    if (!(await tableExists("api653_inspection_intervals"))) {
      await queryRunner.query(`
        CREATE TABLE api653_inspection_intervals (
          id SERIAL PRIMARY KEY,
          inspection_type VARCHAR(50) NOT NULL,
          condition VARCHAR(200) NOT NULL,
          max_interval_years DECIMAL(4,1),
          interval_formula VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO api653_inspection_intervals (inspection_type, condition, max_interval_years, interval_formula, notes)
        VALUES
          ('Routine In-Service', 'All tanks', 0.083, NULL, 'Monthly visual inspection from ground level'),
          ('External', 'All tanks', 5.0, 'RCA/4N', 'RCA = remaining corrosion allowance (mils), N = corrosion rate (mpy)'),
          ('Ultrasonic Thickness', 'Corrosion rate unknown', 5.0, NULL, 'External UT measurements'),
          ('Ultrasonic Thickness', 'Corrosion rate known', 15.0, 'RCA/2N', 'Whichever is less'),
          ('Internal', 'Corrosion rates known', 20.0, 'Based on MRT calculation', 'Maximum 20 years'),
          ('Internal', 'Corrosion rates unknown', 10.0, NULL, 'When similar service experience not available'),
          ('Internal', 'Risk-Based Inspection', NULL, 'Per RBI assessment', 'Review every 10 years or when service changes')
      `);
    }

    if (!(await tableExists("api653_joint_efficiencies"))) {
      await queryRunner.query(`
        CREATE TABLE api653_joint_efficiencies (
          id SERIAL PRIMARY KEY,
          standard VARCHAR(20) NOT NULL,
          edition VARCHAR(50) NOT NULL,
          joint_type VARCHAR(50) NOT NULL,
          efficiency DECIMAL(4,2) NOT NULL,
          applicability VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO api653_joint_efficiencies (standard, edition, joint_type, efficiency, applicability, notes)
        VALUES
          ('API 650', '7th & Later (1980+)', 'Butt', 1.00, 'Basic Standard', NULL),
          ('API 650', '7th & Later (1980+)', 'Butt', 0.85, 'Appendix A - Spot RT', NULL),
          ('API 650', '7th & Later (1980+)', 'Butt', 0.70, 'Appendix A - No RT', NULL),
          ('API 650', '1st-6th (1961-1978)', 'Butt', 0.85, 'Basic Standard', NULL),
          ('API 12C', '14th & 15th (1957-1958)', 'Butt', 1.00, 'Appendices D & G', NULL),
          ('API 12C', '14th & 15th (1957-1958)', 'Lap (Full double)', 0.75, '3/8 in. max thickness', NULL),
          ('API 12C', '3rd-13th (1940-1956)', 'Butt', 0.85, '7/16 in. max thickness', 'Single butt-weld with backup bar permitted 1936-1940, 1948-1954'),
          ('API 12C', '3rd-13th (1940-1956)', 'Lap (Full fillet)', 0.70, '1/4 in. max thickness', NULL),
          ('API 12C', '1st & 2nd (1936-1939)', 'Butt', 0.70, '7/16 in. max thickness', NULL),
          ('API 12C', '1st & 2nd (1936-1939)', 'Lap (Single)', 0.35, '1/4 in. max thickness', NULL),
          ('Riveted', 'All', 'Lap - 1 row', 0.45, NULL, NULL),
          ('Riveted', 'All', 'Lap - 2 rows', 0.60, NULL, NULL),
          ('Riveted', 'All', 'Lap - 3 rows', 0.70, NULL, NULL),
          ('Riveted', 'All', 'Lap - 4 rows', 0.75, NULL, NULL),
          ('Riveted', 'All', 'Butt (double strap) - 2 rows', 0.75, 'Per side of joint', NULL),
          ('Riveted', 'All', 'Butt (double strap) - 3 rows', 0.85, 'Per side of joint', NULL),
          ('Riveted', 'All', 'Butt (double strap) - 4 rows', 0.90, 'Per side of joint', NULL),
          ('Riveted', 'All', 'Butt (double strap) - 5 rows', 0.91, 'Per side of joint', NULL),
          ('Riveted', 'All', 'Butt (double strap) - 6 rows', 0.92, 'Per side of joint', NULL)
      `);
    }

    if (!(await tableExists("api653_material_stresses"))) {
      await queryRunner.query(`
        CREATE TABLE api653_material_stresses (
          id SERIAL PRIMARY KEY,
          material_spec VARCHAR(50) NOT NULL,
          yield_strength_psi INTEGER NOT NULL,
          tensile_strength_psi INTEGER NOT NULL,
          product_stress_lower_psi INTEGER NOT NULL,
          product_stress_upper_psi INTEGER NOT NULL,
          hydrotest_stress_lower_psi INTEGER NOT NULL,
          hydrotest_stress_upper_psi INTEGER NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO api653_material_stresses (material_spec, yield_strength_psi, tensile_strength_psi, product_stress_lower_psi, product_stress_upper_psi, hydrotest_stress_lower_psi, hydrotest_stress_upper_psi, notes)
        VALUES
          ('A 283-C', 30000, 55000, 23600, 26000, 26000, 27000, NULL),
          ('A 285-C', 30000, 55000, 23600, 26000, 26000, 27000, NULL),
          ('A 36', 36000, 58000, 24900, 27400, 27400, 30100, NULL),
          ('A 131-A,B,CS', 34000, 58000, 24900, 27400, 27400, 30100, NULL),
          ('A 131-EH 36', 51000, 71000, 30500, 33500, 33500, 36800, NULL),
          ('A 573-58', 32000, 58000, 24900, 27400, 27400, 28800, NULL),
          ('A 573-65', 35000, 65000, 27900, 30700, 30700, 31500, NULL),
          ('A 573-70', 42000, 70000, 30000, 33000, 33000, 36300, NULL),
          ('A 516-55', 30000, 55000, 23600, 26000, 26000, 27000, NULL),
          ('A 516-60', 32000, 60000, 25600, 28200, 28200, 28800, NULL),
          ('A 516-65', 35000, 65000, 27900, 30700, 30700, 31500, NULL),
          ('A 516-70', 38000, 70000, 30000, 33000, 33000, 34200, NULL),
          ('A 662-B', 40000, 65000, 27900, 30700, 30700, 33700, NULL),
          ('A 662-C', 43000, 70000, 30000, 33000, 33000, 36300, NULL),
          ('A 537-Class 1', 50000, 70000, 30000, 33000, 33000, 36300, NULL),
          ('A 537-Class 2', 60000, 80000, 34300, 37800, 37800, 41500, NULL),
          ('A 633-C,D', 50000, 70000, 30000, 33000, 33000, 36300, NULL),
          ('A 678-A', 50000, 70000, 30000, 33000, 33000, 36300, NULL),
          ('A 678-B', 60000, 80000, 34300, 37800, 37800, 41500, NULL),
          ('A 737-B', 50000, 70000, 30000, 33000, 33000, 36300, NULL),
          ('A 841', 50000, 70000, 30000, 33000, 33000, 36300, NULL),
          ('Unknown Welded', 30000, 55000, 23600, 26000, 26000, 27000, 'Use for welded tanks of unknown material'),
          ('Riveted (any grade)', 0, 0, 21000, 21000, 21000, 21000, 'S=21000 psi for all riveted tanks')
      `);
    }

    if (!(await tableExists("api653_bottom_thickness_limits"))) {
      await queryRunner.query(`
        CREATE TABLE api653_bottom_thickness_limits (
          id SERIAL PRIMARY KEY,
          foundation_type VARCHAR(100) NOT NULL,
          min_thickness_in DECIMAL(4,2) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO api653_bottom_thickness_limits (foundation_type, min_thickness_in, description)
        VALUES
          ('No leak detection/containment', 0.10, 'Tank bottom/foundation design with no means for detection and containment of a bottom leak'),
          ('With leak detection/containment', 0.05, 'Tank bottom/foundation design with means to provide detection and containment of a bottom leak'),
          ('Applied reinforced lining', 0.05, 'Applied tank bottom reinforced lining > 0.05 in. thick per API RP 652')
      `);
    }

    if (!(await tableExists("api653_annular_plate_thickness"))) {
      await queryRunner.query(`
        CREATE TABLE api653_annular_plate_thickness (
          id SERIAL PRIMARY KEY,
          shell_thickness_min_in DECIMAL(4,2) NOT NULL,
          shell_thickness_max_in DECIMAL(4,2),
          stress_limit_psi INTEGER NOT NULL,
          annular_thickness_in DECIMAL(4,2) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO api653_annular_plate_thickness (shell_thickness_min_in, shell_thickness_max_in, stress_limit_psi, annular_thickness_in, notes)
        VALUES
          (0.00, 0.75, 24300, 0.17, 'Product specific gravity < 1.0'),
          (0.00, 0.75, 27000, 0.20, 'Product specific gravity < 1.0'),
          (0.00, 0.75, 29700, 0.23, 'Product specific gravity < 1.0'),
          (0.00, 0.75, 32400, 0.30, 'Product specific gravity < 1.0'),
          (0.75, 1.00, 24300, 0.17, 'Product specific gravity < 1.0'),
          (0.75, 1.00, 27000, 0.22, 'Product specific gravity < 1.0'),
          (0.75, 1.00, 29700, 0.31, 'Product specific gravity < 1.0'),
          (0.75, 1.00, 32400, 0.38, 'Product specific gravity < 1.0'),
          (1.00, 1.25, 24300, 0.17, 'Product specific gravity < 1.0'),
          (1.00, 1.25, 27000, 0.26, 'Product specific gravity < 1.0'),
          (1.00, 1.25, 29700, 0.38, 'Product specific gravity < 1.0'),
          (1.00, 1.25, 32400, 0.48, 'Product specific gravity < 1.0'),
          (1.25, 1.50, 24300, 0.22, 'Product specific gravity < 1.0'),
          (1.25, 1.50, 27000, 0.34, 'Product specific gravity < 1.0'),
          (1.25, 1.50, 29700, 0.47, 'Product specific gravity < 1.0'),
          (1.25, 1.50, 32400, 0.59, 'Product specific gravity < 1.0'),
          (1.50, NULL, 24300, 0.27, 'Product specific gravity < 1.0, t > 1.50 in.'),
          (1.50, NULL, 27000, 0.40, 'Product specific gravity < 1.0, t > 1.50 in.'),
          (1.50, NULL, 29700, 0.53, 'Product specific gravity < 1.0, t > 1.50 in.'),
          (1.50, NULL, 32400, 0.68, 'Product specific gravity < 1.0, t > 1.50 in.')
      `);
    }

    if (!(await tableExists("api653_weld_spacing_requirements"))) {
      await queryRunner.query(`
        CREATE TABLE api653_weld_spacing_requirements (
          id SERIAL PRIMARY KEY,
          dimension_code VARCHAR(10) NOT NULL,
          description VARCHAR(100) NOT NULL,
          thin_plate_value VARCHAR(50) NOT NULL,
          thick_plate_value VARCHAR(50) NOT NULL,
          thickness_boundary_in DECIMAL(4,2) DEFAULT 0.50,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO api653_weld_spacing_requirements (dimension_code, description, thin_plate_value, thick_plate_value, thickness_boundary_in, notes)
        VALUES
          ('R', 'From shell-to-bottom weld', '6 in.', '≥ 6 in. or 6t', 0.50, 'Measured from weld toe'),
          ('B', 'From vertical shell weld', '6 in.', '≥ 10 in. or 8t', 0.50, 'Measured from weld outer edge'),
          ('H', 'From horizontal shell weld', '3 in.', '≥ 10 in. or 8t', 0.50, 'Measured from weld outer edge'),
          ('V', 'Between vertical welds', '6 in.', '≥ 10 in. or 8t', 0.50, 'Measured from weld outer edges'),
          ('A', 'Minimum plate dimension', '12 in.', '≥ 12 in. or 12t', 0.50, 'Minimum replacement plate size'),
          ('C', 'From annular ring weld', '≥ 3 in. or 5t', '≥ 3 in. or 5t', 0.50, 'For unknown toughness not meeting Figure 5-2')
      `);
    }

    if (!(await tableExists("api653_hot_tap_limits"))) {
      await queryRunner.query(`
        CREATE TABLE api653_hot_tap_limits (
          id SERIAL PRIMARY KEY,
          max_connection_size_nps INTEGER NOT NULL,
          min_shell_thickness_in DECIMAL(4,2) NOT NULL,
          material_condition VARCHAR(100) NOT NULL,
          max_stress_psi INTEGER,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO api653_hot_tap_limits (max_connection_size_nps, min_shell_thickness_in, material_condition, max_stress_psi, notes)
        VALUES
          (14, 0.1875, 'Known toughness or unknown ≤ 1/2 in.', NULL, 'Standard hot tap limit'),
          (18, 0.25, 'Known toughness or unknown ≤ 1/2 in.', NULL, 'Standard hot tap limit'),
          (4, 0.50, 'Unknown toughness > 1/2 in., below Figure 5-2 curve', 7000, 'Restricted hot tap conditions')
      `);
    }

    if (!(await tableExists("api653_weld_reinforcement_limits"))) {
      await queryRunner.query(`
        CREATE TABLE api653_weld_reinforcement_limits (
          id SERIAL PRIMARY KEY,
          plate_thickness_min_in DECIMAL(4,2) NOT NULL,
          plate_thickness_max_in DECIMAL(4,2),
          vertical_joint_max_in DECIMAL(5,3) NOT NULL,
          horizontal_joint_max_in DECIMAL(5,3) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO api653_weld_reinforcement_limits (plate_thickness_min_in, plate_thickness_max_in, vertical_joint_max_in, horizontal_joint_max_in, notes)
        VALUES
          (0.00, 0.50, 0.094, 0.125, '3/32 in. vertical, 1/8 in. horizontal'),
          (0.50, 1.00, 0.125, 0.188, '1/8 in. vertical, 3/16 in. horizontal'),
          (1.00, NULL, 0.188, 0.250, '3/16 in. vertical, 1/4 in. horizontal')
      `);
    }

    if (!(await tableExists("api653_dimensional_tolerances"))) {
      await queryRunner.query(`
        CREATE TABLE api653_dimensional_tolerances (
          id SERIAL PRIMARY KEY,
          tolerance_type VARCHAR(50) NOT NULL,
          tank_diameter_min_ft INTEGER,
          tank_diameter_max_ft INTEGER,
          tolerance_value VARCHAR(50) NOT NULL,
          condition VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO api653_dimensional_tolerances (tolerance_type, tank_diameter_min_ft, tank_diameter_max_ft, tolerance_value, condition, notes)
        VALUES
          ('Plumbness', NULL, NULL, '1/100 of height or 5 in.', 'Max out-of-plumb', 'Use smaller value'),
          ('Roundness', 0, 40, '± 1/2 in.', 'At 1 ft above bottom', 'Radius tolerance'),
          ('Roundness', 40, 150, '± 1 in.', 'At 1 ft above bottom', 'Radius tolerance'),
          ('Roundness', 150, 250, '± 1-1/2 in.', 'At 1 ft above bottom', 'Radius tolerance'),
          ('Roundness', 250, NULL, '± 2 in.', 'At 1 ft above bottom', 'Radius tolerance'),
          ('Roundness (higher)', 0, 40, '± 1-1/2 in.', 'Above 1 ft', '3x tolerance at bottom'),
          ('Roundness (higher)', 40, 150, '± 3 in.', 'Above 1 ft', '3x tolerance at bottom'),
          ('Roundness (higher)', 150, 250, '± 4-1/2 in.', 'Above 1 ft', '3x tolerance at bottom'),
          ('Roundness (higher)', 250, NULL, '± 6 in.', 'Above 1 ft', '3x tolerance at bottom'),
          ('Peaking', NULL, NULL, '1/2 in.', '36 in. horizontal sweep board', 'Maximum deviation'),
          ('Banding', NULL, NULL, '1 in.', '36 in. vertical sweep board', 'Maximum deviation'),
          ('Foundation (ringwall)', NULL, NULL, '± 1/8 in.', 'In any 30 ft of circumference', 'With concrete ringwall'),
          ('Foundation (ringwall)', NULL, NULL, '± 1/4 in.', 'Total circumference', 'With concrete ringwall'),
          ('Foundation (no ringwall)', NULL, NULL, '± 1/8 in.', 'In any 10 ft of circumference', 'Without concrete ringwall'),
          ('Foundation (no ringwall)', NULL, NULL, '± 1/2 in.', 'Total circumference', 'Without concrete ringwall')
      `);
    }

    if (!(await tableExists("api653_nde_requirements"))) {
      await queryRunner.query(`
        CREATE TABLE api653_nde_requirements (
          id SERIAL PRIMARY KEY,
          application VARCHAR(100) NOT NULL,
          nde_method VARCHAR(50) NOT NULL,
          extent VARCHAR(100) NOT NULL,
          timing VARCHAR(100),
          acceptance_criteria VARCHAR(200),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO api653_nde_requirements (application, nde_method, extent, timing, acceptance_criteria, notes)
        VALUES
          ('Shell penetration - lamination check', 'UT', 'Immediate area', 'Before reinforcing plate or hot tap', 'Per API 650', NULL),
          ('Shell penetration - attachment welds', 'MT or PT', 'Full length', 'After welding', 'Per API 650', 'Nozzle-to-shell, reinforcing plate welds'),
          ('Repaired butt-welds', 'RT or UT', 'Full length', 'After repair complete', 'Per API 650', NULL),
          ('Repaired fillet welds', 'MT or PT', 'Full length', 'After repair complete', 'Per API 650', NULL),
          ('New shell-to-shell welds (existing plate)', 'RT', 'Full length', 'After welding', 'Per API 650', 'Plus MT/PT for plates > 1 in.'),
          ('Shell-to-bottom weld', 'Vacuum box', 'Full length', 'After welding complete', 'No leaks', 'Or 15 psig air test'),
          ('Shell-to-bottom under patch', 'MT or PT', 'Full length + 6 in. each side', 'Before patch placement', 'Per API 650', NULL),
          ('Bottom plate welds', 'Visual', 'Full length', 'After welding', 'Per API 650, 6.5', NULL),
          ('Bottom plate welds', 'Vacuum box or tracer', 'Full length', 'After visual', 'No leaks', 'For repairs'),
          ('Critical zone patch plate', 'MT or PT', 'Full length', 'Root and final pass', 'Per API 650', 'Two-pass minimum welds'),
          ('Shell repair by weld deposit', 'MT or PT', 'Full area', 'After repair', 'Per API 650', NULL),
          ('Lap-welded shell patches', 'MT or PT', 'Full length', 'After welding', 'Per API 650', NULL),
          ('Hot tap (unknown toughness > 1/2 in.)', 'Fluorescent MT and/or UT', 'Full weld', 'After welding', 'Per API 650', 'Additional examination')
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS api653_nde_requirements");
    await queryRunner.query("DROP TABLE IF EXISTS api653_dimensional_tolerances");
    await queryRunner.query("DROP TABLE IF EXISTS api653_weld_reinforcement_limits");
    await queryRunner.query("DROP TABLE IF EXISTS api653_hot_tap_limits");
    await queryRunner.query("DROP TABLE IF EXISTS api653_weld_spacing_requirements");
    await queryRunner.query("DROP TABLE IF EXISTS api653_annular_plate_thickness");
    await queryRunner.query("DROP TABLE IF EXISTS api653_bottom_thickness_limits");
    await queryRunner.query("DROP TABLE IF EXISTS api653_material_stresses");
    await queryRunner.query("DROP TABLE IF EXISTS api653_joint_efficiencies");
    await queryRunner.query("DROP TABLE IF EXISTS api653_inspection_intervals");
  }
}
