import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanyOwner1820100002300 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_user_id integer NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE companies DROP COLUMN IF EXISTS owner_user_id");
  }
}
