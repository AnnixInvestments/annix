import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInsightsNewsItems1820100000090 implements MigrationInterface {
  name = "CreateInsightsNewsItems1820100000090";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "insights_news_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "url_hash" varchar(64) NOT NULL,
        "url" text NOT NULL,
        "title" text NOT NULL,
        "source" text,
        "summary" text,
        "related_symbols" text,
        "related_themes" text,
        "sentiment" numeric(4, 3),
        "impact_level" varchar(16),
        "short_term_implication" text,
        "medium_term_implication" text,
        "published_at" timestamptz,
        "extracted_at" timestamptz,
        "extraction_status" varchar(16) NOT NULL DEFAULT 'pending',
        "extraction_error" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_insights_news_items" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_insights_news_items_url_hash"
        ON "insights_news_items" ("url_hash")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_insights_news_items_published_at"
        ON "insights_news_items" ("published_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_insights_news_items_extraction_status"
        ON "insights_news_items" ("extraction_status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_insights_news_items_extraction_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_insights_news_items_published_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_insights_news_items_url_hash"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "insights_news_items"`);
  }
}
