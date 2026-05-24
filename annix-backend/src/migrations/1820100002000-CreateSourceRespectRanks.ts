import { MigrationInterface, QueryRunner } from "typeorm";

// Source-respect ranking that drives which copy of a duplicate job listing is
// kept (higher = kept). Ranks researched from SA job-board standing (#305):
// DPSA is the authoritative government source; Executive Placements is SA's
// only direct executive portal; JobMail is a large established board (~900k
// MAU); Job Placements is its mid/junior sister network; Adzuna is an
// aggregator (re-lists other sites) so its copy is least preferred; Remotive
// is a niche global remote board.
export class CreateSourceRespectRanks1820100002000 implements MigrationInterface {
  name = "CreateSourceRespectRanks1820100002000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cv_assistant_source_respect_ranks" (
        "id" SERIAL PRIMARY KEY,
        "provider" VARCHAR(50) NOT NULL UNIQUE,
        "rank" INT NOT NULL,
        "label" VARCHAR(255),
        "rationale" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      INSERT INTO "cv_assistant_source_respect_ranks" ("provider", "rank", "label", "rationale")
      VALUES
        ('dpsa', 100, 'DPSA Public Service Circulars', 'Official SA government source — authoritative, verified, no intermediary.'),
        ('executiveplacements', 85, 'Executive Placements', 'SA''s only dedicated executive job portal; direct recruiter postings, rich detail.'),
        ('jobmail', 75, 'JobMail', 'Established mass-market SA board (~900k monthly active users), recognised brand.'),
        ('jobplacements', 70, 'Job Placements', 'Large direct mid/junior network (2.8M candidates); sister site to Executive Placements.'),
        ('adzuna', 50, 'Adzuna', 'Job aggregator/search engine — re-lists other sites, so its copy is least preferred when a direct board also has the role.'),
        ('remotive', 40, 'Remotive', 'Niche global remote-tech board; not SA-specific.')
      ON CONFLICT ("provider") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cv_assistant_source_respect_ranks"`);
  }
}
