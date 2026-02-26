import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHdpeFieldsToRfqEntities1799500000000 implements MigrationInterface {
  name = "AddHdpeFieldsToRfqEntities1799500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "material_type_enum" AS ENUM ('steel', 'hdpe')
    `);

    await queryRunner.query(`
      ALTER TABLE "rfq_items"
      ADD COLUMN IF NOT EXISTS "material_type" "material_type_enum" NOT NULL DEFAULT 'steel'
    `);

    await queryRunner.query(`
      ALTER TABLE "straight_pipe_rfqs"
      ADD COLUMN IF NOT EXISTS "hdpe_pe_grade" character varying(20),
      ADD COLUMN IF NOT EXISTS "hdpe_sdr" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "hdpe_pn_rating" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "hdpe_color_code" character varying(20),
      ADD COLUMN IF NOT EXISTS "hdpe_operating_temp_c" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "hdpe_derated_pn" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "hdpe_welding_method" character varying(30),
      ADD COLUMN IF NOT EXISTS "hdpe_welding_standard" character varying(30),
      ADD COLUMN IF NOT EXISTS "hdpe_joint_count" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "bend_rfqs"
      ADD COLUMN IF NOT EXISTS "hdpe_pe_grade" character varying(20),
      ADD COLUMN IF NOT EXISTS "hdpe_sdr" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "hdpe_pn_rating" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "hdpe_color_code" character varying(20),
      ADD COLUMN IF NOT EXISTS "hdpe_operating_temp_c" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "hdpe_derated_pn" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "hdpe_welding_method" character varying(30),
      ADD COLUMN IF NOT EXISTS "hdpe_welding_standard" character varying(30),
      ADD COLUMN IF NOT EXISTS "hdpe_joint_count" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "fitting_rfqs"
      ADD COLUMN IF NOT EXISTS "hdpe_pe_grade" character varying(20),
      ADD COLUMN IF NOT EXISTS "hdpe_sdr" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "hdpe_pn_rating" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "hdpe_color_code" character varying(20),
      ADD COLUMN IF NOT EXISTS "hdpe_operating_temp_c" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "hdpe_derated_pn" numeric(4,1),
      ADD COLUMN IF NOT EXISTS "hdpe_welding_method" character varying(30),
      ADD COLUMN IF NOT EXISTS "hdpe_welding_standard" character varying(30),
      ADD COLUMN IF NOT EXISTS "hdpe_joint_count" integer,
      ADD COLUMN IF NOT EXISTS "hdpe_fitting_category" character varying(30)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "fitting_rfqs"
      DROP COLUMN IF EXISTS "hdpe_pe_grade",
      DROP COLUMN IF EXISTS "hdpe_sdr",
      DROP COLUMN IF EXISTS "hdpe_pn_rating",
      DROP COLUMN IF EXISTS "hdpe_color_code",
      DROP COLUMN IF EXISTS "hdpe_operating_temp_c",
      DROP COLUMN IF EXISTS "hdpe_derated_pn",
      DROP COLUMN IF EXISTS "hdpe_welding_method",
      DROP COLUMN IF EXISTS "hdpe_welding_standard",
      DROP COLUMN IF EXISTS "hdpe_joint_count",
      DROP COLUMN IF EXISTS "hdpe_fitting_category"
    `);

    await queryRunner.query(`
      ALTER TABLE "bend_rfqs"
      DROP COLUMN IF EXISTS "hdpe_pe_grade",
      DROP COLUMN IF EXISTS "hdpe_sdr",
      DROP COLUMN IF EXISTS "hdpe_pn_rating",
      DROP COLUMN IF EXISTS "hdpe_color_code",
      DROP COLUMN IF EXISTS "hdpe_operating_temp_c",
      DROP COLUMN IF EXISTS "hdpe_derated_pn",
      DROP COLUMN IF EXISTS "hdpe_welding_method",
      DROP COLUMN IF EXISTS "hdpe_welding_standard",
      DROP COLUMN IF EXISTS "hdpe_joint_count"
    `);

    await queryRunner.query(`
      ALTER TABLE "straight_pipe_rfqs"
      DROP COLUMN IF EXISTS "hdpe_pe_grade",
      DROP COLUMN IF EXISTS "hdpe_sdr",
      DROP COLUMN IF EXISTS "hdpe_pn_rating",
      DROP COLUMN IF EXISTS "hdpe_color_code",
      DROP COLUMN IF EXISTS "hdpe_operating_temp_c",
      DROP COLUMN IF EXISTS "hdpe_derated_pn",
      DROP COLUMN IF EXISTS "hdpe_welding_method",
      DROP COLUMN IF EXISTS "hdpe_welding_standard",
      DROP COLUMN IF EXISTS "hdpe_joint_count"
    `);

    await queryRunner.query(`
      ALTER TABLE "rfq_items"
      DROP COLUMN IF EXISTS "material_type"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "material_type_enum"
    `);
  }
}
