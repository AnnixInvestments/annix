import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSABS719PipeData1760428700000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Insert SABS 719 steel specification
        await queryRunner.query(`
            INSERT INTO "steel_specifications" ("steel_spec_name") 
            VALUES ('SABS 719 ERW')
            ON CONFLICT ("steel_spec_name") DO NOTHING;
        `);

        // Get steel specification ID
        const steelResult = await queryRunner.query(`SELECT id FROM "steel_specifications" WHERE "steel_spec_name" = 'SABS 719 ERW'`);
        const steelId = steelResult[0]?.id;

        if (!steelId) {
            throw new Error('Failed to find SABS 719 steel specification');
        }

        // SABS 719 pipe data with weight per meter for different wall thicknesses
        const pipeData = [
            // Format: { nb, od, wallThicknesses: [4.5, 6.0, 8.0, 10, 12, 14, 16, 20, 22], weights: [corresponding weights] }
            { nb: 200, od: 219.1, wallThicknesses: [4.5, 6.0, 8.0, 10, 12], weights: [24.9, 33.1, 43.6, 54.2, 64.6] },
            { nb: 250, od: 273.1, wallThicknesses: [4.5, 6.0, 8.0, 10, 12, 14, 16], weights: [31.2, 41.4, 54.7, 68.0, 81.5, 94, 106] },
            { nb: 300, od: 323.9, wallThicknesses: [4.5, 6.0, 8.0, 10, 12, 14, 16, 20], weights: [37.1, 49.3, 65.2, 81.3, 97.5, 113, 127, 158] },
            { nb: 350, od: 355.6, wallThicknesses: [4.5, 6.0, 8.0, 10, 12, 14, 16, 20], weights: [40.7, 54.2, 71.7, 89.5, 108, 124, 140, 174] },
            { nb: 400, od: 406.4, wallThicknesses: [4.5, 6.0, 8.0, 10, 12, 14, 16, 20], weights: [46.6, 62.1, 82.2, 103, 123, 143, 161, 200] },
            { nb: 450, od: 457, wallThicknesses: [4.5, 6.0, 8.0, 10, 12, 14, 16, 20], weights: [52.6, 70.0, 92.6, 115, 139, 161, 182, 227] },
            { nb: 500, od: 508, wallThicknesses: [4.5, 6.0, 8.0, 10, 12, 14, 16, 20], weights: [58.5, 78.0, 103, 129, 155, 179, 203, 253] },
            { nb: 550, od: 559, wallThicknesses: [4.5, 6.0, 8.0, 10, 12, 14, 16, 20, 22], weights: [64.4, 85.8, 113, 142, 172, 198, 223, 280, 309] },
            { nb: 600, od: 610, wallThicknesses: [4.5, 6.0, 8.0, 10, 12, 14, 16, 20, 22], weights: [70.2, 93.6, 124, 155, 186, 216, 245, 305, 338] },
            { nb: 650, od: 660, wallThicknesses: [4.5, 6.0, 8.0, 10, 12, 14, 16, 20, 22], weights: [76.1, 101, 134, 168, 203, 235, 267, 332, 366] },
            { nb: 700, od: 711, wallThicknesses: [4.5, 6.0, 8.0, 10, 12, 14, 16, 20, 22], weights: [82.0, 110, 145, 182, 219, 253, 287, 358, 396] },
            { nb: 750, od: 762, wallThicknesses: [6.0, 8.0, 10, 12, 14, 16, 20, 22], weights: [117, 155, 194, 235, 272, 308, 384, 425] },
            { nb: 800, od: 813, wallThicknesses: [6.0, 8.0, 10, 12, 14, 16, 20, 22], weights: [125, 166, 208, 250, 290, 327, 410, 455] },
            { nb: 850, od: 864, wallThicknesses: [6.0, 8.0, 10, 12, 14, 16, 20, 22], weights: [133, 176, 220, 266, 308, 349, 437, 484] },
            { nb: 900, od: 914, wallThicknesses: [6.0, 8.0, 10, 12, 14, 16, 20, 22], weights: [140, 187, 233, 282, 327, 371, 463, 508] },
            { nb: 950, od: 965, wallThicknesses: [6.0, 8.0, 10, 12, 14, 16, 20, 22], weights: [149, 198, 247, 296, 345, 393, 489, 537] },
            { nb: 1000, od: 1016, wallThicknesses: [6.0, 8.0, 10, 12, 14, 16, 20, 22], weights: [156, 208, 260, 315, 371, 413, 516, 567] },
            { nb: 1050, od: 1067, wallThicknesses: [6.0, 8.0, 10, 12, 14, 16, 20, 22], weights: [165, 219, 274, 327, 381, 435, 542, 594] },
            { nb: 1100, od: 1092, wallThicknesses: [6.0, 8.0, 10, 12, 14, 16, 20, 22], weights: [169, 224, 280, 335, 390, 446, 555, 609] },
            { nb: 1150, od: 1118, wallThicknesses: [6.0, 8.0, 10, 12, 14, 16, 20, 22], weights: [173, 230, 287, 344, 400, 455, 569, 624] },
            { nb: 1200, od: 1219, wallThicknesses: [6.0, 8.0, 10, 12, 14, 16, 20, 22], weights: [188, 251, 313, 375, 437, 499, 621, 682] },
            { nb: 1250, od: 1245, wallThicknesses: [6.0, 8.0, 10, 12, 14, 16, 20, 22], weights: [192, 256, 320, 383, 445, 509, 634, 697] },
            { nb: 1300, od: 1397, wallThicknesses: [6.0, 8.0, 10, 12, 14, 16, 20, 22], weights: [216, 288, 359, 430, 501, 572, 713, 783] },
            { nb: 1400, od: 1422, wallThicknesses: [6.0, 8.0, 10, 12, 14, 16, 20, 22], weights: [220, 292, 365, 437, 510, 587, 725, 796] },
            { nb: 1500, od: 1549, wallThicknesses: [8.0, 10, 12, 14, 16, 20, 22], weights: [319, 398, 477, 560, 635, 792, 869] },
            { nb: 1600, od: 1626, wallThicknesses: [8.0, 10, 12, 14, 16, 20, 22], weights: [334, 417, 499, 582, 664, 829, 910] },
            { nb: 1700, od: 1727, wallThicknesses: [8.0, 10, 12, 14, 16, 20, 22], weights: [352, 440, 527, 614, 701, 874, 960] },
            { nb: 1800, od: 1829, wallThicknesses: [8.0, 10, 12, 14, 16, 20, 22], weights: [375, 469, 562, 655, 747, 932, 1024] },
            { nb: 1900, od: 1930, wallThicknesses: [10, 12, 14, 16, 20, 22], weights: [479, 574, 669, 764, 953, 1046] },
            { nb: 2000, od: 2032, wallThicknesses: [10, 12, 14, 16, 20, 22], weights: [520, 624, 726, 830, 1036, 1138] },
            { nb: 2100, od: 2178, wallThicknesses: [10, 12, 14, 16, 20, 22], weights: [561, 673, 785, 896, 1118, 1228] },
            { nb: 2200, od: 2230, wallThicknesses: [10, 12, 14, 16, 20, 22], weights: [575, 689, 803, 917, 1144, 1257] }
        ];

        // Insert pipe dimensions for each wall thickness
        for (const pipe of pipeData) {
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
                // Insert pipe dimension for each wall thickness
                for (let i = 0; i < pipe.wallThicknesses.length; i++) {
                    const wallThickness = pipe.wallThicknesses[i];
                    const weight = pipe.weights[i];
                    const internalDiameter = pipe.od - (2 * wallThickness);

                    await queryRunner.query(`
                        INSERT INTO "pipe_dimensions" (
                            "wall_thickness_mm", "internal_diameter_mm", "mass_kgm", 
                            "schedule_designation", "nominal_outside_diameter_id", "steel_specification_id"
                        ) VALUES (
                            ${wallThickness}, 
                            ${internalDiameter}, 
                            ${weight},
                            'WT${wallThickness}',
                            ${nominalId},
                            ${steelId}
                        );
                    `);
                }
            }
        }

        // Insert test pressure data for pipes up to 1000mm
        const pressureData = [
            { nb: 200, od: 219.1, pressures: { '4.0': 6600, '4.5': 7430, '5.0': 8250, '6.0': 9900, '8.0': 13200, '10.0': 16500, '12.0': 19800, '14.0': 23100 } },
            { nb: 250, od: 273.1, pressures: { '4.0': 5300, '4.5': 5960, '5.0': 6620, '6.0': 7950, '8.0': 10590, '10.0': 13240, '12.0': 15890, '14.0': 18540 } },
            { nb: 300, od: 323.9, pressures: { '4.0': 4460, '4.5': 5020, '5.0': 5580, '6.0': 6700, '8.0': 8930, '10.0': 11160, '12.0': 13390, '14.0': 15630 } },
            { nb: 350, od: 355.6, pressures: { '4.0': 4070, '4.5': 4580, '5.0': 5080, '6.0': 6100, '8.0': 8130, '10.0': 10170, '12.0': 12200, '14.0': 14230 } },
            { nb: 400, od: 406.4, pressures: { '4.0': 3560, '4.5': 4000, '5.0': 4450, '6.0': 5340, '8.0': 7120, '10.0': 8900, '12.0': 10670, '14.0': 12450 } },
            { nb: 450, od: 457, pressures: { '4.0': 3160, '4.5': 3560, '5.0': 3960, '6.0': 4750, '8.0': 6330, '10.0': 6910, '12.0': 9490, '14.0': 11070 } },
            { nb: 500, od: 508, pressures: { '4.0': 2850, '4.5': 3200, '5.0': 3560, '6.0': 4270, '8.0': 5690, '10.0': 7120, '12.0': 8540, '14.0': 9960 } },
            { nb: 550, od: 559, pressures: { '4.0': 2590, '4.5': 2910, '5.0': 3240, '6.0': 3880, '8.0': 5180, '10.0': 6470, '12.0': 7760, '14.0': 9060 } },
            { nb: 600, od: 610, pressures: { '4.0': 2370, '4.5': 2670, '5.0': 2970, '6.0': 3560, '8.0': 4740, '10.0': 5930, '12.0': 7120, '14.0': 8300 } },
            { nb: 650, od: 660, pressures: { '4.0': 2190, '4.5': 2460, '5.0': 2740, '6.0': 3290, '8.0': 4380, '10.0': 5480, '12.0': 6570, '14.0': 7670 } },
            { nb: 700, od: 711, pressures: { '4.0': 2030, '4.5': 2290, '5.0': 2540, '6.0': 3050, '8.0': 4070, '10.0': 5080, '12.0': 6100, '14.0': 7120 } },
            { nb: 750, od: 762, pressures: { '4.0': 1900, '4.5': 2140, '5.0': 2370, '6.0': 2850, '8.0': 3800, '10.0': 4740, '12.0': 5690, '14.0': 6640 } },
            { nb: 800, od: 813, pressures: { '4.0': 1780, '4.5': 2000, '5.0': 2220, '6.0': 2670, '8.0': 3560, '10.0': 4450, '12.0': 5340, '14.0': 6230 } },
            { nb: 850, od: 864, pressures: { '4.0': 1670, '4.5': 1880, '5.0': 2090, '6.0': 2510, '8.0': 3350, '10.0': 4190, '12.0': 5020, '14.0': 5860 } },
            { nb: 900, od: 914, pressures: { '4.0': 1580, '4.5': 1780, '5.0': 1980, '6.0': 2370, '8.0': 3160, '10.0': 3960, '12.0': 4750, '14.0': 5540 } },
            { nb: 950, od: 965, pressures: { '4.0': 1500, '4.5': 1690, '5.0': 1870, '6.0': 2250, '8.0': 3000, '10.0': 3750, '12.0': 4500, '14.0': 5240 } },
            { nb: 1000, od: 1016, pressures: { '4.0': 1420, '4.5': 1600, '5.0': 1780, '6.0': 2140, '8.0': 2850, '10.0': 3560, '12.0': 4270, '14.0': 4980 } }
        ];

        // Insert pressure ratings for each wall thickness (at 20°C standard temperature)
        for (const pipe of pressureData) {
            const nominalResult = await queryRunner.query(`
                SELECT id FROM "nominal_outside_diameters" 
                WHERE "nominal_diameter_mm" = ${pipe.nb} AND "outside_diameter_mm" = ${pipe.od}
            `);
            
            const nominalId = nominalResult[0]?.id;
            
            if (nominalId) {
                for (const [wallThickness, pressure] of Object.entries(pipe.pressures)) {
                    // Find the pipe dimension for this wall thickness
                    const dimensionResult = await queryRunner.query(`
                        SELECT id FROM "pipe_dimensions" 
                        WHERE "nominal_outside_diameter_id" = ${nominalId} 
                        AND "steel_specification_id" = ${steelId}
                        AND "wall_thickness_mm" = ${wallThickness}
                    `);

                    const dimensionId = dimensionResult[0]?.id;

                    if (dimensionId) {
                        // Converting kPa to MPa (1 kPa = 0.001 MPa) and using standard allowable stress
                        await queryRunner.query(`
                            INSERT INTO "pipe_pressures" (
                                "pipeDimensionId", "temperature_c", "max_working_pressure_mpa", "allowable_stress_mpa"
                            ) VALUES (
                                ${dimensionId}, 20, ${(pressure * 0.001).toFixed(3)}, 180.75
                            );
                        `);
                    }
                }
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove SABS 719 pressure data
        await queryRunner.query(`
            DELETE FROM "pipe_pressures" pp
            USING "pipe_dimensions" pd, "steel_specifications" ss
            WHERE pp."pipeDimensionId" = pd.id 
            AND pd."steel_specification_id" = ss.id
            AND ss."steel_spec_name" = 'SABS 719 ERW';
        `);

        // Remove SABS 719 pipe dimensions
        await queryRunner.query(`
            DELETE FROM "pipe_dimensions" pd
            USING "steel_specifications" ss
            WHERE pd."steel_specification_id" = ss.id 
            AND ss."steel_spec_name" = 'SABS 719 ERW';
        `);

        // Remove SABS 719 steel specification
        await queryRunner.query(`
            DELETE FROM "steel_specifications" 
            WHERE "steel_spec_name" = 'SABS 719 ERW';
        `);
    }
}