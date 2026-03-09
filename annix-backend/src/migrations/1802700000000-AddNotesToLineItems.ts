import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotesToLineItems1802700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE job_card_line_items
      ADD COLUMN IF NOT EXISTS notes TEXT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE job_card_line_items
      DROP COLUMN IF EXISTS notes
    `);
  }
}
