import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameComplySaCodeToAnnixSentinel1820100001800 implements MigrationInterface {
  name = "RenameComplySaCodeToAnnixSentinel1820100001800";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "apps" SET "code" = 'annix-sentinel' WHERE "code" = 'comply-sa'`,
    );
    await queryRunner.query(
      `UPDATE app_branding SET brand_code = 'annix-sentinel' WHERE brand_code = 'comply-sa'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "apps" SET "code" = 'comply-sa' WHERE "code" = 'annix-sentinel'`,
    );
    await queryRunner.query(
      `UPDATE app_branding SET brand_code = 'comply-sa' WHERE brand_code = 'annix-sentinel'`,
    );
  }
}
