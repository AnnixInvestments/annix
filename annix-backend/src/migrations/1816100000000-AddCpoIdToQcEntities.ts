import { type MigrationInterface, type QueryRunner } from "typeorm";

export class AddCpoIdToQcEntities1816100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE qc_control_plans ALTER COLUMN job_card_id DROP NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE qc_items_releases ALTER COLUMN job_card_id DROP NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE qc_release_certificates ALTER COLUMN job_card_id DROP NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'qc_control_plans' AND column_name = 'cpo_id'
        ) THEN
          ALTER TABLE qc_control_plans ADD COLUMN cpo_id INTEGER
            REFERENCES customer_purchase_orders(id) ON DELETE CASCADE;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'qc_items_releases' AND column_name = 'cpo_id'
        ) THEN
          ALTER TABLE qc_items_releases ADD COLUMN cpo_id INTEGER
            REFERENCES customer_purchase_orders(id) ON DELETE CASCADE;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'qc_release_certificates' AND column_name = 'cpo_id'
        ) THEN
          ALTER TABLE qc_release_certificates ADD COLUMN cpo_id INTEGER
            REFERENCES customer_purchase_orders(id) ON DELETE CASCADE;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_control_plans_cpo_id
        ON qc_control_plans(cpo_id) WHERE cpo_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_items_releases_cpo_id
        ON qc_items_releases(cpo_id) WHERE cpo_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_release_certificates_cpo_id
        ON qc_release_certificates(cpo_id) WHERE cpo_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_qc_release_certificates_cpo_id");
    await queryRunner.query("DROP INDEX IF EXISTS idx_qc_items_releases_cpo_id");
    await queryRunner.query("DROP INDEX IF EXISTS idx_qc_control_plans_cpo_id");
    await queryRunner.query("ALTER TABLE qc_release_certificates DROP COLUMN IF EXISTS cpo_id");
    await queryRunner.query("ALTER TABLE qc_items_releases DROP COLUMN IF EXISTS cpo_id");
    await queryRunner.query("ALTER TABLE qc_control_plans DROP COLUMN IF EXISTS cpo_id");
  }
}
