# ESCO Skills Seed — Operator Runbook

The CV Assistant uses the ESCO (European Skills, Competences, Occupations)
taxonomy to canonicalise free-text skill strings (`Postgres` → `PostgreSQL`,
`coded welder` → `Welding (coded)`, etc.).

ESCO does not publish a direct download URL — every download is gated through
their portal with a privacy-statement acceptance step. This is a one-time
operator task per ESCO version bump.

## Why this is a manual step

- ESCO's terms require accepting a privacy statement (email captured for usage
  stats) before download — no scriptable bypass.
- The CSV is ~13 MB uncompressed; per the decision in #276 we commit the
  resulting seed SQL into a TypeORM migration rather than fetch on first run.

## How to refresh ESCO data (15 minutes, one-off per version)

1. Go to <https://esco.ec.europa.eu/en/use-esco/download>.
2. Pick:
   - Version: latest (currently v1.2.1).
   - Type: **Classification**.
   - Language: **English** only.
   - Format: **CSV**.
3. Enter your email, accept the privacy statement, and download the ZIP.
4. Extract `skills_en.csv` (the file matching the skills classification, not
   occupations or ISCO).
5. Run the transformer:

   ```bash
   node scripts/cv-assistant/esco-csv-to-seed.mjs \
     --input ~/Downloads/v1.2.1/skills_en.csv \
     --output annix-backend/src/migrations/1820100000089-SeedCvEscoSkills.ts
   ```

6. Verify the count makes sense (~13k skills expected).
7. Commit the generated migration. It is idempotent (`ON CONFLICT DO NOTHING`)
   so re-running it on an already-seeded DB is safe.
8. Run `pnpm migrate` to apply.
9. After the migration completes, invalidate the in-memory ESCO cache (or
   restart the API) so `EscoNormalisationService` picks up the new rows.

## After seeding: re-embed existing rows

The seed only changes embeddings for **new** candidates and jobs. To upgrade
existing rows:

```bash
DATABASE_URL=... GEMINI_API_KEY=... \
  node scripts/cv-assistant/reembed-with-esco.mjs
```

The script throttles to 1 row every 100ms and bumps
`CV_EMBEDDING_DAILY_CALLS_THRESHOLD` to 50_000 for the duration. Expected cost
is well under $1 at current Gemini text-embedding-004 pricing.

## ESCO version bumps

When ESCO releases a new version:

1. Re-run steps 1-5 above against the new CSV.
2. The transformer writes to a NEW migration file (next timestamp) — do not
   overwrite an already-deployed migration.
3. The seed uses `ON CONFLICT ("esco_uri") DO NOTHING`, so new skills are
   added without disturbing existing rows. Removed skills are not deleted
   automatically — handle via a follow-up DELETE migration if necessary.

## Licence

ESCO data is published under CC-BY 4.0
(<https://esco.ec.europa.eu/en/about-esco/legal-notice>). The seed migration
header preserves the attribution. No action required at our end.
