import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Three typed-rfq tables whose entities have been in code since
 * commits 830957509 (valve, instrument) and 0d1eebea8 (surface
 * protection) but whose CREATE TABLE migrations were never
 * written. The gap surfaced today (2026-05-14): every successful
 * RFQ submit's final reload SELECT crashed with
 *   relation "valve_rfqs" does not exist
 * because findRfqById / createUnifiedRfq listed
 *   items.valveDetails / items.instrumentDetails /
 *   items.surfaceProtectionDetails
 * as eager relations, forcing TypeORM to JOIN tables that didn't
 * exist — even on BOQs that contained no valve / instrument /
 * surface-protection items.
 *
 * As an immediate unblock the relations were dropped from the
 * service. This migration restores the missing schema so the
 * relations can be re-added in a follow-up commit.
 *
 * The SQL is extracted verbatim from a
 * `pnpm migration:generate` run against the live schema (which
 * picked up additional unrelated drift across many tables).
 * Only the three target tables + their enums + FKs are
 * preserved here; the rest of the auto-generated drift is
 * intentionally NOT applied.
 */
export class CreateMissingTypedRfqTables1820100000097 implements MigrationInterface {
  name = "CreateMissingTypedRfqTables1820100000097";

  async up(queryRunner: QueryRunner): Promise<void> {
    // --- Enums referenced by instrument_rfqs ---
    await queryRunner.query(
      `CREATE TYPE "public"."instrument_rfqs_instrument_category_enum" AS ENUM('flow', 'pressure', 'level', 'temperature', 'analytical')`,
    );

    // --- Enums referenced by surface_protection_rfqs ---
    await queryRunner.query(
      `CREATE TYPE "public"."surface_protection_rfqs_protection_type_enum" AS ENUM('external_coating', 'internal_lining', 'both')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."surface_protection_rfqs_substrate_type_enum" AS ENUM('carbon_steel', 'stainless_steel', 'galvanized_steel', 'aluminum', 'concrete')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."surface_protection_rfqs_application_method_enum" AS ENUM('airless_spray', 'conventional_spray', 'brush', 'roller', 'hot_dip', 'electrostatic')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."surface_protection_rfqs_application_location_enum" AS ENUM('shop', 'field', 'both')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."surface_protection_rfqs_external_coating_type_enum" AS ENUM('paint', 'galvanized', 'fbe', '3lpe')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."surface_protection_rfqs_internal_lining_type_enum" AS ENUM('rubber', 'ceramic', 'hdpe', 'pu', 'glass_flake')`,
    );

    // --- Enums referenced by valve_rfqs ---
    await queryRunner.query(
      `CREATE TYPE "public"."valve_rfqs_valve_category_enum" AS ENUM('isolation', 'control', 'check', 'safety', 'specialty')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."valve_rfqs_actuator_type_enum" AS ENUM('manual_lever', 'manual_gear', 'manual_handwheel', 'pneumatic_da', 'pneumatic_sr_fo', 'pneumatic_sr_fc', 'electric_on_off', 'electric_modulating', 'hydraulic', 'electro_hydraulic', 'solenoid', 'self_actuated')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."valve_rfqs_fail_position_enum" AS ENUM('fail_open', 'fail_close', 'fail_last')`,
    );

    // --- Tables ---
    await queryRunner.query(
      `CREATE TABLE "instrument_rfqs" ("id" SERIAL NOT NULL, "instrument_type" character varying(100) NOT NULL, "instrument_category" "public"."instrument_rfqs_instrument_category_enum" NOT NULL, "size" character varying(20), "process_connection" character varying(50) NOT NULL, "wetted_material" character varying(50) NOT NULL, "range_min" numeric(15,4), "range_max" numeric(15,4), "range_unit" character varying(30), "output_signal" character varying(50) NOT NULL DEFAULT '4_20ma', "communication_protocol" character varying(50), "display_type" character varying(50) NOT NULL DEFAULT 'local_lcd', "power_supply" character varying(50) NOT NULL DEFAULT 'loop_powered', "cable_entry" character varying(30) NOT NULL DEFAULT 'm20', "explosion_proof" character varying(50) NOT NULL DEFAULT 'none', "ip_rating" character varying(20) NOT NULL DEFAULT 'ip65', "accuracy_class" character varying(30), "calibration" character varying(50) NOT NULL DEFAULT 'standard', "process_media" character varying(255) NOT NULL, "operating_pressure" numeric(10,2), "operating_temp" numeric(10,2), "quantity_value" integer NOT NULL DEFAULT '1', "supplier_reference" character varying(255), "model_number" character varying(255), "unit_cost_from_supplier" numeric(12,2), "markup_percentage" numeric(5,2) NOT NULL DEFAULT '15', "unit_cost" numeric(12,2), "total_cost" numeric(12,2), "notes" text, "calculation_data" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "rfq_item_id" integer, CONSTRAINT "REL_8e738758aeb5aa77d620291517" UNIQUE ("rfq_item_id"), CONSTRAINT "PK_d89ee2ff0fd596a8fe640581021" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "surface_protection_rfqs" ("id" SERIAL NOT NULL, "protection_type" "public"."surface_protection_rfqs_protection_type_enum" NOT NULL, "substrate_type" "public"."surface_protection_rfqs_substrate_type_enum" NOT NULL DEFAULT 'carbon_steel', "application_method" "public"."surface_protection_rfqs_application_method_enum", "application_location" "public"."surface_protection_rfqs_application_location_enum" NOT NULL DEFAULT 'shop', "external_coating_type" "public"."surface_protection_rfqs_external_coating_type_enum", "iso_12944_category" character varying(10), "iso_12944_durability" character varying(10), "external_system_description" text, "external_total_dft_um" numeric(8,2), "external_number_of_coats" integer, "surface_prep_standard" character varying(50), "internal_lining_type" "public"."surface_protection_rfqs_internal_lining_type_enum", "internal_lining_thickness_mm" numeric(8,2), "internal_system_description" text, "rubber_grade" character varying(20), "rubber_hardness_irhd" integer, "ceramic_tile_type" character varying(50), "ceramic_tile_thickness_mm" numeric(6,2), "internal_surface_area_m2" numeric(12,3), "external_surface_area_m2" numeric(12,3), "total_surface_area_m2" numeric(12,3), "wastage_percent" numeric(5,2), "paint_quantity_liters" numeric(10,2), "rubber_quantity_m2" numeric(10,2), "ceramic_tile_count" integer, "adhesive_quantity_kg" numeric(10,2), "application_temp_c" numeric(5,1), "application_humidity_percent" numeric(5,1), "inspection_requirements" jsonb, "external_price_per_m2" numeric(12,2), "internal_price_per_m2" numeric(12,2), "surface_prep_price_per_m2" numeric(12,2), "external_total_cost" numeric(15,2), "internal_total_cost" numeric(15,2), "total_cost" numeric(15,2), "margin_percent" numeric(5,2), "calculation_data" jsonb, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "rfq_item_id" integer, CONSTRAINT "REL_6019e063ac4fc608299cb83a1a" UNIQUE ("rfq_item_id"), CONSTRAINT "PK_655b1a69262abc34995059782e1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "valve_rfqs" ("id" SERIAL NOT NULL, "valve_type" character varying(100) NOT NULL, "valve_category" "public"."valve_rfqs_valve_category_enum", "size" character varying(20) NOT NULL, "pressure_class" character varying(50) NOT NULL, "connection_type" character varying(50) NOT NULL, "body_material" character varying(50) NOT NULL, "trim_material" character varying(50), "seat_material" character varying(50) NOT NULL, "port_type" character varying(50), "actuator_type" "public"."valve_rfqs_actuator_type_enum" NOT NULL DEFAULT 'manual_lever', "air_supply" numeric(5,2), "voltage" character varying(20), "fail_position" "public"."valve_rfqs_fail_position_enum", "positioner" character varying(50), "limit_switches" boolean NOT NULL DEFAULT false, "solenoid_valve" boolean NOT NULL DEFAULT false, "media" character varying(255) NOT NULL, "operating_pressure" numeric(10,2), "operating_temp" numeric(10,2), "hazardous_area" character varying(50) NOT NULL DEFAULT 'none', "cv" numeric(10,2), "flow_rate" numeric(10,2), "seat_leakage_class" character varying(50), "fire_safe_standard" character varying(50), "cryogenic_service" character varying(50) NOT NULL DEFAULT 'standard', "fugitive_emissions" character varying(50) NOT NULL DEFAULT 'none', "extended_bonnet" character varying(50) NOT NULL DEFAULT 'standard', "certifications" text array NOT NULL DEFAULT '{}', "quantity_value" integer NOT NULL DEFAULT '1', "supplier_reference" character varying(255), "unit_cost_from_supplier" numeric(12,2), "markup_percentage" numeric(5,2) NOT NULL DEFAULT '15', "unit_cost" numeric(12,2), "total_cost" numeric(12,2), "notes" text, "calculation_data" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "rfq_item_id" integer, CONSTRAINT "REL_569abc011eea77577dc3532af4" UNIQUE ("rfq_item_id"), CONSTRAINT "PK_31b1843e1755c47cf8b065b0f32" PRIMARY KEY ("id"))`,
    );

    // --- Foreign keys to rfq_items.id ---
    await queryRunner.query(
      `ALTER TABLE "instrument_rfqs" ADD CONSTRAINT "FK_8e738758aeb5aa77d6202915174" FOREIGN KEY ("rfq_item_id") REFERENCES "rfq_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "surface_protection_rfqs" ADD CONSTRAINT "FK_6019e063ac4fc608299cb83a1a8" FOREIGN KEY ("rfq_item_id") REFERENCES "rfq_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "valve_rfqs" ADD CONSTRAINT "FK_569abc011eea77577dc3532af4d" FOREIGN KEY ("rfq_item_id") REFERENCES "rfq_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "valve_rfqs" DROP CONSTRAINT "FK_569abc011eea77577dc3532af4d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "surface_protection_rfqs" DROP CONSTRAINT "FK_6019e063ac4fc608299cb83a1a8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "instrument_rfqs" DROP CONSTRAINT "FK_8e738758aeb5aa77d6202915174"`,
    );
    await queryRunner.query(`DROP TABLE "valve_rfqs"`);
    await queryRunner.query(`DROP TABLE "surface_protection_rfqs"`);
    await queryRunner.query(`DROP TABLE "instrument_rfqs"`);
    await queryRunner.query(`DROP TYPE "public"."valve_rfqs_fail_position_enum"`);
    await queryRunner.query(`DROP TYPE "public"."valve_rfqs_actuator_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."valve_rfqs_valve_category_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."surface_protection_rfqs_internal_lining_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."surface_protection_rfqs_external_coating_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."surface_protection_rfqs_application_location_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."surface_protection_rfqs_application_method_enum"`);
    await queryRunner.query(`DROP TYPE "public"."surface_protection_rfqs_substrate_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."surface_protection_rfqs_protection_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."instrument_rfqs_instrument_category_enum"`);
  }
}
