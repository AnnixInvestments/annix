import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAsmeB31Tolerances1777800000000 implements MigrationInterface {
  name = 'AddAsmeB31Tolerances1777800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding ASME B31.1/B31.3 tolerances...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bend_ovality_tolerances (
        id SERIAL PRIMARY KEY,
        bend_radius_type VARCHAR(10) NOT NULL,
        bend_radius_factor DECIMAL(3,1) NOT NULL,
        pressure_service VARCHAR(30) NOT NULL,
        max_ovality_percent DECIMAL(4,1) NOT NULL,
        standard VARCHAR(20) DEFAULT 'ASME B31.3',
        notes TEXT,
        UNIQUE(bend_radius_type, pressure_service)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bend_wall_thinning_tolerances (
        id SERIAL PRIMARY KEY,
        bend_radius_type VARCHAR(10) NOT NULL,
        bend_radius_factor DECIMAL(3,1) NOT NULL,
        max_thinning_percent DECIMAL(4,1) NOT NULL,
        standard VARCHAR(20) NOT NULL,
        notes TEXT,
        UNIQUE(bend_radius_type, standard)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS flange_alignment_tolerances (
        id SERIAL PRIMARY KEY,
        min_nps DECIMAL(5,2) NOT NULL,
        max_nps DECIMAL(5,2),
        allowable_gap_mm DECIMAL(4,2) NOT NULL,
        allowable_gap_inch VARCHAR(10) NOT NULL,
        standard VARCHAR(20) DEFAULT 'ASME B31.3',
        notes TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS standard_pipe_sizes (
        id SERIAL PRIMARY KEY,
        nps VARCHAR(10) NOT NULL UNIQUE,
        nps_decimal DECIMAL(6,3) NOT NULL,
        is_typical BOOLEAN NOT NULL DEFAULT true,
        alternative_size VARCHAR(10),
        notes TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reducer_rules (
        id SERIAL PRIMARY KEY,
        rule_type VARCHAR(30) NOT NULL,
        max_reduction_steps INTEGER,
        max_included_angle_degrees DECIMAL(4,1),
        description TEXT NOT NULL,
        standard VARCHAR(20) DEFAULT 'ASME B31.3'
      )
    `);

    const ovalityData = [
      ['5D', 5.0, 'internal_only', 10.0, 'ASME B31.3', 'Internal pressure service only'],
      ['3D', 3.0, 'internal_only', 21.0, 'ASME B31.3', 'Internal pressure service only'],
      ['5D', 5.0, 'internal_external', 12.0, 'ASME B31.3', 'Internal and external pressure service'],
      ['3D', 3.0, 'internal_external', 22.0, 'ASME B31.3', 'Internal and external pressure service'],
      ['1.5D', 1.5, 'internal_external', 37.0, 'ASME B31.3', 'Internal and external pressure service'],
    ];

    for (const [radiusType, radiusFactor, service, ovality, standard, notes] of ovalityData) {
      await queryRunner.query(`
        INSERT INTO bend_ovality_tolerances (bend_radius_type, bend_radius_factor, pressure_service, max_ovality_percent, standard, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (bend_radius_type, pressure_service) DO UPDATE SET
          bend_radius_factor = $2,
          max_ovality_percent = $4,
          standard = $5,
          notes = $6
      `, [radiusType, radiusFactor, service, ovality, standard, notes]);
    }

    const wallThinningData = [
      ['5D', 5.0, 10.0, 'ASME B31.3', 'Bend radius >= 5 pipe diameters'],
      ['3D', 3.0, 21.0, 'ASME B31.3', 'Bend radius = 3 pipe diameters'],
      ['1.5D', 1.5, 12.5, 'ASME B16.49', 'Induction bends per B16.49'],
    ];

    for (const [radiusType, radiusFactor, thinning, standard, notes] of wallThinningData) {
      await queryRunner.query(`
        INSERT INTO bend_wall_thinning_tolerances (bend_radius_type, bend_radius_factor, max_thinning_percent, standard, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (bend_radius_type, standard) DO UPDATE SET
          bend_radius_factor = $2,
          max_thinning_percent = $3,
          notes = $5
      `, [radiusType, radiusFactor, thinning, standard, notes]);
    }

    const flangeAlignmentData = [
      [0, 4, 0.8, '1/32"', 'Small bore flanges'],
      [6, 8, 1.6, '1/16"', null],
      [10, 14, 2.4, '3/32"', null],
      [16, 24, 3.2, '1/8"', null],
      [26, null, 4.8, '3/16"', 'Large bore flanges > 24"'],
    ];

    for (const [minNps, maxNps, gapMm, gapInch, notes] of flangeAlignmentData) {
      await queryRunner.query(`
        INSERT INTO flange_alignment_tolerances (min_nps, max_nps, allowable_gap_mm, allowable_gap_inch, standard, notes)
        VALUES ($1, $2, $3, $4, 'ASME B31.3', $5)
      `, [minNps, maxNps, gapMm, gapInch, notes]);
    }

    const standardPipeSizes = [
      ['1/4', 0.25, true, null],
      ['3/8', 0.375, false, '1/2'],
      ['1/2', 0.5, true, null],
      ['3/4', 0.75, true, null],
      ['1', 1.0, true, null],
      ['1-1/4', 1.25, false, '1-1/2'],
      ['1-1/2', 1.5, true, null],
      ['2', 2.0, true, null],
      ['2-1/2', 2.5, true, null],
      ['3', 3.0, true, null],
      ['3-1/2', 3.5, false, '4'],
      ['4', 4.0, true, null],
      ['5', 5.0, false, '6'],
      ['6', 6.0, true, null],
      ['8', 8.0, true, null],
      ['10', 10.0, true, null],
      ['12', 12.0, true, null],
      ['14', 14.0, true, null],
      ['16', 16.0, true, null],
      ['18', 18.0, true, null],
      ['20', 20.0, true, null],
      ['24', 24.0, true, null],
      ['30', 30.0, true, null],
      ['36', 36.0, true, null],
      ['42', 42.0, true, null],
      ['48', 48.0, true, null],
    ];

    for (const [nps, npsDecimal, isTypical, alternative] of standardPipeSizes) {
      await queryRunner.query(`
        INSERT INTO standard_pipe_sizes (nps, nps_decimal, is_typical, alternative_size)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (nps) DO UPDATE SET
          nps_decimal = $2,
          is_typical = $3,
          alternative_size = $4
      `, [nps, npsDecimal, isTypical, alternative]);
    }

    const reducerRules = [
      ['max_single_reduction', 1, null, 'A reducer should not reduce by more than one pipe size in a single step'],
      ['fabricated_max_angle', null, 60.0, 'For greater reduction, use fabricated reducer with maximum 60° included angle'],
      ['eccentric_horizontal', null, null, 'Eccentric reducers in horizontal runs: flat side up to prevent air pockets'],
      ['eccentric_suction', null, null, 'Eccentric reducers in suction lines: flat side up (horizontal) or at centerline (vertical)'],
    ];

    for (const [ruleType, maxSteps, maxAngle, description] of reducerRules) {
      await queryRunner.query(`
        INSERT INTO reducer_rules (rule_type, max_reduction_steps, max_included_angle_degrees, description)
        VALUES ($1, $2, $3, $4)
      `, [ruleType, maxSteps, maxAngle, description]);
    }

    console.warn('ASME B31.1/B31.3 tolerances added successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS reducer_rules`);
    await queryRunner.query(`DROP TABLE IF EXISTS standard_pipe_sizes`);
    await queryRunner.query(`DROP TABLE IF EXISTS flange_alignment_tolerances`);
    await queryRunner.query(`DROP TABLE IF EXISTS bend_wall_thinning_tolerances`);
    await queryRunner.query(`DROP TABLE IF EXISTS bend_ovality_tolerances`);
  }
}
