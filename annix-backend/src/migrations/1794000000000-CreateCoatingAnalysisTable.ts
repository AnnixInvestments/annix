import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCoatingAnalysisTable1794000000000 implements MigrationInterface {
  name = "CreateCoatingAnalysisTable1794000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_card_line_items"
        ADD COLUMN IF NOT EXISTS "m2" NUMERIC(12,4)
    `);

    await queryRunner.query(`
      CREATE TABLE "job_card_coating_analyses" (
        "id" SERIAL PRIMARY KEY,
        "job_card_id" INTEGER NOT NULL,
        "application_type" VARCHAR(50),
        "surface_prep" VARCHAR(100),
        "ext_m2" NUMERIC(12,4) NOT NULL DEFAULT 0,
        "int_m2" NUMERIC(12,4) NOT NULL DEFAULT 0,
        "coats" JSONB NOT NULL DEFAULT '[]',
        "stock_assessment" JSONB NOT NULL DEFAULT '[]',
        "raw_notes" TEXT,
        "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
        "error" TEXT,
        "analysed_at" TIMESTAMP,
        "company_id" INTEGER NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_coating_analysis_job_card" FOREIGN KEY ("job_card_id")
          REFERENCES "job_cards"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_coating_analysis_company" FOREIGN KEY ("company_id")
          REFERENCES "stock_control_companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_coating_analysis_job_card_company"
      ON "job_card_coating_analyses" ("job_card_id", "company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_coating_analysis_company"
      ON "job_card_coating_analyses" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_coating_analysis_status"
      ON "job_card_coating_analyses" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_coating_analysis_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_coating_analysis_company"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_coating_analysis_job_card_company"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "job_card_coating_analyses"`);
    await queryRunner.query(`ALTER TABLE "job_card_line_items" DROP COLUMN IF EXISTS "m2"`);
  }
}
