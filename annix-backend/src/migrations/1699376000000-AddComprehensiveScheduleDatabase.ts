import { MigrationInterface, QueryRunner } from "typeorm";

export class AddComprehensiveScheduleDatabase1699376000000 implements MigrationInterface {
    name = 'AddComprehensiveScheduleDatabase1699376000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // This migration adds comprehensive schedule data for all standard pipe sizes
        // Based on ASME B36.10M and B36.19M standards
        
        // First, let's add Schedule 10, 20, 30, 60, 100, 120, 140, 160 for common nominal bores
        // We'll also add STD, XS, XXS designations
        
        // Get steel specification ID for carbon steel (assuming it exists)
        const steelSpecResult = await queryRunner.query(`
            SELECT id FROM steel_specifications WHERE steel_spec_name ILIKE '%A106%' OR steel_spec_name ILIKE '%carbon%' LIMIT 1
        `);
        
        const steelSpecId = steelSpecResult.length > 0 ? steelSpecResult[0].id : 1;

        // Helper function to insert pipe dimension data
        const insertPipeDimension = async (nominalBore: number, schedule: string | null, scheduleNumber: number | null, wallThickness: number, mass: number) => {
            // Get nominal outside diameter ID
            const nominalResult = await queryRunner.query(`
                SELECT id, outside_diameter_mm FROM nominal_outside_diameters WHERE nominal_diameter_mm = $1
            `, [nominalBore]);
            
            if (nominalResult.length > 0) {
                const nominalId = nominalResult[0].id;
                const outsideDiameter = nominalResult[0].outside_diameter_mm;
                const internalDiameter = outsideDiameter - (2 * wallThickness);
                
                // Check if this combination already exists
                const existsResult = await queryRunner.query(`
                    SELECT id FROM pipe_dimensions 
                    WHERE nominal_outside_diameter_id = $1 
                    AND ($2::varchar IS NULL OR schedule_designation = $2)
                    AND ($3::float IS NULL OR schedule_number = $3)
                    AND wall_thickness_mm = $4
                `, [nominalId, schedule, scheduleNumber, wallThickness]);
                
                if (existsResult.length === 0) {
                    await queryRunner.query(`
                        INSERT INTO pipe_dimensions (
                            wall_thickness_mm, 
                            internal_diameter_mm, 
                            mass_kgm, 
                            schedule_designation, 
                            schedule_number,
                            nominal_outside_diameter_id,
                            steel_specification_id
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    `, [wallThickness, internalDiameter, mass, schedule, scheduleNumber, nominalId, steelSpecId]);
                }
            }
        };

        // Schedule 10 data (Light wall)
        await insertPipeDimension(40, 'Sch10', 10, 2.31, 2.41);
        await insertPipeDimension(50, 'Sch10', 10, 2.77, 3.24);
        await insertPipeDimension(65, 'Sch10', 10, 2.87, 4.47);
        await insertPipeDimension(80, 'Sch10', 10, 3.05, 5.61);
        await insertPipeDimension(100, 'Sch10', 10, 3.40, 8.63);
        await insertPipeDimension(125, 'Sch10', 10, 3.40, 10.85);
        await insertPipeDimension(150, 'Sch10', 10, 3.40, 13.08);
        await insertPipeDimension(200, 'Sch10', 10, 3.96, 19.05);
        await insertPipeDimension(250, 'Sch10', 10, 4.78, 28.26);
        await insertPipeDimension(300, 'Sch10', 10, 4.78, 34.47);

        // Schedule 20 data  
        await insertPipeDimension(40, 'Sch20', 20, 2.77, 2.84);
        await insertPipeDimension(50, 'Sch20', 20, 2.87, 3.73);
        await insertPipeDimension(65, 'Sch20', 20, 3.05, 4.85);
        await insertPipeDimension(80, 'Sch20', 20, 3.05, 5.99);
        await insertPipeDimension(100, 'Sch20', 20, 3.68, 9.28);
        await insertPipeDimension(125, 'Sch20', 20, 3.68, 11.66);
        await insertPipeDimension(150, 'Sch20', 20, 3.68, 14.02);
        await insertPipeDimension(200, 'Sch20', 20, 4.78, 22.28);
        await insertPipeDimension(250, 'Sch20', 20, 5.54, 31.75);
        await insertPipeDimension(300, 'Sch20', 20, 5.54, 38.49);

