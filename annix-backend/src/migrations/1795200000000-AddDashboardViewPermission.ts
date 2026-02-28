import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDashboardViewPermission1795200000000 implements MigrationInterface {
  name = "AddDashboardViewPermission1795200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const appResult = await queryRunner.query(`SELECT id FROM "apps" WHERE code = $1`, [
      "au-rubber",
    ]);

    if (appResult.length === 0) {
      return;
    }

    const appId = appResult[0].id;

    await queryRunner.query(
      `INSERT INTO "app_permissions" ("app_id", "code", "name", "category", "display_order")
       VALUES ($1, $2, $3, $4, $5)`,
      [appId, "dashboard:view", "View Dashboard", "Dashboard", 0],
    );

    const permissionResult = await queryRunner.query(
      `SELECT id FROM "app_permissions" WHERE app_id = $1 AND code = $2`,
      [appId, "dashboard:view"],
    );
    const permissionId = permissionResult[0].id;

    const adminRoleResult = await queryRunner.query(
      `SELECT id FROM "app_roles" WHERE app_id = $1 AND code = $2`,
      [appId, "administrator"],
    );

    if (adminRoleResult.length > 0) {
      const adminRoleId = adminRoleResult[0].id;
      await queryRunner.query(
        `INSERT INTO "app_role_permissions" ("app_role_id", "app_permission_id")
         VALUES ($1, $2)`,
        [adminRoleId, permissionId],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const appResult = await queryRunner.query(`SELECT id FROM "apps" WHERE code = $1`, [
      "au-rubber",
    ]);

    if (appResult.length === 0) {
      return;
    }

    const appId = appResult[0].id;

    await queryRunner.query(`DELETE FROM "app_permissions" WHERE app_id = $1 AND code = $2`, [
      appId,
      "dashboard:view",
    ]);
  }
}
