import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertAstmPipeDimensionsAndPressures1760428400000 implements MigrationInterface {
    name = 'InsertAstmPipeDimensionsAndPressures1760428400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🚀 Starting ASTM pipe data insertion...');

        // First, ensure we have the ASTM steel specifications
        await queryRunner.query(`
            INSERT INTO steel_specifications (steel_spec_name)
            VALUES 
                ('ASTM A106 Grade A'),
                ('ASTM A106 Grade B'),
                ('ASTM A106 Grade C'),
                ('ASTM A53 Grade A'),
                ('ASTM A53 Grade B')
            ON CONFLICT (steel_spec_name) DO NOTHING;
        `);

        // Get steel specification IDs
        const astmA106B = await queryRunner.query(`
            SELECT id FROM steel_specifications WHERE steel_spec_name = 'ASTM A106 Grade B'
        `);
        const steelSpecId = astmA106B[0].id;

        // ASTM pipe data: [nominalBore, outsideDiameter, schedule, wallThickness, massPerMeter]
        const astmPipeData = [
            // Schedule 40 (STD)
            [6, 10.3, 'Sch40', 1.73, 0.36],
            [8, 13.7, 'Sch40', 2.24, 0.63],
            [10, 17.1, 'Sch40', 2.31, 0.85],
            [15, 21.3, 'Sch40', 2.77, 1.27],
            [20, 26.7, 'Sch40', 2.87, 1.68],
            [25, 33.4, 'Sch40', 3.38, 2.50],
            [32, 42.2, 'Sch40', 3.56, 3.38],
            [40, 48.3, 'Sch40', 3.68, 4.05],
            [50, 60.3, 'Sch40', 3.91, 5.43],
            [65, 73.0, 'Sch40', 5.16, 8.62],
            [80, 88.9, 'Sch40', 5.49, 11.29],
            [90, 101.6, 'Sch40', 5.74, 13.57],
            [100, 114.3, 'Sch40', 6.02, 16.07],
            [125, 141.3, 'Sch40', 6.55, 21.78],
            [150, 168.3, 'Sch40', 7.11, 28.26],
            [200, 219.1, 'Sch40', 8.18, 42.53],
            [250, 273.0, 'Sch40', 9.27, 60.29],
            [300, 323.8, 'Sch40', 10.31, 79.72],
            [350, 355.6, 'Sch40', 11.13, 94.40],
            [400, 406.4, 'Sch40', 12.70, 123.29],
            [450, 457.2, 'Sch40', 11.13, 122.36],
            [500, 508.0, 'Sch40', 15.09, 183.15],
            [600, 609.6, 'Sch40', 17.48, 254.93],

            // Schedule 80 (XS)
            [6, 10.3, 'Sch80', 2.41, 0.46],
            [8, 13.7, 'Sch80', 3.02, 0.80],
            [10, 17.1, 'Sch80', 3.20, 1.10],
            [15, 21.3, 'Sch80', 3.73, 1.62],
            [20, 26.7, 'Sch80', 3.91, 2.19],
            [25, 33.4, 'Sch80', 4.55, 3.23],
            [32, 42.2, 'Sch80', 4.85, 4.46],
            [40, 48.3, 'Sch80', 5.08, 5.40],
            [50, 60.3, 'Sch80', 5.54, 7.43],
            [65, 73.0, 'Sch80', 7.01, 11.40],
            [80, 88.9, 'Sch80', 7.62, 15.25],
            [90, 101.6, 'Sch80', 8.08, 18.62],
            [100, 114.3, 'Sch80', 8.56, 22.31],
            [125, 141.3, 'Sch80', 9.53, 30.92],
            [150, 168.3, 'Sch80', 10.97, 42.56],
            [200, 219.1, 'Sch80', 12.70, 64.63],
            [250, 273.0, 'Sch80', 15.09, 95.90],
            [300, 323.8, 'Sch80', 12.70, 97.44],
            [350, 355.6, 'Sch80', 12.70, 107.38],
            [400, 406.4, 'Sch80', 12.70, 123.29],
            [450, 457.2, 'Sch80', 12.70, 139.19],
            [500, 508.0, 'Sch80', 12.70, 155.10],
            [600, 609.6, 'Sch80', 12.70, 186.92],

            // Schedule 160
            [15, 21.3, 'Sch160', 4.78, 1.94],
            [20, 26.7, 'Sch160', 5.56, 2.89],
            [25, 33.4, 'Sch160', 6.35, 4.23],
            [32, 42.2, 'Sch160', 6.35, 5.61],
            [40, 48.3, 'Sch160', 7.14, 7.22],
            [50, 60.3, 'Sch160', 8.74, 11.09],
            [65, 73.0, 'Sch160', 9.53, 14.90],
            [80, 88.9, 'Sch160', 11.13, 21.33],
            [100, 114.3, 'Sch160', 13.49, 33.49],
            [125, 141.3, 'Sch160', 15.88, 49.05],
            [150, 168.3, 'Sch160', 18.26, 67.49],
            [200, 219.1, 'Sch160', 23.01, 111.16],
            [250, 273.0, 'Sch160', 28.58, 172.09],
            [300, 323.8, 'Sch160', 33.32, 238.52],
            [350, 355.6, 'Sch160', 35.71, 281.38],
            [400, 406.4, 'Sch160', 40.49, 364.85],
            [450, 457.2, 'Sch160', 45.24, 459.18],
            [500, 508.0, 'Sch160', 50.01, 564.14],
            [600, 609.6, 'Sch160', 59.34, 806.61],

            // Additional schedules for large pipes
            [200, 219.1, 'Sch20', 6.35, 33.31],
            [250, 273.0, 'Sch20', 6.35, 41.77],
            [300, 323.8, 'Sch20', 6.35, 49.72],
            [350, 355.6, 'Sch10', 6.35, 54.68],
            [400, 406.4, 'Sch10', 6.35, 62.63],
            [450, 457.2, 'Sch10', 6.35, 70.59],
            [500, 508.0, 'Sch10', 6.35, 78.54],
            [600, 609.6, 'Sch10', 6.35, 94.45],

            // Schedule 120
            [100, 114.3, 'Sch120', 11.13, 28.25],
            [125, 141.3, 'Sch120', 12.70, 40.24],
            [150, 168.3, 'Sch120', 14.27, 54.17],
            [200, 219.1, 'Sch120', 18.26, 90.36],
            [250, 273.0, 'Sch120', 21.44, 132.88],
            [300, 323.8, 'Sch120', 25.40, 186.75]
        ];

        // Insert ASTM pipe dimensions - Schedule 80 (XS)
        const astmSchedule80Dimensions = [
            [6, 10.3, 2.41, 0.46],
            [8, 13.7, 3.02, 0.80],
            [10, 17.1, 3.20, 1.10],
            [15, 21.3, 3.73, 1.62],
            [20, 26.7, 3.91, 2.19],
            [25, 33.4, 4.55, 3.23],
            [32, 42.2, 4.85, 4.46],
            [40, 48.3, 5.08, 5.40],
            [50, 60.3, 5.54, 7.43],
            [65, 73.0, 7.01, 11.40],
            [80, 88.9, 7.62, 15.25],
            [90, 101.6, 8.08, 18.62],
            [100, 114.3, 8.56, 22.31],
            [125, 141.3, 9.53, 30.92],
            [150, 168.3, 10.97, 42.56],
            [200, 219.1, 12.70, 64.63],
            [250, 273.0, 15.09, 95.90],
            [300, 323.8, 12.70, 97.44],
            [350, 355.6, 12.70, 107.38],
            [400, 406.4, 12.70, 123.29],
            [450, 457.2, 12.70, 139.19],
            [500, 508.0, 12.70, 155.10],
            [600, 609.6, 12.70, 186.92]
        ];

        // Insert ASTM pipe dimensions - Schedule 160
        const astmSchedule160Dimensions = [
            [15, 21.3, 4.78, 1.94],
            [20, 26.7, 5.56, 2.89],
            [25, 33.4, 6.35, 4.23],
            [32, 42.2, 6.35, 5.61],
            [40, 48.3, 7.14, 7.22],
            [50, 60.3, 8.74, 11.09],
            [65, 73.0, 9.53, 14.90],
            [80, 88.9, 11.13, 21.33],
            [100, 114.3, 13.49, 33.49],
            [125, 141.3, 15.88, 49.05],
            [150, 168.3, 18.26, 67.49],
            [200, 219.1, 23.01, 111.16],
            [250, 273.0, 28.58, 172.09],
            [300, 323.8, 33.32, 238.52],
            [350, 355.6, 35.71, 281.38],
            [400, 406.4, 40.49, 364.85],
            [450, 457.2, 45.24, 459.18],
            [500, 508.0, 50.01, 564.14],
            [600, 609.6, 59.34, 806.61]
        ];

        // Process each pipe size and create the required records
        for (const pipeData of astmPipeData) {
            const [nominalBore, outsideDiameter, schedule, wallThickness, mass] = pipeData;
            
            // Insert or get nominal outside diameter
            let nominalOdResult = await queryRunner.query(`
                SELECT id FROM nominal_outside_diameters 
                WHERE nominal_diameter_mm = $1 AND outside_diameter_mm = $2
            `, [nominalBore, outsideDiameter]);

            if (nominalOdResult.length === 0) {
                await queryRunner.query(`
                    INSERT INTO nominal_outside_diameters (nominal_diameter_mm, outside_diameter_mm)
                    VALUES ($1, $2)
                `, [nominalBore, outsideDiameter]);
                nominalOdResult = await queryRunner.query(`
                    SELECT id FROM nominal_outside_diameters 
                    WHERE nominal_diameter_mm = $1 AND outside_diameter_mm = $2
                `, [nominalBore, outsideDiameter]);
            }

            const nominalOdId = nominalOdResult[0].id;
            const internalDiameter = Number(outsideDiameter) - (2 * Number(wallThickness));

            // Insert pipe dimension
            await queryRunner.query(`
                INSERT INTO pipe_dimensions (
                    wall_thickness_mm, internal_diameter_mm, mass_kgm, 
                    schedule_designation, nominal_outside_diameter_id, steel_specification_id
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [wallThickness, internalDiameter, mass, schedule, nominalOdId, steelSpecId]);
        }

        // Insert basic pressure data for key temperature points
        // Note: The current schema uses pipe_dimension relationships rather than direct lookups
        // This is a simplified version that adds allowable stress data at key temperatures

        const temperatureStressData = [
            [-29, 103.0], // -29°C to 343°C range
            [371, 99.0],  // 371°C
            [399, 89.0],  // 399°C  
            [413, 82.0]   // 413°C (max service temp)
        ];

        // Add basic allowable stress data that can be used for pressure calculations
        for (const [temp, stress] of temperatureStressData) {
            // Get all pipe dimensions that were just created
            const pipeDimensions = await queryRunner.query(`
                SELECT pd.id, pd.schedule_designation, pd.wall_thickness_mm, nod.outside_diameter_mm
                FROM pipe_dimensions pd
                JOIN nominal_outside_diameters nod ON pd.nominal_outside_diameter_id = nod.id
                JOIN steel_specifications ss ON pd.steel_specification_id = ss.id
                WHERE ss.steel_spec_name = 'ASTM A106 Grade B'
            `);

            // Insert pressure data for each pipe dimension
            for (const pipe of pipeDimensions) {
                const outsideDiameter = parseFloat(pipe.outside_diameter_mm);
                const wallThickness = parseFloat(pipe.wall_thickness_mm);
                
                // Basic pressure calculation: P = 2*S*t/(D-2*t*Y) where Y=0.4 for seamless pipe
                const maxPressure = (2 * stress * wallThickness) / (outsideDiameter - 2 * wallThickness * 0.4);
                const maxPressureMPa = Math.round(maxPressure * 100) / 100; // Round to 2 decimals

                await queryRunner.query(`
                    INSERT INTO pipe_pressures (
                        temperature_c, max_working_pressure_mpa, allowable_stress_mpa, "pipeDimensionId"
                    ) VALUES ($1, $2, $3, $4)
                `, [temp, maxPressureMPa, stress, pipe.id]);
            }
        }

        console.log('✅ ASTM pipe dimensions and pressure data inserted successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('🗑️ Removing ASTM pipe data...');
        
        // Remove ASTM pressure data (connected to ASTM pipe dimensions)
        await queryRunner.query(`
            DELETE FROM pipe_pressures pp
            USING pipe_dimensions pd, steel_specifications ss
            WHERE pp."pipeDimensionId" = pd.id 
            AND pd.steel_specification_id = ss.id
            AND ss.steel_spec_name LIKE 'ASTM%'
        `);
        
        // Remove ASTM pipe dimensions  
        await queryRunner.query(`
            DELETE FROM pipe_dimensions pd
            USING steel_specifications ss
            WHERE pd.steel_specification_id = ss.id
            AND ss.steel_spec_name LIKE 'ASTM%'
        `);
        
        // Remove ASTM steel specifications
        await queryRunner.query(`
            DELETE FROM steel_specifications 
            WHERE steel_spec_name IN (
                'ASTM A106 Grade A', 'ASTM A106 Grade B', 'ASTM A106 Grade C',
                'ASTM A53 Grade A', 'ASTM A53 Grade B'
            )
        `);
        
        console.log('✅ ASTM pipe data removed successfully');
    }
}