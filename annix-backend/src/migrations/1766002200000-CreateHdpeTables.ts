import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHdpeTables1766002200000 implements MigrationInterface {
  name = 'CreateHdpeTables1766002200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create hdpe_standards table
    await queryRunner.query(`
      CREATE TABLE "hdpe_standards" (
        "id" SERIAL NOT NULL,
        "code" VARCHAR(50) NOT NULL,
        "name" VARCHAR(200) NOT NULL,
        "description" TEXT NOT NULL,
        "organization" VARCHAR(100),
        "region" VARCHAR(50),
        "applicable_to" VARCHAR(100),
        "display_order" INTEGER NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hdpe_standards" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_hdpe_standards_code" UNIQUE ("code")
      )
    `);

    // Create hdpe_pipe_specifications table
    await queryRunner.query(`
      CREATE TABLE "hdpe_pipe_specifications" (
        "id" SERIAL NOT NULL,
        "nominal_bore" INTEGER NOT NULL,
        "outer_diameter" NUMERIC(8,2) NOT NULL,
        "sdr" NUMERIC(6,2) NOT NULL,
        "wall_thickness" NUMERIC(8,3) NOT NULL,
        "inner_diameter" NUMERIC(8,3) NOT NULL,
        "weight_kg_per_m" NUMERIC(10,4) NOT NULL,
        "pressure_rating_pn" NUMERIC(6,2),
        "material_grade" VARCHAR(20) NOT NULL DEFAULT 'PE100',
        "display_order" INTEGER NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hdpe_pipe_specifications" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_hdpe_pipe_nb_sdr" UNIQUE ("nominal_bore", "sdr")
      )
    `);

    // Create hdpe_fitting_types table
    await queryRunner.query(`
      CREATE TABLE "hdpe_fitting_types" (
        "id" SERIAL NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "code" VARCHAR(50) NOT NULL,
        "description" TEXT,
        "num_buttwelds" INTEGER NOT NULL DEFAULT 0,
        "is_molded" BOOLEAN NOT NULL DEFAULT false,
        "is_fabricated" BOOLEAN NOT NULL DEFAULT false,
        "category" VARCHAR(50),
        "display_order" INTEGER NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hdpe_fitting_types" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_hdpe_fitting_types_code" UNIQUE ("code")
      )
    `);

    // Create hdpe_fitting_weights table
    await queryRunner.query(`
      CREATE TABLE "hdpe_fitting_weights" (
        "id" SERIAL NOT NULL,
        "fitting_type_id" INTEGER NOT NULL,
        "nominal_bore" INTEGER NOT NULL,
        "weight_kg" NUMERIC(10,3) NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hdpe_fitting_weights" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_hdpe_fitting_weights" UNIQUE ("fitting_type_id", "nominal_bore"),
        CONSTRAINT "FK_hdpe_fitting_weights_fitting_type"
          FOREIGN KEY ("fitting_type_id") REFERENCES "hdpe_fitting_types"("id")
          ON DELETE CASCADE
      )
    `);

    // Create hdpe_buttweld_prices table
    await queryRunner.query(`
      CREATE TABLE "hdpe_buttweld_prices" (
        "id" SERIAL NOT NULL,
        "nominal_bore" INTEGER NOT NULL,
        "price_per_weld" NUMERIC(10,2) NOT NULL,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'ZAR',
        "effective_from" DATE,
        "effective_to" DATE,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hdpe_buttweld_prices" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_hdpe_buttweld_prices_nb" UNIQUE ("nominal_bore")
      )
    `);

    // Create hdpe_stub_prices table
    await queryRunner.query(`
      CREATE TABLE "hdpe_stub_prices" (
        "id" SERIAL NOT NULL,
        "nominal_bore" INTEGER NOT NULL,
        "price_per_stub" NUMERIC(10,2) NOT NULL,
        "weight_kg" NUMERIC(10,3),
        "currency" VARCHAR(3) NOT NULL DEFAULT 'ZAR',
        "effective_from" DATE,
        "effective_to" DATE,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hdpe_stub_prices" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_hdpe_stub_prices_nb" UNIQUE ("nominal_bore")
      )
    `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_hdpe_pipe_specifications_nb" ON "hdpe_pipe_specifications"("nominal_bore")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_hdpe_pipe_specifications_sdr" ON "hdpe_pipe_specifications"("sdr")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_hdpe_pipe_specifications_active" ON "hdpe_pipe_specifications"("is_active")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_hdpe_fitting_types_code" ON "hdpe_fitting_types"("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_hdpe_fitting_types_category" ON "hdpe_fitting_types"("category")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_hdpe_fitting_weights_nb" ON "hdpe_fitting_weights"("nominal_bore")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_hdpe_fitting_weights_nb"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_hdpe_fitting_types_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_hdpe_fitting_types_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_hdpe_pipe_specifications_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_hdpe_pipe_specifications_sdr"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_hdpe_pipe_specifications_nb"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "hdpe_stub_prices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hdpe_buttweld_prices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hdpe_fitting_weights"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hdpe_fitting_types"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hdpe_pipe_specifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hdpe_standards"`);
  }
}
