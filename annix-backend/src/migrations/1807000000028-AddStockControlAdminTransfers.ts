import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStockControlAdminTransfers1807000000028 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_control_admin_transfers" (
        "id" SERIAL PRIMARY KEY,
        "company_id" integer NOT NULL,
        "initiated_by_id" integer NOT NULL,
        "target_email" varchar(255) NOT NULL,
        "token" varchar(255) NOT NULL,
        "new_role_for_initiator" varchar(50),
        "status" varchar(50) NOT NULL DEFAULT 'pending',
        "expires_at" timestamptz NOT NULL,
        "accepted_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_admin_transfer_company" FOREIGN KEY ("company_id")
          REFERENCES "stock_control_companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_admin_transfer_initiator" FOREIGN KEY ("initiated_by_id")
          REFERENCES "stock_control_users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_admin_transfer_token"
      ON "stock_control_admin_transfers" ("token")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_transfer_company_status"
      ON "stock_control_admin_transfers" ("company_id", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_transfer_target_email_status"
      ON "stock_control_admin_transfers" ("target_email", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_transfer_target_email_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_transfer_company_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_transfer_token"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_control_admin_transfers"`);
  }
}
