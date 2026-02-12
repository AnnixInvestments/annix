import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSABS719ERWPipeAndFittingData1762268000000 implements MigrationInterface {
    name = 'AddSABS719ERWPipeAndFittingData1762268000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🔧 Adding SABS 719 ERW pipe and fitting data...');

        // Get SABS 719 ERW steel specification ID
        const sabs719Result = await queryRunner.query(`
            SELECT id FROM steel_specifications WHERE steel_spec_name = 'SABS 719 ERW'
        `);
        
        if (!sabs719Result.length) {
            console.error('SABS 719 ERW steel specification not found');
            return;
        }
        
        const steelSpecId = sabs719Result[0].id;

        // First, clear any existing SABS 719 ERW data
        await queryRunner.query(`
            DELETE FROM fitting_dimensions 
            WHERE fitting_variant_id IN (
                SELECT fv.id FROM fitting_variants fv
                INNER JOIN fittings f ON fv.fitting_id = f.id
                WHERE f.steel_specification_id = ${steelSpecId}
            )
        `);
        
        await queryRunner.query(`
            DELETE FROM fitting_variants 
            WHERE fitting_id IN (
                SELECT id FROM fittings 
                WHERE steel_specification_id = ${steelSpecId}
            )
        `);
        
        await queryRunner.query(`
            DELETE FROM fittings 
            WHERE steel_specification_id = ${steelSpecId}
        `);
        
        await queryRunner.query(`
            DELETE FROM pipe_dimensions 
            WHERE steel_specification_id = ${steelSpecId}
        `);

        console.log('🗑️  Cleared existing SABS 719 ERW data');

        // SABS 719 ERW pipe data: [nominalDiameter, outsideDiameter, wallThickness, massPerMeter]
        const sabs719PipeData = [
            // Wall thickness variations for each nominal diameter
            [200, 219.1, 4.5, 24.9],
            [200, 219.1, 6.0, 33.1],
            [200, 219.1, 8.0, 43.6],
            [200, 219.1, 10.0, 54.2],
            [200, 219.1, 12.0, 64.6],
            
            [250, 273.1, 4.5, 31.2],
            [250, 273.1, 6.0, 41.4],
            [250, 273.1, 8.0, 54.7],
            [250, 273.1, 10.0, 68.0],
            [250, 273.1, 12.0, 81.5],
            [250, 273.1, 14.0, 94.0],
            [250, 273.1, 16.0, 106.0],
            
            [300, 323.9, 4.5, 37.1],
            [300, 323.9, 6.0, 49.3],
            [300, 323.9, 8.0, 65.2],
            [300, 323.9, 10.0, 81.3],
            [300, 323.9, 12.0, 97.5],
            [300, 323.9, 14.0, 113.0],
            [300, 323.9, 16.0, 127.0],
            [300, 323.9, 20.0, 158.0],
            
            [350, 355.6, 4.5, 40.7],
            [350, 355.6, 6.0, 54.2],
            [350, 355.6, 8.0, 71.7],
            [350, 355.6, 10.0, 89.5],
            [350, 355.6, 12.0, 108.0],
            [350, 355.6, 14.0, 124.0],
            [350, 355.6, 16.0, 140.0],
            [350, 355.6, 20.0, 174.0],
            
            [400, 406.4, 4.5, 46.6],
            [400, 406.4, 6.0, 62.1],
            [400, 406.4, 8.0, 82.2],
            [400, 406.4, 10.0, 103.0],
            [400, 406.4, 12.0, 123.0],
            [400, 406.4, 14.0, 143.0],
            [400, 406.4, 16.0, 161.0],
            [400, 406.4, 20.0, 200.0],
            
            [450, 457.0, 4.5, 52.6],
            [450, 457.0, 6.0, 70.0],
            [450, 457.0, 8.0, 92.6],
            [450, 457.0, 10.0, 115.0],
            [450, 457.0, 12.0, 139.0],
            [450, 457.0, 14.0, 161.0],
            [450, 457.0, 16.0, 182.0],
            [450, 457.0, 20.0, 227.0],
            
            [500, 508.0, 4.5, 58.5],
            [500, 508.0, 6.0, 78.0],
            [500, 508.0, 8.0, 103.0],
            [500, 508.0, 10.0, 129.0],
            [500, 508.0, 12.0, 155.0],
            [500, 508.0, 14.0, 179.0],
            [500, 508.0, 16.0, 203.0],
            [500, 508.0, 20.0, 253.0],
            
            [550, 559.0, 4.5, 64.4],
            [550, 559.0, 6.0, 85.8],
            [550, 559.0, 8.0, 113.0],
            [550, 559.0, 10.0, 142.0],
            [550, 559.0, 12.0, 172.0],
            [550, 559.0, 14.0, 198.0],
            [550, 559.0, 16.0, 223.0],
            [550, 559.0, 20.0, 280.0],
            [550, 559.0, 22.0, 309.0],
            
            [600, 610.0, 4.5, 70.2],
            [600, 610.0, 6.0, 93.6],
            [600, 610.0, 8.0, 124.0],
            [600, 610.0, 10.0, 155.0],
            [600, 610.0, 12.0, 186.0],
            [600, 610.0, 14.0, 216.0],
            [600, 610.0, 16.0, 245.0],
            [600, 610.0, 20.0, 305.0],
            [600, 610.0, 22.0, 338.0],
            
            [650, 660.0, 4.5, 76.1],
            [650, 660.0, 6.0, 101.0],
            [650, 660.0, 8.0, 134.0],
            [650, 660.0, 10.0, 168.0],
            [650, 660.0, 12.0, 203.0],
            [650, 660.0, 14.0, 235.0],
            [650, 660.0, 16.0, 267.0],
            [650, 660.0, 20.0, 332.0],
            [650, 660.0, 22.0, 366.0],
            
            [700, 711.0, 4.5, 82.0],
            [700, 711.0, 6.0, 110.0],
            [700, 711.0, 8.0, 145.0],
            [700, 711.0, 10.0, 182.0],
            [700, 711.0, 12.0, 219.0],
            [700, 711.0, 14.0, 253.0],
            [700, 711.0, 16.0, 287.0],
            [700, 711.0, 20.0, 358.0],
            [700, 711.0, 22.0, 396.0],
            
            [750, 762.0, 6.0, 117.0],
            [750, 762.0, 8.0, 155.0],
            [750, 762.0, 10.0, 194.0],
            [750, 762.0, 12.0, 235.0],
            [750, 762.0, 14.0, 272.0],
            [750, 762.0, 16.0, 308.0],
            [750, 762.0, 20.0, 384.0],
            [750, 762.0, 22.0, 425.0],
            
            [800, 813.0, 6.0, 125.0],
            [800, 813.0, 8.0, 166.0],
            [800, 813.0, 10.0, 208.0],
            [800, 813.0, 12.0, 250.0],
            [800, 813.0, 14.0, 290.0],
            [800, 813.0, 16.0, 327.0],
            [800, 813.0, 20.0, 410.0],
            [800, 813.0, 22.0, 455.0],
            
            [850, 864.0, 6.0, 133.0],
            [850, 864.0, 8.0, 176.0],
            [850, 864.0, 10.0, 220.0],
            [850, 864.0, 12.0, 266.0],
            [850, 864.0, 14.0, 308.0],
            [850, 864.0, 16.0, 349.0],
            [850, 864.0, 20.0, 437.0],
            [850, 864.0, 22.0, 484.0],
            
            [900, 914.0, 6.0, 140.0],
            [900, 914.0, 8.0, 187.0],
            [900, 914.0, 10.0, 233.0],
            [900, 914.0, 12.0, 282.0],
            [900, 914.0, 14.0, 327.0],
            [900, 914.0, 16.0, 371.0],
            [900, 914.0, 20.0, 463.0],
            [900, 914.0, 22.0, 508.0],
            
            [950, 965.0, 6.0, 149.0],
            [950, 965.0, 8.0, 198.0],
            [950, 965.0, 10.0, 247.0],
            [950, 965.0, 12.0, 296.0],
            [950, 965.0, 14.0, 345.0],
            [950, 965.0, 16.0, 393.0],
            [950, 965.0, 20.0, 489.0],
            [950, 965.0, 22.0, 537.0],
            
            [1000, 1016.0, 6.0, 156.0],
            [1000, 1016.0, 8.0, 208.0],
            [1000, 1016.0, 10.0, 260.0],
            [1000, 1016.0, 12.0, 315.0],
            [1000, 1016.0, 14.0, 371.0],
            [1000, 1016.0, 16.0, 413.0],
            [1000, 1016.0, 20.0, 516.0],
            [1000, 1016.0, 22.0, 567.0],
            
            [1050, 1067.0, 6.0, 165.0],
            [1050, 1067.0, 8.0, 219.0],
            [1050, 1067.0, 10.0, 274.0],
            [1050, 1067.0, 12.0, 327.0],
            [1050, 1067.0, 14.0, 381.0],
            [1050, 1067.0, 16.0, 435.0],
            [1050, 1067.0, 20.0, 542.0],
            [1050, 1067.0, 22.0, 594.0],
            
            [1100, 1092.0, 6.0, 169.0],
            [1100, 1092.0, 8.0, 224.0],
            [1100, 1092.0, 10.0, 280.0],
            [1100, 1092.0, 12.0, 335.0],
            [1100, 1092.0, 14.0, 390.0],
            [1100, 1092.0, 16.0, 446.0],
            [1100, 1092.0, 20.0, 555.0],
            [1100, 1092.0, 22.0, 609.0],
            
            [1150, 1118.0, 6.0, 173.0],
            [1150, 1118.0, 8.0, 230.0],
            [1150, 1118.0, 10.0, 287.0],
            [1150, 1118.0, 12.0, 344.0],
            [1150, 1118.0, 14.0, 400.0],
            [1150, 1118.0, 16.0, 455.0],
            [1150, 1118.0, 20.0, 569.0],
            [1150, 1118.0, 22.0, 624.0],
            
            [1200, 1219.0, 6.0, 188.0],
            [1200, 1219.0, 8.0, 251.0],
            [1200, 1219.0, 10.0, 313.0],
            [1200, 1219.0, 12.0, 375.0],
            [1200, 1219.0, 14.0, 437.0],
            [1200, 1219.0, 16.0, 499.0],
            [1200, 1219.0, 20.0, 621.0],
            [1200, 1219.0, 22.0, 682.0],
            
            [1250, 1245.0, 6.0, 192.0],
            [1250, 1245.0, 8.0, 256.0],
            [1250, 1245.0, 10.0, 320.0],
            [1250, 1245.0, 12.0, 383.0],
            [1250, 1245.0, 14.0, 445.0],
            [1250, 1245.0, 16.0, 509.0],
            [1250, 1245.0, 20.0, 634.0],
            [1250, 1245.0, 22.0, 697.0],
            
            [1300, 1397.0, 6.0, 216.0],
            [1300, 1397.0, 8.0, 288.0],
            [1300, 1397.0, 10.0, 359.0],
            [1300, 1397.0, 12.0, 430.0],
            [1300, 1397.0, 14.0, 501.0],
            [1300, 1397.0, 16.0, 572.0],
            [1300, 1397.0, 20.0, 713.0],
            [1300, 1397.0, 22.0, 783.0],
            
            [1400, 1422.0, 6.0, 220.0],
            [1400, 1422.0, 8.0, 292.0],
            [1400, 1422.0, 10.0, 365.0],
            [1400, 1422.0, 12.0, 437.0],
            [1400, 1422.0, 14.0, 510.0],
            [1400, 1422.0, 16.0, 587.0],
            [1400, 1422.0, 20.0, 725.0],
            [1400, 1422.0, 22.0, 796.0],
            
            [1500, 1549.0, 8.0, 319.0],
            [1500, 1549.0, 10.0, 398.0],
            [1500, 1549.0, 12.0, 477.0],
            [1500, 1549.0, 14.0, 560.0],
            [1500, 1549.0, 16.0, 635.0],
            [1500, 1549.0, 20.0, 792.0],
            [1500, 1549.0, 22.0, 869.0],
            
            [1600, 1626.0, 8.0, 334.0],
            [1600, 1626.0, 10.0, 417.0],
            [1600, 1626.0, 12.0, 499.0],
            [1600, 1626.0, 14.0, 582.0],
            [1600, 1626.0, 16.0, 664.0],
            [1600, 1626.0, 20.0, 829.0],
            [1600, 1626.0, 22.0, 910.0],
            
            [1700, 1727.0, 8.0, 352.0],
            [1700, 1727.0, 10.0, 440.0],
            [1700, 1727.0, 12.0, 527.0],
            [1700, 1727.0, 14.0, 614.0],
            [1700, 1727.0, 16.0, 701.0],
            [1700, 1727.0, 20.0, 874.0],
            [1700, 1727.0, 22.0, 960.0],
            
            [1800, 1829.0, 8.0, 375.0],
            [1800, 1829.0, 10.0, 469.0],
            [1800, 1829.0, 12.0, 562.0],
            [1800, 1829.0, 14.0, 655.0],
            [1800, 1829.0, 16.0, 747.0],
            [1800, 1829.0, 20.0, 932.0],
            [1800, 1829.0, 22.0, 1024.0],
            
            [1900, 1930.0, 10.0, 479.0],
            [1900, 1930.0, 12.0, 574.0],
            [1900, 1930.0, 14.0, 669.0],
            [1900, 1930.0, 16.0, 764.0],
            [1900, 1930.0, 20.0, 953.0],
            [1900, 1930.0, 22.0, 1046.0],
            
            [2000, 2032.0, 10.0, 520.0],
            [2000, 2032.0, 12.0, 624.0],
            [2000, 2032.0, 14.0, 726.0],
            [2000, 2032.0, 16.0, 830.0],
            [2000, 2032.0, 20.0, 1036.0],
            [2000, 2032.0, 22.0, 1138.0],
            
            [2100, 2178.0, 10.0, 561.0],
            [2100, 2178.0, 12.0, 673.0],
            [2100, 2178.0, 14.0, 785.0],
            [2100, 2178.0, 16.0, 896.0],
            [2100, 2178.0, 20.0, 1118.0],
            [2100, 2178.0, 22.0, 1228.0],
            
            [2200, 2230.0, 10.0, 575.0],
            [2200, 2230.0, 12.0, 689.0],
            [2200, 2230.0, 14.0, 803.0],
            [2200, 2230.0, 16.0, 917.0],
            [2200, 2230.0, 20.0, 1144.0],
            [2200, 2230.0, 22.0, 1257.0]
        ];

        // Insert nominal outside diameters for SABS 719 ERW
        const uniqueDiameters = [...new Set(sabs719PipeData.map(([nominal, outside]) => [nominal, outside]))];
        for (const [nominalDiameter, outsideDiameter] of uniqueDiameters) {
            await queryRunner.query(`
                INSERT INTO nominal_outside_diameters (nominal_diameter_mm, outside_diameter_mm)
                VALUES (${nominalDiameter}, ${outsideDiameter})
                ON CONFLICT (nominal_diameter_mm, outside_diameter_mm) DO NOTHING
            `);
        }

        console.log('📏 Ensured all SABS 719 ERW nominal outside diameters exist');

        // Insert pipe dimensions
        for (const [nominalDiameter, outsideDiameter, wallThickness, massPerMeter] of sabs719PipeData) {
            const nominalResult = await queryRunner.query(`
                SELECT id FROM nominal_outside_diameters 
                WHERE nominal_diameter_mm = ${nominalDiameter} AND outside_diameter_mm = ${outsideDiameter}
            `);
            
            if (nominalResult.length > 0) {
                const nominalId = nominalResult[0].id;
                const internalDiameter = outsideDiameter - (2 * wallThickness);
                
                await queryRunner.query(`
                    INSERT INTO pipe_dimensions (
                        wall_thickness_mm,
                        internal_diameter_mm,
                        mass_kgm,
                        schedule_designation,
                        schedule_number,
                        nominal_outside_diameter_id,
                        steel_specification_id
                    ) VALUES (
                        ${wallThickness},
                        ${internalDiameter},
                        ${massPerMeter},
                        'WT${wallThickness}',
                        NULL,
                        ${nominalId},
                        ${steelSpecId}
                    )
                `);
            }
        }

        console.log(`✅ Inserted SABS 719 ERW pipe data (${sabs719PipeData.length} entries)`);

        // Insert fitting types for SABS 719 ERW
        const fittingTypes = [
            'Short Tee',
            'Gusset Tee',
            'Long Radius Elbow',
            'Medium Radius Elbow',
            'Short Radius Elbow',
            'Reducer',
            'Bellmouth'
        ];

        for (const fittingType of fittingTypes) {
            await queryRunner.query(`
                INSERT INTO fitting_types (name)
                VALUES ('${fittingType}')
                ON CONFLICT (name) DO NOTHING
            `);
        }

        console.log('✅ Ensured SABS 719 ERW fitting types exist');

        // Get fitting type IDs
        const fittingTypeIds = {};
        for (const fittingType of fittingTypes) {
            const result = await queryRunner.query(`
                SELECT id FROM fitting_types WHERE name = '${fittingType}'
            `);
            if (result.length > 0) {
                fittingTypeIds[fittingType] = result[0].id;
            }
        }

        // SABS 719 ERW fitting dimensions data
        const sabs719FittingData = [
            // Short Tees [nominalDiameter, outsideDiameter, A, B, C]
            ...[[200, 219.1, 230.0, 355.0, 102.0],
                [250, 273.1, 280.0, 405.0, 127.0],
                [300, 323.9, 305.0, 460.0, 155.0],
                [350, 355.6, 355.0, 510.0, 180.0],
                [400, 406.4, 405.0, 560.0, 205.0],
                [450, 457.0, 460.0, 610.0, 230.0],
                [500, 508.0, 510.0, 660.0, 255.0],
                [550, 559.0, 560.0, 710.0, 280.0],
                [600, 610.0, 610.0, 760.0, 305.0],
                [650, 660.0, 660.0, 815.0, 330.0],
                [700, 711.0, 710.0, 865.0, 355.0],
                [750, 762.0, 760.0, 915.0, 380.0],
                [800, 813.0, 815.0, 970.0, 405.0],
                [850, 864.0, 865.0, 1020.0, 430.0],
                [900, 914.0, 915.0, 1070.0, 460.0]].map(row => ['Short Tee', ...row]),
            
            // Long Radius Elbows [nominalDiameter, outsideDiameter, A, B, C, radius]
            ...[[200, 219.1, 610.0, 815.0, 405.0, 610.0],
                [250, 273.1, 760.0, 1020.0, 510.0, 760.0],
                [300, 323.9, 915.0, 1220.0, 610.0, 915.0],
                [350, 355.6, 1070.0, 1420.0, 710.0, 1070.0],
                [400, 406.4, 1215.0, 1630.0, 815.0, 1215.0],
                [450, 457.0, 1380.0, 1830.0, 915.0, 1380.0],
                [500, 508.0, 1530.0, 2040.0, 1020.0, 1530.0],
                [550, 559.0, 1680.0, 2240.0, 1120.0, 1680.0],
                [600, 610.0, 1830.0, 2440.0, 1220.0, 1830.0],
                [650, 660.0, 1980.0, 2640.0, 1320.0, 1980.0],
                [700, 711.0, 2130.0, 2840.0, 1420.0, 2130.0],
                [750, 762.0, 2280.0, 3040.0, 1520.0, 2280.0],
                [800, 813.0, 2445.0, 3260.0, 1630.0, 2445.0],
                [850, 864.0, 2595.0, 3460.0, 1730.0, 2595.0],
                [900, 914.0, 2745.0, 3660.0, 1830.0, 2745.0]].map(row => ['Long Radius Elbow', ...row]),
            
            // Medium Radius Elbows
            ...[[200, 219.1, 405.0, 205.0, 140.0, 405.0],
                [250, 273.1, 510.0, 255.0, 180.0, 510.0],
                [300, 323.9, 610.0, 305.0, 205.0, 610.0],
                [350, 355.6, 710.0, 355.0, 240.0, 710.0],
                [400, 406.4, 815.0, 405.0, 280.0, 815.0],
                [450, 457.0, 915.0, 460.0, 305.0, 915.0],
                [500, 508.0, 1020.0, 510.0, 345.0, 1020.0],
                [550, 559.0, 1120.0, 560.0, 380.0, 1120.0],
                [600, 610.0, 1220.0, 610.0, 405.0, 1220.0],
                [650, 660.0, 1320.0, 660.0, 445.0, 1320.0],
                [700, 711.0, 1420.0, 710.0, 485.0, 1420.0],
                [750, 762.0, 1520.0, 760.0, 510.0, 1520.0],
                [800, 813.0, 1630.0, 815.0, 545.0, 1630.0],
                [850, 864.0, 1730.0, 865.0, 585.0, 1730.0],
                [900, 914.0, 1830.0, 915.0, 610.0, 1830.0]].map(row => ['Medium Radius Elbow', ...row]),
            
            // Short Radius Elbows
            ...[[200, 219.1, 230.0, 155.0, 115.0, 230.0],
                [250, 273.1, 280.0, 180.0, 140.0, 280.0],
                [300, 323.9, 305.0, 205.0, 155.0, 305.0],
                [350, 355.6, 355.0, 230.0, 180.0, 355.0],
                [400, 406.4, 405.0, 255.0, 205.0, 405.0],
                [450, 457.0, 460.0, 280.0, 230.0, 460.0],
                [500, 508.0, 510.0, 305.0, 255.0, 510.0],
                [550, 559.0, 560.0, 330.0, 280.0, 560.0],
                [600, 610.0, 610.0, 355.0, 305.0, 610.0],
                [650, 660.0, 660.0, 380.0, 330.0, 660.0],
                [700, 711.0, 710.0, 405.0, 355.0, 710.0],
                [750, 762.0, 760.0, 430.0, 380.0, 760.0],
                [800, 813.0, 815.0, 460.0, 405.0, 815.0],
                [850, 864.0, 865.0, 485.0, 430.0, 865.0],
                [900, 914.0, 915.0, 510.0, 460.0, 915.0]].map(row => ['Short Radius Elbow', ...row])
        ];

        // Insert fitting dimensions
        for (const [fittingType, nominalDiameter, outsideDiameter, ...dimensions] of sabs719FittingData) {
            const nominalResult = await queryRunner.query(`
                SELECT id FROM nominal_outside_diameters 
                WHERE nominal_diameter_mm = ${nominalDiameter} AND outside_diameter_mm = ${outsideDiameter}
            `);
            
            if (nominalResult.length > 0 && fittingTypeIds[fittingType as string]) {
                const nominalId = nominalResult[0].id;
                const fittingTypeId = fittingTypeIds[fittingType as string];
                const fittingTypeName = String(fittingType);
                
                // First, create or get the fitting
                let fittingResult = await queryRunner.query(`
                    SELECT id FROM fittings 
                    WHERE steel_specification_id = ${steelSpecId} AND fitting_type_id = ${fittingTypeId}
                `);
                
                let fittingId;
                if (fittingResult.length === 0) {
                    const insertFittingResult = await queryRunner.query(`
                        INSERT INTO fittings (steel_specification_id, fitting_type_id)
                        VALUES (${steelSpecId}, ${fittingTypeId})
                        RETURNING id
                    `);
                    fittingId = insertFittingResult[0].id;
                } else {
                    fittingId = fittingResult[0].id;
                }
                
                // Create fitting variant
                const variantResult = await queryRunner.query(`
                    INSERT INTO fitting_variants (fitting_id)
                    VALUES (${fittingId})
                    RETURNING id
                `);
                const variantId = variantResult[0].id;
                
                // Insert dimensions as separate records
                const dimensionNames = ['A', 'B', 'C'];
                if (fittingTypeName.includes('Elbow')) {
                    dimensionNames.push('Radius');
                }
                
                for (let i = 0; i < dimensions.length && i < dimensionNames.length; i++) {
                    if (dimensions[i] != null) {
                        await queryRunner.query(`
                            INSERT INTO fitting_dimensions (
                                dimension_name,
                                dimension_value_mm,
                                fitting_variant_id
                            ) VALUES (
                                '${dimensionNames[i]}',
                                ${Number(dimensions[i])},
                                ${variantId}
                            )
                        `);
                    }
                }
            }
        }

        console.log(`✅ Inserted SABS 719 ERW fitting dimensions (${sabs719FittingData.length} entries)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Get SABS 719 ERW steel specification ID
        const sabs719Result = await queryRunner.query(`
            SELECT id FROM steel_specifications WHERE steel_spec_name = 'SABS 719 ERW'
        `);
        
        if (sabs719Result.length > 0) {
            const steelSpecId = sabs719Result[0].id;
            
            // Remove fitting dimensions and variants for SABS 719 ERW
            await queryRunner.query(`
                DELETE FROM fitting_dimensions 
                WHERE fitting_variant_id IN (
                    SELECT fv.id FROM fitting_variants fv
                    INNER JOIN fittings f ON fv.fitting_id = f.id
                    WHERE f.steel_specification_id = ${steelSpecId}
                )
            `);
            
            // Remove fitting variants for SABS 719 ERW
            await queryRunner.query(`
                DELETE FROM fitting_variants 
                WHERE fitting_id IN (
                    SELECT id FROM fittings 
                    WHERE steel_specification_id = ${steelSpecId}
                )
            `);
            
            // Remove fittings for SABS 719 ERW
            await queryRunner.query(`
                DELETE FROM fittings 
                WHERE steel_specification_id = ${steelSpecId}
            `);
            
            // Remove pipe dimensions for SABS 719 ERW
            await queryRunner.query(`
                DELETE FROM pipe_dimensions 
                WHERE steel_specification_id = ${steelSpecId}
            `);
            
            console.log('🗑️  Removed SABS 719 ERW pipe and fitting data');
        }
    }
}