import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddChatMessagesAndMessagingEnabled1805900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_control_chat_messages" (
        "id" SERIAL PRIMARY KEY,
        "company_id" integer NOT NULL,
        "sender_id" integer NOT NULL,
        "sender_name" varchar(255) NOT NULL,
        "text" text NOT NULL,
        "image_url" varchar(500),
        "edited_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_chat_messages_company" FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_chat_messages_sender" FOREIGN KEY ("sender_id") REFERENCES "stock_control_users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_chat_messages_company_created"
      ON "stock_control_chat_messages" ("company_id", "created_at")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "stock_control_companies"
        ADD COLUMN "messaging_enabled" boolean NOT NULL DEFAULT false;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_control_chat_messages"`);
    await queryRunner.query(`
      ALTER TABLE "stock_control_companies" DROP COLUMN IF EXISTS "messaging_enabled"
    `);
  }
}
