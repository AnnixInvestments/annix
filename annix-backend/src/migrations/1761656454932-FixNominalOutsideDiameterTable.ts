import { MigrationInterface, QueryRunner } from "typeorm";

export class FixNominalOutsideDiameterTable1761656454932 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🔍 Checking nominal_outside_diameters table...');
        
        // Check if table exists with wrong name (nominal_outside_diameter_mm)
        const wrongTableExists = await queryRunner.hasTable('nominal_outside_diameter_mm');
        const correctTableExists = await queryRunner.hasTable('nominal_outside_diameters');
        
        if (wrongTableExists && !correctTableExists) {
            console.log('📝 Renaming nominal_outside_diameter_mm to nominal_outside_diameters...');
            await queryRunner.query(`ALTER TABLE "nominal_outside_diameter_mm" RENAME TO "nominal_outside_diameters"`);
            console.log('✅ Table renamed successfully');
        } else if (!correctTableExists) {
            console.log('🏗️ Creating nominal_outside_diameters table...');
            await queryRunner.query(`
                CREATE TABLE "nominal_outside_diameters" (
                    "id" SERIAL NOT NULL,
                    "nominal_diameter_mm" double precision NOT NULL,
                    "outside_diameter_mm" double precision NOT NULL,
                    CONSTRAINT "UQ_47693acebc036eaf73dff06eea7" UNIQUE ("nominal_diameter_mm", "outside_diameter_mm"),
                    CONSTRAINT "PK_aecffa012808ca87b79520261d4" PRIMARY KEY ("id")
                )
            `);
            console.log('✅ Table created successfully');
        } else {
            console.log('✅ Table already exists with correct name');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Don't do anything on rollback - we don't want to break existing data
        console.log('⏮️ Rollback: No action needed for nominal_outside_diameters table');
    }

}
