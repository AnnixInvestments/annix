import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProfileTables1820100000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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
        CONSTRAINT uq_sc_profiles_user_id UNIQUE (user_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_profiles (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        company_id INT NOT NULL REFERENCES companies(id),
        match_alert_threshold INT NOT NULL DEFAULT 80,
        digest_enabled BOOLEAN NOT NULL DEFAULT true,
        push_enabled BOOLEAN NOT NULL DEFAULT false,
        legacy_cv_user_id INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_cv_profiles_user_id UNIQUE (user_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comply_sa_profiles (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        company_id INT NOT NULL REFERENCES companies(id),
        terms_accepted_at TIMESTAMPTZ,
        terms_version VARCHAR(20),
        legacy_comply_user_id INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_comply_profiles_user_id UNIQUE (user_id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_profiles");
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_profiles");
    await queryRunner.query("DROP TABLE IF EXISTS stock_control_profiles");
  }
}
