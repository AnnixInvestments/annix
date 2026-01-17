import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerRfqReference1768632086970
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rfq_drafts"
      ADD COLUMN IF NOT EXISTS "customer_rfq_reference" VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rfq_drafts"
      DROP COLUMN IF EXISTS "customer_rfq_reference"
    `);
  }
}
