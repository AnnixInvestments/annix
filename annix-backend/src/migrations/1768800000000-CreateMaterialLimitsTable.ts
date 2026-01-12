import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMaterialLimitsTable1768800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create material limits table
    await queryRunner.query(`
      CREATE TABLE material_limits (
        id SERIAL PRIMARY KEY,
        steel_specification_id INTEGER REFERENCES steel_specifications(id) ON DELETE CASCADE,
        steel_spec_name VARCHAR(100) NOT NULL,
        min_temperature_celsius INTEGER NOT NULL,
        max_temperature_celsius INTEGER NOT NULL,
        max_pressure_bar DECIMAL(10,2) NOT NULL,
        material_type VARCHAR(100) NOT NULL,
        recommended_for_sour_service BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(steel_spec_name)
      )
    `);

    // Add index for performance
    await queryRunner.query(`
      CREATE INDEX idx_material_limits_spec_name
      ON material_limits(steel_spec_name);
    `);

    // Seed material limits data from frontend materialLimits.ts
    await queryRunner.query(`
      INSERT INTO material_limits
      (steel_spec_name, min_temperature_celsius, max_temperature_celsius, max_pressure_bar, material_type, notes, steel_specification_id)
      VALUES
      -- South African Standards
      ('SABS 62', -20, 400, 100, 'Carbon Steel ERW', 'General purpose ERW pipe',
        (SELECT id FROM steel_specifications WHERE steel_spec_name = 'SABS 62' LIMIT 1)),
      ('SABS 719', -20, 400, 100, 'Carbon Steel ERW', 'Large bore ERW pipe',
        (SELECT id FROM steel_specifications WHERE steel_spec_name = 'SABS 719' LIMIT 1)),

      -- ASTM Carbon Steel Standards
      ('ASTM A106', -29, 427, 400, 'Carbon Steel Seamless', 'High temperature seamless pipe',
        (SELECT id FROM steel_specifications WHERE steel_spec_name LIKE '%A106%' LIMIT 1)),
      ('ASTM A53', -29, 400, 250, 'Carbon Steel', 'General purpose pipe - seamless or welded',
        (SELECT id FROM steel_specifications WHERE steel_spec_name LIKE '%A53%' LIMIT 1)),
      ('ASTM A333', -100, 400, 250, 'Low-Temp Carbon Steel', 'For temperatures down to -100°C',
        (SELECT id FROM steel_specifications WHERE steel_spec_name LIKE '%A333%' LIMIT 1)),

      -- API Standards
      ('API 5L', -29, 400, 250, 'Line Pipe Carbon Steel', 'Oil and gas pipeline',
        (SELECT id FROM steel_specifications WHERE steel_spec_name LIKE '%API 5L%' OR steel_spec_name LIKE '%5L%' LIMIT 1)),

      -- Heat Exchanger & Boiler Tubes
      ('ASTM A179', -29, 400, 160, 'Heat Exchanger Tube', 'Cold-drawn seamless',
        (SELECT id FROM steel_specifications WHERE steel_spec_name LIKE '%A179%' LIMIT 1)),
      ('ASTM A192', -29, 454, 250, 'Boiler Tube', 'High-pressure boiler service',
        (SELECT id FROM steel_specifications WHERE steel_spec_name LIKE '%A192%' LIMIT 1)),

      -- Structural (not pressure)
      ('ASTM A500', -29, 200, 100, 'Structural Tubing', 'Not for pressure service',
        (SELECT id FROM steel_specifications WHERE steel_spec_name LIKE '%A500%' LIMIT 1)),

      -- Alloy Steel (Chrome-Moly)
      ('ASTM A335 P11', -29, 593, 400, 'Alloy Steel 1.25Cr-0.5Mo', 'High temperature service',
        (SELECT id FROM steel_specifications WHERE steel_spec_name LIKE '%A335%P11%' OR steel_spec_name LIKE '%P11%' LIMIT 1)),
      ('ASTM A335 P22', -29, 593, 400, 'Alloy Steel 2.25Cr-1Mo', 'High temperature service',
        (SELECT id FROM steel_specifications WHERE steel_spec_name LIKE '%A335%P22%' OR steel_spec_name LIKE '%P22%' LIMIT 1)),
      ('ASTM A335', -29, 593, 400, 'Alloy Steel Chrome-Moly', 'High temperature alloy',
        (SELECT id FROM steel_specifications WHERE steel_spec_name LIKE '%A335%' AND steel_spec_name NOT LIKE '%P11%' AND steel_spec_name NOT LIKE '%P22%' LIMIT 1)),

      -- Stainless Steel
      ('ASTM A312', -196, 816, 400, 'Stainless Steel', 'Austenitic stainless - wide temp range',
        (SELECT id FROM steel_specifications WHERE steel_spec_name LIKE '%A312%' OR steel_spec_name LIKE '%316%' OR steel_spec_name LIKE '%304%' LIMIT 1)),
      ('ASTM A358', -196, 816, 400, 'Stainless Steel Welded', 'Electric-fusion welded stainless',
        (SELECT id FROM steel_specifications WHERE steel_spec_name LIKE '%A358%' LIMIT 1))
    `);

    // Add material limits for any specs without them (set conservative defaults)
    await queryRunner.query(`
      INSERT INTO material_limits
      (steel_specification_id, steel_spec_name, min_temperature_celsius, max_temperature_celsius, max_pressure_bar, material_type, notes)
      SELECT
        id,
        steel_spec_name,
        -29,  -- Conservative minimum
        400,  -- Conservative maximum
        250,  -- Conservative pressure
        'Carbon Steel',
        'Conservative default limits - verify before use'
      FROM steel_specifications
      WHERE id NOT IN (SELECT steel_specification_id FROM material_limits WHERE steel_specification_id IS NOT NULL)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS material_limits`);
  }
}
