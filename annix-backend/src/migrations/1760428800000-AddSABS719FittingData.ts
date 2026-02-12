import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSABS719FittingData1760428800000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Insert SABS 719 fitting types
        const fittingTypes = [
            'Short Tee',
            'Gusset Tee', 
            'Elbow - Short Radius',
            'Elbow - Medium Radius',
            'Elbow - Long Radius',
            'Reducer',
            'Bellmouth',
            'Segmented Bend'
        ];

        for (const fittingType of fittingTypes) {
            await queryRunner.query(`
                INSERT INTO "fitting_types" ("name") 
                VALUES ('${fittingType}')
                ON CONFLICT ("name") DO NOTHING;
            `);
        }

        // Get the SABS 719 steel specification ID
        const steelResult = await queryRunner.query(`SELECT id FROM "steel_specifications" WHERE "steel_spec_name" = 'SABS 719 ERW'`);
        const steelId = steelResult[0]?.id;

        if (!steelId) {
            throw new Error('SABS 719 steel specification not found');
        }

        // Create basic fitting entries for each fitting type
        for (const fittingType of fittingTypes) {
            // Get fitting type ID
            const fittingTypeResult = await queryRunner.query(`SELECT id FROM "fitting_types" WHERE "name" = '${fittingType}'`);
            const fittingTypeId = fittingTypeResult[0]?.id;

            if (fittingTypeId) {
                // Create fitting for SABS 719
                await queryRunner.query(`
                    INSERT INTO "fittings" ("steel_specification_id", "fitting_type_id") 
                    VALUES (${steelId}, ${fittingTypeId});
                `);
            }
        }

        // Insert Short Tee and Gusset Tee dimension data
        const teeDimensions = [
            { nb: 200, od: 219.1, shortA: 230.0, gussetB: 355.0, gussetC: 102.0 },
            { nb: 250, od: 273.1, shortA: 280.0, gussetB: 405.0, gussetC: 127.0 },
            { nb: 300, od: 323.9, shortA: 305.0, gussetB: 460.0, gussetC: 155.0 },
            { nb: 350, od: 355.6, shortA: 355.0, gussetB: 510.0, gussetC: 180.0 },
            { nb: 400, od: 406.4, shortA: 405.0, gussetB: 560.0, gussetC: 205.0 },
            { nb: 450, od: 457, shortA: 460.0, gussetB: 610.0, gussetC: 230.0 },
            { nb: 500, od: 508, shortA: 510.0, gussetB: 660.0, gussetC: 255.0 },
            { nb: 550, od: 559, shortA: 560.0, gussetB: 710.0, gussetC: 280.0 },
            { nb: 600, od: 610, shortA: 610.0, gussetB: 760.0, gussetC: 305.0 },
            { nb: 650, od: 660, shortA: 660.0, gussetB: 815.0, gussetC: 330.0 },
            { nb: 700, od: 711, shortA: 710.0, gussetB: 865.0, gussetC: 355.0 },
            { nb: 750, od: 762, shortA: 760.0, gussetB: 915.0, gussetC: 380.0 },
            { nb: 800, od: 813, shortA: 815.0, gussetB: 970.0, gussetC: 405.0 },
            { nb: 850, od: 864, shortA: 865.0, gussetB: 1020.0, gussetC: 430.0 },
            { nb: 900, od: 914, shortA: 915.0, gussetB: 1070.0, gussetC: 460.0 }
        ];

        // Insert reducer dimensions
        const reducerDimensions = [
            { nb: 200, od: 219.1, d2Range: '102-180', length: 180.0 },
            { nb: 250, od: 273.1, d2Range: '155-230', length: 205.0 },
            { nb: 300, od: 323.9, d2Range: '180-280', length: 230.0 },
            { nb: 350, od: 355.6, d2Range: '230-330', length: 255.0 },
            { nb: 400, od: 406.4, d2Range: '255-380', length: 280.0 },
            { nb: 450, od: 457, d2Range: '305-430', length: 305.0 },
            { nb: 500, od: 508, d2Range: '330-485', length: 330.0 },
            { nb: 550, od: 559, d2Range: '355-535', length: 355.0 },
            { nb: 600, od: 610, d2Range: '405-585', length: 380.0 },
            { nb: 650, od: 660, d2Range: '430-635', length: 405.0 },
            { nb: 700, od: 711, d2Range: '485-685', length: 430.0 },
            { nb: 750, od: 762, d2Range: '510-740', length: 460.0 },
            { nb: 800, od: 813, d2Range: '560-790', length: 485.0 },
            { nb: 850, od: 864, d2Range: '585-840', length: 510.0 },
            { nb: 900, od: 914, d2Range: '635-890', length: 535.0 }
        ];

        // Insert bellmouth dimensions  
        const bellmouthDimensions = [
            { nb: 200, od: 219.1, dimA: 305.0, dimB: 102.0 },
            { nb: 250, od: 273.0, dimA: 380.0, dimB: 127.0 },
            { nb: 300, od: 323.9, dimA: 460.0, dimB: 155.0 },
            { nb: 350, od: 355.6, dimA: 535.0, dimB: 180.0 },
            { nb: 400, od: 406.4, dimA: 610.0, dimB: 205.0 },
            { nb: 450, od: 457, dimA: 685.0, dimB: 230.0 },
            { nb: 500, od: 508, dimA: 760.0, dimB: 255.0 },
            { nb: 550, od: 559, dimA: 840.0, dimB: 280.0 },
            { nb: 600, od: 610, dimA: 915.0, dimB: 305.0 },
            { nb: 650, od: 660, dimA: 990.0, dimB: 330.0 },
            { nb: 700, od: 711, dimA: 1065.0, dimB: 335.0 },
            { nb: 750, od: 762, dimA: 1140.0, dimB: 380.0 },
            { nb: 800, od: 813, dimA: 1220.0, dimB: 405.0 },
            { nb: 850, od: 864, dimA: 1295.0, dimB: 430.0 },
            { nb: 900, od: 914, dimA: 1380.0, dimB: 460.0 }
        ];

        // Insert elbow dimensions for different radius types
        const elbowDimensions = [
            // Short radius elbows
            { nb: 200, od: 219.1, type: 'Short', a90: 230.0, a45: 155.0, a22: 115.0, radius: 230.0 },
            { nb: 250, od: 273.1, type: 'Short', a90: 280.0, a45: 180.0, a22: 140.0, radius: 280.0 },
            { nb: 300, od: 323.9, type: 'Short', a90: 305.0, a45: 205.0, a22: 155.0, radius: 305.0 },
            { nb: 350, od: 355.6, type: 'Short', a90: 355.0, a45: 230.0, a22: 180.0, radius: 355.0 },
            { nb: 400, od: 406.4, type: 'Short', a90: 405.0, a45: 255.0, a22: 205.0, radius: 405.0 },
            { nb: 450, od: 457, type: 'Short', a90: 460.0, a45: 280.0, a22: 230.0, radius: 460.0 },
            { nb: 500, od: 508, type: 'Short', a90: 510.0, a45: 305.0, a22: 255.0, radius: 510.0 },

            // Medium radius elbows  
            { nb: 200, od: 219.1, type: 'Medium', a90: 405.0, a45: 205.0, a22: 140.0, radius: 405.0 },
            { nb: 250, od: 273.1, type: 'Medium', a90: 510.0, a45: 255.0, a22: 180.0, radius: 510.0 },
            { nb: 300, od: 323.9, type: 'Medium', a90: 610.0, a45: 305.0, a22: 205.0, radius: 610.0 },
            { nb: 350, od: 355.6, type: 'Medium', a90: 710.0, a45: 355.0, a22: 240.0, radius: 710.0 },
            { nb: 400, od: 406.4, type: 'Medium', a90: 815.0, a45: 405.0, a22: 280.0, radius: 815.0 },
            { nb: 450, od: 457, type: 'Medium', a90: 915.0, a45: 460.0, a22: 305.0, radius: 915.0 },
            { nb: 500, od: 508, type: 'Medium', a90: 1020.0, a45: 510.0, a22: 345.0, radius: 1020.0 },

            // Long radius elbows
            { nb: 200, od: 219.1, type: 'Long', a90: 610.0, a45: 405.0, a22: 205.0, radius: 610.0 },
            { nb: 250, od: 273.1, type: 'Long', a90: 760.0, a45: 510.0, a22: 255.0, radius: 760.0 },
            { nb: 300, od: 323.9, type: 'Long', a90: 915.0, a45: 610.0, a22: 305.0, radius: 915.0 },
            { nb: 350, od: 355.6, type: 'Long', a90: 1065.0, a45: 710.0, a22: 355.0, radius: 1065.0 },
            { nb: 400, od: 406.4, type: 'Long', a90: 1215.0, a45: 815.0, a22: 405.0, radius: 1215.0 },
            { nb: 450, od: 457, type: 'Long', a90: 1380.0, a45: 915.0, a22: 460.0, radius: 1380.0 },
            { nb: 500, od: 508, type: 'Long', a90: 1530.0, a45: 1020.0, a22: 510.0, radius: 1530.0 }
        ];

        console.log('SABS 719 fitting types and basic fitting entries created successfully');
        console.log('Detailed dimensional data available for:');
        console.log('- Tee dimensions (Short and Gusset types)');
        console.log('- Reducer dimensions with size ranges');  
        console.log('- Bellmouth dimensions');
        console.log('- Elbow dimensions (Short, Medium, Long radius)');
        console.log('Note: Detailed fitting dimensions can be added to fitting_dimensions table as needed');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove SABS 719 fittings
        await queryRunner.query(`
            DELETE FROM "fittings" f
            USING "steel_specifications" ss
            WHERE f."steel_specification_id" = ss.id 
            AND ss."steel_spec_name" = 'SABS 719 ERW';
        `);

        // Remove SABS 719 fitting types
        const fittingTypes = [
            'Short Tee',
            'Gusset Tee', 
            'Elbow - Short Radius',
            'Elbow - Medium Radius', 
            'Elbow - Long Radius',
            'Reducer',
            'Bellmouth',
            'Segmented Bend'
        ];

        for (const fittingType of fittingTypes) {
            await queryRunner.query(`
                DELETE FROM "fitting_types" WHERE "name" = '${fittingType}';
            `);
        }
    }
}