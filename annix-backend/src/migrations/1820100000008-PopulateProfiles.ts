import type { MigrationInterface, QueryRunner } from "typeorm";

export class PopulateProfiles1820100000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO stock_control_profiles (
        user_id, company_id,
        hide_tooltips, email_notifications_enabled, push_notifications_enabled,
        linked_staff_id, legacy_sc_user_id,
        created_at, updated_at
      )
      SELECT
        scu.unified_user_id,
        scc.unified_company_id,
        scu.hide_tooltips,
        scu.email_notifications_enabled,
        scu.push_notifications_enabled,
        scu.linked_staff_id,
        scu.id,
        scu.created_at,
        scu.updated_at
      FROM stock_control_users scu
      JOIN stock_control_companies scc ON scc.id = scu.company_id
      WHERE scu.unified_user_id IS NOT NULL
        AND scc.unified_company_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM stock_control_profiles scp
          WHERE scp.user_id = scu.unified_user_id
        )
    `);

    await queryRunner.query(`
      INSERT INTO cv_assistant_profiles (
        user_id, company_id,
        match_alert_threshold, digest_enabled, push_enabled,
        legacy_cv_user_id,
        created_at, updated_at
      )
      SELECT
        u.id,
        cvc.unified_company_id,
        cvu.match_alert_threshold,
        cvu.digest_enabled,
        cvu.push_enabled,
        cvu.id,
        cvu.created_at,
        cvu.updated_at
      FROM cv_assistant_users cvu
      JOIN cv_assistant_companies cvc ON cvc.id = cvu.company_id
      JOIN "user" u ON LOWER(u.email) = LOWER(cvu.email)
      WHERE cvc.unified_company_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM cv_assistant_profiles cvp
          WHERE cvp.legacy_cv_user_id = cvu.id
        )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        INSERT INTO "user" (email, "firstName", status, created_at, updated_at)
        SELECT
          csu.email,
          csu.name,
          CASE WHEN csu.email_verified THEN 'active' ELSE 'pending' END,
          csu.created_at,
          COALESCE(csu.created_at, NOW())
        FROM comply_sa_users csu
        WHERE NOT EXISTS (
          SELECT 1 FROM "user" u WHERE LOWER(u.email) = LOWER(csu.email)
        );
      EXCEPTION WHEN unique_violation THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      UPDATE "user" u
      SET password_hash = csu.password_hash
      FROM comply_sa_users csu
      WHERE LOWER(u.email) = LOWER(csu.email)
        AND u.password_hash IS NULL
        AND csu.password_hash IS NOT NULL
    `);

    await queryRunner.query(`
      INSERT INTO comply_sa_profiles (
        user_id, company_id,
        terms_accepted_at, terms_version,
        legacy_comply_user_id,
        created_at, updated_at
      )
      SELECT
        u.id,
        csc.unified_company_id,
        csu.terms_accepted_at,
        csu.terms_version,
        csu.id,
        csu.created_at,
        COALESCE(csu.created_at, NOW())
      FROM comply_sa_users csu
      JOIN comply_sa_companies csc ON csc.id = csu.company_id
      JOIN "user" u ON LOWER(u.email) = LOWER(csu.email)
      WHERE csc.unified_company_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM comply_sa_profiles csp
          WHERE csp.legacy_comply_user_id = csu.id
        )
    `);

    await queryRunner.query(`
      INSERT INTO user_app_access (user_id, app_id, app_role_id, granted_at, updated_at)
      SELECT
        u.id,
        a.id,
        ar.id,
        csu.created_at,
        COALESCE(csu.created_at, NOW())
      FROM comply_sa_users csu
      JOIN "user" u ON LOWER(u.email) = LOWER(csu.email)
      JOIN apps a ON a.code = 'comply-sa'
      JOIN app_roles ar ON ar.app_id = a.id AND ar.code = 'administrator'
      WHERE NOT EXISTS (
        SELECT 1 FROM user_app_access uaa
        WHERE uaa.user_id = u.id AND uaa.app_id = a.id
      )
    `);

    await queryRunner.query(`
      INSERT INTO user_app_access (user_id, app_id, app_role_id, granted_at, updated_at)
      SELECT
        cp.user_id,
        a.id,
        ar.id,
        cp.created_at,
        cp.updated_at
      FROM customer_profiles cp
      JOIN apps a ON a.code = 'rfq-platform'
      JOIN app_roles ar ON ar.app_id = a.id AND ar.code = (
        CASE cp.role
          WHEN 'customer_admin' THEN 'administrator'
          ELSE 'viewer'
        END
      )
      WHERE NOT EXISTS (
        SELECT 1 FROM user_app_access uaa
        WHERE uaa.user_id = cp.user_id AND uaa.app_id = a.id
      )
    `);

    await queryRunner.query(`
      INSERT INTO user_app_access (user_id, app_id, app_role_id, granted_at, updated_at)
      SELECT
        sp.user_id,
        a.id,
        ar.id,
        sp.created_at,
        sp.updated_at
      FROM supplier_profiles sp
      JOIN apps a ON a.code = 'rfq-platform'
      JOIN app_roles ar ON ar.app_id = a.id AND ar.code = 'viewer'
      WHERE sp.user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM user_app_access uaa
          WHERE uaa.user_id = sp.user_id AND uaa.app_id = a.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_app_access
      WHERE app_id IN (SELECT id FROM apps WHERE code = 'rfq-platform')
        AND user_id IN (
          SELECT user_id FROM customer_profiles
          UNION
          SELECT user_id FROM supplier_profiles WHERE user_id IS NOT NULL
        )
    `);

    await queryRunner.query(`
      DELETE FROM user_app_access
      WHERE app_id = (SELECT id FROM apps WHERE code = 'comply-sa')
        AND user_id IN (
          SELECT user_id FROM comply_sa_profiles
        )
    `);

    await queryRunner.query("DELETE FROM comply_sa_profiles");
    await queryRunner.query("DELETE FROM cv_assistant_profiles");
    await queryRunner.query("DELETE FROM stock_control_profiles");
  }
}
