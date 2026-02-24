import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCvAssistantTables1794300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cv_assistant_companies" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "imap_host" VARCHAR(255),
        "imap_port" INT,
        "imap_user" VARCHAR(255),
        "imap_password_encrypted" VARCHAR(500),
        "monitoring_enabled" BOOLEAN NOT NULL DEFAULT false,
        "email_from_address" VARCHAR(255),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "cv_assistant_users" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "password_hash" VARCHAR(255) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "role" VARCHAR(50) NOT NULL DEFAULT 'recruiter',
        "email_verified" BOOLEAN NOT NULL DEFAULT false,
        "email_verification_token" VARCHAR(255),
        "email_verification_expires" TIMESTAMPTZ,
        "reset_password_token" VARCHAR(255),
        "reset_password_expires" TIMESTAMPTZ,
        "company_id" INT NOT NULL REFERENCES "cv_assistant_companies"("id") ON DELETE CASCADE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "cv_assistant_job_postings" (
        "id" SERIAL PRIMARY KEY,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "required_skills" JSONB NOT NULL DEFAULT '[]',
        "min_experience_years" INT,
        "required_education" VARCHAR(255),
        "required_certifications" JSONB NOT NULL DEFAULT '[]',
        "email_subject_pattern" VARCHAR(255),
        "auto_reject_enabled" BOOLEAN NOT NULL DEFAULT false,
        "auto_reject_threshold" INT NOT NULL DEFAULT 30,
        "auto_accept_threshold" INT NOT NULL DEFAULT 80,
        "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
        "company_id" INT NOT NULL REFERENCES "cv_assistant_companies"("id") ON DELETE CASCADE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "cv_assistant_candidates" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR(255),
        "name" VARCHAR(255),
        "cv_file_path" VARCHAR(500),
        "raw_cv_text" TEXT,
        "extracted_data" JSONB,
        "match_analysis" JSONB,
        "match_score" INT,
        "status" VARCHAR(30) NOT NULL DEFAULT 'new',
        "source_email_id" VARCHAR(255),
        "rejection_sent_at" TIMESTAMPTZ,
        "acceptance_sent_at" TIMESTAMPTZ,
        "job_posting_id" INT NOT NULL REFERENCES "cv_assistant_job_postings"("id") ON DELETE CASCADE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "cv_assistant_candidate_references" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "email" VARCHAR(255) NOT NULL,
        "relationship" VARCHAR(255),
        "feedback_token" VARCHAR(255) NOT NULL UNIQUE,
        "token_expires_at" TIMESTAMPTZ NOT NULL,
        "feedback_rating" INT,
        "feedback_text" TEXT,
        "feedback_submitted_at" TIMESTAMPTZ,
        "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
        "request_sent_at" TIMESTAMPTZ,
        "reminder_sent_at" TIMESTAMPTZ,
        "candidate_id" INT NOT NULL REFERENCES "cv_assistant_candidates"("id") ON DELETE CASCADE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cv_assistant_candidate_references"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cv_assistant_candidates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cv_assistant_job_postings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cv_assistant_users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cv_assistant_companies"`);
  }
}
