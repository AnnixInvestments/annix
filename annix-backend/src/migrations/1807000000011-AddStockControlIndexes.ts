import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStockControlIndexes1807000000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_stock_items_company_category ON stock_items(company_id, category)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_stock_items_company_sku ON stock_items(company_id, sku)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_job_cards_company_status ON job_cards(company_id, status)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_job_cards_company_workflow_status ON job_cards(company_id, workflow_status)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_stock_allocations_job_card_pending ON stock_allocations(job_card_id, pending_approval)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_stock_movements_company_created ON stock_movements(company_id, created_at)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_dispatch_scans_job_card_stock_item ON dispatch_scans(job_card_id, stock_item_id)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_job_card_approvals_job_card_step_status ON job_card_approvals(job_card_id, step, status)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_stock_items_company_category");
    await queryRunner.query("DROP INDEX IF EXISTS idx_stock_items_company_sku");
    await queryRunner.query("DROP INDEX IF EXISTS idx_job_cards_company_status");
    await queryRunner.query("DROP INDEX IF EXISTS idx_job_cards_company_workflow_status");
    await queryRunner.query("DROP INDEX IF EXISTS idx_stock_allocations_job_card_pending");
    await queryRunner.query("DROP INDEX IF EXISTS idx_stock_movements_company_created");
    await queryRunner.query("DROP INDEX IF EXISTS idx_dispatch_scans_job_card_stock_item");
    await queryRunner.query("DROP INDEX IF EXISTS idx_job_card_approvals_job_card_step_status");
  }
}
