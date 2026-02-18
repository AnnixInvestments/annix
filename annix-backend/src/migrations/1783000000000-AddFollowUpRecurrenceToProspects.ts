import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFollowUpRecurrenceToProspects1783000000000 implements MigrationInterface {
  name = "AddFollowUpRecurrenceToProspects1783000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "fieldflow_followup_recurrence_enum" AS ENUM (
        'none', 'daily', 'weekly', 'biweekly', 'monthly'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "fieldflow_prospects"
      ADD COLUMN "follow_up_recurrence" "fieldflow_followup_recurrence_enum" NOT NULL DEFAULT 'none'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "fieldflow_prospects"
      DROP COLUMN "follow_up_recurrence"
    `);

    await queryRunner.query(`
      DROP TYPE "fieldflow_followup_recurrence_enum"
    `);
  }
}
