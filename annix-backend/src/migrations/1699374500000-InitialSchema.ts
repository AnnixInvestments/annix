import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1699374500000 implements MigrationInterface {
    name = 'InitialSchema1699374500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."rfqs_status_enum" AS ENUM('draft', 'submitted', 'in_review', 'quoted', 'accepted', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "rfqs" ("id" SERIAL NOT NULL, "rfq_number" character varying(100) NOT NULL, "project_name" character varying(255) NOT NULL, "description" character varying(500), "status" "public"."rfqs_status_enum" NOT NULL DEFAULT 'draft', "total_estimated_weight" numeric(10,2), "total_quoted_price" numeric(15,2), "required_date" date, "customer_name" character varying(255), "customer_email" character varying(255), "customer_phone" character varying(50), "notes" text, "created_by_user_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b19e346f96ffd54c4d436a95869" UNIQUE ("rfq_number"), CONSTRAINT "PK_c8b7481584218bdee534e5fc436" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."rfq_items_item_type_enum" AS ENUM('straight_pipe', 'bend_with_tangent', 'lateral_with_brackets')`);
        await queryRunner.query(`CREATE TABLE "rfq_items" ("id" SERIAL NOT NULL, "line_number" integer NOT NULL, "item_type" "public"."rfq_items_item_type_enum" NOT NULL, "description" character varying(255) NOT NULL, "quantity" integer NOT NULL, "unit_weight_kg" numeric(10,3), "total_weight_kg" numeric(10,3), "unit_price" numeric(10,2), "total_price" numeric(15,2), "notes" text, "rfq_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2694c253e3966a3a8d5e9dc3d60" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."straight_pipe_rfqs_schedule_type_enum" AS ENUM('schedule', 'wall_thickness')`);
        await queryRunner.query(`CREATE TYPE "public"."straight_pipe_rfqs_length_unit_enum" AS ENUM('meters', 'feet')`);
        await queryRunner.query(`CREATE TYPE "public"."straight_pipe_rfqs_quantity_type_enum" AS ENUM('total_length', 'number_of_pipes')`);
        await queryRunner.query(`CREATE TABLE "straight_pipe_rfqs" ("id" SERIAL NOT NULL, "nominal_bore_mm" numeric(8,3) NOT NULL, "schedule_type" "public"."straight_pipe_rfqs_schedule_type_enum" NOT NULL, "schedule_number" character varying(20), "wall_thickness_mm" numeric(8,3), "individual_pipe_length" numeric(10,3) NOT NULL, "length_unit" "public"."straight_pipe_rfqs_length_unit_enum" NOT NULL DEFAULT 'meters', "quantity_type" "public"."straight_pipe_rfqs_quantity_type_enum" NOT NULL, "quantity_value" numeric(12,3) NOT NULL, "calculated_pipe_count" integer, "calculated_total_length" numeric(12,3), "working_pressure_bar" numeric(8,2) NOT NULL, "working_temperature_c" numeric(8,2), "pipe_weight_per_meter" numeric(10,3), "total_pipe_weight" numeric(12,3), "number_of_flanges" integer, "number_of_butt_welds" integer, "total_butt_weld_length" numeric(10,3), "number_of_flange_welds" integer, "total_flange_weld_length" numeric(10,3), "rfq_item_id" integer NOT NULL, "steel_specification_id" integer, "nominal_outside_diameter_id" integer, "flange_standard_id" integer, "flange_pressure_class_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_19da9e3539c466a8a20f6c74bba" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "steel_specifications" ADD "density_kg_m3" numeric(8,2) NOT NULL DEFAULT '7850'`);
        await queryRunner.query(`ALTER TABLE "steel_specifications" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "steel_specifications" ADD "grade_standard" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "rfqs" ADD CONSTRAINT "FK_aba921c26dfeef3d7662eb97b21" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rfq_items" ADD CONSTRAINT "FK_ef8f022c5f4d9e27e47e03a1202" FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "straight_pipe_rfqs" ADD CONSTRAINT "FK_84197f8946daca8330b5d4e0e9d" FOREIGN KEY ("rfq_item_id") REFERENCES "rfq_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "straight_pipe_rfqs" ADD CONSTRAINT "FK_b40657905110c1bde5a3767dad1" FOREIGN KEY ("steel_specification_id") REFERENCES "steel_specifications"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "straight_pipe_rfqs" ADD CONSTRAINT "FK_cdb1303cca0319445b043c6cd51" FOREIGN KEY ("nominal_outside_diameter_id") REFERENCES "nominal_outside_diameters"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "straight_pipe_rfqs" ADD CONSTRAINT "FK_ee07a21b00b3fd775d3b16da49b" FOREIGN KEY ("flange_standard_id") REFERENCES "flange_standards"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "straight_pipe_rfqs" ADD CONSTRAINT "FK_d8a6b6d0a82086e9f9150a9e9dd" FOREIGN KEY ("flange_pressure_class_id") REFERENCES "flange_pressure_classes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "straight_pipe_rfqs" DROP CONSTRAINT "FK_d8a6b6d0a82086e9f9150a9e9dd"`);
        await queryRunner.query(`ALTER TABLE "straight_pipe_rfqs" DROP CONSTRAINT "FK_ee07a21b00b3fd775d3b16da49b"`);
        await queryRunner.query(`ALTER TABLE "straight_pipe_rfqs" DROP CONSTRAINT "FK_cdb1303cca0319445b043c6cd51"`);
        await queryRunner.query(`ALTER TABLE "straight_pipe_rfqs" DROP CONSTRAINT "FK_b40657905110c1bde5a3767dad1"`);
        await queryRunner.query(`ALTER TABLE "straight_pipe_rfqs" DROP CONSTRAINT "FK_84197f8946daca8330b5d4e0e9d"`);
        await queryRunner.query(`ALTER TABLE "rfq_items" DROP CONSTRAINT "FK_ef8f022c5f4d9e27e47e03a1202"`);
        await queryRunner.query(`ALTER TABLE "rfqs" DROP CONSTRAINT "FK_aba921c26dfeef3d7662eb97b21"`);
        await queryRunner.query(`ALTER TABLE "steel_specifications" DROP COLUMN "grade_standard"`);
        await queryRunner.query(`ALTER TABLE "steel_specifications" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "steel_specifications" DROP COLUMN "density_kg_m3"`);
        await queryRunner.query(`DROP TABLE "straight_pipe_rfqs"`);
        await queryRunner.query(`DROP TYPE "public"."straight_pipe_rfqs_quantity_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."straight_pipe_rfqs_length_unit_enum"`);
        await queryRunner.query(`DROP TYPE "public"."straight_pipe_rfqs_schedule_type_enum"`);
        await queryRunner.query(`DROP TABLE "rfq_items"`);
        await queryRunner.query(`DROP TYPE "public"."rfq_items_item_type_enum"`);
        await queryRunner.query(`DROP TABLE "rfqs"`);
        await queryRunner.query(`DROP TYPE "public"."rfqs_status_enum"`);
    }

}
