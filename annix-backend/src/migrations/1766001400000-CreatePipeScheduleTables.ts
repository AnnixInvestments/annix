import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePipeScheduleTables1766001400000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🏗️ Creating pipe schedule tables...');

        // Create pipe_schedules table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "pipe_schedules" (
                "id" SERIAL NOT NULL,
                "nps" character varying(20) NOT NULL,
                "nb_mm" decimal(10,2),
                "schedule" character varying(20) NOT NULL,
                "wall_thickness_inch" decimal(8,4) NOT NULL,
                "wall_thickness_mm" decimal(8,2) NOT NULL,
                "outside_diameter_inch" decimal(8,4) NOT NULL,
                "outside_diameter_mm" decimal(8,2) NOT NULL,
                "standard_code" character varying(50) DEFAULT 'ASME B36.10',
                CONSTRAINT "PK_pipe_schedules" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_pipe_schedules_nps_schedule" UNIQUE ("nps", "schedule")
            )
        `);

        // Create material_allowable_stresses table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "material_allowable_stresses" (
                "id" SERIAL NOT NULL,
                "material_code" character varying(50) NOT NULL,
                "material_name" character varying(100) NOT NULL,
                "temperature_celsius" decimal(8,2) NOT NULL,
                "temperature_fahrenheit" decimal(8,2) NOT NULL,
                "allowable_stress_ksi" decimal(8,2) NOT NULL,
                "allowable_stress_mpa" decimal(8,2) NOT NULL,
                "source_standard" character varying(50) DEFAULT 'ASME B31.3',
                CONSTRAINT "PK_material_allowable_stresses" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_material_stress_temp" UNIQUE ("material_code", "temperature_celsius")
            )
        `);

        console.log('✅ Tables created successfully');

        // Populate pipe schedule data
        console.log('📊 Populating pipe schedule data (ASME B36.10)...');

        // NPS to OD and NB mapping
        const npsData: { nps: string; odInch: number; odMm: number; nbMm: number }[] = [
            { nps: '1/2', odInch: 0.840, odMm: 21.34, nbMm: 15 },
            { nps: '3/4', odInch: 1.050, odMm: 26.67, nbMm: 20 },
            { nps: '1', odInch: 1.315, odMm: 33.40, nbMm: 25 },
            { nps: '1-1/4', odInch: 1.660, odMm: 42.16, nbMm: 32 },
            { nps: '1-1/2', odInch: 1.900, odMm: 48.26, nbMm: 40 },
            { nps: '2', odInch: 2.375, odMm: 60.33, nbMm: 50 },
            { nps: '2-1/2', odInch: 2.875, odMm: 73.03, nbMm: 65 },
            { nps: '3', odInch: 3.500, odMm: 88.90, nbMm: 80 },
            { nps: '3-1/2', odInch: 4.000, odMm: 101.60, nbMm: 90 },
            { nps: '4', odInch: 4.500, odMm: 114.30, nbMm: 100 },
            { nps: '5', odInch: 5.563, odMm: 141.30, nbMm: 125 },
            { nps: '6', odInch: 6.625, odMm: 168.28, nbMm: 150 },
            { nps: '8', odInch: 8.625, odMm: 219.08, nbMm: 200 },
            { nps: '10', odInch: 10.750, odMm: 273.05, nbMm: 250 },
            { nps: '12', odInch: 12.750, odMm: 323.85, nbMm: 300 },
            { nps: '14', odInch: 14.000, odMm: 355.60, nbMm: 350 },
            { nps: '16', odInch: 16.000, odMm: 406.40, nbMm: 400 },
            { nps: '18', odInch: 18.000, odMm: 457.20, nbMm: 450 },
            { nps: '20', odInch: 20.000, odMm: 508.00, nbMm: 500 },
            { nps: '24', odInch: 24.000, odMm: 609.60, nbMm: 600 },
        ];

        // Schedule data: NPS -> { schedule: wallThicknessInch }
        const scheduleData: { [nps: string]: { [sch: string]: number } } = {
            '1/2': { '5S': 0.065, '10S': 0.083, '40': 0.109, '40S': 0.109, '80': 0.147, '80S': 0.147, '160': 0.188, 'XXS': 0.294 },
            '3/4': { '5S': 0.065, '10S': 0.083, '40': 0.113, '40S': 0.113, '80': 0.154, '80S': 0.154, '160': 0.219, 'XXS': 0.308 },
            '1': { '5S': 0.065, '10S': 0.109, '40': 0.133, '40S': 0.133, '80': 0.179, '80S': 0.179, '160': 0.250, 'XXS': 0.358 },
            '1-1/4': { '5S': 0.065, '10S': 0.109, '40': 0.140, '40S': 0.140, '80': 0.191, '80S': 0.191, '160': 0.250, 'XXS': 0.382 },
            '1-1/2': { '5S': 0.065, '10S': 0.109, '40': 0.145, '40S': 0.145, '80': 0.200, '80S': 0.200, '160': 0.281, 'XXS': 0.400 },
            '2': { '5S': 0.065, '10S': 0.109, '40': 0.154, '40S': 0.154, '80': 0.218, '80S': 0.218, '160': 0.344, 'XXS': 0.436 },
            '2-1/2': { '5S': 0.083, '10S': 0.120, '40': 0.203, '40S': 0.203, '80': 0.276, '80S': 0.276, '160': 0.375, 'XXS': 0.552 },
            '3': { '5S': 0.083, '10S': 0.120, '40': 0.216, '40S': 0.216, '80': 0.300, '80S': 0.300, '160': 0.438, 'XXS': 0.600 },
            '3-1/2': { '5S': 0.083, '10S': 0.120, '40': 0.226, '40S': 0.226, '80': 0.318, '80S': 0.318 },
            '4': { '5S': 0.083, '10S': 0.120, '40': 0.237, '40S': 0.237, '80': 0.337, '80S': 0.337, '120': 0.438, '160': 0.531, 'XXS': 0.674 },
            '5': { '5S': 0.109, '10S': 0.134, '40': 0.258, '40S': 0.258, '80': 0.375, '80S': 0.375, '120': 0.500, '160': 0.625, 'XXS': 0.750 },
            '6': { '5S': 0.109, '10S': 0.134, '40': 0.280, '40S': 0.280, '80': 0.432, '80S': 0.432, '120': 0.562, '160': 0.719, 'XXS': 0.864 },
            '8': { '5S': 0.109, '10S': 0.148, '20': 0.250, '30': 0.277, '40': 0.322, '60': 0.406, '80': 0.500, '100': 0.594, '120': 0.719, '140': 0.812, '160': 0.906, 'XXS': 0.875 },
            '10': { '5S': 0.134, '10S': 0.165, '20': 0.250, '30': 0.307, '40': 0.365, '60': 0.500, '80': 0.594, '100': 0.719, '120': 0.844, '140': 1.000, '160': 1.125 },
            '12': { '5S': 0.156, '10S': 0.180, '20': 0.250, '30': 0.330, '40': 0.406, '60': 0.562, '80': 0.688, '100': 0.844, '120': 1.000, '140': 1.125, '160': 1.312 },
            '14': { '10': 0.250, '20': 0.312, '30': 0.375, '40': 0.438, '60': 0.594, '80': 0.750, '100': 0.938, '120': 1.094, '140': 1.250, '160': 1.406 },
            '16': { '10': 0.250, '20': 0.312, '30': 0.375, '40': 0.500, '60': 0.656, '80': 0.844, '100': 1.031, '120': 1.219, '140': 1.438, '160': 1.594 },
            '18': { '10': 0.250, '20': 0.312, '30': 0.438, '40': 0.562, '60': 0.750, '80': 0.938, '100': 1.156, '120': 1.375, '140': 1.562, '160': 1.781 },
            '20': { '10': 0.250, '20': 0.375, '30': 0.500, '40': 0.594, '60': 0.812, '80': 1.031, '100': 1.281, '120': 1.500, '140': 1.750, '160': 1.969 },
            '24': { '10': 0.250, '20': 0.375, '30': 0.562, '40': 0.688, '60': 0.969, '80': 1.219, '100': 1.531, '120': 1.812, '140': 2.062, '160': 2.344 },
        };

        // Insert schedule data
        for (const npsInfo of npsData) {
            const schedules = scheduleData[npsInfo.nps];
            if (!schedules) continue;

            for (const [schedule, wallInch] of Object.entries(schedules)) {
                const wallMm = Math.round(wallInch * 25.4 * 100) / 100;

                await queryRunner.query(`
                    INSERT INTO pipe_schedules (nps, nb_mm, schedule, wall_thickness_inch, wall_thickness_mm, outside_diameter_inch, outside_diameter_mm, standard_code)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (nps, schedule) DO NOTHING
                `, [npsInfo.nps, npsInfo.nbMm, schedule, wallInch, wallMm, npsInfo.odInch, npsInfo.odMm, 'ASME B36.10']);
            }
            console.log(`  ✓ Added schedules for NPS ${npsInfo.nps}`);
        }

        console.log('✅ Pipe schedule data populated');

        // Populate material allowable stress data
        console.log('📊 Populating material allowable stress data...');

        // ASTM A106 Grade B (Carbon Steel - most common for high temp)
        // Values from ASME B31.3 Table A-1
        const a106GradeBStresses: { tempC: number; tempF: number; stressKsi: number }[] = [
            { tempC: -29, tempF: -20, stressKsi: 20.0 },
            { tempC: 38, tempF: 100, stressKsi: 20.0 },
            { tempC: 93, tempF: 200, stressKsi: 20.0 },
            { tempC: 149, tempF: 300, stressKsi: 20.0 },
            { tempC: 204, tempF: 400, stressKsi: 18.9 },
            { tempC: 260, tempF: 500, stressKsi: 17.3 },
            { tempC: 316, tempF: 600, stressKsi: 15.8 },
            { tempC: 343, tempF: 650, stressKsi: 15.0 },
            { tempC: 371, tempF: 700, stressKsi: 14.4 },
            { tempC: 399, tempF: 750, stressKsi: 13.0 },
            { tempC: 427, tempF: 800, stressKsi: 10.8 },
            { tempC: 454, tempF: 850, stressKsi: 8.7 },
            { tempC: 482, tempF: 900, stressKsi: 6.5 },
            { tempC: 510, tempF: 950, stressKsi: 4.5 },
            { tempC: 538, tempF: 1000, stressKsi: 2.5 },
        ];

        for (const stress of a106GradeBStresses) {
            const stressMpa = Math.round(stress.stressKsi * 6.895 * 100) / 100;
            await queryRunner.query(`
                INSERT INTO material_allowable_stresses (material_code, material_name, temperature_celsius, temperature_fahrenheit, allowable_stress_ksi, allowable_stress_mpa, source_standard)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (material_code, temperature_celsius) DO NOTHING
            `, ['ASTM_A106_Grade_B', 'ASTM A106 Grade B (Seamless Carbon Steel)', stress.tempC, stress.tempF, stress.stressKsi, stressMpa, 'ASME B31.3']);
        }
        console.log('  ✓ Added ASTM A106 Grade B stresses');

        // ASTM A53 Grade B (ERW Carbon Steel)
        const a53GradeBStresses: { tempC: number; tempF: number; stressKsi: number }[] = [
            { tempC: -29, tempF: -20, stressKsi: 20.0 },
            { tempC: 38, tempF: 100, stressKsi: 20.0 },
            { tempC: 93, tempF: 200, stressKsi: 20.0 },
            { tempC: 149, tempF: 300, stressKsi: 20.0 },
            { tempC: 204, tempF: 400, stressKsi: 18.9 },
            { tempC: 260, tempF: 500, stressKsi: 17.3 },
            { tempC: 316, tempF: 600, stressKsi: 15.8 },
            { tempC: 343, tempF: 650, stressKsi: 15.0 },
            { tempC: 371, tempF: 700, stressKsi: 14.4 },
        ];

        for (const stress of a53GradeBStresses) {
            const stressMpa = Math.round(stress.stressKsi * 6.895 * 100) / 100;
            await queryRunner.query(`
                INSERT INTO material_allowable_stresses (material_code, material_name, temperature_celsius, temperature_fahrenheit, allowable_stress_ksi, allowable_stress_mpa, source_standard)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (material_code, temperature_celsius) DO NOTHING
            `, ['ASTM_A53_Grade_B', 'ASTM A53 Grade B (ERW Carbon Steel)', stress.tempC, stress.tempF, stress.stressKsi, stressMpa, 'ASME B31.3']);
        }
        console.log('  ✓ Added ASTM A53 Grade B stresses');

        // API 5L Grade B (Line Pipe)
        const api5lGradeBStresses: { tempC: number; tempF: number; stressKsi: number }[] = [
            { tempC: -29, tempF: -20, stressKsi: 20.0 },
            { tempC: 38, tempF: 100, stressKsi: 20.0 },
            { tempC: 93, tempF: 200, stressKsi: 20.0 },
            { tempC: 149, tempF: 300, stressKsi: 20.0 },
            { tempC: 204, tempF: 400, stressKsi: 18.9 },
            { tempC: 260, tempF: 500, stressKsi: 17.3 },
            { tempC: 316, tempF: 600, stressKsi: 15.8 },
        ];

        for (const stress of api5lGradeBStresses) {
            const stressMpa = Math.round(stress.stressKsi * 6.895 * 100) / 100;
            await queryRunner.query(`
                INSERT INTO material_allowable_stresses (material_code, material_name, temperature_celsius, temperature_fahrenheit, allowable_stress_ksi, allowable_stress_mpa, source_standard)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (material_code, temperature_celsius) DO NOTHING
            `, ['API_5L_Grade_B', 'API 5L Grade B (Line Pipe)', stress.tempC, stress.tempF, stress.stressKsi, stressMpa, 'ASME B31.3']);
        }
        console.log('  ✓ Added API 5L Grade B stresses');

        // ASTM A312 TP304 (Stainless Steel)
        const a312Tp304Stresses: { tempC: number; tempF: number; stressKsi: number }[] = [
            { tempC: -29, tempF: -20, stressKsi: 20.0 },
            { tempC: 38, tempF: 100, stressKsi: 20.0 },
            { tempC: 93, tempF: 200, stressKsi: 20.0 },
            { tempC: 149, tempF: 300, stressKsi: 18.7 },
            { tempC: 204, tempF: 400, stressKsi: 17.5 },
            { tempC: 260, tempF: 500, stressKsi: 16.5 },
            { tempC: 316, tempF: 600, stressKsi: 15.6 },
            { tempC: 371, tempF: 700, stressKsi: 14.9 },
            { tempC: 427, tempF: 800, stressKsi: 14.3 },
            { tempC: 482, tempF: 900, stressKsi: 13.5 },
            { tempC: 538, tempF: 1000, stressKsi: 12.0 },
            { tempC: 593, tempF: 1100, stressKsi: 9.8 },
            { tempC: 649, tempF: 1200, stressKsi: 7.4 },
            { tempC: 704, tempF: 1300, stressKsi: 5.3 },
            { tempC: 760, tempF: 1400, stressKsi: 3.7 },
            { tempC: 816, tempF: 1500, stressKsi: 2.6 },
        ];

        for (const stress of a312Tp304Stresses) {
            const stressMpa = Math.round(stress.stressKsi * 6.895 * 100) / 100;
            await queryRunner.query(`
                INSERT INTO material_allowable_stresses (material_code, material_name, temperature_celsius, temperature_fahrenheit, allowable_stress_ksi, allowable_stress_mpa, source_standard)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (material_code, temperature_celsius) DO NOTHING
            `, ['ASTM_A312_TP304', 'ASTM A312 TP304 (304 Stainless Steel)', stress.tempC, stress.tempF, stress.stressKsi, stressMpa, 'ASME B31.3']);
        }
        console.log('  ✓ Added ASTM A312 TP304 stresses');

        // ASTM A312 TP316 (316 Stainless Steel)
        const a312Tp316Stresses: { tempC: number; tempF: number; stressKsi: number }[] = [
            { tempC: -29, tempF: -20, stressKsi: 20.0 },
            { tempC: 38, tempF: 100, stressKsi: 20.0 },
            { tempC: 93, tempF: 200, stressKsi: 20.0 },
            { tempC: 149, tempF: 300, stressKsi: 19.4 },
            { tempC: 204, tempF: 400, stressKsi: 18.5 },
            { tempC: 260, tempF: 500, stressKsi: 17.6 },
            { tempC: 316, tempF: 600, stressKsi: 16.9 },
            { tempC: 371, tempF: 700, stressKsi: 16.3 },
            { tempC: 427, tempF: 800, stressKsi: 15.8 },
            { tempC: 482, tempF: 900, stressKsi: 14.9 },
            { tempC: 538, tempF: 1000, stressKsi: 13.3 },
            { tempC: 593, tempF: 1100, stressKsi: 10.9 },
            { tempC: 649, tempF: 1200, stressKsi: 8.3 },
            { tempC: 704, tempF: 1300, stressKsi: 6.1 },
            { tempC: 760, tempF: 1400, stressKsi: 4.4 },
            { tempC: 816, tempF: 1500, stressKsi: 3.2 },
        ];

        for (const stress of a312Tp316Stresses) {
            const stressMpa = Math.round(stress.stressKsi * 6.895 * 100) / 100;
            await queryRunner.query(`
                INSERT INTO material_allowable_stresses (material_code, material_name, temperature_celsius, temperature_fahrenheit, allowable_stress_ksi, allowable_stress_mpa, source_standard)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (material_code, temperature_celsius) DO NOTHING
            `, ['ASTM_A312_TP316', 'ASTM A312 TP316 (316 Stainless Steel)', stress.tempC, stress.tempF, stress.stressKsi, stressMpa, 'ASME B31.3']);
        }
        console.log('  ✓ Added ASTM A312 TP316 stresses');

        // ASTM A335 P11 (Chrome-Moly)
        const a335P11Stresses: { tempC: number; tempF: number; stressKsi: number }[] = [
            { tempC: -29, tempF: -20, stressKsi: 17.1 },
            { tempC: 38, tempF: 100, stressKsi: 17.1 },
            { tempC: 93, tempF: 200, stressKsi: 17.1 },
            { tempC: 149, tempF: 300, stressKsi: 17.1 },
            { tempC: 204, tempF: 400, stressKsi: 17.1 },
            { tempC: 260, tempF: 500, stressKsi: 17.1 },
            { tempC: 316, tempF: 600, stressKsi: 17.1 },
            { tempC: 371, tempF: 700, stressKsi: 17.1 },
            { tempC: 427, tempF: 800, stressKsi: 17.1 },
            { tempC: 482, tempF: 900, stressKsi: 16.5 },
            { tempC: 538, tempF: 1000, stressKsi: 14.0 },
            { tempC: 566, tempF: 1050, stressKsi: 11.7 },
            { tempC: 593, tempF: 1100, stressKsi: 9.0 },
            { tempC: 621, tempF: 1150, stressKsi: 6.5 },
            { tempC: 649, tempF: 1200, stressKsi: 4.5 },
        ];

        for (const stress of a335P11Stresses) {
            const stressMpa = Math.round(stress.stressKsi * 6.895 * 100) / 100;
            await queryRunner.query(`
                INSERT INTO material_allowable_stresses (material_code, material_name, temperature_celsius, temperature_fahrenheit, allowable_stress_ksi, allowable_stress_mpa, source_standard)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (material_code, temperature_celsius) DO NOTHING
            `, ['ASTM_A335_P11', 'ASTM A335 P11 (1-1/4Cr-1/2Mo Chrome-Moly)', stress.tempC, stress.tempF, stress.stressKsi, stressMpa, 'ASME B31.3']);
        }
        console.log('  ✓ Added ASTM A335 P11 stresses');

        // ASTM A335 P22 (2-1/4Cr-1Mo Chrome-Moly)
        const a335P22Stresses: { tempC: number; tempF: number; stressKsi: number }[] = [
            { tempC: -29, tempF: -20, stressKsi: 17.1 },
            { tempC: 38, tempF: 100, stressKsi: 17.1 },
            { tempC: 93, tempF: 200, stressKsi: 17.1 },
            { tempC: 149, tempF: 300, stressKsi: 17.1 },
            { tempC: 204, tempF: 400, stressKsi: 17.1 },
            { tempC: 260, tempF: 500, stressKsi: 17.1 },
            { tempC: 316, tempF: 600, stressKsi: 17.1 },
            { tempC: 371, tempF: 700, stressKsi: 17.1 },
            { tempC: 427, tempF: 800, stressKsi: 17.1 },
            { tempC: 482, tempF: 900, stressKsi: 17.1 },
            { tempC: 538, tempF: 1000, stressKsi: 15.4 },
            { tempC: 566, tempF: 1050, stressKsi: 13.2 },
            { tempC: 593, tempF: 1100, stressKsi: 10.8 },
            { tempC: 621, tempF: 1150, stressKsi: 8.2 },
            { tempC: 649, tempF: 1200, stressKsi: 6.0 },
        ];

        for (const stress of a335P22Stresses) {
            const stressMpa = Math.round(stress.stressKsi * 6.895 * 100) / 100;
            await queryRunner.query(`
                INSERT INTO material_allowable_stresses (material_code, material_name, temperature_celsius, temperature_fahrenheit, allowable_stress_ksi, allowable_stress_mpa, source_standard)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (material_code, temperature_celsius) DO NOTHING
            `, ['ASTM_A335_P22', 'ASTM A335 P22 (2-1/4Cr-1Mo Chrome-Moly)', stress.tempC, stress.tempF, stress.stressKsi, stressMpa, 'ASME B31.3']);
        }
        console.log('  ✓ Added ASTM A335 P22 stresses');

        console.log('✅ Material allowable stress data populated');
        console.log('✅ Migration complete!');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('⏮️ Dropping pipe schedule tables...');
        await queryRunner.query(`DROP TABLE IF EXISTS "material_allowable_stresses" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "pipe_schedules" CASCADE`);
        console.log('✅ Rollback complete');
    }
}