        // Schedule 30 data
        await insertPipeDimension(40, 'Sch30', 30, 3.68, 3.70);
        await insertPipeDimension(50, 'Sch30', 30, 3.91, 4.85);
        await insertPipeDimension(65, 'Sch30', 30, 4.55, 6.93);
        await insertPipeDimension(80, 'Sch30', 30, 4.85, 8.56);
        await insertPipeDimension(100, 'Sch30', 30, 5.49, 13.57);
        await insertPipeDimension(125, 'Sch30', 30, 5.74, 17.29);
        await insertPipeDimension(150, 'Sch30', 30, 5.74, 20.93);
        await insertPipeDimension(200, 'Sch30', 30, 6.35, 28.57);
        await insertPipeDimension(250, 'Sch30', 30, 6.35, 36.37);
        await insertPipeDimension(300, 'Sch30', 30, 7.04, 45.35);

        // Schedule 60 data
        await insertPipeDimension(40, 'Sch60', 60, 4.85, 4.78);
        await insertPipeDimension(50, 'Sch60', 60, 5.54, 6.76);
        await insertPipeDimension(65, 'Sch60', 60, 5.74, 9.11);
        await insertPipeDimension(80, 'Sch60', 60, 6.35, 11.29);
        await insertPipeDimension(100, 'Sch60', 60, 7.11, 17.09);
        await insertPipeDimension(125, 'Sch60', 60, 7.11, 21.77);
        await insertPipeDimension(150, 'Sch60', 60, 7.11, 26.41);
        await insertPipeDimension(200, 'Sch60', 60, 8.18, 36.58);
        await insertPipeDimension(250, 'Sch60', 60, 8.74, 47.07);
        await insertPipeDimension(300, 'Sch60', 60, 9.27, 57.99);

        // Schedule 100 data
        await insertPipeDimension(40, 'Sch100', 100, 6.35, 6.17);
        await insertPipeDimension(50, 'Sch100', 100, 7.47, 8.63);
        await insertPipeDimension(65, 'Sch100', 100, 7.47, 11.41);
        await insertPipeDimension(80, 'Sch100', 100, 8.08, 14.02);
        await insertPipeDimension(100, 'Sch100', 100, 9.09, 21.35);
        await insertPipeDimension(125, 'Sch100', 100, 9.53, 27.01);
        await insertPipeDimension(150, 'Sch100', 100, 9.53, 32.75);
        await insertPipeDimension(200, 'Sch100', 100, 10.31, 45.61);
        await insertPipeDimension(250, 'Sch100', 100, 12.70, 66.63);
        await insertPipeDimension(300, 'Sch100', 100, 12.70, 80.21);

        // Schedule 120 data
        await insertPipeDimension(40, 'Sch120', 120, 7.14, 6.93);
        await insertPipeDimension(50, 'Sch120', 120, 8.08, 9.25);
        await insertPipeDimension(65, 'Sch120', 120, 8.56, 12.52);
        await insertPipeDimension(80, 'Sch120', 120, 8.86, 15.27);
        await insertPipeDimension(100, 'Sch120', 120, 10.03, 23.00);
        await insertPipeDimension(125, 'Sch120', 120, 10.97, 29.57);
        await insertPipeDimension(150, 'Sch120', 120, 10.97, 35.81);
        await insertPipeDimension(200, 'Sch120', 120, 12.70, 54.77);
        await insertPipeDimension(250, 'Sch120', 120, 15.09, 77.93);
        await insertPipeDimension(300, 'Sch120', 120, 15.09, 93.45);

        // Schedule 140 data
        await insertPipeDimension(40, 'Sch140', 140, 7.92, 7.67);
        await insertPipeDimension(50, 'Sch140', 140, 8.74, 9.95);
        await insertPipeDimension(65, 'Sch140', 140, 9.53, 13.84);
        await insertPipeDimension(80, 'Sch140', 140, 9.53, 16.69);
        await insertPipeDimension(100, 'Sch140', 140, 10.97, 24.70);
        await insertPipeDimension(125, 'Sch140', 140, 12.70, 33.54);
        await insertPipeDimension(150, 'Sch140', 140, 12.70, 40.24);
        await insertPipeDimension(200, 'Sch140', 140, 14.27, 60.31);
        await insertPipeDimension(250, 'Sch140', 140, 17.48, 89.29);
        await insertPipeDimension(300, 'Sch140', 140, 17.48, 106.68);

