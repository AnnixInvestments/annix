import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProspectScoringAndAssignment1787000000000 implements MigrationInterface {
  name = "AddProspectScoringAndAssignment1787000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "annix_rep_prospects"
      ADD COLUMN "score" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_prospects"
      ADD COLUMN "score_updated_at" TIMESTAMP
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_prospects"
      ADD COLUMN "assigned_to_id" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_prospects"
      ADD CONSTRAINT "FK_annix_rep_prospects_assigned_to"
      FOREIGN KEY ("assigned_to_id") REFERENCES "user"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_prospects_score"
      ON "annix_rep_prospects" ("score" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_prospects_assigned_to"
      ON "annix_rep_prospects" ("assigned_to_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_annix_rep_prospects_assigned_to"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_annix_rep_prospects_score"`);
    await queryRunner.query(
      `ALTER TABLE "annix_rep_prospects" DROP CONSTRAINT IF EXISTS "FK_annix_rep_prospects_assigned_to"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_prospects" DROP COLUMN IF EXISTS "assigned_to_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_prospects" DROP COLUMN IF EXISTS "score_updated_at"`,
    );
    await queryRunner.query(`ALTER TABLE "annix_rep_prospects" DROP COLUMN IF EXISTS "score"`);
  }
}
