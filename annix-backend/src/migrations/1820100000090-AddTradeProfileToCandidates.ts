import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddTradeProfileToCandidates1820100000090 implements MigrationInterface {
  name = "AddTradeProfileToCandidates1820100000090";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv_assistant_candidates"
        ADD COLUMN IF NOT EXISTS "trade_profile" jsonb NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_candidates_trade_keys"
        ON "cv_assistant_candidates"
        USING GIN ((trade_profile -> 'shared' -> 'tradeKeys') jsonb_path_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_candidates_commodities"
        ON "cv_assistant_candidates"
        USING GIN ((trade_profile -> 'shared' -> 'commoditiesWorked') jsonb_path_ops)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_candidates_commodities"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_candidates_trade_keys"`);
    await queryRunner.query(
      `ALTER TABLE "cv_assistant_candidates" DROP COLUMN IF EXISTS "trade_profile"`,
    );
  }
}
