import type { MigrationInterface, QueryRunner } from "typeorm";

export class BridgeScUsersToUniversalRbac1809000000023 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_control_users
        ADD COLUMN IF NOT EXISTS unified_user_id INT REFERENCES "user"(id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sc_users_unified_user
        ON stock_control_users (unified_user_id)
        WHERE unified_user_id IS NOT NULL
    `);

    await queryRunner.query(`
      INSERT INTO "user" (
        email, "firstName", "lastName", status, created_at, updated_at
      )
      SELECT
        scu.email,
        SPLIT_PART(scu.name, ' ', 1),
        CASE
          WHEN POSITION(' ' IN scu.name) > 0
          THEN SUBSTRING(scu.name FROM POSITION(' ' IN scu.name) + 1)
          ELSE NULL
        END,
        CASE WHEN scu.email_verified THEN 'active' ELSE 'pending' END,
        scu.created_at,
        scu.updated_at
      FROM stock_control_users scu
      WHERE NOT EXISTS (
        SELECT 1 FROM "user" u WHERE u.email = scu.email
      )
    `);

    await queryRunner.query(`
      UPDATE stock_control_users scu
      SET unified_user_id = u.id
      FROM "user" u
      WHERE u.email = scu.email
        AND scu.unified_user_id IS NULL
    `);

    await queryRunner.query(`
      INSERT INTO user_app_access (
        user_id, app_id, app_role_id, granted_at, updated_at
      )
      SELECT
        scu.unified_user_id,
        a.id,
        ar.id,
        scu.created_at,
        scu.updated_at
      FROM stock_control_users scu
      JOIN apps a ON a.code = 'stock-control'
      JOIN app_roles ar ON ar.app_id = a.id AND ar.code = (
        CASE scu.role
          WHEN 'storeman' THEN 'viewer'
          WHEN 'accounts' THEN 'editor'
          WHEN 'manager' THEN 'manager'
          WHEN 'admin' THEN 'administrator'
          ELSE 'viewer'
        END
      )
      WHERE scu.unified_user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM user_app_access uaa
          WHERE uaa.user_id = scu.unified_user_id AND uaa.app_id = a.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_app_access
      WHERE user_id IN (
        SELECT unified_user_id FROM stock_control_users
        WHERE unified_user_id IS NOT NULL
      )
      AND app_id = (SELECT id FROM apps WHERE code = 'stock-control')
    `);

    await queryRunner.query(`
      DELETE FROM "user"
      WHERE email IN (
        SELECT email FROM stock_control_users
      )
      AND id NOT IN (
        SELECT user_id FROM user_app_access
      )
    `);

    await queryRunner.query(`
      ALTER TABLE stock_control_users DROP COLUMN IF EXISTS unified_user_id
    `);
  }
}
