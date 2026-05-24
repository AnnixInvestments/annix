import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * FuturePath admissions catalog (#308): institutions → faculties → programmes,
 * immutable per-intake-year requirement versions, historical admission
 * distributions, and reproducible recommendation snapshots. Idempotent.
 */
export class OrbitEducationCatalog1820100002300 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orbit_education_institutions (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        code varchar(64) NOT NULL,
        name varchar(255) NOT NULL,
        country varchar(2),
        default_requirement_spec jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_orbit_education_institutions PRIMARY KEY (id)
      )
    `);
    await queryRunner.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_orbit_education_institutions_code ON orbit_education_institutions (code)",
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orbit_education_faculties (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        institution_id uuid NOT NULL,
        code varchar(64) NOT NULL,
        name varchar(255) NOT NULL,
        default_requirement_spec jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_orbit_education_faculties PRIMARY KEY (id),
        CONSTRAINT fk_orbit_education_faculties_institution FOREIGN KEY (institution_id)
          REFERENCES orbit_education_institutions (id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_orbit_education_faculties_institution ON orbit_education_faculties (institution_id)",
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orbit_education_programmes (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        institution_id uuid NOT NULL,
        faculty_id uuid,
        code varchar(64) NOT NULL,
        name varchar(255) NOT NULL,
        career_cluster varchar(48),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_orbit_education_programmes PRIMARY KEY (id),
        CONSTRAINT fk_orbit_education_programmes_institution FOREIGN KEY (institution_id)
          REFERENCES orbit_education_institutions (id) ON DELETE CASCADE,
        CONSTRAINT fk_orbit_education_programmes_faculty FOREIGN KEY (faculty_id)
          REFERENCES orbit_education_faculties (id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_orbit_education_programmes_institution ON orbit_education_programmes (institution_id)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_orbit_education_programmes_faculty ON orbit_education_programmes (faculty_id)",
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orbit_education_requirement_versions (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        programme_id uuid NOT NULL,
        intake_year int NOT NULL,
        spec jsonb NOT NULL,
        valid_from date NOT NULL,
        valid_to date,
        confidence varchar(16) NOT NULL DEFAULT 'NEEDS_REVIEW',
        verification_status varchar(24) NOT NULL DEFAULT 'NEEDS_REVIEW',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_orbit_education_requirement_versions PRIMARY KEY (id),
        CONSTRAINT fk_orbit_education_reqver_programme FOREIGN KEY (programme_id)
          REFERENCES orbit_education_programmes (id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_orbit_education_reqver_programme ON orbit_education_requirement_versions (programme_id)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_orbit_education_reqver_programme_year ON orbit_education_requirement_versions (programme_id, intake_year)",
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orbit_education_admission_distributions (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        programme_id uuid NOT NULL,
        intake_year int NOT NULL,
        min_admitted numeric(7,2),
        median_admitted numeric(7,2),
        p25_admitted numeric(7,2),
        p75_admitted numeric(7,2),
        seats int,
        source varchar(255),
        as_of date,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_orbit_education_admission_distributions PRIMARY KEY (id),
        CONSTRAINT fk_orbit_education_admdist_programme FOREIGN KEY (programme_id)
          REFERENCES orbit_education_programmes (id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_orbit_education_admdist_programme_year ON orbit_education_admission_distributions (programme_id, intake_year)",
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orbit_education_recommendation_snapshots (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        education_profile_id uuid,
        programme_id uuid NOT NULL,
        intake_year int NOT NULL,
        requirement_version_id uuid,
        band varchar(16) NOT NULL,
        result jsonb NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_orbit_education_recommendation_snapshots PRIMARY KEY (id),
        CONSTRAINT fk_orbit_education_recsnap_programme FOREIGN KEY (programme_id)
          REFERENCES orbit_education_programmes (id) ON DELETE CASCADE,
        CONSTRAINT fk_orbit_education_recsnap_profile FOREIGN KEY (education_profile_id)
          REFERENCES orbit_education_profiles (id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_orbit_education_recsnap_profile ON orbit_education_recommendation_snapshots (education_profile_id)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_orbit_education_recsnap_programme ON orbit_education_recommendation_snapshots (programme_id)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS orbit_education_recommendation_snapshots");
    await queryRunner.query("DROP TABLE IF EXISTS orbit_education_admission_distributions");
    await queryRunner.query("DROP TABLE IF EXISTS orbit_education_requirement_versions");
    await queryRunner.query("DROP TABLE IF EXISTS orbit_education_programmes");
    await queryRunner.query("DROP TABLE IF EXISTS orbit_education_faculties");
    await queryRunner.query("DROP TABLE IF EXISTS orbit_education_institutions");
  }
}
