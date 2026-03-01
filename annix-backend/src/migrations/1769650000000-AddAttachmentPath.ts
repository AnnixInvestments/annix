import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAttachmentPath1769650000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "secure_document"
            ADD COLUMN IF NOT EXISTS "attachment_path" varchar NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "secure_document"
            DROP COLUMN "attachment_path"
        `);
  }
}
