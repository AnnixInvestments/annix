import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRfqDraftForeignKeyIndexes1807000000021 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rfq_drafts_created_by_user_id" ON "rfq_drafts" ("created_by_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rfq_drafts_converted_rfq_id" ON "rfq_drafts" ("converted_rfq_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rfq_documents_uploaded_by_user_id" ON "rfq_documents" ("uploaded_by_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_anonymous_drafts_claimed_by_user_id" ON "anonymous_drafts" ("claimed_by_user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_anonymous_drafts_claimed_by_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rfq_documents_uploaded_by_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rfq_drafts_converted_rfq_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rfq_drafts_created_by_user_id"`);
  }
}
