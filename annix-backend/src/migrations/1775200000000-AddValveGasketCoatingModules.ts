import { MigrationInterface, QueryRunner } from "typeorm";

export class AddValveGasketCoatingModules1775200000000 implements MigrationInterface {
  name = "AddValveGasketCoatingModules1775200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding Valve, Gasket, and Coating modules (Phase 2 - High Priority)...");

    // ============================================================
    // PART 1: VALVE MODULE
    // ============================================================
    console.warn("Creating valve module tables...");

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS valve_types (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        typical_applications TEXT,
        flow_characteristic VARCHAR(50),
        bidirectional BOOLEAN DEFAULT false,
        throttling_capable BOOLEAN DEFAULT false
      )
    `);

    const valveTypes = [
      {
        code: "GATE",
        name: "Gate Valve",
        desc: "Linear motion valve with wedge-shaped gate",
        apps: "Isolation, on/off service, full bore",
        flow: "Linear",
        bidir: true,
        throttle: false,
      },
      {
        code: "GLOBE",
        name: "Globe Valve",
        desc: "Linear motion valve with plug-type disc",
        apps: "Throttling, flow control, regulation",
        flow: "Equal percentage",
        bidir: false,
        throttle: true,
      },
      {
        code: "BALL",
        name: "Ball Valve",
        desc: "Quarter-turn valve with spherical closure",
        apps: "Isolation, on/off, tight shutoff",
        flow: "Linear",
        bidir: true,
        throttle: false,
      },
      {
        code: "BUTTERFLY",
        name: "Butterfly Valve",
        desc: "Quarter-turn valve with rotating disc",
        apps: "Isolation, throttling, large diameter",
        flow: "Equal percentage",
        bidir: true,
        throttle: true,
      },
      {
        code: "CHECK",
        name: "Check Valve",
        desc: "Prevents reverse flow",
        apps: "Backflow prevention, pump discharge",
        flow: "N/A",
        bidir: false,
        throttle: false,
      },
      {
        code: "SWING_CHECK",
        name: "Swing Check Valve",
        desc: "Hinged disc check valve",
        apps: "Horizontal lines, low pressure drop",
        flow: "N/A",
        bidir: false,
        throttle: false,
      },
      {
        code: "LIFT_CHECK",
        name: "Lift Check Valve",
        desc: "Piston-type check valve",
        apps: "Vertical lines, high pressure",
        flow: "N/A",
        bidir: false,
        throttle: false,
      },
      {
        code: "PLUG",
        name: "Plug Valve",
        desc: "Quarter-turn valve with tapered plug",
        apps: "Isolation, diverting, multi-port",
        flow: "Linear",
        bidir: true,
        throttle: false,
      },
      {
        code: "NEEDLE",
        name: "Needle Valve",
        desc: "Fine flow control with tapered stem",
        apps: "Instrument lines, precise control",
        flow: "Linear",
        bidir: true,
        throttle: true,
      },
      {
        code: "DIAPHRAGM",
        name: "Diaphragm Valve",
        desc: "Flexible diaphragm closure",
        apps: "Slurries, corrosive fluids, sanitary",
        flow: "Linear",
        bidir: true,
        throttle: true,
      },
      {
        code: "PINCH",
        name: "Pinch Valve",
        desc: "Flexible sleeve pinched closed",
        apps: "Slurries, abrasive media, solids",
        flow: "Linear",
        bidir: true,
        throttle: true,
      },
      {
        code: "RELIEF",
        name: "Relief Valve",
        desc: "Pressure relief/safety valve",
        apps: "Overpressure protection, safety systems",
        flow: "N/A",
        bidir: false,
        throttle: false,
      },
      {
        code: "PRV",
        name: "Pressure Reducing Valve",
        desc: "Maintains downstream pressure",
        apps: "Pressure regulation, steam systems",
        flow: "Modulating",
        bidir: false,
        throttle: true,
      },
      {
        code: "CONTROL",
        name: "Control Valve",
        desc: "Automated flow control valve",
        apps: "Process control, modulating service",
        flow: "Various",
        bidir: true,
        throttle: true,
      },
    ];

    for (const v of valveTypes) {
      await queryRunner.query(
        `INSERT INTO valve_types (code, name, description, typical_applications, flow_characteristic, bidirectional, throttling_capable)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name, description = EXCLUDED.description,
           typical_applications = EXCLUDED.typical_applications,
           flow_characteristic = EXCLUDED.flow_characteristic,
           bidirectional = EXCLUDED.bidirectional,
           throttling_capable = EXCLUDED.throttling_capable`,
        [v.code, v.name, v.desc, v.apps, v.flow, v.bidir, v.throttle],
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS valve_end_connections (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT
      )
    `);

    const endConnections = [
      {
        code: "RF",
        name: "Raised Face Flanged",
        desc: "Standard raised face flange connection",
      },
      {
        code: "FF",
        name: "Flat Face Flanged",
        desc: "Flat face flange for cast iron mating",
      },
      {
        code: "RTJ",
        name: "Ring Type Joint Flanged",
        desc: "Metal ring gasket for high pressure",
      },
      {
        code: "BW",
        name: "Butt Weld",
        desc: "Weld end for permanent installation",
      },
      {
        code: "SW",
        name: "Socket Weld",
        desc: "Socket weld ends for small bore",
      },
      { code: "THD", name: "Threaded (NPT)", desc: "NPT threaded ends" },
      { code: "BSPT", name: "Threaded (BSPT)", desc: "BSPT threaded ends" },
      { code: "TRI", name: "Tri-Clamp", desc: "Sanitary clamp connection" },
      { code: "WAFER", name: "Wafer", desc: "Wafer style between flanges" },
      { code: "LUG", name: "Lug", desc: "Lug style with threaded holes" },
    ];

    for (const e of endConnections) {
      await queryRunner.query(
        `INSERT INTO valve_end_connections (code, name, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
        [e.code, e.name, e.desc],
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS valve_pressure_classes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        standard VARCHAR(50),
        max_pressure_psi INTEGER,
        max_pressure_bar DECIMAL(8,2)
      )
    `);

    const pressureClasses = [
      {
        code: "CL150",
        name: "Class 150",
        std: "ASME B16.34",
        psi: 285,
        bar: 19.6,
      },
      {
        code: "CL300",
        name: "Class 300",
        std: "ASME B16.34",
        psi: 740,
        bar: 51.0,
      },
      {
        code: "CL600",
        name: "Class 600",
        std: "ASME B16.34",
        psi: 1480,
        bar: 102.0,
      },
      {
        code: "CL900",
        name: "Class 900",
        std: "ASME B16.34",
        psi: 2220,
        bar: 153.0,
      },
      {
        code: "CL1500",
        name: "Class 1500",
        std: "ASME B16.34",
        psi: 3705,
        bar: 255.0,
      },
      {
        code: "CL2500",
        name: "Class 2500",
        std: "ASME B16.34",
        psi: 6170,
        bar: 425.0,
      },
      { code: "PN10", name: "PN10", std: "EN 1092-1", psi: 145, bar: 10.0 },
      { code: "PN16", name: "PN16", std: "EN 1092-1", psi: 232, bar: 16.0 },
      { code: "PN25", name: "PN25", std: "EN 1092-1", psi: 363, bar: 25.0 },
      { code: "PN40", name: "PN40", std: "EN 1092-1", psi: 580, bar: 40.0 },
      { code: "PN63", name: "PN63", std: "EN 1092-1", psi: 914, bar: 63.0 },
      { code: "PN100", name: "PN100", std: "EN 1092-1", psi: 1450, bar: 100.0 },
    ];

    for (const p of pressureClasses) {
      await queryRunner.query(
        `INSERT INTO valve_pressure_classes (code, name, standard, max_pressure_psi, max_pressure_bar)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name, standard = EXCLUDED.standard,
           max_pressure_psi = EXCLUDED.max_pressure_psi, max_pressure_bar = EXCLUDED.max_pressure_bar`,
        [p.code, p.name, p.std, p.psi, p.bar],
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS valve_body_materials (
        id SERIAL PRIMARY KEY,
        code VARCHAR(30) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        material_spec VARCHAR(50),
        category VARCHAR(30),
        min_temp_c INTEGER,
        max_temp_c INTEGER,
        cost_factor DECIMAL(4,2) DEFAULT 1.0
      )
    `);

    const bodyMaterials = [
      {
        code: "WCB",
        name: "Carbon Steel (Cast)",
        spec: "ASTM A216 WCB",
        cat: "Carbon Steel",
        minT: -29,
        maxT: 425,
        cost: 1.0,
      },
      {
        code: "WCC",
        name: "Carbon Steel (Cast)",
        spec: "ASTM A216 WCC",
        cat: "Carbon Steel",
        minT: -29,
        maxT: 425,
        cost: 1.0,
      },
      {
        code: "LCB",
        name: "Low Temp Carbon Steel",
        spec: "ASTM A352 LCB",
        cat: "Carbon Steel",
        minT: -46,
        maxT: 340,
        cost: 1.15,
      },
      {
        code: "LCC",
        name: "Low Temp Carbon Steel",
        spec: "ASTM A352 LCC",
        cat: "Carbon Steel",
        minT: -46,
        maxT: 340,
        cost: 1.15,
      },
      {
        code: "CF8",
        name: "304 Stainless (Cast)",
        spec: "ASTM A351 CF8",
        cat: "Stainless Steel",
        minT: -254,
        maxT: 538,
        cost: 2.5,
      },
      {
        code: "CF8M",
        name: "316 Stainless (Cast)",
        spec: "ASTM A351 CF8M",
        cat: "Stainless Steel",
        minT: -254,
        maxT: 538,
        cost: 3.0,
      },
      {
        code: "CF3",
        name: "304L Stainless (Cast)",
        spec: "ASTM A351 CF3",
        cat: "Stainless Steel",
        minT: -254,
        maxT: 425,
        cost: 2.6,
      },
      {
        code: "CF3M",
        name: "316L Stainless (Cast)",
        spec: "ASTM A351 CF3M",
        cat: "Stainless Steel",
        minT: -254,
        maxT: 425,
        cost: 3.1,
      },
      {
        code: "WC6",
        name: "1.25Cr-0.5Mo (Cast)",
        spec: "ASTM A217 WC6",
        cat: "Alloy Steel",
        minT: -29,
        maxT: 593,
        cost: 1.8,
      },
      {
        code: "WC9",
        name: "2.25Cr-1Mo (Cast)",
        spec: "ASTM A217 WC9",
        cat: "Alloy Steel",
        minT: -29,
        maxT: 593,
        cost: 2.0,
      },
      {
        code: "C5",
        name: "5Cr-0.5Mo (Cast)",
        spec: "ASTM A217 C5",
        cat: "Alloy Steel",
        minT: -29,
        maxT: 649,
        cost: 2.2,
      },
      {
        code: "C12",
        name: "9Cr-1Mo (Cast)",
        spec: "ASTM A217 C12",
        cat: "Alloy Steel",
        minT: -29,
        maxT: 649,
        cost: 2.5,
      },
      {
        code: "CD4MCU",
        name: "Duplex (Cast)",
        spec: "ASTM A890 4A",
        cat: "Duplex",
        minT: -46,
        maxT: 316,
        cost: 4.5,
      },
      {
        code: "CE8MN",
        name: "Super Duplex (Cast)",
        spec: "ASTM A890 5A",
        cat: "Duplex",
        minT: -46,
        maxT: 316,
        cost: 6.0,
      },
      {
        code: "CW6MC",
        name: "Inconel 625 (Cast)",
        spec: "ASTM A494 CW6MC",
        cat: "Nickel Alloy",
        minT: -254,
        maxT: 650,
        cost: 12.0,
      },
      {
        code: "CW12MW",
        name: "Hastelloy C (Cast)",
        spec: "ASTM A494 CW12MW",
        cat: "Nickel Alloy",
        minT: -254,
        maxT: 650,
        cost: 15.0,
      },
      {
        code: "BRONZE",
        name: "Bronze",
        spec: "ASTM B62",
        cat: "Copper Alloy",
        minT: -198,
        maxT: 260,
        cost: 2.0,
      },
      {
        code: "DUCTILE",
        name: "Ductile Iron",
        spec: "ASTM A395",
        cat: "Iron",
        minT: -29,
        maxT: 343,
        cost: 0.7,
      },
    ];

    for (const m of bodyMaterials) {
      await queryRunner.query(
        `INSERT INTO valve_body_materials (code, name, material_spec, category, min_temp_c, max_temp_c, cost_factor)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name, material_spec = EXCLUDED.material_spec,
           category = EXCLUDED.category, min_temp_c = EXCLUDED.min_temp_c,
           max_temp_c = EXCLUDED.max_temp_c, cost_factor = EXCLUDED.cost_factor`,
        [m.code, m.name, m.spec, m.cat, m.minT, m.maxT, m.cost],
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS valves (
        id SERIAL PRIMARY KEY,
        valve_type_id INTEGER REFERENCES valve_types(id),
        size_nps VARCHAR(10) NOT NULL,
        size_dn INTEGER,
        pressure_class_id INTEGER REFERENCES valve_pressure_classes(id),
        body_material_id INTEGER REFERENCES valve_body_materials(id),
        end_connection_id INTEGER REFERENCES valve_end_connections(id),
        trim_material VARCHAR(50),
        seat_material VARCHAR(50),
        packing_material VARCHAR(50),
        operator_type VARCHAR(30),
        face_to_face_mm DECIMAL(8,2),
        weight_kg DECIMAL(10,2),
        cv_value DECIMAL(10,2),
        cost_usd DECIMAL(12,2),
        cost_zar DECIMAL(12,2),
        manufacturer VARCHAR(100),
        model_number VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(valve_type_id, size_nps, pressure_class_id, body_material_id, end_connection_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_valves_type ON valves(valve_type_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_valves_size ON valves(size_nps)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_valves_pressure ON valves(pressure_class_id)
    `);

    // Sample valve data - Gate valves Class 150
    const gateValveData = [
      { nps: "1/2", dn: 15, ftf: 108, wt: 2.5, cv: 13 },
      { nps: "3/4", dn: 20, ftf: 117, wt: 3.2, cv: 24 },
      { nps: "1", dn: 25, ftf: 127, wt: 4.5, cv: 41 },
      { nps: "1-1/2", dn: 40, ftf: 165, wt: 8.0, cv: 104 },
      { nps: "2", dn: 50, ftf: 178, wt: 11.0, cv: 186 },
      { nps: "3", dn: 80, ftf: 203, wt: 22.0, cv: 450 },
      { nps: "4", dn: 100, ftf: 229, wt: 35.0, cv: 780 },
      { nps: "6", dn: 150, ftf: 267, wt: 65.0, cv: 1800 },
      { nps: "8", dn: 200, ftf: 292, wt: 105.0, cv: 3200 },
      { nps: "10", dn: 250, ftf: 330, wt: 160.0, cv: 5000 },
      { nps: "12", dn: 300, ftf: 356, wt: 230.0, cv: 7200 },
    ];

    const gateTypeResult = await queryRunner.query(
      `SELECT id FROM valve_types WHERE code = 'GATE'`,
    );
    const cl150Result = await queryRunner.query(
      `SELECT id FROM valve_pressure_classes WHERE code = 'CL150'`,
    );
    const wcbResult = await queryRunner.query(
      `SELECT id FROM valve_body_materials WHERE code = 'WCB'`,
    );
    const rfResult = await queryRunner.query(
      `SELECT id FROM valve_end_connections WHERE code = 'RF'`,
    );

    if (gateTypeResult[0] && cl150Result[0] && wcbResult[0] && rfResult[0]) {
      for (const v of gateValveData) {
        await queryRunner.query(
          `INSERT INTO valves (valve_type_id, size_nps, size_dn, pressure_class_id, body_material_id, end_connection_id, trim_material, seat_material, face_to_face_mm, weight_kg, cv_value)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (valve_type_id, size_nps, pressure_class_id, body_material_id, end_connection_id) DO UPDATE SET
             size_dn = EXCLUDED.size_dn, face_to_face_mm = EXCLUDED.face_to_face_mm,
             weight_kg = EXCLUDED.weight_kg, cv_value = EXCLUDED.cv_value`,
          [
            gateTypeResult[0].id,
            v.nps,
            v.dn,
            cl150Result[0].id,
            wcbResult[0].id,
            rfResult[0].id,
            "13Cr",
            "13Cr",
            v.ftf,
            v.wt,
            v.cv,
          ],
        );
      }
    }

    // ============================================================
    // PART 2: GASKET MODULE
    // ============================================================
    console.warn("Creating gasket module tables...");

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gasket_materials (
        id SERIAL PRIMARY KEY,
        code VARCHAR(30) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50),
        min_temp_c INTEGER,
        max_temp_c INTEGER,
        max_pressure_bar DECIMAL(8,2),
        chemical_resistance TEXT,
        typical_applications TEXT,
        cost_factor DECIMAL(4,2) DEFAULT 1.0
      )
    `);

    const gasketMaterials = [
      {
        code: "PTFE",
        name: "PTFE (Virgin)",
        cat: "Fluoropolymer",
        minT: -200,
        maxT: 260,
        maxP: 100,
        chem: "Excellent - virtually all chemicals",
        apps: "Chemical, pharmaceutical, food",
        cost: 2.5,
      },
      {
        code: "PTFE-F",
        name: "PTFE (Filled)",
        cat: "Fluoropolymer",
        minT: -200,
        maxT: 260,
        maxP: 150,
        chem: "Excellent with fillers for specific services",
        apps: "High pressure chemical service",
        cost: 3.0,
      },
      {
        code: "SPIRAL-SS-PTFE",
        name: "Spiral Wound SS/PTFE",
        cat: "Semi-Metallic",
        minT: -200,
        maxT: 260,
        maxP: 250,
        chem: "Excellent",
        apps: "High pressure, high temp chemical",
        cost: 4.5,
      },
      {
        code: "SPIRAL-SS-GRAPH",
        name: "Spiral Wound SS/Graphite",
        cat: "Semi-Metallic",
        minT: -200,
        maxT: 650,
        maxP: 250,
        chem: "Good - not for strong oxidizers",
        apps: "High temp steam, hydrocarbons",
        cost: 5.0,
      },
      {
        code: "SPIRAL-SS316-GRAPH",
        name: "Spiral Wound 316SS/Graphite",
        cat: "Semi-Metallic",
        minT: -200,
        maxT: 650,
        maxP: 250,
        chem: "Good with corrosion resistance",
        apps: "Corrosive high temp service",
        cost: 6.5,
      },
      {
        code: "GRAPH-FLEX",
        name: "Flexible Graphite",
        cat: "Graphite",
        minT: -200,
        maxT: 650,
        maxP: 200,
        chem: "Good - not for strong oxidizers",
        apps: "Steam, hydrocarbons, heat exchangers",
        cost: 3.5,
      },
      {
        code: "GRAPH-SS-INSERT",
        name: "Graphite with SS Insert",
        cat: "Graphite",
        minT: -200,
        maxT: 550,
        maxP: 150,
        chem: "Good with blowout resistance",
        apps: "High pressure steam",
        cost: 4.0,
      },
      {
        code: "CAF",
        name: "Compressed Asbestos Free",
        cat: "Fiber",
        minT: -50,
        maxT: 250,
        maxP: 50,
        chem: "Moderate",
        apps: "General purpose, water, air",
        cost: 1.0,
      },
      {
        code: "NAF",
        name: "Non-Asbestos Fiber",
        cat: "Fiber",
        minT: -50,
        maxT: 400,
        maxP: 80,
        chem: "Good for oils and gases",
        apps: "Oil, gas, steam to 400C",
        cost: 1.5,
      },
      {
        code: "RUBBER-EPDM",
        name: "EPDM Rubber",
        cat: "Elastomer",
        minT: -40,
        maxT: 150,
        maxP: 20,
        chem: "Good for water, steam, acids",
        apps: "Water, low pressure steam",
        cost: 0.8,
      },
      {
        code: "RUBBER-NBR",
        name: "Nitrile Rubber (NBR)",
        cat: "Elastomer",
        minT: -40,
        maxT: 120,
        maxP: 20,
        chem: "Good for oils and fuels",
        apps: "Petroleum, oils, fuels",
        cost: 0.8,
      },
      {
        code: "RUBBER-VITON",
        name: "Viton (FKM)",
        cat: "Elastomer",
        minT: -20,
        maxT: 200,
        maxP: 30,
        chem: "Excellent for oils and chemicals",
        apps: "Aggressive chemicals, high temp oils",
        cost: 3.0,
      },
      {
        code: "METAL-SS304",
        name: "Solid Metal 304SS",
        cat: "Metallic",
        minT: -254,
        maxT: 538,
        maxP: 400,
        chem: "Material dependent",
        apps: "Extreme pressure/temp",
        cost: 8.0,
      },
      {
        code: "METAL-SS316",
        name: "Solid Metal 316SS",
        cat: "Metallic",
        minT: -254,
        maxT: 538,
        maxP: 400,
        chem: "Corrosion resistant",
        apps: "Extreme P/T, corrosive",
        cost: 10.0,
      },
      {
        code: "RTJ-SS304",
        name: "Ring Type Joint 304SS",
        cat: "Metallic",
        minT: -254,
        maxT: 538,
        maxP: 700,
        chem: "Material dependent",
        apps: "API 6A, high pressure",
        cost: 15.0,
      },
      {
        code: "RTJ-SS316",
        name: "Ring Type Joint 316SS",
        cat: "Metallic",
        minT: -254,
        maxT: 538,
        maxP: 700,
        chem: "Corrosion resistant",
        apps: "High pressure corrosive",
        cost: 18.0,
      },
      {
        code: "KAMMPROFILE",
        name: "Kammprofile with Graphite",
        cat: "Semi-Metallic",
        minT: -200,
        maxT: 550,
        maxP: 300,
        chem: "Good",
        apps: "Heat exchangers, high integrity",
        cost: 7.0,
      },
    ];

    for (const g of gasketMaterials) {
      await queryRunner.query(
        `INSERT INTO gasket_materials (code, name, category, min_temp_c, max_temp_c, max_pressure_bar, chemical_resistance, typical_applications, cost_factor)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name, category = EXCLUDED.category,
           min_temp_c = EXCLUDED.min_temp_c, max_temp_c = EXCLUDED.max_temp_c,
           max_pressure_bar = EXCLUDED.max_pressure_bar,
           chemical_resistance = EXCLUDED.chemical_resistance,
           typical_applications = EXCLUDED.typical_applications,
           cost_factor = EXCLUDED.cost_factor`,
        [g.code, g.name, g.cat, g.minT, g.maxT, g.maxP, g.chem, g.apps, g.cost],
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gasket_specifications (
        id SERIAL PRIMARY KEY,
        gasket_material_id INTEGER REFERENCES gasket_materials(id),
        flange_standard VARCHAR(30),
        pressure_class VARCHAR(20),
        size_nps VARCHAR(10) NOT NULL,
        size_dn INTEGER,
        inside_diameter_mm DECIMAL(8,2),
        outside_diameter_mm DECIMAL(8,2),
        thickness_mm DECIMAL(6,2) NOT NULL,
        weight_kg DECIMAL(8,3),
        cost_usd DECIMAL(10,2),
        cost_zar DECIMAL(10,2),
        UNIQUE(gasket_material_id, flange_standard, pressure_class, size_nps, thickness_mm)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gasket_specs_material ON gasket_specifications(gasket_material_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gasket_specs_size ON gasket_specifications(size_nps)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gasket_flange_compatibility (
        id SERIAL PRIMARY KEY,
        gasket_material_id INTEGER REFERENCES gasket_materials(id),
        flange_material VARCHAR(50) NOT NULL,
        flange_face_type VARCHAR(20) NOT NULL,
        compatibility VARCHAR(20) NOT NULL,
        notes TEXT,
        UNIQUE(gasket_material_id, flange_material, flange_face_type)
      )
    `);

    const compatibilityData = [
      {
        mat: "PTFE",
        flange: "Carbon Steel",
        face: "RF",
        compat: "Recommended",
      },
      {
        mat: "PTFE",
        flange: "Stainless Steel",
        face: "RF",
        compat: "Recommended",
      },
      { mat: "PTFE", flange: "Carbon Steel", face: "FF", compat: "Acceptable" },
      {
        mat: "SPIRAL-SS-GRAPH",
        flange: "Carbon Steel",
        face: "RF",
        compat: "Recommended",
      },
      {
        mat: "SPIRAL-SS-GRAPH",
        flange: "Stainless Steel",
        face: "RF",
        compat: "Recommended",
      },
      {
        mat: "SPIRAL-SS316-GRAPH",
        flange: "Stainless Steel",
        face: "RF",
        compat: "Recommended",
      },
      {
        mat: "SPIRAL-SS316-GRAPH",
        flange: "Duplex",
        face: "RF",
        compat: "Recommended",
      },
      {
        mat: "GRAPH-FLEX",
        flange: "Carbon Steel",
        face: "RF",
        compat: "Recommended",
      },
      {
        mat: "GRAPH-FLEX",
        flange: "Stainless Steel",
        face: "RF",
        compat: "Recommended",
      },
      { mat: "CAF", flange: "Carbon Steel", face: "RF", compat: "Recommended" },
      { mat: "CAF", flange: "Carbon Steel", face: "FF", compat: "Recommended" },
      { mat: "CAF", flange: "Cast Iron", face: "FF", compat: "Recommended" },
      {
        mat: "RUBBER-EPDM",
        flange: "Carbon Steel",
        face: "FF",
        compat: "Recommended",
      },
      {
        mat: "RUBBER-EPDM",
        flange: "Cast Iron",
        face: "FF",
        compat: "Recommended",
      },
      {
        mat: "RTJ-SS304",
        flange: "Carbon Steel",
        face: "RTJ",
        compat: "Recommended",
      },
      {
        mat: "RTJ-SS316",
        flange: "Stainless Steel",
        face: "RTJ",
        compat: "Recommended",
      },
      {
        mat: "RTJ-SS316",
        flange: "Duplex",
        face: "RTJ",
        compat: "Recommended",
      },
      {
        mat: "KAMMPROFILE",
        flange: "Carbon Steel",
        face: "RF",
        compat: "Recommended",
      },
      {
        mat: "KAMMPROFILE",
        flange: "Stainless Steel",
        face: "RF",
        compat: "Recommended",
      },
    ];

    for (const c of compatibilityData) {
      const matResult = await queryRunner.query("SELECT id FROM gasket_materials WHERE code = $1", [
        c.mat,
      ]);
      if (matResult[0]) {
        await queryRunner.query(
          `INSERT INTO gasket_flange_compatibility (gasket_material_id, flange_material, flange_face_type, compatibility)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (gasket_material_id, flange_material, flange_face_type) DO UPDATE SET
             compatibility = EXCLUDED.compatibility`,
          [matResult[0].id, c.flange, c.face, c.compat],
        );
      }
    }

    // ============================================================
    // PART 3: COATING COST DATA
    // ============================================================
    console.warn("Adding coating cost data...");

    // First create the table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coating_specification (
        id SERIAL PRIMARY KEY,
        code VARCHAR(30) NOT NULL UNIQUE,
        name VARCHAR(200) NOT NULL,
        coating_system VARCHAR(100),
        primer VARCHAR(100),
        intermediate VARCHAR(100),
        topcoat VARCHAR(100),
        total_dft_microns INTEGER,
        corrosivity_category VARCHAR(10),
        durability_years VARCHAR(20),
        cost_per_square_meter_usd DECIMAL(10,2),
        cost_per_square_meter_zar DECIMAL(10,2),
        coverage_m2_per_liter DECIMAL(8,2),
        labor_cost_factor DECIMAL(4,2) DEFAULT 1.0,
        min_dft_microns INTEGER,
        max_dft_microns INTEGER,
        recoat_interval_hours INTEGER,
        full_cure_hours INTEGER
      )
    `);

    // Then add any columns that might be missing (for existing tables)
    await queryRunner.query(`
      ALTER TABLE coating_specification
      ADD COLUMN IF NOT EXISTS cost_per_square_meter_usd DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS cost_per_square_meter_zar DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS coverage_m2_per_liter DECIMAL(8,2),
      ADD COLUMN IF NOT EXISTS labor_cost_factor DECIMAL(4,2) DEFAULT 1.0,
      ADD COLUMN IF NOT EXISTS min_dft_microns INTEGER,
      ADD COLUMN IF NOT EXISTS max_dft_microns INTEGER,
      ADD COLUMN IF NOT EXISTS recoat_interval_hours INTEGER,
      ADD COLUMN IF NOT EXISTS full_cure_hours INTEGER
    `);

    const coatingCostData = [
      {
        code: "ISO12944-C3-LOW",
        name: "ISO 12944 C3 Low Durability",
        system: "Alkyd primer + Alkyd topcoat",
        dft: 120,
        cat: "C3",
        dur: "Low (2-5yr)",
        costUsd: 8.5,
        costZar: 160,
        coverage: 8.0,
        labor: 1.0,
        minDft: 100,
        maxDft: 140,
        recoat: 16,
        cure: 168,
      },
      {
        code: "ISO12944-C3-MED",
        name: "ISO 12944 C3 Medium Durability",
        system: "Epoxy primer + PU topcoat",
        dft: 160,
        cat: "C3",
        dur: "Medium (5-15yr)",
        costUsd: 15.0,
        costZar: 280,
        coverage: 6.5,
        labor: 1.2,
        minDft: 140,
        maxDft: 180,
        recoat: 8,
        cure: 168,
      },
      {
        code: "ISO12944-C3-HIGH",
        name: "ISO 12944 C3 High Durability",
        system: "Zinc epoxy + Epoxy + PU",
        dft: 200,
        cat: "C3",
        dur: "High (>15yr)",
        costUsd: 22.0,
        costZar: 410,
        coverage: 5.5,
        labor: 1.4,
        minDft: 180,
        maxDft: 240,
        recoat: 6,
        cure: 168,
      },
      {
        code: "ISO12944-C4-LOW",
        name: "ISO 12944 C4 Low Durability",
        system: "Epoxy primer + Epoxy topcoat",
        dft: 160,
        cat: "C4",
        dur: "Low (2-5yr)",
        costUsd: 12.0,
        costZar: 225,
        coverage: 6.5,
        labor: 1.1,
        minDft: 140,
        maxDft: 180,
        recoat: 8,
        cure: 168,
      },
      {
        code: "ISO12944-C4-MED",
        name: "ISO 12944 C4 Medium Durability",
        system: "Zinc epoxy + Epoxy + PU",
        dft: 200,
        cat: "C4",
        dur: "Medium (5-15yr)",
        costUsd: 20.0,
        costZar: 375,
        coverage: 5.5,
        labor: 1.3,
        minDft: 180,
        maxDft: 240,
        recoat: 6,
        cure: 168,
      },
      {
        code: "ISO12944-C4-HIGH",
        name: "ISO 12944 C4 High Durability",
        system: "Zinc silicate + Epoxy + PU",
        dft: 280,
        cat: "C4",
        dur: "High (>15yr)",
        costUsd: 32.0,
        costZar: 600,
        coverage: 4.5,
        labor: 1.5,
        minDft: 240,
        maxDft: 320,
        recoat: 4,
        cure: 336,
      },
      {
        code: "ISO12944-C5I-MED",
        name: "ISO 12944 C5-I Medium Durability",
        system: "Zinc silicate + Epoxy MIO + PU",
        dft: 280,
        cat: "C5-I",
        dur: "Medium (5-15yr)",
        costUsd: 35.0,
        costZar: 655,
        coverage: 4.0,
        labor: 1.5,
        minDft: 240,
        maxDft: 320,
        recoat: 4,
        cure: 336,
      },
      {
        code: "ISO12944-C5I-HIGH",
        name: "ISO 12944 C5-I High Durability",
        system: "Zinc silicate + Epoxy MIO + Epoxy + PU",
        dft: 360,
        cat: "C5-I",
        dur: "High (>15yr)",
        costUsd: 48.0,
        costZar: 900,
        coverage: 3.5,
        labor: 1.7,
        minDft: 320,
        maxDft: 400,
        recoat: 4,
        cure: 504,
      },
      {
        code: "ISO12944-C5M-MED",
        name: "ISO 12944 C5-M Medium Durability",
        system: "Zinc silicate + Epoxy + Polysiloxane",
        dft: 320,
        cat: "C5-M",
        dur: "Medium (5-15yr)",
        costUsd: 42.0,
        costZar: 785,
        coverage: 3.8,
        labor: 1.6,
        minDft: 280,
        maxDft: 360,
        recoat: 4,
        cure: 336,
      },
      {
        code: "ISO12944-C5M-HIGH",
        name: "ISO 12944 C5-M High Durability",
        system: "TSA + Epoxy seal + Polysiloxane",
        dft: 400,
        cat: "C5-M",
        dur: "High (>15yr)",
        costUsd: 65.0,
        costZar: 1220,
        coverage: 3.0,
        labor: 2.0,
        minDft: 350,
        maxDft: 450,
        recoat: 4,
        cure: 504,
      },
      {
        code: "NORSOK-M501-SYS1",
        name: "NORSOK M-501 System 1",
        system: "Zinc silicate + Epoxy + Polysiloxane",
        dft: 280,
        cat: "C5-M",
        dur: "High (>25yr)",
        costUsd: 55.0,
        costZar: 1030,
        coverage: 4.0,
        labor: 1.8,
        minDft: 260,
        maxDft: 320,
        recoat: 4,
        cure: 336,
      },
      {
        code: "NORSOK-M501-SYS7",
        name: "NORSOK M-501 System 7",
        system: "TSA + Epoxy seal coat",
        dft: 250,
        cat: "C5-M",
        dur: "High (>25yr)",
        costUsd: 70.0,
        costZar: 1310,
        coverage: 3.5,
        labor: 2.2,
        minDft: 200,
        maxDft: 350,
        recoat: 8,
        cure: 168,
      },
      {
        code: "FBE-STANDARD",
        name: "Fusion Bonded Epoxy",
        system: "Single coat FBE",
        dft: 400,
        cat: "Buried",
        dur: "High (>25yr)",
        costUsd: 25.0,
        costZar: 470,
        coverage: null,
        labor: 1.5,
        minDft: 350,
        maxDft: 500,
        recoat: null,
        cure: 0,
      },
      {
        code: "3LPE",
        name: "3-Layer Polyethylene",
        system: "FBE + Adhesive + PE",
        dft: 2500,
        cat: "Buried",
        dur: "High (>40yr)",
        costUsd: 45.0,
        costZar: 845,
        coverage: null,
        labor: 1.8,
        minDft: 1800,
        maxDft: 3000,
        recoat: null,
        cure: 0,
      },
      {
        code: "3LPP",
        name: "3-Layer Polypropylene",
        system: "FBE + Adhesive + PP",
        dft: 2500,
        cat: "Buried/HT",
        dur: "High (>40yr)",
        costUsd: 55.0,
        costZar: 1030,
        coverage: null,
        labor: 1.8,
        minDft: 1800,
        maxDft: 3000,
        recoat: null,
        cure: 0,
      },
    ];

    for (const c of coatingCostData) {
      await queryRunner.query(
        `INSERT INTO coating_specification (code, name, coating_system, total_dft_microns, corrosivity_category, durability_years, cost_per_square_meter_usd, cost_per_square_meter_zar, coverage_m2_per_liter, labor_cost_factor, min_dft_microns, max_dft_microns, recoat_interval_hours, full_cure_hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name, coating_system = EXCLUDED.coating_system,
           total_dft_microns = EXCLUDED.total_dft_microns,
           corrosivity_category = EXCLUDED.corrosivity_category,
           durability_years = EXCLUDED.durability_years,
           cost_per_square_meter_usd = EXCLUDED.cost_per_square_meter_usd,
           cost_per_square_meter_zar = EXCLUDED.cost_per_square_meter_zar,
           coverage_m2_per_liter = EXCLUDED.coverage_m2_per_liter,
           labor_cost_factor = EXCLUDED.labor_cost_factor,
           min_dft_microns = EXCLUDED.min_dft_microns,
           max_dft_microns = EXCLUDED.max_dft_microns,
           recoat_interval_hours = EXCLUDED.recoat_interval_hours,
           full_cure_hours = EXCLUDED.full_cure_hours`,
        [
          c.code,
          c.name,
          c.system,
          c.dft,
          c.cat,
          c.dur,
          c.costUsd,
          c.costZar,
          c.coverage,
          c.labor,
          c.minDft,
          c.maxDft,
          c.recoat,
          c.cure,
        ],
      );
    }

    // ============================================================
    // PART 4: PIPE SCHEDULES API SUPPORT
    // ============================================================
    console.warn("Adding pipe schedules API support data...");

    // Check if pipe_schedules table exists before altering
    const pipeSchedulesExists = await queryRunner.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pipe_schedules')
    `);

    if (pipeSchedulesExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE pipe_schedules
        ADD COLUMN IF NOT EXISTS is_stainless BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_standard BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS applicable_standards TEXT
      `);
    }

    // Create standard schedule metadata table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pipe_schedule_metadata (
        id SERIAL PRIMARY KEY,
        schedule_code VARCHAR(20) NOT NULL UNIQUE,
        schedule_name VARCHAR(50) NOT NULL,
        standard VARCHAR(50),
        is_stainless BOOLEAN DEFAULT false,
        display_order INTEGER DEFAULT 0,
        size_range_min_nps VARCHAR(10),
        size_range_max_nps VARCHAR(10),
        notes TEXT
      )
    `);

    const scheduleMetadata = [
      {
        code: "5S",
        name: "Schedule 5S",
        std: "ASME B36.19",
        ss: true,
        order: 1,
        min: "1/2",
        max: "30",
      },
      {
        code: "10S",
        name: "Schedule 10S",
        std: "ASME B36.19",
        ss: true,
        order: 2,
        min: "1/2",
        max: "30",
      },
      {
        code: "40S",
        name: "Schedule 40S",
        std: "ASME B36.19",
        ss: true,
        order: 3,
        min: "1/8",
        max: "12",
      },
      {
        code: "80S",
        name: "Schedule 80S",
        std: "ASME B36.19",
        ss: true,
        order: 4,
        min: "1/8",
        max: "12",
      },
      {
        code: "STD",
        name: "Standard",
        std: "ASME B36.10",
        ss: false,
        order: 10,
        min: "1/8",
        max: "48",
      },
      {
        code: "XS",
        name: "Extra Strong",
        std: "ASME B36.10",
        ss: false,
        order: 11,
        min: "1/8",
        max: "48",
      },
      {
        code: "XXS",
        name: "Double Extra Strong",
        std: "ASME B36.10",
        ss: false,
        order: 12,
        min: "1/2",
        max: "24",
      },
      {
        code: "10",
        name: "Schedule 10",
        std: "ASME B36.10",
        ss: false,
        order: 20,
        min: "1/8",
        max: "48",
      },
      {
        code: "20",
        name: "Schedule 20",
        std: "ASME B36.10",
        ss: false,
        order: 21,
        min: "8",
        max: "48",
      },
      {
        code: "30",
        name: "Schedule 30",
        std: "ASME B36.10",
        ss: false,
        order: 22,
        min: "8",
        max: "48",
      },
      {
        code: "40",
        name: "Schedule 40",
        std: "ASME B36.10",
        ss: false,
        order: 23,
        min: "1/8",
        max: "48",
      },
      {
        code: "60",
        name: "Schedule 60",
        std: "ASME B36.10",
        ss: false,
        order: 24,
        min: "4",
        max: "48",
      },
      {
        code: "80",
        name: "Schedule 80",
        std: "ASME B36.10",
        ss: false,
        order: 25,
        min: "1/8",
        max: "48",
      },
      {
        code: "100",
        name: "Schedule 100",
        std: "ASME B36.10",
        ss: false,
        order: 26,
        min: "8",
        max: "48",
      },
      {
        code: "120",
        name: "Schedule 120",
        std: "ASME B36.10",
        ss: false,
        order: 27,
        min: "4",
        max: "48",
      },
      {
        code: "140",
        name: "Schedule 140",
        std: "ASME B36.10",
        ss: false,
        order: 28,
        min: "8",
        max: "48",
      },
      {
        code: "160",
        name: "Schedule 160",
        std: "ASME B36.10",
        ss: false,
        order: 29,
        min: "1/2",
        max: "48",
      },
      {
        code: "SABS62-L",
        name: "SABS 62 Light",
        std: "SABS 62",
        ss: false,
        order: 50,
        min: "15",
        max: "150",
      },
      {
        code: "SABS62-M",
        name: "SABS 62 Medium",
        std: "SABS 62",
        ss: false,
        order: 51,
        min: "15",
        max: "150",
      },
      {
        code: "SABS62-H",
        name: "SABS 62 Heavy",
        std: "SABS 62",
        ss: false,
        order: 52,
        min: "15",
        max: "150",
      },
      {
        code: "SABS719",
        name: "SABS 719",
        std: "SABS 719",
        ss: false,
        order: 60,
        min: "200",
        max: "2200",
      },
    ];

    for (const s of scheduleMetadata) {
      await queryRunner.query(
        `INSERT INTO pipe_schedule_metadata (schedule_code, schedule_name, standard, is_stainless, display_order, size_range_min_nps, size_range_max_nps)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (schedule_code) DO UPDATE SET
           schedule_name = EXCLUDED.schedule_name, standard = EXCLUDED.standard,
           is_stainless = EXCLUDED.is_stainless, display_order = EXCLUDED.display_order,
           size_range_min_nps = EXCLUDED.size_range_min_nps, size_range_max_nps = EXCLUDED.size_range_max_nps`,
        [s.code, s.name, s.std, s.ss, s.order, s.min, s.max],
      );
    }

    console.warn("Valve, Gasket, Coating, and Pipe Schedule modules complete.");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP VIEW IF EXISTS v_pipe_schedule_lookup");
    await queryRunner.query("DROP TABLE IF EXISTS pipe_schedule_metadata");
    await queryRunner.query("DROP TABLE IF EXISTS gasket_flange_compatibility");
    await queryRunner.query("DROP TABLE IF EXISTS gasket_specifications");
    await queryRunner.query("DROP TABLE IF EXISTS gasket_materials");
    await queryRunner.query("DROP TABLE IF EXISTS valves");
    await queryRunner.query("DROP TABLE IF EXISTS valve_body_materials");
    await queryRunner.query("DROP TABLE IF EXISTS valve_pressure_classes");
    await queryRunner.query("DROP TABLE IF EXISTS valve_end_connections");
    await queryRunner.query("DROP TABLE IF EXISTS valve_types");
  }
}
