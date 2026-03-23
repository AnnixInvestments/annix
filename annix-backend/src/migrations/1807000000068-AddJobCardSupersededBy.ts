import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddJobCardSupersededBy1807000000068 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE job_cards
      ADD COLUMN IF NOT EXISTS superseded_by_id INTEGER
      REFERENCES job_cards(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_cards_superseded_by
      ON job_cards (superseded_by_id)
      WHERE superseded_by_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_job_cards_superseded_by`);
    await queryRunner.query(`ALTER TABLE job_cards DROP COLUMN IF EXISTS superseded_by_id`);
  }
}
