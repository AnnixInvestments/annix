import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds walkthrough_state jsonb column to nix_chat_sessions. Stores the
 * shape defined by `WalkthroughState` in nix-chat-session.entity.ts:
 * { capabilityKey, guideSlug, startedAt, currentStep, totalSteps,
 *   stepHistory[], endedAt?, endReason? }.
 *
 * Null when the session has no active or completed walkthrough.
 *
 * Idempotent — uses IF NOT EXISTS so re-running the migration is safe.
 *
 * Issue #262 Phase 4 — walkthrough mode.
 */
export class AddWalkthroughStateToNixChatSessions1820100000072 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE nix_chat_sessions
        ADD COLUMN IF NOT EXISTS walkthrough_state JSONB NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE nix_chat_sessions DROP COLUMN IF EXISTS walkthrough_state;
    `);
  }
}
