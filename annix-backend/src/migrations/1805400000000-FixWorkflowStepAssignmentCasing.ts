import type { MigrationInterface, QueryRunner } from "typeorm";

const STEP_MAPPING: [string, string][] = [
  ["DOCUMENT_UPLOAD", "document_upload"],
  ["ADMIN_APPROVAL", "admin_approval"],
  ["MANAGER_APPROVAL", "manager_approval"],
  ["REQUISITION_SENT", "requisition_sent"],
  ["STOCK_ALLOCATION", "stock_allocation"],
  ["MANAGER_FINAL", "manager_final"],
  ["READY_FOR_DISPATCH", "ready_for_dispatch"],
  ["DISPATCHED", "dispatched"],
];

export class FixWorkflowStepAssignmentCasing1805400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [wrongCase, correctCase] of STEP_MAPPING) {
      await queryRunner.query(
        `DELETE FROM workflow_step_assignments
         WHERE workflow_step = $1
           AND (company_id, user_id) IN (
             SELECT company_id, user_id
             FROM workflow_step_assignments
             WHERE workflow_step = $2
           )`,
        [wrongCase, correctCase],
      );

      await queryRunner.query(
        `UPDATE workflow_step_assignments
         SET workflow_step = $2
         WHERE workflow_step = $1`,
        [wrongCase, correctCase],
      );
    }
  }

  public async down(): Promise<void> {
    // no-op
  }
}
