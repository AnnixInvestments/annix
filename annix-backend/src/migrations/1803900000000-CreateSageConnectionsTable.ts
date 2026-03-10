import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSageConnectionsTable1803900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sage_connections (
        id SERIAL PRIMARY KEY,
        app_key VARCHAR(50) NOT NULL UNIQUE,
        sage_username VARCHAR(255),
        sage_pass_encrypted BYTEA,
        sage_company_id INTEGER,
        sage_company_name VARCHAR(255),
        enabled BOOLEAN NOT NULL DEFAULT false,
        connected_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      INSERT INTO sage_connections (app_key, enabled)
      VALUES ('au-rubber', false)
      ON CONFLICT (app_key) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS sage_connections;");
  }
}
