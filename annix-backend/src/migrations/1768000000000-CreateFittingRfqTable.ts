import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFittingRfqTable1768000000000 implements MigrationInterface {
  name = 'CreateFittingRfqTable1768000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fitting_rfqs" (
        "id" SERIAL NOT NULL,
        "nominal_diameter_mm" numeric(10,3) NOT NULL,
        "schedule_number" character varying(50) NOT NULL,
        "wall_thickness_mm" numeric(10,3),
        "fitting_type" character varying(50) NOT NULL,
        "fitting_standard" character varying(50),
        "pipe_length_a_mm" numeric(10,3),
        "pipe_length_b_mm" numeric(10,3),
        "pipe_end_configuration" character varying(50),
        "add_blank_flange" boolean NOT NULL DEFAULT false,
        "blank_flange_count" integer,
        "blank_flange_positions" json,
        "quantity_value" numeric(10,2) NOT NULL DEFAULT 1,
        "quantity_type" character varying(50) NOT NULL DEFAULT 'number_of_items',
        "working_pressure_bar" numeric(6,2),
        "working_temperature_c" numeric(5,2),
        "total_weight_kg" numeric(10,3),
        "number_of_flanges" integer,
        "number_of_flange_welds" integer,
        "number_of_tee_welds" integer,
        "calculation_data" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "rfq_item_id" integer,
        CONSTRAINT "UQ_fitting_rfqs_rfq_item_id" UNIQUE ("rfq_item_id"),
        CONSTRAINT "PK_fitting_rfqs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "fitting_rfqs"
      ADD CONSTRAINT "FK_fitting_rfqs_rfq_item_id"
      FOREIGN KEY ("rfq_item_id")
      REFERENCES "rfq_items"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "rfq_items"
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP DEFAULT now(),
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fitting_rfqs" DROP CONSTRAINT IF EXISTS "FK_fitting_rfqs_rfq_item_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "fitting_rfqs"`);
  }
}
