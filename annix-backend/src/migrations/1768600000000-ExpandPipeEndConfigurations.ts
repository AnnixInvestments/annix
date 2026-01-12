import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandPipeEndConfigurations1768600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to pipe_end_configurations table
    await queryRunner.query(`
      ALTER TABLE pipe_end_configurations
      ADD COLUMN applies_to_pipe BOOLEAN DEFAULT true,
      ADD COLUMN applies_to_bend BOOLEAN DEFAULT true,
      ADD COLUMN applies_to_fitting BOOLEAN DEFAULT true,
      ADD COLUMN has_tack_welds BOOLEAN DEFAULT false,
      ADD COLUMN tack_weld_count_per_flange INTEGER DEFAULT 0,
      ADD COLUMN tack_weld_length_mm DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN has_fixed_flange_end1 BOOLEAN DEFAULT false,
      ADD COLUMN has_fixed_flange_end2 BOOLEAN DEFAULT false,
      ADD COLUMN has_fixed_flange_end3 BOOLEAN DEFAULT false,
      ADD COLUMN has_loose_flange_end1 BOOLEAN DEFAULT false,
      ADD COLUMN has_loose_flange_end2 BOOLEAN DEFAULT false,
      ADD COLUMN has_loose_flange_end3 BOOLEAN DEFAULT false,
      ADD COLUMN has_rotating_flange_end1 BOOLEAN DEFAULT false,
      ADD COLUMN has_rotating_flange_end2 BOOLEAN DEFAULT false,
      ADD COLUMN has_rotating_flange_end3 BOOLEAN DEFAULT false,
      ADD COLUMN total_flanges INTEGER DEFAULT 0,
      ADD COLUMN bolt_sets_per_config INTEGER DEFAULT 0,
      ADD COLUMN stub_flange_code VARCHAR(50)
    `);

    // Update existing pipe end configurations with applicability
    // PE - Plain Ended (all types)
    await queryRunner.query(`
      UPDATE pipe_end_configurations
      SET applies_to_pipe = true,
          applies_to_bend = true,
          applies_to_fitting = true,
          total_flanges = 0,
          bolt_sets_per_config = 0
      WHERE config_code = 'PE'
    `);

    // FOE - Flanged One End (pipes and bends)
    await queryRunner.query(`
      UPDATE pipe_end_configurations
      SET applies_to_pipe = true,
          applies_to_bend = true,
          applies_to_fitting = false,
          has_fixed_flange_end2 = true,
          total_flanges = 1,
          bolt_sets_per_config = 1
      WHERE config_code = 'FOE'
    `);

    // FBE - Flanged Both Ends (pipes and bends)
    await queryRunner.query(`
      UPDATE pipe_end_configurations
      SET applies_to_pipe = true,
          applies_to_bend = true,
          applies_to_fitting = false,
          has_fixed_flange_end1 = true,
          has_fixed_flange_end2 = true,
          total_flanges = 2,
          bolt_sets_per_config = 2
      WHERE config_code = 'FBE'
    `);

    // FOE_LF - Flanged One End + Loose Flange (pipes and bends)
    await queryRunner.query(`
      UPDATE pipe_end_configurations
      SET applies_to_pipe = true,
          applies_to_bend = true,
          applies_to_fitting = false,
          has_fixed_flange_end2 = true,
          has_loose_flange_end1 = true,
          has_tack_welds = true,
          tack_weld_count_per_flange = 8,
          tack_weld_length_mm = 20,
          total_flanges = 2,
          bolt_sets_per_config = 2
      WHERE config_code = 'FOE_LF'
    `);

    // FOE_RF - Flanged One End + Rotating Flange (pipes and bends)
    await queryRunner.query(`
      UPDATE pipe_end_configurations
      SET applies_to_pipe = true,
          applies_to_bend = true,
          applies_to_fitting = false,
          has_fixed_flange_end2 = true,
          has_rotating_flange_end1 = true,
          total_flanges = 2,
          bolt_sets_per_config = 2
      WHERE config_code = 'FOE_RF'
    `);

    // 2X_RF - Rotating Flanges Both Ends (pipes and bends)
    await queryRunner.query(`
      UPDATE pipe_end_configurations
      SET applies_to_pipe = true,
          applies_to_bend = true,
          applies_to_fitting = false,
          has_rotating_flange_end1 = true,
          has_rotating_flange_end2 = true,
          total_flanges = 2,
          bolt_sets_per_config = 2
      WHERE config_code = '2X_RF'
    `);

    // Insert 2xLF - Loose Flanges Both Ends (bends only)
    await queryRunner.query(`
      INSERT INTO pipe_end_configurations (
        config_code, config_name, weld_count, description,
        applies_to_pipe, applies_to_bend, applies_to_fitting,
        has_tack_welds, tack_weld_count_per_flange, tack_weld_length_mm,
        has_loose_flange_end1, has_loose_flange_end2,
        total_flanges, bolt_sets_per_config
      ) VALUES (
        '2xLF',
        'L/F Both Ends - Loose flanges both ends',
        0,
        'Loose flanges on both ends with tack welds only',
        false,
        true,
        false,
        true,
        8,
        20,
        true,
        true,
        4,
        2
      )
      ON CONFLICT (config_code) DO UPDATE SET
        applies_to_bend = true,
        has_tack_welds = true,
        tack_weld_count_per_flange = 8,
        tack_weld_length_mm = 20,
        has_loose_flange_end1 = true,
        has_loose_flange_end2 = true,
        total_flanges = 4,
        bolt_sets_per_config = 2
    `);

    // Insert fitting-specific configurations
    // FAE - Flanged All Ends (fittings - tees/laterals)
    await queryRunner.query(`
      INSERT INTO pipe_end_configurations (
        config_code, config_name, weld_count, description,
        applies_to_pipe, applies_to_bend, applies_to_fitting,
        has_fixed_flange_end1, has_fixed_flange_end2, has_fixed_flange_end3,
        total_flanges, bolt_sets_per_config
      ) VALUES (
        'FAE',
        'FAE - Flanged All Ends',
        3,
        'All three ends flanged (inlet, outlet, branch)',
        false,
        false,
        true,
        true,
        true,
        true,
        3,
        3
      )
      ON CONFLICT (config_code) DO UPDATE SET
        applies_to_fitting = true,
        has_fixed_flange_end1 = true,
        has_fixed_flange_end2 = true,
        has_fixed_flange_end3 = true,
        total_flanges = 3,
        bolt_sets_per_config = 3
    `);

    // F2E - Flanged 2 Ends (fittings)
    await queryRunner.query(`
      INSERT INTO pipe_end_configurations (
        config_code, config_name, weld_count, description,
        applies_to_pipe, applies_to_bend, applies_to_fitting,
        has_fixed_flange_end1, has_fixed_flange_end2,
        total_flanges, bolt_sets_per_config
      ) VALUES (
        'F2E',
        'F2E - Flanged 2 ends',
        2,
        'Main pipe flanged (inlet + outlet), branch plain ended',
        false,
        false,
        true,
        true,
        true,
        2,
        2
      )
      ON CONFLICT (config_code) DO UPDATE SET
        applies_to_fitting = true,
        has_fixed_flange_end1 = true,
        has_fixed_flange_end2 = true,
        total_flanges = 2,
        bolt_sets_per_config = 2
    `);

    // F2E_LF - Flanged 2 ends + Loose Flange on inlet
    await queryRunner.query(`
      INSERT INTO pipe_end_configurations (
        config_code, config_name, weld_count, description,
        applies_to_pipe, applies_to_bend, applies_to_fitting,
        has_loose_flange_end1, has_fixed_flange_end2, has_fixed_flange_end3,
        has_tack_welds, tack_weld_count_per_flange, tack_weld_length_mm,
        total_flanges, bolt_sets_per_config
      ) VALUES (
        'F2E_LF',
        'F2E + L/F - Flanged 2 ends + L/F on inlet',
        2,
        'Loose flange on inlet, fixed flanges on outlet and branch',
        false,
        false,
        true,
        true,
        true,
        true,
        true,
        8,
        20,
        3,
        3
      )
      ON CONFLICT (config_code) DO UPDATE SET
        applies_to_fitting = true,
        has_loose_flange_end1 = true,
        has_fixed_flange_end2 = true,
        has_fixed_flange_end3 = true,
        has_tack_welds = true,
        total_flanges = 3,
        bolt_sets_per_config = 3
    `);

    // F2E_RF - Flanged 2 ends + Rotating Flange on branch
    await queryRunner.query(`
      INSERT INTO pipe_end_configurations (
        config_code, config_name, weld_count, description,
        applies_to_pipe, applies_to_bend, applies_to_fitting,
        has_fixed_flange_end1, has_fixed_flange_end2, has_rotating_flange_end3,
        total_flanges, bolt_sets_per_config
      ) VALUES (
        'F2E_RF',
        'F2E + R/F - Flanged 2 ends + R/F on branch',
        3,
        'Fixed flanges on main pipe, rotating flange on branch',
        false,
        false,
        true,
        true,
        true,
        true,
        3,
        3
      )
      ON CONFLICT (config_code) DO UPDATE SET
        applies_to_fitting = true,
        has_fixed_flange_end1 = true,
        has_fixed_flange_end2 = true,
        has_rotating_flange_end3 = true,
        total_flanges = 3,
        bolt_sets_per_config = 3
    `);

    // 3X_RF - Rotating Flanges All 3 Ends (fittings)
    await queryRunner.query(`
      INSERT INTO pipe_end_configurations (
        config_code, config_name, weld_count, description,
        applies_to_pipe, applies_to_bend, applies_to_fitting,
        has_rotating_flange_end1, has_rotating_flange_end2, has_rotating_flange_end3,
        total_flanges, bolt_sets_per_config
      ) VALUES (
        '3X_RF',
        '3 x R/F - Rotating flanges all 3 ends',
        3,
        'Rotating flanges on inlet, outlet, and branch',
        false,
        false,
        true,
        true,
        true,
        true,
        3,
        3
      )
      ON CONFLICT (config_code) DO UPDATE SET
        applies_to_fitting = true,
        has_rotating_flange_end1 = true,
        has_rotating_flange_end2 = true,
        has_rotating_flange_end3 = true,
        total_flanges = 3,
        bolt_sets_per_config = 3
    `);

    // 2X_RF_FOE - R/F main pipe, FOE on branch
    await queryRunner.query(`
      INSERT INTO pipe_end_configurations (
        config_code, config_name, weld_count, description,
        applies_to_pipe, applies_to_bend, applies_to_fitting,
        has_rotating_flange_end1, has_rotating_flange_end2, has_fixed_flange_end3,
        total_flanges, bolt_sets_per_config
      ) VALUES (
        '2X_RF_FOE',
        '2 x R/F + FOE - R/F main pipe, FOE on branch',
        3,
        'Rotating flanges on main pipe, fixed flange on branch',
        false,
        false,
        true,
        true,
        true,
        true,
        3,
        3
      )
      ON CONFLICT (config_code) DO UPDATE SET
        applies_to_fitting = true,
        has_rotating_flange_end1 = true,
        has_rotating_flange_end2 = true,
        has_fixed_flange_end3 = true,
        total_flanges = 3,
        bolt_sets_per_config = 3
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove fitting-specific configurations
    await queryRunner.query(`
      DELETE FROM pipe_end_configurations
      WHERE config_code IN ('FAE', 'F2E', 'F2E_LF', 'F2E_RF', '3X_RF', '2X_RF_FOE', '2xLF')
    `);

    // Drop added columns
    await queryRunner.query(`
      ALTER TABLE pipe_end_configurations
      DROP COLUMN IF EXISTS applies_to_pipe,
      DROP COLUMN IF EXISTS applies_to_bend,
      DROP COLUMN IF EXISTS applies_to_fitting,
      DROP COLUMN IF EXISTS has_tack_welds,
      DROP COLUMN IF EXISTS tack_weld_count_per_flange,
      DROP COLUMN IF EXISTS tack_weld_length_mm,
      DROP COLUMN IF EXISTS has_fixed_flange_end1,
      DROP COLUMN IF EXISTS has_fixed_flange_end2,
      DROP COLUMN IF EXISTS has_fixed_flange_end3,
      DROP COLUMN IF EXISTS has_loose_flange_end1,
      DROP COLUMN IF EXISTS has_loose_flange_end2,
      DROP COLUMN IF EXISTS has_loose_flange_end3,
      DROP COLUMN IF EXISTS has_rotating_flange_end1,
      DROP COLUMN IF EXISTS has_rotating_flange_end2,
      DROP COLUMN IF EXISTS has_rotating_flange_end3,
      DROP COLUMN IF EXISTS total_flanges,
      DROP COLUMN IF EXISTS bolt_sets_per_config,
      DROP COLUMN IF EXISTS stub_flange_code
    `);
  }
}
