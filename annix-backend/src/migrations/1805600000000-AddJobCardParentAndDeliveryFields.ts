import { MigrationInterface, QueryRunner } from "typeorm";

export class AddJobCardParentAndDeliveryFields1805600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS parent_job_card_id integer;
      ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS jt_dn_number varchar(500);
      ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS workflow_ceiling varchar(50);
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE job_cards ADD CONSTRAINT fk_job_cards_parent
          FOREIGN KEY (parent_job_card_id) REFERENCES job_cards(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_cards_parent_id ON job_cards(parent_job_card_id);
      CREATE INDEX IF NOT EXISTS idx_job_cards_jt_dn_number ON job_cards(jt_dn_number);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_job_cards_jt_dn_number");
    await queryRunner.query("DROP INDEX IF EXISTS idx_job_cards_parent_id");
    await queryRunner.query("ALTER TABLE job_cards DROP CONSTRAINT IF EXISTS fk_job_cards_parent");
    await queryRunner.query("ALTER TABLE job_cards DROP COLUMN IF EXISTS workflow_ceiling");
    await queryRunner.query("ALTER TABLE job_cards DROP COLUMN IF EXISTS jt_dn_number");
    await queryRunner.query("ALTER TABLE job_cards DROP COLUMN IF EXISTS parent_job_card_id");
  }
}
