import { MigrationInterface, QueryRunner } from "typeorm";

export class SwapReceptionStockAllocSortOrder1810800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET sort_order = 2
      WHERE key = 'reception'
        AND is_background = true
        AND trigger_after_step = 'admin_approval'
        AND sort_order = 3
    `);

    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET sort_order = 3
      WHERE key = 'stock_allocation'
        AND is_background = true
        AND trigger_after_step = 'admin_approval'
        AND sort_order = 2
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET sort_order = 3
      WHERE key = 'reception'
        AND is_background = true
        AND trigger_after_step = 'admin_approval'
        AND sort_order = 2
    `);

    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET sort_order = 2
      WHERE key = 'stock_allocation'
        AND is_background = true
        AND trigger_after_step = 'admin_approval'
        AND sort_order = 3
    `);
  }
}
