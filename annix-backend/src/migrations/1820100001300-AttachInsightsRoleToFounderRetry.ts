import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Re-attaches the "insights" role to the founder account. Migration
 * 1820100000079 created the role and attached it only if the founder user
 * already existed at the time — but the account was created later, so the
 * junction row was never inserted. This re-runs the attach idempotently.
 */
export class AttachInsightsRoleToFounderRetry1820100001300 implements MigrationInterface {
  name = "AttachInsightsRoleToFounderRetry1820100001300";

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

    const founder = await queryRunner.query(
      `SELECT id FROM "user" WHERE LOWER(email) = LOWER($1)`,
      [this.FOUNDER_EMAIL],
    );

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
    const founder = await queryRunner.query(
      `SELECT id FROM "user" WHERE LOWER(email) = LOWER($1)`,
      [this.FOUNDER_EMAIL],
    );
    if (role.length > 0 && founder.length > 0) {
      await queryRunner.query(
        `DELETE FROM "user_roles_user_role" WHERE "userId" = $1 AND "userRoleId" = $2`,
        [founder[0].id, role[0].id],
      );
    }
  }
}
