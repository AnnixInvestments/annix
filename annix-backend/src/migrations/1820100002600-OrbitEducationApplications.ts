import { MigrationInterface, QueryRunner } from "typeorm";

/** Learner-tracked university applications (#304 Phase 1). Idempotent. */
export class OrbitEducationApplications1820100002600 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orbit_education_applications (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        education_profile_id uuid NOT NULL,
        programme_id uuid,
        institution_name varchar(255) NOT NULL,
        programme_name varchar(255) NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'interested',
        notes text,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_orbit_education_applications PRIMARY KEY (id),
        CONSTRAINT fk_orbit_education_applications_profile FOREIGN KEY (education_profile_id)
          REFERENCES orbit_education_profiles (id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_orbit_education_applications_profile ON orbit_education_applications (education_profile_id)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS orbit_education_applications");
  }
}
