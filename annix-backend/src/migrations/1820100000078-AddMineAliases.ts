import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds the `aliases` TEXT[] column to every country-mines table so
 * MineInferenceService can match Nix uploads against project names /
 * doc-number prefixes / colloquial identifiers that aren't the
 * literal mine name.
 *
 * Seeds Mogalakwena's aliases with the identifiers that appear in
 * the Anglo American RFQ 2026-25 pack — "Blinkwater 2" (the TSF
 * on the mine), "JW559" (Jones & Wagener consultant project code),
 * "J528" (drawing prefix), plus a redundant "Mogalakwena Mine" /
 * "Mogalakwena" pair so partial mentions also match.
 *
 * Issue #264 Phase 2.
 *
 * Idempotent — IF NOT EXISTS on column adds, ON CONFLICT not needed
 * for the seed because we use array_cat with a de-dup pass.
 */
export class AddMineAliases1820100000078 implements MigrationInterface {
  name = "AddMineAliases1820100000078";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      "sa_mines",
      "botswana_mines",
      "namibia_mines",
      "zimbabwe_mines",
      "zambia_mines",
      "mozambique_mines",
    ];

    for (const table of tables) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD COLUMN IF NOT EXISTS "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
      `);
    }

    // Seed Mogalakwena's aliases. Uses array_cat + DISTINCT so a
    // re-run of this migration doesn't duplicate entries — though
    // the IF NOT EXISTS on the column above also guards the column
    // creation, the seed itself runs unconditionally and must be
    // safe to re-apply.
    await queryRunner.query(`
      UPDATE "sa_mines"
      SET "aliases" = (
        SELECT ARRAY(
          SELECT DISTINCT unnest(
            "aliases" || ARRAY['Mogalakwena', 'Mogalakwena Mine', 'Blinkwater', 'Blinkwater 2', 'JW559', 'J528']::TEXT[]
          )
        )
      )
      WHERE "mine_name" = 'Mogalakwena Mine'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      "sa_mines",
      "botswana_mines",
      "namibia_mines",
      "zimbabwe_mines",
      "zambia_mines",
      "mozambique_mines",
    ];

    for (const table of tables) {
      await queryRunner.query(`
        ALTER TABLE "${table}" DROP COLUMN IF EXISTS "aliases"
      `);
    }
  }
}
