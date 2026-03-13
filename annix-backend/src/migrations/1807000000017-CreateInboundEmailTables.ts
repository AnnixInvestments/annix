import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInboundEmailTables1807000000017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inbound_email_configs" (
        "id" SERIAL PRIMARY KEY,
        "app" varchar(50) NOT NULL,
        "company_id" integer,
        "email_host" varchar(255) NOT NULL,
        "email_port" integer NOT NULL DEFAULT 993,
        "email_user" varchar(255) NOT NULL,
        "email_pass_encrypted" bytea NOT NULL,
        "tls_enabled" boolean NOT NULL DEFAULT true,
        "tls_server_name" varchar(255),
        "enabled" boolean NOT NULL DEFAULT false,
        "last_poll_at" timestamp,
        "last_error" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_inbound_email_configs_app_company" UNIQUE ("app", "company_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inbound_emails" (
        "id" SERIAL PRIMARY KEY,
        "config_id" integer NOT NULL,
        "app" varchar(50) NOT NULL,
        "company_id" integer,
        "message_id" varchar(500) NOT NULL,
        "from_email" varchar(255) NOT NULL,
        "from_name" varchar(255),
        "subject" text,
        "received_at" timestamp,
        "attachment_count" integer NOT NULL DEFAULT 0,
        "processing_status" varchar(30) NOT NULL DEFAULT 'pending',
        "error_message" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_inbound_emails_message_id" UNIQUE ("message_id"),
        CONSTRAINT "FK_inbound_emails_config" FOREIGN KEY ("config_id")
          REFERENCES "inbound_email_configs"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inbound_emails_app_company"
        ON "inbound_emails" ("app", "company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inbound_emails_status"
        ON "inbound_emails" ("processing_status")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inbound_email_attachments" (
        "id" SERIAL PRIMARY KEY,
        "inbound_email_id" integer NOT NULL,
        "original_filename" varchar(500) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "file_size_bytes" bigint NOT NULL DEFAULT 0,
        "s3_path" varchar(1000),
        "document_type" varchar(50) NOT NULL DEFAULT 'unknown',
        "classification_confidence" numeric(3,2),
        "classification_source" varchar(20),
        "linked_entity_type" varchar(50),
        "linked_entity_id" integer,
        "extraction_status" varchar(30) NOT NULL DEFAULT 'pending',
        "extracted_data" jsonb,
        "error_message" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_inbound_email_attachments_email" FOREIGN KEY ("inbound_email_id")
          REFERENCES "inbound_emails"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inbound_email_attachments_email"
        ON "inbound_email_attachments" ("inbound_email_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inbound_email_attachments_type"
        ON "inbound_email_attachments" ("document_type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "inbound_email_attachments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inbound_emails"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inbound_email_configs"`);
  }
}
