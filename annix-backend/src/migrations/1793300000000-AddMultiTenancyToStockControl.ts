import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMultiTenancyToStockControl1793300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_control_companies" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "branding_type" VARCHAR(20) NOT NULL DEFAULT 'annix',
        "website_url" VARCHAR(500),
        "branding_authorized" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_control_invitations" (
        "id" SERIAL PRIMARY KEY,
        "company_id" INTEGER NOT NULL,
        "invited_by_id" INTEGER NOT NULL,
        "email" VARCHAR(255) NOT NULL,
        "token" VARCHAR(255) NOT NULL,
        "role" VARCHAR(50) NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
        "expires_at" TIMESTAMPTZ NOT NULL,
        "accepted_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_sc_invitations_company" FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sc_invitations_invited_by" FOREIGN KEY ("invited_by_id") REFERENCES "stock_control_users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_sc_invitations_token" ON "stock_control_invitations" ("token")
    `);

    await queryRunner.query(
      `ALTER TABLE "stock_control_users" ADD COLUMN IF NOT EXISTS "company_id" INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" ADD COLUMN IF NOT EXISTS "company_id" INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_cards" ADD COLUMN IF NOT EXISTS "company_id" INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_notes" ADD COLUMN IF NOT EXISTS "company_id" INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "company_id" INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_allocations" ADD COLUMN IF NOT EXISTS "company_id" INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_note_items" ADD COLUMN IF NOT EXISTS "company_id" INTEGER`,
    );

    const users = await queryRunner.query(
      `SELECT "id", "name", "branding_type", "website_url", "branding_authorized" FROM "stock_control_users" WHERE "company_id" IS NULL`,
    );

    for (const user of users) {
      const [company] = await queryRunner.query(
        `INSERT INTO "stock_control_companies" ("name", "branding_type", "website_url", "branding_authorized") VALUES ($1, $2, $3, $4) RETURNING "id"`,
        [
          `${user.name} Company`,
          user.branding_type || "annix",
          user.website_url,
          user.branding_authorized || false,
        ],
      );
      await queryRunner.query(
        `UPDATE "stock_control_users" SET "company_id" = $1 WHERE "id" = $2`,
        [company.id, user.id],
      );
    }

    const firstUser = await queryRunner.query(
      `SELECT "company_id" FROM "stock_control_users" ORDER BY "id" ASC LIMIT 1`,
    );
    if (firstUser.length > 0) {
      const companyId = firstUser[0].company_id;
      await queryRunner.query(
        `UPDATE "stock_items" SET "company_id" = $1 WHERE "company_id" IS NULL`,
        [companyId],
      );
      await queryRunner.query(
        `UPDATE "job_cards" SET "company_id" = $1 WHERE "company_id" IS NULL`,
        [companyId],
      );
      await queryRunner.query(
        `UPDATE "delivery_notes" SET "company_id" = $1 WHERE "company_id" IS NULL`,
        [companyId],
      );
      await queryRunner.query(
        `UPDATE "stock_movements" SET "company_id" = $1 WHERE "company_id" IS NULL`,
        [companyId],
      );
      await queryRunner.query(
        `UPDATE "stock_allocations" SET "company_id" = $1 WHERE "company_id" IS NULL`,
        [companyId],
      );
      await queryRunner.query(
        `UPDATE "delivery_note_items" SET "company_id" = $1 WHERE "company_id" IS NULL`,
        [companyId],
      );
    }

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "stock_control_users" ALTER COLUMN "company_id" SET NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "stock_items" ALTER COLUMN "company_id" SET NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "job_cards" ALTER COLUMN "company_id" SET NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "delivery_notes" ALTER COLUMN "company_id" SET NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "stock_movements" ALTER COLUMN "company_id" SET NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "stock_allocations" ALTER COLUMN "company_id" SET NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "delivery_note_items" ALTER COLUMN "company_id" SET NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$
    `);

    await queryRunner.query(
      `ALTER TABLE "stock_items" DROP CONSTRAINT IF EXISTS "UQ_stock_items_sku"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_items_sku"`);
    await queryRunner.query(
      `ALTER TABLE "stock_items" DROP CONSTRAINT IF EXISTS "stock_items_sku_key"`,
    );

    await queryRunner.query(
      `ALTER TABLE "job_cards" DROP CONSTRAINT IF EXISTS "UQ_job_cards_job_number"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_job_cards_job_number"`);
    await queryRunner.query(
      `ALTER TABLE "job_cards" DROP CONSTRAINT IF EXISTS "job_cards_job_number_key"`,
    );

    await queryRunner.query(
      `ALTER TABLE "delivery_notes" DROP CONSTRAINT IF EXISTS "UQ_delivery_notes_delivery_number"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_delivery_notes_delivery_number"`);
    await queryRunner.query(
      `ALTER TABLE "delivery_notes" DROP CONSTRAINT IF EXISTS "delivery_notes_delivery_number_key"`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_stock_items_company_sku" ON "stock_items" ("company_id", "sku")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_job_cards_company_job_number" ON "job_cards" ("company_id", "job_number")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_delivery_notes_company_delivery_number" ON "delivery_notes" ("company_id", "delivery_number")`,
    );

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "stock_control_users" ADD CONSTRAINT "FK_sc_users_company" FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "stock_items" ADD CONSTRAINT "FK_stock_items_company" FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "job_cards" ADD CONSTRAINT "FK_job_cards_company" FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "delivery_notes" ADD CONSTRAINT "FK_delivery_notes_company" FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_stock_movements_company" FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "stock_allocations" ADD CONSTRAINT "FK_stock_allocations_company" FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "delivery_note_items" ADD CONSTRAINT "FK_delivery_note_items_company" FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "delivery_note_items" DROP CONSTRAINT IF EXISTS "FK_delivery_note_items_company"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_allocations" DROP CONSTRAINT IF EXISTS "FK_stock_allocations_company"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "FK_stock_movements_company"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_notes" DROP CONSTRAINT IF EXISTS "FK_delivery_notes_company"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_cards" DROP CONSTRAINT IF EXISTS "FK_job_cards_company"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" DROP CONSTRAINT IF EXISTS "FK_stock_items_company"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_control_users" DROP CONSTRAINT IF EXISTS "FK_sc_users_company"`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_delivery_notes_company_delivery_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_job_cards_company_job_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_items_company_sku"`);

    await queryRunner.query(`CREATE UNIQUE INDEX "stock_items_sku_key" ON "stock_items" ("sku")`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "job_cards_job_number_key" ON "job_cards" ("job_number")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "delivery_notes_delivery_number_key" ON "delivery_notes" ("delivery_number")`,
    );

    await queryRunner.query(`ALTER TABLE "delivery_note_items" DROP COLUMN "company_id"`);
    await queryRunner.query(`ALTER TABLE "stock_allocations" DROP COLUMN "company_id"`);
    await queryRunner.query(`ALTER TABLE "stock_movements" DROP COLUMN "company_id"`);
    await queryRunner.query(`ALTER TABLE "delivery_notes" DROP COLUMN "company_id"`);
    await queryRunner.query(`ALTER TABLE "job_cards" DROP COLUMN "company_id"`);
    await queryRunner.query(`ALTER TABLE "stock_items" DROP COLUMN "company_id"`);
    await queryRunner.query(`ALTER TABLE "stock_control_users" DROP COLUMN "company_id"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "stock_control_invitations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_control_companies"`);
  }
}
