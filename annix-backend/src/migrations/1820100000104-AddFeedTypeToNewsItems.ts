import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFeedTypeToNewsItems1820100000104 implements MigrationInterface {
  name = "AddFeedTypeToNewsItems1820100000104";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "insights_news_items"
      ADD COLUMN IF NOT EXISTS "feed_type" varchar(32) NOT NULL DEFAULT 'per-asset'
    `);

    await queryRunner.query(`
      ALTER TABLE "insights_news_items"
      ADD COLUMN IF NOT EXISTS "macro_query" text
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_insights_news_items_feed_type"
      ON "insights_news_items" ("feed_type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_insights_news_items_feed_type"`);
    await queryRunner.query(`
      ALTER TABLE "insights_news_items"
      DROP COLUMN IF EXISTS "macro_query",
      DROP COLUMN IF EXISTS "feed_type"
    `);
  }
}
