import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPipeEndConfigurationColumn1761663467548 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🔧 Adding pipe_end_configuration column to straight_pipe_rfqs...');
        
        // Check if column already exists
        const table = await queryRunner.getTable('straight_pipe_rfqs');
        const hasColumn = table?.columns.find(col => col.name === 'pipe_end_configuration');
        
        if (!hasColumn) {
            await queryRunner.query(`
                ALTER TABLE "straight_pipe_rfqs" 
                ADD COLUMN "pipe_end_configuration" character varying(20)
            `);
            console.log('✅ pipe_end_configuration column added successfully');
        } else {
            console.log('✅ pipe_end_configuration column already exists');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "straight_pipe_rfqs" 
            DROP COLUMN IF EXISTS "pipe_end_configuration"
        `);
    }

}
