import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEeDisclosureInvites1820100000066 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_ee_disclosure_invites (
        id SERIAL PRIMARY KEY,
        candidate_id INTEGER NOT NULL REFERENCES cv_assistant_candidates(id) ON DELETE CASCADE,
        job_posting_id INTEGER NOT NULL REFERENCES cv_assistant_job_postings(id) ON DELETE CASCADE,
        token VARCHAR(120) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS cv_ee_disclosure_invites_candidate_idx
        ON cv_assistant_ee_disclosure_invites (candidate_id)
    `);

    await queryRunner.query(`
      INSERT INTO cv_assistant_ee_consent_text_versions (version_label, body, effective_from)
      VALUES (
        'v1-2026-default',
        $$Employment Equity disclosure consent (default v1)

This site collects information about your population group, gender, disability status,
nationality status, and any reasonable accommodations you may need. This information
is "special personal information" under the Protection of Personal Information Act
(POPIA, s26) and is collected only with your explicit consent for two purposes:

1. Employment Equity Act 55/1998 reporting (EEA2 / EEA4 statutory returns).
2. Fairness monitoring of the AI-assisted screening process (POPIA s71).

Your disclosure is voluntary. You may decline, select "prefer not to say" for any
field, withdraw consent later, request a copy of your data, or request deletion.
The AI candidate ranker does NOT have access to these attributes — they are stored
in a separate, role-restricted system and are used only for aggregate reporting and
fairness audits.

Customers must replace this default text with their own, lawyer-reviewed consent
notice before enabling EE disclosure for their job postings.$$,
        NOW()
      )
      ON CONFLICT (version_label) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_ee_disclosure_invites");
    await queryRunner.query(`
      DELETE FROM cv_assistant_ee_consent_text_versions
        WHERE version_label = 'v1-2026-default'
    `);
  }
}
