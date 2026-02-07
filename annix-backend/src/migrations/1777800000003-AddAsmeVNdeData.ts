import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAsmeVNdeData1777800000003 implements MigrationInterface {
  name = "AddAsmeVNdeData1777800000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding ASME Section V NDE data for Quality Module...");

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS nde_methods (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        full_name VARCHAR(200),
        asme_article INTEGER,
        primary_use TEXT,
        detects_surface BOOLEAN DEFAULT false,
        detects_subsurface BOOLEAN DEFAULT false,
        standard VARCHAR(30) DEFAULT 'ASME V'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS nde_method_effectiveness (
        id SERIAL PRIMARY KEY,
        defect_type VARCHAR(50) NOT NULL,
        nde_method_code VARCHAR(10) NOT NULL,
        effectiveness VARCHAR(20) NOT NULL,
        notes TEXT,
        UNIQUE(defect_type, nde_method_code)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rt_pipe_techniques (
        id SERIAL PRIMARY KEY,
        technique_code VARCHAR(10) NOT NULL UNIQUE,
        technique_name VARCHAR(100) NOT NULL,
        source_location VARCHAR(50) NOT NULL,
        applicable_od_range VARCHAR(50),
        min_exposures INTEGER,
        angular_coverage VARCHAR(50),
        notes TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ut_search_angles (
        id SERIAL PRIMARY KEY,
        nominal_angle_deg INTEGER NOT NULL,
        actual_range_min INTEGER,
        actual_range_max INTEGER,
        primary_application TEXT NOT NULL,
        beam_type VARCHAR(20) DEFAULT 'shear',
        standard VARCHAR(30) DEFAULT 'ASME V',
        UNIQUE(nominal_angle_deg, beam_type)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pt_penetrant_types (
        id SERIAL PRIMARY KEY,
        type_code VARCHAR(10) NOT NULL,
        method_code VARCHAR(5) NOT NULL,
        type_name VARCHAR(50) NOT NULL,
        method_name VARCHAR(50) NOT NULL,
        removal_method VARCHAR(50),
        sensitivity_level VARCHAR(20),
        typical_application TEXT,
        UNIQUE(type_code, method_code)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pt_process_parameters (
        id SERIAL PRIMARY KEY,
        parameter_name VARCHAR(50) NOT NULL UNIQUE,
        min_value VARCHAR(30),
        max_value VARCHAR(30),
        unit VARCHAR(20),
        notes TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mt_magnetization_methods (
        id SERIAL PRIMARY KEY,
        method_name VARCHAR(50) NOT NULL UNIQUE,
        application TEXT NOT NULL,
        field_direction VARCHAR(50),
        min_field_strength VARCHAR(50),
        notes TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS nde_acceptance_criteria (
        id SERIAL PRIMARY KEY,
        indication_type VARCHAR(50) NOT NULL,
        nde_method VARCHAR(10) NOT NULL,
        acceptance_limit TEXT NOT NULL,
        code_reference VARCHAR(50),
        notes TEXT,
        UNIQUE(indication_type, nde_method)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS nde_certification_levels (
        id SERIAL PRIMARY KEY,
        level VARCHAR(10) NOT NULL UNIQUE,
        capability TEXT NOT NULL,
        typical_duties TEXT,
        supervision_required BOOLEAN DEFAULT false
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS nde_documentation_requirements (
        id SERIAL PRIMARY KEY,
        item VARCHAR(50) NOT NULL UNIQUE,
        required_information TEXT NOT NULL,
        mandatory BOOLEAN DEFAULT true
      )
    `);

    const ndeMethods = [
      [
        "RT",
        "Radiographic",
        "Radiographic Examination",
        2,
        "Volumetric weld examination",
        false,
        true,
      ],
      [
        "UT",
        "Ultrasonic",
        "Ultrasonic Examination",
        4,
        "Volumetric weld/material examination",
        false,
        true,
      ],
      [
        "PT",
        "Liquid Penetrant",
        "Liquid Penetrant Examination",
        6,
        "Surface defect detection",
        true,
        false,
      ],
      [
        "MT",
        "Magnetic Particle",
        "Magnetic Particle Examination",
        7,
        "Surface/near-surface defects (ferromagnetic)",
        true,
        true,
      ],
      [
        "ET",
        "Eddy Current",
        "Eddy Current Examination",
        8,
        "Tubing examination, surface defects",
        true,
        false,
      ],
      ["VT", "Visual", "Visual Examination", 9, "Surface condition inspection", true, false],
      ["LT", "Leak Testing", "Leak Testing", 10, "Pressure boundary integrity", false, false],
      [
        "AE",
        "Acoustic Emission",
        "Acoustic Emission Examination",
        12,
        "In-service monitoring",
        false,
        true,
      ],
    ];

    for (const [code, name, fullName, article, use, surface, subsurface] of ndeMethods) {
      await queryRunner.query(
        `
        INSERT INTO nde_methods (code, name, full_name, asme_article, primary_use, detects_surface, detects_subsurface)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (code) DO UPDATE SET
          name = $2, full_name = $3, asme_article = $4, primary_use = $5,
          detects_surface = $6, detects_subsurface = $7
      `,
        [code, name, fullName, article, use, surface, subsurface],
      );
    }

    const effectiveness = [
      ["surface_crack", "RT", "good", null],
      ["surface_crack", "UT", "fair", null],
      ["surface_crack", "PT", "excellent", "Best for open surface cracks"],
      ["surface_crack", "MT", "excellent", "Ferromagnetic materials only"],
      ["surface_crack", "ET", "good", null],
      ["surface_crack", "VT", "fair", "Requires adequate opening"],
      ["subsurface_crack", "RT", "good", "Orientation dependent"],
      ["subsurface_crack", "UT", "excellent", "Best volumetric method"],
      ["subsurface_crack", "MT", "fair", "Near-surface only"],
      ["porosity", "RT", "excellent", "Best for porosity detection"],
      ["porosity", "UT", "good", "Scattered porosity difficult"],
      ["slag_inclusion", "RT", "excellent", "Excellent density contrast"],
      ["slag_inclusion", "UT", "good", null],
      ["lack_of_fusion", "RT", "good", "Orientation dependent"],
      ["lack_of_fusion", "UT", "excellent", "Best for planar defects"],
      ["incomplete_penetration", "RT", "good", null],
      ["incomplete_penetration", "UT", "excellent", null],
      ["incomplete_penetration", "VT", "fair", "Root side access required"],
      ["undercut", "RT", "fair", null],
      ["undercut", "UT", "fair", null],
      ["undercut", "PT", "good", null],
      ["undercut", "MT", "good", null],
      ["undercut", "VT", "excellent", "Best method for undercut"],
      ["lamination", "RT", "fair", "Orientation limits detection"],
      ["lamination", "UT", "excellent", "Straight beam examination"],
      ["lamination", "ET", "good", "For tubing"],
      ["seam", "RT", "fair", null],
      ["seam", "UT", "good", null],
      ["seam", "PT", "good", null],
      ["seam", "MT", "good", null],
      ["seam", "ET", "excellent", "Best for pipe/tube seams"],
    ];

    for (const [defect, method, effect, notes] of effectiveness) {
      await queryRunner.query(
        `
        INSERT INTO nde_method_effectiveness (defect_type, nde_method_code, effectiveness, notes)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (defect_type, nde_method_code) DO UPDATE SET
          effectiveness = $3, notes = $4
      `,
        [defect, method, effect, notes],
      );
    }

    const rtTechniques = [
      [
        "SWSI",
        "Single Wall Single Image",
        "Inside pipe (panoramic or sequential)",
        '> 3.5" OD',
        1,
        "360 deg panoramic or 120 deg each",
        "Source inside, film outside",
      ],
      [
        "DWSI",
        "Double Wall Single Image",
        "Outside pipe",
        '> 3.5" OD',
        2,
        "90 deg apart minimum",
        "Source outside, film opposite",
      ],
      [
        "DWDI",
        "Double Wall Double Image",
        "Outside pipe",
        '< 3.5" OD',
        2,
        "90 or 120 deg apart",
        "Elliptical image, both walls visible",
      ],
    ];

    for (const [code, name, location, odRange, minExp, coverage, notes] of rtTechniques) {
      await queryRunner.query(
        `
        INSERT INTO rt_pipe_techniques (technique_code, technique_name, source_location, applicable_od_range, min_exposures, angular_coverage, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (technique_code) DO UPDATE SET
          technique_name = $2, source_location = $3, applicable_od_range = $4,
          min_exposures = $5, angular_coverage = $6, notes = $7
      `,
        [code, name, location, odRange, minExp, coverage, notes],
      );
    }

    const utAngles = [
      [0, null, null, "Lamination detection, thickness measurement", "longitudinal"],
      [45, 40, 50, "General weld examination, good corner reflection", "shear"],
      [60, 55, 65, "Weld root examination, fusion line defects", "shear"],
      [70, 65, 75, "Near-surface defects, thin materials", "shear"],
    ];

    for (const [nominal, rangeMin, rangeMax, application, beamType] of utAngles) {
      await queryRunner.query(
        `
        INSERT INTO ut_search_angles (nominal_angle_deg, actual_range_min, actual_range_max, primary_application, beam_type)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (nominal_angle_deg, beam_type) DO UPDATE SET
          actual_range_min = $2, actual_range_max = $3, primary_application = $4
      `,
        [nominal, rangeMin, rangeMax, application, beamType],
      );
    }

    const ptTypes = [
      ["I", "A", "Fluorescent", "Water washable", "Water", "Low-Medium", "General fluorescent"],
      [
        "I",
        "B",
        "Fluorescent",
        "Post-emulsifiable lipophilic",
        "Lipophilic emulsifier",
        "High",
        "High sensitivity",
      ],
      ["I", "C", "Fluorescent", "Solvent removable", "Solvent", "Medium-High", "Localized areas"],
      [
        "I",
        "D",
        "Fluorescent",
        "Post-emulsifiable hydrophilic",
        "Hydrophilic emulsifier",
        "Very High",
        "Maximum sensitivity",
      ],
      ["II", "A", "Visible dye", "Water washable", "Water", "Low", "General visible"],
      ["II", "C", "Visible dye", "Solvent removable", "Solvent", "Medium", "Field use"],
      ["III", "A", "Dual mode", "Water washable", "Water", "Medium", "Versatile applications"],
    ];

    for (const [
      typeCode,
      methodCode,
      typeName,
      methodName,
      removal,
      sensitivity,
      application,
    ] of ptTypes) {
      await queryRunner.query(
        `
        INSERT INTO pt_penetrant_types (type_code, method_code, type_name, method_name, removal_method, sensitivity_level, typical_application)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (type_code, method_code) DO UPDATE SET
          type_name = $3, method_name = $4, removal_method = $5,
          sensitivity_level = $6, typical_application = $7
      `,
        [typeCode, methodCode, typeName, methodName, removal, sensitivity, application],
      );
    }

    const ptParams = [
      ["surface_temp_min", "40", null, "°F (4°C)", null],
      ["surface_temp_max", null, "125", "°F (52°C)", null],
      ["penetrant_dwell_min", "5", null, "minutes", "Minimum for Type I/II"],
      ["developer_dwell_min", "10", null, "minutes", null],
      ["developer_dwell_max", null, "60", "minutes", "Extended time may mask indications"],
      ["surface_roughness_max", null, "125", "microinches (Ra)", "3.2 μm"],
      ["drying_time_min", "5", null, "minutes", "After cleaning"],
    ];

    for (const [param, minVal, maxVal, unit, notes] of ptParams) {
      await queryRunner.query(
        `
        INSERT INTO pt_process_parameters (parameter_name, min_value, max_value, unit, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (parameter_name) DO UPDATE SET
          min_value = $2, max_value = $3, unit = $4, notes = $5
      `,
        [param, minVal, maxVal, unit, notes],
      );
    }

    const mtMethods = [
      [
        "Yoke (AC)",
        "Local area examination",
        "Between poles",
        "30-60 A/cm at poles",
        "Most common field method",
      ],
      [
        "Yoke (DC)",
        "Local area examination",
        "Between poles",
        "40 A/cm minimum",
        "Better subsurface detection",
      ],
      [
        "Prods",
        "Local area examination",
        "Between prods",
        "100-125 A per inch spacing",
        "Caution: arc burns possible",
      ],
      ["Coil", "Circular parts", "Longitudinal", "Per procedure", "Detects transverse defects"],
      [
        "Central conductor",
        "Tubular parts",
        "Circular",
        "Per procedure",
        "Detects longitudinal defects",
      ],
      ["Head shot", "Through part", "Circular", "Per procedure", "Requires electrical contact"],
    ];

    for (const [method, application, direction, strength, notes] of mtMethods) {
      await queryRunner.query(
        `
        INSERT INTO mt_magnetization_methods (method_name, application, field_direction, min_field_strength, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (method_name) DO UPDATE SET
          application = $2, field_direction = $3, min_field_strength = $4, notes = $5
      `,
        [method, application, direction, strength, notes],
      );
    }

    const acceptanceCriteria = [
      ["crack", "RT", "Not acceptable", "All codes", null],
      ["crack", "UT", "Not acceptable", "All codes", null],
      ["crack", "PT", "Not acceptable", "All codes", "Any linear indication"],
      ["crack", "MT", "Not acceptable", "All codes", "Any linear indication"],
      ["incomplete_fusion", "RT", "Not acceptable", "All codes", null],
      ["incomplete_fusion", "UT", "Not acceptable", "All codes", null],
      [
        "incomplete_penetration",
        "RT",
        "Per referencing code",
        "Varies by code",
        "Some codes allow limited IP",
      ],
      ["incomplete_penetration", "UT", "Not acceptable", "Most codes", null],
      ["slag_isolated", "RT", "Length ≤ 2/3t", "Typical", "t = thickness"],
      ["slag_isolated", "UT", "Per DAC level", "Procedure dependent", null],
      [
        "porosity",
        "RT",
        "Per acceptance charts",
        "ASME VIII Appendix 4",
        "Size and distribution limits",
      ],
      ["porosity", "UT", "Per DAC level", "Procedure dependent", null],
      [
        "undercut",
        "VT",
        '1/32" (0.8mm) max depth',
        "Typical",
        '10% of wall or 1/32", whichever is less',
      ],
      ["linear_indication", "PT", 'Length ≤ 1/16" (1.5mm)', "Typical", null],
      ["linear_indication", "MT", 'Length ≤ 1/16" (1.5mm)', "Typical", null],
      ["rounded_indication", "PT", '≤ 3/16" (5mm) diameter', "Typical", "Single indication"],
      ["rounded_indication", "MT", '≤ 3/16" (5mm) diameter', "Typical", "Single indication"],
    ];

    for (const [indication, method, limit, reference, notes] of acceptanceCriteria) {
      await queryRunner.query(
        `
        INSERT INTO nde_acceptance_criteria (indication_type, nde_method, acceptance_limit, code_reference, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (indication_type, nde_method) DO UPDATE SET
          acceptance_limit = $3, code_reference = $4, notes = $5
      `,
        [indication, method, limit, reference, notes],
      );
    }

    const certLevels = [
      [
        "I",
        "Perform examination per written instruction",
        "Setup under supervision, scanning, recording",
        true,
      ],
      [
        "II",
        "Set up, calibrate, interpret, evaluate",
        "Independent examination, reporting, training Level I",
        false,
      ],
      [
        "III",
        "Develop procedures, interpret codes, train",
        "Program management, procedure qualification, auditing",
        false,
      ],
    ];

    for (const [level, capability, duties, supervision] of certLevels) {
      await queryRunner.query(
        `
        INSERT INTO nde_certification_levels (level, capability, typical_duties, supervision_required)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (level) DO UPDATE SET
          capability = $2, typical_duties = $3, supervision_required = $4
      `,
        [level, capability, duties, supervision],
      );
    }

    const docRequirements = [
      ["component_id", "Unique identification of component examined", true],
      ["examination_area", "Location and extent of examination", true],
      ["procedure_reference", "Procedure number and revision", true],
      ["equipment", "Serial numbers and calibration status", true],
      ["technique_parameters", "Parameters used (angles, frequencies, etc.)", true],
      ["results", "Indications found and disposition", true],
      ["personnel", "Examiner name and certification level", true],
      ["examination_date", "Date of examination", true],
      ["acceptance_standard", "Code or specification used for acceptance", true],
      ["sketch_or_map", "Location sketch for recordable indications", false],
    ];

    for (const [item, info, mandatory] of docRequirements) {
      await queryRunner.query(
        `
        INSERT INTO nde_documentation_requirements (item, required_information, mandatory)
        VALUES ($1, $2, $3)
        ON CONFLICT (item) DO UPDATE SET
          required_information = $2, mandatory = $3
      `,
        [item, info, mandatory],
      );
    }

    console.warn("ASME Section V NDE data added successfully");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS nde_documentation_requirements");
    await queryRunner.query("DROP TABLE IF EXISTS nde_certification_levels");
    await queryRunner.query("DROP TABLE IF EXISTS nde_acceptance_criteria");
    await queryRunner.query("DROP TABLE IF EXISTS mt_magnetization_methods");
    await queryRunner.query("DROP TABLE IF EXISTS pt_process_parameters");
    await queryRunner.query("DROP TABLE IF EXISTS pt_penetrant_types");
    await queryRunner.query("DROP TABLE IF EXISTS ut_search_angles");
    await queryRunner.query("DROP TABLE IF EXISTS rt_pipe_techniques");
    await queryRunner.query("DROP TABLE IF EXISTS nde_method_effectiveness");
    await queryRunner.query("DROP TABLE IF EXISTS nde_methods");
  }
}
