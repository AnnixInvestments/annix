import { MigrationInterface, QueryRunner } from "typeorm";

export class IncreaseJobCardFieldLengths1799910000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_cards"
        ALTER COLUMN "job_number" TYPE VARCHAR(500),
        ALTER COLUMN "jc_number" TYPE VARCHAR(500),
        ALTER COLUMN "po_number" TYPE VARCHAR(500),
        ALTER COLUMN "due_date" TYPE VARCHAR(500)
    `);

    await queryRunner.query(`
      ALTER TABLE "job_card_line_items"
        ALTER COLUMN "item_code" TYPE VARCHAR(500),
        ALTER COLUMN "item_no" TYPE VARCHAR(500),
        ALTER COLUMN "jt_no" TYPE VARCHAR(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_card_line_items"
        ALTER COLUMN "item_code" TYPE VARCHAR(100),
        ALTER COLUMN "item_no" TYPE VARCHAR(100),
        ALTER COLUMN "jt_no" TYPE VARCHAR(100)
    `);

    await queryRunner.query(`
      ALTER TABLE "job_cards"
        ALTER COLUMN "job_number" TYPE VARCHAR(100),
        ALTER COLUMN "jc_number" TYPE VARCHAR(100),
        ALTER COLUMN "po_number" TYPE VARCHAR(100),
        ALTER COLUMN "due_date" TYPE VARCHAR(100)
    `);
  }
}
