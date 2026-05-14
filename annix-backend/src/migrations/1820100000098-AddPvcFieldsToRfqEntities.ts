import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPvcFieldsToRfqEntities1820100000098 implements MigrationInterface {
  name = "AddPvcFieldsToRfqEntities1820100000098";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // material_type_enum was created with only ('steel', 'hdpe') in
    // migration 1799500000000. Adding 'pvc' lets the rfq_items
    // material_type column accept PVC rows without rejecting the
    // whole submit.
    await queryRunner.query(`
      ALTER TYPE "material_type_enum" ADD VALUE IF NOT EXISTS 'pvc'
    `);

    await queryRunner.query(`
      ALTER TABLE "straight_pipe_rfqs"
      ADD COLUMN IF NOT EXISTS "pvc_type" character varying(20),
      ADD COLUMN IF NOT EXISTS "pvc_sdr" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "pvc_pressure_class" character varying(20),
      ADD COLUMN IF NOT EXISTS "pvc_pn_rating" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "pvc_derated_pn" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "pvc_operating_temp_c" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "pvc_joining_method" character varying(30),
      ADD COLUMN IF NOT EXISTS "pvc_color" character varying(20)
    `);

    await queryRunner.query(`
      ALTER TABLE "bend_rfqs"
      ADD COLUMN IF NOT EXISTS "pvc_type" character varying(20),
      ADD COLUMN IF NOT EXISTS "pvc_sdr" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "pvc_pressure_class" character varying(20),
      ADD COLUMN IF NOT EXISTS "pvc_pn_rating" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "pvc_derated_pn" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "pvc_operating_temp_c" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "pvc_joining_method" character varying(30),
      ADD COLUMN IF NOT EXISTS "pvc_color" character varying(20)
    `);

    await queryRunner.query(`
      ALTER TABLE "fitting_rfqs"
      ADD COLUMN IF NOT EXISTS "pvc_type" character varying(20),
      ADD COLUMN IF NOT EXISTS "pvc_sdr" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "pvc_pressure_class" character varying(20),
      ADD COLUMN IF NOT EXISTS "pvc_pn_rating" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "pvc_derated_pn" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "pvc_operating_temp_c" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "pvc_joining_method" character varying(30),
      ADD COLUMN IF NOT EXISTS "pvc_color" character varying(20),
      ADD COLUMN IF NOT EXISTS "pvc_fitting_category" character varying(30)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "fitting_rfqs"
      DROP COLUMN IF EXISTS "pvc_type",
      DROP COLUMN IF EXISTS "pvc_sdr",
      DROP COLUMN IF EXISTS "pvc_pressure_class",
      DROP COLUMN IF EXISTS "pvc_pn_rating",
      DROP COLUMN IF EXISTS "pvc_derated_pn",
      DROP COLUMN IF EXISTS "pvc_operating_temp_c",
      DROP COLUMN IF EXISTS "pvc_joining_method",
      DROP COLUMN IF EXISTS "pvc_color",
      DROP COLUMN IF EXISTS "pvc_fitting_category"
    `);

    await queryRunner.query(`
      ALTER TABLE "bend_rfqs"
      DROP COLUMN IF EXISTS "pvc_type",
      DROP COLUMN IF EXISTS "pvc_sdr",
      DROP COLUMN IF EXISTS "pvc_pressure_class",
      DROP COLUMN IF EXISTS "pvc_pn_rating",
      DROP COLUMN IF EXISTS "pvc_derated_pn",
      DROP COLUMN IF EXISTS "pvc_operating_temp_c",
      DROP COLUMN IF EXISTS "pvc_joining_method",
      DROP COLUMN IF EXISTS "pvc_color"
    `);

    await queryRunner.query(`
      ALTER TABLE "straight_pipe_rfqs"
      DROP COLUMN IF EXISTS "pvc_type",
      DROP COLUMN IF EXISTS "pvc_sdr",
      DROP COLUMN IF EXISTS "pvc_pressure_class",
      DROP COLUMN IF EXISTS "pvc_pn_rating",
      DROP COLUMN IF EXISTS "pvc_derated_pn",
      DROP COLUMN IF EXISTS "pvc_operating_temp_c",
      DROP COLUMN IF EXISTS "pvc_joining_method",
      DROP COLUMN IF EXISTS "pvc_color"
    `);

    // Cannot drop a single enum value in Postgres without rebuilding
    // the type — leaving 'pvc' in the enum on rollback is safe: rows
    // simply can't reference it once the columns are gone.
  }
}
