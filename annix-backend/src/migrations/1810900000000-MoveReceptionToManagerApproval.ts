import { MigrationInterface, QueryRunner } from "typeorm";

export class MoveReceptionToManagerApproval1810900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET trigger_after_step = 'manager_approval',
          sort_order = 4,
          branch_color = NULL
      WHERE key = 'reception'
        AND is_background = true
    `);

    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET sort_order = 2
      WHERE key = 'stock_allocation'
        AND is_background = true
        AND trigger_after_step = 'admin_approval'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET trigger_after_step = 'admin_approval',
          sort_order = 2,
          branch_color = NULL
      WHERE key = 'reception'
        AND is_background = true
    `);

    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET sort_order = 3
      WHERE key = 'stock_allocation'
        AND is_background = true
        AND trigger_after_step = 'admin_approval'
    `);
  }
}
