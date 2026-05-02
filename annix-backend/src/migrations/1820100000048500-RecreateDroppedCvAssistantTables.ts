import type { MigrationInterface, QueryRunner } from "typeorm";

export class RecreateDroppedCvAssistantTables1820100000048500 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email_from_address VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'recruiter',
        email_verified BOOLEAN NOT NULL DEFAULT false,
        email_verification_token VARCHAR(255),
        email_verification_expires TIMESTAMPTZ,
        reset_password_token VARCHAR(255),
        reset_password_expires TIMESTAMPTZ,
        company_id INT NOT NULL REFERENCES cv_assistant_companies(id) ON DELETE CASCADE,
        match_alert_threshold INT NOT NULL DEFAULT 80,
        digest_enabled BOOLEAN NOT NULL DEFAULT true,
        push_enabled BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_job_postings (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
        min_experience_years INT,
        required_education VARCHAR(255),
        required_certifications JSONB NOT NULL DEFAULT '[]'::jsonb,
        email_subject_pattern VARCHAR(255),
        auto_reject_enabled BOOLEAN NOT NULL DEFAULT false,
        auto_reject_threshold INT NOT NULL DEFAULT 30,
        auto_accept_threshold INT NOT NULL DEFAULT 80,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        company_id INT NOT NULL REFERENCES cv_assistant_companies(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_candidates (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        name VARCHAR(255),
        cv_file_path VARCHAR(500),
        raw_cv_text TEXT,
        extracted_data JSONB,
        match_analysis JSONB,
        match_score INT,
        status VARCHAR(30) NOT NULL DEFAULT 'new',
        source_email_id VARCHAR(255),
        bee_level INT,
        popia_consent BOOLEAN NOT NULL DEFAULT false,
        popia_consented_at TIMESTAMPTZ,
        last_active_at TIMESTAMPTZ,
        job_alerts_opt_in BOOLEAN NOT NULL DEFAULT false,
        rejection_sent_at TIMESTAMPTZ,
        acceptance_sent_at TIMESTAMPTZ,
        job_posting_id INT NOT NULL REFERENCES cv_assistant_job_postings(id) ON DELETE CASCADE,
        embedding TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_candidate_references (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        relationship VARCHAR(255),
        feedback_token VARCHAR(255) NOT NULL UNIQUE,
        token_expires_at TIMESTAMPTZ NOT NULL,
        feedback_rating INT,
        feedback_text TEXT,
        feedback_submitted_at TIMESTAMPTZ,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        request_sent_at TIMESTAMPTZ,
        reminder_sent_at TIMESTAMPTZ,
        candidate_id INT NOT NULL REFERENCES cv_assistant_candidates(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_job_market_sources (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        api_id VARCHAR(255),
        api_key_encrypted VARCHAR(500),
        country_codes JSONB NOT NULL DEFAULT '["za"]'::jsonb,
        categories JSONB NOT NULL DEFAULT '[]'::jsonb,
        enabled BOOLEAN NOT NULL DEFAULT true,
        rate_limit_per_day INT NOT NULL DEFAULT 250,
        requests_today INT NOT NULL DEFAULT 0,
        requests_reset_at TIMESTAMPTZ,
        last_ingested_at TIMESTAMPTZ,
        ingestion_interval_hours INT NOT NULL DEFAULT 6,
        company_id INT NOT NULL REFERENCES cv_assistant_companies(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_external_jobs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        company VARCHAR(500),
        country VARCHAR(10) NOT NULL DEFAULT 'za',
        location_raw VARCHAR(500),
        location_area VARCHAR(255),
        salary_min DECIMAL(12,2),
        salary_max DECIMAL(12,2),
        salary_currency VARCHAR(10),
        description TEXT,
        extracted_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
        category VARCHAR(255),
        source_external_id VARCHAR(255) NOT NULL,
        source_url VARCHAR(1000),
        posted_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        source_id INT NOT NULL REFERENCES cv_assistant_job_market_sources(id) ON DELETE CASCADE,
        embedding TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_candidate_job_matches (
        id SERIAL PRIMARY KEY,
        candidate_id INT NOT NULL REFERENCES cv_assistant_candidates(id) ON DELETE CASCADE,
        external_job_id INT NOT NULL REFERENCES cv_assistant_external_jobs(id) ON DELETE CASCADE,
        similarity_score DECIMAL(5,4) NOT NULL DEFAULT 0,
        structured_score DECIMAL(5,4) NOT NULL DEFAULT 0,
        overall_score DECIMAL(5,4) NOT NULL DEFAULT 0,
        match_details JSONB,
        notified BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (candidate_id, external_job_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        company_id INT NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        key_p256dh TEXT NOT NULL,
        key_auth TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_cv_assistant_candidates_job ON cv_assistant_candidates(job_posting_id)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_cv_assistant_candidates_status ON cv_assistant_candidates(status)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_cv_assistant_external_jobs_source ON cv_assistant_external_jobs(source_id)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_cv_assistant_candidate_job_matches_candidate ON cv_assistant_candidate_job_matches(candidate_id)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "DROP INDEX IF EXISTS idx_cv_assistant_candidate_job_matches_candidate",
    );
    await queryRunner.query("DROP INDEX IF EXISTS idx_cv_assistant_external_jobs_source");
    await queryRunner.query("DROP INDEX IF EXISTS idx_cv_assistant_candidates_status");
    await queryRunner.query("DROP INDEX IF EXISTS idx_cv_assistant_candidates_job");
  }
}
