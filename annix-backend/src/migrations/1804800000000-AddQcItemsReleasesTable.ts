import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddQcItemsReleasesTable1804800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS qc_items_releases (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        job_card_id integer NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
        items jsonb NOT NULL DEFAULT '[]',
        total_quantity numeric(12,2) NOT NULL DEFAULT 0,
        checked_by_name varchar(255),
        checked_by_date date,
        pls_sign_off jsonb NOT NULL DEFAULT '{}',
        mps_sign_off jsonb NOT NULL DEFAULT '{}',
        client_sign_off jsonb NOT NULL DEFAULT '{}',
        comments text,
        created_by_name varchar(255) NOT NULL,
        created_by_id integer,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_items_releases_company
        ON qc_items_releases (company_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_items_releases_job_card
        ON qc_items_releases (job_card_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS qc_items_releases");
  }
}
