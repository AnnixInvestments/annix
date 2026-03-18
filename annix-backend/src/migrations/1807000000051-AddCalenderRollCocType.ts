import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCalenderRollCocType1807000000051 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "supplier_coc_type_enum"
      ADD VALUE IF NOT EXISTS 'CALENDER_ROLL'
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_supplier_cocs
      ADD COLUMN IF NOT EXISTS linked_calender_roll_coc_id INT NULL
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE rubber_supplier_cocs
        ADD CONSTRAINT fk_linked_calender_roll_coc
        FOREIGN KEY (linked_calender_roll_coc_id)
        REFERENCES rubber_supplier_cocs(id)
        ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_supplier_cocs
      DROP CONSTRAINT IF EXISTS fk_linked_calender_roll_coc
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_supplier_cocs
      DROP COLUMN IF EXISTS linked_calender_roll_coc_id
    `);
  }
}
