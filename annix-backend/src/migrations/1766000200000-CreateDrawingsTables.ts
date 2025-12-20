import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDrawingsTables1766000200000 implements MigrationInterface {
    name = 'CreateDrawingsTables1766000200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create drawing_file_type enum
        await queryRunner.query(`
            CREATE TYPE "drawing_file_type_enum" AS ENUM (
                'pdf',
                'dwg',
                'dxf',
                'png',
                'jpg',
                'jpeg'
            )
        `);

        // Create drawing_status enum
        await queryRunner.query(`
            CREATE TYPE "drawing_status_enum" AS ENUM (
                'draft',
                'submitted',
                'under_review',
                'changes_requested',
                'approved',
                'rejected'
            )
        `);

        // Create drawings table
        await queryRunner.query(`
            CREATE TABLE "drawings" (
                "id" SERIAL NOT NULL,
                "drawing_number" character varying(50) NOT NULL,
                "title" character varying(255) NOT NULL,
                "description" text,
                "file_type" "drawing_file_type_enum" NOT NULL,
                "file_path" character varying(500) NOT NULL,
                "original_filename" character varying(255) NOT NULL,
                "file_size_bytes" bigint NOT NULL,
                "mime_type" character varying(100) NOT NULL,
                "current_version" integer NOT NULL DEFAULT 1,
                "status" "drawing_status_enum" NOT NULL DEFAULT 'draft',
                "rfq_id" integer,
                "uploaded_by_user_id" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_drawing_number" UNIQUE ("drawing_number"),
                CONSTRAINT "PK_drawings" PRIMARY KEY ("id")
            )
        `);

        // Create drawing_versions table
        await queryRunner.query(`
            CREATE TABLE "drawing_versions" (
                "id" SERIAL NOT NULL,
                "drawing_id" integer NOT NULL,
                "version_number" integer NOT NULL,
                "file_path" character varying(500) NOT NULL,
                "original_filename" character varying(255) NOT NULL,
                "file_size_bytes" bigint NOT NULL,
                "change_notes" text,
                "uploaded_by_user_id" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_drawing_versions" PRIMARY KEY ("id")
            )
        `);

        // Create comment_type enum
        await queryRunner.query(`
            CREATE TYPE "comment_type_enum" AS ENUM (
                'general',
                'annotation',
                'review_note',
                'change_request',
                'approval_note'
            )
        `);

        // Create drawing_comments table
        await queryRunner.query(`
            CREATE TABLE "drawing_comments" (
                "id" SERIAL NOT NULL,
                "drawing_id" integer NOT NULL,
                "user_id" integer NOT NULL,
                "comment_text" text NOT NULL,
                "comment_type" "comment_type_enum" NOT NULL DEFAULT 'general',
                "position_x" numeric(10,2),
                "position_y" numeric(10,2),
                "page_number" integer,
                "is_resolved" boolean NOT NULL DEFAULT false,
                "parent_comment_id" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_drawing_comments" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraints for drawings
        await queryRunner.query(`
            ALTER TABLE "drawings"
            ADD CONSTRAINT "FK_drawings_rfq"
            FOREIGN KEY ("rfq_id")
            REFERENCES "rfqs"("id")
            ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "drawings"
            ADD CONSTRAINT "FK_drawings_uploaded_by"
            FOREIGN KEY ("uploaded_by_user_id")
            REFERENCES "user"("id")
            ON DELETE RESTRICT
        `);

        // Add foreign key constraints for drawing_versions
        await queryRunner.query(`
            ALTER TABLE "drawing_versions"
            ADD CONSTRAINT "FK_drawing_versions_drawing"
            FOREIGN KEY ("drawing_id")
            REFERENCES "drawings"("id")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "drawing_versions"
            ADD CONSTRAINT "FK_drawing_versions_uploaded_by"
            FOREIGN KEY ("uploaded_by_user_id")
            REFERENCES "user"("id")
            ON DELETE RESTRICT
        `);

        // Add foreign key constraints for drawing_comments
        await queryRunner.query(`
            ALTER TABLE "drawing_comments"
            ADD CONSTRAINT "FK_drawing_comments_drawing"
            FOREIGN KEY ("drawing_id")
            REFERENCES "drawings"("id")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "drawing_comments"
            ADD CONSTRAINT "FK_drawing_comments_user"
            FOREIGN KEY ("user_id")
            REFERENCES "user"("id")
            ON DELETE RESTRICT
        `);

        await queryRunner.query(`
            ALTER TABLE "drawing_comments"
            ADD CONSTRAINT "FK_drawing_comments_parent"
            FOREIGN KEY ("parent_comment_id")
            REFERENCES "drawing_comments"("id")
            ON DELETE CASCADE
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_drawings_rfq_id" ON "drawings" ("rfq_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_drawings_status" ON "drawings" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_drawings_uploaded_by" ON "drawings" ("uploaded_by_user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_drawing_versions_drawing_id" ON "drawing_versions" ("drawing_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_drawing_comments_drawing_id" ON "drawing_comments" ("drawing_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_drawing_comments_user_id" ON "drawing_comments" ("user_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_drawing_comments_user_id"`);
        await queryRunner.query(`DROP INDEX "IDX_drawing_comments_drawing_id"`);
        await queryRunner.query(`DROP INDEX "IDX_drawing_versions_drawing_id"`);
        await queryRunner.query(`DROP INDEX "IDX_drawings_uploaded_by"`);
        await queryRunner.query(`DROP INDEX "IDX_drawings_status"`);
        await queryRunner.query(`DROP INDEX "IDX_drawings_rfq_id"`);

        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "drawing_comments" DROP CONSTRAINT "FK_drawing_comments_parent"`);
        await queryRunner.query(`ALTER TABLE "drawing_comments" DROP CONSTRAINT "FK_drawing_comments_user"`);
        await queryRunner.query(`ALTER TABLE "drawing_comments" DROP CONSTRAINT "FK_drawing_comments_drawing"`);
        await queryRunner.query(`ALTER TABLE "drawing_versions" DROP CONSTRAINT "FK_drawing_versions_uploaded_by"`);
        await queryRunner.query(`ALTER TABLE "drawing_versions" DROP CONSTRAINT "FK_drawing_versions_drawing"`);
        await queryRunner.query(`ALTER TABLE "drawings" DROP CONSTRAINT "FK_drawings_uploaded_by"`);
        await queryRunner.query(`ALTER TABLE "drawings" DROP CONSTRAINT "FK_drawings_rfq"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "drawing_comments"`);
        await queryRunner.query(`DROP TABLE "drawing_versions"`);
        await queryRunner.query(`DROP TABLE "drawings"`);

        // Drop enums
        await queryRunner.query(`DROP TYPE "comment_type_enum"`);
        await queryRunner.query(`DROP TYPE "drawing_status_enum"`);
        await queryRunner.query(`DROP TYPE "drawing_file_type_enum"`);
    }
}
