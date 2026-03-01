import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTargetTypeToAppRoles1799800000000 implements MigrationInterface {
  name = "AddTargetTypeToAppRoles1799800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "app_roles"
      ADD COLUMN "target_type" character varying(20) DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "app_roles"
      DROP COLUMN "target_type"
    `);
  }
}
