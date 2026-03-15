import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateJobCardExtractionCorrections1807000000036 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "job_card_extraction_corrections" (
        "id" SERIAL PRIMARY KEY,
        "company_id" integer NOT NULL,
        "job_card_id" integer NOT NULL,
        "customer_name" varchar(255),
        "field_name" varchar(50) NOT NULL,
        "original_value" text,
        "corrected_value" text NOT NULL,
        "corrected_by" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_jcec_company" FOREIGN KEY ("company_id")
          REFERENCES "stock_control_companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_jcec_job_card" FOREIGN KEY ("job_card_id")
          REFERENCES "job_cards"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_jcec_corrected_by" FOREIGN KEY ("corrected_by")
          REFERENCES "stock_control_users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_jcec_company_customer"
        ON "job_card_extraction_corrections" ("company_id", "customer_name")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_jcec_job_card"
        ON "job_card_extraction_corrections" ("job_card_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "job_card_extraction_corrections"`);
  }
}
