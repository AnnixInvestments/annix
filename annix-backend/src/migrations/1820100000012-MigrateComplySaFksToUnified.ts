import type { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateComplySaFksToUnified1820100000012 implements MigrationInterface {
  private readonly tables = [
    "comply_sa_compliance_statuses",
    "comply_sa_compliance_checklist_progress",
    "comply_sa_documents",
    "comply_sa_subscriptions",
    "comply_sa_notifications",
    "comply_sa_sage_connections",
    "comply_sa_api_keys",
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`
        ALTER TABLE ${table}
          ADD COLUMN IF NOT EXISTS unified_company_id INT REFERENCES companies(id)
      `);

      await queryRunner.query(`
        UPDATE ${table} t
        SET unified_company_id = c.id
        FROM companies c
        WHERE c.legacy_comply_company_id = t.company_id
          AND t.unified_company_id IS NULL
      `);
    }

    await queryRunner.query(`
      ALTER TABLE comply_sa_advisor_clients
        ADD COLUMN IF NOT EXISTS unified_client_company_id INT REFERENCES companies(id),
        ADD COLUMN IF NOT EXISTS unified_advisor_user_id INT REFERENCES "user"(id)
    `);

    await queryRunner.query(`
      UPDATE comply_sa_advisor_clients ac
      SET unified_client_company_id = c.id
      FROM companies c
      WHERE c.legacy_comply_company_id = ac.client_company_id
        AND ac.unified_client_company_id IS NULL
    `);

    await queryRunner.query(`
      UPDATE comply_sa_advisor_clients ac
      SET unified_advisor_user_id = u.id
      FROM comply_sa_users csu
      JOIN "user" u ON LOWER(u.email) = LOWER(csu.email)
      WHERE csu.id = ac.advisor_user_id
        AND ac.unified_advisor_user_id IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE comply_sa_notifications
        ADD COLUMN IF NOT EXISTS unified_user_id INT REFERENCES "user"(id)
    `);

    await queryRunner.query(`
      UPDATE comply_sa_notifications n
      SET unified_user_id = u.id
      FROM comply_sa_users csu
      JOIN "user" u ON LOWER(u.email) = LOWER(csu.email)
      WHERE csu.id = n.user_id
        AND n.unified_user_id IS NULL
    `);

    for (const table of this.tables) {
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS fk_${table}_legacy_company;
        EXCEPTION WHEN undefined_object THEN NULL;
        END $$
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE comply_sa_notifications DROP COLUMN IF EXISTS unified_user_id",
    );
    await queryRunner.query(
      "ALTER TABLE comply_sa_advisor_clients DROP COLUMN IF EXISTS unified_advisor_user_id",
    );
    await queryRunner.query(
      "ALTER TABLE comply_sa_advisor_clients DROP COLUMN IF EXISTS unified_client_company_id",
    );

    for (const table of [...this.tables].reverse()) {
      await queryRunner.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS unified_company_id`);
    }
  }
}
