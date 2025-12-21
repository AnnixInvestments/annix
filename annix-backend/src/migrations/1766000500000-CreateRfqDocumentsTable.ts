import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRfqDocumentsTable1766000500000 implements MigrationInterface {
    name = 'CreateRfqDocumentsTable1766000500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create rfq_documents table
        await queryRunner.query(`
            CREATE TABLE "rfq_documents" (
                "id" SERIAL NOT NULL,
                "rfq_id" integer NOT NULL,
                "filename" character varying(255) NOT NULL,
                "file_path" character varying(500) NOT NULL,
                "mime_type" character varying(100) NOT NULL,
                "file_size_bytes" bigint NOT NULL,
                "uploaded_by_user_id" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_rfq_documents" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraint to rfq
        await queryRunner.query(`
            ALTER TABLE "rfq_documents"
            ADD CONSTRAINT "FK_rfq_documents_rfq"
            FOREIGN KEY ("rfq_id")
            REFERENCES "rfqs"("id")
            ON DELETE CASCADE
        `);

        // Add foreign key constraint to user
        await queryRunner.query(`
            ALTER TABLE "rfq_documents"
            ADD CONSTRAINT "FK_rfq_documents_uploaded_by"
            FOREIGN KEY ("uploaded_by_user_id")
            REFERENCES "user"("id")
            ON DELETE SET NULL
        `);

        // Create indexes for common queries
        await queryRunner.query(`CREATE INDEX "IDX_rfq_documents_rfq_id" ON "rfq_documents" ("rfq_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_rfq_documents_created_at" ON "rfq_documents" ("created_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_rfq_documents_created_at"`);
        await queryRunner.query(`DROP INDEX "IDX_rfq_documents_rfq_id"`);
        await queryRunner.query(`ALTER TABLE "rfq_documents" DROP CONSTRAINT "FK_rfq_documents_uploaded_by"`);
        await queryRunner.query(`ALTER TABLE "rfq_documents" DROP CONSTRAINT "FK_rfq_documents_rfq"`);
        await queryRunner.query(`DROP TABLE "rfq_documents"`);
    }
}
