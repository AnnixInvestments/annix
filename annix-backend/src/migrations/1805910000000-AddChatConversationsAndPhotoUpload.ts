import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddChatConversationsAndPhotoUpload1805910000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_control_chat_conversations" (
        "id" SERIAL PRIMARY KEY,
        "company_id" integer NOT NULL,
        "type" varchar(100) NOT NULL DEFAULT 'direct',
        "name" varchar(255),
        "created_by_id" integer NOT NULL,
        "last_message_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_chat_conv_company" FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_chat_conv_created_by" FOREIGN KEY ("created_by_id") REFERENCES "stock_control_users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_chat_conversations_company"
      ON "stock_control_chat_conversations" ("company_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_control_chat_conversation_participants" (
        "id" SERIAL PRIMARY KEY,
        "conversation_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "last_read_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_chat_participant_conv" FOREIGN KEY ("conversation_id") REFERENCES "stock_control_chat_conversations"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_chat_participant_user" FOREIGN KEY ("user_id") REFERENCES "stock_control_users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_chat_participant_conv_user"
      ON "stock_control_chat_conversation_participants" ("conversation_id", "user_id")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "stock_control_chat_messages"
        ADD COLUMN "conversation_id" integer;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "stock_control_chat_messages"
        ADD CONSTRAINT "fk_chat_msg_conversation" FOREIGN KEY ("conversation_id")
        REFERENCES "stock_control_chat_conversations"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_chat_messages_conversation_created"
      ON "stock_control_chat_messages" ("conversation_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chat_messages_conversation_created"`);
    await queryRunner.query(
      `ALTER TABLE "stock_control_chat_messages" DROP CONSTRAINT IF EXISTS "fk_chat_msg_conversation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_control_chat_messages" DROP COLUMN IF EXISTS "conversation_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_control_chat_conversation_participants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_control_chat_conversations"`);
  }
}
