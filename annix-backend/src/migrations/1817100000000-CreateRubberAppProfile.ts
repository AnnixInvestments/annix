import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRubberAppProfile1817100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rubber_app_profile (
        id INT PRIMARY KEY DEFAULT 1,
        legal_name VARCHAR(255),
        trading_name VARCHAR(255),
        vat_number VARCHAR(50),
        registration_number VARCHAR(100),
        street_address VARCHAR(500),
        city VARCHAR(100),
        province VARCHAR(100),
        postal_code VARCHAR(20),
        postal_address VARCHAR(500),
        delivery_address VARCHAR(500),
        phone VARCHAR(50),
        email VARCHAR(255),
        website_url VARCHAR(255),
        logo_url VARCHAR(500),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT rubber_app_profile_single_row CHECK (id = 1)
      )
    `);

    await queryRunner.query(`
      INSERT INTO rubber_app_profile (id) VALUES (1)
      ON CONFLICT (id) DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS rubber_app_profile");
  }
}
