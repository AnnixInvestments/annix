import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRetainingRingWeightsTable1778000600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE retaining_ring_weights (
        id SERIAL PRIMARY KEY,
        nominal_bore_mm INTEGER NOT NULL UNIQUE,
        weight_kg DECIMAL(10,3) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_retaining_ring_weights_nb
      ON retaining_ring_weights(nominal_bore_mm)
    `);

    await queryRunner.query(`
      INSERT INTO retaining_ring_weights (nominal_bore_mm, weight_kg)
      VALUES
      (200, 1.8), (250, 2.5), (300, 3.4), (350, 4.5), (400, 5.8), (450, 7.2), (500, 8.8),
      (550, 10.5), (600, 12.5), (650, 14.8), (700, 17.2), (750, 19.8), (800, 22.6),
      (850, 25.6), (900, 28.8), (950, 32.2), (1000, 35.8), (1050, 39.6), (1200, 52.0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS retaining_ring_weights");
  }
}
