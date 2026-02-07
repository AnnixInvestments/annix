import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMessagingTables1778002000000 implements MigrationInterface {
  name = "CreateMessagingTables1778002000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "conversation_type_enum" AS ENUM (
        'DIRECT',
        'GROUP',
        'SUPPORT'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "related_entity_type_enum" AS ENUM (
        'RFQ',
        'BOQ',
        'GENERAL'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "participant_role_enum" AS ENUM (
        'OWNER',
        'PARTICIPANT',
        'ADMIN'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "message_type_enum" AS ENUM (
        'TEXT',
        'SYSTEM'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "broadcast_target_enum" AS ENUM (
        'ALL',
        'CUSTOMERS',
        'SUPPLIERS',
        'SPECIFIC'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "broadcast_priority_enum" AS ENUM (
        'LOW',
        'NORMAL',
        'HIGH',
        'URGENT'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "response_rating_enum" AS ENUM (
        'EXCELLENT',
        'GOOD',
        'ACCEPTABLE',
        'POOR',
        'CRITICAL'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "conversation" (
        "id" SERIAL NOT NULL,
        "subject" character varying(255) NOT NULL,
        "conversation_type" "conversation_type_enum" NOT NULL DEFAULT 'DIRECT',
        "related_entity_type" "related_entity_type_enum" NOT NULL DEFAULT 'GENERAL',
        "related_entity_id" integer,
        "created_by_id" integer NOT NULL,
        "last_message_at" TIMESTAMP,
        "is_archived" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversation" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "conversation_participant" (
        "id" SERIAL NOT NULL,
        "conversation_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "role" "participant_role_enum" NOT NULL DEFAULT 'PARTICIPANT',
        "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
        "left_at" TIMESTAMP,
        "is_active" boolean NOT NULL DEFAULT true,
        "last_read_at" TIMESTAMP,
        CONSTRAINT "PK_conversation_participant" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "message" (
        "id" SERIAL NOT NULL,
        "conversation_id" integer NOT NULL,
        "sender_id" integer NOT NULL,
        "content" text NOT NULL,
        "message_type" "message_type_enum" NOT NULL DEFAULT 'TEXT',
        "parent_message_id" integer,
        "sent_at" TIMESTAMP NOT NULL DEFAULT now(),
        "edited_at" TIMESTAMP,
        "is_deleted" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_message" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "message_attachment" (
        "id" SERIAL NOT NULL,
        "message_id" integer NOT NULL,
        "file_name" character varying(255) NOT NULL,
        "file_path" character varying(500) NOT NULL,
        "file_size" integer NOT NULL,
        "mime_type" character varying(100) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_message_attachment" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "message_read_receipt" (
        "id" SERIAL NOT NULL,
        "message_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "read_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_message_read_receipt" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "conversation_response_metric" (
        "id" SERIAL NOT NULL,
        "conversation_id" integer NOT NULL,
        "message_id" integer NOT NULL,
        "response_message_id" integer NOT NULL,
        "responder_id" integer NOT NULL,
        "response_time_minutes" integer NOT NULL,
        "within_sla" boolean NOT NULL DEFAULT false,
        "rating" "response_rating_enum" NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversation_response_metric" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "broadcast" (
        "id" SERIAL NOT NULL,
        "title" character varying(255) NOT NULL,
        "content" text NOT NULL,
        "target_audience" "broadcast_target_enum" NOT NULL DEFAULT 'ALL',
        "sent_by_id" integer NOT NULL,
        "priority" "broadcast_priority_enum" NOT NULL DEFAULT 'NORMAL',
        "expires_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_broadcast" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "broadcast_recipient" (
        "id" SERIAL NOT NULL,
        "broadcast_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "read_at" TIMESTAMP,
        "email_sent_at" TIMESTAMP,
        CONSTRAINT "PK_broadcast_recipient" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sla_config" (
        "id" SERIAL NOT NULL,
        "response_time_hours" integer NOT NULL DEFAULT 24,
        "excellent_threshold_hours" integer NOT NULL DEFAULT 4,
        "good_threshold_hours" integer NOT NULL DEFAULT 12,
        "acceptable_threshold_hours" integer NOT NULL DEFAULT 24,
        "poor_threshold_hours" integer NOT NULL DEFAULT 48,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sla_config" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "conversation"
      ADD CONSTRAINT "FK_conversation_created_by"
      FOREIGN KEY ("created_by_id")
      REFERENCES "user"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "conversation_participant"
      ADD CONSTRAINT "FK_participant_conversation"
      FOREIGN KEY ("conversation_id")
      REFERENCES "conversation"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "conversation_participant"
      ADD CONSTRAINT "FK_participant_user"
      FOREIGN KEY ("user_id")
      REFERENCES "user"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "message"
      ADD CONSTRAINT "FK_message_conversation"
      FOREIGN KEY ("conversation_id")
      REFERENCES "conversation"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "message"
      ADD CONSTRAINT "FK_message_sender"
      FOREIGN KEY ("sender_id")
      REFERENCES "user"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "message"
      ADD CONSTRAINT "FK_message_parent"
      FOREIGN KEY ("parent_message_id")
      REFERENCES "message"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "message_attachment"
      ADD CONSTRAINT "FK_attachment_message"
      FOREIGN KEY ("message_id")
      REFERENCES "message"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "message_read_receipt"
      ADD CONSTRAINT "FK_receipt_message"
      FOREIGN KEY ("message_id")
      REFERENCES "message"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "message_read_receipt"
      ADD CONSTRAINT "FK_receipt_user"
      FOREIGN KEY ("user_id")
      REFERENCES "user"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "conversation_response_metric"
      ADD CONSTRAINT "FK_metric_conversation"
      FOREIGN KEY ("conversation_id")
      REFERENCES "conversation"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "conversation_response_metric"
      ADD CONSTRAINT "FK_metric_message"
      FOREIGN KEY ("message_id")
      REFERENCES "message"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "conversation_response_metric"
      ADD CONSTRAINT "FK_metric_response_message"
      FOREIGN KEY ("response_message_id")
      REFERENCES "message"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "conversation_response_metric"
      ADD CONSTRAINT "FK_metric_responder"
      FOREIGN KEY ("responder_id")
      REFERENCES "user"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "broadcast"
      ADD CONSTRAINT "FK_broadcast_sent_by"
      FOREIGN KEY ("sent_by_id")
      REFERENCES "user"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "broadcast_recipient"
      ADD CONSTRAINT "FK_recipient_broadcast"
      FOREIGN KEY ("broadcast_id")
      REFERENCES "broadcast"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "broadcast_recipient"
      ADD CONSTRAINT "FK_recipient_user"
      FOREIGN KEY ("user_id")
      REFERENCES "user"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_conversation_created_by" ON "conversation" ("created_by_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_conversation_related_entity" ON "conversation" ("related_entity_type", "related_entity_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_conversation_last_message" ON "conversation" ("last_message_at" DESC)`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_participant_conversation" ON "conversation_participant" ("conversation_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_participant_user" ON "conversation_participant" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_participant_conversation_user" ON "conversation_participant" ("conversation_id", "user_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_message_conversation" ON "message" ("conversation_id")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_message_sender" ON "message" ("sender_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_message_sent_at" ON "message" ("sent_at" DESC)`);

    await queryRunner.query(
      `CREATE INDEX "IDX_attachment_message" ON "message_attachment" ("message_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_receipt_message" ON "message_read_receipt" ("message_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_receipt_message_user" ON "message_read_receipt" ("message_id", "user_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_metric_conversation" ON "conversation_response_metric" ("conversation_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_metric_responder" ON "conversation_response_metric" ("responder_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_broadcast_target" ON "broadcast" ("target_audience")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_broadcast_expires" ON "broadcast" ("expires_at")`);

    await queryRunner.query(
      `CREATE INDEX "IDX_broadcast_recipient_broadcast" ON "broadcast_recipient" ("broadcast_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_broadcast_recipient_user" ON "broadcast_recipient" ("user_id")`,
    );

    await queryRunner.query(`
      INSERT INTO "sla_config" (
        "response_time_hours",
        "excellent_threshold_hours",
        "good_threshold_hours",
        "acceptable_threshold_hours",
        "poor_threshold_hours"
      ) VALUES (24, 4, 12, 24, 48)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_broadcast_recipient_user"`);
    await queryRunner.query(`DROP INDEX "IDX_broadcast_recipient_broadcast"`);
    await queryRunner.query(`DROP INDEX "IDX_broadcast_expires"`);
    await queryRunner.query(`DROP INDEX "IDX_broadcast_target"`);
    await queryRunner.query(`DROP INDEX "IDX_metric_responder"`);
    await queryRunner.query(`DROP INDEX "IDX_metric_conversation"`);
    await queryRunner.query(`DROP INDEX "UQ_receipt_message_user"`);
    await queryRunner.query(`DROP INDEX "IDX_receipt_message"`);
    await queryRunner.query(`DROP INDEX "IDX_attachment_message"`);
    await queryRunner.query(`DROP INDEX "IDX_message_sent_at"`);
    await queryRunner.query(`DROP INDEX "IDX_message_sender"`);
    await queryRunner.query(`DROP INDEX "IDX_message_conversation"`);
    await queryRunner.query(`DROP INDEX "UQ_participant_conversation_user"`);
    await queryRunner.query(`DROP INDEX "IDX_participant_user"`);
    await queryRunner.query(`DROP INDEX "IDX_participant_conversation"`);
    await queryRunner.query(`DROP INDEX "IDX_conversation_last_message"`);
    await queryRunner.query(`DROP INDEX "IDX_conversation_related_entity"`);
    await queryRunner.query(`DROP INDEX "IDX_conversation_created_by"`);

    await queryRunner.query(
      `ALTER TABLE "broadcast_recipient" DROP CONSTRAINT "FK_recipient_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "broadcast_recipient" DROP CONSTRAINT "FK_recipient_broadcast"`,
    );
    await queryRunner.query(`ALTER TABLE "broadcast" DROP CONSTRAINT "FK_broadcast_sent_by"`);
    await queryRunner.query(
      `ALTER TABLE "conversation_response_metric" DROP CONSTRAINT "FK_metric_responder"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_response_metric" DROP CONSTRAINT "FK_metric_response_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_response_metric" DROP CONSTRAINT "FK_metric_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_response_metric" DROP CONSTRAINT "FK_metric_conversation"`,
    );
    await queryRunner.query(`ALTER TABLE "message_read_receipt" DROP CONSTRAINT "FK_receipt_user"`);
    await queryRunner.query(
      `ALTER TABLE "message_read_receipt" DROP CONSTRAINT "FK_receipt_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachment" DROP CONSTRAINT "FK_attachment_message"`,
    );
    await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_message_parent"`);
    await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_message_sender"`);
    await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_message_conversation"`);
    await queryRunner.query(
      `ALTER TABLE "conversation_participant" DROP CONSTRAINT "FK_participant_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participant" DROP CONSTRAINT "FK_participant_conversation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP CONSTRAINT "FK_conversation_created_by"`,
    );

    await queryRunner.query(`DROP TABLE "sla_config"`);
    await queryRunner.query(`DROP TABLE "broadcast_recipient"`);
    await queryRunner.query(`DROP TABLE "broadcast"`);
    await queryRunner.query(`DROP TABLE "conversation_response_metric"`);
    await queryRunner.query(`DROP TABLE "message_read_receipt"`);
    await queryRunner.query(`DROP TABLE "message_attachment"`);
    await queryRunner.query(`DROP TABLE "message"`);
    await queryRunner.query(`DROP TABLE "conversation_participant"`);
    await queryRunner.query(`DROP TABLE "conversation"`);

    await queryRunner.query(`DROP TYPE "response_rating_enum"`);
    await queryRunner.query(`DROP TYPE "broadcast_priority_enum"`);
    await queryRunner.query(`DROP TYPE "broadcast_target_enum"`);
    await queryRunner.query(`DROP TYPE "message_type_enum"`);
    await queryRunner.query(`DROP TYPE "participant_role_enum"`);
    await queryRunner.query(`DROP TYPE "related_entity_type_enum"`);
    await queryRunner.query(`DROP TYPE "conversation_type_enum"`);
  }
}
