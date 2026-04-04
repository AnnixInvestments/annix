import { type MigrationInterface, type QueryRunner } from "typeorm";

export class AddCertLinkToDefelskoBatches1812000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE qc_defelsko_batches
        ADD COLUMN IF NOT EXISTS supplier_certificate_id INTEGER;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE qc_defelsko_batches
          ADD CONSTRAINT fk_defelsko_cert
          FOREIGN KEY (supplier_certificate_id)
          REFERENCES supplier_certificates(id)
          ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE qc_defelsko_batches
        DROP CONSTRAINT IF EXISTS fk_defelsko_cert;
    `);

    await queryRunner.query(`
      ALTER TABLE qc_defelsko_batches
        DROP COLUMN IF EXISTS supplier_certificate_id;
    `);
  }
}
