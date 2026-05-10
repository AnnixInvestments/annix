import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The feature_flags.description column was created as varchar(255) but
 * several flag descriptions in feature-flags.constants.ts exceed that
 * limit (CV Assistant EE compliance, Stock Mgmt Nix quote-from-documents).
 * Every call to ensureFlags failed mid-batch on the long-description
 * insert, which crashed the whole /feature-flags endpoint with HTTP 500
 * and prevented frontend gating from working.
 *
 * Promote the column to TEXT so descriptions can grow as features grow.
 * No data loss — TEXT accepts everything varchar did.
 */
export class WidenFeatureFlagDescriptionToText1820100000075 implements MigrationInterface {
  name = "WidenFeatureFlagDescriptionToText1820100000075";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "feature_flags" ALTER COLUMN "description" TYPE text`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "feature_flags" ALTER COLUMN "description" TYPE varchar(255)`,
    );
  }
}
