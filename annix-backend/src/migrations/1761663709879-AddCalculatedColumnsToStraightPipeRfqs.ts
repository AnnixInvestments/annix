import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCalculatedColumnsToStraightPipeRfqs1761663709879 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('➕ Adding calculated_od_mm and calculated_wt_mm columns to straight_pipe_rfqs...');
        
        // Check if columns already exist
        const table = await queryRunner.getTable('straight_pipe_rfqs');
        
        if (table && !table.findColumnByName('calculated_od_mm')) {
            await queryRunner.query(`
                ALTER TABLE "straight_pipe_rfqs" 
                ADD COLUMN "calculated_od_mm" numeric(8,3)
            `);
            console.log('✅ Added calculated_od_mm column');
        } else {
            console.log('⏭️  calculated_od_mm column already exists');
        }
        
        if (table && !table.findColumnByName('calculated_wt_mm')) {
            await queryRunner.query(`
                ALTER TABLE "straight_pipe_rfqs" 
                ADD COLUMN "calculated_wt_mm" numeric(8,3)
            `);
            console.log('✅ Added calculated_wt_mm column');
        } else {
            console.log('⏭️  calculated_wt_mm column already exists');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "straight_pipe_rfqs" DROP COLUMN IF EXISTS "calculated_wt_mm"`);
        await queryRunner.query(`ALTER TABLE "straight_pipe_rfqs" DROP COLUMN IF EXISTS "calculated_od_mm"`);
    }

}
