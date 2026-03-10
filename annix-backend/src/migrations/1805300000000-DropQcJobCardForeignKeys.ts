import type { MigrationInterface, QueryRunner } from "typeorm";

const QC_TABLES = [
  "qc_shore_hardness",
  "qc_dft_readings",
  "qc_blast_profiles",
  "qc_dust_debris_tests",
  "qc_pull_tests",
  "qc_control_plans",
  "qc_release_certificates",
  "qc_items_releases",
];

export class DropQcJobCardForeignKeys1805300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of QC_TABLES) {
      await queryRunner.query(`
        DO $$ DECLARE fk_name TEXT;
        BEGIN
          SELECT conname INTO fk_name
          FROM pg_constraint
          WHERE conrelid = '${table}'::regclass
            AND contype = 'f'
            AND EXISTS (
              SELECT 1 FROM pg_attribute
              WHERE attrelid = conrelid
                AND attnum = ANY(conkey)
                AND attname = 'job_card_id'
            );

          IF fk_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE ${table} DROP CONSTRAINT %I', fk_name);
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of QC_TABLES) {
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE ${table}
            ADD CONSTRAINT fk_${table}_job_card
            FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
    }
  }
}
