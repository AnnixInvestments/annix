import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration 021 (DropLegacyCompanyUserTables) was deployed to production before
 * being converted to a NO-OP. It dropped five tables that are still referenced
 * by entities and the auth flow. This migration recreates them idempotently and
 * repopulates stock_control_profiles from the unified platform tables so that
 * login works again.
 */
export class RecreateDroppedLegacyTables1820100000023 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. stock_control_companies (no FK deps on other dropped tables)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_control_companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        branding_type VARCHAR(20) NOT NULL DEFAULT 'annix',
        website_url VARCHAR(500),
        branding_authorized BOOLEAN NOT NULL DEFAULT false,
        primary_color VARCHAR(20),
        accent_color VARCHAR(20),
        logo_url VARCHAR(500),
        hero_image_url VARCHAR(500),
        registration_number VARCHAR(50),
        vat_number VARCHAR(50),
        street_address VARCHAR(500),
        city VARCHAR(100),
        province VARCHAR(50),
        postal_code VARCHAR(10),
        phone VARCHAR(30),
        email VARCHAR(255),
        smtp_host VARCHAR(255),
        smtp_port INTEGER,
        smtp_user VARCHAR(255),
        smtp_pass_encrypted BYTEA,
        smtp_from_name VARCHAR(255),
        smtp_from_email VARCHAR(255),
        notification_emails JSONB DEFAULT '[]',
        piping_loss_factor_pct INTEGER NOT NULL DEFAULT 45,
        flat_plate_loss_factor_pct INTEGER NOT NULL DEFAULT 20,
        structural_steel_loss_factor_pct INTEGER NOT NULL DEFAULT 30,
        qc_enabled BOOLEAN NOT NULL DEFAULT false,
        messaging_enabled BOOLEAN NOT NULL DEFAULT false,
        staff_leave_enabled BOOLEAN NOT NULL DEFAULT false,
        workflow_enabled BOOLEAN NOT NULL DEFAULT true,
        notifications_enabled BOOLEAN NOT NULL DEFAULT true,
        sage_username VARCHAR(255),
        sage_pass_encrypted BYTEA,
        sage_company_id INTEGER,
        sage_company_name VARCHAR(255),
        sage_connected_at TIMESTAMP,
        unified_company_id INT REFERENCES companies(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 2. stock_control_users (FK to stock_control_companies)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_control_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL DEFAULT '',
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'storeman',
        email_verified BOOLEAN NOT NULL DEFAULT false,
        email_verification_token VARCHAR(255),
        email_verification_expires TIMESTAMPTZ,
        reset_password_token VARCHAR(255),
        reset_password_expires TIMESTAMPTZ,
        hide_tooltips BOOLEAN NOT NULL DEFAULT false,
        email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
        push_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        linked_staff_id INTEGER REFERENCES stock_control_staff_members(id) ON DELETE SET NULL,
        unified_company_id INT REFERENCES companies(id) ON DELETE CASCADE,
        unified_user_id INT REFERENCES "user"(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT uq_sc_users_email UNIQUE (email)
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sc_users_unified_user'
        ) THEN
          CREATE INDEX idx_sc_users_unified_user ON stock_control_users (unified_user_id)
            WHERE unified_user_id IS NOT NULL;
        END IF;
      END $$
    `);

    // 3. stock_control_profiles (FK to "user" and companies — the unified tables)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_control_profiles (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        company_id INT NOT NULL REFERENCES companies(id),
        hide_tooltips BOOLEAN NOT NULL DEFAULT false,
        email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
        push_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
        linked_staff_id INT REFERENCES stock_control_staff_members(id) ON DELETE SET NULL,
        legacy_sc_user_id INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        unified_company_id INT REFERENCES companies(id) ON DELETE CASCADE,
        CONSTRAINT uq_sc_profiles_user_id UNIQUE (user_id)
      )
    `);

    // 4. stock_control_company_roles (FK to stock_control_companies)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_control_company_roles (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        key VARCHAR(30) NOT NULL,
        label VARCHAR(50) NOT NULL,
        is_system BOOLEAN NOT NULL DEFAULT false,
        sort_order INTEGER NOT NULL DEFAULT 0,
        unified_company_id INT REFERENCES companies(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(company_id, key)
      )
    `);

    // 5. stock_control_action_permissions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_control_action_permissions (
        id SERIAL PRIMARY KEY,
        company_id INT NOT NULL,
        action_key VARCHAR(60) NOT NULL,
        role VARCHAR(30) NOT NULL,
        unified_company_id INT REFERENCES companies(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, action_key, role)
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sc_action_perms_company'
        ) THEN
          CREATE INDEX idx_sc_action_perms_company
            ON stock_control_action_permissions (company_id);
        END IF;
      END $$
    `);

    // --- Repopulate from unified tables ---

    // stock_control_companies: one row per company with SC module enabled
    const scCompanyCount = await queryRunner.query(
      "SELECT COUNT(*) as cnt FROM stock_control_companies",
    );
    if (Number(scCompanyCount[0]?.cnt) === 0) {
      await queryRunner.query(`
        INSERT INTO stock_control_companies (
          name, branding_type, website_url, branding_authorized,
          primary_color, accent_color, logo_url, hero_image_url,
          registration_number, vat_number, street_address, city,
          province, postal_code, phone, email,
          smtp_host, smtp_port, smtp_user, smtp_pass_encrypted,
          smtp_from_name, smtp_from_email, notification_emails,
          qc_enabled, workflow_enabled, notifications_enabled,
          unified_company_id, created_at, updated_at
        )
        SELECT
          COALESCE(c.legal_name, c.name),
          COALESCE(c.branding_type, 'annix'),
          c.website_url,
          COALESCE(c.branding_authorized, false),
          c.primary_color,
          c.accent_color,
          c.logo_url,
          c.hero_image_url,
          c.registration_number,
          c.vat_number,
          c.street_address,
          c.city,
          c.province,
          c.postal_code,
          c.phone,
          c.email,
          c.smtp_host,
          c.smtp_port,
          c.smtp_user,
          c.smtp_pass_encrypted,
          c.smtp_from_name,
          c.smtp_from_email,
          COALESCE(c.notification_emails, '[]'::jsonb),
          true,
          true,
          true,
          c.id,
          c.created_at,
          NOW()
        FROM companies c
        INNER JOIN company_module_subscriptions cms
          ON cms.company_id = c.id AND cms.module_code = 'stock-control'
        ON CONFLICT DO NOTHING
      `);
    }

    // Backfill branding for rows that already exist but have default branding
    await queryRunner.query(`
      UPDATE stock_control_companies sc
      SET
        branding_type = COALESCE(c.branding_type, sc.branding_type),
        website_url = COALESCE(c.website_url, sc.website_url),
        branding_authorized = COALESCE(c.branding_authorized, sc.branding_authorized),
        primary_color = COALESCE(c.primary_color, sc.primary_color),
        accent_color = COALESCE(c.accent_color, sc.accent_color),
        logo_url = COALESCE(c.logo_url, sc.logo_url),
        hero_image_url = COALESCE(c.hero_image_url, sc.hero_image_url),
        registration_number = COALESCE(c.registration_number, sc.registration_number),
        vat_number = COALESCE(c.vat_number, sc.vat_number),
        phone = COALESCE(c.phone, sc.phone),
        email = COALESCE(c.email, sc.email),
        updated_at = NOW()
      FROM companies c
      WHERE sc.unified_company_id = c.id
        AND sc.branding_type = 'annix'
        AND c.branding_type = 'custom'
    `);

    // stock_control_users: one row per user with SC app access
    const scUserCount = await queryRunner.query("SELECT COUNT(*) as cnt FROM stock_control_users");
    if (Number(scUserCount[0]?.cnt) === 0) {
      await queryRunner.query(`
        INSERT INTO stock_control_users (
          email, password_hash, name, role, email_verified,
          company_id, unified_company_id, unified_user_id,
          created_at, updated_at
        )
        SELECT
          u.email,
          '',
          COALESCE(u."firstName" || ' ' || u."lastName", u."firstName", u.email),
          'admin',
          true,
          sc.id,
          sc.unified_company_id,
          u.id,
          u.created_at,
          NOW()
        FROM "user" u
        INNER JOIN user_app_access uaa ON uaa.user_id = u.id
        INNER JOIN apps a ON a.id = uaa.app_id AND a.code = 'stock-control'
        INNER JOIN stock_control_companies sc ON sc.unified_company_id = (
          SELECT cms.company_id
          FROM company_module_subscriptions cms
          WHERE cms.module_code = 'stock-control'
          LIMIT 1
        )
        ON CONFLICT (email) DO NOTHING
      `);
    }

    // stock_control_profiles: one row per user (critical for login)
    // Ensure columns exist (migration 22 may have dropped them on staging)
    await queryRunner.query(`
      ALTER TABLE stock_control_profiles ADD COLUMN IF NOT EXISTS legacy_sc_user_id INT;
      ALTER TABLE stock_control_profiles ADD COLUMN IF NOT EXISTS unified_company_id INT;
    `);

    const profileCount = await queryRunner.query(
      "SELECT COUNT(*) as cnt FROM stock_control_profiles",
    );
    if (Number(profileCount[0]?.cnt) === 0) {
      await queryRunner.query(`
        INSERT INTO stock_control_profiles (
          user_id, company_id, hide_tooltips,
          email_notifications_enabled, push_notifications_enabled,
          legacy_sc_user_id, unified_company_id, created_at, updated_at
        )
        SELECT
          u.id,
          sc.unified_company_id,
          false,
          true,
          true,
          scu.id,
          sc.unified_company_id,
          NOW(),
          NOW()
        FROM "user" u
        INNER JOIN user_app_access uaa ON uaa.user_id = u.id
        INNER JOIN apps a ON a.id = uaa.app_id AND a.code = 'stock-control'
        INNER JOIN stock_control_companies sc ON sc.unified_company_id = (
          SELECT cms.company_id
          FROM company_module_subscriptions cms
          WHERE cms.module_code = 'stock-control'
          LIMIT 1
        )
        LEFT JOIN stock_control_users scu ON scu.unified_user_id = u.id
        ON CONFLICT (user_id) DO NOTHING
      `);
    }

    // Seed default system roles
    const roleCount = await queryRunner.query(
      "SELECT COUNT(*) as cnt FROM stock_control_company_roles",
    );
    if (Number(roleCount[0]?.cnt) === 0) {
      await queryRunner.query(`
        INSERT INTO stock_control_company_roles (
          company_id, key, label, is_system, sort_order, unified_company_id
        )
        SELECT
          sc.id, r.key, r.label, true, r.sort_order, sc.unified_company_id
        FROM stock_control_companies sc
        CROSS JOIN (VALUES
          ('admin', 'Admin', 0),
          ('manager', 'Manager', 1),
          ('quality', 'Quality', 2),
          ('storeman', 'Storeman', 3),
          ('viewer', 'Viewer', 4)
        ) AS r(key, label, sort_order)
        ON CONFLICT (company_id, key) DO NOTHING
      `);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: these tables should not be dropped again
  }
}
