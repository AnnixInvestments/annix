import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDiscoveryFieldsToProspect1791000000000 implements MigrationInterface {
  name = "AddDiscoveryFieldsToProspect1791000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "annix_rep_prospects"
      ADD COLUMN "discovery_source" character varying(50),
      ADD COLUMN "discovered_at" TIMESTAMP,
      ADD COLUMN "external_id" character varying(255)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_prospects_discovery_source"
      ON "annix_rep_prospects" ("discovery_source")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_prospects_external_id"
      ON "annix_rep_prospects" ("external_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_prospects_external_id"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_prospects_discovery_source"`);
    await queryRunner.query(`
      ALTER TABLE "annix_rep_prospects"
      DROP COLUMN "external_id",
      DROP COLUMN "discovered_at",
      DROP COLUMN "discovery_source"
    `);
  }
}
