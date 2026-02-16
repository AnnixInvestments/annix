import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateNixChatTables1771000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "nix_chat_sessions",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "user_id",
            type: "int",
          },
          {
            name: "rfq_id",
            type: "int",
            isNullable: true,
          },
          {
            name: "conversation_history",
            type: "jsonb",
            default: "'[]'",
          },
          {
            name: "user_preferences",
            type: "jsonb",
            default: "'{}'",
          },
          {
            name: "session_context",
            type: "jsonb",
            default: "'{}'",
          },
          {
            name: "is_active",
            type: "boolean",
            default: true,
          },
          {
            name: "last_interaction_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "nix_chat_sessions",
      new TableIndex({
        name: "IDX_nix_chat_sessions_user_id",
        columnNames: ["user_id"],
      }),
    );

    await queryRunner.createIndex(
      "nix_chat_sessions",
      new TableIndex({
        name: "IDX_nix_chat_sessions_rfq_id",
        columnNames: ["rfq_id"],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: "nix_chat_messages",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "session_id",
            type: "int",
          },
          {
            name: "role",
            type: "enum",
            enum: ["user", "assistant", "system"],
          },
          {
            name: "content",
            type: "text",
          },
          {
            name: "metadata",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "parent_message_id",
            type: "int",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      "nix_chat_messages",
      new TableForeignKey({
        columnNames: ["session_id"],
        referencedTableName: "nix_chat_sessions",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createIndex(
      "nix_chat_messages",
      new TableIndex({
        name: "IDX_nix_chat_messages_session_created",
        columnNames: ["session_id", "created_at"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("nix_chat_messages");
    await queryRunner.dropTable("nix_chat_sessions");
  }
}
