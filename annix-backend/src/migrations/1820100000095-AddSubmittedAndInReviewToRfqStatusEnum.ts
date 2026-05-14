import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddSubmittedAndInReviewToRfqStatusEnum1820100000095 implements MigrationInterface {
  name = "AddSubmittedAndInReviewToRfqStatusEnum1820100000095";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."rfqs_status_enum" ADD VALUE IF NOT EXISTS 'submitted'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."rfqs_status_enum" ADD VALUE IF NOT EXISTS 'in_review'`,
    );
  }

  async down(): Promise<void> {
    // Postgres has no first-class way to remove an enum value once
    // any row may reference it. Reversing this would require
    // rebuilding the enum type and re-casting every column that
    // uses it, which isn't safe to do automatically. Left as a
    // no-op: roll forward, don't try to roll back.
  }
}
