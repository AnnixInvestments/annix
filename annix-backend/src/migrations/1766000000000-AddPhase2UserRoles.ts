import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhase2UserRoles1766000000000 implements MigrationInterface {
    name = 'AddPhase2UserRoles1766000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Insert Phase 2 user roles
        await queryRunner.query(`
            INSERT INTO "user_role" ("name") VALUES
            ('rfq_administrator'),
            ('reviewer'),
            ('approver'),
            ('compliance_officer'),
            ('customer'),
            ('supplier')
            ON CONFLICT ("name") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove Phase 2 user roles
        await queryRunner.query(`
            DELETE FROM "user_role"
            WHERE "name" IN (
                'rfq_administrator',
                'reviewer',
                'approver',
                'compliance_officer',
                'customer',
                'supplier'
            )
        `);
    }
}
