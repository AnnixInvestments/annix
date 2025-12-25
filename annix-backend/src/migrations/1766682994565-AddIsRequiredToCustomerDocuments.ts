import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsRequiredToCustomerDocuments1766682994565 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE customer_documents
            ADD COLUMN is_required BOOLEAN NOT NULL DEFAULT true
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE customer_documents
            DROP COLUMN is_required
        `);
    }

}
