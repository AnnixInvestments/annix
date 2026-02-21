import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateJobCardImportMappingsTable1793600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "job_card_import_mappings" (
        "id" SERIAL PRIMARY KEY,
        "company_id" INTEGER NOT NULL UNIQUE,
        "job_number_column" VARCHAR(255) NOT NULL,
        "job_name_column" VARCHAR(255) NOT NULL,
        "customer_name_column" VARCHAR(255),
        "description_column" VARCHAR(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_job_card_import_mappings_company" FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "job_card_import_mappings"`);
  }
}
