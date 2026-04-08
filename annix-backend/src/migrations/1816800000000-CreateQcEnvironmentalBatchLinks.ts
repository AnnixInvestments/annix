import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateQcEnvironmentalBatchLinks1816800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "qc_environmental_batch_links" (
        "id" SERIAL PRIMARY KEY,
        "company_id" integer NOT NULL,
        "batch_assignment_id" integer NOT NULL,
        "environmental_record_id" integer NOT NULL,
        "activity_date" date NOT NULL,
        "pull_rule" varchar(20) NOT NULL,
        "resolved_date" date NOT NULL,
        "created_at" TIMESTAMP DEFAULT now() NOT NULL,
        CONSTRAINT "fk_env_batch_link_company"
          FOREIGN KEY ("company_id")
          REFERENCES "stock_control_companies"("id")
          ON DELETE CASCADE,
        CONSTRAINT "fk_env_batch_link_assignment"
          FOREIGN KEY ("batch_assignment_id")
          REFERENCES "qc_batch_assignments"("id")
          ON DELETE CASCADE,
        CONSTRAINT "fk_env_batch_link_env_record"
          FOREIGN KEY ("environmental_record_id")
          REFERENCES "qc_environmental_records"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_env_batch_link_assignment"
        ON "qc_environmental_batch_links" ("batch_assignment_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_env_batch_link_env_record"
        ON "qc_environmental_batch_links" ("environmental_record_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_env_batch_link_assignment_record"
        ON "qc_environmental_batch_links" ("batch_assignment_id", "environmental_record_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "qc_environmental_batch_links"`);
  }
}
