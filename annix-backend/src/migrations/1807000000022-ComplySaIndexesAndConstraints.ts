import { MigrationInterface, QueryRunner } from "typeorm";

export class ComplySaIndexesAndConstraints1807000000022 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comply_sa_documents_requirement_id"
        ON "comply_sa_documents" ("requirement_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comply_sa_documents_expiry_date"
        ON "comply_sa_documents" ("expiry_date")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comply_sa_checklist_progress_company_id"
        ON "comply_sa_compliance_checklist_progress" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comply_sa_checklist_progress_requirement_id"
        ON "comply_sa_compliance_checklist_progress" ("requirement_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comply_sa_compliance_statuses_requirement_id"
        ON "comply_sa_compliance_statuses" ("requirement_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comply_sa_compliance_statuses_status"
        ON "comply_sa_compliance_statuses" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comply_sa_advisor_clients_advisor_user_id"
        ON "comply_sa_advisor_clients" ("advisor_user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comply_sa_advisor_clients_client_company_id"
        ON "comply_sa_advisor_clients" ("client_company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comply_sa_api_keys_active"
        ON "comply_sa_api_keys" ("active")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "comply_sa_api_keys"
          ADD CONSTRAINT "UQ_comply_sa_api_keys_key_hash" UNIQUE ("key_hash");
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "comply_sa_api_keys"
          ADD CONSTRAINT "UQ_comply_sa_api_keys_company_name" UNIQUE ("company_id", "name");
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "comply_sa_compliance_statuses"
          ADD CONSTRAINT "FK_comply_sa_statuses_requirement"
          FOREIGN KEY ("requirement_id") REFERENCES "comply_sa_compliance_requirements"("id")
          ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "comply_sa_compliance_checklist_progress"
          ADD CONSTRAINT "FK_comply_sa_checklist_requirement"
          FOREIGN KEY ("requirement_id") REFERENCES "comply_sa_compliance_requirements"("id")
          ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "comply_sa_documents"
          ADD CONSTRAINT "UQ_comply_sa_documents_company_file_path" UNIQUE ("company_id", "file_path");
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'comply_sa_regulatory_updates'
            AND column_name = 'effective_date'
            AND data_type = 'character varying'
        ) THEN
          ALTER TABLE "comply_sa_regulatory_updates"
            ALTER COLUMN "effective_date" TYPE TIMESTAMP USING "effective_date"::timestamp;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "comply_sa_regulatory_updates" ALTER COLUMN "effective_date" TYPE VARCHAR(50)`);
    await queryRunner.query(`ALTER TABLE "comply_sa_documents" DROP CONSTRAINT IF EXISTS "UQ_comply_sa_documents_company_file_path"`);
    await queryRunner.query(`ALTER TABLE "comply_sa_compliance_checklist_progress" DROP CONSTRAINT IF EXISTS "FK_comply_sa_checklist_requirement"`);
    await queryRunner.query(`ALTER TABLE "comply_sa_compliance_statuses" DROP CONSTRAINT IF EXISTS "FK_comply_sa_statuses_requirement"`);
    await queryRunner.query(`ALTER TABLE "comply_sa_api_keys" DROP CONSTRAINT IF EXISTS "UQ_comply_sa_api_keys_company_name"`);
    await queryRunner.query(`ALTER TABLE "comply_sa_api_keys" DROP CONSTRAINT IF EXISTS "UQ_comply_sa_api_keys_key_hash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comply_sa_api_keys_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comply_sa_advisor_clients_client_company_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comply_sa_advisor_clients_advisor_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comply_sa_compliance_statuses_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comply_sa_compliance_statuses_requirement_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comply_sa_checklist_progress_requirement_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comply_sa_checklist_progress_company_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comply_sa_documents_expiry_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comply_sa_documents_requirement_id"`);
  }
}
