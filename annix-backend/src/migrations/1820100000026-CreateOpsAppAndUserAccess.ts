import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOpsAppAndUserAccess1820100000026 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const existingApp = await queryRunner.query(`SELECT id FROM apps WHERE code = 'ops'`);

    let opsAppId: number;

    if (existingApp.length === 0) {
      const inserted = await queryRunner.query(
        `INSERT INTO apps (code, name, description, icon, is_active, display_order)
         VALUES ('ops', 'Annix Ops', 'Unified operations platform', 'layout', true, 1)
         RETURNING id`,
      );
      opsAppId = inserted[0].id;
    } else {
      opsAppId = existingApp[0].id;
    }

    const scApp = await queryRunner.query(`SELECT id FROM apps WHERE code = 'stock-control'`);

    if (scApp.length === 0) {
      return;
    }

    const scAppId = scApp[0].id;

    await queryRunner.query(
      `INSERT INTO user_app_access (user_id, app_id, app_role_id, granted_at, updated_at)
       SELECT uaa.user_id, $1, uaa.app_role_id, NOW(), NOW()
       FROM user_app_access uaa
       WHERE uaa.app_id = $2
         AND NOT EXISTS (
           SELECT 1 FROM user_app_access existing
           WHERE existing.user_id = uaa.user_id AND existing.app_id = $1
         )`,
      [opsAppId, scAppId],
    );

    const arApp = await queryRunner.query(`SELECT id FROM apps WHERE code = 'au-rubber'`);

    if (arApp.length > 0) {
      const arAppId = arApp[0].id;

      await queryRunner.query(
        `INSERT INTO user_app_access (user_id, app_id, app_role_id, granted_at, updated_at)
         SELECT uaa.user_id, $1, uaa.app_role_id, NOW(), NOW()
         FROM user_app_access uaa
         WHERE uaa.app_id = $2
           AND NOT EXISTS (
             SELECT 1 FROM user_app_access existing
             WHERE existing.user_id = uaa.user_id AND existing.app_id = $1
           )`,
        [opsAppId, arAppId],
      );
    }

    const scPermissions = await queryRunner.query(
      "SELECT code, name, category, display_order FROM app_permissions WHERE app_id = $1",
      [scAppId],
    );

    for (const perm of scPermissions) {
      await queryRunner.query(
        `INSERT INTO app_permissions (app_id, code, name, category, display_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [opsAppId, perm.code, perm.name, perm.category, perm.display_order],
      );
    }

    const scRoles = await queryRunner.query(
      `SELECT code, name, description, is_default, display_order, target_type
       FROM app_roles WHERE app_id = $1`,
      [scAppId],
    );

    for (const role of scRoles) {
      await queryRunner.query(
        `INSERT INTO app_roles (app_id, code, name, description, is_default, display_order, target_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [
          opsAppId,
          role.code,
          role.name,
          role.description,
          role.is_default,
          role.display_order,
          role.target_type,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const opsApp = await queryRunner.query(`SELECT id FROM apps WHERE code = 'ops'`);

    if (opsApp.length === 0) {
      return;
    }

    const opsAppId = opsApp[0].id;

    await queryRunner.query("DELETE FROM user_app_access WHERE app_id = $1", [opsAppId]);
    await queryRunner.query(
      "DELETE FROM app_role_permissions WHERE role_id IN (SELECT id FROM app_roles WHERE app_id = $1)",
      [opsAppId],
    );
    await queryRunner.query("DELETE FROM app_roles WHERE app_id = $1", [opsAppId]);
    await queryRunner.query("DELETE FROM app_permissions WHERE app_id = $1", [opsAppId]);
    await queryRunner.query("DELETE FROM apps WHERE id = $1", [opsAppId]);
  }
}
