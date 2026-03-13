import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAnnixRepMissingIndexes1807000000027 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_annix_rep_prospects_next_follow_up"
      ON "annix_rep_prospects" ("next_follow_up_at")
      WHERE "next_follow_up_at" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_annix_rep_calendar_connections_sync_status"
      ON "annix_rep_calendar_connections" ("sync_status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_annix_rep_calendar_connections_sync_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_annix_rep_prospects_next_follow_up"`);
  }
}
