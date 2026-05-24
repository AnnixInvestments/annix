import { MigrationInterface, QueryRunner } from "typeorm";

/** Curated scholarships/bursaries for FuturePath (#304 Phase 1). Idempotent. */
export class OrbitEducationScholarships1820100002700 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orbit_education_scholarships (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        provider varchar(255) NOT NULL,
        country varchar(2),
        amount_display varchar(120),
        criteria text,
        url varchar(500),
        career_cluster varchar(48),
        last_verified_at date,
        active boolean NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_orbit_education_scholarships PRIMARY KEY (id)
      )
    `);
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_orbit_education_scholarships_active ON orbit_education_scholarships (active)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS orbit_education_scholarships");
  }
}
