import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Creates the pvc_fitting_dimensions table and seeds it from the
 * canonical packages/product-data/pvc/* TypeScript modules. The TS
 * modules remain the source of truth — this DB table is a runtime
 * cache that the backend serves to consumers (BOQ row builder, RFQ
 * fitting picker) without each consumer needing to bundle the TS
 * data tables.
 *
 * Mirrors the hdpe_fitting_dimensions table shape (migration
 * 1820100000074) so admin tooling can iterate either polymer
 * uniformly. Issue #288 Phase 3.
 *
 * Re-runnable: IF NOT EXISTS on the column / index / constraint
 * creates, INSERT ... ON CONFLICT DO NOTHING on the seed so re-
 * running the migration after a manual admin edit doesn't clobber
 * the edited rows.
 */
export class CreatePvcFittingDimensions1820100000079 implements MigrationInterface {
  name = "CreatePvcFittingDimensions1820100000079";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pvc_fitting_dimensions" (
        "id" SERIAL PRIMARY KEY,
        "fitting_type" VARCHAR(22) NOT NULL,
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
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_pvc_fitting_dim_type_main_branch'
        ) THEN
          ALTER TABLE "pvc_fitting_dimensions"
          ADD CONSTRAINT "uq_pvc_fitting_dim_type_main_branch"
          UNIQUE ("fitting_type", "main_dn_mm", "branch_dn_mm");
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_pvc_fitting_dim_lookup"
      ON "pvc_fitting_dimensions" ("fitting_type", "main_dn_mm")
    `);

    // Seed catalogue rows from packages/product-data/pvc/*. Generated
    // from the TS modules via annix-backend/gen-pvc-seed.ts on
    // 2026-05-12. ON CONFLICT DO NOTHING so re-running the migration
    // after manual admin edits keeps the edited rows.
    await queryRunner.query(`
      INSERT INTO "pvc_fitting_dimensions"
        (fitting_type, main_dn_mm, branch_dn_mm, face_to_face_mm, centre_to_face_mm, branch_length_mm, length_mm, source, source_id)
      VALUES
        ('elbow_90', 20, NULL, NULL, 22, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('elbow_90', 25, NULL, NULL, 26, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('elbow_90', 32, NULL, NULL, 31, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('elbow_90', 40, NULL, NULL, 37, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('elbow_90', 50, NULL, NULL, 44, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('elbow_90', 63, NULL, NULL, 53, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('elbow_90', 75, NULL, NULL, 62, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('elbow_90', 90, NULL, NULL, 73, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('elbow_90', 110, NULL, NULL, 88, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('elbow_90', 125, NULL, NULL, 99, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('elbow_90', 140, NULL, NULL, 109, NULL, NULL, 'estimated', 'macneil-2025-catalogue'),
        ('elbow_90', 160, NULL, NULL, 124, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('elbow_45', 20, NULL, NULL, 16, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('elbow_45', 25, NULL, NULL, 18, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('elbow_45', 32, NULL, NULL, 21, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('elbow_45', 40, NULL, NULL, 24, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('elbow_45', 50, NULL, NULL, 28, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('elbow_45', 63, NULL, NULL, 33, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('elbow_45', 75, NULL, NULL, 38, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('elbow_45', 90, NULL, NULL, 45, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('elbow_45', 110, NULL, NULL, 53, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('elbow_45', 125, NULL, NULL, 60, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('elbow_45', 140, NULL, NULL, 66, NULL, NULL, 'estimated', 'macneil-2025-catalogue'),
        ('elbow_45', 160, NULL, NULL, 75, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('elbow_22_5', 50, NULL, NULL, 22, NULL, NULL, 'estimated', 'marley-product-catalogue'),
        ('elbow_22_5', 63, NULL, NULL, 25, NULL, NULL, 'estimated', 'marley-product-catalogue'),
        ('elbow_22_5', 75, NULL, NULL, 28, NULL, NULL, 'estimated', 'macneil-2025-catalogue'),
        ('elbow_22_5', 90, NULL, NULL, 32, NULL, NULL, 'estimated', 'macneil-2025-catalogue'),
        ('elbow_22_5', 110, NULL, NULL, 37, NULL, NULL, 'estimated', 'macneil-2025-catalogue'),
        ('elbow_11_25', 110, NULL, NULL, 30, NULL, NULL, 'estimated', 'macneil-2025-catalogue'),
        ('tee_equal', 20, NULL, 44, 22, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('tee_equal', 25, NULL, 52, 26, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('tee_equal', 32, NULL, 62, 31, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('tee_equal', 40, NULL, 74, 37, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('tee_equal', 50, NULL, 88, 44, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('tee_equal', 63, NULL, 106, 53, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('tee_equal', 75, NULL, 124, 62, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('tee_equal', 90, NULL, 146, 73, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('tee_equal', 110, NULL, 176, 88, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('tee_equal', 125, NULL, 198, 99, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('tee_equal', 140, NULL, 218, 109, NULL, NULL, 'estimated', 'macneil-2025-catalogue'),
        ('tee_equal', 160, NULL, 248, 124, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('tee_reducing', 50, 25, 88, 26, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('tee_reducing', 50, 32, 88, 31, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('tee_reducing', 50, 40, 88, 37, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('tee_reducing', 63, 50, 106, 44, NULL, NULL, 'catalogue', 'marley-product-catalogue'),
        ('tee_reducing', 75, 50, 124, 44, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('tee_reducing', 90, 50, 146, 44, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('tee_reducing', 90, 75, 146, 62, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('tee_reducing', 110, 50, 176, 44, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('tee_reducing', 110, 75, 176, 62, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('tee_reducing', 110, 90, 176, 73, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('tee_reducing', 160, 110, 248, 88, NULL, NULL, 'catalogue', 'macneil-2025-catalogue'),
        ('reducer', 32, 25, NULL, NULL, NULL, 28, 'catalogue', 'marley-product-catalogue'),
        ('reducer', 40, 25, NULL, NULL, NULL, 35, 'catalogue', 'marley-product-catalogue'),
        ('reducer', 40, 32, NULL, NULL, NULL, 32, 'catalogue', 'marley-product-catalogue'),
        ('reducer', 50, 25, NULL, NULL, NULL, 45, 'catalogue', 'marley-product-catalogue'),
        ('reducer', 50, 32, NULL, NULL, NULL, 42, 'catalogue', 'marley-product-catalogue'),
        ('reducer', 50, 40, NULL, NULL, NULL, 38, 'catalogue', 'marley-product-catalogue'),
        ('reducer', 63, 32, NULL, NULL, NULL, 55, 'catalogue', 'marley-product-catalogue'),
        ('reducer', 63, 50, NULL, NULL, NULL, 48, 'catalogue', 'marley-product-catalogue'),
        ('reducer', 75, 50, NULL, NULL, NULL, 60, 'catalogue', 'macneil-2025-catalogue'),
        ('reducer', 75, 63, NULL, NULL, NULL, 55, 'catalogue', 'macneil-2025-catalogue'),
        ('reducer', 90, 50, NULL, NULL, NULL, 75, 'catalogue', 'macneil-2025-catalogue'),
        ('reducer', 90, 63, NULL, NULL, NULL, 70, 'catalogue', 'macneil-2025-catalogue'),
        ('reducer', 90, 75, NULL, NULL, NULL, 65, 'catalogue', 'macneil-2025-catalogue'),
        ('reducer', 110, 50, NULL, NULL, NULL, 90, 'catalogue', 'macneil-2025-catalogue'),
        ('reducer', 110, 63, NULL, NULL, NULL, 85, 'catalogue', 'macneil-2025-catalogue'),
        ('reducer', 110, 75, NULL, NULL, NULL, 80, 'catalogue', 'macneil-2025-catalogue'),
        ('reducer', 110, 90, NULL, NULL, NULL, 75, 'catalogue', 'macneil-2025-catalogue'),
        ('reducer', 125, 110, NULL, NULL, NULL, 80, 'catalogue', 'macneil-2025-catalogue'),
        ('reducer', 160, 110, NULL, NULL, NULL, 130, 'catalogue', 'macneil-2025-catalogue'),
        ('reducer', 160, 125, NULL, NULL, NULL, 120, 'catalogue', 'macneil-2025-catalogue'),
        ('end_cap', 20, NULL, NULL, NULL, NULL, 16, 'catalogue', 'marley-product-catalogue'),
        ('end_cap', 25, NULL, NULL, NULL, NULL, 19, 'catalogue', 'marley-product-catalogue'),
        ('end_cap', 32, NULL, NULL, NULL, NULL, 22, 'catalogue', 'marley-product-catalogue'),
        ('end_cap', 40, NULL, NULL, NULL, NULL, 26, 'catalogue', 'marley-product-catalogue'),
        ('end_cap', 50, NULL, NULL, NULL, NULL, 30, 'catalogue', 'marley-product-catalogue'),
        ('end_cap', 63, NULL, NULL, NULL, NULL, 35, 'catalogue', 'marley-product-catalogue'),
        ('end_cap', 75, NULL, NULL, NULL, NULL, 40, 'catalogue', 'macneil-2025-catalogue'),
        ('end_cap', 90, NULL, NULL, NULL, NULL, 46, 'catalogue', 'macneil-2025-catalogue'),
        ('end_cap', 110, NULL, NULL, NULL, NULL, 54, 'catalogue', 'macneil-2025-catalogue'),
        ('end_cap', 125, NULL, NULL, NULL, NULL, 60, 'catalogue', 'macneil-2025-catalogue'),
        ('end_cap', 140, NULL, NULL, NULL, NULL, 66, 'estimated', 'macneil-2025-catalogue'),
        ('end_cap', 160, NULL, NULL, NULL, NULL, 74, 'catalogue', 'macneil-2025-catalogue'),
        ('coupling_slip', 20, NULL, NULL, NULL, NULL, 44, 'catalogue', 'marley-product-catalogue'),
        ('coupling_slip', 25, NULL, NULL, NULL, NULL, 50, 'catalogue', 'marley-product-catalogue'),
        ('coupling_slip', 32, NULL, NULL, NULL, NULL, 58, 'catalogue', 'marley-product-catalogue'),
        ('coupling_slip', 40, NULL, NULL, NULL, NULL, 68, 'catalogue', 'marley-product-catalogue'),
        ('coupling_slip', 50, NULL, NULL, NULL, NULL, 80, 'catalogue', 'marley-product-catalogue'),
        ('coupling_slip', 63, NULL, NULL, NULL, NULL, 94, 'catalogue', 'marley-product-catalogue'),
        ('coupling_slip', 75, NULL, NULL, NULL, NULL, 108, 'catalogue', 'macneil-2025-catalogue'),
        ('coupling_slip', 90, NULL, NULL, NULL, NULL, 126, 'catalogue', 'macneil-2025-catalogue'),
        ('coupling_slip', 110, NULL, NULL, NULL, NULL, 150, 'catalogue', 'macneil-2025-catalogue'),
        ('coupling_slip', 125, NULL, NULL, NULL, NULL, 168, 'catalogue', 'macneil-2025-catalogue'),
        ('coupling_slip', 160, NULL, NULL, NULL, NULL, 210, 'catalogue', 'macneil-2025-catalogue'),
        ('coupling_rrj', 50, NULL, NULL, NULL, NULL, 110, 'catalogue', 'flo-tek-upvc-pressure'),
        ('coupling_rrj', 63, NULL, NULL, NULL, NULL, 125, 'catalogue', 'flo-tek-upvc-pressure'),
        ('coupling_rrj', 75, NULL, NULL, NULL, NULL, 140, 'catalogue', 'flo-tek-upvc-pressure'),
        ('coupling_rrj', 90, NULL, NULL, NULL, NULL, 160, 'catalogue', 'flo-tek-upvc-pressure'),
        ('coupling_rrj', 110, NULL, NULL, NULL, NULL, 185, 'catalogue', 'flo-tek-upvc-pressure'),
        ('coupling_rrj', 125, NULL, NULL, NULL, NULL, 205, 'catalogue', 'flo-tek-upvc-pressure'),
        ('coupling_rrj', 140, NULL, NULL, NULL, NULL, 220, 'estimated', 'flo-tek-upvc-pressure'),
        ('coupling_rrj', 160, NULL, NULL, NULL, NULL, 240, 'catalogue', 'flo-tek-upvc-pressure'),
        ('coupling_rrj', 200, NULL, NULL, NULL, NULL, 280, 'catalogue', 'flo-tek-upvc-pressure'),
        ('coupling_rrj', 250, NULL, NULL, NULL, NULL, 330, 'catalogue', 'flo-tek-upvc-pressure'),
        ('coupling_rrj', 315, NULL, NULL, NULL, NULL, 400, 'catalogue', 'flo-tek-upvc-pressure'),
        ('coupling_rrj', 355, NULL, NULL, NULL, NULL, 440, 'catalogue', 'flo-tek-upvc-pressure'),
        ('coupling_rrj', 400, NULL, NULL, NULL, NULL, 490, 'catalogue', 'flo-tek-upvc-pressure'),
        ('coupling_rrj', 450, NULL, NULL, NULL, NULL, 540, 'estimated', 'flo-tek-upvc-pressure'),
        ('coupling_rrj', 500, NULL, NULL, NULL, NULL, 590, 'estimated', 'flo-tek-upvc-pressure'),
        ('coupling_rrj', 630, NULL, NULL, NULL, NULL, 700, 'estimated', 'flo-tek-upvc-pressure'),
        ('coupling_compression', 50, NULL, NULL, NULL, NULL, 150, 'estimated', 'dpi-trading-pvc'),
        ('coupling_compression', 63, NULL, NULL, NULL, NULL, 160, 'estimated', 'dpi-trading-pvc'),
        ('coupling_compression', 75, NULL, NULL, NULL, NULL, 180, 'estimated', 'dpi-trading-pvc'),
        ('coupling_compression', 90, NULL, NULL, NULL, NULL, 200, 'estimated', 'dpi-trading-pvc'),
        ('coupling_compression', 110, NULL, NULL, NULL, NULL, 220, 'estimated', 'dpi-trading-pvc'),
        ('coupling_compression', 160, NULL, NULL, NULL, NULL, 280, 'estimated', 'dpi-trading-pvc')
      ON CONFLICT ("fitting_type", "main_dn_mm", "branch_dn_mm") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pvc_fitting_dimensions"`);
  }
}
