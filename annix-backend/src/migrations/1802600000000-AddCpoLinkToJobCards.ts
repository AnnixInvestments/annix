import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCpoLinkToJobCards1802600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE job_cards
        ADD COLUMN IF NOT EXISTS cpo_id integer REFERENCES customer_purchase_orders(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS is_cpo_calloff boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_cards_cpo_id ON job_cards (cpo_id) WHERE cpo_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_job_cards_cpo_id");
    await queryRunner.query("ALTER TABLE job_cards DROP COLUMN IF EXISTS is_cpo_calloff");
    await queryRunner.query("ALTER TABLE job_cards DROP COLUMN IF EXISTS cpo_id");
  }
}
