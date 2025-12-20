import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBoqTables1766000300000 implements MigrationInterface {
    name = 'CreateBoqTables1766000300000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create boq_status enum
        await queryRunner.query(`
            CREATE TYPE "boq_status_enum" AS ENUM (
                'draft',
                'submitted',
                'under_review',
                'changes_requested',
                'approved',
                'rejected'
            )
        `);

        // Create boq_item_type enum
        await queryRunner.query(`
            CREATE TYPE "boq_item_type_enum" AS ENUM (
                'straight_pipe',
                'bend',
                'fitting',
                'flange',
                'valve',
                'support',
                'coating',
                'lining',
                'custom'
            )
        `);

        // Create boqs table
        await queryRunner.query(`
            CREATE TABLE "boqs" (
                "id" SERIAL NOT NULL,
                "boq_number" character varying(50) NOT NULL,
                "title" character varying(255) NOT NULL,
                "description" text,
                "status" "boq_status_enum" NOT NULL DEFAULT 'draft',
                "drawing_id" integer,
                "rfq_id" integer,
                "created_by_user_id" integer NOT NULL,
                "total_quantity" numeric(12,3),
                "total_weight_kg" numeric(12,2),
                "total_estimated_cost" numeric(15,2),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_boq_number" UNIQUE ("boq_number"),
                CONSTRAINT "PK_boqs" PRIMARY KEY ("id")
            )
        `);

        // Create boq_line_items table
        await queryRunner.query(`
            CREATE TABLE "boq_line_items" (
                "id" SERIAL NOT NULL,
                "boq_id" integer NOT NULL,
                "line_number" integer NOT NULL,
                "item_code" character varying(100),
                "description" character varying(500) NOT NULL,
                "item_type" "boq_item_type_enum" NOT NULL,
                "unit_of_measure" character varying(50) NOT NULL,
                "quantity" numeric(12,3) NOT NULL,
                "unit_weight_kg" numeric(10,3),
                "total_weight_kg" numeric(12,2),
                "unit_price" numeric(15,2),
                "total_price" numeric(15,2),
                "notes" text,
                "drawing_reference" character varying(100),
                "specifications" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_boq_line_items" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraints for boqs
        await queryRunner.query(`
            ALTER TABLE "boqs"
            ADD CONSTRAINT "FK_boqs_drawing"
            FOREIGN KEY ("drawing_id")
            REFERENCES "drawings"("id")
            ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "boqs"
            ADD CONSTRAINT "FK_boqs_rfq"
            FOREIGN KEY ("rfq_id")
            REFERENCES "rfqs"("id")
            ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "boqs"
            ADD CONSTRAINT "FK_boqs_created_by"
            FOREIGN KEY ("created_by_user_id")
            REFERENCES "user"("id")
            ON DELETE RESTRICT
        `);

        // Add foreign key constraint for boq_line_items
        await queryRunner.query(`
            ALTER TABLE "boq_line_items"
            ADD CONSTRAINT "FK_boq_line_items_boq"
            FOREIGN KEY ("boq_id")
            REFERENCES "boqs"("id")
            ON DELETE CASCADE
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_boqs_drawing_id" ON "boqs" ("drawing_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_boqs_rfq_id" ON "boqs" ("rfq_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_boqs_status" ON "boqs" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_boqs_created_by" ON "boqs" ("created_by_user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_boq_line_items_boq_id" ON "boq_line_items" ("boq_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_boq_line_items_item_type" ON "boq_line_items" ("item_type")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_boq_line_items_item_type"`);
        await queryRunner.query(`DROP INDEX "IDX_boq_line_items_boq_id"`);
        await queryRunner.query(`DROP INDEX "IDX_boqs_created_by"`);
        await queryRunner.query(`DROP INDEX "IDX_boqs_status"`);
        await queryRunner.query(`DROP INDEX "IDX_boqs_rfq_id"`);
        await queryRunner.query(`DROP INDEX "IDX_boqs_drawing_id"`);

        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "boq_line_items" DROP CONSTRAINT "FK_boq_line_items_boq"`);
        await queryRunner.query(`ALTER TABLE "boqs" DROP CONSTRAINT "FK_boqs_created_by"`);
        await queryRunner.query(`ALTER TABLE "boqs" DROP CONSTRAINT "FK_boqs_rfq"`);
        await queryRunner.query(`ALTER TABLE "boqs" DROP CONSTRAINT "FK_boqs_drawing"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "boq_line_items"`);
        await queryRunner.query(`DROP TABLE "boqs"`);

        // Drop enums
        await queryRunner.query(`DROP TYPE "boq_item_type_enum"`);
        await queryRunner.query(`DROP TYPE "boq_status_enum"`);
    }
}
