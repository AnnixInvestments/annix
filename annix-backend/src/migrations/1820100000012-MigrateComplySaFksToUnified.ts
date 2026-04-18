import type { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateComplySaFksToUnified1820100000012 implements MigrationInterface {
  private readonly companyIdTables = [
    "comply_sa_compliance_statuses",
    "comply_sa_compliance_checklist_progress",
    "comply_sa_documents",
    "comply_sa_subscriptions",
    "comply_sa_notifications",
    "comply_sa_sage_connections",
    "comply_sa_api_keys",
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.companyIdTables) {
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS "FK_${table}_company";
        EXCEPTION WHEN undefined_object THEN NULL;
        END $$
      `);

      await queryRunner.query(`
        UPDATE ${table} t
        SET company_id = c.id
        FROM companies c
        WHERE c.legacy_comply_company_id = t.company_id
      `);

      await queryRunner.query(`
        ALTER TABLE ${table}
          ADD CONSTRAINT "FK_${table}_company"
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      `);
    }

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE comply_sa_advisor_clients
          DROP CONSTRAINT IF EXISTS "FK_comply_sa_advisor_clients_company";
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE comply_sa_advisor_clients
          DROP CONSTRAINT IF EXISTS "FK_comply_sa_advisor_clients_user";
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      UPDATE comply_sa_advisor_clients ac
      SET client_company_id = c.id
      FROM companies c
      WHERE c.legacy_comply_company_id = ac.client_company_id
    `);

    await queryRunner.query(`
      UPDATE comply_sa_advisor_clients ac
      SET advisor_user_id = u.id
      FROM comply_sa_users csu
      JOIN "user" u ON LOWER(u.email) = LOWER(csu.email)
      WHERE csu.id = ac.advisor_user_id
    `);

    await queryRunner.query(`
      ALTER TABLE comply_sa_advisor_clients
        ADD CONSTRAINT "FK_comply_sa_advisor_clients_company"
        FOREIGN KEY (client_company_id) REFERENCES companies(id) ON DELETE CASCADE,
        ADD CONSTRAINT "FK_comply_sa_advisor_clients_user"
        FOREIGN KEY (advisor_user_id) REFERENCES "user"(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE comply_sa_notifications
          DROP CONSTRAINT IF EXISTS "FK_comply_sa_notifications_user";
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      UPDATE comply_sa_notifications n
      SET user_id = u.id
      FROM comply_sa_users csu
      JOIN "user" u ON LOWER(u.email) = LOWER(csu.email)
      WHERE csu.id = n.user_id
        AND n.user_id IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE comply_sa_notifications
        ADD CONSTRAINT "FK_comply_sa_notifications_user"
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE SET NULL
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Down migration not supported — legacy company/user IDs are not recoverable
    // after the swap. Restore from backup if rollback is needed.
  }
}
