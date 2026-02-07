import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRemainingPhase2Items1777600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0. ADD MISSING P-T DATA FOR SABS 1123 CLASS 600/3 (6 BAR)
    // This class was missing P-T data which caused validation issues
    const sabs1123Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'SABS 1123'`,
    );
    if (sabs1123Result.length > 0) {
      const standardId = sabs1123Result[0].id;

      // Find the 600 class (designation like '600' or '600/3')
      const class600Result = await queryRunner.query(
        `
        SELECT id FROM flange_pressure_classes
        WHERE "standardId" = $1 AND (designation = '600' OR designation LIKE '600/%')
      `,
        [standardId],
      );

      if (class600Result.length > 0) {
        const classId = class600Result[0].id;

        // P-T data for 6 bar class (600 kPa = 6 bar)
        const ptData: [number, number][] = [
          [-10, 6.0],
          [20, 6.0],
          [50, 6.0],
          [100, 6.0],
          [150, 5.6],
          [200, 5.1],
        ];

        for (const [temp, pressure] of ptData) {
          await queryRunner.query(
            `
            INSERT INTO flange_pt_ratings (pressure_class_id, material_group, temperature_celsius, max_pressure_bar)
            VALUES ($1, 'Carbon Steel', $2, $3)
            ON CONFLICT (pressure_class_id, material_group, temperature_celsius)
            DO UPDATE SET max_pressure_bar = $3
          `,
            [classId, temp, pressure],
          );
        }
        console.warn("Added P-T ratings for SABS 1123 class 600/3 (6 bar)");
      }
    }

    // 1. INSULATION MODULE
    // Create insulation_types table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS insulation_types (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        material_type VARCHAR(50) NOT NULL,
        thermal_conductivity_w_mk DECIMAL(8,4),
        density_kg_m3 DECIMAL(8,2),
        min_temp_c DECIMAL(8,2),
        max_temp_c DECIMAL(8,2),
        compressive_strength_kpa DECIMAL(10,2),
        moisture_absorption_percent DECIMAL(5,2),
        fire_rating VARCHAR(50),
        applicable_standards TEXT,
        typical_applications TEXT,
        cost_per_m3_usd DECIMAL(10,2),
        cost_per_m3_zar DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed insulation types
    const insulationTypes = [
      // Mineral Wool
      [
        "MW-RW",
        "Rockwool (Mineral Wool)",
        "Stone wool insulation from volcanic rock",
        "MINERAL_WOOL",
        0.035,
        100,
        -200,
        750,
        30,
        1.0,
        "A1 (Non-combustible)",
        "ASTM C547, ASTM C592, EN 14303",
        "Pipes, equipment, high-temp applications",
        45,
        850,
      ],
      [
        "MW-GW",
        "Glasswool",
        "Glass fiber insulation",
        "MINERAL_WOOL",
        0.04,
        48,
        -50,
        450,
        10,
        1.5,
        "A1 (Non-combustible)",
        "ASTM C547, EN 14303",
        "HVAC ducts, low-temp pipes",
        35,
        660,
      ],
      [
        "MW-SL",
        "Slag Wool",
        "Mineral wool from blast furnace slag",
        "MINERAL_WOOL",
        0.038,
        80,
        -50,
        700,
        25,
        1.2,
        "A1 (Non-combustible)",
        "ASTM C547",
        "Industrial pipes, boilers",
        40,
        755,
      ],

      // Calcium Silicate
      [
        "CS-STD",
        "Calcium Silicate Standard",
        "Calcium silicate block/pipe insulation",
        "CALCIUM_SILICATE",
        0.055,
        240,
        -18,
        650,
        700,
        15,
        "A1 (Non-combustible)",
        "ASTM C533, ASTM C610",
        "High-temp pipes, equipment",
        120,
        2265,
      ],
      [
        "CS-HP",
        "Calcium Silicate High-Temp",
        "High-performance calcium silicate",
        "CALCIUM_SILICATE",
        0.065,
        280,
        0,
        1000,
        900,
        12,
        "A1 (Non-combustible)",
        "ASTM C533 Type II",
        "Very high-temp applications",
        180,
        3400,
      ],

      // Cellular Glass
      [
        "CG-STD",
        "Cellular Glass (Foamglas)",
        "Closed-cell glass foam insulation",
        "CELLULAR_GLASS",
        0.04,
        115,
        -268,
        430,
        700,
        0,
        "A1 (Non-combustible)",
        "ASTM C552, EN 14305",
        "Cryogenic, underground, corrosive environments",
        200,
        3775,
      ],
      [
        "CG-HCS",
        "Cellular Glass High Compressive",
        "High-strength cellular glass",
        "CELLULAR_GLASS",
        0.045,
        165,
        -268,
        430,
        1600,
        0,
        "A1 (Non-combustible)",
        "ASTM C552 Type II",
        "Heavy load-bearing, tank bases",
        280,
        5285,
      ],

      // Polyurethane/Polyisocyanurate
      [
        "PU-RIGID",
        "Rigid Polyurethane Foam",
        "Closed-cell polyurethane foam",
        "POLYURETHANE",
        0.023,
        35,
        -200,
        120,
        150,
        2,
        "B2 (Normal flammability)",
        "ASTM C591, EN 14308",
        "Cold pipes, refrigeration",
        85,
        1605,
      ],
      [
        "PIR",
        "Polyisocyanurate (PIR)",
        "Modified polyurethane with better fire resistance",
        "POLYISOCYANURATE",
        0.022,
        40,
        -180,
        150,
        200,
        1.5,
        "B1 (Flame retardant)",
        "ASTM C591, EN 14308",
        "Cold storage, HVAC",
        95,
        1795,
      ],

      // Phenolic Foam
      [
        "PF-STD",
        "Phenolic Foam",
        "Low-smoke phenolic insulation",
        "PHENOLIC",
        0.021,
        45,
        -180,
        120,
        100,
        3,
        "B1 (Low smoke)",
        "ASTM C1126, EN 14314",
        "HVAC, offshore platforms",
        110,
        2075,
      ],

      // Elastomeric Foam
      [
        "EF-STD",
        "Elastomeric Foam (Armaflex)",
        "Flexible closed-cell rubber foam",
        "ELASTOMERIC",
        0.036,
        60,
        -50,
        105,
        70,
        3,
        "B1 (Self-extinguishing)",
        "ASTM C534, EN 14304",
        "HVAC, refrigeration, condensation control",
        75,
        1415,
      ],
      [
        "EF-HT",
        "Elastomeric Foam High-Temp",
        "High-temp elastomeric foam",
        "ELASTOMERIC",
        0.04,
        65,
        -40,
        150,
        80,
        2.5,
        "B1 (Self-extinguishing)",
        "ASTM C534",
        "Solar thermal, hot water",
        95,
        1795,
      ],

      // Aerogel
      [
        "AG-BKT",
        "Aerogel Blanket",
        "Silica aerogel insulation blanket",
        "AEROGEL",
        0.015,
        150,
        -200,
        650,
        30,
        0.5,
        "A1 (Non-combustible)",
        "ASTM C1728",
        "Space-constrained, high performance",
        850,
        16040,
      ],

      // Perlite
      [
        "PL-EXP",
        "Expanded Perlite",
        "Lightweight volcanic glass insulation",
        "PERLITE",
        0.05,
        100,
        -268,
        980,
        200,
        2,
        "A1 (Non-combustible)",
        "ASTM C549, ASTM C610",
        "Cryogenic, tanks, fill insulation",
        55,
        1040,
      ],

      // Vermiculite
      [
        "VM-EXP",
        "Expanded Vermiculite",
        "Exfoliated mica insulation",
        "VERMICULITE",
        0.065,
        120,
        0,
        1100,
        100,
        10,
        "A1 (Non-combustible)",
        "ASTM C516",
        "Fire protection, fill insulation",
        50,
        945,
      ],

      // Ceramic Fiber
      [
        "CF-BKT",
        "Ceramic Fiber Blanket",
        "Alumina-silica fiber blanket",
        "CERAMIC_FIBER",
        0.07,
        96,
        0,
        1260,
        20,
        0,
        "A1 (Non-combustible)",
        "ASTM C892, EN 1094",
        "Very high-temp furnaces, kilns",
        200,
        3775,
      ],
      [
        "CF-MOD",
        "Ceramic Fiber Module",
        "Folded ceramic fiber block",
        "CERAMIC_FIBER",
        0.08,
        160,
        0,
        1400,
        40,
        0,
        "A1 (Non-combustible)",
        "ASTM C892",
        "Furnace linings, thermal barriers",
        350,
        6605,
      ],
    ];

    for (const ins of insulationTypes) {
      await queryRunner.query(
        `
        INSERT INTO insulation_types (code, name, description, material_type, thermal_conductivity_w_mk, density_kg_m3, min_temp_c, max_temp_c, compressive_strength_kpa, moisture_absorption_percent, fire_rating, applicable_standards, typical_applications, cost_per_m3_usd, cost_per_m3_zar)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (code) DO NOTHING
      `,
        ins,
      );
    }

    // 2. INSULATION SPECIFICATIONS - Link to pipe sizes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS insulation_specifications (
        id SERIAL PRIMARY KEY,
        insulation_type_id INTEGER REFERENCES insulation_types(id),
        pipe_nb_mm INTEGER NOT NULL,
        pipe_od_mm DECIMAL(8,2) NOT NULL,
        insulation_thickness_mm DECIMAL(8,2) NOT NULL,
        insulated_od_mm DECIMAL(8,2),
        standard VARCHAR(50),
        temp_range_min_c DECIMAL(8,2),
        temp_range_max_c DECIMAL(8,2),
        application_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_insulation_specs_type_nb ON insulation_specifications(insulation_type_id, pipe_nb_mm)
    `);

    // Seed standard insulation thicknesses per ASTM C585/C547
    // Common pipe sizes with standard insulation thicknesses
    const pipeInsulationData = [
      // NB, OD, [25mm, 38mm, 50mm, 65mm, 75mm, 100mm] thicknesses
      [15, 21.3],
      [20, 26.9],
      [25, 33.7],
      [32, 42.4],
      [40, 48.3],
      [50, 60.3],
      [65, 76.1],
      [80, 88.9],
      [100, 114.3],
      [125, 139.7],
      [150, 168.3],
      [200, 219.1],
      [250, 273.0],
      [300, 323.9],
      [350, 355.6],
      [400, 406.4],
      [450, 457.2],
      [500, 508.0],
      [600, 610.0],
    ];

    const standardThicknesses = [25, 38, 50, 65, 75, 100];

    // Get rockwool insulation type ID
    const rockwoolResult = await queryRunner.query(
      `SELECT id FROM insulation_types WHERE code = 'MW-RW'`,
    );
    if (rockwoolResult.length > 0) {
      const rockwoolId = rockwoolResult[0].id;
      for (const [nb, od] of pipeInsulationData) {
        for (const thickness of standardThicknesses) {
          const insulatedOd = Number(od) + thickness * 2;
          await queryRunner.query(
            `
            INSERT INTO insulation_specifications (insulation_type_id, pipe_nb_mm, pipe_od_mm, insulation_thickness_mm, insulated_od_mm, standard, temp_range_min_c, temp_range_max_c)
            VALUES ($1, $2, $3, $4, $5, 'ASTM C547', -200, 750)
            ON CONFLICT DO NOTHING
          `,
            [rockwoolId, nb, od, thickness, insulatedOd],
          );
        }
      }
    }

    // 3. STRAINER/FILTER MODULE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS strainer_types (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        body_style VARCHAR(50),
        is_self_cleaning BOOLEAN DEFAULT FALSE,
        is_duplex BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed strainer types
    const strainerTypes = [
      [
        "Y-STR",
        "Y-Strainer",
        "Y-pattern inline strainer for horizontal/vertical installation",
        "Y_PATTERN",
        false,
        false,
      ],
      ["T-STR", "T-Strainer", "T-pattern basket strainer", "T_PATTERN", false, false],
      [
        "BSK-STR",
        "Basket Strainer",
        "Removable basket strainer for large debris",
        "BASKET",
        false,
        false,
      ],
      [
        "BSK-DUP",
        "Duplex Basket Strainer",
        "Dual basket strainer for continuous operation",
        "BASKET",
        false,
        true,
      ],
      [
        "CON-STR",
        "Conical Strainer",
        "Temporary conical strainer for commissioning",
        "CONICAL",
        false,
        false,
      ],
      [
        "AUTO-SC",
        "Automatic Self-Cleaning Strainer",
        "Backwash self-cleaning strainer",
        "AUTOMATIC",
        true,
        false,
      ],
      [
        "TEMP-STR",
        "Temporary Start-up Strainer",
        "Removable flat plate strainer",
        "FLAT_PLATE",
        false,
        false,
      ],
    ];

    for (const st of strainerTypes) {
      await queryRunner.query(
        `
        INSERT INTO strainer_types (code, name, description, body_style, is_self_cleaning, is_duplex)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (code) DO NOTHING
      `,
        st,
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS strainers (
        id SERIAL PRIMARY KEY,
        strainer_type_id INTEGER REFERENCES strainer_types(id),
        size_nps VARCHAR(20) NOT NULL,
        size_dn INTEGER,
        pressure_class VARCHAR(20) NOT NULL,
        body_material VARCHAR(50),
        screen_material VARCHAR(50),
        mesh_size INTEGER,
        perforation_size_mm DECIMAL(6,2),
        open_area_percent DECIMAL(5,2),
        cv_value DECIMAL(10,2),
        face_to_face_mm DECIMAL(8,2),
        weight_kg DECIMAL(8,2),
        end_connection VARCHAR(50),
        max_pressure_bar DECIMAL(8,2),
        max_temp_c DECIMAL(8,2),
        cost_usd DECIMAL(10,2),
        cost_zar DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed Y-strainer data
    const yStrainerResult = await queryRunner.query(
      `SELECT id FROM strainer_types WHERE code = 'Y-STR'`,
    );
    if (yStrainerResult.length > 0) {
      const yStrainerId = yStrainerResult[0].id;
      const yStrainerData = [
        // size_nps, size_dn, pressure_class, body_material, screen_material, mesh, perf_mm, open_area, cv, ftf_mm, weight_kg, end_conn, max_bar, max_temp, cost_usd, cost_zar
        ["1/2", 15, "CL150", "WCB", "304SS", 40, 0.42, 40, 8, 95, 1.5, "FNPT", 20, 232, 45, 850],
        ["3/4", 20, "CL150", "WCB", "304SS", 40, 0.42, 40, 15, 105, 2.0, "FNPT", 20, 232, 55, 1040],
        ["1", 25, "CL150", "WCB", "304SS", 40, 0.42, 40, 25, 120, 2.8, "FNPT", 20, 232, 70, 1320],
        [
          "1-1/2",
          40,
          "CL150",
          "WCB",
          "304SS",
          40,
          0.42,
          40,
          55,
          150,
          5.5,
          "FNPT",
          20,
          232,
          120,
          2265,
        ],
        ["2", 50, "CL150", "WCB", "304SS", 40, 0.42, 40, 100, 180, 8.5, "FNPT", 20, 232, 180, 3400],
        ["2", 50, "CL150", "WCB", "304SS", 40, 0.42, 40, 100, 216, 12, "RF", 20, 232, 250, 4720],
        ["3", 80, "CL150", "WCB", "304SS", 40, 0.42, 40, 220, 241, 18, "RF", 20, 232, 380, 7170],
        ["4", 100, "CL150", "WCB", "304SS", 40, 0.42, 40, 390, 292, 32, "RF", 20, 232, 580, 10950],
        ["6", 150, "CL150", "WCB", "304SS", 40, 0.42, 40, 880, 356, 68, "RF", 20, 232, 1100, 20765],
        [
          "8",
          200,
          "CL150",
          "WCB",
          "304SS",
          40,
          0.42,
          40,
          1560,
          495,
          120,
          "RF",
          20,
          232,
          1850,
          34920,
        ],
        [
          "10",
          250,
          "CL150",
          "WCB",
          "304SS",
          40,
          0.42,
          40,
          2440,
          559,
          190,
          "RF",
          20,
          232,
          2800,
          52850,
        ],
        [
          "12",
          300,
          "CL150",
          "WCB",
          "304SS",
          40,
          0.42,
          40,
          3520,
          610,
          280,
          "RF",
          20,
          232,
          4200,
          79275,
        ],
      ];

      for (const str of yStrainerData) {
        await queryRunner.query(
          `
          INSERT INTO strainers (strainer_type_id, size_nps, size_dn, pressure_class, body_material, screen_material, mesh_size, perforation_size_mm, open_area_percent, cv_value, face_to_face_mm, weight_kg, end_connection, max_pressure_bar, max_temp_c, cost_usd, cost_zar)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `,
          [yStrainerId, ...str],
        );
      }
    }

    // 4. INSTRUMENTATION VALVES MODULE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS instrumentation_valve_types (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        valve_function VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const instValveTypes = [
      ["NV-STD", "Needle Valve Standard", "Standard needle valve for flow control", "ISOLATION"],
      ["NV-ANGLE", "Needle Valve Angle", "Angle pattern needle valve", "ISOLATION"],
      ["NV-MULTI", "Multiport Needle Valve", "Multiple port manifold valve", "MANIFOLD"],
      ["BV-INST", "Instrument Ball Valve", "Mini ball valve for instruments", "ISOLATION"],
      ["BV-DBB", "Double Block & Bleed", "Double isolation with bleed", "DBB"],
      ["MV-2WAY", "Manifold Valve 2-Way", "2-way instrument manifold", "MANIFOLD"],
      ["MV-3WAY", "Manifold Valve 3-Way", "3-way instrument manifold", "MANIFOLD"],
      ["MV-5WAY", "Manifold Valve 5-Way", "5-way instrument manifold", "MANIFOLD"],
      ["GC-STD", "Gauge Cock", "Standard gauge isolation valve", "GAUGE"],
      ["GC-BLEED", "Gauge Cock with Bleed", "Gauge cock with vent/bleed port", "GAUGE"],
      ["TW-STD", "Thermowell", "Standard thermowell for temperature sensors", "THERMOWELL"],
      ["TW-SOCK", "Socketed Thermowell", "Socket weld thermowell", "THERMOWELL"],
      ["TW-THRD", "Threaded Thermowell", "Threaded thermowell", "THERMOWELL"],
      ["TW-FLNG", "Flanged Thermowell", "Flanged thermowell for large connections", "THERMOWELL"],
    ];

    for (const ivt of instValveTypes) {
      await queryRunner.query(
        `
        INSERT INTO instrumentation_valve_types (code, name, description, valve_function)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (code) DO NOTHING
      `,
        ivt,
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS instrumentation_valves (
        id SERIAL PRIMARY KEY,
        valve_type_id INTEGER REFERENCES instrumentation_valve_types(id),
        size_inches VARCHAR(20) NOT NULL,
        inlet_connection VARCHAR(50),
        outlet_connection VARCHAR(50),
        body_material VARCHAR(50),
        stem_material VARCHAR(50),
        packing_material VARCHAR(50),
        max_pressure_psi DECIMAL(10,2),
        max_temp_c DECIMAL(8,2),
        cv_value DECIMAL(8,4),
        orifice_mm DECIMAL(6,2),
        weight_kg DECIMAL(6,2),
        cost_usd DECIMAL(10,2),
        cost_zar DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed needle valve data
    const needleResult = await queryRunner.query(
      `SELECT id FROM instrumentation_valve_types WHERE code = 'NV-STD'`,
    );
    if (needleResult.length > 0) {
      const needleId = needleResult[0].id;
      const needleValveData = [
        // size, inlet, outlet, body, stem, packing, max_psi, max_temp, cv, orifice, weight, cost_usd, cost_zar
        [
          "1/4",
          "1/4 FNPT",
          "1/4 FNPT",
          "316SS",
          "316SS",
          "PTFE",
          6000,
          232,
          0.5,
          3.2,
          0.3,
          85,
          1605,
        ],
        [
          "1/4",
          "1/4 MNPT",
          "1/4 FNPT",
          "316SS",
          "316SS",
          "PTFE",
          6000,
          232,
          0.5,
          3.2,
          0.3,
          85,
          1605,
        ],
        [
          "3/8",
          "3/8 FNPT",
          "3/8 FNPT",
          "316SS",
          "316SS",
          "PTFE",
          6000,
          232,
          1.0,
          4.8,
          0.4,
          95,
          1795,
        ],
        [
          "1/2",
          "1/2 FNPT",
          "1/2 FNPT",
          "316SS",
          "316SS",
          "PTFE",
          6000,
          232,
          1.8,
          6.4,
          0.5,
          110,
          2075,
        ],
        [
          "1/4",
          "1/4 FNPT",
          "1/4 FNPT",
          "A105",
          "410SS",
          "PTFE",
          10000,
          343,
          0.5,
          3.2,
          0.35,
          65,
          1230,
        ],
        [
          "1/2",
          "1/2 FNPT",
          "1/2 FNPT",
          "A105",
          "410SS",
          "PTFE",
          10000,
          343,
          1.8,
          6.4,
          0.55,
          90,
          1700,
        ],
      ];

      for (const nv of needleValveData) {
        await queryRunner.query(
          `
          INSERT INTO instrumentation_valves (valve_type_id, size_inches, inlet_connection, outlet_connection, body_material, stem_material, packing_material, max_pressure_psi, max_temp_c, cv_value, orifice_mm, weight_kg, cost_usd, cost_zar)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `,
          [needleId, ...nv],
        );
      }
    }

    // 5. STAINLESS FINISHES TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stainless_finishes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        finish_type VARCHAR(50),
        ra_roughness_um DECIMAL(8,3),
        ra_roughness_min_um DECIMAL(8,3),
        ra_roughness_max_um DECIMAL(8,3),
        process_description TEXT,
        typical_applications TEXT,
        cost_multiplier DECIMAL(5,2) DEFAULT 1.00,
        astm_standard VARCHAR(50),
        en_standard VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const stainlessFinishes = [
      // code, name, description, type, ra_um, ra_min, ra_max, process, applications, multiplier, astm, en
      [
        "1",
        "No. 1 (Hot Rolled)",
        "Hot rolled, annealed and pickled",
        "MILL",
        6.3,
        3.2,
        12.5,
        "Hot rolling followed by annealing and acid pickling",
        "Industrial equipment, tanks, structural",
        1.0,
        "ASTM A480",
        "EN 10088-2 1D",
      ],
      [
        "2D",
        "No. 2D (Cold Rolled Dull)",
        "Cold rolled, dull matte finish",
        "MILL",
        1.0,
        0.5,
        2.0,
        "Cold rolling on dull rolls, annealed and pickled",
        "Industrial equipment, architectural",
        1.05,
        "ASTM A480",
        "EN 10088-2 2D",
      ],
      [
        "2B",
        "No. 2B (Cold Rolled Bright)",
        "Cold rolled, bright finish",
        "MILL",
        0.5,
        0.1,
        1.0,
        "Cold rolling on bright rolls, annealed in controlled atmosphere",
        "General purpose, food equipment, automotive",
        1.1,
        "ASTM A480",
        "EN 10088-2 2B",
      ],
      [
        "2R",
        "No. 2R (Bright Annealed - BA)",
        "Cold rolled, bright annealed",
        "MILL",
        0.1,
        0.05,
        0.2,
        "Cold rolling followed by bright annealing in hydrogen atmosphere",
        "Decorative, reflectors, kitchenware",
        1.25,
        "ASTM A480",
        "EN 10088-2 2R",
      ],
      [
        "3",
        "No. 3 (Intermediate Polish)",
        "Ground with 100-120 grit",
        "POLISHED",
        0.8,
        0.4,
        1.2,
        "Mechanical grinding with 100-120 grit abrasive",
        "Brewing equipment, kitchen sinks",
        1.2,
        "ASTM A480",
        null,
      ],
      [
        "4",
        "No. 4 (Brushed/Satin)",
        "Ground with 150 grit",
        "POLISHED",
        0.4,
        0.2,
        0.8,
        "Mechanical polishing with 150-180 grit, unidirectional lines",
        "Architectural, appliances, elevator interiors",
        1.35,
        "ASTM A480",
        "EN 10088-2 2J",
      ],
      [
        "6",
        "No. 6 (Soft Satin)",
        "Tampico brushed",
        "POLISHED",
        0.5,
        0.25,
        1.0,
        "Tampico brush with oil and abrasive compound",
        "Architectural, trim",
        1.45,
        "ASTM A480",
        null,
      ],
      [
        "7",
        "No. 7 (High Luster)",
        "Buffed, highly reflective",
        "POLISHED",
        0.1,
        0.05,
        0.2,
        "Buffed with fine abrasive to highly reflective finish",
        "Reflectors, jewelry, ornamental",
        1.6,
        "ASTM A480",
        null,
      ],
      [
        "8",
        "No. 8 (Mirror)",
        "Mirror finish",
        "POLISHED",
        0.025,
        0.01,
        0.05,
        "Successive polishing with finer abrasives to mirror finish",
        "Mirrors, reflectors, decorative",
        2.0,
        "ASTM A480",
        "EN 10088-2 2P",
      ],
      [
        "EP",
        "Electropolished",
        "Electrochemically polished",
        "ELECTROPOLISHED",
        0.4,
        0.1,
        0.8,
        "Electrochemical removal of surface material",
        "Pharmaceutical, semiconductor, medical",
        1.8,
        "ASTM B912",
        null,
      ],
      [
        "EP-SF",
        "Electropolished Sanitary",
        "Sanitary electropolish to Ra<0.5µm",
        "ELECTROPOLISHED",
        0.3,
        0.1,
        0.5,
        "Electropolishing to sanitary standards (Ra<0.5µm)",
        "Pharmaceutical, food, biotech",
        2.2,
        "ASME BPE SF4",
        null,
      ],
      [
        "BEAD",
        "Bead Blasted",
        "Matte bead blast finish",
        "TEXTURED",
        2.5,
        1.5,
        4.0,
        "Glass bead or ceramic media blasting",
        "Architectural, signage, anti-glare",
        1.3,
        null,
        null,
      ],
      [
        "EMBOSS",
        "Embossed/Patterned",
        "Textured pattern embossed",
        "TEXTURED",
        null,
        null,
        null,
        "Roll embossing with patterned rolls",
        "Architectural, flooring, anti-slip",
        1.4,
        null,
        null,
      ],
    ];

    for (const sf of stainlessFinishes) {
      await queryRunner.query(
        `
        INSERT INTO stainless_finishes (code, name, description, finish_type, ra_roughness_um, ra_roughness_min_um, ra_roughness_max_um, process_description, typical_applications, cost_multiplier, astm_standard, en_standard)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (code) DO NOTHING
      `,
        sf,
      );
    }

    // 6. SECONDARY COATINGS (PLATING) TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS secondary_coatings (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        coating_type VARCHAR(50),
        process VARCHAR(50),
        typical_thickness_um DECIMAL(8,2),
        min_thickness_um DECIMAL(8,2),
        max_thickness_um DECIMAL(8,2),
        hardness_hv DECIMAL(8,2),
        max_service_temp_c DECIMAL(8,2),
        corrosion_resistance VARCHAR(50),
        applicable_base_metals TEXT,
        applicable_standards TEXT,
        cost_per_dm2_usd DECIMAL(8,2),
        cost_per_dm2_zar DECIMAL(8,2),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const secondaryCoatings = [
      // code, name, description, type, process, thickness, min, max, hardness, max_temp, corrosion, base_metals, standards, cost_usd, cost_zar
      [
        "HDG",
        "Hot-Dip Galvanizing",
        "Zinc coating by hot-dip immersion",
        "METALLIC",
        "HOT_DIP",
        85,
        45,
        200,
        70,
        275,
        "Excellent",
        "Carbon steel, low alloy steel",
        "ASTM A123, ISO 1461, EN ISO 1461",
        0.8,
        15.1,
      ],
      [
        "EG",
        "Electrogalvanizing",
        "Zinc coating by electrodeposition",
        "METALLIC",
        "ELECTROPLATE",
        25,
        5,
        50,
        80,
        250,
        "Good",
        "Carbon steel",
        "ASTM B633, ISO 2081",
        0.45,
        8.5,
      ],
      [
        "ZN-NI",
        "Zinc-Nickel Plating",
        "Zinc-nickel alloy electroplate",
        "METALLIC",
        "ELECTROPLATE",
        15,
        8,
        25,
        350,
        200,
        "Excellent",
        "Carbon steel, alloy steel",
        "ASTM B841",
        1.2,
        22.65,
      ],
      [
        "ZN-FE",
        "Zinc-Iron (Galvannealed)",
        "Zinc-iron alloy coating",
        "METALLIC",
        "HOT_DIP",
        50,
        35,
        70,
        200,
        350,
        "Good",
        "Carbon steel",
        "ASTM A653",
        0.65,
        12.3,
      ],
      [
        "MECH-ZN",
        "Mechanical Zinc Plating",
        "Zinc by mechanical plating",
        "METALLIC",
        "MECHANICAL",
        25,
        8,
        75,
        50,
        150,
        "Good",
        "Carbon steel, fasteners",
        "ASTM B695, MIL-DTL-16232",
        0.55,
        10.4,
      ],
      [
        "CAD",
        "Cadmium Plating",
        "Cadmium electroplate (restricted)",
        "METALLIC",
        "ELECTROPLATE",
        13,
        5,
        25,
        75,
        230,
        "Excellent",
        "Steel, brass",
        "ASTM B766, QQ-P-416 (obsolete)",
        2.5,
        47.2,
      ],
      [
        "NI-EP",
        "Nickel Electroplate",
        "Nickel electroplating",
        "METALLIC",
        "ELECTROPLATE",
        25,
        10,
        50,
        200,
        400,
        "Good",
        "Steel, brass, copper",
        "ASTM B689, ISO 4526",
        1.8,
        34.0,
      ],
      [
        "EN",
        "Electroless Nickel",
        "Autocatalytic nickel-phosphorus",
        "METALLIC",
        "ELECTROLESS",
        25,
        10,
        100,
        500,
        350,
        "Excellent",
        "Steel, aluminum, copper",
        "ASTM B733, ISO 4527",
        2.8,
        52.85,
      ],
      [
        "EN-HC",
        "Electroless Nickel High-Phos",
        "High phosphorus electroless nickel",
        "METALLIC",
        "ELECTROLESS",
        50,
        25,
        125,
        550,
        300,
        "Excellent",
        "Steel, corrosive environments",
        "ASTM B733 Type IV",
        3.5,
        66.05,
      ],
      [
        "CR-DEC",
        "Decorative Chrome",
        "Thin decorative chromium",
        "METALLIC",
        "ELECTROPLATE",
        0.5,
        0.25,
        1.5,
        900,
        400,
        "Fair",
        "Steel (over nickel)",
        "ASTM B456",
        2.2,
        41.55,
      ],
      [
        "CR-HD",
        "Hard Chrome",
        "Industrial hard chromium",
        "METALLIC",
        "ELECTROPLATE",
        50,
        25,
        500,
        1000,
        500,
        "Good",
        "Steel, hard tools",
        "ASTM B177, ISO 6158",
        4.5,
        84.95,
      ],
      [
        "PHOS-MN",
        "Manganese Phosphate",
        "Manganese phosphate conversion",
        "CONVERSION",
        "CHEMICAL",
        15,
        5,
        25,
        null,
        200,
        "Fair",
        "Steel, fasteners",
        "ASTM B733, MIL-DTL-16232",
        0.25,
        4.7,
      ],
      [
        "PHOS-ZN",
        "Zinc Phosphate",
        "Zinc phosphate conversion",
        "CONVERSION",
        "CHEMICAL",
        10,
        3,
        20,
        null,
        200,
        "Fair",
        "Steel (paint base)",
        "ASTM B633",
        0.2,
        3.8,
      ],
      [
        "PHOS-FE",
        "Iron Phosphate",
        "Iron phosphate conversion",
        "CONVERSION",
        "CHEMICAL",
        1,
        0.3,
        2,
        null,
        200,
        "Poor",
        "Steel (paint base)",
        "TT-C-490",
        0.15,
        2.85,
      ],
      [
        "ANODIZE",
        "Anodizing (Type II)",
        "Sulfuric acid anodize",
        "ANODIC",
        "ELECTROCHEMICAL",
        20,
        10,
        50,
        300,
        150,
        "Good",
        "Aluminum",
        "MIL-A-8625 Type II",
        1.5,
        28.3,
      ],
      [
        "ANOD-HC",
        "Hard Anodize (Type III)",
        "Hard coat anodize",
        "ANODIC",
        "ELECTROCHEMICAL",
        50,
        25,
        125,
        500,
        200,
        "Excellent",
        "Aluminum",
        "MIL-A-8625 Type III",
        3.0,
        56.65,
      ],
      [
        "DACRO",
        "Dacromet/Geomet",
        "Zinc flake coating (non-electrolytic)",
        "ORGANIC",
        "DIP_SPIN",
        10,
        5,
        15,
        null,
        300,
        "Excellent",
        "Steel fasteners",
        "ISO 10683, VDA 235-104",
        0.9,
        17.0,
      ],
    ];

    for (const sc of secondaryCoatings) {
      await queryRunner.query(
        `
        INSERT INTO secondary_coatings (code, name, description, coating_type, process, typical_thickness_um, min_thickness_um, max_thickness_um, hardness_hv, max_service_temp_c, corrosion_resistance, applicable_base_metals, applicable_standards, cost_per_dm2_usd, cost_per_dm2_zar)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (code) DO NOTHING
      `,
        sc,
      );
    }

    // 7. HEAT TREATMENT SPECIFICATIONS TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS heat_treatment_specifications (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        treatment_type VARCHAR(50) NOT NULL,
        applicable_material_types TEXT,
        min_temp_c DECIMAL(8,2),
        max_temp_c DECIMAL(8,2),
        typical_temp_c DECIMAL(8,2),
        min_hold_time_min INTEGER,
        max_hold_time_min INTEGER,
        heating_rate_c_per_hr DECIMAL(8,2),
        cooling_method VARCHAR(50),
        cooling_rate_c_per_hr DECIMAL(8,2),
        atmosphere VARCHAR(50),
        hardness_change VARCHAR(50),
        purpose TEXT,
        applicable_standards TEXT,
        cost_multiplier DECIMAL(5,2) DEFAULT 1.00,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const heatTreatments = [
      // code, name, desc, type, materials, min_t, max_t, typ_t, min_hold, max_hold, heat_rate, cool_method, cool_rate, atmosphere, hardness, purpose, standards, multiplier
      [
        "NORM",
        "Normalizing",
        "Heat above critical temp, air cool",
        "NORMALIZING",
        "Carbon steel, low alloy steel",
        850,
        950,
        900,
        30,
        120,
        200,
        "AIR",
        null,
        "AIR",
        "Moderate decrease",
        "Refine grain structure, relieve stress, improve machinability",
        "ASTM A941, ASME SA-941",
        1.15,
      ],
      [
        "ANN-FULL",
        "Full Annealing",
        "Heat above critical temp, slow furnace cool",
        "ANNEALING",
        "Carbon steel, low alloy steel",
        800,
        900,
        850,
        60,
        240,
        100,
        "FURNACE",
        50,
        "AIR",
        "Significant decrease",
        "Maximum softness, improve ductility, relieve stress",
        "ASTM A941",
        1.25,
      ],
      [
        "ANN-PROC",
        "Process Annealing",
        "Heat below critical temp (stress relief)",
        "ANNEALING",
        "Carbon steel",
        550,
        700,
        650,
        30,
        120,
        150,
        "AIR",
        null,
        "AIR",
        "Slight decrease",
        "Relieve work hardening, restore ductility",
        "ASTM A941",
        1.1,
      ],
      [
        "ANN-SPHERE",
        "Spheroidizing Anneal",
        "Prolonged heating for spheroidal carbides",
        "ANNEALING",
        "High carbon steel, tool steel",
        680,
        760,
        720,
        480,
        1440,
        50,
        "FURNACE",
        30,
        "AIR",
        "Significant decrease",
        "Improve machinability of high-carbon steels",
        "ASTM A941",
        1.35,
      ],
      [
        "SR",
        "Stress Relief",
        "Sub-critical heating for stress relief",
        "STRESS_RELIEF",
        "Carbon steel, low alloy steel, stainless",
        550,
        700,
        620,
        60,
        180,
        100,
        "FURNACE",
        100,
        "AIR",
        "Minimal change",
        "Relieve residual stresses from welding/machining",
        "ASME BPVC VIII, AWS D1.1",
        1.15,
      ],
      [
        "PWHT",
        "Post-Weld Heat Treatment",
        "Mandatory heat treatment after welding",
        "PWHT",
        "Carbon steel, Cr-Mo steel",
        595,
        720,
        620,
        60,
        240,
        55,
        "FURNACE",
        55,
        "AIR",
        "Minimal change",
        "Relieve weld stresses, temper weld HAZ",
        "ASME B31.3, ASME VIII",
        1.2,
      ],
      [
        "PWHT-P91",
        "PWHT for P91",
        "Specialized PWHT for Grade 91",
        "PWHT",
        "P91 (9Cr-1Mo-V)",
        730,
        770,
        760,
        120,
        240,
        55,
        "FURNACE",
        55,
        "AIR",
        "Controlled decrease",
        "Critical tempering of P91 welds",
        "ASME B31.3, EPRI guidelines",
        1.4,
      ],
      [
        "QT",
        "Quench & Temper",
        "Harden by quench, temper for toughness",
        "QUENCH_TEMPER",
        "Carbon steel, alloy steel",
        800,
        900,
        850,
        30,
        90,
        150,
        "WATER_OIL",
        null,
        "AIR",
        "Significant increase",
        "Increase strength and hardness with toughness",
        "ASTM A941",
        1.5,
      ],
      [
        "SOL-ANN",
        "Solution Annealing",
        "High-temp anneal for austenitic SS",
        "SOLUTION_ANNEAL",
        "Austenitic stainless steel",
        1000,
        1120,
        1050,
        30,
        90,
        200,
        "WATER_RAPID",
        null,
        "INERT",
        "Decrease (softened)",
        "Dissolve carbides, restore corrosion resistance",
        "ASTM A380, ASTM A967",
        1.45,
      ],
      [
        "SOL-ANN-DUP",
        "Solution Annealing Duplex",
        "Solution anneal for duplex SS",
        "SOLUTION_ANNEAL",
        "Duplex stainless steel",
        1020,
        1100,
        1050,
        15,
        60,
        200,
        "WATER_RAPID",
        null,
        "INERT",
        "Slight decrease",
        "Balance ferrite/austenite phases",
        "ASTM A480",
        1.55,
      ],
      [
        "STAB",
        "Stabilization Anneal",
        "Heat for carbide stabilization",
        "STABILIZATION",
        "321, 347 stainless (Ti/Nb stabilized)",
        850,
        930,
        900,
        120,
        300,
        100,
        "AIR",
        null,
        "INERT",
        "Minimal change",
        "Precipitate Ti/Nb carbides for sensitization resistance",
        "ASTM A941",
        1.35,
      ],
      [
        "AGE-H900",
        "Age Hardening H900",
        "Precipitation hardening at 900F",
        "PRECIPITATION",
        "17-4PH, 15-5PH stainless",
        470,
        490,
        480,
        60,
        240,
        100,
        "AIR",
        null,
        "AIR",
        "Significant increase",
        "Maximum hardness for PH stainless",
        "ASTM A564",
        1.4,
      ],
      [
        "AGE-H1025",
        "Age Hardening H1025",
        "Precipitation hardening at 1025F",
        "PRECIPITATION",
        "17-4PH, 15-5PH stainless",
        540,
        560,
        550,
        240,
        480,
        100,
        "AIR",
        null,
        "AIR",
        "Moderate increase",
        "Balance of strength and toughness for PH SS",
        "ASTM A564",
        1.4,
      ],
      [
        "AGE-H1150",
        "Age Hardening H1150",
        "Precipitation hardening at 1150F",
        "PRECIPITATION",
        "17-4PH, 15-5PH stainless",
        610,
        630,
        620,
        240,
        480,
        100,
        "AIR",
        null,
        "AIR",
        "Slight increase",
        "Maximum toughness for PH stainless",
        "ASTM A564",
        1.4,
      ],
      [
        "CASE-CARB",
        "Carburizing",
        "Surface hardening by carbon diffusion",
        "CASE_HARDENING",
        "Low carbon steel",
        870,
        950,
        925,
        120,
        480,
        100,
        "QUENCH",
        null,
        "CARBURIZING",
        "Surface increase",
        "Hard wear-resistant surface, tough core",
        "SAE AMS2759",
        1.8,
      ],
      [
        "CASE-NITR",
        "Nitriding",
        "Surface hardening by nitrogen diffusion",
        "CASE_HARDENING",
        "Alloy steel, tool steel",
        480,
        560,
        520,
        1440,
        4320,
        50,
        "SLOW_COOL",
        null,
        "AMMONIA",
        "Surface increase",
        "Hard wear-resistant surface without quench",
        "SAE AMS2759",
        1.9,
      ],
      [
        "CASE-CARBN",
        "Carbonitriding",
        "Combined carbon/nitrogen diffusion",
        "CASE_HARDENING",
        "Low carbon steel",
        760,
        870,
        815,
        60,
        240,
        100,
        "QUENCH",
        null,
        "CARB_NITR",
        "Surface increase",
        "Shallow hard case, lower distortion",
        "SAE AMS2759",
        1.85,
      ],
      [
        "CRYO",
        "Cryogenic Treatment",
        "Deep cold treatment to -185C",
        "CRYOGENIC",
        "Tool steel, high carbon steel",
        -196,
        -80,
        -185,
        1440,
        2880,
        null,
        "SLOW_WARM",
        10,
        "LIQUID_N2",
        "Slight increase",
        "Convert retained austenite, improve wear",
        null,
        1.6,
      ],
      [
        "HIP",
        "Hot Isostatic Pressing",
        "High pressure/temp densification",
        "HIP",
        "Cast alloys, powder metals",
        850,
        1200,
        1000,
        120,
        480,
        100,
        "FURNACE",
        null,
        "ARGON",
        "Varies",
        "Close porosity, improve fatigue life",
        "ASTM A1080",
        2.5,
      ],
    ];

    for (const ht of heatTreatments) {
      await queryRunner.query(
        `
        INSERT INTO heat_treatment_specifications (code, name, description, treatment_type, applicable_material_types, min_temp_c, max_temp_c, typical_temp_c, min_hold_time_min, max_hold_time_min, heating_rate_c_per_hr, cooling_method, cooling_rate_c_per_hr, atmosphere, hardness_change, purpose, applicable_standards, cost_multiplier)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (code) DO NOTHING
      `,
        ht,
      );
    }

    // Create indexes
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_strainers_type_size ON strainers(strainer_type_id, size_dn)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_inst_valves_type ON instrumentation_valves(valve_type_id)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_stainless_finishes_type ON stainless_finishes(finish_type)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_secondary_coatings_type ON secondary_coatings(coating_type)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_heat_treat_type ON heat_treatment_specifications(treatment_type)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_heat_treat_type");
    await queryRunner.query("DROP INDEX IF EXISTS idx_secondary_coatings_type");
    await queryRunner.query("DROP INDEX IF EXISTS idx_stainless_finishes_type");
    await queryRunner.query("DROP INDEX IF EXISTS idx_inst_valves_type");
    await queryRunner.query("DROP INDEX IF EXISTS idx_strainers_type_size");
    await queryRunner.query("DROP INDEX IF EXISTS idx_insulation_specs_type_nb");

    await queryRunner.query("DROP TABLE IF EXISTS heat_treatment_specifications");
    await queryRunner.query("DROP TABLE IF EXISTS secondary_coatings");
    await queryRunner.query("DROP TABLE IF EXISTS stainless_finishes");
    await queryRunner.query("DROP TABLE IF EXISTS instrumentation_valves");
    await queryRunner.query("DROP TABLE IF EXISTS instrumentation_valve_types");
    await queryRunner.query("DROP TABLE IF EXISTS strainers");
    await queryRunner.query("DROP TABLE IF EXISTS strainer_types");
    await queryRunner.query("DROP TABLE IF EXISTS insulation_specifications");
    await queryRunner.query("DROP TABLE IF EXISTS insulation_types");
  }
}
