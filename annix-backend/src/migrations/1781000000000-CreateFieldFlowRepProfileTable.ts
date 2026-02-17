import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFieldFlowRepProfileTable1781000000000 implements MigrationInterface {
  name = "CreateFieldFlowRepProfileTable1781000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "fieldflow_rep_profiles" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "industry" character varying(100) NOT NULL,
        "sub_industry" character varying(100) NOT NULL,
        "product_categories" text NOT NULL,
        "company_name" character varying(255) NULL,
        "job_title" character varying(100) NULL,
        "territory_description" text NULL,
        "default_search_latitude" decimal(10,7) NULL,
        "default_search_longitude" decimal(10,7) NULL,
        "default_search_radius_km" integer NOT NULL DEFAULT 25,
        "target_customer_profile" jsonb NULL,
        "custom_search_terms" text NULL,
        "setup_completed" boolean NOT NULL DEFAULT false,
        "setup_completed_at" TIMESTAMP NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fieldflow_rep_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_fieldflow_rep_profiles_user" UNIQUE ("user_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "fieldflow_rep_profiles"
      ADD CONSTRAINT "FK_fieldflow_rep_profiles_user"
      FOREIGN KEY ("user_id")
      REFERENCES "user"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_rep_profiles_industry" ON "fieldflow_rep_profiles"("industry")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_rep_profiles_setup" ON "fieldflow_rep_profiles"("setup_completed")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_fieldflow_rep_profiles_setup"`);
    await queryRunner.query(`DROP INDEX "IDX_fieldflow_rep_profiles_industry"`);
    await queryRunner.query(
      `ALTER TABLE "fieldflow_rep_profiles" DROP CONSTRAINT "FK_fieldflow_rep_profiles_user"`,
    );
    await queryRunner.query(`DROP TABLE "fieldflow_rep_profiles"`);
  }
}
