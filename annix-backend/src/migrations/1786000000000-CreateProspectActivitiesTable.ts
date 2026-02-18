import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProspectActivitiesTable1786000000000 implements MigrationInterface {
  name = "CreateProspectActivitiesTable1786000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "annix_rep_prospect_activity_type_enum" AS ENUM (
        'created',
        'status_change',
        'note_added',
        'follow_up_completed',
        'field_updated',
        'tag_added',
        'tag_removed',
        'merged',
        'contacted'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "annix_rep_prospect_activities" (
        "id" SERIAL NOT NULL,
        "prospect_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "activity_type" "annix_rep_prospect_activity_type_enum" NOT NULL,
        "old_values" json,
        "new_values" json,
        "description" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_annix_rep_prospect_activities" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_prospect_activities"
      ADD CONSTRAINT "FK_annix_rep_prospect_activities_prospect"
      FOREIGN KEY ("prospect_id") REFERENCES "annix_rep_prospects"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_prospect_activities"
      ADD CONSTRAINT "FK_annix_rep_prospect_activities_user"
      FOREIGN KEY ("user_id") REFERENCES "user"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_prospect_activities_prospect"
      ON "annix_rep_prospect_activities" ("prospect_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_prospect_activities_user"
      ON "annix_rep_prospect_activities" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_prospect_activities_created_at"
      ON "annix_rep_prospect_activities" ("created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_annix_rep_prospect_activities_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_annix_rep_prospect_activities_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_annix_rep_prospect_activities_prospect"`);
    await queryRunner.query(
      `ALTER TABLE "annix_rep_prospect_activities" DROP CONSTRAINT IF EXISTS "FK_annix_rep_prospect_activities_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_prospect_activities" DROP CONSTRAINT IF EXISTS "FK_annix_rep_prospect_activities_prospect"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "annix_rep_prospect_activities"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "annix_rep_prospect_activity_type_enum"`);
  }
}
