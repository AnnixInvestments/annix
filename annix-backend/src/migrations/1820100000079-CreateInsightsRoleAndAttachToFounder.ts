import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInsightsRoleAndAttachToFounder1820100000079 implements MigrationInterface {
  name = "CreateInsightsRoleAndAttachToFounder1820100000079";

  private readonly FOUNDER_EMAIL = "info@annix.co.za";
  private readonly ROLE_NAME = "insights";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existingRole = await queryRunner.query(`SELECT id FROM "user_role" WHERE "name" = $1`, [
      this.ROLE_NAME,
    ]);

    let roleId: number;
    if (existingRole.length === 0) {
      const inserted = await queryRunner.query(
        `INSERT INTO "user_role" ("name") VALUES ($1) RETURNING id`,
        [this.ROLE_NAME],
      );
      roleId = inserted[0].id;
    } else {
      roleId = existingRole[0].id;
    }

    const founder = await queryRunner.query(`SELECT id FROM "user" WHERE email = $1`, [
      this.FOUNDER_EMAIL,
    ]);

    if (founder.length > 0) {
      await queryRunner.query(
        `INSERT INTO "user_roles_user_role" ("userId", "userRoleId") VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [founder[0].id, roleId],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const role = await queryRunner.query(`SELECT id FROM "user_role" WHERE "name" = $1`, [
      this.ROLE_NAME,
    ]);

    if (role.length > 0) {
      await queryRunner.query(`DELETE FROM "user_roles_user_role" WHERE "userRoleId" = $1`, [
        role[0].id,
      ]);
      await queryRunner.query(`DELETE FROM "user_role" WHERE id = $1`, [role[0].id]);
    }
  }
}
