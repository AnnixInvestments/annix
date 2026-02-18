import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFieldFlowSalesGoalsTable1784000000000 implements MigrationInterface {
  name = "CreateFieldFlowSalesGoalsTable1784000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "fieldflow_sales_goals_period_enum" AS ENUM ('weekly', 'monthly', 'quarterly')
    `);

    await queryRunner.query(`
      CREATE TABLE "fieldflow_sales_goals" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "period" "fieldflow_sales_goals_period_enum" NOT NULL DEFAULT 'monthly',
        "meetings_target" integer,
        "visits_target" integer,
        "new_prospects_target" integer,
        "revenue_target" numeric(12,2),
        "deals_won_target" integer,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fieldflow_sales_goals" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fieldflow_sales_goals_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "UQ_fieldflow_sales_goals_user_period" UNIQUE ("user_id", "period")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_sales_goals_user_id" ON "fieldflow_sales_goals" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_fieldflow_sales_goals_user_id"`);
    await queryRunner.query(`DROP TABLE "fieldflow_sales_goals"`);
    await queryRunner.query(`DROP TYPE "fieldflow_sales_goals_period_enum"`);
  }
}
