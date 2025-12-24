import { MigrationInterface, QueryRunner } from "typeorm";

export class AddASMEFlangeStandardsAndPTRatings1766001600000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🔧 Adding ASME flange standards and comprehensive P-T ratings...');

        // ============================================
        // 1. ADD ASME FLANGE STANDARDS
        // ============================================
        const asmeStandards = [
            'ASME B16.5',      // NPS 1/2 - 24
            'ASME B16.47 A',   // NPS 26-60 Series A (thicker, higher load)
            'ASME B16.47 B',   // NPS 26-60 Series B (compact, lighter)
        ];

        for (const code of asmeStandards) {
            const existing = await queryRunner.query(
                `SELECT id FROM flange_standards WHERE code = $1`, [code]
            );
            if (existing.length === 0) {
                await queryRunner.query(
                    `INSERT INTO flange_standards (code) VALUES ($1)`, [code]
                );
                console.log(`  ✓ Added flange standard: ${code}`);
            }
        }

        // Get standard IDs
        const b165Result = await queryRunner.query(`SELECT id FROM flange_standards WHERE code = 'ASME B16.5'`);
        const b1647AResult = await queryRunner.query(`SELECT id FROM flange_standards WHERE code = 'ASME B16.47 A'`);
        const b1647BResult = await queryRunner.query(`SELECT id FROM flange_standards WHERE code = 'ASME B16.47 B'`);

        if (b165Result.length === 0) {
            console.log('⚠️ ASME B16.5 standard not found after insert, skipping...');
            return;
        }

        const b165Id = b165Result[0].id;
        const b1647AId = b1647AResult.length > 0 ? b1647AResult[0].id : null;
        const b1647BId = b1647BResult.length > 0 ? b1647BResult[0].id : null;

        // ============================================
        // 2. ADD PRESSURE CLASSES
        // ============================================

        // ASME B16.5 pressure classes: 150, 300, 400, 600, 900, 1500, 2500
        const b165Classes = ['150', '300', '400', '600', '900', '1500', '2500'];
        for (const cls of b165Classes) {
            const existing = await queryRunner.query(
                `SELECT id FROM flange_pressure_classes WHERE designation = $1 AND "standardId" = $2`,
                [cls, b165Id]
            );
            if (existing.length === 0) {
                await queryRunner.query(
                    `INSERT INTO flange_pressure_classes (designation, "standardId") VALUES ($1, $2)`,
                    [cls, b165Id]
                );
            }
        }
        console.log('  ✓ Added ASME B16.5 pressure classes: 150, 300, 400, 600, 900, 1500, 2500');

        // ASME B16.47 pressure classes: 75, 150, 300, 400, 600, 900 (no higher classes)
        const b1647Classes = ['75', '150', '300', '400', '600', '900'];
        for (const standardId of [b1647AId, b1647BId]) {
            if (!standardId) continue;
            for (const cls of b1647Classes) {
                const existing = await queryRunner.query(
                    `SELECT id FROM flange_pressure_classes WHERE designation = $1 AND "standardId" = $2`,
                    [cls, standardId]
                );
                if (existing.length === 0) {
                    await queryRunner.query(
                        `INSERT INTO flange_pressure_classes (designation, "standardId") VALUES ($1, $2)`,
                        [cls, standardId]
                    );
                }
            }
        }
        console.log('  ✓ Added ASME B16.47 pressure classes: 75, 150, 300, 400, 600, 900');

        // ============================================
        // 3. CLEAR EXISTING P-T RATINGS FOR ASME B16.5 (to avoid duplicates)
        // ============================================
        const classIds = await queryRunner.query(
            `SELECT id FROM flange_pressure_classes WHERE "standardId" = $1`, [b165Id]
        );

        for (const { id } of classIds) {
            await queryRunner.query(
                `DELETE FROM flange_pt_ratings WHERE pressure_class_id = $1`, [id]
            );
        }
        console.log('  ✓ Cleared existing P-T ratings for ASME B16.5');

        // ============================================
        // 4. INSERT COMPREHENSIVE P-T RATINGS
        // ============================================

        // Get pressure class IDs
        const classMap: { [key: string]: number } = {};
        const allClasses = await queryRunner.query(
            `SELECT id, designation FROM flange_pressure_classes WHERE "standardId" = $1`,
            [b165Id]
        );
        for (const pc of allClasses) {
            classMap[pc.designation] = pc.id;
        }

        // -----------------------------------------
        // Carbon Steel A105 (Group 1.1) - ASME B16.5
        // -----------------------------------------
        const carbonSteelA105: { [cls: string]: { [temp: number]: number } } = {
            '150': { '-29': 19.6, '38': 19.6, '93': 17.9, '149': 15.9, '204': 13.8, '260': 11.7, '316': 9.7, '343': 8.6, '371': 7.6, '399': 6.6, '427': 5.5, '454': 4.5, '482': 3.4, '510': 2.4, '538': 1.4 },
            '300': { '-29': 51.0, '38': 51.0, '93': 46.6, '149': 45.2, '204': 43.8, '260': 41.4, '316': 37.9, '343': 36.9, '371': 36.9, '399': 34.8, '427': 28.3, '454': 18.6, '482': 11.7, '510': 7.2, '538': 3.4 },
            '400': { '-29': 68.1, '38': 68.1, '93': 62.1, '149': 60.3, '204': 58.3, '260': 55.2, '316': 50.3, '343': 49.3, '371': 49.0, '399': 46.2, '427': 37.9, '454': 24.5, '482': 15.9, '510': 9.7, '538': 4.8 },
            '600': { '-29': 102.1, '38': 102.1, '93': 93.1, '149': 90.7, '204': 87.6, '260': 82.8, '316': 75.6, '343': 74.1, '371': 73.4, '399': 69.7, '427': 56.9, '454': 36.9, '482': 23.8, '510': 14.1, '538': 7.2 },
            '900': { '-29': 153.1, '38': 153.1, '93': 139.7, '149': 136.0, '204': 131.4, '260': 123.9, '316': 113.1, '343': 111.0, '371': 110.3, '399': 104.1, '427': 85.2, '454': 55.5, '482': 35.5, '510': 21.4, '538': 10.7 },
            '1500': { '-29': 255.1, '38': 255.1, '93': 232.8, '149': 226.5, '204': 218.9, '260': 206.5, '316': 188.6, '343': 185.2, '371': 183.8, '399': 173.8, '427': 142.1, '454': 92.4, '482': 59.3, '510': 35.5, '538': 17.9 },
            '2500': { '-29': 425.2, '38': 425.2, '93': 388.0, '149': 377.5, '204': 364.8, '260': 344.2, '316': 314.3, '343': 308.6, '371': 306.4, '399': 289.7, '427': 236.9, '454': 154.1, '482': 98.6, '510': 59.3, '538': 29.7 }
        };

        await this.insertPTRatings(queryRunner, classMap, 'Carbon Steel A105 (Group 1.1)', carbonSteelA105);
        console.log('  ✓ Added P-T ratings for Carbon Steel A105 (Group 1.1)');

        // -----------------------------------------
        // Stainless Steel 316 (Group 2.2)
        // -----------------------------------------
        const ss316: { [cls: string]: { [temp: number]: number } } = {
            '150': { '-29': 19.0, '38': 19.0, '93': 16.2, '149': 14.8, '204': 13.4, '260': 11.7, '316': 9.7, '343': 8.6, '371': 7.6, '399': 6.6, '427': 5.5 },
            '300': { '-29': 49.7, '38': 49.7, '93': 42.8, '149': 38.6, '204': 35.5, '260': 33.1, '316': 31.0, '343': 30.3, '371': 30.0, '399': 29.3, '427': 29.0 },
            '600': { '-29': 99.3, '38': 99.3, '93': 85.5, '149': 77.2, '204': 70.7, '260': 65.9, '316': 62.1, '343': 61.0, '371': 60.0, '399': 59.0, '427': 58.3 },
            '900': { '-29': 149.0, '38': 149.0, '93': 128.4, '149': 115.9, '204': 106.2, '260': 99.0, '316': 93.5, '343': 91.4, '371': 90.0, '399': 88.3, '427': 87.2 },
            '1500': { '-29': 248.2, '38': 248.2, '93': 213.8, '149': 193.1, '204': 177.2, '260': 164.8, '316': 155.5, '343': 152.4, '371': 149.7, '399': 147.2, '427': 145.5 },
            '2500': { '-29': 413.7, '38': 413.7, '93': 356.2, '149': 321.7, '204': 295.4, '260': 274.8, '316': 259.3, '343': 254.0, '371': 249.7, '399': 245.5, '427': 242.8 }
        };

        await this.insertPTRatings(queryRunner, classMap, 'Stainless Steel 316 (Group 2.2)', ss316);
        console.log('  ✓ Added P-T ratings for Stainless Steel 316 (Group 2.2)');

        // -----------------------------------------
        // Stainless Steel 304 (Group 2.1)
        // -----------------------------------------
        const ss304: { [cls: string]: { [temp: number]: number } } = {
            '150': { '-29': 19.6, '38': 19.6, '93': 17.2, '149': 15.5, '204': 14.0, '260': 12.4, '316': 10.3, '343': 9.3, '371': 8.4, '399': 7.6, '427': 6.9, '454': 6.2, '482': 5.5 },
            '300': { '-29': 51.7, '38': 51.7, '93': 45.2, '149': 40.0, '204': 36.5, '260': 34.1, '316': 32.1, '343': 31.0, '371': 30.3, '399': 29.7, '427': 29.0, '454': 28.3, '482': 27.6 },
            '600': { '-29': 103.4, '38': 103.4, '93': 90.3, '149': 80.0, '204': 73.1, '260': 68.3, '316': 64.1, '343': 62.1, '371': 60.7, '399': 59.3, '427': 58.3, '454': 56.9, '482': 55.2 },
            '900': { '-29': 155.1, '38': 155.1, '93': 135.5, '149': 120.0, '204': 109.7, '260': 102.4, '316': 96.2, '343': 93.1, '371': 91.0, '399': 89.0, '427': 87.2, '454': 85.2, '482': 82.8 },
            '1500': { '-29': 258.6, '38': 258.6, '93': 225.5, '149': 200.0, '204': 182.8, '260': 170.7, '316': 160.3, '343': 155.2, '371': 151.7, '399': 148.3, '427': 145.5, '454': 142.1, '482': 138.1 },
            '2500': { '-29': 430.9, '38': 430.9, '93': 376.2, '149': 333.4, '204': 304.7, '260': 284.5, '316': 267.2, '343': 258.6, '371': 252.9, '399': 247.2, '427': 242.8, '454': 236.9, '482': 230.3 }
        };

        await this.insertPTRatings(queryRunner, classMap, 'Stainless Steel 304 (Group 2.1)', ss304);
        console.log('  ✓ Added P-T ratings for Stainless Steel 304 (Group 2.1)');

        // ============================================
        // 5. ADD B16.47 P-T RATINGS (same as B16.5 up to Class 900)
        // ============================================
        for (const standardId of [b1647AId, b1647BId]) {
            if (!standardId) continue;

            const b47Classes = await queryRunner.query(
                `SELECT id, designation FROM flange_pressure_classes WHERE "standardId" = $1`,
                [standardId]
            );

            const b47ClassMap: { [key: string]: number } = {};
            for (const pc of b47Classes) {
                b47ClassMap[pc.designation] = pc.id;
            }

            // Carbon Steel A105 for B16.47
            const carbonSteelB47: { [cls: string]: { [temp: number]: number } } = {
                '75': { '-29': 10.0, '38': 10.0, '93': 9.1, '149': 8.1, '204': 7.0, '260': 6.0, '316': 4.9, '343': 4.3, '371': 3.9, '399': 3.3, '427': 2.8, '454': 2.3, '482': 1.8, '510': 1.2, '538': 0.7 },
                '150': carbonSteelA105['150'],
                '300': carbonSteelA105['300'],
                '400': carbonSteelA105['400'],
                '600': carbonSteelA105['600'],
                '900': carbonSteelA105['900']
            };

            await this.insertPTRatings(queryRunner, b47ClassMap, 'Carbon Steel A105 (Group 1.1)', carbonSteelB47);
        }
        console.log('  ✓ Added P-T ratings for ASME B16.47 Series A & B');

        console.log('✅ ASME flange standards and P-T ratings added successfully!');
    }

    private async insertPTRatings(
        queryRunner: QueryRunner,
        classMap: { [key: string]: number },
        materialGroup: string,
        data: { [cls: string]: { [temp: number]: number } }
    ): Promise<void> {
        for (const [designation, temps] of Object.entries(data)) {
            const classId = classMap[designation];
            if (!classId) continue;

            for (const [tempStr, pressureBar] of Object.entries(temps)) {
                const temp = parseFloat(tempStr);
                await queryRunner.query(`
                    INSERT INTO flange_pt_ratings (pressure_class_id, material_group, temperature_celsius, max_pressure_bar)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (pressure_class_id, material_group, temperature_celsius)
                    DO UPDATE SET max_pressure_bar = $4
                `, [classId, materialGroup, temp, pressureBar]);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('⏮️ Rolling back ASME flange standards and P-T ratings...');

        // Delete P-T ratings for the new material groups
        await queryRunner.query(`
            DELETE FROM flange_pt_ratings
            WHERE material_group IN ('Stainless Steel 316 (Group 2.2)', 'Stainless Steel 304 (Group 2.1)')
        `);

        // Delete ASME B16.47 pressure classes and standards
        await queryRunner.query(`
            DELETE FROM flange_pressure_classes
            WHERE "standardId" IN (
                SELECT id FROM flange_standards WHERE code IN ('ASME B16.47 A', 'ASME B16.47 B')
            )
        `);

        await queryRunner.query(`
            DELETE FROM flange_standards WHERE code IN ('ASME B16.47 A', 'ASME B16.47 B')
        `);

        console.log('✅ Rollback complete');
    }
}
