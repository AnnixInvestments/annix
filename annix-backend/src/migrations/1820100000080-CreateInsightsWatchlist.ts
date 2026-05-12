import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInsightsWatchlist1820100000080 implements MigrationInterface {
  name = "CreateInsightsWatchlist1820100000080";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "insights_assets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "symbol" varchar(32) NOT NULL,
        "name" varchar(128) NOT NULL,
        "exchange" varchar(16) NOT NULL,
        "currency" varchar(8) NOT NULL,
        "asset_type" varchar(32) NOT NULL,
        "sector" varchar(64),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_insights_assets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_insights_assets_symbol" UNIQUE ("symbol")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_insights_assets_asset_type"
        ON "insights_assets" ("asset_type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_insights_assets_exchange"
        ON "insights_assets" ("exchange")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "insights_watchlist_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "asset_id" uuid NOT NULL,
        "notes" text,
        "target_reason" text,
        "added_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_insights_watchlist_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_insights_watchlist_items_asset"
          FOREIGN KEY ("asset_id") REFERENCES "insights_assets"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_insights_watchlist_items_asset" UNIQUE ("asset_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_insights_watchlist_items_asset_id"
        ON "insights_watchlist_items" ("asset_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_insights_watchlist_items_asset_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "insights_watchlist_items"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_insights_assets_exchange"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_insights_assets_asset_type"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "insights_assets"`);
  }
}
