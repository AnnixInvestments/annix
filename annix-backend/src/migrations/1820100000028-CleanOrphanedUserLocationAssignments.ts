import type { MigrationInterface, QueryRunner } from "typeorm";

export class CleanOrphanedUserLocationAssignments1820100000028 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_location_assignments
      WHERE user_id NOT IN (SELECT id FROM stock_control_users)
    `);
    await queryRunner.query(`
      DELETE FROM workflow_step_assignments
      WHERE user_id NOT IN (SELECT id FROM stock_control_users)
    `);
    await queryRunner.query(`
      DELETE FROM workflow_notifications
      WHERE user_id NOT IN (SELECT id FROM stock_control_users)
    `);
  }

  public async down(): Promise<void> {}
}
