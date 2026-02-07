import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissingAuditFields1780000100000 implements MigrationInterface {
  name = "AddMissingAuditFields1780000100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP DEFAULT now(),
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "user_role"
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP DEFAULT now(),
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "customer_device_bindings"
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_device_bindings"
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "message"
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "broadcast"
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "created_at", DROP COLUMN IF EXISTS "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_role" DROP COLUMN IF EXISTS "created_at", DROP COLUMN IF EXISTS "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_device_bindings" DROP COLUMN IF EXISTS "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_device_bindings" DROP COLUMN IF EXISTS "updated_at"`,
    );
    await queryRunner.query(`ALTER TABLE "message" DROP COLUMN IF EXISTS "updated_at"`);
    await queryRunner.query(`ALTER TABLE "broadcast" DROP COLUMN IF EXISTS "updated_at"`);
  }
}
