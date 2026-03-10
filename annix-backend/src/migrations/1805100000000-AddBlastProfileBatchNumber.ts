import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddBlastProfileBatchNumber1805100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE qc_blast_profiles
        ADD COLUMN IF NOT EXISTS abrasive_batch_number varchar(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE qc_blast_profiles
        DROP COLUMN IF EXISTS abrasive_batch_number
    `);
  }
}
