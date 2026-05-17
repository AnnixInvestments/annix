import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQuoteTotalIncVatToNixSessions1820100000109 implements MigrationInterface {
  name = "AddQuoteTotalIncVatToNixSessions1820100000109";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nix_extraction_sessions"
      ADD COLUMN IF NOT EXISTS "quote_total_inc_vat" numeric(14,2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nix_extraction_sessions"
      DROP COLUMN IF EXISTS "quote_total_inc_vat"
    `);
  }
}
