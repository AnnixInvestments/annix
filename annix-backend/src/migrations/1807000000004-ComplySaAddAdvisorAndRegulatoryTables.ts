import { MigrationInterface, QueryRunner } from "typeorm";

export class ComplySaAddAdvisorAndRegulatoryTables1807000000004 implements MigrationInterface {
  name = "ComplySaAddAdvisorAndRegulatoryTables1807000000004";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comply_sa_advisor_clients (
        id SERIAL PRIMARY KEY,
        advisor_user_id INTEGER NOT NULL REFERENCES comply_sa_users(id) ON DELETE CASCADE,
        client_company_id INTEGER NOT NULL REFERENCES comply_sa_companies(id) ON DELETE CASCADE,
        added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE(advisor_user_id, client_company_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comply_sa_regulatory_updates (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        summary TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        effective_date VARCHAR(50),
        source_url VARCHAR(500),
        affected_requirement_codes JSONB,
        published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_regulatory_updates");
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_advisor_clients");
  }
}
