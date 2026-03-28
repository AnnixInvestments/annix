import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDispatchCdnAndLoadPhotos1809000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dispatch_cdns" (
        "id" SERIAL PRIMARY KEY,
        "job_card_id" integer NOT NULL,
        "company_id" integer NOT NULL,
        "file_path" varchar(500) NOT NULL,
        "original_filename" varchar(255) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "cdn_number" varchar(255),
        "line_matches" jsonb,
        "ai_raw_response" text,
        "uploaded_by_id" integer,
        "uploaded_by_name" varchar(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_dispatch_cdns_job_card" FOREIGN KEY ("job_card_id") REFERENCES "job_cards"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dispatch_cdns_company" FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dispatch_cdns_uploaded_by" FOREIGN KEY ("uploaded_by_id") REFERENCES "stock_control_users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dispatch_load_photos" (
        "id" SERIAL PRIMARY KEY,
        "job_card_id" integer NOT NULL,
        "company_id" integer NOT NULL,
        "file_path" varchar(500) NOT NULL,
        "original_filename" varchar(255) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "caption" text,
        "uploaded_by_id" integer,
        "uploaded_by_name" varchar(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_dispatch_load_photos_job_card" FOREIGN KEY ("job_card_id") REFERENCES "job_cards"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dispatch_load_photos_company" FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dispatch_load_photos_uploaded_by" FOREIGN KEY ("uploaded_by_id") REFERENCES "stock_control_users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dispatch_cdns_job_card" ON "dispatch_cdns" ("job_card_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dispatch_cdns_company" ON "dispatch_cdns" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dispatch_load_photos_job_card" ON "dispatch_load_photos" ("job_card_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dispatch_load_photos_company" ON "dispatch_load_photos" ("company_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "dispatch_load_photos"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dispatch_cdns"`);
  }
}
