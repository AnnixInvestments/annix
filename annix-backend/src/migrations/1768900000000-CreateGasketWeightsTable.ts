import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGasketWeightsTable1768900000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create gasket weights table
    await queryRunner.query(`
      CREATE TABLE gasket_weights (
        id SERIAL PRIMARY KEY,
        gasket_type VARCHAR(50) NOT NULL,
        nominal_bore_mm INTEGER NOT NULL,
        weight_kg DECIMAL(10,3) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(gasket_type, nominal_bore_mm)
      )
    `);

    // Add index for performance
    await queryRunner.query(`
      CREATE INDEX idx_gasket_weights_type_nb
      ON gasket_weights(gasket_type, nominal_bore_mm);
    `);

    // Seed gasket weights data from frontend GASKET_WEIGHTS
    await queryRunner.query(`
      INSERT INTO gasket_weights (gasket_type, nominal_bore_mm, weight_kg)
      VALUES
      -- ASBESTOS gaskets
      ('ASBESTOS', 15, 0.01), ('ASBESTOS', 20, 0.015), ('ASBESTOS', 25, 0.02), ('ASBESTOS', 32, 0.03),
      ('ASBESTOS', 40, 0.04), ('ASBESTOS', 50, 0.05), ('ASBESTOS', 65, 0.07), ('ASBESTOS', 80, 0.1),
      ('ASBESTOS', 100, 0.15), ('ASBESTOS', 125, 0.2), ('ASBESTOS', 150, 0.3), ('ASBESTOS', 200, 0.5),
      ('ASBESTOS', 250, 0.8), ('ASBESTOS', 300, 1.2), ('ASBESTOS', 350, 1.6), ('ASBESTOS', 400, 2.1),
      ('ASBESTOS', 450, 2.7), ('ASBESTOS', 500, 3.4), ('ASBESTOS', 600, 5.0), ('ASBESTOS', 700, 7.0),
      ('ASBESTOS', 750, 8.5), ('ASBESTOS', 800, 10.0), ('ASBESTOS', 900, 13.0), ('ASBESTOS', 1000, 17.0),
      ('ASBESTOS', 1200, 25.0),

      -- GRAPHITE gaskets
      ('GRAPHITE', 15, 0.015), ('GRAPHITE', 20, 0.02), ('GRAPHITE', 25, 0.03), ('GRAPHITE', 32, 0.04),
      ('GRAPHITE', 40, 0.05), ('GRAPHITE', 50, 0.07), ('GRAPHITE', 65, 0.1), ('GRAPHITE', 80, 0.13),
      ('GRAPHITE', 100, 0.2), ('GRAPHITE', 125, 0.3), ('GRAPHITE', 150, 0.4), ('GRAPHITE', 200, 0.65),
      ('GRAPHITE', 250, 1.0), ('GRAPHITE', 300, 1.5), ('GRAPHITE', 350, 2.0), ('GRAPHITE', 400, 2.7),
      ('GRAPHITE', 450, 3.4), ('GRAPHITE', 500, 4.3), ('GRAPHITE', 600, 6.5), ('GRAPHITE', 700, 9.0),
      ('GRAPHITE', 750, 11.0), ('GRAPHITE', 800, 13.0), ('GRAPHITE', 900, 17.0), ('GRAPHITE', 1000, 22.0),
      ('GRAPHITE', 1200, 33.0),

      -- PTFE gaskets
      ('PTFE', 15, 0.008), ('PTFE', 20, 0.01), ('PTFE', 25, 0.015), ('PTFE', 32, 0.02),
      ('PTFE', 40, 0.025), ('PTFE', 50, 0.035), ('PTFE', 65, 0.05), ('PTFE', 80, 0.07),
      ('PTFE', 100, 0.1), ('PTFE', 125, 0.15), ('PTFE', 150, 0.2), ('PTFE', 200, 0.35),
      ('PTFE', 250, 0.55), ('PTFE', 300, 0.8), ('PTFE', 350, 1.1), ('PTFE', 400, 1.4),
      ('PTFE', 450, 1.8), ('PTFE', 500, 2.3), ('PTFE', 600, 3.5), ('PTFE', 700, 4.8),
      ('PTFE', 750, 5.8), ('PTFE', 800, 6.8), ('PTFE', 900, 9.0), ('PTFE', 1000, 12.0),
      ('PTFE', 1200, 18.0),

      -- RUBBER gaskets
      ('RUBBER', 15, 0.005), ('RUBBER', 20, 0.008), ('RUBBER', 25, 0.01), ('RUBBER', 32, 0.015),
      ('RUBBER', 40, 0.02), ('RUBBER', 50, 0.025), ('RUBBER', 65, 0.035), ('RUBBER', 80, 0.05),
      ('RUBBER', 100, 0.07), ('RUBBER', 125, 0.1), ('RUBBER', 150, 0.14), ('RUBBER', 200, 0.25),
      ('RUBBER', 250, 0.4), ('RUBBER', 300, 0.55), ('RUBBER', 350, 0.75), ('RUBBER', 400, 1.0),
      ('RUBBER', 450, 1.25), ('RUBBER', 500, 1.6), ('RUBBER', 600, 2.5), ('RUBBER', 700, 3.5),
      ('RUBBER', 750, 4.2), ('RUBBER', 800, 5.0), ('RUBBER', 900, 6.5), ('RUBBER', 1000, 8.5),
      ('RUBBER', 1200, 13.0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS gasket_weights`);
  }
}
