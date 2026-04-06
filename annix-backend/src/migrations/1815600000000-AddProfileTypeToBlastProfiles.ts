import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProfileTypeToBlastProfiles1815600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE qc_blast_profiles
      ADD COLUMN IF NOT EXISTS profile_type varchar(50) NOT NULL DEFAULT 'blast'
    `);
    await queryRunner.query(`
      ALTER TABLE qc_blast_profiles
      ADD COLUMN IF NOT EXISTS coat_label varchar(255) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE qc_blast_profiles DROP COLUMN IF EXISTS coat_label
    `);
    await queryRunner.query(`
      ALTER TABLE qc_blast_profiles DROP COLUMN IF EXISTS profile_type
    `);
  }
}
