import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAsmeVIIIPressureVesselData1777800000004 implements MigrationInterface {
  name = "AddAsmeVIIIPressureVesselData1777800000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding ASME VIII pressure vessel data for Tank Module...");

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vessel_weld_categories (
        id SERIAL PRIMARY KEY,
        category VARCHAR(5) NOT NULL UNIQUE,
        location VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        standard VARCHAR(20) DEFAULT 'ASME VIII'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vessel_joint_efficiencies (
        id SERIAL PRIMARY KEY,
        joint_type INTEGER NOT NULL,
        description TEXT NOT NULL,
        category_a DECIMAL(4,2),
        category_b DECIMAL(4,2),
        category_c DECIMAL(4,2),
        category_d DECIMAL(4,2),
        rt_requirement VARCHAR(20) NOT NULL,
        standard VARCHAR(20) DEFAULT 'ASME VIII',
        UNIQUE(joint_type, rt_requirement)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vessel_head_types (
        id SERIAL PRIMARY KEY,
        head_type VARCHAR(30) NOT NULL UNIQUE,
        description TEXT NOT NULL,
        thickness_factor DECIMAL(5,3),
        formula TEXT,
        typical_application TEXT,
        standard VARCHAR(20) DEFAULT 'ASME VIII'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gasket_factors (
        id SERIAL PRIMARY KEY,
        gasket_type VARCHAR(50) NOT NULL UNIQUE,
        m_factor DECIMAL(5,2) NOT NULL,
        y_factor_psi INTEGER NOT NULL,
        y_factor_mpa DECIMAL(6,2),
        notes TEXT,
        standard VARCHAR(20) DEFAULT 'ASME VIII'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vessel_nozzle_requirements (
        id SERIAL PRIMARY KEY,
        size_range VARCHAR(30) NOT NULL UNIQUE,
        min_schedule VARCHAR(20) NOT NULL,
        min_thickness_notes TEXT,
        standard VARCHAR(20) DEFAULT 'ASME VIII'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pwht_requirements (
        id SERIAL PRIMARY KEY,
        material_group VARCHAR(20) NOT NULL,
        p_number VARCHAR(10),
        thickness_threshold_mm DECIMAL(6,2),
        thickness_threshold_inch DECIMAL(5,3),
        temp_min_f INTEGER,
        temp_max_f INTEGER,
        temp_min_c INTEGER,
        temp_max_c INTEGER,
        holding_time TEXT,
        notes TEXT,
        standard VARCHAR(20) DEFAULT 'ASME VIII',
        UNIQUE(material_group, p_number)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pressure_test_requirements (
        id SERIAL PRIMARY KEY,
        test_type VARCHAR(20) NOT NULL UNIQUE,
        pressure_factor DECIMAL(4,2) NOT NULL,
        formula TEXT NOT NULL,
        min_hold_time VARCHAR(50),
        special_requirements TEXT,
        standard VARCHAR(20) DEFAULT 'ASME VIII'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vessel_material_specs (
        id SERIAL PRIMARY KEY,
        specification VARCHAR(20) NOT NULL,
        material_type VARCHAR(30) NOT NULL,
        grades TEXT,
        application TEXT NOT NULL,
        notes TEXT,
        standard VARCHAR(20) DEFAULT 'ASME VIII',
        UNIQUE(specification, material_type)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cone_angle_requirements (
        id SERIAL PRIMARY KEY,
        half_apex_angle_max INTEGER NOT NULL UNIQUE,
        requirement TEXT NOT NULL,
        knuckle_required BOOLEAN DEFAULT false,
        min_knuckle_radius TEXT,
        standard VARCHAR(20) DEFAULT 'ASME VIII'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vessel_flange_types (
        id SERIAL PRIMARY KEY,
        flange_type VARCHAR(30) NOT NULL UNIQUE,
        description TEXT NOT NULL,
        design_method VARCHAR(30) NOT NULL,
        appendix_reference VARCHAR(20),
        notes TEXT,
        standard VARCHAR(20) DEFAULT 'ASME VIII'
      )
    `);

    const weldCategories = [
      [
        "A",
        "Longitudinal",
        "Longitudinal joints in shells, communicating chambers, nozzles, and any joint within a sphere",
      ],
      [
        "B",
        "Circumferential",
        "Circumferential joints in shells and nozzles; joints between hemispherical heads and shells",
      ],
      [
        "C",
        "Flange-to-shell",
        "Joints connecting flanges, tubesheets, flat heads to main shell, nozzles, or communicating chambers",
      ],
      [
        "D",
        "Nozzle-to-shell",
        "Joints connecting nozzle necks, communicating chambers, or couplings to shells, heads, or flat-sided vessels",
      ],
    ];

    for (const [category, location, description] of weldCategories) {
      await queryRunner.query(
        `
        INSERT INTO vessel_weld_categories (category, location, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (category) DO UPDATE SET location = $2, description = $3
      `,
        [category, location, description],
      );
    }

    const jointEfficiencies = [
      [1, "Double-welded butt joint with full radiography", 1.0, 1.0, 1.0, 1.0, "Full RT"],
      [1, "Double-welded butt joint with spot radiography", 0.85, 0.85, 0.85, 0.85, "Spot RT"],
      [1, "Double-welded butt joint without radiography", 0.7, 0.7, 0.7, 0.7, "No RT"],
      [2, "Single-welded butt with backing strip, full RT", 0.9, 0.9, 0.9, 0.9, "Full RT"],
      [2, "Single-welded butt with backing strip, spot RT", 0.8, 0.8, 0.8, 0.8, "Spot RT"],
      [2, "Single-welded butt with backing strip, no RT", 0.65, 0.65, 0.65, 0.65, "No RT"],
      [3, "Single-welded butt without backing strip", null, 0.8, null, null, "Spot RT"],
      [3, "Single-welded butt without backing strip, no RT", null, 0.6, null, null, "No RT"],
      [4, "Double full fillet lap joint", null, 0.55, null, null, "No RT"],
      [5, "Single full fillet lap joint with plug welds", null, 0.5, null, null, "No RT"],
      [6, "Single-welded butt without backing (Cat B only)", null, 0.6, null, null, "No RT"],
    ];

    for (const [type, desc, catA, catB, catC, catD, rt] of jointEfficiencies) {
      await queryRunner.query(
        `
        INSERT INTO vessel_joint_efficiencies (joint_type, description, category_a, category_b, category_c, category_d, rt_requirement)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (joint_type, rt_requirement) DO UPDATE SET
          description = $2, category_a = $3, category_b = $4, category_c = $5, category_d = $6
      `,
        [type, desc, catA, catB, catC, catD, rt],
      );
    }

    const headTypes = [
      [
        "hemispherical",
        "Hemispherical head - half sphere",
        0.5,
        "t = PR/(2SE - 0.2P)",
        "High pressure vessels, reactors",
      ],
      [
        "ellipsoidal_2_1",
        "Ellipsoidal head - 2:1 ratio",
        1.0,
        "t = PD/(2SE - 0.2P)",
        "Standard pressure vessels",
      ],
      [
        "torispherical",
        "Torispherical (ASME F&D) head",
        1.77,
        "t = 0.885PL/(SE - 0.1P)",
        "Low pressure vessels, tanks",
      ],
      [
        "flat",
        "Flat head or cover",
        null,
        "Per UG-34 (C factor method)",
        "Small diameter, low pressure",
      ],
      [
        "conical",
        "Conical head or reducer",
        null,
        "t = PD/(2cos(α)(SE - 0.6P))",
        "Transition sections, hoppers",
      ],
      [
        "toriconical",
        "Toriconical head",
        null,
        "Combination torispherical/conical",
        "Large diameter transitions",
      ],
    ];

    for (const [headType, description, factor, formula, application] of headTypes) {
      await queryRunner.query(
        `
        INSERT INTO vessel_head_types (head_type, description, thickness_factor, formula, typical_application)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (head_type) DO UPDATE SET
          description = $2, thickness_factor = $3, formula = $4, typical_application = $5
      `,
        [headType, description, factor, formula, application],
      );
    }

    const gasketData = [
      ["rubber_with_fabric", 1.25, 400, 2.76, "Elastomers with cotton/asbestos fabric"],
      ["rubber_without_fabric", 0.5, 0, 0, "Plain elastomers, O-rings"],
      ["compressed_fiber", 2.0, 1600, 11.03, "Compressed non-asbestos fiber"],
      ["spiral_wound_metal", 2.5, 10000, 68.95, "Spiral wound with metal windings"],
      ["spiral_wound_ptfe", 2.0, 3700, 25.51, "Spiral wound with PTFE filler"],
      ["flexible_graphite", 2.0, 3700, 25.51, "Flexible graphite sheet"],
      ["soft_aluminum", 2.75, 4000, 27.58, "Soft aluminum (O temper)"],
      ["soft_copper_brass", 3.0, 4500, 31.03, "Soft copper or brass"],
      ["iron_soft_steel", 3.25, 5500, 37.92, "Iron or soft steel"],
      ["monel_4_6_chrome", 3.5, 6500, 44.82, "Monel, 4-6% chrome steel"],
      ["stainless_steel", 3.75, 7600, 52.4, "Stainless steel"],
      ["ring_joint_soft_iron", 5.5, 18000, 124.11, "Ring joint - soft iron/carbon steel"],
      ["ring_joint_monel", 6.0, 21800, 150.31, "Ring joint - Monel/4-6% chrome"],
      ["ring_joint_stainless", 6.5, 26000, 179.27, "Ring joint - stainless steel"],
    ];

    for (const [gasketType, m, yPsi, yMpa, notes] of gasketData) {
      await queryRunner.query(
        `
        INSERT INTO gasket_factors (gasket_type, m_factor, y_factor_psi, y_factor_mpa, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (gasket_type) DO UPDATE SET
          m_factor = $2, y_factor_psi = $3, y_factor_mpa = $4, notes = $5
      `,
        [gasketType, m, yPsi, yMpa, notes],
      );
    }

    const nozzleReqs = [
      ["NPS 2 and smaller", "Schedule 80", "Minimum for small bore nozzles per UG-45"],
      ["Greater than NPS 2", "Schedule 40", "Or calculated design thickness, whichever is greater"],
    ];

    for (const [sizeRange, minSchedule, notes] of nozzleReqs) {
      await queryRunner.query(
        `
        INSERT INTO vessel_nozzle_requirements (size_range, min_schedule, min_thickness_notes)
        VALUES ($1, $2, $3)
        ON CONFLICT (size_range) DO UPDATE SET
          min_schedule = $2, min_thickness_notes = $3
      `,
        [sizeRange, minSchedule, notes],
      );
    }

    const pwhtData = [
      [
        "carbon_steel",
        "P-1",
        32,
        1.25,
        1100,
        1200,
        593,
        649,
        "1 hr/in., 15 min minimum",
        "Standard carbon steel vessels",
      ],
      [
        "low_alloy",
        "P-3",
        16,
        0.625,
        1100,
        1200,
        593,
        649,
        "1 hr/in., 15 min minimum",
        "C-Mo, Mn-Mo steels",
      ],
      [
        "cr_mo_low",
        "P-4",
        13,
        0.5,
        1250,
        1300,
        677,
        704,
        "1 hr/in., 15 min minimum",
        "1-1/4Cr-1/2Mo, 2Cr-1/2Mo",
      ],
      [
        "cr_mo_high",
        "P-5A",
        13,
        0.5,
        1300,
        1400,
        704,
        760,
        "1 hr/in., 15 min minimum",
        "5Cr-1/2Mo through 9Cr-1Mo",
      ],
      [
        "stainless_austenitic",
        "P-8",
        null,
        null,
        null,
        null,
        null,
        null,
        "Not required unless specified",
        "304, 316 stainless - solution anneal if required",
      ],
    ];

    for (const [
      material,
      pNum,
      thickMm,
      thickIn,
      tempMinF,
      tempMaxF,
      tempMinC,
      tempMaxC,
      holding,
      notes,
    ] of pwhtData) {
      await queryRunner.query(
        `
        INSERT INTO pwht_requirements (material_group, p_number, thickness_threshold_mm, thickness_threshold_inch, temp_min_f, temp_max_f, temp_min_c, temp_max_c, holding_time, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (material_group, p_number) DO UPDATE SET
          thickness_threshold_mm = $3, thickness_threshold_inch = $4,
          temp_min_f = $5, temp_max_f = $6, temp_min_c = $7, temp_max_c = $8,
          holding_time = $9, notes = $10
      `,
        [material, pNum, thickMm, thickIn, tempMinF, tempMaxF, tempMinC, tempMaxC, holding, notes],
      );
    }

    const testReqs = [
      [
        "hydrostatic",
        1.3,
        "PT = 1.3 × MAWP × (ST/S)",
        "Time for examination",
        "Standard test method, preferred",
      ],
      [
        "pneumatic",
        1.1,
        "PT = 1.1 × MAWP × (ST/S)",
        "10 minutes minimum",
        "Increase in stages: 25%, then 10% increments",
      ],
      [
        "hydropneumatic",
        1.3,
        "Combination hydro + pneumatic",
        "Per procedure",
        "Used when complete filling not practical",
      ],
    ];

    for (const [testType, factor, formula, holdTime, requirements] of testReqs) {
      await queryRunner.query(
        `
        INSERT INTO pressure_test_requirements (test_type, pressure_factor, formula, min_hold_time, special_requirements)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (test_type) DO UPDATE SET
          pressure_factor = $2, formula = $3, min_hold_time = $4, special_requirements = $5
      `,
        [testType, factor, formula, holdTime, requirements],
      );
    }

    const materialSpecs = [
      ["SA-516", "plate", "55, 60, 65, 70", "Standard carbon steel pressure vessel plate", null],
      ["SA-285", "plate", "A, B, C", "Low/medium strength carbon steel plate", null],
      ["SA-240", "plate", "304, 304L, 316, 316L, 321, 347", "Stainless steel plate", null],
      ["SA-387", "plate", "11, 12, 22", "Cr-Mo alloy steel plate for elevated temperature", null],
      ["SA-106", "pipe", "A, B, C", "Seamless carbon steel pipe for high temperature", null],
      [
        "SA-312",
        "pipe",
        "TP304, TP316, TP321, TP347",
        "Seamless and welded stainless steel pipe",
        null,
      ],
      ["SA-333", "pipe", "1, 6, 7, 8", "Seamless and welded pipe for low temperature", null],
      [
        "SA-335",
        "pipe",
        "P5, P9, P11, P22",
        "Seamless alloy steel pipe for high temperature",
        null,
      ],
      ["SA-105", "forging", "Standard", "Carbon steel forgings for flanges and fittings", null],
      [
        "SA-182",
        "forging",
        "F304, F316, F11, F22",
        "Forged or rolled alloy and stainless flanges/fittings",
        null,
      ],
      [
        "SA-350",
        "forging",
        "LF1, LF2, LF3",
        "Carbon and low alloy forgings for low temperature",
        null,
      ],
      [
        "SA-266",
        "forging",
        "1, 2, 3, 4",
        "Carbon steel forgings for pressure vessel components",
        null,
      ],
    ];

    for (const [spec, matType, grades, application, notes] of materialSpecs) {
      await queryRunner.query(
        `
        INSERT INTO vessel_material_specs (specification, material_type, grades, application, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (specification, material_type) DO UPDATE SET
          grades = $3, application = $4, notes = $5
      `,
        [spec, matType, grades, application, notes],
      );
    }

    const coneAngles = [
      [30, "Standard cone rules apply", false, null],
      [
        60,
        "Knuckle or reinforcement required at large end",
        true,
        "6% of large diameter or reinforcement per Appendix 1-5",
      ],
    ];

    for (const [angle, requirement, knuckleReq, minRadius] of coneAngles) {
      await queryRunner.query(
        `
        INSERT INTO cone_angle_requirements (half_apex_angle_max, requirement, knuckle_required, min_knuckle_radius)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (half_apex_angle_max) DO UPDATE SET
          requirement = $2, knuckle_required = $3, min_knuckle_radius = $4
      `,
        [angle, requirement, knuckleReq, minRadius],
      );
    }

    const flangeTypes = [
      [
        "integral",
        "One-piece forged or welded construction with hub",
        "Appendix 2",
        "2-3, 2-4",
        "Highest integrity, used for high pressure",
      ],
      [
        "loose",
        "Lapped, threaded, or slip-on construction",
        "Appendix 2",
        "2-5",
        "Lower cost, easier alignment",
      ],
      [
        "optional",
        "Can be designed as integral when meeting requirements",
        "Owner choice",
        "2-6",
        "Designer option for borderline cases",
      ],
      [
        "reverse",
        "Bolts inside, gasket outside bolt circle",
        "Special rules",
        "2-10",
        "Used for heat exchangers, special applications",
      ],
      [
        "full_face",
        "Gasket extends to outer edge",
        "Appendix 2",
        "2-5",
        "Typically with flat face flanges",
      ],
      [
        "split_loose",
        "Multi-piece loose flange",
        "Appendix 2",
        "2-5",
        "Large diameter applications",
      ],
    ];

    for (const [flangeType, description, method, appendix, notes] of flangeTypes) {
      await queryRunner.query(
        `
        INSERT INTO vessel_flange_types (flange_type, description, design_method, appendix_reference, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (flange_type) DO UPDATE SET
          description = $2, design_method = $3, appendix_reference = $4, notes = $5
      `,
        [flangeType, description, method, appendix, notes],
      );
    }

    console.warn("ASME VIII pressure vessel data added successfully");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS vessel_flange_types");
    await queryRunner.query("DROP TABLE IF EXISTS cone_angle_requirements");
    await queryRunner.query("DROP TABLE IF EXISTS vessel_material_specs");
    await queryRunner.query("DROP TABLE IF EXISTS pressure_test_requirements");
    await queryRunner.query("DROP TABLE IF EXISTS pwht_requirements");
    await queryRunner.query("DROP TABLE IF EXISTS vessel_nozzle_requirements");
    await queryRunner.query("DROP TABLE IF EXISTS gasket_factors");
    await queryRunner.query("DROP TABLE IF EXISTS vessel_head_types");
    await queryRunner.query("DROP TABLE IF EXISTS vessel_joint_efficiencies");
    await queryRunner.query("DROP TABLE IF EXISTS vessel_weld_categories");
  }
}
