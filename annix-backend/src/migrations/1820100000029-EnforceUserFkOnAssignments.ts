import type { MigrationInterface, QueryRunner } from "typeorm";

export class EnforceUserFkOnAssignments1820100000029 implements MigrationInterface {
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
    await queryRunner.query(`
      UPDATE workflow_step_assignments
      SET secondary_user_id = NULL
      WHERE secondary_user_id IS NOT NULL
        AND secondary_user_id NOT IN (SELECT id FROM stock_control_users)
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE user_location_assignments
          ADD CONSTRAINT user_location_assignments_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES stock_control_users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE workflow_step_assignments
          ADD CONSTRAINT workflow_step_assignments_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES stock_control_users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE workflow_step_assignments
          ADD CONSTRAINT workflow_step_assignments_secondary_user_id_fkey
          FOREIGN KEY (secondary_user_id) REFERENCES stock_control_users(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE workflow_notifications
          ADD CONSTRAINT workflow_notifications_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES stock_control_users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
  }

  public async down(): Promise<void> {}
}
