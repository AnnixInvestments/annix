import { MigrationInterface, QueryRunner } from "typeorm";

export class AddJobCardVersioning1779000000000 implements MigrationInterface {
  name = "AddJobCardVersioning1779000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_cards"
      ADD COLUMN "version_number" integer DEFAULT 1
    `);

    await queryRunner.query(`
      ALTER TABLE "job_cards"
      ADD COLUMN "source_file_path" character varying(500)
    `);

    await queryRunner.query(`
      ALTER TABLE "job_cards"
      ADD COLUMN "source_file_name" character varying(255)
    `);

    await queryRunner.query(`
      CREATE TABLE "job_card_versions" (
        "id" SERIAL NOT NULL,
        "job_card_id" integer NOT NULL,
        "company_id" integer NOT NULL,
        "version_number" integer NOT NULL,
        "file_path" character varying(500),
        "original_filename" character varying(255),
        "job_name" character varying(255) NOT NULL,
        "customer_name" character varying(255),
        "notes" text,
        "line_items_snapshot" jsonb,
        "amendment_notes" text,
        "created_by" character varying(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_job_card_versions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "job_card_versions"
      ADD CONSTRAINT "FK_job_card_versions_job_card"
      FOREIGN KEY ("job_card_id") REFERENCES "job_cards"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "job_card_versions"
      ADD CONSTRAINT "FK_job_card_versions_company"
      FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_job_card_versions_job_card" ON "job_card_versions" ("job_card_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_job_card_versions_job_card"
    `);

    await queryRunner.query(`
      ALTER TABLE "job_card_versions"
      DROP CONSTRAINT IF EXISTS "FK_job_card_versions_company"
    `);

    await queryRunner.query(`
      ALTER TABLE "job_card_versions"
      DROP CONSTRAINT IF EXISTS "FK_job_card_versions_job_card"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "job_card_versions"
    `);

    await queryRunner.query(`
      ALTER TABLE "job_cards"
      DROP COLUMN IF EXISTS "source_file_name"
    `);

    await queryRunner.query(`
      ALTER TABLE "job_cards"
      DROP COLUMN IF EXISTS "source_file_path"
    `);

    await queryRunner.query(`
      ALTER TABLE "job_cards"
      DROP COLUMN IF EXISTS "version_number"
    `);
  }
}
