import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateSabs62FittingDimensions1734264000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the SABS62 fitting dimensions table
        await queryRunner.createTable(
            new Table({
                name: 'sabs62_fitting_dimension',
                columns: [
                    {
                        name: 'id',
                        type: 'int',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'increment',
                    },
                    {
                        name: 'fitting_type',
                        type: 'varchar',
                        length: '50',
                        comment: 'Type of fitting: EQUAL_TEE, UNEQUAL_TEE, LATERAL, SWEEP_TEE, UNEQUAL_CROSS, Y_PIECE, GUSSETTED_TEE, EQUAL_CROSS',
                    },
                    {
                        name: 'nominal_diameter_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        comment: 'Nominal diameter in mm',
                    },
                    {
                        name: 'outside_diameter_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        comment: 'Outside diameter in mm',
                    },
                    {
                        name: 'nominal_diameter_b_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Nominal diameter B in mm (for unequal fittings)',
                    },
                    {
                        name: 'outside_diameter_b_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Outside diameter B in mm (for unequal fittings)',
                    },
                    {
                        name: 'nominal_diameter_d_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Nominal diameter D in mm (for unequal/cross fittings)',
                    },
                    {
                        name: 'outside_diameter_d_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Outside diameter D in mm (for unequal/cross fittings)',
                    },
                    {
                        name: 'angle_range',
                        type: 'varchar',
                        length: '20',
                        isNullable: true,
                        comment: 'Angle range for laterals/Y-pieces: 60-90, 45-59, 30-44',
                    },
                    {
                        name: 'dimension_a_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Dimension A in mm (for laterals/Y-pieces)',
                    },
                    {
                        name: 'dimension_b_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Dimension B in mm (for laterals/Y-pieces)',
                    },
                    {
                        name: 'centre_to_face_c_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Centre to face C in mm',
                    },
                    {
                        name: 'centre_to_face_d_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Centre to face D in mm (for sweep tees)',
                    },
                    {
                        name: 'radius_r_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Radius R in mm (for sweep tees)',
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        onUpdate: 'CURRENT_TIMESTAMP',
                    },
                ],
                indices: [
                    {
                        name: 'IDX_sabs62_fitting_type',
                        columnNames: ['fitting_type'],
                    },
                    {
                        name: 'IDX_sabs62_nominal_diameter',
                        columnNames: ['nominal_diameter_mm'],
                    },
                    {
                        name: 'IDX_sabs62_fitting_lookup',
                        columnNames: ['fitting_type', 'nominal_diameter_mm', 'angle_range'],
                    },
                ],
            }),
            true,
        );

        // Insert EQUAL TEE data
        await queryRunner.query(`
            INSERT INTO sabs62_fitting_dimension 
            (fitting_type, nominal_diameter_mm, outside_diameter_mm, centre_to_face_c_mm)
            VALUES
            ('EQUAL_TEE', 15, 21.43, 90),
            ('EQUAL_TEE', 20, 26.99, 95),
            ('EQUAL_TEE', 25, 34.13, 100),
            ('EQUAL_TEE', 32, 42.86, 110),
            ('EQUAL_TEE', 40, 48.42, 115),
            ('EQUAL_TEE', 50, 60.32, 130),
            ('EQUAL_TEE', 65, 76.20, 140),
            ('EQUAL_TEE', 80, 88.90, 150),
            ('EQUAL_TEE', 90, 101.60, 170),
            ('EQUAL_TEE', 100, 114.30, 180),
            ('EQUAL_TEE', 125, 139.70, 200),
            ('EQUAL_TEE', 150, 165.10, 230)
        `);

        // Insert UNEQUAL TEE data (same dimensions as equal tee for main run, branch specified by customer)
        await queryRunner.query(`
            INSERT INTO sabs62_fitting_dimension 
            (fitting_type, nominal_diameter_mm, outside_diameter_mm, centre_to_face_c_mm)
            VALUES
            ('UNEQUAL_TEE', 15, 21.43, 90),
            ('UNEQUAL_TEE', 20, 26.99, 95),
            ('UNEQUAL_TEE', 25, 34.13, 100),
            ('UNEQUAL_TEE', 32, 42.86, 110),
            ('UNEQUAL_TEE', 40, 48.42, 115),
            ('UNEQUAL_TEE', 50, 60.32, 130),
            ('UNEQUAL_TEE', 65, 76.20, 140),
            ('UNEQUAL_TEE', 80, 88.90, 150),
            ('UNEQUAL_TEE', 90, 101.60, 170),
            ('UNEQUAL_TEE', 100, 114.30, 180),
            ('UNEQUAL_TEE', 125, 139.70, 200),
            ('UNEQUAL_TEE', 150, 165.10, 230)
        `);

        // Insert LATERAL data (with angle ranges)
        const lateralData = [
            { nb: 50, od: 60.32, a60_90: 200, b60_90: 120, a45_59: 220, b45_59: 120, a30_44: 250, b30_44: 100 },
            { nb: 65, od: 76.20, a60_90: 220, b60_90: 120, a45_59: 240, b45_59: 120, a30_44: 270, b30_44: 120 },
            { nb: 80, od: 88.90, a60_90: 230, b60_90: 130, a45_59: 260, b45_59: 130, a30_44: 320, b30_44: 130 },
            { nb: 90, od: 101.60, a60_90: 240, b60_90: 130, a45_59: 280, b45_59: 130, a30_44: 350, b30_44: 130 },
            { nb: 100, od: 114.30, a60_90: 260, b60_90: 140, a45_59: 300, b45_59: 140, a30_44: 370, b30_44: 140 },
            { nb: 125, od: 139.70, a60_90: 290, b60_90: 150, a45_59: 330, b45_59: 150, a30_44: 420, b30_44: 150 },
            { nb: 150, od: 165.10, a60_90: 315, b60_90: 160, a45_59: 380, b45_59: 160, a30_44: 480, b30_44: 160 },
            { nb: 175, od: 190.50, a60_90: 340, b60_90: 170, a45_59: 410, b45_59: 170, a30_44: 520, b30_44: 170 },
            { nb: 200, od: 219.08, a60_90: 360, b60_90: 180, a45_59: 490, b45_59: 180, a30_44: 600, b30_44: 180 },
            { nb: 250, od: 273.00, a60_90: 400, b60_90: 240, a45_59: 550, b45_59: 190, a30_44: 850, b30_44: 190 },
            { nb: 300, od: 323.90, a60_90: 450, b60_90: 260, a45_59: 600, b45_59: 200, a30_44: 950, b30_44: 200 }
        ];

        for (const data of lateralData) {
            // 60-90 degrees
            await queryRunner.query(`
                INSERT INTO sabs62_fitting_dimension 
                (fitting_type, nominal_diameter_mm, outside_diameter_mm, angle_range, dimension_a_mm, dimension_b_mm)
                VALUES ('LATERAL', ${data.nb}, ${data.od}, '60-90', ${data.a60_90}, ${data.b60_90})
            `);
            // 45-59 degrees
            await queryRunner.query(`
                INSERT INTO sabs62_fitting_dimension 
                (fitting_type, nominal_diameter_mm, outside_diameter_mm, angle_range, dimension_a_mm, dimension_b_mm)
                VALUES ('LATERAL', ${data.nb}, ${data.od}, '45-59', ${data.a45_59}, ${data.b45_59})
            `);
            // 30-44 degrees
            await queryRunner.query(`
                INSERT INTO sabs62_fitting_dimension 
                (fitting_type, nominal_diameter_mm, outside_diameter_mm, angle_range, dimension_a_mm, dimension_b_mm)
                VALUES ('LATERAL', ${data.nb}, ${data.od}, '30-44', ${data.a30_44}, ${data.b30_44})
            `);
        }

        // Insert SWEEP TEE data
        await queryRunner.query(`
            INSERT INTO sabs62_fitting_dimension 
            (fitting_type, nominal_diameter_mm, outside_diameter_mm, centre_to_face_c_mm, centre_to_face_d_mm, radius_r_mm)
            VALUES
            ('SWEEP_TEE', 25, 34.13, 150, 100, 75),
            ('SWEEP_TEE', 32, 42.86, 170, 110, 95),
            ('SWEEP_TEE', 40, 48.42, 190, 115, 115),
            ('SWEEP_TEE', 50, 60.32, 240, 125, 150),
            ('SWEEP_TEE', 65, 76.20, 290, 140, 190),
            ('SWEEP_TEE', 80, 88.90, 330, 150, 230),
            ('SWEEP_TEE', 90, 101.60, 395, 165, 265),
            ('SWEEP_TEE', 100, 114.30, 430, 180, 305),
            ('SWEEP_TEE', 125, 139.70, 535, 205, 380),
            ('SWEEP_TEE', 150, 165.10, 635, 230, 455),
            ('SWEEP_TEE', 175, 190.50, 800, 255, 620),
            ('SWEEP_TEE', 200, 219.08, 915, 280, 710)
        `);

        // Insert UNEQUAL CROSS data (same dimensions as equal tee, D specified by customer)
        await queryRunner.query(`
            INSERT INTO sabs62_fitting_dimension 
            (fitting_type, nominal_diameter_mm, outside_diameter_mm, centre_to_face_c_mm)
            VALUES
            ('UNEQUAL_CROSS', 15, 21.43, 90),
            ('UNEQUAL_CROSS', 20, 26.99, 95),
            ('UNEQUAL_CROSS', 25, 34.13, 100),
            ('UNEQUAL_CROSS', 32, 42.86, 110),
            ('UNEQUAL_CROSS', 40, 48.42, 115),
            ('UNEQUAL_CROSS', 50, 60.32, 130),
            ('UNEQUAL_CROSS', 65, 76.20, 140),
            ('UNEQUAL_CROSS', 80, 88.90, 150),
            ('UNEQUAL_CROSS', 90, 101.60, 170),
            ('UNEQUAL_CROSS', 100, 114.30, 180),
            ('UNEQUAL_CROSS', 125, 139.70, 200),
            ('UNEQUAL_CROSS', 150, 165.10, 230)
        `);

        // Insert Y PIECE data (with angle ranges, same as lateral)
        const yPieceData = lateralData; // Same dimensions as lateral
        for (const data of yPieceData) {
            // 60-90 degrees
            await queryRunner.query(`
                INSERT INTO sabs62_fitting_dimension 
                (fitting_type, nominal_diameter_mm, outside_diameter_mm, angle_range, dimension_a_mm, dimension_b_mm)
                VALUES ('Y_PIECE', ${data.nb}, ${data.od}, '60-90', ${data.a60_90}, ${data.b60_90})
            `);
            // 45-59 degrees
            await queryRunner.query(`
                INSERT INTO sabs62_fitting_dimension 
                (fitting_type, nominal_diameter_mm, outside_diameter_mm, angle_range, dimension_a_mm, dimension_b_mm)
                VALUES ('Y_PIECE', ${data.nb}, ${data.od}, '45-59', ${data.a45_59}, ${data.b45_59})
            `);
            // 30-44 degrees
            await queryRunner.query(`
                INSERT INTO sabs62_fitting_dimension 
                (fitting_type, nominal_diameter_mm, outside_diameter_mm, angle_range, dimension_a_mm, dimension_b_mm)
                VALUES ('Y_PIECE', ${data.nb}, ${data.od}, '30-44', ${data.a30_44}, ${data.b30_44})
            `);
        }

        // Insert GUSSETTED TEE data
        await queryRunner.query(`
            INSERT INTO sabs62_fitting_dimension 
            (fitting_type, nominal_diameter_mm, outside_diameter_mm, centre_to_face_c_mm)
            VALUES
            ('GUSSETTED_TEE', 80, 88.90, 150),
            ('GUSSETTED_TEE', 90, 101.60, 170),
            ('GUSSETTED_TEE', 100, 114.30, 180),
            ('GUSSETTED_TEE', 125, 139.70, 200),
            ('GUSSETTED_TEE', 150, 165.10, 230)
        `);

        // Insert EQUAL CROSS data
        await queryRunner.query(`
            INSERT INTO sabs62_fitting_dimension 
            (fitting_type, nominal_diameter_mm, outside_diameter_mm, centre_to_face_c_mm)
            VALUES
            ('EQUAL_CROSS', 15, 21.43, 90),
            ('EQUAL_CROSS', 20, 26.99, 95),
            ('EQUAL_CROSS', 25, 34.13, 100),
            ('EQUAL_CROSS', 32, 42.86, 110),
            ('EQUAL_CROSS', 40, 48.42, 115),
            ('EQUAL_CROSS', 50, 60.32, 130),
            ('EQUAL_CROSS', 65, 76.20, 140),
            ('EQUAL_CROSS', 80, 88.90, 150),
            ('EQUAL_CROSS', 90, 101.60, 170),
            ('EQUAL_CROSS', 100, 114.30, 180),
            ('EQUAL_CROSS', 125, 139.70, 200),
            ('EQUAL_CROSS', 150, 165.10, 230)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('sabs62_fitting_dimension');
    }
}
