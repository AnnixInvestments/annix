import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateSabs719FittingDimensions1734265000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the SABS719 fitting dimensions table
        await queryRunner.createTable(
            new Table({
                name: 'sabs719_fitting_dimension',
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
                        comment: 'Type of fitting: ELBOW, MEDIUM_RADIUS_BEND, LONG_RADIUS_BEND, DUCKFOOT_SHORT, DUCKFOOT_GUSSETTED, SWEEP_LONG_RADIUS, SWEEP_MEDIUM_RADIUS, SWEEP_ELBOW, LATERAL',
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
                        name: 'dimension_a_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Dimension A in mm',
                    },
                    {
                        name: 'dimension_b_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Dimension B in mm',
                    },
                    {
                        name: 'dimension_c_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Dimension C in mm',
                    },
                    {
                        name: 'dimension_d_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Dimension D in mm (for sweeps and laterals)',
                    },
                    {
                        name: 'dimension_e_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Dimension E in mm (for sweeps and laterals)',
                    },
                    {
                        name: 'dimension_f_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Dimension F in mm (for sweeps and laterals)',
                    },
                    {
                        name: 'dimension_x_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Dimension X in mm (for duckfoot base)',
                    },
                    {
                        name: 'dimension_y_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Dimension Y in mm (for duckfoot)',
                    },
                    {
                        name: 'thickness_t1_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Thickness T1 in mm (for duckfoot ribs)',
                    },
                    {
                        name: 'thickness_t2_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Thickness T2 in mm (for duckfoot)',
                    },
                    {
                        name: 'dimension_h_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Dimension H in mm (for duckfoot height)',
                    },
                    {
                        name: 'radius_r_mm',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Radius R in mm',
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
                        name: 'IDX_sabs719_fitting_type',
                        columnNames: ['fitting_type'],
                    },
                    {
                        name: 'IDX_sabs719_nominal_diameter',
                        columnNames: ['nominal_diameter_mm'],
                    },
                    {
                        name: 'IDX_sabs719_fitting_lookup',
                        columnNames: ['fitting_type', 'nominal_diameter_mm'],
                    },
                ],
            }),
            true,
        );

        // Insert ELBOW data
        await queryRunner.query(`
            INSERT INTO sabs719_fitting_dimension 
            (fitting_type, nominal_diameter_mm, outside_diameter_mm, dimension_a_mm, dimension_b_mm, dimension_c_mm, radius_r_mm)
            VALUES
            ('ELBOW', 200, 219.1, 230.0, 155.0, 115.0, 230.0),
            ('ELBOW', 250, 273.1, 280.0, 180.0, 140.0, 280.0),
            ('ELBOW', 300, 323.9, 305.0, 205.0, 155.0, 305.0),
            ('ELBOW', 350, 355.6, 355.0, 230.0, 180.0, 355.0),
            ('ELBOW', 400, 406.4, 405.0, 255.0, 205.0, 405.0),
            ('ELBOW', 450, 457.0, 460.0, 280.0, 230.0, 460.0),
            ('ELBOW', 500, 508.0, 510.0, 305.0, 255.0, 510.0),
            ('ELBOW', 550, 559.0, 560.0, 330.0, 280.0, 560.0),
            ('ELBOW', 600, 610.0, 610.0, 355.0, 305.0, 610.0),
            ('ELBOW', 650, 660.0, 660.0, 380.0, 330.0, 660.0),
            ('ELBOW', 700, 711.0, 710.0, 405.0, 355.0, 710.0),
            ('ELBOW', 750, 762.0, 760.0, 430.0, 380.0, 760.0),
            ('ELBOW', 800, 813.0, 815.0, 460.0, 405.0, 815.0),
            ('ELBOW', 850, 864.0, 865.0, 485.0, 430.0, 865.0),
            ('ELBOW', 900, 914.0, 915.0, 510.0, 460.0, 915.0)
        `);

        // Insert MEDIUM RADIUS BEND data
        await queryRunner.query(`
            INSERT INTO sabs719_fitting_dimension 
            (fitting_type, nominal_diameter_mm, outside_diameter_mm, dimension_a_mm, dimension_b_mm, dimension_c_mm, radius_r_mm)
            VALUES
            ('MEDIUM_RADIUS_BEND', 200, 219.1, 405.0, 205.0, 140.0, 405.0),
            ('MEDIUM_RADIUS_BEND', 250, 273.1, 510.0, 255.0, 180.0, 510.0),
            ('MEDIUM_RADIUS_BEND', 300, 323.9, 610.0, 305.0, 205.0, 610.0),
            ('MEDIUM_RADIUS_BEND', 350, 355.6, 710.0, 355.0, 240.0, 710.0),
            ('MEDIUM_RADIUS_BEND', 400, 406.4, 815.0, 405.0, 280.0, 815.0),
            ('MEDIUM_RADIUS_BEND', 450, 457.0, 915.0, 460.0, 305.0, 915.0),
            ('MEDIUM_RADIUS_BEND', 500, 508.0, 1020.0, 510.0, 345.0, 1020.0),
            ('MEDIUM_RADIUS_BEND', 550, 559.0, 1120.0, 560.0, 380.0, 1120.0),
            ('MEDIUM_RADIUS_BEND', 600, 610.0, 1220.0, 610.0, 405.0, 1220.0),
            ('MEDIUM_RADIUS_BEND', 650, 660.0, 1320.0, 660.0, 445.0, 1320.0),
            ('MEDIUM_RADIUS_BEND', 700, 711.0, 1420.0, 710.0, 485.0, 1420.0),
            ('MEDIUM_RADIUS_BEND', 750, 762.0, 1520.0, 760.0, 510.0, 1520.0),
            ('MEDIUM_RADIUS_BEND', 800, 813.0, 1630.0, 815.0, 545.0, 1630.0),
            ('MEDIUM_RADIUS_BEND', 850, 864.0, 1730.0, 865.0, 585.0, 1730.0),
            ('MEDIUM_RADIUS_BEND', 900, 914.0, 1830.0, 915.0, 610.0, 1830.0)
        `);

        // Insert LONG RADIUS BEND data
        await queryRunner.query(`
            INSERT INTO sabs719_fitting_dimension 
            (fitting_type, nominal_diameter_mm, outside_diameter_mm, dimension_a_mm, dimension_b_mm, dimension_c_mm, radius_r_mm)
            VALUES
            ('LONG_RADIUS_BEND', 200, 219.1, 610.0, 405.0, 205.0, 610.0),
            ('LONG_RADIUS_BEND', 250, 273.1, 760.0, 510.0, 255.0, 760.0),
            ('LONG_RADIUS_BEND', 300, 323.9, 915.0, 610.0, 305.0, 915.0),
            ('LONG_RADIUS_BEND', 350, 355.6, 1065.0, 710.0, 355.0, 1065.0),
            ('LONG_RADIUS_BEND', 400, 406.4, 1215.0, 815.0, 405.0, 1215.0),
            ('LONG_RADIUS_BEND', 450, 457.0, 1380.0, 915.0, 460.0, 1380.0),
            ('LONG_RADIUS_BEND', 500, 508.0, 1530.0, 1020.0, 510.0, 1530.0),
            ('LONG_RADIUS_BEND', 550, 559.0, 1680.0, 1120.0, 560.0, 1680.0),
            ('LONG_RADIUS_BEND', 600, 610.0, 1830.0, 1220.0, 610.0, 1830.0),
            ('LONG_RADIUS_BEND', 650, 660.0, 1980.0, 1320.0, 660.0, 1980.0),
            ('LONG_RADIUS_BEND', 700, 711.0, 2130.0, 1420.0, 710.0, 2130.0),
            ('LONG_RADIUS_BEND', 750, 762.0, 2280.0, 1520.0, 760.0, 2280.0),
            ('LONG_RADIUS_BEND', 800, 813.0, 2445.0, 1630.0, 815.0, 2445.0),
            ('LONG_RADIUS_BEND', 850, 864.0, 2595.0, 1730.0, 865.0, 2595.0),
            ('LONG_RADIUS_BEND', 900, 914.0, 2745.0, 1830.0, 915.0, 2745.0)
        `);

        // Insert DUCKFOOT SHORT data (uses dimension A)
        await queryRunner.query(`
            INSERT INTO sabs719_fitting_dimension 
            (fitting_type, nominal_diameter_mm, outside_diameter_mm, dimension_a_mm, dimension_x_mm, dimension_y_mm, thickness_t1_mm, thickness_t2_mm, dimension_h_mm)
            VALUES
            ('DUCKFOOT_SHORT', 200, 219.1, 230.0, 355.0, 230.0, 6.0, 10.0, 255.0),
            ('DUCKFOOT_SHORT', 250, 273.1, 280.0, 405.0, 280.0, 6.0, 10.0, 280.0),
            ('DUCKFOOT_SHORT', 300, 323.9, 305.0, 460.0, 330.0, 6.0, 10.0, 305.0),
            ('DUCKFOOT_SHORT', 350, 355.6, 355.0, 510.0, 380.0, 8.0, 12.0, 330.0),
            ('DUCKFOOT_SHORT', 400, 406.4, 405.0, 560.0, 430.0, 8.0, 12.0, 355.0),
            ('DUCKFOOT_SHORT', 450, 457.0, 460.0, 610.0, 485.0, 8.0, 12.0, 380.0),
            ('DUCKFOOT_SHORT', 500, 508.0, 510.0, 660.0, 535.0, 10.0, 14.0, 405.0),
            ('DUCKFOOT_SHORT', 550, 559.0, 560.0, 710.0, 585.0, 10.0, 14.0, 430.0),
            ('DUCKFOOT_SHORT', 600, 610.0, 610.0, 760.0, 635.0, 10.0, 14.0, 460.0),
            ('DUCKFOOT_SHORT', 650, 660.0, 660.0, 815.0, 693.0, 12.0, 16.0, 485.0),
            ('DUCKFOOT_SHORT', 700, 711.0, 710.0, 865.0, 733.0, 12.0, 16.0, 510.0),
            ('DUCKFOOT_SHORT', 750, 762.0, 760.0, 915.0, 793.0, 12.0, 16.0, 535.0),
            ('DUCKFOOT_SHORT', 800, 813.0, 815.0, 970.0, 833.0, 14.0, 18.0, 560.0),
            ('DUCKFOOT_SHORT', 850, 864.0, 865.0, 1020.0, 883.0, 14.0, 18.0, 585.0),
            ('DUCKFOOT_SHORT', 900, 914.0, 915.0, 1070.0, 933.0, 14.0, 18.0, 610.0)
        `);

        // Insert DUCKFOOT GUSSETTED data (uses dimensions B and C)
        await queryRunner.query(`
            INSERT INTO sabs719_fitting_dimension 
            (fitting_type, nominal_diameter_mm, outside_diameter_mm, dimension_b_mm, dimension_c_mm, dimension_x_mm, dimension_y_mm, thickness_t1_mm, thickness_t2_mm, dimension_h_mm)
            VALUES
            ('DUCKFOOT_GUSSETTED', 200, 219.1, 355.0, 102.0, 355.0, 230.0, 6.0, 10.0, 255.0),
            ('DUCKFOOT_GUSSETTED', 250, 273.1, 405.0, 127.0, 405.0, 280.0, 6.0, 10.0, 280.0),
            ('DUCKFOOT_GUSSETTED', 300, 323.9, 460.0, 155.0, 460.0, 330.0, 6.0, 10.0, 305.0),
            ('DUCKFOOT_GUSSETTED', 350, 355.6, 510.0, 180.0, 510.0, 380.0, 8.0, 12.0, 330.0),
            ('DUCKFOOT_GUSSETTED', 400, 406.4, 560.0, 205.0, 560.0, 430.0, 8.0, 12.0, 355.0),
            ('DUCKFOOT_GUSSETTED', 450, 457.0, 610.0, 230.0, 610.0, 485.0, 8.0, 12.0, 380.0),
            ('DUCKFOOT_GUSSETTED', 500, 508.0, 660.0, 255.0, 660.0, 535.0, 10.0, 14.0, 405.0),
            ('DUCKFOOT_GUSSETTED', 550, 559.0, 710.0, 280.0, 710.0, 585.0, 10.0, 14.0, 430.0),
            ('DUCKFOOT_GUSSETTED', 600, 610.0, 760.0, 305.0, 760.0, 635.0, 10.0, 14.0, 460.0),
            ('DUCKFOOT_GUSSETTED', 650, 660.0, 815.0, 330.0, 815.0, 693.0, 12.0, 16.0, 485.0),
            ('DUCKFOOT_GUSSETTED', 700, 711.0, 865.0, 355.0, 865.0, 733.0, 12.0, 16.0, 510.0),
            ('DUCKFOOT_GUSSETTED', 750, 762.0, 915.0, 380.0, 915.0, 793.0, 12.0, 16.0, 535.0),
            ('DUCKFOOT_GUSSETTED', 800, 813.0, 970.0, 405.0, 970.0, 833.0, 14.0, 18.0, 560.0),
            ('DUCKFOOT_GUSSETTED', 850, 864.0, 1020.0, 430.0, 1020.0, 883.0, 14.0, 18.0, 585.0),
            ('DUCKFOOT_GUSSETTED', 900, 914.0, 1070.0, 460.0, 1070.0, 933.0, 14.0, 18.0, 610.0)
        `);

        // Insert SWEEP LONG RADIUS data
        await queryRunner.query(`
            INSERT INTO sabs719_fitting_dimension 
            (fitting_type, nominal_diameter_mm, outside_diameter_mm, dimension_a_mm, dimension_b_mm, dimension_c_mm, dimension_d_mm, dimension_e_mm, dimension_f_mm, radius_r_mm)
            VALUES
            ('SWEEP_LONG_RADIUS', 200, 219.1, 610.0, 815.0, 405.0, 610.0, 230.0, 430.0, 205.0),
            ('SWEEP_LONG_RADIUS', 250, 273.1, 760.0, 1020.0, 510.0, 760.0, 280.0, 535.0, 255.0),
            ('SWEEP_LONG_RADIUS', 300, 323.9, 915.0, 1220.0, 610.0, 915.0, 305.0, 610.0, 280.0),
            ('SWEEP_LONG_RADIUS', 350, 355.6, 1070.0, 1420.0, 710.0, 1070.0, 355.0, 710.0, 330.0),
            ('SWEEP_LONG_RADIUS', 400, 406.4, 1215.0, 1630.0, 815.0, 1215.0, 405.0, 810.0, 380.0),
            ('SWEEP_LONG_RADIUS', 450, 457.0, 1380.0, 1830.0, 915.0, 1380.0, 460.0, 920.0, 430.0),
            ('SWEEP_LONG_RADIUS', 500, 508.0, 1530.0, 2040.0, 1020.0, 1530.0, 510.0, 1020.0, 485.0),
            ('SWEEP_LONG_RADIUS', 550, 559.0, 1680.0, 2240.0, 1120.0, 1680.0, 560.0, 1120.0, 535.0),
            ('SWEEP_LONG_RADIUS', 600, 610.0, 1830.0, 2440.0, 1220.0, 1830.0, 610.0, 1220.0, 585.0),
            ('SWEEP_LONG_RADIUS', 650, 660.0, 1980.0, 2640.0, 1320.0, 1980.0, 660.0, 1320.0, 635.0),
            ('SWEEP_LONG_RADIUS', 700, 711.0, 2130.0, 2840.0, 1420.0, 2130.0, 710.0, 1420.0, 685.0),
            ('SWEEP_LONG_RADIUS', 750, 762.0, 2280.0, 3040.0, 1520.0, 2280.0, 760.0, 1520.0, 740.0),
            ('SWEEP_LONG_RADIUS', 800, 813.0, 2445.0, 3260.0, 1630.0, 2445.0, 815.0, 1630.0, 790.0),
            ('SWEEP_LONG_RADIUS', 850, 864.0, 2595.0, 3460.0, 1730.0, 2595.0, 865.0, 1730.0, 840.0),
            ('SWEEP_LONG_RADIUS', 900, 914.0, 2745.0, 3660.0, 1830.0, 2745.0, 915.0, 1830.0, 890.0)
        `);

        // Insert SWEEP MEDIUM RADIUS data (same as SWEEP_LONG_RADIUS dimensions A, C, D, E, F)
        await queryRunner.query(`
            INSERT INTO sabs719_fitting_dimension 
            (fitting_type, nominal_diameter_mm, outside_diameter_mm, dimension_a_mm, dimension_c_mm, dimension_d_mm, dimension_e_mm, dimension_f_mm)
            VALUES
            ('SWEEP_MEDIUM_RADIUS', 200, 219.1, 610.0, 405.0, 610.0, 230.0, 430.0),
            ('SWEEP_MEDIUM_RADIUS', 250, 273.1, 760.0, 510.0, 760.0, 280.0, 535.0),
            ('SWEEP_MEDIUM_RADIUS', 300, 323.9, 915.0, 610.0, 915.0, 305.0, 610.0),
            ('SWEEP_MEDIUM_RADIUS', 350, 355.6, 1070.0, 710.0, 1070.0, 355.0, 710.0),
            ('SWEEP_MEDIUM_RADIUS', 400, 406.4, 1215.0, 815.0, 1215.0, 405.0, 810.0),
            ('SWEEP_MEDIUM_RADIUS', 450, 457.0, 1380.0, 915.0, 1380.0, 460.0, 920.0),
            ('SWEEP_MEDIUM_RADIUS', 500, 508.0, 1530.0, 1020.0, 1530.0, 510.0, 1020.0),
            ('SWEEP_MEDIUM_RADIUS', 550, 559.0, 1680.0, 1120.0, 1680.0, 560.0, 1120.0),
            ('SWEEP_MEDIUM_RADIUS', 600, 610.0, 1830.0, 1220.0, 1830.0, 610.0, 1220.0),
            ('SWEEP_MEDIUM_RADIUS', 650, 660.0, 1980.0, 1320.0, 1980.0, 660.0, 1320.0),
            ('SWEEP_MEDIUM_RADIUS', 700, 711.0, 2130.0, 1420.0, 2130.0, 710.0, 1420.0),
            ('SWEEP_MEDIUM_RADIUS', 750, 762.0, 2280.0, 1520.0, 2280.0, 760.0, 1520.0),
            ('SWEEP_MEDIUM_RADIUS', 800, 813.0, 2445.0, 1630.0, 2445.0, 815.0, 1630.0),
            ('SWEEP_MEDIUM_RADIUS', 850, 864.0, 2595.0, 1730.0, 2595.0, 865.0, 1730.0),
            ('SWEEP_MEDIUM_RADIUS', 900, 914.0, 2745.0, 1830.0, 2745.0, 915.0, 1830.0)
        `);

        // Insert SWEEP ELBOW data (dimensions E and F from sweep table)
        await queryRunner.query(`
            INSERT INTO sabs719_fitting_dimension 
            (fitting_type, nominal_diameter_mm, outside_diameter_mm, dimension_e_mm, dimension_f_mm)
            VALUES
            ('SWEEP_ELBOW', 200, 219.1, 230.0, 430.0),
            ('SWEEP_ELBOW', 250, 273.1, 280.0, 535.0),
            ('SWEEP_ELBOW', 300, 323.9, 305.0, 610.0),
            ('SWEEP_ELBOW', 350, 355.6, 355.0, 710.0),
            ('SWEEP_ELBOW', 400, 406.4, 405.0, 810.0),
            ('SWEEP_ELBOW', 450, 457.0, 460.0, 920.0),
            ('SWEEP_ELBOW', 500, 508.0, 510.0, 1020.0),
            ('SWEEP_ELBOW', 550, 559.0, 560.0, 1120.0),
            ('SWEEP_ELBOW', 600, 610.0, 610.0, 1220.0),
            ('SWEEP_ELBOW', 650, 660.0, 660.0, 1320.0),
            ('SWEEP_ELBOW', 700, 711.0, 710.0, 1420.0),
            ('SWEEP_ELBOW', 750, 762.0, 760.0, 1520.0),
            ('SWEEP_ELBOW', 800, 813.0, 815.0, 1630.0),
            ('SWEEP_ELBOW', 850, 864.0, 865.0, 1730.0),
            ('SWEEP_ELBOW', 900, 914.0, 915.0, 1830.0)
        `);

        // Insert LATERAL data
        await queryRunner.query(`
            INSERT INTO sabs719_fitting_dimension 
            (fitting_type, nominal_diameter_mm, outside_diameter_mm, dimension_a_mm, dimension_b_mm, dimension_c_mm, dimension_d_mm, dimension_e_mm, dimension_f_mm)
            VALUES
            ('LATERAL', 200, 219.1, 430.0, 610.0, 610.0, 710.0, 815.0, 915.0),
            ('LATERAL', 250, 273.1, 485.0, 685.0, 685.0, 815.0, 940.0, 1065.0),
            ('LATERAL', 300, 323.9, 535.0, 760.0, 760.0, 915.0, 1005.0, 1220.0),
            ('LATERAL', 350, 355.6, 585.0, 840.0, 840.0, 1020.0, 1195.0, 1370.0),
            ('LATERAL', 400, 406.4, 635.0, 915.0, 915.0, 1120.0, 1320.0, 1520.0),
            ('LATERAL', 450, 457.0, 685.0, 990.0, 990.0, 1220.0, 1450.0, 1670.0),
            ('LATERAL', 500, 508.0, 740.0, 1065.0, 1065.0, 1320.0, 1575.0, 1830.0),
            ('LATERAL', 550, 559.0, 790.0, 1140.0, 1140.0, 1420.0, 1700.0, 1980.0),
            ('LATERAL', 600, 610.0, 840.0, 1220.0, 1220.0, 1520.0, 1830.0, 2130.0),
            ('LATERAL', 650, 660.0, 890.0, 1295.0, 1295.0, 1630.0, 1955.0, 2280.0),
            ('LATERAL', 700, 711.0, 940.0, 1370.0, 1370.0, 1730.0, 2080.0, 2430.0),
            ('LATERAL', 750, 762.0, 990.0, 1445.0, 1445.0, 1830.0, 2210.0, 2595.0),
            ('LATERAL', 800, 813.0, 1045.0, 1520.0, 1520.0, 1930.0, 2335.0, 2745.0),
            ('LATERAL', 850, 864.0, 1095.0, 1595.0, 1595.0, 2030.0, 2465.0, 2895.0),
            ('LATERAL', 900, 914.0, 1145.0, 1670.0, 1670.0, 2130.0, 2595.0, 3040.0)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('sabs719_fitting_dimension');
    }
}
