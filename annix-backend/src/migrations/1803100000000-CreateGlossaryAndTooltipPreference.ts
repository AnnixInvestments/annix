import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateGlossaryAndTooltipPreference1803100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sc_glossary_terms" (
        "id" SERIAL PRIMARY KEY,
        "abbreviation" varchar(50) NOT NULL,
        "term" varchar(255) NOT NULL,
        "definition" text NOT NULL,
        "category" varchar(100),
        "company_id" int NOT NULL,
        "is_custom" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_sc_glossary_terms_company"
          FOREIGN KEY ("company_id")
          REFERENCES "stock_control_companies" ("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_sc_glossary_terms_company_abbreviation"
        ON "sc_glossary_terms" ("company_id", "abbreviation")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "stock_control_users"
          ADD COLUMN "hide_tooltips" boolean NOT NULL DEFAULT false;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stock_control_users" DROP COLUMN IF EXISTS "hide_tooltips"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_sc_glossary_terms_company_abbreviation"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "sc_glossary_terms"
    `);
  }
}
