import { MigrationInterface, QueryRunner } from "typeorm";

// The Candidate entity was originally an applicant-to-a-job-posting record, so
// job_posting_id was NOT NULL. Self-service Annix Orbit seekers are general
// candidates matched against EXTERNAL jobs (not a company posting), so they must
// be able to exist without a job posting. Relax the constraint.
export class MakeCandidateJobPostingNullable1820100000048700 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "cv_assistant_candidates" ALTER COLUMN "job_posting_id" DROP NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-adding NOT NULL would fail if any posting-less seeker candidates exist;
    // leave the column nullable on rollback.
  }
}
