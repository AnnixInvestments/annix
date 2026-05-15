import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewsConsideredToPaperTrades1820100000106 implements MigrationInterface {
  name = "AddNewsConsideredToPaperTrades1820100000106";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "insights_paper_trades"
      ADD COLUMN IF NOT EXISTS "news_considered" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "insights_paper_trades"
      DROP COLUMN IF EXISTS "news_considered"
    `);
  }
}
