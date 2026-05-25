import { MigrationInterface, QueryRunner } from "typeorm";

export class OrbitEducationRequirementDrafts1820100002800 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orbit_education_requirement_drafts (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        institution_id uuid NULL,
        programme_id uuid NULL,
        intake_year integer NOT NULL,
        field_key varchar(120) NOT NULL,
        label varchar(255) NOT NULL DEFAULT '',
        extracted_value jsonb NOT NULL,
        approved_value jsonb NULL,
        status varchar(16) NOT NULL DEFAULT 'draft',
        confidence varchar(16) NULL,
        source_url varchar(1000) NOT NULL,
        screenshot_path varchar(1000) NULL,
        raw_snippet text NULL,
        fetched_at TIMESTAMPTZ NOT NULL,
        approved_by_id integer NULL,
        approved_at TIMESTAMPTZ NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT pk_orbit_education_requirement_drafts PRIMARY KEY (id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_orbit_edu_req_drafts_programme_year
        ON orbit_education_requirement_drafts (programme_id, intake_year)
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orbit_education_extraction_corrections (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        institution_id uuid NULL,
        field_key varchar(120) NOT NULL,
        extracted_value jsonb NOT NULL,
        corrected_value jsonb NOT NULL,
        source_url varchar(1000) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT pk_orbit_education_extraction_corrections PRIMARY KEY (id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_orbit_edu_corrections_inst_field
        ON orbit_education_extraction_corrections (institution_id, field_key)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS orbit_education_extraction_corrections");
    await queryRunner.query("DROP TABLE IF EXISTS orbit_education_requirement_drafts");
  }
}
