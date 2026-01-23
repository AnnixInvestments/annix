import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPtCurvesAndWpsModule1775100000000
  implements MigrationInterface
{
  name = 'AddPtCurvesAndWpsModule1775100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding P-T derating curves and WPS module (Pass 6 - Final)...');

    // ============================================================
    // PART 1: Pressure-Temperature Derating Curves
    // ============================================================
    console.warn('Adding pressure-temperature derating curves data structure...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pt_derating_curves (
        id SERIAL PRIMARY KEY,
        material_code VARCHAR(50) NOT NULL,
        pressure_class VARCHAR(20) NOT NULL,
        curve_type VARCHAR(30) NOT NULL,
        description TEXT,
        reference_standard VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(material_code, pressure_class, curve_type)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pt_derating_points (
        id SERIAL PRIMARY KEY,
        curve_id INTEGER NOT NULL REFERENCES pt_derating_curves(id) ON DELETE CASCADE,
        temperature_c DECIMAL(8,2) NOT NULL,
        temperature_f DECIMAL(8,2),
        pressure_rating_percent DECIMAL(6,2) NOT NULL,
        allowable_stress_ksi DECIMAL(8,2),
        notes VARCHAR(200),
        UNIQUE(curve_id, temperature_c)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pt_derating_points_curve ON pt_derating_points(curve_id)
    `);

    const ptCurves = [
      {
        mat: 'A106 Grade B',
        pc: 'Class 150',
        type: 'ASME B16.5',
        desc: 'Carbon steel flange P-T rating per ASME B16.5',
        ref: 'ASME B16.5-2020 Table 2-1.1',
        points: [
          { tempC: -29, pct: 100, ksi: 20.0 },
          { tempC: 38, pct: 100, ksi: 20.0 },
          { tempC: 93, pct: 96, ksi: 19.2 },
          { tempC: 149, pct: 91, ksi: 18.2 },
          { tempC: 204, pct: 85, ksi: 17.0 },
          { tempC: 260, pct: 78, ksi: 15.6 },
          { tempC: 316, pct: 69, ksi: 13.8 },
          { tempC: 343, pct: 62, ksi: 12.4 },
          { tempC: 371, pct: 54, ksi: 10.8 },
          { tempC: 399, pct: 45, ksi: 9.0 },
          { tempC: 427, pct: 35, ksi: 7.0 },
          { tempC: 454, pct: 25, ksi: 5.0 },
        ],
      },
      {
        mat: 'A106 Grade B',
        pc: 'Class 300',
        type: 'ASME B16.5',
        desc: 'Carbon steel flange P-T rating per ASME B16.5',
        ref: 'ASME B16.5-2020 Table 2-1.2',
        points: [
          { tempC: -29, pct: 100, ksi: 20.0 },
          { tempC: 38, pct: 100, ksi: 20.0 },
          { tempC: 93, pct: 96, ksi: 19.2 },
          { tempC: 149, pct: 91, ksi: 18.2 },
          { tempC: 204, pct: 85, ksi: 17.0 },
          { tempC: 260, pct: 78, ksi: 15.6 },
          { tempC: 316, pct: 69, ksi: 13.8 },
          { tempC: 343, pct: 62, ksi: 12.4 },
          { tempC: 371, pct: 54, ksi: 10.8 },
          { tempC: 399, pct: 45, ksi: 9.0 },
          { tempC: 427, pct: 35, ksi: 7.0 },
          { tempC: 454, pct: 25, ksi: 5.0 },
        ],
      },
      {
        mat: 'A312 TP304',
        pc: 'Class 150',
        type: 'ASME B16.5',
        desc: 'Austenitic stainless flange P-T rating',
        ref: 'ASME B16.5-2020 Table 2-2.1',
        points: [
          { tempC: -254, pct: 100, ksi: 20.0 },
          { tempC: -29, pct: 100, ksi: 20.0 },
          { tempC: 38, pct: 100, ksi: 20.0 },
          { tempC: 93, pct: 100, ksi: 20.0 },
          { tempC: 149, pct: 100, ksi: 20.0 },
          { tempC: 204, pct: 100, ksi: 20.0 },
          { tempC: 260, pct: 95, ksi: 19.0 },
          { tempC: 316, pct: 88, ksi: 17.6 },
          { tempC: 371, pct: 81, ksi: 16.2 },
          { tempC: 427, pct: 75, ksi: 15.0 },
          { tempC: 482, pct: 70, ksi: 14.0 },
          { tempC: 538, pct: 65, ksi: 13.0 },
        ],
      },
      {
        mat: 'A312 TP316',
        pc: 'Class 150',
        type: 'ASME B16.5',
        desc: 'Austenitic stainless flange P-T rating',
        ref: 'ASME B16.5-2020 Table 2-2.1',
        points: [
          { tempC: -254, pct: 100, ksi: 20.0 },
          { tempC: -29, pct: 100, ksi: 20.0 },
          { tempC: 38, pct: 100, ksi: 20.0 },
          { tempC: 93, pct: 100, ksi: 20.0 },
          { tempC: 149, pct: 100, ksi: 20.0 },
          { tempC: 204, pct: 100, ksi: 20.0 },
          { tempC: 260, pct: 96, ksi: 19.2 },
          { tempC: 316, pct: 90, ksi: 18.0 },
          { tempC: 371, pct: 84, ksi: 16.8 },
          { tempC: 427, pct: 78, ksi: 15.6 },
          { tempC: 482, pct: 73, ksi: 14.6 },
          { tempC: 538, pct: 68, ksi: 13.6 },
        ],
      },
      {
        mat: 'A335 P11',
        pc: 'Class 300',
        type: 'ASME B16.5',
        desc: 'Chrome-moly flange P-T rating',
        ref: 'ASME B16.5-2020 Table 2-1.8',
        points: [
          { tempC: -29, pct: 100, ksi: 17.1 },
          { tempC: 38, pct: 100, ksi: 17.1 },
          { tempC: 93, pct: 100, ksi: 17.1 },
          { tempC: 149, pct: 100, ksi: 17.1 },
          { tempC: 204, pct: 100, ksi: 17.1 },
          { tempC: 260, pct: 100, ksi: 17.1 },
          { tempC: 316, pct: 100, ksi: 17.1 },
          { tempC: 371, pct: 100, ksi: 17.1 },
          { tempC: 427, pct: 96, ksi: 16.4 },
          { tempC: 482, pct: 85, ksi: 14.5 },
          { tempC: 538, pct: 68, ksi: 11.6 },
          { tempC: 566, pct: 52, ksi: 8.9 },
        ],
      },
      {
        mat: 'A335 P22',
        pc: 'Class 300',
        type: 'ASME B16.5',
        desc: 'Chrome-moly flange P-T rating',
        ref: 'ASME B16.5-2020 Table 2-1.9',
        points: [
          { tempC: -29, pct: 100, ksi: 17.1 },
          { tempC: 38, pct: 100, ksi: 17.1 },
          { tempC: 93, pct: 100, ksi: 17.1 },
          { tempC: 149, pct: 100, ksi: 17.1 },
          { tempC: 204, pct: 100, ksi: 17.1 },
          { tempC: 260, pct: 100, ksi: 17.1 },
          { tempC: 316, pct: 100, ksi: 17.1 },
          { tempC: 371, pct: 100, ksi: 17.1 },
          { tempC: 427, pct: 100, ksi: 17.1 },
          { tempC: 482, pct: 92, ksi: 15.7 },
          { tempC: 538, pct: 77, ksi: 13.2 },
          { tempC: 593, pct: 54, ksi: 9.2 },
        ],
      },
      {
        mat: 'A790 S31803',
        pc: 'Class 150',
        type: 'ASME B16.5',
        desc: 'Duplex stainless flange P-T rating',
        ref: 'ASME B16.5-2020 Table 2-3.7',
        points: [
          { tempC: -46, pct: 100, ksi: 25.0 },
          { tempC: 38, pct: 100, ksi: 25.0 },
          { tempC: 93, pct: 100, ksi: 25.0 },
          { tempC: 149, pct: 98, ksi: 24.5 },
          { tempC: 204, pct: 94, ksi: 23.5 },
          { tempC: 260, pct: 88, ksi: 22.0 },
          { tempC: 316, pct: 80, ksi: 20.0 },
        ],
      },
    ];

    for (const curve of ptCurves) {
      const result = await queryRunner.query(
        `
        INSERT INTO pt_derating_curves (material_code, pressure_class, curve_type, description, reference_standard)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (material_code, pressure_class, curve_type) DO UPDATE SET
          description = EXCLUDED.description,
          reference_standard = EXCLUDED.reference_standard
        RETURNING id
      `,
        [curve.mat, curve.pc, curve.type, curve.desc, curve.ref]
      );

      const curveId = result[0]?.id;
      if (curveId) {
        for (const pt of curve.points) {
          const tempF = (pt.tempC * 9) / 5 + 32;
          await queryRunner.query(
            `
            INSERT INTO pt_derating_points (curve_id, temperature_c, temperature_f, pressure_rating_percent, allowable_stress_ksi)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (curve_id, temperature_c) DO UPDATE SET
              temperature_f = EXCLUDED.temperature_f,
              pressure_rating_percent = EXCLUDED.pressure_rating_percent,
              allowable_stress_ksi = EXCLUDED.allowable_stress_ksi
          `,
            [curveId, pt.tempC, tempF.toFixed(2), pt.pct, pt.ksi]
          );
        }
      }
    }

    // ============================================================
    // PART 2: Weld Procedure Specification (WPS) Module
    // ============================================================
    console.warn('Adding WPS module database structure...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS welding_processes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        aws_designation VARCHAR(20),
        description TEXT,
        typical_applications TEXT
      )
    `);

    const weldingProcesses = [
      { code: 'SMAW', name: 'Shielded Metal Arc Welding', aws: 'SMAW', desc: 'Manual process using consumable electrode with flux coating', apps: 'Field welding, repairs, all positions' },
      { code: 'GTAW', name: 'Gas Tungsten Arc Welding', aws: 'GTAW', desc: 'Uses non-consumable tungsten electrode with inert gas shield', apps: 'Root passes, thin materials, critical welds, stainless/nickel alloys' },
      { code: 'GMAW', name: 'Gas Metal Arc Welding', aws: 'GMAW', desc: 'Semi-automatic process with continuous wire feed', apps: 'Production welding, fill passes, carbon steel' },
      { code: 'FCAW', name: 'Flux Cored Arc Welding', aws: 'FCAW', desc: 'Uses tubular wire with flux core', apps: 'Field welding, high deposition, structural steel' },
      { code: 'SAW', name: 'Submerged Arc Welding', aws: 'SAW', desc: 'Arc submerged under granular flux blanket', apps: 'Heavy section, longitudinal seams, pressure vessel' },
      { code: 'PAW', name: 'Plasma Arc Welding', aws: 'PAW', desc: 'Constricted arc with plasma gas', apps: 'Precision welding, keyhole technique, thin materials' },
      { code: 'ESW', name: 'Electroslag Welding', aws: 'ESW', desc: 'Molten slag pool welding for thick sections', apps: 'Heavy sections >25mm, vertical welds' },
      { code: 'EGW', name: 'Electrogas Welding', aws: 'EGW', desc: 'Similar to ESW with gas shielding', apps: 'Vertical seams, shipbuilding' },
    ];

    for (const p of weldingProcesses) {
      await queryRunner.query(
        `
        INSERT INTO welding_processes (code, name, aws_designation, description, typical_applications)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          aws_designation = EXCLUDED.aws_designation,
          description = EXCLUDED.description,
          typical_applications = EXCLUDED.typical_applications
      `,
        [p.code, p.name, p.aws, p.desc, p.apps]
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS weld_joint_types (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        typical_groove_angle VARCHAR(50),
        root_opening_range VARCHAR(50)
      )
    `);

    const jointTypes = [
      { code: 'BW', name: 'Butt Weld', desc: 'Full penetration groove weld between aligned components', angle: '60-75°', root: '0-3mm' },
      { code: 'SW', name: 'Socket Weld', desc: 'Pipe inserted into socket fitting', angle: 'N/A', root: '1.5mm gap' },
      { code: 'FW', name: 'Fillet Weld', desc: 'Triangular cross-section weld at corner joint', angle: 'N/A', root: '0' },
      { code: 'CJP', name: 'Complete Joint Penetration', desc: 'Full thickness weld penetration', angle: '60-75°', root: '0-3mm' },
      { code: 'PJP', name: 'Partial Joint Penetration', desc: 'Less than full thickness penetration', angle: '45-60°', root: '0' },
      { code: 'BJ', name: 'Branch Joint', desc: 'Set-on or set-in branch connection', angle: 'Varies', root: '0-3mm' },
    ];

    for (const j of jointTypes) {
      await queryRunner.query(
        `
        INSERT INTO weld_joint_types (code, name, description, typical_groove_angle, root_opening_range)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          typical_groove_angle = EXCLUDED.typical_groove_angle,
          root_opening_range = EXCLUDED.root_opening_range
      `,
        [j.code, j.name, j.desc, j.angle, j.root]
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS weld_positions (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        asme_designation VARCHAR(10),
        aws_designation VARCHAR(10),
        description TEXT
      )
    `);

    const weldPositions = [
      { code: '1G', name: 'Flat - Groove', asme: '1G', aws: '1G', desc: 'Pipe horizontal, rotated, weld on top' },
      { code: '1F', name: 'Flat - Fillet', asme: '1F', aws: '1F', desc: 'Horizontal surface, weld deposited flat' },
      { code: '2G', name: 'Horizontal - Groove', asme: '2G', aws: '2G', desc: 'Pipe vertical, weld horizontal' },
      { code: '2F', name: 'Horizontal - Fillet', asme: '2F', aws: '2F', desc: 'Horizontal fillet on vertical surface' },
      { code: '3G', name: 'Vertical - Groove', asme: '3G', aws: '3G', desc: 'Vertical plate, weld vertical' },
      { code: '3F', name: 'Vertical - Fillet', asme: '3F', aws: '3F', desc: 'Vertical fillet weld' },
      { code: '4G', name: 'Overhead - Groove', asme: '4G', aws: '4G', desc: 'Horizontal plate, weld underneath' },
      { code: '4F', name: 'Overhead - Fillet', asme: '4F', aws: '4F', desc: 'Overhead fillet weld' },
      { code: '5G', name: 'Pipe Fixed Horizontal', asme: '5G', aws: '5G', desc: 'Pipe horizontal, fixed, weld all around' },
      { code: '6G', name: 'Pipe Fixed 45°', asme: '6G', aws: '6G', desc: 'Pipe inclined 45°, fixed, weld all around' },
      { code: '6GR', name: 'Pipe Fixed 45° Restricted', asme: '6GR', aws: '6GR', desc: '6G with restriction ring' },
    ];

    for (const p of weldPositions) {
      await queryRunner.query(
        `
        INSERT INTO weld_positions (code, name, asme_designation, aws_designation, description)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          asme_designation = EXCLUDED.asme_designation,
          aws_designation = EXCLUDED.aws_designation,
          description = EXCLUDED.description
      `,
        [p.code, p.name, p.asme, p.aws, p.desc]
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS weld_procedure_specifications (
        id SERIAL PRIMARY KEY,
        wps_number VARCHAR(50) NOT NULL UNIQUE,
        revision VARCHAR(10) DEFAULT 'A',
        status VARCHAR(20) DEFAULT 'Draft',
        title VARCHAR(200),
        base_metal_p_number VARCHAR(20),
        base_metal_group VARCHAR(20),
        base_metal_spec VARCHAR(100),
        filler_metal_f_number VARCHAR(20),
        filler_metal_a_number VARCHAR(20),
        filler_metal_spec VARCHAR(100),
        thickness_range_min_mm DECIMAL(8,2),
        thickness_range_max_mm DECIMAL(8,2),
        diameter_range_min_mm DECIMAL(8,2),
        diameter_range_max_mm DECIMAL(8,2),
        preheat_min_c INTEGER,
        interpass_max_c INTEGER,
        pwht_required BOOLEAN DEFAULT false,
        pwht_temp_c INTEGER,
        pwht_time_hours DECIMAL(6,2),
        backing_type VARCHAR(50),
        shielding_gas VARCHAR(100),
        purge_gas VARCHAR(100),
        supporting_pqr VARCHAR(100),
        approved_by VARCHAR(100),
        approval_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS wps_weld_passes (
        id SERIAL PRIMARY KEY,
        wps_id INTEGER NOT NULL REFERENCES weld_procedure_specifications(id) ON DELETE CASCADE,
        pass_type VARCHAR(20) NOT NULL,
        process_id INTEGER REFERENCES welding_processes(id),
        filler_class VARCHAR(50),
        filler_diameter_mm DECIMAL(4,2),
        amperage_min INTEGER,
        amperage_max INTEGER,
        voltage_min DECIMAL(4,1),
        voltage_max DECIMAL(4,1),
        travel_speed_min_mmpm INTEGER,
        travel_speed_max_mmpm INTEGER,
        heat_input_max_kjmm DECIMAL(6,2),
        technique VARCHAR(50),
        oscillation VARCHAR(50),
        string_or_weave VARCHAR(20)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS procedure_qualification_records (
        id SERIAL PRIMARY KEY,
        pqr_number VARCHAR(50) NOT NULL UNIQUE,
        revision VARCHAR(10) DEFAULT 'A',
        wps_id INTEGER REFERENCES weld_procedure_specifications(id),
        test_date DATE,
        welder_name VARCHAR(100),
        welder_id VARCHAR(50),
        base_metal_heat_number VARCHAR(100),
        filler_metal_heat_number VARCHAR(100),
        test_coupon_thickness_mm DECIMAL(8,2),
        test_coupon_diameter_mm DECIMAL(8,2),
        visual_inspection VARCHAR(20),
        pt_mt_result VARCHAR(20),
        rt_ut_result VARCHAR(20),
        bend_test_result VARCHAR(20),
        tensile_test_result VARCHAR(20),
        tensile_value_mpa DECIMAL(8,2),
        impact_test_result VARCHAR(20),
        impact_value_joules DECIMAL(8,2),
        impact_temp_c INTEGER,
        hardness_test_result VARCHAR(20),
        hardness_value_hv DECIMAL(8,2),
        macro_exam_result VARCHAR(20),
        witness_name VARCHAR(100),
        witness_organization VARCHAR(100),
        approval_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS welder_qualifications (
        id SERIAL PRIMARY KEY,
        welder_id VARCHAR(50) NOT NULL,
        welder_name VARCHAR(100) NOT NULL,
        employer VARCHAR(200),
        process_id INTEGER REFERENCES welding_processes(id),
        position_id INTEGER REFERENCES weld_positions(id),
        base_metal_p_number VARCHAR(20),
        filler_metal_f_number VARCHAR(20),
        thickness_qualified_max_mm DECIMAL(8,2),
        diameter_qualified_min_mm DECIMAL(8,2),
        qualification_date DATE,
        expiry_date DATE,
        continuity_maintained BOOLEAN DEFAULT true,
        last_weld_date DATE,
        pqr_reference VARCHAR(50),
        certificate_number VARCHAR(100),
        certifying_organization VARCHAR(200),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(welder_id, process_id, position_id, base_metal_p_number)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_welder_qual_welder ON welder_qualifications(welder_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_welder_qual_expiry ON welder_qualifications(expiry_date)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS asme_p_numbers (
        id SERIAL PRIMARY KEY,
        p_number VARCHAR(10) NOT NULL,
        group_number VARCHAR(10),
        material_description TEXT NOT NULL,
        typical_specs TEXT,
        nominal_composition TEXT,
        product_forms TEXT,
        UNIQUE(p_number, group_number)
      )
    `);

    const pNumbers = [
      { p: '1', g: '1', desc: 'Carbon steel', specs: 'A106 Gr B, A53 Gr B, A516 Gr 70', comp: 'C-Mn', forms: 'Pipe, plate, forgings' },
      { p: '1', g: '2', desc: 'Carbon steel (higher strength)', specs: 'A516 Gr 70, A537 Cl 1', comp: 'C-Mn-Si', forms: 'Plate, forgings' },
      { p: '3', g: '1', desc: 'Alloy steel (0.5% Cr max)', specs: 'A335 P1, A234 WP1', comp: '0.5Mo', forms: 'Pipe, fittings' },
      { p: '3', g: '2', desc: 'Alloy steel (0.5% Cr max)', specs: 'A335 P2', comp: '0.5Cr-0.5Mo', forms: 'Pipe' },
      { p: '4', g: '1', desc: 'Alloy steel (0.75-2% Cr)', specs: 'A335 P11, P12', comp: '1-1.25Cr-0.5Mo', forms: 'Pipe, fittings, plate' },
      { p: '4', g: '2', desc: 'Alloy steel (0.75-2% Cr)', specs: 'A335 P11', comp: '1.25Cr-0.5Mo-Si', forms: 'Pipe' },
      { p: '5A', g: '1', desc: 'Alloy steel (2.25-3% Cr)', specs: 'A335 P22, A387 Gr 22', comp: '2.25Cr-1Mo', forms: 'Pipe, plate' },
      { p: '5B', g: '1', desc: 'Alloy steel (5-9% Cr)', specs: 'A335 P5, P5b', comp: '5Cr-0.5Mo', forms: 'Pipe' },
      { p: '5B', g: '2', desc: 'Alloy steel (5-9% Cr)', specs: 'A335 P9', comp: '9Cr-1Mo', forms: 'Pipe' },
      { p: '5C', g: '1', desc: 'Alloy steel (creep enhanced)', specs: 'A335 P91', comp: '9Cr-1Mo-V', forms: 'Pipe, plate, forgings' },
      { p: '5C', g: '2', desc: 'Alloy steel (creep enhanced)', specs: 'A335 P92', comp: '9Cr-2W', forms: 'Pipe' },
      { p: '6', g: '1', desc: 'Martensitic stainless', specs: 'A268 TP410', comp: '13Cr', forms: 'Pipe, plate' },
      { p: '6', g: '2', desc: 'Martensitic stainless', specs: 'A268 TP410S', comp: '13Cr low C', forms: 'Pipe' },
      { p: '7', g: '1', desc: 'Ferritic stainless', specs: 'A268 TP430', comp: '17Cr', forms: 'Pipe, plate' },
      { p: '8', g: '1', desc: 'Austenitic stainless', specs: 'A312 TP304, TP304L', comp: '18Cr-8Ni', forms: 'Pipe, plate, fittings' },
      { p: '8', g: '2', desc: 'Austenitic stainless (316)', specs: 'A312 TP316, TP316L', comp: '16Cr-12Ni-2Mo', forms: 'Pipe, plate, fittings' },
      { p: '8', g: '3', desc: 'Austenitic stainless (high Cr)', specs: 'A312 TP309, TP310', comp: '23-25Cr-12-20Ni', forms: 'Pipe' },
      { p: '8', g: '4', desc: 'Austenitic stainless (stabilized)', specs: 'A312 TP321, TP347', comp: '18Cr-10Ni-Ti/Nb', forms: 'Pipe, plate' },
      { p: '10H', g: '1', desc: 'Duplex stainless', specs: 'A790 S31803, S32205', comp: '22Cr-5Ni-3Mo-N', forms: 'Pipe, plate' },
      { p: '10H', g: '2', desc: 'Super duplex stainless', specs: 'A790 S32750, S32760', comp: '25Cr-7Ni-4Mo-N', forms: 'Pipe' },
      { p: '41', g: null, desc: 'Nickel and nickel base alloys', specs: 'B165 (400), B168 (600)', comp: 'Ni, Ni-Cu, Ni-Cr', forms: 'Pipe, plate' },
      { p: '43', g: null, desc: 'Nickel-chromium-iron alloys', specs: 'B444 (625), B619 (C-276)', comp: 'Ni-Cr-Mo', forms: 'Pipe, plate' },
    ];

    for (const p of pNumbers) {
      await queryRunner.query(
        `
        INSERT INTO asme_p_numbers (p_number, group_number, material_description, typical_specs, nominal_composition, product_forms)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (p_number, group_number) DO UPDATE SET
          material_description = EXCLUDED.material_description,
          typical_specs = EXCLUDED.typical_specs,
          nominal_composition = EXCLUDED.nominal_composition,
          product_forms = EXCLUDED.product_forms
      `,
        [p.p, p.g, p.desc, p.specs, p.comp, p.forms]
      );
    }

    console.warn('P-T derating curves and WPS module complete.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS welder_qualifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS procedure_qualification_records`);
    await queryRunner.query(`DROP TABLE IF EXISTS wps_weld_passes`);
    await queryRunner.query(`DROP TABLE IF EXISTS weld_procedure_specifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS asme_p_numbers`);
    await queryRunner.query(`DROP TABLE IF EXISTS weld_positions`);
    await queryRunner.query(`DROP TABLE IF EXISTS weld_joint_types`);
    await queryRunner.query(`DROP TABLE IF EXISTS welding_processes`);
    await queryRunner.query(`DROP TABLE IF EXISTS pt_derating_points`);
    await queryRunner.query(`DROP TABLE IF EXISTS pt_derating_curves`);
  }
}
