import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserLinkedStaffAndIssuanceUndo1802300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_control_users
      ADD COLUMN IF NOT EXISTS linked_staff_id integer REFERENCES stock_control_staff_members(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE stock_issuances
      ADD COLUMN IF NOT EXISTS undone boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE stock_issuances
      ADD COLUMN IF NOT EXISTS undone_at timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE stock_issuances
      ADD COLUMN IF NOT EXISTS undone_by_name varchar(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_issuances
      DROP COLUMN IF EXISTS undone_by_name
    `);

    await queryRunner.query(`
      ALTER TABLE stock_issuances
      DROP COLUMN IF EXISTS undone_at
    `);

    await queryRunner.query(`
      ALTER TABLE stock_issuances
      DROP COLUMN IF EXISTS undone
    `);

    await queryRunner.query(`
      ALTER TABLE stock_control_users
      DROP COLUMN IF EXISTS linked_staff_id
    `);
  }
}
