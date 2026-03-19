import { MigrationInterface, QueryRunner } from "typeorm";

export class AddJobCardJobFiles1807000000055 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "job_card_job_files" (
        "id" SERIAL PRIMARY KEY,
        "job_card_id" integer NOT NULL,
        "company_id" integer NOT NULL,
        "file_path" varchar(500) NOT NULL,
        "original_filename" varchar(255) NOT NULL,
        "ai_generated_name" varchar(500),
        "file_type" varchar(50) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "file_size_bytes" bigint NOT NULL,
        "uploaded_by_id" integer,
        "uploaded_by_name" varchar(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_job_card_job_files_job_card" FOREIGN KEY ("job_card_id")
          REFERENCES "job_cards"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_job_card_job_files_company" FOREIGN KEY ("company_id")
          REFERENCES "stock_control_companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_job_card_job_files_uploaded_by" FOREIGN KEY ("uploaded_by_id")
          REFERENCES "stock_control_users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_job_card_job_files_job_card_company"
        ON "job_card_job_files" ("job_card_id", "company_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_job_card_job_files_job_card_company"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "job_card_job_files"`);
  }
}
