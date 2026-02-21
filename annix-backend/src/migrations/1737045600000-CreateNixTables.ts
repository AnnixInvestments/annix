import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNixTables1737045600000 implements MigrationInterface {
  name = "CreateNixTables1737045600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "nix_extraction_status_enum" AS ENUM (
          'pending', 'processing', 'needs_clarification', 'completed', 'failed'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "nix_document_type_enum" AS ENUM (
          'pdf', 'excel', 'word', 'cad', 'solidworks', 'image', 'unknown'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "nix_extractions" (
        "id" SERIAL PRIMARY KEY,
        "document_name" VARCHAR NOT NULL,
        "document_path" VARCHAR NOT NULL,
        "document_type" "nix_document_type_enum" DEFAULT 'unknown',
        "status" "nix_extraction_status_enum" DEFAULT 'pending',
        "raw_text" TEXT,
        "extracted_data" JSONB,
        "extracted_items" JSONB,
        "relevance_score" DECIMAL(5,2),
        "page_count" INTEGER,
        "error_message" TEXT,
        "processing_time_ms" INTEGER,
        "user_id" INTEGER,
        "rfq_id" INTEGER,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
          ALTER TABLE "nix_extractions" ADD CONSTRAINT "fk_nix_extractions_user"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rfqs') THEN
          ALTER TABLE "nix_extractions" ADD CONSTRAINT "fk_nix_extractions_rfq"
            FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE SET NULL;
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "nix_learning_type_enum" AS ENUM (
          'extraction_pattern', 'relevance_rule', 'terminology', 'correction'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "nix_learning_source_enum" AS ENUM (
          'admin_seeded', 'user_correction', 'aggregated', 'web_augmented'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "nix_learning" (
        "id" SERIAL PRIMARY KEY,
        "learning_type" "nix_learning_type_enum" NOT NULL,
        "source" "nix_learning_source_enum" DEFAULT 'user_correction',
        "category" VARCHAR,
        "pattern_key" VARCHAR NOT NULL,
        "original_value" TEXT,
        "learned_value" TEXT NOT NULL,
        "context" JSONB,
        "confidence" DECIMAL(5,4) DEFAULT 0.5,
        "confirmation_count" INTEGER DEFAULT 1,
        "applicable_products" TEXT[],
        "is_active" BOOLEAN DEFAULT TRUE,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "nix_user_preferences" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "category" VARCHAR,
        "preference_key" VARCHAR NOT NULL,
        "preference_value" TEXT NOT NULL,
        "metadata" JSONB,
        "usage_count" INTEGER DEFAULT 1,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW(),
        UNIQUE("user_id", "preference_key")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
          ALTER TABLE "nix_user_preferences" ADD CONSTRAINT "fk_nix_user_preferences_user"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "nix_clarification_status_enum" AS ENUM (
          'pending', 'answered', 'skipped', 'expired'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "nix_clarification_type_enum" AS ENUM (
          'missing_info', 'ambiguous', 'confirmation', 'relevance'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "nix_response_type_enum" AS ENUM (
          'text', 'screenshot', 'document_reference', 'selection'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "nix_clarifications" (
        "id" SERIAL PRIMARY KEY,
        "extraction_id" INTEGER,
        "user_id" INTEGER,
        "clarification_type" "nix_clarification_type_enum" NOT NULL,
        "status" "nix_clarification_status_enum" DEFAULT 'pending',
        "question" TEXT NOT NULL,
        "context" JSONB,
        "response_type" "nix_response_type_enum",
        "response_text" TEXT,
        "response_screenshot_path" VARCHAR,
        "response_document_ref" JSONB,
        "used_for_learning" BOOLEAN DEFAULT FALSE,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW(),
        "answered_at" TIMESTAMP
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "nix_clarifications" ADD CONSTRAINT "fk_nix_clarifications_extraction"
          FOREIGN KEY ("extraction_id") REFERENCES "nix_extractions"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
          ALTER TABLE "nix_clarifications" ADD CONSTRAINT "fk_nix_clarifications_user"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_nix_extractions_user" ON "nix_extractions"("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_nix_extractions_rfq" ON "nix_extractions"("rfq_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_nix_extractions_status" ON "nix_extractions"("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_nix_learning_type" ON "nix_learning"("learning_type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_nix_learning_pattern" ON "nix_learning"("pattern_key")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_nix_clarifications_extraction" ON "nix_clarifications"("extraction_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_nix_clarifications_status" ON "nix_clarifications"("status")
    `);

    console.log(
      "Created Nix AI tables: nix_extractions, nix_learning, nix_user_preferences, nix_clarifications",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "nix_clarifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "nix_user_preferences"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "nix_learning"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "nix_extractions"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "nix_response_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "nix_clarification_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "nix_clarification_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "nix_learning_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "nix_learning_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "nix_document_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "nix_extraction_status_enum"`);

    console.log("Dropped Nix AI tables");
  }
}
