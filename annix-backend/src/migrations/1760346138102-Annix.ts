import { MigrationInterface, QueryRunner } from "typeorm";

export class Annix1760346138102 implements MigrationInterface {
    name = 'Annix1760346138102'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "weld_types" ("id" SERIAL NOT NULL, "code" character varying(20) NOT NULL, "description" character varying(255) NOT NULL, CONSTRAINT "UQ_cadd2e7f8d3d2229ff9197ba08d" UNIQUE ("code"), CONSTRAINT "PK_7d6bf7e7e1fd6c82a84383bcc12" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "username" character varying, "email" character varying, "password" character varying, "salt" character varying NOT NULL, CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_role" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "UQ_31f96f2013b7ac833d7682bf021" UNIQUE ("name"), CONSTRAINT "PK_fb2e442d14add3cefbdf33c4561" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "fitting_types" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "UQ_5078ad66482e8b42b82e7c6dbe8" UNIQUE ("name"), CONSTRAINT "UQ_5078ad66482e8b42b82e7c6dbe8" UNIQUE ("name"), CONSTRAINT "PK_08bdd2a74b6cecce4d2a224fe0f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "pipe_pressures" ("id" SERIAL NOT NULL, "temperature_c" double precision, "max_working_pressure_mpa" double precision, "allowable_stress_mpa" double precision NOT NULL, "pipeDimensionId" integer, CONSTRAINT "PK_534ff437a4994fe045c252a6fc6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "pipe_dimensions" ("id" SERIAL NOT NULL, "wall_thickness_mm" double precision NOT NULL, "internal_diameter_mm" double precision, "mass_kgm" double precision NOT NULL, "schedule_designation" character varying, "schedule_number" double precision, "nominal_outside_diameter_id" integer, "steel_specification_id" integer, CONSTRAINT "PK_1cf4cd8618db18b469565eede6d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "flange_standards" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, CONSTRAINT "UQ_8f764a3296a0bcddf3cae783e82" UNIQUE ("code"), CONSTRAINT "UQ_8f764a3296a0bcddf3cae783e82" UNIQUE ("code"), CONSTRAINT "PK_2ea7d2fda06762d8aa9a75be356" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "flange_pressure_classes" ("id" SERIAL NOT NULL, "designation" character varying NOT NULL, "standardId" integer, CONSTRAINT "PK_a38d9f17371b1eebb7f35a34dea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "bolt_masses" ("id" SERIAL NOT NULL, "length_mm" integer NOT NULL, "mass_kg" double precision NOT NULL, "boltId" integer, CONSTRAINT "PK_ef6591ead47b933df3fd713180e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "nut_masses" ("id" SERIAL NOT NULL, "mass_kg" double precision NOT NULL, "bolt_id" integer, CONSTRAINT "PK_babaa2a201a5a255216b62b4741" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "bolts" ("id" SERIAL NOT NULL, "designation" character varying NOT NULL, CONSTRAINT "UQ_77aae991b5d2f7ab717e513a2d1" UNIQUE ("designation"), CONSTRAINT "PK_f87a8af96ae9e668b15762ae5ba" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "flange_dimensions" ("id" SERIAL NOT NULL, "D" double precision NOT NULL, "b" double precision NOT NULL, "d4" double precision NOT NULL, "f" double precision NOT NULL, "num_holes" double precision NOT NULL, "d1" double precision NOT NULL, "pcd" double precision NOT NULL, "mass_kg" double precision NOT NULL, "nominalOutsideDiameterId" integer, "standardId" integer, "pressureClassId" integer, "boltId" integer, CONSTRAINT "PK_e5b3623f00eeb57930b48da15b9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "nominal_outside_diameters" ("id" SERIAL NOT NULL, "nominal_diameter_mm" double precision NOT NULL, "outside_diameter_mm" double precision NOT NULL, CONSTRAINT "UQ_47693acebc036eaf73dff06eea7" UNIQUE ("nominal_diameter_mm", "outside_diameter_mm"), CONSTRAINT "PK_aecffa012808ca87b79520261d4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "fitting_bores" ("fitting_bore_id" SERIAL NOT NULL, "bore_position" text NOT NULL, "nominal_outside_diameter_id" integer, "fitting_variant_id" integer, CONSTRAINT "PK_0062c13016a911a6d8757f7c29c" PRIMARY KEY ("fitting_bore_id"))`);
        await queryRunner.query(`CREATE TABLE "angle_ranges" ("id" SERIAL NOT NULL, "angle_min" double precision NOT NULL, "angle_max" double precision NOT NULL, CONSTRAINT "PK_d0a72c63e14cdc73e8a9aed5e31" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "fitting_dimensions" ("id" SERIAL NOT NULL, "dimension_name" character varying NOT NULL, "dimension_value_mm" double precision NOT NULL, "angle_range_id" integer, "fitting_variant_id" integer, CONSTRAINT "PK_04818977bdbd60a695f4ce5ac71" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "fitting_variants" ("id" SERIAL NOT NULL, "fitting_id" integer, CONSTRAINT "PK_b3559ff1fd5b111f2457f268015" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "fittings" ("id" SERIAL NOT NULL, "steel_specification_id" integer, "fitting_type_id" integer, CONSTRAINT "PK_4bbcc11464a61941eaa735ad446" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "steel_specifications" ("id" SERIAL NOT NULL, "steel_spec_name" text NOT NULL, CONSTRAINT "UQ_4e689dde41c0ec91e4d9ef9ab35" UNIQUE ("steel_spec_name"), CONSTRAINT "UQ_4e689dde41c0ec91e4d9ef9ab35" UNIQUE ("steel_spec_name"), CONSTRAINT "PK_b1c445ab624d6fe093848de1ee4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "nb_nps_lookup" ("id" SERIAL NOT NULL, "nb_mm" double precision NOT NULL, "nps_inch" double precision NOT NULL, "outside_diameter_mm" double precision NOT NULL, CONSTRAINT "PK_c71ce85dd271a5dbf7f1ef97f9d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_roles_user_role" ("userId" integer NOT NULL, "userRoleId" integer NOT NULL, CONSTRAINT "PK_cd5bf7bedcc5f7671f0a97b9224" PRIMARY KEY ("userId", "userRoleId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_dc94447a3cabad70eb2c96f5e1" ON "user_roles_user_role" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_4698620c2fcf96fdbabb09f384" ON "user_roles_user_role" ("userRoleId") `);
        await queryRunner.query(`ALTER TABLE "pipe_pressures" ADD CONSTRAINT "FK_afdf522b94b8539f60340513f79" FOREIGN KEY ("pipeDimensionId") REFERENCES "pipe_dimensions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pipe_dimensions" ADD CONSTRAINT "FK_b7a05138eb5813fd13c596750c5" FOREIGN KEY ("nominal_outside_diameter_id") REFERENCES "nominal_outside_diameters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pipe_dimensions" ADD CONSTRAINT "FK_51936f621a6b067294cba2dbb37" FOREIGN KEY ("steel_specification_id") REFERENCES "steel_specifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "flange_pressure_classes" ADD CONSTRAINT "FK_4f1a4f98e1c9b2a84f3551b7bf8" FOREIGN KEY ("standardId") REFERENCES "flange_standards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bolt_masses" ADD CONSTRAINT "FK_df167944fd3b7fbbbaefc28150c" FOREIGN KEY ("boltId") REFERENCES "bolts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "nut_masses" ADD CONSTRAINT "FK_8a3722fd68d9e8ebcdd36a07cca" FOREIGN KEY ("bolt_id") REFERENCES "bolts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "flange_dimensions" ADD CONSTRAINT "FK_e79c0c3bb424a8a457196137ade" FOREIGN KEY ("nominalOutsideDiameterId") REFERENCES "nominal_outside_diameters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "flange_dimensions" ADD CONSTRAINT "FK_771e314693b9fe53110bf6c1faa" FOREIGN KEY ("standardId") REFERENCES "flange_standards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "flange_dimensions" ADD CONSTRAINT "FK_6fafb72fb412d37e991848ae9f3" FOREIGN KEY ("pressureClassId") REFERENCES "flange_pressure_classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "flange_dimensions" ADD CONSTRAINT "FK_b92aa3cc289ab2f2c144ea7ab51" FOREIGN KEY ("boltId") REFERENCES "bolts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "fitting_bores" ADD CONSTRAINT "FK_1666ec425450084d5857d189d1c" FOREIGN KEY ("nominal_outside_diameter_id") REFERENCES "nominal_outside_diameters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "fitting_bores" ADD CONSTRAINT "FK_d1e49475ee947d729a41c9a6f4d" FOREIGN KEY ("fitting_variant_id") REFERENCES "fitting_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "fitting_dimensions" ADD CONSTRAINT "FK_29a3ed622e37aaf49f839e58def" FOREIGN KEY ("angle_range_id") REFERENCES "angle_ranges"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "fitting_dimensions" ADD CONSTRAINT "FK_9ee4148db282bb20f7e6e7a1c95" FOREIGN KEY ("fitting_variant_id") REFERENCES "fitting_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "fitting_variants" ADD CONSTRAINT "FK_9c4e093a95c047adc968bf666ca" FOREIGN KEY ("fitting_id") REFERENCES "fittings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "fittings" ADD CONSTRAINT "FK_5ae3ceb1f16529273d3541617e1" FOREIGN KEY ("steel_specification_id") REFERENCES "steel_specifications"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "fittings" ADD CONSTRAINT "FK_4623b5f3191cfe9f3d8f03c88fe" FOREIGN KEY ("fitting_type_id") REFERENCES "fitting_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_roles_user_role" ADD CONSTRAINT "FK_dc94447a3cabad70eb2c96f5e1d" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_roles_user_role" ADD CONSTRAINT "FK_4698620c2fcf96fdbabb09f3844" FOREIGN KEY ("userRoleId") REFERENCES "user_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_roles_user_role" DROP CONSTRAINT "FK_4698620c2fcf96fdbabb09f3844"`);
        await queryRunner.query(`ALTER TABLE "user_roles_user_role" DROP CONSTRAINT "FK_dc94447a3cabad70eb2c96f5e1d"`);
        await queryRunner.query(`ALTER TABLE "fittings" DROP CONSTRAINT "FK_4623b5f3191cfe9f3d8f03c88fe"`);
        await queryRunner.query(`ALTER TABLE "fittings" DROP CONSTRAINT "FK_5ae3ceb1f16529273d3541617e1"`);
        await queryRunner.query(`ALTER TABLE "fitting_variants" DROP CONSTRAINT "FK_9c4e093a95c047adc968bf666ca"`);
        await queryRunner.query(`ALTER TABLE "fitting_dimensions" DROP CONSTRAINT "FK_9ee4148db282bb20f7e6e7a1c95"`);
        await queryRunner.query(`ALTER TABLE "fitting_dimensions" DROP CONSTRAINT "FK_29a3ed622e37aaf49f839e58def"`);
        await queryRunner.query(`ALTER TABLE "fitting_bores" DROP CONSTRAINT "FK_d1e49475ee947d729a41c9a6f4d"`);
        await queryRunner.query(`ALTER TABLE "fitting_bores" DROP CONSTRAINT "FK_1666ec425450084d5857d189d1c"`);
        await queryRunner.query(`ALTER TABLE "flange_dimensions" DROP CONSTRAINT "FK_b92aa3cc289ab2f2c144ea7ab51"`);
        await queryRunner.query(`ALTER TABLE "flange_dimensions" DROP CONSTRAINT "FK_6fafb72fb412d37e991848ae9f3"`);
        await queryRunner.query(`ALTER TABLE "flange_dimensions" DROP CONSTRAINT "FK_771e314693b9fe53110bf6c1faa"`);
        await queryRunner.query(`ALTER TABLE "flange_dimensions" DROP CONSTRAINT "FK_e79c0c3bb424a8a457196137ade"`);
        await queryRunner.query(`ALTER TABLE "nut_masses" DROP CONSTRAINT "FK_8a3722fd68d9e8ebcdd36a07cca"`);
        await queryRunner.query(`ALTER TABLE "bolt_masses" DROP CONSTRAINT "FK_df167944fd3b7fbbbaefc28150c"`);
        await queryRunner.query(`ALTER TABLE "flange_pressure_classes" DROP CONSTRAINT "FK_4f1a4f98e1c9b2a84f3551b7bf8"`);
        await queryRunner.query(`ALTER TABLE "pipe_dimensions" DROP CONSTRAINT "FK_51936f621a6b067294cba2dbb37"`);
        await queryRunner.query(`ALTER TABLE "pipe_dimensions" DROP CONSTRAINT "FK_b7a05138eb5813fd13c596750c5"`);
        await queryRunner.query(`ALTER TABLE "pipe_pressures" DROP CONSTRAINT "FK_afdf522b94b8539f60340513f79"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4698620c2fcf96fdbabb09f384"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dc94447a3cabad70eb2c96f5e1"`);
        await queryRunner.query(`DROP TABLE "user_roles_user_role"`);
        await queryRunner.query(`DROP TABLE "nb_nps_lookup"`);
        await queryRunner.query(`DROP TABLE "steel_specifications"`);
        await queryRunner.query(`DROP TABLE "fittings"`);
        await queryRunner.query(`DROP TABLE "fitting_variants"`);
        await queryRunner.query(`DROP TABLE "fitting_dimensions"`);
        await queryRunner.query(`DROP TABLE "angle_ranges"`);
        await queryRunner.query(`DROP TABLE "fitting_bores"`);
        await queryRunner.query(`DROP TABLE "nominal_outside_diameters"`);
        await queryRunner.query(`DROP TABLE "flange_dimensions"`);
        await queryRunner.query(`DROP TABLE "bolts"`);
        await queryRunner.query(`DROP TABLE "nut_masses"`);
        await queryRunner.query(`DROP TABLE "bolt_masses"`);
        await queryRunner.query(`DROP TABLE "flange_pressure_classes"`);
        await queryRunner.query(`DROP TABLE "flange_standards"`);
        await queryRunner.query(`DROP TABLE "pipe_dimensions"`);
        await queryRunner.query(`DROP TABLE "pipe_pressures"`);
        await queryRunner.query(`DROP TABLE "fitting_types"`);
        await queryRunner.query(`DROP TABLE "user_role"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "weld_types"`);
    }

}
