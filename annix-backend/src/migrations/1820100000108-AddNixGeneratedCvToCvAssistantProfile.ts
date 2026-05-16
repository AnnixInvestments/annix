import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNixGeneratedCvToCvAssistantProfile1820100000108 implements MigrationInterface {
  name = "AddNixGeneratedCvToCvAssistantProfile1820100000108";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cv_assistant_profiles" ADD COLUMN IF NOT EXISTS "nix_generated_cv" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_assistant_profiles" ADD COLUMN IF NOT EXISTS "nix_generated_cv_at" timestamptz`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cv_assistant_profiles" DROP COLUMN IF EXISTS "nix_generated_cv_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_assistant_profiles" DROP COLUMN IF EXISTS "nix_generated_cv"`,
    );
  }
}
