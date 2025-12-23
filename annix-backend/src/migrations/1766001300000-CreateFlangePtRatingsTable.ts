import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFlangePtRatingsTable1766001300000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🏗️ Creating flange_pt_ratings table...');

        // Create flange_pt_ratings table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "flange_pt_ratings" (
                "id" SERIAL NOT NULL,
                "pressure_class_id" integer NOT NULL,
                "material_group" character varying(50) NOT NULL,
                "temperature_celsius" decimal(8,2) NOT NULL,
                "max_pressure_bar" decimal(10,2) NOT NULL,
                "max_pressure_psi" decimal(10,2),
                CONSTRAINT "PK_flange_pt_ratings" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_flange_pt_ratings_class_material_temp" UNIQUE ("pressure_class_id", "material_group", "temperature_celsius"),
                CONSTRAINT "FK_flange_pt_ratings_pressure_class"
                    FOREIGN KEY ("pressure_class_id")
                    REFERENCES "flange_pressure_classes"("id")
                    ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);

        console.log('✅ flange_pt_ratings table created successfully');

        // Now populate with ASME B16.5 Carbon Steel A105 data
        console.log('📊 Populating ASME B16.5 P/T ratings for Carbon Steel A105...');

        // First, get the ASME B16.5 standard ID and pressure class IDs
        const asmeStandard = await queryRunner.query(`
            SELECT id FROM flange_standards WHERE code = 'ASME B16.5'
        `);

        if (asmeStandard.length === 0) {
            console.log('⚠️ ASME B16.5 standard not found, skipping P/T data population');
            return;
        }

        const standardId = asmeStandard[0].id;

        // Get pressure classes for ASME B16.5
        const pressureClasses = await queryRunner.query(`
            SELECT id, designation FROM flange_pressure_classes
            WHERE "standardId" = $1
            ORDER BY id
        `, [standardId]);

        if (pressureClasses.length === 0) {
            console.log('⚠️ No ASME B16.5 pressure classes found, skipping P/T data population');
            return;
        }

        // Create a map of designation to ID
        const classMap: { [key: string]: number } = {};
        for (const pc of pressureClasses) {
            classMap[pc.designation] = pc.id;
        }

        // ASME B16.5 Carbon Steel A105 P/T ratings (converted to bar)
        // Temperature points: -29°C, 38°C, 93°C, 149°C, 204°C, 260°C, 316°C, 343°C, 371°C, 399°C, 427°C, 454°C, 482°C, 510°C, 538°C
        // PSI to bar conversion: 1 psi = 0.0689476 bar

        const ptData: { [designation: string]: { tempC: number; psi: number }[] } = {
            '150': [
                { tempC: -29, psi: 285 },
                { tempC: 38, psi: 285 },
                { tempC: 93, psi: 260 },
                { tempC: 149, psi: 230 },
                { tempC: 204, psi: 200 },
                { tempC: 260, psi: 170 },
                { tempC: 316, psi: 140 },
                { tempC: 343, psi: 125 },
                { tempC: 371, psi: 110 },
                { tempC: 399, psi: 95 },
                { tempC: 427, psi: 80 },
                { tempC: 454, psi: 65 },
                { tempC: 482, psi: 50 },
                { tempC: 510, psi: 35 },
                { tempC: 538, psi: 20 }
            ],
            '300': [
                { tempC: -29, psi: 740 },
                { tempC: 38, psi: 740 },
                { tempC: 93, psi: 675 },
                { tempC: 149, psi: 600 },
                { tempC: 204, psi: 520 },
                { tempC: 260, psi: 450 },
                { tempC: 316, psi: 370 },
                { tempC: 343, psi: 325 },
                { tempC: 371, psi: 290 },
                { tempC: 399, psi: 250 },
                { tempC: 427, psi: 215 },
                { tempC: 454, psi: 175 },
                { tempC: 482, psi: 135 },
                { tempC: 510, psi: 95 },
                { tempC: 538, psi: 50 }
            ],
            '400': [
                { tempC: -29, psi: 990 },
                { tempC: 38, psi: 990 },
                { tempC: 93, psi: 900 },
                { tempC: 149, psi: 800 },
                { tempC: 204, psi: 695 },
                { tempC: 260, psi: 600 },
                { tempC: 316, psi: 495 },
                { tempC: 343, psi: 435 },
                { tempC: 371, psi: 385 },
                { tempC: 399, psi: 335 },
                { tempC: 427, psi: 285 },
                { tempC: 454, psi: 235 },
                { tempC: 482, psi: 180 },
                { tempC: 510, psi: 125 },
                { tempC: 538, psi: 70 }
            ],
            '600': [
                { tempC: -29, psi: 1480 },
                { tempC: 38, psi: 1480 },
                { tempC: 93, psi: 1350 },
                { tempC: 149, psi: 1200 },
                { tempC: 204, psi: 1040 },
                { tempC: 260, psi: 895 },
                { tempC: 316, psi: 740 },
                { tempC: 343, psi: 650 },
                { tempC: 371, psi: 575 },
                { tempC: 399, psi: 500 },
                { tempC: 427, psi: 425 },
                { tempC: 454, psi: 350 },
                { tempC: 482, psi: 270 },
                { tempC: 510, psi: 190 },
                { tempC: 538, psi: 105 }
            ],
            '900': [
                { tempC: -29, psi: 2220 },
                { tempC: 38, psi: 2220 },
                { tempC: 93, psi: 2025 },
                { tempC: 149, psi: 1800 },
                { tempC: 204, psi: 1560 },
                { tempC: 260, psi: 1345 },
                { tempC: 316, psi: 1110 },
                { tempC: 343, psi: 975 },
                { tempC: 371, psi: 865 },
                { tempC: 399, psi: 750 },
                { tempC: 427, psi: 640 },
                { tempC: 454, psi: 525 },
                { tempC: 482, psi: 405 },
                { tempC: 510, psi: 285 },
                { tempC: 538, psi: 155 }
            ],
            '1500': [
                { tempC: -29, psi: 3705 },
                { tempC: 38, psi: 3705 },
                { tempC: 93, psi: 3375 },
                { tempC: 149, psi: 3000 },
                { tempC: 204, psi: 2600 },
                { tempC: 260, psi: 2245 },
                { tempC: 316, psi: 1855 },
                { tempC: 343, psi: 1625 },
                { tempC: 371, psi: 1440 },
                { tempC: 399, psi: 1250 },
                { tempC: 427, psi: 1065 },
                { tempC: 454, psi: 875 },
                { tempC: 482, psi: 675 },
                { tempC: 510, psi: 475 },
                { tempC: 538, psi: 260 }
            ],
            '2500': [
                { tempC: -29, psi: 6170 },
                { tempC: 38, psi: 6170 },
                { tempC: 93, psi: 5625 },
                { tempC: 149, psi: 5000 },
                { tempC: 204, psi: 4335 },
                { tempC: 260, psi: 3740 },
                { tempC: 316, psi: 3085 },
                { tempC: 343, psi: 2710 },
                { tempC: 371, psi: 2400 },
                { tempC: 399, psi: 2085 },
                { tempC: 427, psi: 1775 },
                { tempC: 454, psi: 1455 },
                { tempC: 482, psi: 1125 },
                { tempC: 510, psi: 790 },
                { tempC: 538, psi: 435 }
            ]
        };

        const PSI_TO_BAR = 0.0689476;
        const materialGroup = 'Carbon Steel A105';

        for (const [designation, ratings] of Object.entries(ptData)) {
            const classId = classMap[designation];
            if (!classId) {
                console.log(`⚠️ Pressure class ${designation} not found, skipping`);
                continue;
            }

            for (const rating of ratings) {
                const pressureBar = Math.round(rating.psi * PSI_TO_BAR * 100) / 100;

                await queryRunner.query(`
                    INSERT INTO flange_pt_ratings (pressure_class_id, material_group, temperature_celsius, max_pressure_bar, max_pressure_psi)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (pressure_class_id, material_group, temperature_celsius) DO NOTHING
                `, [classId, materialGroup, rating.tempC, pressureBar, rating.psi]);
            }

            console.log(`  ✓ Added P/T ratings for Class ${designation}`);
        }

        console.log('✅ ASME B16.5 P/T ratings populated successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('⏮️ Dropping flange_pt_ratings table...');
        await queryRunner.query(`DROP TABLE IF EXISTS "flange_pt_ratings" CASCADE`);
        console.log('✅ Rollback complete');
    }

}
