import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuCocReadinessStatus1802100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE au_coc_readiness_status AS ENUM (
          'NOT_TRACKED',
          'WAITING_FOR_CALENDERER_COC',
          'WAITING_FOR_COMPOUNDER_COC',
          'WAITING_FOR_GRAPH',
          'WAITING_FOR_APPROVAL',
          'READY_FOR_GENERATION',
          'AUTO_GENERATED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_au_cocs
      ADD COLUMN IF NOT EXISTS readiness_status au_coc_readiness_status NOT NULL DEFAULT 'NOT_TRACKED'
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_au_cocs
      ADD COLUMN IF NOT EXISTS readiness_details jsonb DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_au_cocs
      DROP COLUMN IF EXISTS readiness_details
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_au_cocs
      DROP COLUMN IF EXISTS readiness_status
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS au_coc_readiness_status
    `);
  }
}
