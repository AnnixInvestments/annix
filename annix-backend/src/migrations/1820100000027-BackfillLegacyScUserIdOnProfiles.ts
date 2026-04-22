import type { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillLegacyScUserIdOnProfiles1820100000027 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE stock_control_profiles scp
      SET legacy_sc_user_id = scu.id
      FROM stock_control_users scu
      WHERE scu.unified_user_id = scp.user_id
        AND scp.legacy_sc_user_id IS NULL
    `);
  }

  public async down(): Promise<void> {}
}
