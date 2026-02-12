import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSABS62FittingTypes1760428600000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Insert SABS 62 fitting types
        const fittingTypes = [
            '90° Pulled Bend 3D',
            '90° Pulled Bend 5D', 
            'Spring Bend 3D',
            'Spring Bend 5D',
            'Equal Tee',
            'Unequal Tee',
            'Equal Cross',
            'Unequal Cross',
            'Lateral',
            'Y-Piece',
            'Sweep Tee',
            'Bullhead Tee',
            'Equal Tee (Gussetted)'
        ];

        for (const fittingType of fittingTypes) {
            await queryRunner.query(`
                INSERT INTO "fitting_types" ("name") 
                VALUES ('${fittingType}')
                ON CONFLICT ("name") DO NOTHING;
            `);
        }

        // Get the SABS 62 steel specification IDs
        const mediumSteelResult = await queryRunner.query(`SELECT id FROM "steel_specifications" WHERE "steel_spec_name" = 'SABS 62 ERW Medium'`);
        const heavySteelResult = await queryRunner.query(`SELECT id FROM "steel_specifications" WHERE "steel_spec_name" = 'SABS 62 ERW Heavy'`);
        
        const mediumSteelId = mediumSteelResult[0]?.id;
        const heavySteelId = heavySteelResult[0]?.id;

        if (!mediumSteelId || !heavySteelId) {
            throw new Error('SABS 62 steel specifications not found');
        }

        // Create basic fitting entries for each steel type and fitting type
        for (const fittingType of fittingTypes) {
            // Get fitting type ID
            const fittingTypeResult = await queryRunner.query(`SELECT id FROM "fitting_types" WHERE "name" = '${fittingType}'`);
            const fittingTypeId = fittingTypeResult[0]?.id;

            if (fittingTypeId) {
                // Create fitting for medium grade
                await queryRunner.query(`
                    INSERT INTO "fittings" ("steel_specification_id", "fitting_type_id") 
                    VALUES (${mediumSteelId}, ${fittingTypeId});
                `);

                // Create fitting for heavy grade
                await queryRunner.query(`
                    INSERT INTO "fittings" ("steel_specification_id", "fitting_type_id") 
                    VALUES (${heavySteelId}, ${fittingTypeId});
                `);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove SABS 62 fittings
        await queryRunner.query(`
            DELETE FROM "fittings" f
            USING "steel_specifications" ss
            WHERE f."steel_specification_id" = ss.id 
            AND ss."steel_spec_name" IN ('SABS 62 ERW Medium', 'SABS 62 ERW Heavy');
        `);

        // Remove SABS 62 fitting types
        const fittingTypes = [
            '90° Pulled Bend 3D',
            '90° Pulled Bend 5D', 
            'Spring Bend 3D',
            'Spring Bend 5D',
            'Equal Tee',
            'Unequal Tee',
            'Equal Cross',
            'Unequal Cross',
            'Lateral',
            'Y-Piece',
            'Sweep Tee',
            'Bullhead Tee',
            'Equal Tee (Gussetted)'
        ];

        for (const fittingType of fittingTypes) {
            await queryRunner.query(`
                DELETE FROM "fitting_types" WHERE "name" = '${fittingType}';
            `);
        }
    }
}