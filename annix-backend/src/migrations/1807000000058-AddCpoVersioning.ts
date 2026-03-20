import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCpoVersioning1807000000058 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_purchase_orders
      ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1
    `);

    await queryRunner.query(`
      ALTER TABLE customer_purchase_orders
      ADD COLUMN IF NOT EXISTS previous_versions jsonb DEFAULT '[]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_purchase_orders
      DROP COLUMN IF EXISTS previous_versions
    `);
    await queryRunner.query(`
      ALTER TABLE customer_purchase_orders
      DROP COLUMN IF EXISTS version_number
    `);
  }
}
