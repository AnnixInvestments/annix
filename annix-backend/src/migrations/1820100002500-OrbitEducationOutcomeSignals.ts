import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Graduate-outcome signals for the FuturePath choice-aid layer (#309).
 * Firewall: these never feed #308 eligibility. Idempotent.
 */
export class OrbitEducationOutcomeSignals1820100002500 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orbit_education_programme_outcome_signals (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        programme_id uuid NOT NULL,
        source varchar(120) NOT NULL,
        metric varchar(64) NOT NULL,
        value numeric(12,2) NOT NULL,
        unit varchar(16) NOT NULL,
        as_of date,
        confidence varchar(16) NOT NULL DEFAULT 'NEEDS_REVIEW',
        verification_status varchar(24) NOT NULL DEFAULT 'NEEDS_REVIEW',
        source_url varchar(500),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_orbit_education_programme_outcome_signals PRIMARY KEY (id),
        CONSTRAINT fk_orbit_education_outcome_programme FOREIGN KEY (programme_id)
          REFERENCES orbit_education_programmes (id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_orbit_education_outcome_programme ON orbit_education_programme_outcome_signals (programme_id)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS orbit_education_programme_outcome_signals");
  }
}
