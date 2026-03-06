import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTankChuteRfq1801500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."rfq_items_item_type_enum"
      ADD VALUE IF NOT EXISTS 'tank_chute'
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."tank_chute_rfqs_assembly_type_enum" AS ENUM (
          'tank', 'chute', 'hopper', 'underpan', 'custom'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."tank_chute_rfqs_lining_type_enum" AS ENUM (
          'rubber', 'ceramic', 'hdpe', 'pu', 'glass_flake', 'none'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tank_chute_rfqs" (
        "id" SERIAL NOT NULL,
        "rfq_item_id" integer,
        "assembly_type" "public"."tank_chute_rfqs_assembly_type_enum" NOT NULL,
        "drawing_reference" character varying(255),
        "material_grade" character varying(100),
        "overall_length_mm" decimal(10,2),
        "overall_width_mm" decimal(10,2),
        "overall_height_mm" decimal(10,2),
        "total_steel_weight_kg" decimal(10,2),
        "weight_source" character varying(20),
        "quantity_value" integer NOT NULL DEFAULT 1,
        "lining_required" boolean NOT NULL DEFAULT false,
        "lining_type" "public"."tank_chute_rfqs_lining_type_enum",
        "lining_thickness_mm" decimal(10,2),
        "lining_area_m2" decimal(10,2),
        "lining_wastage_percent" decimal(5,2),
        "rubber_grade" character varying(100),
        "rubber_hardness_shore" integer,
        "coating_required" boolean NOT NULL DEFAULT false,
        "coating_system" text,
        "coating_area_m2" decimal(10,2),
        "coating_wastage_percent" decimal(5,2),
        "surface_prep_standard" character varying(50),
        "plate_bom" jsonb,
        "bom_total_weight_kg" decimal(10,2),
        "bom_total_area_m2" decimal(10,2),
        "steel_price_per_kg" decimal(12,2),
        "lining_price_per_m2" decimal(12,2),
        "coating_price_per_m2" decimal(12,2),
        "fabrication_cost" decimal(12,2),
        "total_cost" decimal(12,2),
        "notes" text,
        "calculation_data" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tank_chute_rfqs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tank_chute_rfqs_rfq_item_id" UNIQUE ("rfq_item_id"),
        CONSTRAINT "FK_tank_chute_rfqs_rfq_item" FOREIGN KEY ("rfq_item_id") REFERENCES "rfq_items"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tank_chute_rfqs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."tank_chute_rfqs_lining_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."tank_chute_rfqs_assembly_type_enum"`);
  }
}
