import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkflowStepConfigs1806000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflow_step_configs" (
        "id" SERIAL PRIMARY KEY,
        "company_id" integer NOT NULL,
        "key" varchar(50) NOT NULL,
        "label" varchar(100) NOT NULL,
        "sort_order" integer NOT NULL,
        "is_system" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_workflow_step_configs_company" FOREIGN KEY ("company_id")
          REFERENCES "stock_control_companies"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_workflow_step_configs_company_key" UNIQUE ("company_id", "key")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "workflow_step_configs" ("company_id", "key", "label", "sort_order", "is_system")
      SELECT c.id, s.key, s.label, s.sort_order, true
      FROM "stock_control_companies" c
      CROSS JOIN (
        VALUES
          ('document_upload', 'Doc Upload', 1),
          ('admin_approval', 'Admin', 2),
          ('manager_approval', 'Manager', 3),
          ('requisition_sent', 'Requisition', 4),
          ('stock_allocation', 'Stock Alloc', 5),
          ('manager_final', 'Final Mgr', 6),
          ('ready_for_dispatch', 'Ready', 7),
          ('dispatched', 'Dispatched', 8)
      ) AS s(key, label, sort_order)
      ON CONFLICT ("company_id", "key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_step_configs"`);
  }
}
