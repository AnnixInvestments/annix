import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePriorityToStartFrom11780000100000 implements MigrationInterface {
  name = "UpdatePriorityToStartFrom11780000100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE customer_preferred_suppliers SET priority = 1 WHERE priority = 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE customer_preferred_suppliers SET priority = 0 WHERE priority = 1
    `);
  }
}
