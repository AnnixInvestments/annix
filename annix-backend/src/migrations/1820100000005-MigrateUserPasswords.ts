import type { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateUserPasswords1820100000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "user"
      SET password_hash = password
      WHERE password IS NOT NULL
        AND password_hash IS NULL
    `);

    await queryRunner.query(`
      UPDATE "user" u
      SET password_hash = scu.password_hash
      FROM stock_control_users scu
      WHERE scu.unified_user_id = u.id
        AND u.password_hash IS NULL
        AND scu.password_hash IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE "user" u
      SET email_verified = true
      FROM stock_control_users scu
      WHERE scu.unified_user_id = u.id
        AND scu.email_verified = true
        AND u.email_verified = false
    `);

    await queryRunner.query(`
      UPDATE "user" u
      SET email_verified = true
      FROM customer_profiles cp
      WHERE cp.user_id = u.id
        AND cp.email_verified = true
        AND u.email_verified = false
    `);

    await queryRunner.query(`
      UPDATE "user" u
      SET email_verified = true
      FROM supplier_profiles sp
      WHERE sp.user_id = u.id
        AND sp.email_verified = true
        AND u.email_verified = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "user"
      SET password_hash = NULL,
          email_verified = false
    `);
  }
}
