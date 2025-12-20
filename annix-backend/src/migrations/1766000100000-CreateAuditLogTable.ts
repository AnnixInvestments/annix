import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAuditLogTable1766000100000 implements MigrationInterface {
    name = 'CreateAuditLogTable1766000100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create audit_action enum
        await queryRunner.query(`
            CREATE TYPE "audit_action_enum" AS ENUM (
                'create',
                'update',
                'delete',
                'upload',
                'download',
                'submit',
                'approve',
                'reject',
                'request_changes',
                'assign_reviewer',
                'add_comment',
                'resolve_comment'
            )
        `);

        // Create audit_logs table
        await queryRunner.query(`
            CREATE TABLE "audit_logs" (
                "id" SERIAL NOT NULL,
                "entity_type" character varying(100) NOT NULL,
                "entity_id" integer NOT NULL,
                "action" "audit_action_enum" NOT NULL,
                "old_values" jsonb,
                "new_values" jsonb,
                "performed_by_user_id" integer,
                "ip_address" character varying(45),
                "user_agent" text,
                "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraint to user
        await queryRunner.query(`
            ALTER TABLE "audit_logs"
            ADD CONSTRAINT "FK_audit_logs_performed_by"
            FOREIGN KEY ("performed_by_user_id")
            REFERENCES "user"("id")
            ON DELETE SET NULL
        `);

        // Create indexes for common queries
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entity_type", "entity_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_timestamp" ON "audit_logs" ("timestamp")`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_performed_by" ON "audit_logs" ("performed_by_user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_audit_logs_action"`);
        await queryRunner.query(`DROP INDEX "IDX_audit_logs_performed_by"`);
        await queryRunner.query(`DROP INDEX "IDX_audit_logs_timestamp"`);
        await queryRunner.query(`DROP INDEX "IDX_audit_logs_entity"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_performed_by"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TYPE "audit_action_enum"`);
    }
}
