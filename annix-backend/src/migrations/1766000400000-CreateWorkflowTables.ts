import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkflowTables1766000400000 implements MigrationInterface {
    name = 'CreateWorkflowTables1766000400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create workflow_type enum
        await queryRunner.query(`
            CREATE TYPE "workflow_type_enum" AS ENUM (
                'drawing_review',
                'boq_review',
                'rfq_review'
            )
        `);

        // Create review_entity_type enum
        await queryRunner.query(`
            CREATE TYPE "review_entity_type_enum" AS ENUM (
                'drawing',
                'boq',
                'rfq'
            )
        `);

        // Create review_status enum
        await queryRunner.query(`
            CREATE TYPE "review_status_enum" AS ENUM (
                'draft',
                'submitted',
                'under_review',
                'changes_requested',
                'approved',
                'rejected'
            )
        `);

        // Create review_workflows table
        await queryRunner.query(`
            CREATE TABLE "review_workflows" (
                "id" SERIAL NOT NULL,
                "workflow_type" "workflow_type_enum" NOT NULL,
                "entity_type" "review_entity_type_enum" NOT NULL,
                "entity_id" integer NOT NULL,
                "current_status" "review_status_enum" NOT NULL DEFAULT 'draft',
                "previous_status" "review_status_enum",
                "submitted_by_user_id" integer NOT NULL,
                "assigned_reviewer_user_id" integer,
                "decided_by_user_id" integer,
                "decision_notes" text,
                "submitted_at" TIMESTAMP,
                "decided_at" TIMESTAMP,
                "due_date" date,
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_review_workflows" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "review_workflows"
            ADD CONSTRAINT "FK_review_workflows_submitted_by"
            FOREIGN KEY ("submitted_by_user_id")
            REFERENCES "user"("id")
            ON DELETE RESTRICT
        `);

        await queryRunner.query(`
            ALTER TABLE "review_workflows"
            ADD CONSTRAINT "FK_review_workflows_assigned_reviewer"
            FOREIGN KEY ("assigned_reviewer_user_id")
            REFERENCES "user"("id")
            ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "review_workflows"
            ADD CONSTRAINT "FK_review_workflows_decided_by"
            FOREIGN KEY ("decided_by_user_id")
            REFERENCES "user"("id")
            ON DELETE SET NULL
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_review_workflows_entity" ON "review_workflows" ("entity_type", "entity_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_review_workflows_status" ON "review_workflows" ("current_status")`);
        await queryRunner.query(`CREATE INDEX "IDX_review_workflows_submitted_by" ON "review_workflows" ("submitted_by_user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_review_workflows_assigned_reviewer" ON "review_workflows" ("assigned_reviewer_user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_review_workflows_is_active" ON "review_workflows" ("is_active")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_review_workflows_is_active"`);
        await queryRunner.query(`DROP INDEX "IDX_review_workflows_assigned_reviewer"`);
        await queryRunner.query(`DROP INDEX "IDX_review_workflows_submitted_by"`);
        await queryRunner.query(`DROP INDEX "IDX_review_workflows_status"`);
        await queryRunner.query(`DROP INDEX "IDX_review_workflows_entity"`);

        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "review_workflows" DROP CONSTRAINT "FK_review_workflows_decided_by"`);
        await queryRunner.query(`ALTER TABLE "review_workflows" DROP CONSTRAINT "FK_review_workflows_assigned_reviewer"`);
        await queryRunner.query(`ALTER TABLE "review_workflows" DROP CONSTRAINT "FK_review_workflows_submitted_by"`);

        // Drop table
        await queryRunner.query(`DROP TABLE "review_workflows"`);

        // Drop enums
        await queryRunner.query(`DROP TYPE "review_status_enum"`);
        await queryRunner.query(`DROP TYPE "review_entity_type_enum"`);
        await queryRunner.query(`DROP TYPE "workflow_type_enum"`);
    }
}
