import { MigrationInterface, QueryRunner } from "typeorm";

export class ComplySaInitialSchema1807000000000 implements MigrationInterface {
  name = "ComplySaInitialSchema1807000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comply_sa_companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        registration_number VARCHAR(50),
        trading_name VARCHAR(255),
        industry VARCHAR(100),
        sector_code VARCHAR(20),
        employee_count INT NOT NULL DEFAULT 0,
        annual_turnover DECIMAL(14, 2),
        vat_registered BOOLEAN NOT NULL DEFAULT false,
        vat_number VARCHAR(20),
        imports_exports BOOLEAN NOT NULL DEFAULT false,
        handles_personal_data BOOLEAN NOT NULL DEFAULT false,
        has_payroll BOOLEAN NOT NULL DEFAULT false,
        registration_date VARCHAR(50),
        financial_year_end_month INT,
        province VARCHAR(100),
        municipality VARCHAR(100),
        subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free',
        subscription_status VARCHAR(20) NOT NULL DEFAULT 'trial',
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comply_sa_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'owner',
        company_id INT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT fk_comply_sa_users_company FOREIGN KEY (company_id) REFERENCES comply_sa_companies(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_comply_sa_users_email ON comply_sa_users(email)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comply_sa_compliance_requirements (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        regulator VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        applicable_conditions JSONB,
        frequency VARCHAR(20) NOT NULL,
        deadline_rule JSONB,
        penalty_description TEXT,
        guidance_url VARCHAR(500),
        required_documents JSONB,
        checklist_steps JSONB,
        tier INT NOT NULL DEFAULT 1
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_comply_sa_compliance_requirements_code ON comply_sa_compliance_requirements(code)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comply_sa_compliance_statuses (
        id SERIAL PRIMARY KEY,
        company_id INT NOT NULL,
        requirement_id INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
        last_completed_date VARCHAR(50),
        next_due_date VARCHAR(50),
        notes TEXT,
        completed_by_user_id INT,
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT fk_comply_sa_compliance_statuses_company FOREIGN KEY (company_id) REFERENCES comply_sa_companies(id) ON DELETE CASCADE,
        CONSTRAINT fk_comply_sa_compliance_statuses_requirement FOREIGN KEY (requirement_id) REFERENCES comply_sa_compliance_requirements(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_comply_sa_compliance_statuses_company_id ON comply_sa_compliance_statuses(company_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comply_sa_compliance_checklist_progress (
        id SERIAL PRIMARY KEY,
        company_id INT NOT NULL,
        requirement_id INT NOT NULL,
        step_index INT NOT NULL,
        step_label VARCHAR(500) NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT false,
        completed_at VARCHAR(50),
        completed_by_user_id INT,
        notes TEXT,
        CONSTRAINT fk_comply_sa_checklist_company FOREIGN KEY (company_id) REFERENCES comply_sa_companies(id) ON DELETE CASCADE,
        CONSTRAINT fk_comply_sa_checklist_requirement FOREIGN KEY (requirement_id) REFERENCES comply_sa_compliance_requirements(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_comply_sa_checklist_progress_company_id ON comply_sa_compliance_checklist_progress(company_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comply_sa_documents (
        id SERIAL PRIMARY KEY,
        company_id INT NOT NULL,
        requirement_id INT,
        name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100),
        size_bytes INT,
        uploaded_by_user_id INT,
        expiry_date VARCHAR(50),
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT fk_comply_sa_documents_company FOREIGN KEY (company_id) REFERENCES comply_sa_companies(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_comply_sa_documents_company_id ON comply_sa_documents(company_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comply_sa_notifications (
        id SERIAL PRIMARY KEY,
        company_id INT NOT NULL,
        user_id INT,
        requirement_id INT,
        channel VARCHAR(20) NOT NULL,
        type VARCHAR(30) NOT NULL,
        message TEXT NOT NULL,
        sent_at TIMESTAMP NOT NULL DEFAULT now(),
        read_at VARCHAR(50)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_comply_sa_notifications_company_id ON comply_sa_notifications(company_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comply_sa_audit_logs (
        id SERIAL PRIMARY KEY,
        company_id INT NOT NULL,
        user_id INT,
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INT,
        details JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_comply_sa_audit_logs_company_id ON comply_sa_audit_logs(company_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_audit_logs");
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_notifications");
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_documents");
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_compliance_checklist_progress");
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_compliance_statuses");
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_compliance_requirements");
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_users");
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_companies");
  }
}
