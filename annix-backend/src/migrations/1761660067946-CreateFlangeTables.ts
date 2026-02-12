import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFlangeTables1761660067946 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🏗️ Creating flange tables if they do not exist...');
        
        // Create flange_standards table first (flange_pressure_classes depends on it)
        const flangeStandardsExists = await queryRunner.hasTable('flange_standards');
        if (!flangeStandardsExists) {
            console.log('Creating flange_standards table...');
            await queryRunner.query(`
                CREATE TABLE "flange_standards" (
                    "id" SERIAL NOT NULL,
                    "code" character varying NOT NULL,
                    CONSTRAINT "UQ_8f764a3296a0bcddf3cae783e82" UNIQUE ("code"),
                    CONSTRAINT "PK_2ea7d2fda06762d8aa9a75be356" PRIMARY KEY ("id")
                )
            `);
        }
        
        // Create flange_pressure_classes table
        const flangePressureClassesExists = await queryRunner.hasTable('flange_pressure_classes');
        if (!flangePressureClassesExists) {
            console.log('Creating flange_pressure_classes table...');
            await queryRunner.query(`
                CREATE TABLE "flange_pressure_classes" (
                    "id" SERIAL NOT NULL,
                    "designation" character varying NOT NULL,
                    "standardId" integer,
                    CONSTRAINT "PK_a38d9f17371b1eebb7f35a34dea" PRIMARY KEY ("id")
                )
            `);
            
            // Add foreign key to flange_standards
            await queryRunner.query(`
                ALTER TABLE "flange_pressure_classes" 
                ADD CONSTRAINT "FK_4f1a4f98e1c9b2a84f3551b7bf8" 
                FOREIGN KEY ("standardId") 
                REFERENCES "flange_standards"("id") 
                ON DELETE CASCADE ON UPDATE NO ACTION
            `);
        }
        
        // Create nominal_outside_diameters table if not exists
        const nominalOutsideDiametersExists = await queryRunner.hasTable('nominal_outside_diameters');
        if (!nominalOutsideDiametersExists) {
            console.log('Creating nominal_outside_diameters table...');
            await queryRunner.query(`
                CREATE TABLE "nominal_outside_diameters" (
                    "id" SERIAL NOT NULL,
                    "nominal_diameter_mm" double precision NOT NULL,
                    "outside_diameter_mm" double precision NOT NULL,
                    CONSTRAINT "UQ_47693acebc036eaf73dff06eea7" UNIQUE ("nominal_diameter_mm", "outside_diameter_mm"),
                    CONSTRAINT "PK_aecffa012808ca87b79520261d4" PRIMARY KEY ("id")
                )
            `);
        }
        
        console.log('✅ Flange tables created successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('⏮️ Rolling back flange tables...');
        
        await queryRunner.query(`DROP TABLE IF EXISTS "flange_pressure_classes" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "flange_standards" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "nominal_outside_diameters" CASCADE`);
        
        console.log('✅ Rollback complete');
    }

}
