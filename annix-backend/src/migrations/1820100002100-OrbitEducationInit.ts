import { MigrationInterface, QueryRunner } from "typeorm";

export class OrbitEducationInit1820100002100 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orbit_education_profiles (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        user_id int NOT NULL,
        curriculum varchar(32) NOT NULL DEFAULT 'Other',
        country varchar(2),
        nationality varchar(100),
        languages jsonb NOT NULL DEFAULT '[]',
        school varchar(255),
        date_of_birth date,
        jurisdiction varchar(16) NOT NULL DEFAULT 'POPIA',
        target_categories jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_orbit_education_profiles PRIMARY KEY (id)
      )
    `);
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_orbit_education_profiles_user ON orbit_education_profiles (user_id)",
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orbit_education_academic_results (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        education_profile_id uuid NOT NULL,
        subject varchar(120) NOT NULL,
        mark numeric(5,2),
        predicted_mark numeric(5,2),
        year int,
        term varchar(20),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_orbit_education_academic_results PRIMARY KEY (id),
        CONSTRAINT fk_orbit_education_results_profile FOREIGN KEY (education_profile_id)
          REFERENCES orbit_education_profiles (id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_orbit_education_results_profile ON orbit_education_academic_results (education_profile_id)",
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orbit_education_guardian_links (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        education_profile_id uuid NOT NULL,
        guardian_user_id int,
        guardian_email varchar(255) NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'invited',
        invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        accepted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_orbit_education_guardian_links PRIMARY KEY (id),
        CONSTRAINT fk_orbit_education_guardian_profile FOREIGN KEY (education_profile_id)
          REFERENCES orbit_education_profiles (id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_orbit_education_guardian_profile ON orbit_education_guardian_links (education_profile_id)",
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orbit_education_consents (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        education_profile_id uuid NOT NULL,
        consent_text_version_id int,
        jurisdiction varchar(16) NOT NULL,
        granted_by_user_id int NOT NULL,
        granted_by_role varchar(16) NOT NULL,
        granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_orbit_education_consents PRIMARY KEY (id),
        CONSTRAINT fk_orbit_education_consents_profile FOREIGN KEY (education_profile_id)
          REFERENCES orbit_education_profiles (id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_orbit_education_consents_profile ON orbit_education_consents (education_profile_id)",
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orbit_education_ai_advice_log (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        education_profile_id uuid,
        question text NOT NULL,
        answer text NOT NULL,
        grounding_context jsonb,
        model varchar(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_orbit_education_ai_advice_log PRIMARY KEY (id),
        CONSTRAINT fk_orbit_education_advice_profile FOREIGN KEY (education_profile_id)
          REFERENCES orbit_education_profiles (id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_orbit_education_advice_profile ON orbit_education_ai_advice_log (education_profile_id)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS orbit_education_ai_advice_log");
    await queryRunner.query("DROP TABLE IF EXISTS orbit_education_consents");
    await queryRunner.query("DROP TABLE IF EXISTS orbit_education_guardian_links");
    await queryRunner.query("DROP TABLE IF EXISTS orbit_education_academic_results");
    await queryRunner.query("DROP TABLE IF EXISTS orbit_education_profiles");
  }
}
