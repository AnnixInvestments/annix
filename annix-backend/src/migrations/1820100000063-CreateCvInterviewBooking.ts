import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCvInterviewBooking1820100000063 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_interview_slots (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES cv_assistant_companies(id) ON DELETE CASCADE,
        job_posting_id INTEGER NOT NULL REFERENCES cv_assistant_job_postings(id) ON DELETE CASCADE,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        location_label VARCHAR(255),
        location_address VARCHAR(500),
        location_lat DOUBLE PRECISION,
        location_lng DOUBLE PRECISION,
        capacity SMALLINT NOT NULL DEFAULT 1,
        notes TEXT,
        is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS cv_interview_slots_job_idx
      ON cv_assistant_interview_slots (job_posting_id, starts_at);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS cv_interview_slots_company_idx
      ON cv_assistant_interview_slots (company_id, starts_at);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_interview_bookings (
        id SERIAL PRIMARY KEY,
        slot_id INTEGER NOT NULL REFERENCES cv_assistant_interview_slots(id) ON DELETE CASCADE,
        candidate_id INTEGER NOT NULL REFERENCES cv_assistant_candidates(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'booked',
        booked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        cancelled_at TIMESTAMPTZ,
        cancel_reason VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS cv_interview_bookings_slot_active_idx
      ON cv_assistant_interview_bookings (slot_id)
      WHERE status = 'booked';
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS cv_interview_bookings_candidate_idx
      ON cv_assistant_interview_bookings (candidate_id);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_interview_invites (
        id SERIAL PRIMARY KEY,
        candidate_id INTEGER NOT NULL REFERENCES cv_assistant_candidates(id) ON DELETE CASCADE,
        job_posting_id INTEGER NOT NULL REFERENCES cv_assistant_job_postings(id) ON DELETE CASCADE,
        token VARCHAR(120) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS cv_interview_invites_candidate_idx
      ON cv_assistant_interview_invites (candidate_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_interview_invites");
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_interview_bookings");
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_interview_slots");
  }
}
