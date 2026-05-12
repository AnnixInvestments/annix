import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInsightsPriceHistory1820100000082 implements MigrationInterface {
  name = "CreateInsightsPriceHistory1820100000082";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "insights_price_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "asset_id" uuid NOT NULL,
        "date" date NOT NULL,
        "open" numeric(18, 6) NOT NULL,
        "high" numeric(18, 6) NOT NULL,
        "low" numeric(18, 6) NOT NULL,
        "close" numeric(18, 6) NOT NULL,
        "adj_close" numeric(18, 6),
        "volume" bigint,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_insights_price_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_insights_price_history_asset"
          FOREIGN KEY ("asset_id") REFERENCES "insights_assets"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_insights_price_history_asset_date"
        ON "insights_price_history" ("asset_id", "date")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_insights_price_history_date"
        ON "insights_price_history" ("date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_insights_price_history_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_insights_price_history_asset_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "insights_price_history"`);
  }
}
