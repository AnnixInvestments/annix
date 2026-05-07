import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Introduces nix_extraction_sessions — the grouping entity that lets a
 * single quote pack (multiple drawings + multiple specs) be processed and
 * reviewed together. The Nix orchestrator uses prior session siblings as
 * Gemini context when extracting later documents, so paint codes / material
 * classes referenced on drawings get cross-linked to the spec clauses that
 * define them.
 *
 * Adds session_id FK on nix_extractions. Idempotent (IF NOT EXISTS / IF
 * EXISTS, DO blocks for FK creation).
 *
 * Followup to #251 — see #253 task B.
 */
export class CreateNixExtractionSessions1820100000071 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS nix_extraction_sessions (
        id SERIAL PRIMARY KEY,
        source_module VARCHAR(64) NOT NULL,
        source_id INTEGER NULL,
        extraction_profile VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        title VARCHAR(256) NULL,
        external_reference VARCHAR(128) NULL,
        promoted_ref VARCHAR(128) NULL,
        owner_user_id INTEGER NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_nix_sessions_source
        ON nix_extraction_sessions (source_module, source_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_nix_sessions_owner
        ON nix_extraction_sessions (owner_user_id);
    `);

    // owner FK — soft (no cascade) so a deleted user doesn't blow away the
    // session. The session retains the owner_user_id even if the user row
    // is later removed.
    //
    // The table is "user" (singular, quoted) — that's the convention every
    // other migration in this repo uses (see CreateAuditLogTable,
    // CreateDrawingsTables, CreateBoqTables, CreateWorkflowTables, etc.).
    // The User entity is `@Entity()` with no explicit name, so TypeORM
    // derives the table name from the class with its default naming
    // strategy → "user". An earlier draft of this migration mistakenly
    // referenced `users(id)` and crashed Fly deploys with
    //   relation "users" does not exist
    // The migration is wrapped in a TypeORM transaction, so that crash
    // rolled the whole file back atomically — no partial state on any
    // database. Fixing the table name in place is correct here; a
    // follow-up "repair" migration would be the wrong tool for a failure
    // that never persisted.
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE nix_extraction_sessions
          ADD CONSTRAINT fk_nix_sessions_owner
          FOREIGN KEY (owner_user_id) REFERENCES "user"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE nix_extractions
      ADD COLUMN IF NOT EXISTS session_id INTEGER NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_nix_extractions_session
        ON nix_extractions (session_id);
    `);

    // session FK on extractions — ON DELETE CASCADE so removing a session
    // also drops its extractions. The S3 source files are cleaned up
    // separately by retention logic in #253 task C.
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE nix_extractions
          ADD CONSTRAINT fk_nix_extractions_session
          FOREIGN KEY (session_id) REFERENCES nix_extraction_sessions(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE nix_extractions DROP CONSTRAINT fk_nix_extractions_session;
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$;
    `);
    await queryRunner.query("DROP INDEX IF EXISTS idx_nix_extractions_session;");
    await queryRunner.query(`
      ALTER TABLE nix_extractions DROP COLUMN IF EXISTS session_id;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE nix_extraction_sessions DROP CONSTRAINT fk_nix_sessions_owner;
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$;
    `);
    await queryRunner.query("DROP INDEX IF EXISTS idx_nix_sessions_owner;");
    await queryRunner.query("DROP INDEX IF EXISTS idx_nix_sessions_source;");
    await queryRunner.query("DROP TABLE IF EXISTS nix_extraction_sessions;");
  }
}
