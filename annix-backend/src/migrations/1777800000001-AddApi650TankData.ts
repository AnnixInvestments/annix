import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApi650TankData1777800000001 implements MigrationInterface {
  name = 'AddApi650TankData1777800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      'Adding API 650 tank construction data for future tank module...',
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tank_nozzle_types (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        flange_types TEXT[],
        typical_application TEXT,
        standard VARCHAR(20) DEFAULT 'API 650'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tank_flange_types (
        id SERIAL PRIMARY KEY,
        code VARCHAR(30) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        abbreviation VARCHAR(10),
        weld_size_basis VARCHAR(50),
        weld_size_notes TEXT,
        pwht_threshold_mm DECIMAL(5,1),
        standard VARCHAR(20) DEFAULT 'API 650'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tank_nozzle_tolerances (
        id SERIAL PRIMARY KEY,
        tolerance_type VARCHAR(50) NOT NULL,
        nozzle_location VARCHAR(30) NOT NULL,
        min_nps DECIMAL(5,2),
        max_nps DECIMAL(5,2),
        tolerance_value DECIMAL(6,2) NOT NULL,
        tolerance_unit VARCHAR(20) NOT NULL,
        notes TEXT,
        standard VARCHAR(20) DEFAULT 'API 650',
        UNIQUE(tolerance_type, nozzle_location, min_nps)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tank_manhole_specs (
        id SERIAL PRIMARY KEY,
        manhole_type VARCHAR(30) NOT NULL,
        nominal_size_mm INTEGER NOT NULL,
        nominal_size_inch DECIMAL(5,2) NOT NULL,
        min_cover_plate_mm DECIMAL(5,1),
        min_bolting_flange_mm DECIMAL(5,1),
        min_neck_thickness_mm DECIMAL(5,1),
        bolt_circle_mm INTEGER,
        num_bolts INTEGER,
        bolt_size VARCHAR(20),
        notes TEXT,
        standard VARCHAR(20) DEFAULT 'API 650',
        UNIQUE(manhole_type, nominal_size_mm)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tank_nozzle_dimensions (
        id SERIAL PRIMARY KEY,
        nps VARCHAR(10) NOT NULL,
        nps_decimal DECIMAL(6,3) NOT NULL,
        min_pipe_schedule VARCHAR(10),
        min_pipe_wall_mm DECIMAL(5,2),
        min_reinforcing_pad_mm DECIMAL(5,1),
        pipe_od_mm DECIMAL(6,2),
        flange_od_mm DECIMAL(6,1),
        bolt_circle_mm DECIMAL(6,1),
        num_bolts INTEGER,
        bolt_size VARCHAR(20),
        standard VARCHAR(20) DEFAULT 'API 650',
        UNIQUE(nps, standard)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tank_material_groups (
        id SERIAL PRIMARY KEY,
        group_code VARCHAR(10) NOT NULL UNIQUE,
        group_name VARCHAR(100) NOT NULL,
        description TEXT,
        min_design_temp_c INTEGER,
        max_design_temp_c INTEGER,
        requires_impact_test BOOLEAN DEFAULT false,
        seamless_required BOOLEAN DEFAULT false,
        typical_specs TEXT[],
        standard VARCHAR(20) DEFAULT 'API 650'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tank_pipe_specs (
        id SERIAL PRIMARY KEY,
        astm_spec VARCHAR(20) NOT NULL,
        grade VARCHAR(20),
        description TEXT,
        application TEXT,
        min_temp_c INTEGER,
        max_temp_c INTEGER,
        material_group VARCHAR(10),
        standard VARCHAR(20) DEFAULT 'API 650',
        UNIQUE(astm_spec, grade)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tank_drain_requirements (
        id SERIAL PRIMARY KEY,
        drain_type VARCHAR(50) NOT NULL UNIQUE,
        min_pipe_schedule VARCHAR(10),
        min_spacing_from_shell_mm INTEGER,
        material_requirement TEXT,
        notes TEXT,
        standard VARCHAR(20) DEFAULT 'API 650'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tank_roof_column_specs (
        id SERIAL PRIMARY KEY,
        column_type VARCHAR(30) NOT NULL,
        material_type VARCHAR(50),
        min_wall_mm DECIMAL(5,2),
        sealing_required BOOLEAN DEFAULT true,
        drainage_required BOOLEAN DEFAULT true,
        notes TEXT,
        standard VARCHAR(20) DEFAULT 'API 650'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tank_weld_requirements (
        id SERIAL PRIMARY KEY,
        weld_location VARCHAR(50) NOT NULL,
        weld_type VARCHAR(30) NOT NULL,
        min_throat_basis VARCHAR(50),
        full_penetration_required BOOLEAN DEFAULT false,
        pwht_threshold_mm DECIMAL(5,1),
        notes TEXT,
        standard VARCHAR(20) DEFAULT 'API 650',
        UNIQUE(weld_location, weld_type)
      )
    `);

    const nozzleTypes = [
      [
        'SHELL',
        'Shell Nozzle',
        'Nozzle penetrating tank shell',
        '{SO,WN,LWN,RING,LAP}',
        'Product inlet/outlet, drain, instrumentation',
      ],
      [
        'ROOF',
        'Roof Nozzle',
        'Nozzle penetrating tank roof',
        '{SO,WN,LAP}',
        'Venting, gauging, fill connections',
      ],
      [
        'BOTTOM',
        'Bottom Nozzle',
        'Nozzle penetrating tank bottom',
        '{SO,WN,LAP}',
        'Drain, outlet connections',
      ],
      [
        'MANHOLE_SHELL',
        'Shell Manhole',
        'Access opening in tank shell',
        '{FLANGED}',
        'Personnel and equipment access',
      ],
      [
        'MANHOLE_ROOF',
        'Roof Manhole',
        'Access opening in tank roof',
        '{FLANGED}',
        'Personnel access, inspection',
      ],
    ];

    for (const [code, name, desc, flangeTypes, app] of nozzleTypes) {
      await queryRunner.query(
        `
        INSERT INTO tank_nozzle_types (code, name, description, flange_types, typical_application)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (code) DO UPDATE SET
          name = $2, description = $3, flange_types = $4, typical_application = $5
      `,
        [code, name, desc, flangeTypes, app],
      );
    }

    const flangeTypes = [
      [
        'SLIP_ON',
        'Slip-on Flange',
        'SO',
        'tn or Tf (lesser)',
        'Fillet weld both sides',
        null,
      ],
      [
        'WELD_NECK',
        'Welding-neck Flange',
        'WN',
        'tn',
        'Full penetration groove weld',
        19.0,
      ],
      [
        'LONG_WELD_NECK',
        'Long Welding-neck Flange',
        'LWN',
        'tn or ts (lesser)',
        'Extended nozzle design',
        19.0,
      ],
      [
        'RING_TYPE',
        'Ring-type Flange',
        'RING',
        'tn or Tf (lesser)',
        'Fillet weld both sides',
        null,
      ],
      [
        'LAP_JOINT',
        'Lap Joint Flange',
        'LAP',
        'tn or Tf (lesser)',
        'Easy alignment applications',
        null,
      ],
      ['BLIND', 'Blind Flange', 'BL', 'N/A', 'Closure flange', null],
    ];

    for (const [
      code,
      name,
      abbr,
      weldBasis,
      weldNotes,
      pwhtThreshold,
    ] of flangeTypes) {
      await queryRunner.query(
        `
        INSERT INTO tank_flange_types (code, name, abbreviation, weld_size_basis, weld_size_notes, pwht_threshold_mm)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (code) DO UPDATE SET
          name = $2, abbreviation = $3, weld_size_basis = $4, weld_size_notes = $5, pwht_threshold_mm = $6
      `,
        [code, name, abbr, weldBasis, weldNotes, pwhtThreshold],
      );
    }

    const tolerances = [
      [
        'projection',
        'shell',
        null,
        null,
        6.0,
        'mm',
        'Projection from outside of shell',
      ],
      [
        'flange_tilt',
        'shell',
        0,
        12,
        1.0,
        'degree',
        'Nozzles NPS 12 and smaller',
      ],
      [
        'flange_tilt',
        'shell',
        12.01,
        null,
        0.5,
        'degree',
        'Nozzles larger than NPS 12',
      ],
      [
        'flange_face_alignment',
        'shell',
        null,
        null,
        3.0,
        'mm',
        'At outside flange diameter',
      ],
      [
        'bolt_hole_orientation',
        'shell',
        null,
        null,
        3.0,
        'mm',
        'Angular position tolerance',
      ],
      [
        'projection',
        'roof',
        null,
        null,
        6.0,
        'mm',
        'Projection from shell to flange face',
      ],
      [
        'flange_tilt',
        'roof',
        null,
        null,
        0.5,
        'degree',
        'All roof nozzle sizes',
      ],
      [
        'projection',
        'bottom',
        null,
        null,
        6.0,
        'mm',
        'Projection from shell to flange face',
      ],
      [
        'flange_tilt',
        'bottom',
        null,
        null,
        0.5,
        'degree',
        'All bottom nozzle sizes',
      ],
    ];

    for (const [
      tolType,
      location,
      minNps,
      maxNps,
      value,
      unit,
      notes,
    ] of tolerances) {
      await queryRunner.query(
        `
        INSERT INTO tank_nozzle_tolerances (tolerance_type, nozzle_location, min_nps, max_nps, tolerance_value, tolerance_unit, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (tolerance_type, nozzle_location, min_nps) DO UPDATE SET
          max_nps = $4, tolerance_value = $5, tolerance_unit = $6, notes = $7
      `,
        [tolType, location, minNps, maxNps, value, unit, notes],
      );
    }

    const manholeSpecs = [
      ['SHELL', 500, 20, 16, 19, 10, 610, 20, 'M20'],
      ['SHELL', 600, 24, 19, 22, 10, 730, 24, 'M20'],
      ['ROOF', 500, 20, 13, 16, 8, 610, 16, 'M16'],
      ['ROOF', 600, 24, 16, 19, 8, 730, 20, 'M20'],
    ];

    for (const [
      type,
      sizeMm,
      sizeIn,
      coverMm,
      flangeMm,
      neckMm,
      boltCircle,
      numBolts,
      boltSize,
    ] of manholeSpecs) {
      await queryRunner.query(
        `
        INSERT INTO tank_manhole_specs (manhole_type, nominal_size_mm, nominal_size_inch, min_cover_plate_mm, min_bolting_flange_mm, min_neck_thickness_mm, bolt_circle_mm, num_bolts, bolt_size)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (manhole_type, nominal_size_mm) DO UPDATE SET
          nominal_size_inch = $3, min_cover_plate_mm = $4, min_bolting_flange_mm = $5, min_neck_thickness_mm = $6, bolt_circle_mm = $7, num_bolts = $8, bolt_size = $9
      `,
        [
          type,
          sizeMm,
          sizeIn,
          coverMm,
          flangeMm,
          neckMm,
          boltCircle,
          numBolts,
          boltSize,
        ],
      );
    }

    const nozzleDimensions = [
      ['1', 1.0, '40', 3.38, 6, 33.4, 89, 60, 4, 'M12'],
      ['1-1/2', 1.5, '40', 3.68, 6, 48.3, 115, 83, 4, 'M12'],
      ['2', 2.0, '40', 3.91, 6, 60.3, 150, 102, 4, 'M16'],
      ['3', 3.0, '40', 5.49, 6, 88.9, 190, 127, 4, 'M16'],
      ['4', 4.0, '40', 6.02, 8, 114.3, 229, 157, 8, 'M16'],
      ['6', 6.0, '40', 7.11, 8, 168.3, 279, 216, 8, 'M20'],
      ['8', 8.0, '40', 8.18, 10, 219.1, 343, 270, 8, 'M20'],
      ['10', 10.0, '40', 9.27, 10, 273.0, 406, 324, 12, 'M20'],
      ['12', 12.0, '40', 10.31, 10, 323.8, 483, 381, 12, 'M20'],
      ['14', 14.0, 'STD', 9.53, 12, 355.6, 533, 413, 12, 'M24'],
      ['16', 16.0, 'STD', 9.53, 12, 406.4, 597, 470, 16, 'M24'],
      ['18', 18.0, 'STD', 9.53, 12, 457.2, 635, 533, 16, 'M24'],
      ['20', 20.0, 'STD', 9.53, 12, 508.0, 698, 584, 20, 'M24'],
      ['24', 24.0, 'STD', 9.53, 14, 609.6, 813, 692, 20, 'M27'],
    ];

    for (const [
      nps,
      npsDecimal,
      schedule,
      wallMm,
      padMm,
      pipeOd,
      flangeOd,
      boltCircle,
      numBolts,
      boltSize,
    ] of nozzleDimensions) {
      await queryRunner.query(
        `
        INSERT INTO tank_nozzle_dimensions (nps, nps_decimal, min_pipe_schedule, min_pipe_wall_mm, min_reinforcing_pad_mm, pipe_od_mm, flange_od_mm, bolt_circle_mm, num_bolts, bolt_size)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (nps, standard) DO UPDATE SET
          nps_decimal = $2, min_pipe_schedule = $3, min_pipe_wall_mm = $4, min_reinforcing_pad_mm = $5, pipe_od_mm = $6, flange_od_mm = $7, bolt_circle_mm = $8, num_bolts = $9, bolt_size = $10
      `,
        [
          nps,
          npsDecimal,
          schedule,
          wallMm,
          padMm,
          pipeOd,
          flangeOd,
          boltCircle,
          numBolts,
          boltSize,
        ],
      );
    }

    const materialGroups = [
      [
        'I',
        'Group I',
        'Carbon steel, normalized',
        -29,
        340,
        true,
        false,
        '{ASTM A36,ASTM A283}',
      ],
      [
        'II',
        'Group II',
        'Carbon steel, as-rolled',
        -18,
        340,
        true,
        false,
        '{ASTM A285,ASTM A516}',
      ],
      [
        'IIA',
        'Group IIA',
        'Carbon steel, as-rolled (enhanced)',
        -29,
        340,
        true,
        false,
        '{ASTM A516}',
      ],
      [
        'III',
        'Group III',
        'Carbon-manganese steel',
        -46,
        340,
        true,
        false,
        '{ASTM A537}',
      ],
      [
        'IIIA',
        'Group IIIA',
        'Carbon-manganese steel, QT',
        -46,
        400,
        true,
        false,
        '{ASTM A537 Cl 2}',
      ],
      [
        'IV',
        'Group IV',
        'Nickel alloy steel',
        -101,
        340,
        true,
        true,
        '{ASTM A203}',
      ],
      [
        'IVA',
        'Group IVA',
        'Nickel alloy steel, QT',
        -101,
        340,
        true,
        true,
        '{ASTM A203}',
      ],
      ['V', 'Group V', '9% Nickel steel', -196, 340, true, true, '{ASTM A353}'],
      [
        'VI',
        'Group VI',
        'High-strength low-alloy',
        -46,
        340,
        true,
        false,
        '{ASTM A841}',
      ],
    ];

    for (const [
      code,
      name,
      desc,
      minTemp,
      maxTemp,
      impactReq,
      seamlessReq,
      specs,
    ] of materialGroups) {
      await queryRunner.query(
        `
        INSERT INTO tank_material_groups (group_code, group_name, description, min_design_temp_c, max_design_temp_c, requires_impact_test, seamless_required, typical_specs)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (group_code) DO UPDATE SET
          group_name = $2, description = $3, min_design_temp_c = $4, max_design_temp_c = $5, requires_impact_test = $6, seamless_required = $7, typical_specs = $8
      `,
        [code, name, desc, minTemp, maxTemp, impactReq, seamlessReq, specs],
      );
    }

    const pipeSpecs = [
      [
        'A53',
        'B',
        'Pipe, Steel, Black and Hot-Dipped',
        'General nozzle service',
        -29,
        400,
        'II',
      ],
      [
        'A106',
        'B',
        'Seamless Carbon Steel Pipe for High-Temperature',
        'High temperature service',
        -29,
        400,
        'II',
      ],
      [
        'A333',
        '6',
        'Seamless and Welded Steel Pipe for Low-Temperature',
        'Low temperature service',
        -46,
        340,
        'III',
      ],
      [
        'A524',
        'I',
        'Seamless Carbon Steel Pipe for Atmospheric',
        'Atmospheric service',
        -29,
        340,
        'II',
      ],
      [
        'A524',
        'II',
        'Seamless Carbon Steel Pipe for Atmospheric',
        'Atmospheric service',
        -29,
        340,
        'II',
      ],
      [
        'A671',
        'CC60',
        'Electric-Fusion-Welded Steel Pipe',
        'Large diameter service',
        -29,
        340,
        'II',
      ],
      [
        'A358',
        '304',
        'EFW Austenitic Stainless Steel Pipe',
        'Corrosive service',
        -196,
        540,
        null,
      ],
      [
        'A358',
        '316',
        'EFW Austenitic Stainless Steel Pipe',
        'Corrosive service',
        -196,
        540,
        null,
      ],
    ];

    for (const [
      spec,
      grade,
      desc,
      app,
      minTemp,
      maxTemp,
      matGroup,
    ] of pipeSpecs) {
      await queryRunner.query(
        `
        INSERT INTO tank_pipe_specs (astm_spec, grade, description, application, min_temp_c, max_temp_c, material_group)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (astm_spec, grade) DO UPDATE SET
          description = $3, application = $4, min_temp_c = $5, max_temp_c = $6, material_group = $7
      `,
        [spec, grade, desc, app, minTemp, maxTemp, matGroup],
      );
    }

    const drainReqs = [
      [
        'SWING_DRAIN',
        '80',
        600,
        'Steel pivot-jointed pipe',
        'Designed for thermal movement',
      ],
      [
        'FLOOR_DRAIN',
        null,
        600,
        'Threaded pipe coupling',
        'Min spacing from shell',
      ],
      [
        'ROOF_DRAIN',
        '40',
        null,
        'Standard weight pipe',
        'Internal floating roof tanks',
      ],
    ];

    for (const [type, schedule, spacing, material, notes] of drainReqs) {
      await queryRunner.query(
        `
        INSERT INTO tank_drain_requirements (drain_type, min_pipe_schedule, min_spacing_from_shell_mm, material_requirement, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (drain_type) DO UPDATE SET
          min_pipe_schedule = $2, min_spacing_from_shell_mm = $3, material_requirement = $4, notes = $5
      `,
        [type, schedule, spacing, material, notes],
      );
    }

    const roofColumns = [
      [
        'PIPE',
        'Carbon steel pipe',
        6.0,
        true,
        true,
        'Preferred for internal floating roof tanks',
      ],
      [
        'STRUCTURAL',
        'Wide flange or channel',
        null,
        false,
        false,
        'Back-to-back channels or wide flange',
      ],
    ];

    for (const [
      type,
      material,
      minWall,
      sealing,
      drainage,
      notes,
    ] of roofColumns) {
      await queryRunner.query(
        `
        INSERT INTO tank_roof_column_specs (column_type, material_type, min_wall_mm, sealing_required, drainage_required, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [type, material, minWall, sealing, drainage, notes],
      );
    }

    const weldReqs = [
      [
        'nozzle_to_shell_outside',
        'fillet',
        '0.7 × tn minimum',
        false,
        null,
        'Primary structural weld',
      ],
      [
        'nozzle_to_shell_inside',
        'seal',
        'seal weld',
        false,
        null,
        'If accessible',
      ],
      [
        'slip_on_flange_inside',
        'fillet',
        'tn or Tf (lesser)',
        false,
        null,
        'Inside flange weld',
      ],
      [
        'slip_on_flange_outside',
        'fillet',
        'tn or Tf (lesser)',
        false,
        null,
        'Outside flange weld',
      ],
      [
        'weld_neck_to_nozzle',
        'groove',
        'full penetration',
        true,
        19.0,
        'PWHT if >19mm',
      ],
      [
        'reinforcing_pad_to_shell',
        'fillet',
        'pad thickness',
        false,
        null,
        'Continuous fillet weld',
      ],
    ];

    for (const [
      location,
      weldType,
      throatBasis,
      fullPen,
      pwht,
      notes,
    ] of weldReqs) {
      await queryRunner.query(
        `
        INSERT INTO tank_weld_requirements (weld_location, weld_type, min_throat_basis, full_penetration_required, pwht_threshold_mm, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (weld_location, weld_type) DO UPDATE SET
          min_throat_basis = $3, full_penetration_required = $4, pwht_threshold_mm = $5, notes = $6
      `,
        [location, weldType, throatBasis, fullPen, pwht, notes],
      );
    }

    console.warn('API 650 tank construction data added successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tank_weld_requirements`);
    await queryRunner.query(`DROP TABLE IF EXISTS tank_roof_column_specs`);
    await queryRunner.query(`DROP TABLE IF EXISTS tank_drain_requirements`);
    await queryRunner.query(`DROP TABLE IF EXISTS tank_pipe_specs`);
    await queryRunner.query(`DROP TABLE IF EXISTS tank_material_groups`);
    await queryRunner.query(`DROP TABLE IF EXISTS tank_nozzle_dimensions`);
    await queryRunner.query(`DROP TABLE IF EXISTS tank_manhole_specs`);
    await queryRunner.query(`DROP TABLE IF EXISTS tank_nozzle_tolerances`);
    await queryRunner.query(`DROP TABLE IF EXISTS tank_flange_types`);
    await queryRunner.query(`DROP TABLE IF EXISTS tank_nozzle_types`);
  }
}
