import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSABS62PipeData1760428500000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Insert SABS 62 steel specifications
        await queryRunner.query(`
            INSERT INTO "steel_specifications" ("steel_spec_name") 
            VALUES 
                ('SABS 62 ERW Medium'),
                ('SABS 62 ERW Heavy')
            ON CONFLICT ("steel_spec_name") DO NOTHING;
        `);

        // Get steel specification IDs
        const mediumSteelResult = await queryRunner.query(`SELECT id FROM "steel_specifications" WHERE "steel_spec_name" = 'SABS 62 ERW Medium'`);
        const heavySteelResult = await queryRunner.query(`SELECT id FROM "steel_specifications" WHERE "steel_spec_name" = 'SABS 62 ERW Heavy'`);
        
        const mediumSteelId = mediumSteelResult[0]?.id;
        const heavySteelId = heavySteelResult[0]?.id;

        if (!mediumSteelId || !heavySteelId) {
            throw new Error('Failed to find SABS 62 steel specifications');
        }

        // SABS 62 Medium grade pipe data
        const mediumPipes = [
            { nb: 15, od: 21.3, mass: 1.123, wallMin: 2.30 },
            { nb: 20, od: 26.9, mass: 1.442, wallMin: 2.30 },
            { nb: 25, od: 33.7, mass: 2.225, wallMin: 2.80 },
            { nb: 32, od: 42.4, mass: 2.843, wallMin: 2.80 },
            { nb: 40, od: 48.3, mass: 3.261, wallMin: 2.80 },
            { nb: 50, od: 60.3, mass: 4.606, wallMin: 3.20 },
            { nb: 65, od: 76.3, mass: 5.869, wallMin: 3.20 },
            { nb: 80, od: 88.9, mass: 7.604, wallMin: 3.50 },
            { nb: 100, od: 114.3, mass: 10.924, wallMin: 3.90 },
            { nb: 125, od: 139.7, mass: 14.447, wallMin: 4.20 },
            { nb: 150, od: 165.1, mass: 17.148, wallMin: 4.20 }
        ];

        // SABS 62 Heavy grade pipe data
        const heavyPipes = [
            { nb: 15, od: 21.3, mass: 1.34, wallMin: 2.80 },
            { nb: 20, od: 26.9, mass: 1.728, wallMin: 2.80 },
            { nb: 25, od: 33.7, mass: 2.711, wallMin: 3.50 },
            { nb: 32, od: 42.4, mass: 3.481, wallMin: 3.50 },
            { nb: 40, od: 48.3, mass: 4.003, wallMin: 3.50 },
            { nb: 50, od: 60.3, mass: 5.598, wallMin: 3.90 },
            { nb: 65, od: 76.1, mass: 7.153, wallMin: 3.90 },
            { nb: 80, od: 88.9, mass: 9.033, wallMin: 4.20 },
            { nb: 100, od: 114.3, mass: 13.021, wallMin: 4.70 },
            { nb: 125, od: 139.7, mass: 16.058, wallMin: 4.70 },
            { nb: 150, od: 165.1, mass: 19.072, wallMin: 4.70 }
        ];

        // Insert nominal outside diameters and pipe dimensions for medium grade
        for (const pipe of mediumPipes) {
            // Insert or get nominal outside diameter
            await queryRunner.query(`
                INSERT INTO "nominal_outside_diameters" ("nominal_diameter_mm", "outside_diameter_mm") 
                VALUES (${pipe.nb}, ${pipe.od})
                ON CONFLICT ("nominal_diameter_mm", "outside_diameter_mm") DO NOTHING;
            `);

            const nominalResult = await queryRunner.query(`
                SELECT id FROM "nominal_outside_diameters" 
                WHERE "nominal_diameter_mm" = ${pipe.nb} AND "outside_diameter_mm" = ${pipe.od}
            `);
            
            const nominalId = nominalResult[0]?.id;
            
            if (nominalId) {
                // Insert pipe dimension
                await queryRunner.query(`
                    INSERT INTO "pipe_dimensions" (
                        "wall_thickness_mm", "internal_diameter_mm", "mass_kgm", 
                        "schedule_designation", "nominal_outside_diameter_id", "steel_specification_id"
                    ) VALUES (
                        ${pipe.wallMin}, 
                        ${pipe.od - (2 * pipe.wallMin)}, 
                        ${pipe.mass},
                        'MEDIUM',
                        ${nominalId},
                        ${mediumSteelId}
                    );
                `);
            }
        }

        // Insert nominal outside diameters and pipe dimensions for heavy grade
        for (const pipe of heavyPipes) {
            // Insert or get nominal outside diameter
            await queryRunner.query(`
                INSERT INTO "nominal_outside_diameters" ("nominal_diameter_mm", "outside_diameter_mm") 
                VALUES (${pipe.nb}, ${pipe.od})
                ON CONFLICT ("nominal_diameter_mm", "outside_diameter_mm") DO NOTHING;
            `);

            const nominalResult = await queryRunner.query(`
                SELECT id FROM "nominal_outside_diameters" 
                WHERE "nominal_diameter_mm" = ${pipe.nb} AND "outside_diameter_mm" = ${pipe.od}
            `);
            
            const nominalId = nominalResult[0]?.id;
            
            if (nominalId) {
                // Insert pipe dimension
                await queryRunner.query(`
                    INSERT INTO "pipe_dimensions" (
                        "wall_thickness_mm", "internal_diameter_mm", "mass_kgm", 
                        "schedule_designation", "nominal_outside_diameter_id", "steel_specification_id"
                    ) VALUES (
                        ${pipe.wallMin}, 
                        ${pipe.od - (2 * pipe.wallMin)}, 
                        ${pipe.mass},
                        'HEAVY',
                        ${nominalId},
                        ${heavySteelId}
                    );
                `);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove SABS 62 pipe dimensions
        await queryRunner.query(`
            DELETE FROM "pipe_dimensions" pd
            USING "steel_specifications" ss
            WHERE pd."steel_specification_id" = ss.id 
            AND ss."steel_spec_name" IN ('SABS 62 ERW Medium', 'SABS 62 ERW Heavy');
        `);

        // Remove SABS 62 steel specifications
        await queryRunner.query(`
            DELETE FROM "steel_specifications" 
            WHERE "steel_spec_name" IN ('SABS 62 ERW Medium', 'SABS 62 ERW Heavy');
        `);
    }
}