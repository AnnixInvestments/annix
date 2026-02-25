import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateJobCardAttachments1779100000000 implements MigrationInterface {
  name = "CreateJobCardAttachments1779100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "job_card_attachments" (
        "id" SERIAL NOT NULL,
        "job_card_id" integer NOT NULL,
        "company_id" integer NOT NULL,
        "attachment_type" character varying(50) DEFAULT 'drawing',
        "file_path" character varying(500) NOT NULL,
        "original_filename" character varying(255) NOT NULL,
        "file_size_bytes" bigint NOT NULL,
        "mime_type" character varying(100) NOT NULL,
        "extraction_status" character varying(50) DEFAULT 'pending',
        "extracted_data" jsonb DEFAULT '{}',
        "extraction_error" text,
        "extracted_at" TIMESTAMP,
        "uploaded_by" character varying(255),
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_job_card_attachments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "job_card_attachments"
      ADD CONSTRAINT "FK_job_card_attachments_job_card"
      FOREIGN KEY ("job_card_id") REFERENCES "job_cards"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "job_card_attachments"
      ADD CONSTRAINT "FK_job_card_attachments_company"
      FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_job_card_attachments_job_card" ON "job_card_attachments" ("job_card_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_job_card_attachments_status" ON "job_card_attachments" ("extraction_status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_job_card_attachments_status"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_job_card_attachments_job_card"
    `);

    await queryRunner.query(`
      ALTER TABLE "job_card_attachments"
      DROP CONSTRAINT IF EXISTS "FK_job_card_attachments_company"
    `);

    await queryRunner.query(`
      ALTER TABLE "job_card_attachments"
      DROP CONSTRAINT IF EXISTS "FK_job_card_attachments_job_card"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "job_card_attachments"
    `);
  }
}
