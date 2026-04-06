import { MigrationInterface, QueryRunner } from "typeorm";

export class AddThirdPartySignOffToItemsRelease1815700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE qc_items_releases
      ADD COLUMN IF NOT EXISTS third_party_sign_off jsonb NOT NULL DEFAULT '{}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE qc_items_releases
      DROP COLUMN IF EXISTS third_party_sign_off
    `);
  }
}
