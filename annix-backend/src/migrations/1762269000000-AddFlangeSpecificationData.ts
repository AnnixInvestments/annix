import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFlangeSpecificationData1762269000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🔩 Adding comprehensive flange specification data...');

        // First, add bolt specifications found in the flange data
        console.log('Adding bolt specifications...');
        const boltInserts = [
            'M10', 'M12', 'M16', 'M20', 'M24', 'M27', 'M30', 'M33', 'M36', 'M39', 'M42', 'M45', 'M52', 'M56', 'M64'
        ];

        for (const bolt of boltInserts) {
            const existing = await queryRunner.query(`SELECT id FROM bolts WHERE designation = '${bolt}'`);
            if (existing.length === 0) {
                await queryRunner.query(`INSERT INTO bolts (designation) VALUES ('${bolt}')`);
            }
        }

        // Add flange standards
        console.log('Adding flange standards...');
        const standards = ['BS 4504', 'SABS 1123', 'BS 10'];
        for (const standard of standards) {
            const existing = await queryRunner.query(`SELECT id FROM flange_standards WHERE code = '${standard}'`);
            if (existing.length === 0) {
                await queryRunner.query(`INSERT INTO flange_standards (code) VALUES ('${standard}')`);
            }
        }

        // Get the standard IDs for reference
        const bs4504Result = await queryRunner.query(`SELECT id FROM flange_standards WHERE code = 'BS 4504'`);
        const sabs1123Result = await queryRunner.query(`SELECT id FROM flange_standards WHERE code = 'SABS 1123'`);
        const bs10Result = await queryRunner.query(`SELECT id FROM flange_standards WHERE code = 'BS 10'`);

        const bs4504Id = bs4504Result[0].id;
        const sabs1123Id = sabs1123Result[0].id;
        const bs10Id = bs10Result[0].id;

        // Add pressure classes for each standard
        console.log('Adding pressure classes...');
        
        // BS 4504 pressure classes
        const bs4504Classes = ['6/3', '10/3', '16/3', '25/3', '40/3', '64/3', '100/3', '160/3'];
        for (const pressureClass of bs4504Classes) {
            const existing = await queryRunner.query(`
                SELECT id FROM flange_pressure_classes 
                WHERE designation = '${pressureClass}' AND "standardId" = ${bs4504Id}
            `);
            if (existing.length === 0) {
                await queryRunner.query(`
                    INSERT INTO flange_pressure_classes (designation, "standardId") 
                    VALUES ('${pressureClass}', ${bs4504Id})
                `);
            }
        }

        // SABS 1123 pressure classes
        const sabs1123Classes = ['600/3', '1000/3', '1600/3', '2500/3', '4000/3'];
        for (const pressureClass of sabs1123Classes) {
            const existing = await queryRunner.query(`
                SELECT id FROM flange_pressure_classes 
                WHERE designation = '${pressureClass}' AND "standardId" = ${sabs1123Id}
            `);
            if (existing.length === 0) {
                await queryRunner.query(`
                    INSERT INTO flange_pressure_classes (designation, "standardId") 
                    VALUES ('${pressureClass}', ${sabs1123Id})
                `);
            }
        }

        // BS 10 pressure classes
        const bs10Classes = ['T/D', 'T/E', 'T/F'];
        for (const pressureClass of bs10Classes) {
            const existing = await queryRunner.query(`
                SELECT id FROM flange_pressure_classes 
                WHERE designation = '${pressureClass}' AND "standardId" = ${bs10Id}
            `);
            if (existing.length === 0) {
                await queryRunner.query(`
                    INSERT INTO flange_pressure_classes (designation, "standardId") 
                    VALUES ('${pressureClass}', ${bs10Id})
                `);
            }
        }

        // Now add the comprehensive flange dimension data
        console.log('Adding flange dimension data...');

        // Helper function to get nominal diameter ID
        const getNominalId = async (nominalMm: number, outsideMm: number) => {
            const result = await queryRunner.query(`
                SELECT id FROM nominal_outside_diameters 
                WHERE nominal_diameter_mm = ${nominalMm} AND outside_diameter_mm = ${outsideMm}
            `);
            return result[0]?.id;
        };

        // Helper function to get bolt ID
        const getBoltId = async (designation: string) => {
            if (!designation) return null;
            const result = await queryRunner.query(`
                SELECT id FROM bolts WHERE designation = '${designation}'
            `);
            return result[0]?.id;
        };

        // Helper function to get pressure class ID
        const getPressureClassId = async (designation: string, standardId: number) => {
            const result = await queryRunner.query(`
                SELECT id FROM flange_pressure_classes 
                WHERE designation = '${designation}' AND "standardId" = ${standardId}
            `);
            return result[0]?.id;
        };

        // Flange dimension data from your specification - starting with key sizes
        // Format: [nominalMm, outsideMm, standard, pressureClass, D, b, d4, f, holes, d1, bolt, pcd, mass]
        const flangeData = [
            // 15NB 21.3 O/D - Complete set
            [15, 21.3, 'BS 4504', '6/3', 80.0, 12.0, 40.0, 2.0, 4, 11.0, 'M10', 55.0, 0.35],
            [15, 21.3, 'BS 4504', '10/3', 95.0, 14.0, 45.0, 2.0, 4, 14.0, 'M12', 65.0, 0.59],
            [15, 21.3, 'BS 4504', '16/3', 95.0, 14.0, 45.0, 2.0, 4, 14.0, 'M12', 65.0, 0.59],
            [15, 21.3, 'BS 4504', '25/3', 95.0, 16.0, 45.0, 2.0, 4, 14.0, 'M12', 65.0, 0.69],
            [15, 21.3, 'BS 4504', '40/3', 95.0, 16.0, 45.0, 2.0, 4, 14.0, 'M12', 65.0, 0.69],
            [15, 21.3, 'BS 4504', '64/3', 105.0, 20.0, 45.0, 2.0, 4, 14.0, null, 75.0, null],
            [15, 21.3, 'BS 4504', '100/3', 105.0, 20.0, 45.0, 2.0, 4, 14.0, null, 75.0, null],
            [15, 21.3, 'BS 4504', '160/3', 105.0, 24.0, 45.0, 2.0, 4, 14.0, null, 75.0, null],
            [15, 21.3, 'SABS 1123', '600/3', 80.0, 10.0, 40.0, 2.0, 4, 11.0, 'M10', 55.0, 0.29],
            [15, 21.3, 'SABS 1123', '1000/3', 95.0, 10.0, 45.0, 2.0, 4, 14.0, 'M12', 65.0, 0.42],
            [15, 21.3, 'SABS 1123', '1600/3', 95.0, 10.0, 45.0, 2.0, 4, 14.0, 'M12', 65.0, 0.42],
            [15, 21.3, 'SABS 1123', '2500/3', 95.0, 14.0, 45.0, 2.0, 4, 14.0, 'M12', 65.0, 0.60],
            [15, 21.3, 'SABS 1123', '4000/3', 95.0, 14.0, 45.0, 2.0, 4, 14.0, 'M12', 56.0, 0.60],
            [15, 21.3, 'BS 10', 'T/D', 95.3, 4.8, null, null, 4, 14.3, null, 66.7, 0.67],
            [15, 21.3, 'BS 10', 'T/E', 95.3, 6.3, null, null, 4, 14.3, null, 66.7, 0.67],
            [15, 21.3, 'BS 10', 'T/F', 95.3, 9.5, null, null, 4, 14.3, null, 66.7, 0.67],

            // 20NB 26.9 O/D - Complete set
            [20, 26.9, 'BS 4504', '6/3', 90.0, 14.0, 50.0, 2.0, 4, 11.0, 'M10', 65.0, 0.53],
            [20, 26.9, 'BS 4504', '10/3', 105.0, 16.0, 58.0, 2.0, 4, 14.0, 'M12', 75.0, 0.85],
            [20, 26.9, 'BS 4504', '16/3', 105.0, 16.0, 58.0, 2.0, 4, 14.0, 'M12', 75.0, 0.85], // Fixed typo from 156.0
            [20, 26.9, 'BS 4504', '25/3', 105.0, 18.0, 58.0, 2.0, 4, 14.0, 'M12', 75.0, 0.97],
            [20, 26.9, 'BS 4504', '40/3', 105.0, 18.0, 58.0, 2.0, 4, 14.0, 'M12', 75.0, 0.97],
            [20, 26.9, 'BS 4504', '64/3', 130.0, 22.0, 58.0, 2.0, 4, 18.0, null, 90.0, null],
            [20, 26.9, 'BS 4504', '100/3', 130.0, 22.0, 58.0, 2.0, 4, 18.0, null, 90.0, null],
            [20, 26.9, 'BS 4504', '160/3', 130.0, 26.0, 58.0, 1.0, 4, 18.0, null, 90.0, null],
            [20, 26.9, 'SABS 1123', '600/3', 90.0, 10.0, 50.0, 2.0, 4, 11.0, 'M10', 65.0, 0.38],
            [20, 26.9, 'SABS 1123', '1000/3', 105.0, 10.0, 58.0, 2.0, 4, 14.0, 'M12', 75.0, 0.53],
            [20, 26.9, 'SABS 1123', '1600/3', 105.0, 10.0, 58.0, 2.0, 4, 14.0, 'M12', 75.0, 0.53],
            [20, 26.9, 'SABS 1123', '2500/3', 105.0, 14.0, 58.0, 2.0, 4, 14.0, 'M12', 75.0, 0.75],
            [20, 26.9, 'SABS 1123', '4000/3', 105.0, 14.0, 58.0, 2.0, 4, 14.0, 'M12', 75.0, 0.75],
            [20, 26.9, 'BS 10', 'T/D', 101.6, 4.8, null, null, 4, 14.2, null, 73.0, 0.76],
            [20, 26.9, 'BS 10', 'T/E', 101.6, 6.3, null, null, 4, 14.2, null, 73.0, 0.76],
            [20, 26.9, 'BS 10', 'T/F', 101.6, 9.5, null, null, 4, 14.2, null, 73.0, 0.76],

            // 25NB 33.7 O/D - Complete set
            [25, 33.7, 'BS 4504', '6/3', 100.0, 14.0, 60.0, 2.0, 4, 11.0, 'M10', 75.0, 0.65],
            [25, 33.7, 'BS 4504', '10/3', 115.0, 16.0, 68.0, 2.0, 4, 14.0, 'M12', 85.0, 1.00],
            [25, 33.7, 'BS 4504', '16/3', 115.0, 16.0, 68.0, 2.0, 4, 14.0, 'M12', 85.0, 1.00],
            [25, 33.7, 'BS 4504', '25/3', 115.0, 18.0, 68.0, 2.0, 4, 14.0, 'M12', 85.0, 1.20],
            [25, 33.7, 'BS 4504', '40/3', 115.0, 18.0, 68.0, 2.0, 4, 14.0, 'M12', 85.0, 1.20],
            [25, 33.7, 'BS 4504', '64/3', 140.0, 24.0, 68.0, 2.0, 4, 18.0, null, 100.0, null],
            [25, 33.7, 'BS 4504', '100/3', 140.0, 24.0, 68.0, 2.0, 4, 18.0, null, 100.0, null],
            [25, 33.7, 'BS 4504', '160/3', 140.0, 26.0, 68.0, 2.0, 4, 18.0, null, 100.0, null],
            [25, 33.7, 'SABS 1123', '600/3', 100.0, 10.0, 60.0, 2.0, 4, 11.0, 'M10', 75.0, 0.48],
            [25, 33.7, 'SABS 1123', '1000/3', 115.0, 10.0, 68.0, 2.0, 4, 14.0, 'M12', 85.0, 0.63],
            [25, 33.7, 'SABS 1123', '1600/3', 115.0, 10.0, 68.0, 2.0, 4, 14.0, 'M12', 85.0, 0.63],
            [25, 33.7, 'SABS 1123', '2500/3', 115.0, 16.0, 68.0, 2.0, 4, 14.0, 'M12', 85.0, 1.07],
            [25, 33.7, 'SABS 1123', '4000/3', 115.0, 16.0, 68.0, 2.0, 4, 14.0, 'M12', 85.0, 1.07],
            [25, 33.7, 'BS 10', 'T/D', 114.3, 4.8, null, null, 4, 14.3, null, 82.6, 0.97],
            [25, 33.7, 'BS 10', 'T/E', 114.3, 7.1, null, null, 4, 14.3, null, 82.6, 0.97],
            [25, 33.7, 'BS 10', 'T/F', 120.6, 9.5, null, null, 4, 17.5, null, 87.3, 1.03],

            // Sample larger sizes to test all pressure classes
            [50, 60.3, 'BS 4504', '6/3', 140.0, 16.0, 90.0, 3.0, 4, 14.0, 'M12', 110.0, 1.30],
            [80, 88.9, 'BS 4504', '100/3', 230.0, 34.0, 138.0, 3.0, 8, 26.0, 'M24', 180.0, 6.87],
            [100, 114.3, 'BS 4504', '160/3', 265.0, 44.0, 162.0, 3.0, 8, 30.0, 'M27', 210.0, 15.30],
            [200, 219.1, 'BS 4504', '25/3', 360.0, 28.0, 278.0, 3.0, 12, 26.0, 'M24', 310.0, 12.00],
            [300, 323.9, 'BS 4504', '40/3', 515.0, 50.0, 410.0, 4.0, 16, 33.0, 'M30', 450.0, 42.00],
            [500, 508.0, 'BS 4504', '64/3', 800.0, 94.0, 615.0, 4.0, 20, 48.0, 'M45', 705.0, 196.19],

            // Large sizes
            [1000, 1016.0, 'BS 4504', '6/3', 1175.0, 46.0, 1080.0, 5.0, 28, 30.0, 'M27', 1120.0, 86.00],
            [1200, 1220.0, 'BS 4504', '25/3', 1530.0, 116.0, 1350.0, 5.0, 32, 56.0, 'M52', 1420.0, 472.56],
        ];

        // Insert all flange dimension data
        for (const flange of flangeData) {
            const [nominalMm, outsideMm, standard, pressureClass, D, b, d4, f, holes, d1, bolt, pcd, mass] = flange;
            
            // Get the required IDs
            const nominalId = await getNominalId(nominalMm as number, outsideMm as number);
            if (!nominalId) {
                console.log(`⚠️ Warning: Nominal size ${nominalMm}NB ${outsideMm}mm not found, skipping...`);
                continue;
            }

            let standardId: number;
            if (standard === 'BS 4504') standardId = bs4504Id;
            else if (standard === 'SABS 1123') standardId = sabs1123Id;
            else if (standard === 'BS 10') standardId = bs10Id;
            else continue;

            const pressureClassId = await getPressureClassId(pressureClass as string, standardId);
            if (!pressureClassId) {
                console.log(`⚠️ Warning: Pressure class ${pressureClass} for ${standard} not found, skipping...`);
                continue;
            }

            const boltId = bolt ? await getBoltId(bolt as string) : null;

            // Insert the flange dimension
            await queryRunner.query(`
                INSERT INTO flange_dimensions (
                    "nominalOutsideDiameterId", "standardId", "pressureClassId", 
                    "D", "b", "d4", "f", "num_holes", "d1", "boltId", "pcd", "mass_kg"
                ) VALUES (
                    ${nominalId}, ${standardId}, ${pressureClassId},
                    ${D}, ${b}, ${d4 || 0}, ${f || 0}, ${holes}, ${d1}, ${boltId || 'NULL'}, ${pcd}, ${mass || 0}
                )
            `);
        }

        console.log('✅ Flange specification data added successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('⏮️ Removing flange specification data...');

        // Remove flange dimensions
        await queryRunner.query(`DELETE FROM flange_dimensions`);
        
        // Remove pressure classes
        await queryRunner.query(`DELETE FROM flange_pressure_classes`);
        
        // Remove standards
        await queryRunner.query(`DELETE FROM flange_standards WHERE code IN ('BS 4504', 'SABS 1123', 'BS 10')`);
        
        // Remove bolts
        await queryRunner.query(`
            DELETE FROM bolts WHERE designation IN (
                'M10', 'M12', 'M16', 'M20', 'M24', 'M27', 'M30', 'M33', 'M36', 'M39', 'M42', 'M45', 'M52', 'M56', 'M64'
            )
        `);

        console.log('✅ Flange specification data removed');
    }
}