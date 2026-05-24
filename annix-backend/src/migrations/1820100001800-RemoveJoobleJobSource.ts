import { MigrationInterface, QueryRunner } from "typeorm";

// Jooble is no longer a supported job source (see #301: free API is region-gated
// to US results and the SA site is Cloudflare-walled). Removes the provider's
// JobMarketSource rows; ON DELETE CASCADE clears any Jooble-sourced external jobs.
export class RemoveJoobleJobSource1820100001800 implements MigrationInterface {
  name = "RemoveJoobleJobSource1820100001800";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "cv_assistant_job_market_sources" WHERE "provider" = 'jooble'
    `);
  }

  public async down(): Promise<void> {
    // Irreversible: Jooble support was removed. Re-adding the source is a manual
    // admin action, not a schema rollback.
  }
}