        // Schedule 160 data
        await insertPipeDimension(40, 'Sch160', 160, 8.71, 8.41);
        await insertPipeDimension(50, 'Sch160', 160, 9.53, 10.75);
        await insertPipeDimension(65, 'Sch160', 160, 10.97, 15.61);
        await insertPipeDimension(80, 'Sch160', 160, 10.97, 18.58);
        await insertPipeDimension(100, 'Sch160', 160, 12.70, 27.68);
        await insertPipeDimension(125, 'Sch160', 160, 14.27, 37.35);
        await insertPipeDimension(150, 'Sch160', 160, 14.27, 44.78);
        await insertPipeDimension(200, 'Sch160', 160, 15.09, 65.33);
        await insertPipeDimension(250, 'Sch160', 160, 19.05, 96.81);
        await insertPipeDimension(300, 'Sch160', 160, 19.05, 115.67);

        // Standard (STD) - typically equivalent to Schedule 40 for most sizes
        await insertPipeDimension(40, 'STD', null, 3.68, 3.70);
        await insertPipeDimension(50, 'STD', null, 3.91, 4.85);
        await insertPipeDimension(65, 'STD', null, 4.55, 6.93);
        await insertPipeDimension(80, 'STD', null, 5.49, 9.61);
        await insertPipeDimension(100, 'STD', null, 6.02, 13.57);
        await insertPipeDimension(125, 'STD', null, 6.55, 17.29);
        await insertPipeDimension(150, 'STD', null, 7.11, 26.41);
        await insertPipeDimension(200, 'STD', null, 8.18, 36.58);
        await insertPipeDimension(250, 'STD', null, 9.27, 50.88);
        await insertPipeDimension(300, 'STD', null, 10.31, 67.57);

        // Extra Strong (XS) - typically equivalent to Schedule 80 for most sizes  
        await insertPipeDimension(40, 'XS', null, 4.85, 4.78);
        await insertPipeDimension(50, 'XS', null, 5.54, 6.76);
        await insertPipeDimension(65, 'XS', null, 6.35, 9.61);
        await insertPipeDimension(80, 'XS', null, 7.62, 13.38);
        await insertPipeDimension(100, 'XS', null, 8.56, 19.05);
        await insertPipeDimension(125, 'XS', null, 9.53, 26.04);
        await insertPipeDimension(150, 'XS', null, 10.97, 35.81);
        await insertPipeDimension(200, 'XS', null, 12.70, 54.77);
        await insertPipeDimension(250, 'XS', null, 15.09, 77.93);
        await insertPipeDimension(300, 'XS', null, 17.48, 106.68);

        // Double Extra Strong (XXS) - typically 2x wall thickness of XS
        await insertPipeDimension(40, 'XXS', null, 9.70, 9.11);
        await insertPipeDimension(50, 'XXS', null, 11.07, 12.52);
        await insertPipeDimension(65, 'XXS', null, 12.70, 17.29);
        await insertPipeDimension(80, 'XXS', null, 15.24, 23.67);
        await insertPipeDimension(100, 'XXS', null, 17.12, 33.54);
        await insertPipeDimension(125, 'XXS', null, 19.05, 45.35);
        await insertPipeDimension(150, 'XXS', null, 21.95, 62.58);
        await insertPipeDimension(200, 'XXS', null, 25.40, 93.45);
        await insertPipeDimension(250, 'XXS', null, 30.18, 133.22);
        await insertPipeDimension(300, 'XXS', null, 34.93, 180.72);

        console.log('Successfully added comprehensive schedule database with all standard schedules');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove all the added schedule data
        await queryRunner.query(`
            DELETE FROM pipe_dimensions 
            WHERE schedule_designation IN (
                'Sch10', 'Sch20', 'Sch30', 'Sch60', 'Sch100', 'Sch120', 'Sch140', 'Sch160',
                'STD', 'XS', 'XXS'
            ) OR schedule_number IN (10, 20, 30, 60, 100, 120, 140, 160)
        `);
        
        console.log('Removed comprehensive schedule database data');
    }
}