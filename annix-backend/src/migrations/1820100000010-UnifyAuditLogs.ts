import type { MigrationInterface, QueryRunner } from "typeorm";

export class UnifyAuditLogs1820100000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE audit_logs
        ADD COLUMN IF NOT EXISTS app_name VARCHAR(50),
        ADD COLUMN IF NOT EXISTS sub_action VARCHAR(100),
        ADD COLUMN IF NOT EXISTS details JSONB,
        ADD COLUMN IF NOT EXISTS company_id INT,
        ADD COLUMN IF NOT EXISTS user_id_raw INT
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_app_name
        ON audit_logs (app_name)
        WHERE app_name IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id
        ON audit_logs (company_id)
        WHERE company_id IS NOT NULL
    `);

    await queryRunner.query(`
      INSERT INTO audit_logs (
        entity_type, entity_id, action, app_name, sub_action,
        details, company_id, user_id_raw, "timestamp"
      )
      SELECT
        COALESCE(csa.entity_type, 'app'),
        csa.entity_id,
        'update',
        'comply-sa',
        csa.action,
        csa.details,
        c.id,
        csa.user_id,
        csa.created_at
      FROM comply_sa_audit_logs csa
      LEFT JOIN companies c ON c.legacy_comply_company_id = csa.company_id
      WHERE NOT EXISTS (
        SELECT 1 FROM audit_logs al
        WHERE al.app_name = 'comply-sa'
          AND al.sub_action = csa.action
          AND al."timestamp" = csa.created_at
          AND COALESCE(al.company_id, 0) = COALESCE(c.id, 0)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM audit_logs WHERE app_name = 'comply-sa'
    `);

    await queryRunner.query("DROP INDEX IF EXISTS idx_audit_logs_company_id");
    await queryRunner.query("DROP INDEX IF EXISTS idx_audit_logs_app_name");

    await queryRunner.query(`
      ALTER TABLE audit_logs
        DROP COLUMN IF EXISTS user_id_raw,
        DROP COLUMN IF EXISTS company_id,
        DROP COLUMN IF EXISTS details,
        DROP COLUMN IF EXISTS sub_action,
        DROP COLUMN IF EXISTS app_name
    `);
  }
}
