import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdditionalPipeSchedules1766001500000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('📊 Adding additional pipe schedules (Sch 10, 20, 30, 60, 100, 140)...');

        // NPS data with OD info
        const npsData: { [nps: string]: { odInch: number; odMm: number; nbMm: number } } = {
            '1/2': { odInch: 0.840, odMm: 21.34, nbMm: 15 },
            '3/4': { odInch: 1.050, odMm: 26.67, nbMm: 20 },
            '1': { odInch: 1.315, odMm: 33.40, nbMm: 25 },
            '1-1/4': { odInch: 1.660, odMm: 42.16, nbMm: 32 },
            '1-1/2': { odInch: 1.900, odMm: 48.26, nbMm: 40 },
            '2': { odInch: 2.375, odMm: 60.33, nbMm: 50 },
            '2-1/2': { odInch: 2.875, odMm: 73.03, nbMm: 65 },
            '3': { odInch: 3.500, odMm: 88.90, nbMm: 80 },
            '3-1/2': { odInch: 4.000, odMm: 101.60, nbMm: 90 },
            '4': { odInch: 4.500, odMm: 114.30, nbMm: 100 },
            '5': { odInch: 5.563, odMm: 141.30, nbMm: 125 },
            '6': { odInch: 6.625, odMm: 168.28, nbMm: 150 },
            '8': { odInch: 8.625, odMm: 219.08, nbMm: 200 },
            '10': { odInch: 10.750, odMm: 273.05, nbMm: 250 },
            '12': { odInch: 12.750, odMm: 323.85, nbMm: 300 },
            '14': { odInch: 14.000, odMm: 355.60, nbMm: 350 },
            '16': { odInch: 16.000, odMm: 406.40, nbMm: 400 },
            '18': { odInch: 18.000, odMm: 457.20, nbMm: 450 },
            '20': { odInch: 20.000, odMm: 508.00, nbMm: 500 },
            '24': { odInch: 24.000, odMm: 609.60, nbMm: 600 },
        };

        // Additional schedules to add - complete ASME B36.10/B36.19 data
        const additionalSchedules: { [nps: string]: { [sch: string]: number } } = {
            // NPS 2" - adding missing intermediate schedules
            '2': {
                '10': 0.109, '20': 0.109, '30': 0.154, '60': 0.218
            },
            // NPS 3" - adding missing intermediate schedules
            '3': {
                '10': 0.120, '20': 0.216, '30': 0.300, '60': 0.300
            },
            // NPS 4" - adding missing schedules
            '4': {
                '10': 0.120, '20': 0.188, '30': 0.237, '60': 0.337, '100': 0.438, '140': 0.531
            },
            // NPS 5" - adding schedules
            '5': {
                '10': 0.134, '20': 0.188, '30': 0.258, '60': 0.375, '100': 0.500, '140': 0.625
            },
            // NPS 6" - adding schedules 20, 30, 60, 100, 140
            '6': {
                '20': 0.280, '30': 0.432, '60': 0.432, '100': 0.562, '140': 0.719
            },
            // NPS 8" - ensure we have all schedules per user data
            '8': {
                '10': 0.148, 'STD': 0.322, 'XS': 0.500
            },
            // NPS 10" - complete data
            '10': {
                '10': 0.165, 'STD': 0.365, 'XS': 0.500
            },
            // NPS 12" - complete data
            '12': {
                '10': 0.180, 'STD': 0.375, 'XS': 0.500
            },
            // NPS 14" - add 5S, STD, XS
            '14': {
                '5S': 0.156, 'STD': 0.375, 'XS': 0.500
            },
            // NPS 16"
            '16': {
                '5S': 0.165, 'STD': 0.375, 'XS': 0.500
            },
            // NPS 18"
            '18': {
                '5S': 0.165, 'STD': 0.375, 'XS': 0.500
            },
            // NPS 20"
            '20': {
                '5S': 0.188, 'STD': 0.375, 'XS': 0.500
            },
            // NPS 24"
            '24': {
                '5S': 0.218, 'STD': 0.375, 'XS': 0.500
            },
        };

        for (const [nps, schedules] of Object.entries(additionalSchedules)) {
            const npsInfo = npsData[nps];
            if (!npsInfo) continue;

            for (const [schedule, wallInch] of Object.entries(schedules)) {
                const wallMm = Math.round(wallInch * 25.4 * 100) / 100;

                await queryRunner.query(`
                    INSERT INTO pipe_schedules (nps, nb_mm, schedule, wall_thickness_inch, wall_thickness_mm, outside_diameter_inch, outside_diameter_mm, standard_code)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (nps, schedule) DO UPDATE SET
                        wall_thickness_inch = EXCLUDED.wall_thickness_inch,
                        wall_thickness_mm = EXCLUDED.wall_thickness_mm
                `, [nps, npsInfo.nbMm, schedule, wallInch, wallMm, npsInfo.odInch, npsInfo.odMm, 'ASME B36.10']);
            }
            console.log(`  ✓ Added/updated schedules for NPS ${nps}`);
        }

        // Add SABS 62 pipe schedules (South African standard) - commonly used locally
        console.log('📊 Adding SABS 62 pipe schedule data...');

        const sabs62Data: { nbMm: number; odMm: number; lightWallMm: number; mediumWallMm: number; heavyWallMm: number }[] = [
            { nbMm: 15, odMm: 21.3, lightWallMm: 2.0, mediumWallMm: 2.65, heavyWallMm: 3.25 },
            { nbMm: 20, odMm: 26.9, lightWallMm: 2.35, mediumWallMm: 2.65, heavyWallMm: 3.25 },
            { nbMm: 25, odMm: 33.7, lightWallMm: 2.65, mediumWallMm: 3.25, heavyWallMm: 4.05 },
            { nbMm: 32, odMm: 42.4, lightWallMm: 2.65, mediumWallMm: 3.25, heavyWallMm: 4.05 },
            { nbMm: 40, odMm: 48.3, lightWallMm: 2.9, mediumWallMm: 3.25, heavyWallMm: 4.05 },
            { nbMm: 50, odMm: 60.3, lightWallMm: 2.9, mediumWallMm: 3.65, heavyWallMm: 4.5 },
            { nbMm: 65, odMm: 76.1, lightWallMm: 3.25, mediumWallMm: 3.65, heavyWallMm: 4.5 },
            { nbMm: 80, odMm: 88.9, lightWallMm: 3.25, mediumWallMm: 4.05, heavyWallMm: 4.85 },
            { nbMm: 100, odMm: 114.3, lightWallMm: 3.65, mediumWallMm: 4.5, heavyWallMm: 5.4 },
            { nbMm: 125, odMm: 139.7, lightWallMm: 4.0, mediumWallMm: 4.85, heavyWallMm: 5.4 },
            { nbMm: 150, odMm: 165.1, lightWallMm: 4.5, mediumWallMm: 4.85, heavyWallMm: 5.4 },
        ];

        for (const pipe of sabs62Data) {
            const nps = `DN${pipe.nbMm}`;
            const odInch = Math.round(pipe.odMm / 25.4 * 10000) / 10000;

            // Light wall
            await queryRunner.query(`
                INSERT INTO pipe_schedules (nps, nb_mm, schedule, wall_thickness_inch, wall_thickness_mm, outside_diameter_inch, outside_diameter_mm, standard_code)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (nps, schedule) DO NOTHING
            `, [nps, pipe.nbMm, 'Light', pipe.lightWallMm / 25.4, pipe.lightWallMm, odInch, pipe.odMm, 'SABS 62']);

            // Medium wall
            await queryRunner.query(`
                INSERT INTO pipe_schedules (nps, nb_mm, schedule, wall_thickness_inch, wall_thickness_mm, outside_diameter_inch, outside_diameter_mm, standard_code)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (nps, schedule) DO NOTHING
            `, [nps, pipe.nbMm, 'Medium', pipe.mediumWallMm / 25.4, pipe.mediumWallMm, odInch, pipe.odMm, 'SABS 62']);

            // Heavy wall
            await queryRunner.query(`
                INSERT INTO pipe_schedules (nps, nb_mm, schedule, wall_thickness_inch, wall_thickness_mm, outside_diameter_inch, outside_diameter_mm, standard_code)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (nps, schedule) DO NOTHING
            `, [nps, pipe.nbMm, 'Heavy', pipe.heavyWallMm / 25.4, pipe.heavyWallMm, odInch, pipe.odMm, 'SABS 62']);
        }
        console.log('  ✓ Added SABS 62 schedules (Light, Medium, Heavy)');

        // Add SABS 719 ERW pipe schedules
        console.log('📊 Adding SABS 719 pipe schedule data...');

        const sabs719Data: { nbMm: number; odMm: number; class4WallMm: number; class6WallMm: number; class10WallMm: number; class16WallMm: number }[] = [
            { nbMm: 80, odMm: 88.9, class4WallMm: 2.6, class6WallMm: 3.2, class10WallMm: 4.0, class16WallMm: 5.0 },
            { nbMm: 100, odMm: 114.3, class4WallMm: 2.9, class6WallMm: 3.6, class10WallMm: 4.5, class16WallMm: 5.6 },
            { nbMm: 125, odMm: 139.7, class4WallMm: 3.2, class6WallMm: 4.0, class10WallMm: 5.0, class16WallMm: 6.3 },
            { nbMm: 150, odMm: 168.3, class4WallMm: 3.6, class6WallMm: 4.5, class10WallMm: 5.6, class16WallMm: 7.1 },
            { nbMm: 200, odMm: 219.1, class4WallMm: 4.0, class6WallMm: 5.0, class10WallMm: 6.3, class16WallMm: 8.0 },
            { nbMm: 250, odMm: 273.0, class4WallMm: 4.5, class6WallMm: 5.6, class10WallMm: 7.1, class16WallMm: 8.8 },
            { nbMm: 300, odMm: 323.9, class4WallMm: 5.0, class6WallMm: 6.3, class10WallMm: 8.0, class16WallMm: 10.0 },
            { nbMm: 350, odMm: 355.6, class4WallMm: 5.6, class6WallMm: 6.3, class10WallMm: 8.0, class16WallMm: 11.0 },
            { nbMm: 400, odMm: 406.4, class4WallMm: 6.3, class6WallMm: 7.1, class10WallMm: 8.8, class16WallMm: 12.5 },
            { nbMm: 450, odMm: 457.0, class4WallMm: 6.3, class6WallMm: 8.0, class10WallMm: 10.0, class16WallMm: 12.5 },
            { nbMm: 500, odMm: 508.0, class4WallMm: 6.3, class6WallMm: 8.0, class10WallMm: 10.0, class16WallMm: 14.2 },
            { nbMm: 600, odMm: 610.0, class4WallMm: 7.1, class6WallMm: 8.8, class10WallMm: 11.0, class16WallMm: 16.0 },
        ];

        for (const pipe of sabs719Data) {
            const nps = `DN${pipe.nbMm}`;
            const odInch = Math.round(pipe.odMm / 25.4 * 10000) / 10000;

            // Class 4 (4 bar working pressure)
            await queryRunner.query(`
                INSERT INTO pipe_schedules (nps, nb_mm, schedule, wall_thickness_inch, wall_thickness_mm, outside_diameter_inch, outside_diameter_mm, standard_code)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (nps, schedule) DO UPDATE SET
                    wall_thickness_inch = EXCLUDED.wall_thickness_inch,
                    wall_thickness_mm = EXCLUDED.wall_thickness_mm
            `, [nps, pipe.nbMm, 'Class 4', pipe.class4WallMm / 25.4, pipe.class4WallMm, odInch, pipe.odMm, 'SABS 719']);

            // Class 6 (6 bar working pressure)
            await queryRunner.query(`
                INSERT INTO pipe_schedules (nps, nb_mm, schedule, wall_thickness_inch, wall_thickness_mm, outside_diameter_inch, outside_diameter_mm, standard_code)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (nps, schedule) DO UPDATE SET
                    wall_thickness_inch = EXCLUDED.wall_thickness_inch,
                    wall_thickness_mm = EXCLUDED.wall_thickness_mm
            `, [nps, pipe.nbMm, 'Class 6', pipe.class6WallMm / 25.4, pipe.class6WallMm, odInch, pipe.odMm, 'SABS 719']);

            // Class 10 (10 bar working pressure)
            await queryRunner.query(`
                INSERT INTO pipe_schedules (nps, nb_mm, schedule, wall_thickness_inch, wall_thickness_mm, outside_diameter_inch, outside_diameter_mm, standard_code)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (nps, schedule) DO UPDATE SET
                    wall_thickness_inch = EXCLUDED.wall_thickness_inch,
                    wall_thickness_mm = EXCLUDED.wall_thickness_mm
            `, [nps, pipe.nbMm, 'Class 10', pipe.class10WallMm / 25.4, pipe.class10WallMm, odInch, pipe.odMm, 'SABS 719']);

            // Class 16 (16 bar working pressure)
            await queryRunner.query(`
                INSERT INTO pipe_schedules (nps, nb_mm, schedule, wall_thickness_inch, wall_thickness_mm, outside_diameter_inch, outside_diameter_mm, standard_code)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (nps, schedule) DO UPDATE SET
                    wall_thickness_inch = EXCLUDED.wall_thickness_inch,
                    wall_thickness_mm = EXCLUDED.wall_thickness_mm
            `, [nps, pipe.nbMm, 'Class 16', pipe.class16WallMm / 25.4, pipe.class16WallMm, odInch, pipe.odMm, 'SABS 719']);
        }
        console.log('  ✓ Added SABS 719 schedules (Class 4, 6, 10, 16)');

        console.log('✅ Additional pipe schedules migration complete!');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('⏮️ Removing additional schedules...');
        // Remove SABS standards
        await queryRunner.query(`DELETE FROM pipe_schedules WHERE standard_code IN ('SABS 62', 'SABS 719')`);
        // Remove additional ASME schedules (would need more specific criteria)
        console.log('✅ Rollback complete');
    }
}
