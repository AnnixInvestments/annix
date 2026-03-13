import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAnonymousDraftClaimedByForeignKey1807000000023 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "anonymous_drafts"
          ADD CONSTRAINT "FK_anonymous_drafts_claimed_by_user_id"
          FOREIGN KEY ("claimed_by_user_id") REFERENCES "user"("id")
          ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "anonymous_drafts"
        DROP CONSTRAINT IF EXISTS "FK_anonymous_drafts_claimed_by_user_id"
    `);
  }
}
