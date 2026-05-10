import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Creates the hdpe_fitting_dimensions table and seeds it from the
 * canonical packages/product-data/hdpe/* TypeScript modules. The TS
 * modules remain the source of truth — this DB table is a runtime
 * cache that the backend serves to consumers (BOQ row builder)
 * without each consumer needing to bundle the TS data tables.
 *
 * Re-runnable: idempotent CREATE TABLE IF NOT EXISTS, idempotent
 * seed via ON CONFLICT DO NOTHING. Future migrations should use
 * INSERT ... ON CONFLICT (fitting_type, main_dn_mm, branch_dn_mm)
 * DO UPDATE to push catalogue updates from the TS modules without
 * losing per-customer admin overrides — for now the table is
 * read-only from the admin UI.
 */
export class CreateHdpeFittingDimensions1820100000074 implements MigrationInterface {
  name = "CreateHdpeFittingDimensions1820100000074";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hdpe_fitting_dimensions" (
        "id" SERIAL PRIMARY KEY,
        "fitting_type" VARCHAR(20) NOT NULL,
        "main_dn_mm" INTEGER NOT NULL,
        "branch_dn_mm" INTEGER,
        "face_to_face_mm" INTEGER,
        "centre_to_face_mm" INTEGER,
        "branch_length_mm" INTEGER,
        "length_mm" INTEGER,
        "source" VARCHAR(12) NOT NULL,
        "source_id" VARCHAR(40) NOT NULL,
        "notes" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_hdpe_fitting_dim_type_main_branch'
        ) THEN
          ALTER TABLE "hdpe_fitting_dimensions"
          ADD CONSTRAINT "uq_hdpe_fitting_dim_type_main_branch"
          UNIQUE ("fitting_type", "main_dn_mm", "branch_dn_mm");
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_hdpe_fitting_dim_lookup"
      ON "hdpe_fitting_dimensions" ("fitting_type", "main_dn_mm")
    `);

    // Seed elbow_90 (HdpePolyfittings catalogue, DN 50-800)
    await queryRunner.query(`
      INSERT INTO "hdpe_fitting_dimensions"
        (fitting_type, main_dn_mm, face_to_face_mm, centre_to_face_mm, source, source_id)
      VALUES
        ('elbow_90',  50, 120,  66, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90',  63, 133,  63, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90',  75, 163,  70, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90',  90, 182,  79, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90', 110, 210,  82, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90', 125, 240,  87, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90', 140, 241,  89, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90', 160, 258,  80, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90', 180, 297, 105, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90', 200, 308,  97, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90', 225, 367, 120, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90', 250, 362, 100, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90', 280, 423, 139, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90', 315, 455, 125, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90', 355, 550, 155, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90', 400, 610, 160, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90', 450, 650, 155, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90', 500, 700, 155, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90', 560, 780, 165, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90', 630, 850, 170, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90', 710, 900, 170, 'catalogue', 'hdpepolyfittings'),
        ('elbow_90', 800, 990, 170, 'catalogue', 'hdpepolyfittings')
      ON CONFLICT (fitting_type, main_dn_mm, branch_dn_mm) DO NOTHING
    `);

    // Seed elbow_45 (HdpePolyfittings catalogue, DN 50-800)
    await queryRunner.query(`
      INSERT INTO "hdpe_fitting_dimensions"
        (fitting_type, main_dn_mm, face_to_face_mm, centre_to_face_mm, source, source_id)
      VALUES
        ('elbow_45',  50, 150,  62, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45',  63, 160,  63, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45',  75, 180,  70, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45',  90, 227,  79, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45', 110, 245,  82, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45', 125, 244,  87, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45', 140, 265,  92, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45', 160, 302,  98, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45', 180, 340, 105, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45', 200, 355, 112, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45', 225, 390, 120, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45', 250, 405, 130, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45', 280, 460, 140, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45', 315, 505, 150, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45', 355, 530, 145, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45', 400, 580, 160, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45', 450, 650, 155, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45', 500, 735, 180, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45', 560, 760, 160, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45', 630, 820, 160, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45', 710, 690, 170, 'catalogue', 'hdpepolyfittings'),
        ('elbow_45', 800, 720, 170, 'catalogue', 'hdpepolyfittings')
      ON CONFLICT (fitting_type, main_dn_mm, branch_dn_mm) DO NOTHING
    `);

    // Seed tee_equal (HdpePolyfittings catalogue, DN 50-400)
    await queryRunner.query(`
      INSERT INTO "hdpe_fitting_dimensions"
        (fitting_type, main_dn_mm, face_to_face_mm, centre_to_face_mm, source, source_id)
      VALUES
        ('tee_equal',  50, 170,  87, 'catalogue', 'hdpepolyfittings'),
        ('tee_equal',  63, 203, 104, 'catalogue', 'hdpepolyfittings'),
        ('tee_equal',  75, 230, 118, 'catalogue', 'hdpepolyfittings'),
        ('tee_equal',  90, 263, 134, 'catalogue', 'hdpepolyfittings'),
        ('tee_equal', 110, 295, 145, 'catalogue', 'hdpepolyfittings'),
        ('tee_equal', 125, 315, 163, 'catalogue', 'hdpepolyfittings'),
        ('tee_equal', 140, 345, 178, 'catalogue', 'hdpepolyfittings'),
        ('tee_equal', 160, 325, 169, 'catalogue', 'hdpepolyfittings'),
        ('tee_equal', 180, 437, 225, 'catalogue', 'hdpepolyfittings'),
        ('tee_equal', 200, 380, 200, 'catalogue', 'hdpepolyfittings'),
        ('tee_equal', 225, 502, 247, 'catalogue', 'hdpepolyfittings'),
        ('tee_equal', 250, 500, 263, 'catalogue', 'hdpepolyfittings'),
        ('tee_equal', 280, 490, 255, 'catalogue', 'hdpepolyfittings'),
        ('tee_equal', 315, 600, 300, 'catalogue', 'hdpepolyfittings'),
        ('tee_equal', 355, 722, 360, 'catalogue', 'hdpepolyfittings'),
        ('tee_equal', 400, 720, 377, 'catalogue', 'hdpepolyfittings')
      ON CONFLICT (fitting_type, main_dn_mm, branch_dn_mm) DO NOTHING
    `);

    // Seed tee_reducing (HdpePolyfittings catalogue, sparse pairs)
    await queryRunner.query(`
      INSERT INTO "hdpe_fitting_dimensions"
        (fitting_type, main_dn_mm, branch_dn_mm, face_to_face_mm, centre_to_face_mm, source, source_id)
      VALUES
        ('tee_reducing',  63,  25, 110, 129, 'catalogue', 'hdpepolyfittings'),
        ('tee_reducing',  63,  32, 110, 129, 'catalogue', 'hdpepolyfittings'),
        ('tee_reducing',  90,  25, 140, 185, 'catalogue', 'hdpepolyfittings'),
        ('tee_reducing',  90,  50, 140, 185, 'catalogue', 'hdpepolyfittings'),
        ('tee_reducing',  90,  63, 140, 185, 'catalogue', 'hdpepolyfittings'),
        ('tee_reducing', 110,  20, 130, 145, 'catalogue', 'hdpepolyfittings'),
        ('tee_reducing', 110,  25, 130, 145, 'catalogue', 'hdpepolyfittings'),
        ('tee_reducing', 110,  32, 130, 145, 'catalogue', 'hdpepolyfittings'),
        ('tee_reducing', 110,  50, 145, 175, 'catalogue', 'hdpepolyfittings'),
        ('tee_reducing', 110,  63, 145, 175, 'catalogue', 'hdpepolyfittings'),
        ('tee_reducing', 160,  63, 190, 225, 'catalogue', 'hdpepolyfittings'),
        ('tee_reducing', 160,  90, 190, 225, 'catalogue', 'hdpepolyfittings'),
        ('tee_reducing', 200,  63, 190, 215, 'catalogue', 'hdpepolyfittings'),
        ('tee_reducing', 200,  90, 190, 215, 'catalogue', 'hdpepolyfittings'),
        ('tee_reducing', 250,  63, 190, 215, 'catalogue', 'hdpepolyfittings'),
        ('tee_reducing', 250,  90, 190, 215, 'catalogue', 'hdpepolyfittings'),
        ('tee_reducing', 315,  63, 190, 215, 'catalogue', 'hdpepolyfittings'),
        ('tee_reducing', 315,  90, 190, 215, 'catalogue', 'hdpepolyfittings')
      ON CONFLICT (fitting_type, main_dn_mm, branch_dn_mm) DO NOTHING
    `);

    // Seed reducer (HdpePolyfittings catalogue, ~60 pairs)
    await queryRunner.query(`
      INSERT INTO "hdpe_fitting_dimensions"
        (fitting_type, main_dn_mm, branch_dn_mm, length_mm, source, source_id)
      VALUES
        ('reducer',  50,  32, 135, 'catalogue', 'hdpepolyfittings'),
        ('reducer',  63,  32, 135, 'catalogue', 'hdpepolyfittings'),
        ('reducer',  63,  50, 135, 'catalogue', 'hdpepolyfittings'),
        ('reducer',  75,  50, 146, 'catalogue', 'hdpepolyfittings'),
        ('reducer',  75,  63, 146, 'catalogue', 'hdpepolyfittings'),
        ('reducer',  90,  50, 176, 'catalogue', 'hdpepolyfittings'),
        ('reducer',  90,  63, 176, 'catalogue', 'hdpepolyfittings'),
        ('reducer',  90,  75, 176, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 110,  63, 200, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 110,  75, 200, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 110,  90, 200, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 125,  90, 203, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 125, 110, 203, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 140, 110, 207, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 160,  90, 220, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 160, 110, 220, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 160, 125, 220, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 160, 140, 220, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 180, 110, 240, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 180, 160, 240, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 200, 110, 267, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 200, 125, 267, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 200, 160, 267, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 200, 180, 267, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 225, 160, 290, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 225, 200, 290, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 250, 160, 290, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 250, 180, 290, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 250, 200, 280, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 250, 225, 280, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 280, 200, 250, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 280, 225, 250, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 280, 250, 250, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 315, 200, 255, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 315, 225, 255, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 315, 250, 255, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 315, 280, 255, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 355, 250, 285, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 355, 280, 285, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 355, 315, 285, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 400, 250, 285, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 400, 315, 285, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 400, 355, 285, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 450, 315, 265, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 450, 355, 265, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 450, 400, 265, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 500, 315, 250, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 500, 400, 250, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 500, 450, 250, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 560, 400, 250, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 560, 450, 250, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 560, 500, 250, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 630, 400, 250, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 630, 500, 250, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 630, 560, 250, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 710, 500, 250, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 710, 560, 250, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 710, 630, 250, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 800, 500, 250, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 800, 560, 250, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 800, 630, 250, 'catalogue', 'hdpepolyfittings'),
        ('reducer', 800, 710, 250, 'catalogue', 'hdpepolyfittings')
      ON CONFLICT (fitting_type, main_dn_mm, branch_dn_mm) DO NOTHING
    `);

    // Seed lateral_45 (mixed sources — Sunplast/HdpePolyfittings DN
    // 63-160 catalogue moulded; Strongbridge DN 200/250/315 catalogue
    // fabricated; rest estimated anchored to nearest catalogue).
    await queryRunner.query(`
      INSERT INTO "hdpe_fitting_dimensions"
        (fitting_type, main_dn_mm, face_to_face_mm, branch_length_mm, centre_to_face_mm, source, source_id)
      VALUES
        ('lateral_45',  63,  257,  65,  65, 'catalogue', 'hdpepolyfittings'),
        ('lateral_45',  75,  280,  65,  70, 'catalogue', 'hdpepolyfittings'),
        ('lateral_45',  90,  338,  90,  80, 'catalogue', 'hdpepolyfittings'),
        ('lateral_45', 110,  392, 100,  90, 'catalogue', 'hdpepolyfittings'),
        ('lateral_45', 125,  404,  90,  85, 'catalogue', 'hdpepolyfittings'),
        ('lateral_45', 140,  404,  75,  75, 'catalogue', 'hdpepolyfittings'),
        ('lateral_45', 160,  420,  75,  75, 'catalogue', 'hdpepolyfittings'),
        ('lateral_45', 180,  700, 175, 140, 'estimated', 'strongbridge'),
        ('lateral_45', 200,  985, 245, 195, 'catalogue', 'strongbridge'),
        ('lateral_45', 225, 1040, 260, 210, 'estimated', 'strongbridge'),
        ('lateral_45', 250, 1100, 275, 220, 'catalogue', 'strongbridge'),
        ('lateral_45', 280, 1150, 290, 230, 'estimated', 'strongbridge'),
        ('lateral_45', 315, 1200, 300, 240, 'catalogue', 'strongbridge'),
        ('lateral_45', 355, 1420, 355, 285, 'estimated', 'strongbridge'),
        ('lateral_45', 400, 1600, 400, 320, 'estimated', 'strongbridge'),
        ('lateral_45', 450, 1800, 450, 360, 'estimated', 'strongbridge'),
        ('lateral_45', 500, 2000, 500, 400, 'estimated', 'strongbridge'),
        ('lateral_45', 560, 2240, 560, 450, 'estimated', 'strongbridge'),
        ('lateral_45', 630, 2520, 630, 505, 'estimated', 'strongbridge')
      ON CONFLICT (fitting_type, main_dn_mm, branch_dn_mm) DO NOTHING
    `);

    // Seed end_cap (HdpePolyfittings catalogue, DN 50-800)
    await queryRunner.query(`
      INSERT INTO "hdpe_fitting_dimensions"
        (fitting_type, main_dn_mm, length_mm, source, source_id)
      VALUES
        ('end_cap',  50,  45, 'catalogue', 'hdpepolyfittings'),
        ('end_cap',  63,  58, 'catalogue', 'hdpepolyfittings'),
        ('end_cap',  75,  62, 'catalogue', 'hdpepolyfittings'),
        ('end_cap',  90,  94, 'catalogue', 'hdpepolyfittings'),
        ('end_cap', 110, 190, 'catalogue', 'hdpepolyfittings'),
        ('end_cap', 125, 225, 'catalogue', 'hdpepolyfittings'),
        ('end_cap', 140, 240, 'catalogue', 'hdpepolyfittings'),
        ('end_cap', 160, 245, 'catalogue', 'hdpepolyfittings'),
        ('end_cap', 180, 280, 'catalogue', 'hdpepolyfittings'),
        ('end_cap', 200, 280, 'catalogue', 'hdpepolyfittings'),
        ('end_cap', 225, 320, 'catalogue', 'hdpepolyfittings'),
        ('end_cap', 250, 335, 'catalogue', 'hdpepolyfittings'),
        ('end_cap', 280, 380, 'catalogue', 'hdpepolyfittings'),
        ('end_cap', 315, 355, 'catalogue', 'hdpepolyfittings'),
        ('end_cap', 355, 370, 'catalogue', 'hdpepolyfittings'),
        ('end_cap', 400, 390, 'catalogue', 'hdpepolyfittings'),
        ('end_cap', 450, 450, 'catalogue', 'hdpepolyfittings'),
        ('end_cap', 500, 480, 'catalogue', 'hdpepolyfittings'),
        ('end_cap', 560, 520, 'catalogue', 'hdpepolyfittings'),
        ('end_cap', 630, 560, 'catalogue', 'hdpepolyfittings'),
        ('end_cap', 710, 690, 'catalogue', 'hdpepolyfittings'),
        ('end_cap', 800, 720, 'catalogue', 'hdpepolyfittings')
      ON CONFLICT (fitting_type, main_dn_mm, branch_dn_mm) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hdpe_fitting_dimensions"`);
  }
}
