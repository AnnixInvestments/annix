import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAsmeB313ProcessPipingData1777800000002
  implements MigrationInterface
{
  name = 'AddAsmeB313ProcessPipingData1777800000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding ASME B31.3 process piping data...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS miter_bend_limits (
        id SERIAL PRIMARY KEY,
        miter_type VARCHAR(30) NOT NULL,
        max_angle_degrees DECIMAL(4,1) NOT NULL,
        service_type VARCHAR(30) NOT NULL,
        calculation_method VARCHAR(30) NOT NULL,
        notes TEXT,
        standard VARCHAR(20) DEFAULT 'ASME B31.3',
        UNIQUE(miter_type, service_type)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bend_flattening_limits (
        id SERIAL PRIMARY KEY,
        service_type VARCHAR(30) NOT NULL UNIQUE,
        max_flattening_percent DECIMAL(4,1) NOT NULL,
        description TEXT,
        standard VARCHAR(20) DEFAULT 'ASME B31.3'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pipe_quality_factors (
        id SERIAL PRIMARY KEY,
        pipe_type VARCHAR(50) NOT NULL,
        quality_factor_e DECIMAL(4,2) NOT NULL,
        requires_rt BOOLEAN DEFAULT false,
        description TEXT,
        standard VARCHAR(20) DEFAULT 'ASME B31.3',
        UNIQUE(pipe_type, quality_factor_e)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stress_intensification_factors (
        id SERIAL PRIMARY KEY,
        component_type VARCHAR(50) NOT NULL,
        in_plane_sif_formula TEXT,
        out_plane_sif_formula TEXT,
        flexibility_factor_formula TEXT,
        notes TEXT,
        standard VARCHAR(20) DEFAULT 'ASME B31.3',
        UNIQUE(component_type, standard)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS branch_reinforcement_rules (
        id SERIAL PRIMARY KEY,
        rule_type VARCHAR(50) NOT NULL,
        formula TEXT,
        description TEXT NOT NULL,
        section_reference VARCHAR(20),
        standard VARCHAR(20) DEFAULT 'ASME B31.3'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS nde_requirements (
        id SERIAL PRIMARY KEY,
        service_category VARCHAR(30) NOT NULL,
        nde_method VARCHAR(30) NOT NULL,
        extent_percent INTEGER NOT NULL,
        description TEXT,
        standard VARCHAR(20) DEFAULT 'ASME B31.3',
        UNIQUE(service_category, nde_method)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS b313_weld_requirements (
        id SERIAL PRIMARY KEY,
        joint_type VARCHAR(30) NOT NULL UNIQUE,
        application TEXT NOT NULL,
        min_weld_size_formula TEXT,
        special_requirements TEXT,
        standard VARCHAR(20) DEFAULT 'ASME B31.3'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS flange_weld_types (
        id SERIAL PRIMARY KEY,
        flange_type VARCHAR(30) NOT NULL,
        weld_type VARCHAR(50) NOT NULL,
        weld_location VARCHAR(20) NOT NULL,
        min_size_formula TEXT,
        notes TEXT,
        standard VARCHAR(20) DEFAULT 'ASME B31.3',
        UNIQUE(flange_type, weld_location)
      )
    `);

    const miterBendData = [
      [
        'single_miter',
        22.5,
        'normal',
        'equation_4a',
        'Use equation (4a) for single miter <= 22.5 deg',
      ],
      [
        'single_miter',
        45.0,
        'normal',
        'special_analysis',
        'Requires special analysis for angle > 22.5 deg',
      ],
      [
        'multiple_miter',
        22.5,
        'normal',
        'equation_4a',
        'Per cut angle for multiple miters',
      ],
      [
        'single_miter',
        22.5,
        'severe_cyclic',
        'equation_4a',
        'Maximum angle for severe cyclic service',
      ],
      [
        'multiple_miter',
        22.5,
        'severe_cyclic',
        'equation_4a',
        'Per cut angle for severe cyclic service',
      ],
      [
        'direction_change',
        45.0,
        'severe_cyclic',
        'not_permitted',
        'Total direction change > 45 deg not permitted for severe cyclic',
      ],
    ];

    for (const [miterType, maxAngle, serviceType, calcMethod, notes] of miterBendData) {
      await queryRunner.query(
        `
        INSERT INTO miter_bend_limits (miter_type, max_angle_degrees, service_type, calculation_method, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (miter_type, service_type) DO UPDATE SET
          max_angle_degrees = $2,
          calculation_method = $4,
          notes = $5
      `,
        [miterType, maxAngle, serviceType, calcMethod, notes]
      );
    }

    const bendFlatteningData = [
      [
        'general_service',
        8.0,
        'Flattening shall not exceed 8% of outside diameter',
      ],
      [
        'severe_cyclic',
        5.0,
        'Flattening shall not exceed 5% for severe cyclic conditions',
      ],
    ];

    for (const [serviceType, maxFlattening, description] of bendFlatteningData) {
      await queryRunner.query(
        `
        INSERT INTO bend_flattening_limits (service_type, max_flattening_percent, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (service_type) DO UPDATE SET
          max_flattening_percent = $2,
          description = $3
      `,
        [serviceType, maxFlattening, description]
      );
    }

    const qualityFactorData = [
      ['seamless', 1.0, false, 'Seamless pipe (ASTM A106, A312, etc.)'],
      ['erw_no_rt', 0.85, false, 'Electric resistance welded without RT'],
      ['erw_with_rt', 1.0, true, 'Electric resistance welded with RT examination'],
      ['efw_no_rt', 0.85, false, 'Electric fusion welded without RT'],
      ['efw_with_rt', 1.0, true, 'Electric fusion welded with RT examination'],
      ['saw_no_rt', 0.85, false, 'Submerged arc welded without RT'],
      ['saw_with_rt', 1.0, true, 'Submerged arc welded with RT examination'],
      ['furnace_butt_welded', 0.6, false, 'Furnace butt welded (continuous)'],
      ['spiral_welded_no_rt', 0.85, false, 'Spiral welded without RT'],
      ['spiral_welded_with_rt', 1.0, true, 'Spiral welded with RT examination'],
    ];

    for (const [pipeType, factor, requiresRt, description] of qualityFactorData) {
      await queryRunner.query(
        `
        INSERT INTO pipe_quality_factors (pipe_type, quality_factor_e, requires_rt, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (pipe_type, quality_factor_e) DO UPDATE SET
          requires_rt = $3,
          description = $4
      `,
        [pipeType, factor, requiresRt, description]
      );
    }

    const sifData = [
      [
        'straight_pipe',
        '1.0',
        '1.0',
        '1.0',
        'Baseline reference component',
      ],
      [
        'welding_elbow',
        '0.9/h^(2/3)',
        '0.75/h^(2/3)',
        '1.65/h',
        'h = tR/r², where t=thickness, R=bend radius, r=pipe mean radius',
      ],
      [
        'miter_bend',
        'varies with θ',
        'varies with θ',
        'varies with θ/R',
        'θ = miter angle, use Appendix D formulas',
      ],
      [
        'welded_tee',
        '0.9/h^(2/3)',
        '0.75/h^(2/3)',
        null,
        'h = 4.4t/r, where t=header thickness, r=header mean radius',
      ],
      [
        'reinforced_fabricated_tee',
        '0.9/h^(2/3)',
        '0.75/h^(2/3)',
        null,
        'Requires reinforcement per 304.3.3',
      ],
      [
        'unreinforced_fabricated_tee',
        '3.1/h^(2/3)',
        '2.6/h^(2/3)',
        null,
        'h = t/r for branch connection',
      ],
      [
        'welding_neck_flange',
        '1.0',
        '1.0',
        '1.0',
        'Same as straight pipe',
      ],
      [
        'slip_on_flange',
        '1.2',
        '1.2',
        '1.0',
        'Higher SIF due to socket detail',
      ],
      [
        'socket_weld_flange',
        '1.3',
        '1.3',
        '1.0',
        'Higher SIF due to socket detail',
      ],
      ['lap_joint_flange', '1.6', '1.6', '1.0', 'Highest SIF of flange types'],
    ];

    for (const [componentType, inPlane, outPlane, flexibility, notes] of sifData) {
      await queryRunner.query(
        `
        INSERT INTO stress_intensification_factors (component_type, in_plane_sif_formula, out_plane_sif_formula, flexibility_factor_formula, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (component_type, standard) DO UPDATE SET
          in_plane_sif_formula = $2,
          out_plane_sif_formula = $3,
          flexibility_factor_formula = $4,
          notes = $5
      `,
        [componentType, inPlane, outPlane, flexibility, notes]
      );
    }

    const branchReinforcementData = [
      [
        'required_area',
        'A_req = t × d1 × (2 - sin β)',
        'Required reinforcement area for branch opening',
        '304.3.3',
      ],
      [
        'run_excess',
        'A1 = (Th - t) × d1 × (2 - sin β)',
        'Available area from excess thickness in run pipe',
        '304.3.3',
      ],
      [
        'branch_excess',
        'A2 = 2(Tb - tb) × h × (1/sin β)',
        'Available area from excess thickness in branch pipe',
        '304.3.3',
      ],
      [
        'reinforcement_pad',
        'A3 = pad area within zone',
        'Additional area from welded reinforcement pad',
        '304.3.3',
      ],
      [
        'weld_metal',
        'A4 = weld cross-section area',
        'Area contribution from attachment welds',
        '304.3.3',
      ],
      [
        'total_available',
        'A_avail = A1 + A2 + A3 + A4',
        'Total available reinforcement (must exceed A_req)',
        '304.3.3',
      ],
    ];

    for (const [ruleType, formula, description, section] of branchReinforcementData) {
      await queryRunner.query(
        `
        INSERT INTO branch_reinforcement_rules (rule_type, formula, description, section_reference)
        VALUES ($1, $2, $3, $4)
      `,
        [ruleType, formula, description, section]
      );
    }

    const ndeData = [
      ['category_d', 'visual', 100, 'Benign fluid service - visual only'],
      [
        'normal_fluid',
        'visual',
        100,
        'All welds require visual examination',
      ],
      [
        'normal_fluid',
        'random_rt',
        5,
        'Random RT per Table 341.3.2',
      ],
      ['category_m', 'radiographic', 100, 'Toxic fluid service - 100% RT or UT'],
      [
        'severe_cyclic',
        'radiographic',
        100,
        'Severe cyclic conditions - 100% RT or UT',
      ],
      ['high_pressure', 'radiographic', 100, 'High pressure piping - 100% RT or UT'],
      [
        'category_m',
        'liquid_penetrant',
        100,
        'Surface examination for toxic service',
      ],
      [
        'severe_cyclic',
        'liquid_penetrant',
        100,
        'Surface examination for cyclic service',
      ],
    ];

    for (const [category, method, extent, description] of ndeData) {
      await queryRunner.query(
        `
        INSERT INTO nde_requirements (service_category, nde_method, extent_percent, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (service_category, nde_method) DO UPDATE SET
          extent_percent = $3,
          description = $4
      `,
        [category, method, extent, description]
      );
    }

    const weldJointData = [
      [
        'butt_weld',
        'Pipe-to-pipe, pipe-to-fitting connections',
        'Full penetration',
        'Backing rings may be used for root pass',
      ],
      [
        'socket_weld',
        'Small bore connections <= NPS 2',
        'Fillet leg = 1.09 × tn',
        '1.5mm (1/16 in.) gap required at socket bottom',
      ],
      [
        'fillet_weld',
        'Branch attachments, reinforcement pads',
        'Leg = 0.7 × tb minimum',
        'Full encirclement required',
      ],
      [
        'seal_weld',
        'Threaded connections requiring leak-tightness',
        'Minimum 2 passes',
        'Threads must be fully engaged before welding',
      ],
    ];

    for (const [jointType, application, minSize, requirements] of weldJointData) {
      await queryRunner.query(
        `
        INSERT INTO b313_weld_requirements (joint_type, application, min_weld_size_formula, special_requirements)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (joint_type) DO UPDATE SET
          application = $2,
          min_weld_size_formula = $3,
          special_requirements = $4
      `,
        [jointType, application, minSize, requirements]
      );
    }

    const flangeWeldData = [
      [
        'slip_on',
        'fillet_weld',
        'inside',
        'throat = min(tn, Tf)',
        'Fillet weld at pipe-to-flange junction',
      ],
      [
        'slip_on',
        'fillet_weld',
        'outside',
        'throat = min(tn, Tf)',
        'Fillet weld at flange back face',
      ],
      [
        'welding_neck',
        'groove_weld',
        'butt',
        'full_penetration',
        'Full penetration groove weld at neck-to-pipe',
      ],
      [
        'socket_weld',
        'fillet_weld',
        'outside',
        'leg = 1.09 × tn',
        '1.5mm expansion gap required',
      ],
      [
        'lap_joint',
        'fillet_weld',
        'outside',
        'throat = min(tn, Tf)',
        'Weld to stub end only',
      ],
    ];

    for (const [flangeType, weldType, location, formula, notes] of flangeWeldData) {
      await queryRunner.query(
        `
        INSERT INTO flange_weld_types (flange_type, weld_type, weld_location, min_size_formula, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (flange_type, weld_location) DO UPDATE SET
          weld_type = $2,
          min_size_formula = $4,
          notes = $5
      `,
        [flangeType, weldType, location, formula, notes]
      );
    }

    console.warn('ASME B31.3 process piping data added successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS flange_weld_types`);
    await queryRunner.query(`DROP TABLE IF EXISTS b313_weld_requirements`);
    await queryRunner.query(`DROP TABLE IF EXISTS nde_requirements`);
    await queryRunner.query(`DROP TABLE IF EXISTS branch_reinforcement_rules`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS stress_intensification_factors`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS pipe_quality_factors`);
    await queryRunner.query(`DROP TABLE IF EXISTS bend_flattening_limits`);
    await queryRunner.query(`DROP TABLE IF EXISTS miter_bend_limits`);
  }
}
