import { MigrationInterface, QueryRunner } from "typeorm";

export class FixRfqItemsColumnName1761663234173 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🔧 Renaming unit_weight_kg to weight_per_unit_kg in rfq_items table...');
        
        // Check if column needs to be renamed
        const columnExists = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'rfq_items' AND column_name = 'unit_weight_kg'
        `);
        
        if (columnExists.length > 0) {
            await queryRunner.query(`
                ALTER TABLE "rfq_items" 
                RENAME COLUMN "unit_weight_kg" TO "weight_per_unit_kg"
            `);
            console.log('✅ Column renamed successfully');
        } else {
            console.log('✅ Column already has correct name');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('⏮️ Renaming weight_per_unit_kg back to unit_weight_kg...');
        await queryRunner.query(`
            ALTER TABLE "rfq_items" 
            RENAME COLUMN "weight_per_unit_kg" TO "unit_weight_kg"
        `);
    }

}
