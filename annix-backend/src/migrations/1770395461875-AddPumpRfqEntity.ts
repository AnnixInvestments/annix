import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPumpRfqEntity1770395461875 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."pump_rfqs_service_type_enum" AS ENUM (
        'new_pump', 'spare_parts', 'repair_service', 'rental'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."pump_rfqs_pump_category_enum" AS ENUM (
        'centrifugal', 'positive_displacement', 'specialty'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."pump_rfqs_motor_type_enum" AS ENUM (
        'electric_ac', 'electric_vfd', 'diesel', 'hydraulic', 'air', 'none'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."pump_rfqs_seal_type_enum" AS ENUM (
        'gland_packing', 'mechanical_single', 'mechanical_double',
        'cartridge', 'dry_running', 'magnetic_drive'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pump_rfqs" (
        "id" SERIAL NOT NULL,
        "service_type" "public"."pump_rfqs_service_type_enum" NOT NULL DEFAULT 'new_pump',
        "pump_type" varchar(100) NOT NULL,
        "pump_category" "public"."pump_rfqs_pump_category_enum",
        "flow_rate" decimal(10,2),
        "total_head" decimal(10,2),
        "suction_head" decimal(10,2),
        "npsh_available" decimal(10,2),
        "discharge_pressure" decimal(10,2),
        "operating_temp" decimal(10,2),
        "fluid_type" varchar(50) NOT NULL,
        "specific_gravity" decimal(6,3),
        "viscosity" decimal(10,2),
        "solids_content" decimal(5,2),
        "solids_size" decimal(8,2),
        "ph" decimal(4,2),
        "is_abrasive" boolean NOT NULL DEFAULT false,
        "is_corrosive" boolean NOT NULL DEFAULT false,
        "casing_material" varchar(50) NOT NULL,
        "impeller_material" varchar(50) NOT NULL,
        "shaft_material" varchar(50),
        "seal_type" "public"."pump_rfqs_seal_type_enum",
        "seal_plan" varchar(20),
        "suction_size" varchar(20),
        "discharge_size" varchar(20),
        "connection_type" varchar(50),
        "motor_type" "public"."pump_rfqs_motor_type_enum" NOT NULL DEFAULT 'electric_ac',
        "motor_power" decimal(10,2),
        "voltage" varchar(20),
        "frequency" varchar(10),
        "motor_efficiency" varchar(10),
        "enclosure" varchar(50),
        "hazardous_area" varchar(50) NOT NULL DEFAULT 'none',
        "certifications" text[] NOT NULL DEFAULT '{}',
        "spare_part_category" varchar(50),
        "spare_parts" jsonb,
        "existing_pump_model" varchar(255),
        "existing_pump_serial" varchar(100),
        "rental_duration_days" int,
        "quantity_value" int NOT NULL DEFAULT 1,
        "supplier_reference" varchar(255),
        "unit_cost_from_supplier" decimal(12,2),
        "markup_percentage" decimal(5,2) NOT NULL DEFAULT 15.0,
        "unit_cost" decimal(12,2),
        "total_cost" decimal(12,2),
        "notes" text,
        "calculation_data" jsonb,
        "rfq_item_id" int,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pump_rfqs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_pump_rfqs_rfq_item" UNIQUE ("rfq_item_id"),
        CONSTRAINT "FK_pump_rfqs_rfq_item" FOREIGN KEY ("rfq_item_id")
          REFERENCES "rfq_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."rfq_items_item_type_enum"
      ADD VALUE IF NOT EXISTS 'pump'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "pump_rfqs"`);
    await queryRunner.query(`DROP TYPE "public"."pump_rfqs_service_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."pump_rfqs_pump_category_enum"`);
    await queryRunner.query(`DROP TYPE "public"."pump_rfqs_motor_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."pump_rfqs_seal_type_enum"`);
  }
}
