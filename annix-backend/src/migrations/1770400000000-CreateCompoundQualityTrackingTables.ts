import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCompoundQualityTrackingTables1770400000000 implements MigrationInterface {
  name = "CreateCompoundQualityTrackingTables1770400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "quality_alert_type_enum" AS ENUM ('DRIFT', 'DROP', 'CV_HIGH')
    `);

    await queryRunner.query(`
      CREATE TYPE "quality_alert_severity_enum" AS ENUM ('WARNING', 'CRITICAL')
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_compound_quality_configs" (
        "id" SERIAL NOT NULL,
        "compound_code" character varying(100) NOT NULL,
        "window_size" integer NOT NULL DEFAULT 10,
        "shore_a_drift_threshold" decimal(5,2),
        "specific_gravity_drift_threshold" decimal(5,3),
        "rebound_drift_threshold" decimal(5,2),
        "tear_strength_drop_percent" decimal(5,2),
        "tensile_strength_drop_percent" decimal(5,2),
        "elongation_drop_percent" decimal(5,2),
        "tc90_cv_threshold" decimal(5,2),
        "updated_by" character varying(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_rubber_quality_config_compound" UNIQUE ("compound_code"),
        CONSTRAINT "PK_rubber_compound_quality_configs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_quality_alerts" (
        "id" SERIAL NOT NULL,
        "compound_code" character varying(100) NOT NULL,
        "alert_type" "quality_alert_type_enum" NOT NULL,
        "severity" "quality_alert_severity_enum" NOT NULL,
        "metric_name" character varying(50) NOT NULL,
        "title" character varying(200) NOT NULL,
        "message" text NOT NULL,
        "metric_value" decimal(10,4) NOT NULL,
        "threshold_value" decimal(10,4) NOT NULL,
        "mean_value" decimal(10,4) NOT NULL,
        "batch_number" character varying(100) NOT NULL,
        "batch_id" integer NOT NULL,
        "acknowledged_at" TIMESTAMP,
        "acknowledged_by" character varying(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rubber_quality_alerts" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_rubber_quality_alerts_compound" ON "rubber_quality_alerts" ("compound_code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rubber_quality_alerts_unacknowledged" ON "rubber_quality_alerts" ("acknowledged_at") WHERE "acknowledged_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rubber_quality_alerts_created" ON "rubber_quality_alerts" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_quality_alerts_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_quality_alerts_unacknowledged"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_quality_alerts_compound"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_quality_alerts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_compound_quality_configs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "quality_alert_severity_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "quality_alert_type_enum"`);
  }
}
