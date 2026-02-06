import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRubberOrderStatusHistory1738600100000
  implements MigrationInterface
{
  name = 'AddRubberOrderStatusHistory1738600100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rubber_order"
      ADD COLUMN "status_history" jsonb NOT NULL DEFAULT '[]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rubber_order"
      DROP COLUMN "status_history"
    `);
  }
}
