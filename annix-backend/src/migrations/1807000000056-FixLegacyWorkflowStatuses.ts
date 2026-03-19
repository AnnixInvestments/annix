import { MigrationInterface, QueryRunner } from "typeorm";

export class FixLegacyWorkflowStatuses1807000000056 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const companies = await queryRunner.query(
      `SELECT DISTINCT company_id FROM workflow_step_configs`,
    );

    for (const { company_id: companyId } of companies) {
      const fgSteps: Array<{ key: string; sort_order: number }> = await queryRunner.query(
        `SELECT key, sort_order FROM workflow_step_configs WHERE company_id = $1 AND is_background = false ORDER BY sort_order`,
        [companyId],
      );

      if (fgSteps.length < 3) continue;

      const thirdFgKey = fgSteps[2].key;

      await queryRunner.query(
        `UPDATE job_cards SET workflow_status = $1
         WHERE company_id = $2
         AND workflow_status IN ('document_uploaded', 'document_upload')`,
        [fgSteps[0].key, companyId],
      );

      await queryRunner.query(
        `UPDATE job_cards SET workflow_status = $1
         WHERE company_id = $2
         AND workflow_status IN ('admin_approved')`,
        [fgSteps[1].key, companyId],
      );

      await queryRunner.query(
        `UPDATE job_cards SET workflow_status = $1
         WHERE company_id = $2
         AND workflow_status IN ('manager_approved', 'requisition_sent', 'requisition', 'stock_allocated', 'stock_allocation', 'manager_final', 'quality_check')
         AND workflow_status NOT IN (SELECT key FROM workflow_step_configs WHERE company_id = $2 AND is_background = false)`,
        [thirdFgKey, companyId],
      );

      if (fgSteps.length >= 4) {
        await queryRunner.query(
          `UPDATE job_cards SET workflow_status = $1
           WHERE company_id = $2
           AND workflow_status IN ('ready_for_dispatch', 'ready')
           AND workflow_status NOT IN (SELECT key FROM workflow_step_configs WHERE company_id = $2 AND is_background = false)`,
          [fgSteps[3].key, companyId],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Legacy statuses cannot be reliably restored
  }
}
