import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCpoCalloffRecords1802900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cpo_calloff_records (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        cpo_id integer NOT NULL REFERENCES customer_purchase_orders(id) ON DELETE CASCADE,
        job_card_id integer REFERENCES job_cards(id) ON DELETE SET NULL,
        requisition_id integer REFERENCES requisitions(id) ON DELETE SET NULL,
        calloff_type varchar(50) NOT NULL,
        status varchar(50) NOT NULL DEFAULT 'pending',
        called_off_at timestamp,
        delivered_at timestamp,
        invoiced_at timestamp,
        notes text,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cpo_calloff_records_cpo_id ON cpo_calloff_records (cpo_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cpo_calloff_records_job_card_id ON cpo_calloff_records (job_card_id) WHERE job_card_id IS NOT NULL
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE cpo_calloff_type AS ENUM ('rubber', 'paint', 'solution');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS cpo_calloff_records");
    await queryRunner.query("DROP TYPE IF EXISTS cpo_calloff_type");
  }
}
