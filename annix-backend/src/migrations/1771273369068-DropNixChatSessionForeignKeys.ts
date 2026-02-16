import { MigrationInterface, QueryRunner, TableForeignKey } from "typeorm";

export class DropNixChatSessionForeignKeys1771273369068 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("nix_chat_sessions");

    const userFk = table?.foreignKeys.find((fk) => fk.columnNames.includes("user_id"));
    if (userFk) {
      await queryRunner.dropForeignKey("nix_chat_sessions", userFk);
    }

    const rfqFk = table?.foreignKeys.find((fk) => fk.columnNames.includes("rfq_id"));
    if (rfqFk) {
      await queryRunner.dropForeignKey("nix_chat_sessions", rfqFk);
    }

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_nix_chat_sessions_user_id" ON "nix_chat_sessions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_nix_chat_sessions_rfq_id" ON "nix_chat_sessions" ("rfq_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("nix_chat_sessions", "IDX_nix_chat_sessions_rfq_id");
    await queryRunner.dropIndex("nix_chat_sessions", "IDX_nix_chat_sessions_user_id");

    await queryRunner.createForeignKey(
      "nix_chat_sessions",
      new TableForeignKey({
        columnNames: ["user_id"],
        referencedTableName: "user",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "nix_chat_sessions",
      new TableForeignKey({
        columnNames: ["rfq_id"],
        referencedTableName: "rfqs",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );
  }
}
