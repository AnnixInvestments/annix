import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEeComplianceFoundation1820100000065 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cv_assistant_companies
        ADD COLUMN IF NOT EXISTS is_designated_employer BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS economic_sector VARCHAR(100),
        ADD COLUMN IF NOT EXISTS eea_reporting_enabled BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await queryRunner.query(`
      ALTER TABLE cv_assistant_job_postings
        ADD COLUMN IF NOT EXISTS occupational_level VARCHAR(40)
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE cv_assistant_job_postings
          ADD CONSTRAINT cv_jp_occupational_level_chk CHECK (
            occupational_level IS NULL OR occupational_level IN (
              'top_management', 'senior_management', 'professionally_qualified',
              'skilled', 'semi_skilled', 'unskilled'
            )
          );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_ee_consent_text_versions (
        id SERIAL PRIMARY KEY,
        version_label VARCHAR(50) NOT NULL UNIQUE,
        body TEXT NOT NULL,
        effective_from TIMESTAMPTZ NOT NULL,
        effective_to TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_candidate_ee_attributes (
        id SERIAL PRIMARY KEY,
        candidate_id INTEGER NOT NULL REFERENCES cv_assistant_candidates(id) ON DELETE CASCADE,
        population_group VARCHAR(30) NOT NULL,
        gender VARCHAR(20) NOT NULL,
        disability_status VARCHAR(20) NOT NULL,
        requires_accommodation BOOLEAN NOT NULL DEFAULT FALSE,
        accommodation_notes TEXT,
        nationality_status VARCHAR(30) NOT NULL,
        consent_text_version_id INTEGER NOT NULL REFERENCES cv_assistant_ee_consent_text_versions(id),
        consent_granted_at TIMESTAMPTZ NOT NULL,
        consent_source VARCHAR(30) NOT NULL,
        purposes JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE cv_assistant_candidate_ee_attributes
          ADD CONSTRAINT cv_ee_attrs_population_group_chk CHECK (
            population_group IN ('african_black', 'coloured', 'indian', 'white', 'prefer_not_to_say')
          );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE cv_assistant_candidate_ee_attributes
          ADD CONSTRAINT cv_ee_attrs_gender_chk CHECK (
            gender IN ('female', 'male', 'other', 'prefer_not_to_say')
          );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE cv_assistant_candidate_ee_attributes
          ADD CONSTRAINT cv_ee_attrs_disability_chk CHECK (
            disability_status IN ('yes', 'no', 'prefer_not_to_say')
          );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE cv_assistant_candidate_ee_attributes
          ADD CONSTRAINT cv_ee_attrs_nationality_chk CHECK (
            nationality_status IN ('sa_citizen', 'sa_permanent_resident', 'foreign_national', 'prefer_not_to_say')
          );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE cv_assistant_candidate_ee_attributes
          ADD CONSTRAINT cv_ee_attrs_consent_source_chk CHECK (
            consent_source IN ('candidate_portal', 'post_application_email', 'hr_recorded')
          );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS cv_ee_attrs_candidate_active_idx
        ON cv_assistant_candidate_ee_attributes (candidate_id)
        WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS cv_ee_attrs_candidate_history_idx
        ON cv_assistant_candidate_ee_attributes (candidate_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION cv_ee_attrs_block_updates() RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NULL THEN
          RAISE EXCEPTION 'cv_assistant_candidate_ee_attributes is append-only; insert a new row and tombstone the prior row via deleted_at';
        END IF;
        IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
          RAISE EXCEPTION 'cv_assistant_candidate_ee_attributes tombstones cannot be reopened';
        END IF;
        IF (OLD.candidate_id, OLD.population_group, OLD.gender, OLD.disability_status,
            OLD.requires_accommodation, OLD.accommodation_notes, OLD.nationality_status,
            OLD.consent_text_version_id, OLD.consent_granted_at, OLD.consent_source, OLD.purposes)
          IS DISTINCT FROM
           (NEW.candidate_id, NEW.population_group, NEW.gender, NEW.disability_status,
            NEW.requires_accommodation, NEW.accommodation_notes, NEW.nationality_status,
            NEW.consent_text_version_id, NEW.consent_granted_at, NEW.consent_source, NEW.purposes)
        THEN
          RAISE EXCEPTION 'cv_assistant_candidate_ee_attributes payload is immutable; only deleted_at may transition from NULL to a timestamp';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS cv_ee_attrs_append_only ON cv_assistant_candidate_ee_attributes
    `);
    await queryRunner.query(`
      CREATE TRIGGER cv_ee_attrs_append_only
        BEFORE UPDATE ON cv_assistant_candidate_ee_attributes
        FOR EACH ROW EXECUTE FUNCTION cv_ee_attrs_block_updates()
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_ee_sectoral_targets (
        id SERIAL PRIMARY KEY,
        sector_code VARCHAR(100) NOT NULL,
        occupational_level VARCHAR(40) NOT NULL,
        target_year INTEGER NOT NULL,
        target_metric VARCHAR(40) NOT NULL,
        target_percent NUMERIC(5, 2) NOT NULL,
        gazette_reference VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE cv_assistant_ee_sectoral_targets
          ADD CONSTRAINT cv_ee_targets_metric_chk CHECK (
            target_metric IN ('race_african_black', 'race_coloured', 'race_indian', 'female', 'disability')
          );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE cv_assistant_ee_sectoral_targets
          ADD CONSTRAINT cv_ee_targets_level_chk CHECK (
            occupational_level IN ('top_management', 'senior_management', 'professionally_qualified',
                                   'skilled', 'semi_skilled', 'unskilled', 'all_levels')
          );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS cv_ee_targets_unique_idx
        ON cv_assistant_ee_sectoral_targets (sector_code, occupational_level, target_metric, target_year)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_ee_sectoral_targets");
    await queryRunner.query(
      "DROP TRIGGER IF EXISTS cv_ee_attrs_append_only ON cv_assistant_candidate_ee_attributes",
    );
    await queryRunner.query("DROP FUNCTION IF EXISTS cv_ee_attrs_block_updates()");
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_candidate_ee_attributes");
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_ee_consent_text_versions");
    await queryRunner.query(`
      ALTER TABLE cv_assistant_job_postings
        DROP CONSTRAINT IF EXISTS cv_jp_occupational_level_chk
    `);
    await queryRunner.query(
      "ALTER TABLE cv_assistant_job_postings DROP COLUMN IF EXISTS occupational_level",
    );
    await queryRunner.query(`
      ALTER TABLE cv_assistant_companies
        DROP COLUMN IF EXISTS eea_reporting_enabled,
        DROP COLUMN IF EXISTS economic_sector,
        DROP COLUMN IF EXISTS is_designated_employer
    `);
  }
}
