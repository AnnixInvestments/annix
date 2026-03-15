import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeliveryNoteItemWeightDeviation1807000000040 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'rubber_delivery_note_items'
      ) AS exists
    `);
    if (!tableExists[0]?.exists) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE rubber_delivery_note_items
      ADD COLUMN IF NOT EXISTS theoretical_weight_kg decimal(12,3) NULL,
      ADD COLUMN IF NOT EXISTS weight_deviation_pct decimal(6,2) NULL
    `);

    await queryRunner.query(`
      UPDATE rubber_delivery_note_items
      SET
        theoretical_weight_kg = (thickness_mm / 1000.0) * (width_mm / 1000.0) * length_m * 1.5 * 1000,
        weight_deviation_pct = CASE
          WHEN (thickness_mm / 1000.0) * (width_mm / 1000.0) * length_m * 1.5 * 1000 > 0
          THEN ROUND(
            ((roll_weight_kg - (thickness_mm / 1000.0) * (width_mm / 1000.0) * length_m * 1.5 * 1000))
            / ((thickness_mm / 1000.0) * (width_mm / 1000.0) * length_m * 1.5 * 1000) * 100,
            2
          )
          ELSE NULL
        END
      WHERE thickness_mm IS NOT NULL
        AND width_mm IS NOT NULL
        AND length_m IS NOT NULL
        AND roll_weight_kg IS NOT NULL
        AND theoretical_weight_kg IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_delivery_note_items
      DROP COLUMN IF EXISTS theoretical_weight_kg,
      DROP COLUMN IF EXISTS weight_deviation_pct
    `);
  }
}
