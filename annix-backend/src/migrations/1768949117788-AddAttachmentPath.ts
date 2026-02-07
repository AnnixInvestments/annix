import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAttachmentPath1768949117788 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "secure_document"
            ADD COLUMN "attachment_path" varchar NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "secure_document"
            DROP COLUMN "attachment_path"
        `);
  }
}
