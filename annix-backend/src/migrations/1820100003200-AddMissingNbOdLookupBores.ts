import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds nominal bores that were missing from nb_od_lookup (550/650/850 NB) but appear on
 * real LYCO spools, so their m² can be calculated. ODs follow the table's own convention
 * (imperial size × 25.4): 550=22", 650=26", 850=34". Idempotent.
 */
export class AddMissingNbOdLookupBores1820100003200 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO nb_od_lookup (nominal_bore_mm, outside_diameter_mm)
      VALUES (550, 558.80), (650, 660.40), (850, 863.60)
      ON CONFLICT (nominal_bore_mm) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DELETE FROM nb_od_lookup WHERE nominal_bore_mm IN (550, 650, 850)");
  }
}
