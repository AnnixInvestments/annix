import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDetailedSABS62FittingDimensions1762180179295 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🔧 Adding detailed SABS 62 fitting dimensions...');

        // Get SABS 62 steel specification IDs
        const sabs62Medium = await queryRunner.query(`SELECT id FROM steel_specifications WHERE steel_spec_name = 'SABS 62 ERW Medium'`);
        const sabs62Heavy = await queryRunner.query(`SELECT id FROM steel_specifications WHERE steel_spec_name = 'SABS 62 ERW Heavy'`);

        if (!sabs62Medium.length || !sabs62Heavy.length) {
            console.error('SABS 62 steel specifications not found. Please run SABS 62 pipe data migration first.');
            return;
        }

        const mediumId = sabs62Medium[0].id;
        const heavyId = sabs62Heavy[0].id;

        // Insert fitting types if they don't exist
        await this.insertFittingTypes(queryRunner);

        // Create fitting variants and dimensions
        await this.insert90DegreePulledBends(queryRunner, mediumId, heavyId);
        await this.insertSpringBends5D(queryRunner, heavyId);
        await this.insertSpringBends3D(queryRunner, heavyId);
        await this.insertEqualTees(queryRunner, mediumId);
        await this.insertUnequalTees(queryRunner, mediumId);
        await this.insertLaterals(queryRunner, mediumId);
        await this.insertSweepTees(queryRunner, mediumId);
        await this.insertEqualCrosses(queryRunner, mediumId);
        await this.insertUnequalCrosses(queryRunner, mediumId);
        await this.insertYPieces(queryRunner, mediumId);
        await this.insertGussettedTees(queryRunner, mediumId);
        await this.insertBullheadTees(queryRunner, mediumId);

        console.log('✅ SABS 62 detailed fitting dimensions added successfully');
    }

    private async insertFittingTypes(queryRunner: QueryRunner): Promise<void> {
        const fittingTypes = [
            'Pulled Bend 90°',
            'Spring Bend 5D',
            'Spring Bend 3D', 
            'Equal Tee',
            'Unequal Tee',
            'Lateral',
            'Sweep Tee',
            'Equal Cross',
            'Unequal Cross',
            'Y Piece',
            'Gussetted Tee',
            'Bullhead Tee'
        ];

        for (const type of fittingTypes) {
            await queryRunner.query(`
                INSERT INTO fitting_types (name) 
                VALUES ('${type}')
                ON CONFLICT (name) DO NOTHING
            `);
        }
    }

    private async insert90DegreePulledBends(queryRunner: QueryRunner, mediumId: number, heavyId: number): Promise<void> {
        console.log('  📐 Adding 90° Pulled Bends...');
        
        const typeId = await this.getFittingTypeId(queryRunner, 'Pulled Bend 90°');
        
        // Create fitting for SABS 62 Medium
        const mediumFittingResult = await queryRunner.query(`
            INSERT INTO fittings (steel_specification_id, fitting_type_id)
            VALUES (${mediumId}, ${typeId})
            RETURNING id
        `);
        const mediumFittingId = mediumFittingResult[0].id;

        // Create fitting for SABS 62 Heavy  
        const heavyFittingResult = await queryRunner.query(`
            INSERT INTO fittings (steel_specification_id, fitting_type_id)
            VALUES (${heavyId}, ${typeId})
            RETURNING id
        `);
        const heavyFittingId = heavyFittingResult[0].id;

        // 90° Pulled Bends data (using both medium and heavy)
        const bendsData = [
            { nb: 15, od: 21.43, r3d: 57, l3d: 57, r5d: 95, l5d: 130 },
            { nb: 20, od: 26.99, r3d: 64, l3d: 73, r5d: 140, l5d: 195 },
            { nb: 25, od: 34.13, r3d: 76, l3d: 89, r5d: 160, l5d: 220 },
            { nb: 32, od: 42.86, r3d: 95, l3d: 108, r5d: 175, l5d: 230 },
            { nb: 40, od: 48.42, r3d: 114, l3d: 127, r5d: 195, l5d: 250 },
            { nb: 50, od: 60.32, r3d: 152, l3d: 159, r5d: 295, l5d: 350 },
            { nb: 65, od: 76.20, r3d: 191, l3d: 253, r5d: 325, l5d: 400 },
            { nb: 80, od: 88.90, r3d: 229, l3d: 297, r5d: 445, l5d: 550 },
            { nb: 100, od: 114.30, r3d: 305, l3d: 387, r5d: 508, l5d: 600 },
            { nb: 125, od: 139.70, r3d: 381, l3d: 546, r5d: 635, l5d: 700 },
            { nb: 150, od: 165.10, r3d: 457, l3d: 628, r5d: 840, l5d: 830 }
        ];

        for (const bend of bendsData) {
            const nominalOdId = await this.getNominalOdId(queryRunner, bend.nb, bend.od);
            
            if (nominalOdId) {
                // Create variants for 3D and 5D bends for both medium and heavy
                const variants = [
                    { fitting: mediumFittingId, radius: bend.r3d, length: bend.l3d, type: '3D' },
                    { fitting: mediumFittingId, radius: bend.r5d, length: bend.l5d, type: '5D' },
                    { fitting: heavyFittingId, radius: bend.r3d, length: bend.l3d, type: '3D' },
                    { fitting: heavyFittingId, radius: bend.r5d, length: bend.l5d, type: '5D' }
                ];

                for (const variant of variants) {
                    const variantResult = await queryRunner.query(`
                        INSERT INTO fitting_variants (fitting_id)
                        VALUES (${variant.fitting})
                        RETURNING id
                    `);
                    const variantId = variantResult[0].id;

                    // Add fitting bore
                    await queryRunner.query(`
                        INSERT INTO fitting_bores (bore_position, nominal_outside_diameter_id, fitting_variant_id)
                        VALUES ('inlet', ${nominalOdId}, ${variantId})
                    `);

                    // Add dimensions
                    await queryRunner.query(`
                        INSERT INTO fitting_dimensions (dimension_name, dimension_value_mm, fitting_variant_id)
                        VALUES 
                            ('radius', ${variant.radius}, ${variantId}),
                            ('centre_to_face', ${variant.length}, ${variantId}),
                            ('bend_type', 0, ${variantId})
                    `);

                    // Add a text field to identify the bend type
                    await queryRunner.query(`
                        UPDATE fitting_variants 
                        SET fitting_id = ${variant.fitting}
                        WHERE id = ${variantId}
                    `);
                }
            }
        }
    }

    private async insertSpringBends5D(queryRunner: QueryRunner, heavyId: number): Promise<void> {
        console.log('  🌸 Adding Spring Bends 5D...');
        
        const typeId = await this.getFittingTypeId(queryRunner, 'Spring Bend 5D');
        
        const fittingResult = await queryRunner.query(`
            INSERT INTO fittings (steel_specification_id, fitting_type_id)
            VALUES (${heavyId}, ${typeId})
            RETURNING id
        `);
        const fittingId = fittingResult[0].id;

        const springBends5D = [
            { nb: 15, od: 21.43, radius: 95, l46_90: 100, l1_45: 70 },
            { nb: 20, od: 26.99, radius: 140, l46_90: 150, l1_45: 85 },
            { nb: 25, od: 34.13, radius: 160, l46_90: 175, l1_45: 100 },
            { nb: 32, od: 42.86, radius: 175, l46_90: 190, l1_45: 125 },
            { nb: 40, od: 48.42, radius: 195, l46_90: 210, l1_45: 140 },
            { nb: 50, od: 60.32, radius: 295, l46_90: 255, l1_45: 170 },
            { nb: 65, od: 76.20, radius: 325, l46_90: 350, l1_45: 204 },
            { nb: 80, od: 88.90, radius: 445, l46_90: 470, l1_45: 240 },
            { nb: 100, od: 114.30, radius: 508, l46_90: 575, l1_45: 329 },
            { nb: 125, od: 139.70, radius: 635, l46_90: 700, l1_45: 435 },
            { nb: 150, od: 165.10, radius: 840, l46_90: 875, l1_45: 509 }
        ];

        for (const bend of springBends5D) {
            const nominalOdId = await this.getNominalOdId(queryRunner, bend.nb, bend.od);
            
            if (nominalOdId) {
                // Create variants for different angle ranges
                const variants = [
                    { angles: '46°-90°', length: bend.l46_90 },
                    { angles: '1°-45°', length: bend.l1_45 }
                ];

                for (const variant of variants) {
                    const variantResult = await queryRunner.query(`
                        INSERT INTO fitting_variants (fitting_id)
                        VALUES (${fittingId})
                        RETURNING id
                    `);
                    const variantId = variantResult[0].id;

                    await queryRunner.query(`
                        INSERT INTO fitting_bores (bore_position, nominal_outside_diameter_id, fitting_variant_id)
                        VALUES ('inlet', ${nominalOdId}, ${variantId})
                    `);

                    await queryRunner.query(`
                        INSERT INTO fitting_dimensions (dimension_name, dimension_value_mm, fitting_variant_id)
                        VALUES 
                            ('radius', ${bend.radius}, ${variantId}),
                            ('length', ${variant.length}, ${variantId})
                    `);
                }
            }
        }
    }

    private async insertSpringBends3D(queryRunner: QueryRunner, heavyId: number): Promise<void> {
        console.log('  🌿 Adding Spring Bends 3D...');
        
        const typeId = await this.getFittingTypeId(queryRunner, 'Spring Bend 3D');
        
        const fittingResult = await queryRunner.query(`
            INSERT INTO fittings (steel_specification_id, fitting_type_id)
            VALUES (${heavyId}, ${typeId})
            RETURNING id
        `);
        const fittingId = fittingResult[0].id;

        const springBends3D = [
            { nb: 15, od: 21.43, radius: 57, l46_90: 90, l1_45: 75 },
            { nb: 20, od: 26.99, radius: 64, l46_90: 106, l1_45: 75 },
            { nb: 25, od: 34.13, radius: 76, l46_90: 125, l1_45: 80 },
            { nb: 32, od: 42.86, radius: 95, l46_90: 150, l1_45: 87 },
            { nb: 40, od: 48.42, radius: 114, l46_90: 169, l1_45: 95 },
            { nb: 50, od: 60.32, radius: 152, l46_90: 208, l1_45: 115 },
            { nb: 65, od: 76.20, radius: 191, l46_90: 253, l1_45: 138 },
            { nb: 80, od: 88.90, radius: 229, l46_90: 297, l1_45: 161 },
            { nb: 90, od: 101.60, radius: 267, l46_90: 375, l1_45: 225 },
            { nb: 100, od: 114.30, radius: 305, l46_90: 387, l1_45: 207 },
            { nb: 125, od: 139.70, radius: 381, l46_90: 546, l1_45: 278 },
            { nb: 150, od: 165.10, radius: 457, l46_90: 628, l1_45: 315 },
            { nb: 175, od: 190.50, radius: 622, l46_90: 650, l1_45: 630 }
        ];

        for (const bend of springBends3D) {
            const nominalOdId = await this.getNominalOdId(queryRunner, bend.nb, bend.od);
            
            if (nominalOdId) {
                const variants = [
                    { angles: '46°-90°', length: bend.l46_90 },
                    { angles: '1°-45°', length: bend.l1_45 }
                ];

                for (const variant of variants) {
                    const variantResult = await queryRunner.query(`
                        INSERT INTO fitting_variants (fitting_id)
                        VALUES (${fittingId})
                        RETURNING id
                    `);
                    const variantId = variantResult[0].id;

                    await queryRunner.query(`
                        INSERT INTO fitting_bores (bore_position, nominal_outside_diameter_id, fitting_variant_id)
                        VALUES ('inlet', ${nominalOdId}, ${variantId})
                    `);

                    await queryRunner.query(`
                        INSERT INTO fitting_dimensions (dimension_name, dimension_value_mm, fitting_variant_id)
                        VALUES 
                            ('radius', ${bend.radius}, ${variantId}),
                            ('length', ${variant.length}, ${variantId})
                    `);
                }
            }
        }
    }

    private async insertEqualTees(queryRunner: QueryRunner, mediumId: number): Promise<void> {
        console.log('  🔀 Adding Equal Tees...');
        
        const typeId = await this.getFittingTypeId(queryRunner, 'Equal Tee');
        
        const fittingResult = await queryRunner.query(`
            INSERT INTO fittings (steel_specification_id, fitting_type_id)
            VALUES (${mediumId}, ${typeId})
            RETURNING id
        `);
        const fittingId = fittingResult[0].id;

        const equalTees = [
            { nb: 15, od: 21.43, ctf: 90 },
            { nb: 20, od: 26.99, ctf: 95 },
            { nb: 25, od: 34.13, ctf: 100 },
            { nb: 32, od: 42.86, ctf: 110 },
            { nb: 40, od: 48.42, ctf: 115 },
            { nb: 50, od: 60.32, ctf: 130 },
            { nb: 65, od: 76.20, ctf: 140 },
            { nb: 80, od: 88.90, ctf: 150 },
            { nb: 90, od: 101.60, ctf: 170 },
            { nb: 100, od: 114.30, ctf: 180 },
            { nb: 125, od: 139.70, ctf: 200 },
            { nb: 150, od: 165.10, ctf: 230 }
        ];

        for (const tee of equalTees) {
            const nominalOdId = await this.getNominalOdId(queryRunner, tee.nb, tee.od);
            
            if (nominalOdId) {
                const variantResult = await queryRunner.query(`
                    INSERT INTO fitting_variants (fitting_id)
                    VALUES (${fittingId})
                    RETURNING id
                `);
                const variantId = variantResult[0].id;

                // Add three bores (run-run-branch)
                await queryRunner.query(`
                    INSERT INTO fitting_bores (bore_position, nominal_outside_diameter_id, fitting_variant_id)
                    VALUES 
                        ('inlet', ${nominalOdId}, ${variantId}),
                        ('outlet', ${nominalOdId}, ${variantId}),
                        ('branch', ${nominalOdId}, ${variantId})
                `);

                await queryRunner.query(`
                    INSERT INTO fitting_dimensions (dimension_name, dimension_value_mm, fitting_variant_id)
                    VALUES ('centre_to_face', ${tee.ctf}, ${variantId})
                `);
            }
        }
    }

    private async insertUnequalTees(queryRunner: QueryRunner, mediumId: number): Promise<void> {
        console.log('  🔀 Adding Unequal Tees...');
        
        const typeId = await this.getFittingTypeId(queryRunner, 'Unequal Tee');
        
        const fittingResult = await queryRunner.query(`
            INSERT INTO fittings (steel_specification_id, fitting_type_id)
            VALUES (${mediumId}, ${typeId})
            RETURNING id
        `);
        const fittingId = fittingResult[0].id;

        // Unequal tees use same dimensions as equal tees but with different branch sizes
        const unequalTees = [
            { nb: 15, od: 21.43, ctf: 90 },
            { nb: 20, od: 26.99, ctf: 95 },
            { nb: 25, od: 34.13, ctf: 100 },
            { nb: 32, od: 42.86, ctf: 110 },
            { nb: 40, od: 48.42, ctf: 115 },
            { nb: 50, od: 60.32, ctf: 130 },
            { nb: 65, od: 76.20, ctf: 140 },
            { nb: 80, od: 88.90, ctf: 150 },
            { nb: 90, od: 101.60, ctf: 170 },
            { nb: 100, od: 114.30, ctf: 180 },
            { nb: 125, od: 139.70, ctf: 200 },
            { nb: 150, od: 165.10, ctf: 230 }
        ];

        for (const tee of unequalTees) {
            const nominalOdId = await this.getNominalOdId(queryRunner, tee.nb, tee.od);
            
            if (nominalOdId) {
                const variantResult = await queryRunner.query(`
                    INSERT INTO fitting_variants (fitting_id)
                    VALUES (${fittingId})
                    RETURNING id
                `);
                const variantId = variantResult[0].id;

                // For unequal tees, the branch can be smaller
                await queryRunner.query(`
                    INSERT INTO fitting_bores (bore_position, nominal_outside_diameter_id, fitting_variant_id)
                    VALUES 
                        ('inlet', ${nominalOdId}, ${variantId}),
                        ('outlet', ${nominalOdId}, ${variantId})
                `);

                await queryRunner.query(`
                    INSERT INTO fitting_dimensions (dimension_name, dimension_value_mm, fitting_variant_id)
                    VALUES ('centre_to_face', ${tee.ctf}, ${variantId})
                `);
            }
        }
    }

    private async insertLaterals(queryRunner: QueryRunner, mediumId: number): Promise<void> {
        console.log('  📐 Adding Laterals...');
        
        const typeId = await this.getFittingTypeId(queryRunner, 'Lateral');
        
        const fittingResult = await queryRunner.query(`
            INSERT INTO fittings (steel_specification_id, fitting_type_id)
            VALUES (${mediumId}, ${typeId})
            RETURNING id
        `);
        const fittingId = fittingResult[0].id;

        const laterals = [
            { nb: 50, od: 60.32, a60_90: 200, b60_90: 120, a45_59: 220, b45_59: 120, a30_44: 250, b30_44: 100 },
            { nb: 65, od: 76.20, a60_90: 220, b60_90: 120, a45_59: 240, b45_59: 120, a30_44: 270, b30_44: 120 },
            { nb: 80, od: 88.90, a60_90: 230, b60_90: 130, a45_59: 260, b45_59: 130, a30_44: 320, b30_44: 130 },
            { nb: 90, od: 101.60, a60_90: 240, b60_90: 130, a45_59: 280, b45_59: 130, a30_44: 350, b30_44: 130 },
            { nb: 100, od: 114.30, a60_90: 260, b60_90: 140, a45_59: 300, b45_59: 140, a30_44: 370, b30_44: 140 },
            { nb: 125, od: 139.70, a60_90: 290, b60_90: 150, a45_59: 330, b45_59: 150, a30_44: 420, b30_44: 150 },
            { nb: 150, od: 165.10, a60_90: 315, b60_90: 160, a45_59: 380, b45_59: 160, a30_44: 480, b30_44: 160 }
        ];

        for (const lateral of laterals) {
            const nominalOdId = await this.getNominalOdId(queryRunner, lateral.nb, lateral.od);
            
            if (nominalOdId) {
                const angleRanges = [
                    { range: '60°-90°', a: lateral.a60_90, b: lateral.b60_90 },
                    { range: '45°-59°', a: lateral.a45_59, b: lateral.b45_59 },
                    { range: '30°-44°', a: lateral.a30_44, b: lateral.b30_44 }
                ];

                for (const range of angleRanges) {
                    const variantResult = await queryRunner.query(`
                        INSERT INTO fitting_variants (fitting_id)
                        VALUES (${fittingId})
                        RETURNING id
                    `);
                    const variantId = variantResult[0].id;

                    await queryRunner.query(`
                        INSERT INTO fitting_bores (bore_position, nominal_outside_diameter_id, fitting_variant_id)
                        VALUES 
                            ('inlet', ${nominalOdId}, ${variantId}),
                            ('outlet', ${nominalOdId}, ${variantId}),
                            ('branch', ${nominalOdId}, ${variantId})
                    `);

                    await queryRunner.query(`
                        INSERT INTO fitting_dimensions (dimension_name, dimension_value_mm, fitting_variant_id)
                        VALUES 
                            ('dimension_a', ${range.a}, ${variantId}),
                            ('dimension_b', ${range.b}, ${variantId})
                    `);
                }
            }
        }
    }

    private async insertSweepTees(queryRunner: QueryRunner, mediumId: number): Promise<void> {
        console.log('  🌊 Adding Sweep Tees...');
        
        const typeId = await this.getFittingTypeId(queryRunner, 'Sweep Tee');
        
        const fittingResult = await queryRunner.query(`
            INSERT INTO fittings (steel_specification_id, fitting_type_id)
            VALUES (${mediumId}, ${typeId})
            RETURNING id
        `);
        const fittingId = fittingResult[0].id;

        const sweepTees = [
            { nb: 25, od: 34.13, ctf_c: 150, ctf_d: 100, radius: 75 },
            { nb: 32, od: 42.86, ctf_c: 170, ctf_d: 110, radius: 95 },
            { nb: 40, od: 48.42, ctf_c: 190, ctf_d: 115, radius: 115 },
            { nb: 50, od: 60.32, ctf_c: 240, ctf_d: 125, radius: 150 },
            { nb: 65, od: 76.20, ctf_c: 290, ctf_d: 140, radius: 190 },
            { nb: 80, od: 88.90, ctf_c: 330, ctf_d: 150, radius: 230 },
            { nb: 90, od: 101.60, ctf_c: 395, ctf_d: 165, radius: 265 },
            { nb: 100, od: 114.30, ctf_c: 430, ctf_d: 180, radius: 305 },
            { nb: 125, od: 139.70, ctf_c: 535, ctf_d: 205, radius: 380 },
            { nb: 150, od: 165.10, ctf_c: 635, ctf_d: 230, radius: 455 }
        ];

        for (const tee of sweepTees) {
            const nominalOdId = await this.getNominalOdId(queryRunner, tee.nb, tee.od);
            
            if (nominalOdId) {
                const variantResult = await queryRunner.query(`
                    INSERT INTO fitting_variants (fitting_id)
                    VALUES (${fittingId})
                    RETURNING id
                `);
                const variantId = variantResult[0].id;

                await queryRunner.query(`
                    INSERT INTO fitting_bores (bore_position, nominal_outside_diameter_id, fitting_variant_id)
                    VALUES 
                        ('inlet', ${nominalOdId}, ${variantId}),
                        ('outlet', ${nominalOdId}, ${variantId}),
                        ('branch', ${nominalOdId}, ${variantId})
                `);

                await queryRunner.query(`
                    INSERT INTO fitting_dimensions (dimension_name, dimension_value_mm, fitting_variant_id)
                    VALUES 
                        ('centre_to_face_c', ${tee.ctf_c}, ${variantId}),
                        ('centre_to_face_d', ${tee.ctf_d}, ${variantId}),
                        ('radius', ${tee.radius}, ${variantId})
                `);
            }
        }
    }

    private async insertEqualCrosses(queryRunner: QueryRunner, mediumId: number): Promise<void> {
        console.log('  ✚ Adding Equal Crosses...');
        
        const typeId = await this.getFittingTypeId(queryRunner, 'Equal Cross');
        
        const fittingResult = await queryRunner.query(`
            INSERT INTO fittings (steel_specification_id, fitting_type_id)
            VALUES (${mediumId}, ${typeId})
            RETURNING id
        `);
        const fittingId = fittingResult[0].id;

        const equalCrosses = [
            { nb: 15, od: 21.43, ctf: 90 },
            { nb: 20, od: 26.99, ctf: 95 },
            { nb: 25, od: 34.13, ctf: 100 },
            { nb: 32, od: 42.86, ctf: 110 },
            { nb: 40, od: 48.42, ctf: 115 },
            { nb: 50, od: 60.13, ctf: 130 },
            { nb: 65, od: 76.20, ctf: 140 },
            { nb: 80, od: 88.90, ctf: 150 },
            { nb: 90, od: 101.60, ctf: 170 },
            { nb: 100, od: 114.30, ctf: 180 },
            { nb: 125, od: 139.70, ctf: 200 },
            { nb: 150, od: 165.10, ctf: 230 }
        ];

        for (const cross of equalCrosses) {
            const nominalOdId = await this.getNominalOdId(queryRunner, cross.nb, cross.od);
            
            if (nominalOdId) {
                const variantResult = await queryRunner.query(`
                    INSERT INTO fitting_variants (fitting_id)
                    VALUES (${fittingId})
                    RETURNING id
                `);
                const variantId = variantResult[0].id;

                // Four equal bores
                await queryRunner.query(`
                    INSERT INTO fitting_bores (bore_position, nominal_outside_diameter_id, fitting_variant_id)
                    VALUES 
                        ('inlet', ${nominalOdId}, ${variantId}),
                        ('outlet', ${nominalOdId}, ${variantId}),
                        ('branch1', ${nominalOdId}, ${variantId}),
                        ('branch2', ${nominalOdId}, ${variantId})
                `);

                await queryRunner.query(`
                    INSERT INTO fitting_dimensions (dimension_name, dimension_value_mm, fitting_variant_id)
                    VALUES ('centre_to_face', ${cross.ctf}, ${variantId})
                `);
            }
        }
    }

    private async insertUnequalCrosses(queryRunner: QueryRunner, mediumId: number): Promise<void> {
        console.log('  ✚ Adding Unequal Crosses...');
        
        const typeId = await this.getFittingTypeId(queryRunner, 'Unequal Cross');
        
        const fittingResult = await queryRunner.query(`
            INSERT INTO fittings (steel_specification_id, fitting_type_id)
            VALUES (${mediumId}, ${typeId})
            RETURNING id
        `);
        const fittingId = fittingResult[0].id;

        const unequalCrosses = [
            { nb: 15, od: 21.43, ctf: 90 },
            { nb: 20, od: 26.99, ctf: 95 },
            { nb: 25, od: 34.13, ctf: 100 },
            { nb: 32, od: 42.86, ctf: 110 },
            { nb: 40, od: 48.42, ctf: 115 },
            { nb: 50, od: 60.13, ctf: 130 },
            { nb: 65, od: 76.20, ctf: 140 },
            { nb: 80, od: 88.90, ctf: 150 },
            { nb: 90, od: 101.60, ctf: 170 },
            { nb: 100, od: 114.30, ctf: 180 },
            { nb: 125, od: 139.70, ctf: 200 },
            { nb: 150, od: 165.10, ctf: 230 }
        ];

        for (const cross of unequalCrosses) {
            const nominalOdId = await this.getNominalOdId(queryRunner, cross.nb, cross.od);
            
            if (nominalOdId) {
                const variantResult = await queryRunner.query(`
                    INSERT INTO fitting_variants (fitting_id)
                    VALUES (${fittingId})
                    RETURNING id
                `);
                const variantId = variantResult[0].id;

                // Main run bores (same size)
                await queryRunner.query(`
                    INSERT INTO fitting_bores (bore_position, nominal_outside_diameter_id, fitting_variant_id)
                    VALUES 
                        ('inlet', ${nominalOdId}, ${variantId}),
                        ('outlet', ${nominalOdId}, ${variantId})
                `);

                await queryRunner.query(`
                    INSERT INTO fitting_dimensions (dimension_name, dimension_value_mm, fitting_variant_id)
                    VALUES ('centre_to_face', ${cross.ctf}, ${variantId})
                `);
            }
        }
    }

    private async insertYPieces(queryRunner: QueryRunner, mediumId: number): Promise<void> {
        console.log('  🔀 Adding Y Pieces...');
        
        const typeId = await this.getFittingTypeId(queryRunner, 'Y Piece');
        
        const fittingResult = await queryRunner.query(`
            INSERT INTO fittings (steel_specification_id, fitting_type_id)
            VALUES (${mediumId}, ${typeId})
            RETURNING id
        `);
        const fittingId = fittingResult[0].id;

        const yPieces = [
            { nb: 50, od: 60.32, a60_90: 200, b60_90: 120, a45_59: 220, b45_59: 120, a30_44: 250, b30_44: 100 },
            { nb: 65, od: 76.20, a60_90: 220, b60_90: 120, a45_59: 240, b45_59: 120, a30_44: 270, b30_44: 120 },
            { nb: 80, od: 88.90, a60_90: 230, b60_90: 130, a45_59: 260, b45_59: 130, a30_44: 320, b30_44: 130 },
            { nb: 90, od: 101.60, a60_90: 240, b60_90: 130, a45_59: 280, b45_59: 130, a30_44: 350, b30_44: 130 },
            { nb: 100, od: 114.30, a60_90: 260, b60_90: 140, a45_59: 300, b45_59: 140, a30_44: 370, b30_44: 140 },
            { nb: 125, od: 139.70, a60_90: 290, b60_90: 150, a45_59: 330, b45_59: 150, a30_44: 420, b30_44: 150 },
            { nb: 150, od: 165.10, a60_90: 315, b60_90: 160, a45_59: 380, b45_59: 160, a30_44: 480, b30_44: 160 }
        ];

        for (const yPiece of yPieces) {
            const nominalOdId = await this.getNominalOdId(queryRunner, yPiece.nb, yPiece.od);
            
            if (nominalOdId) {
                const angleRanges = [
                    { range: '60°-90°', a: yPiece.a60_90, b: yPiece.b60_90 },
                    { range: '45°-59°', a: yPiece.a45_59, b: yPiece.b45_59 },
                    { range: '30°-44°', a: yPiece.a30_44, b: yPiece.b30_44 }
                ];

                for (const range of angleRanges) {
                    const variantResult = await queryRunner.query(`
                        INSERT INTO fitting_variants (fitting_id)
                        VALUES (${fittingId})
                        RETURNING id
                    `);
                    const variantId = variantResult[0].id;

                    await queryRunner.query(`
                        INSERT INTO fitting_bores (bore_position, nominal_outside_diameter_id, fitting_variant_id)
                        VALUES 
                            ('inlet', ${nominalOdId}, ${variantId}),
                            ('branch1', ${nominalOdId}, ${variantId}),
                            ('branch2', ${nominalOdId}, ${variantId})
                    `);

                    await queryRunner.query(`
                        INSERT INTO fitting_dimensions (dimension_name, dimension_value_mm, fitting_variant_id)
                        VALUES 
                            ('dimension_a', ${range.a}, ${variantId}),
                            ('dimension_b', ${range.b}, ${variantId})
                    `);
                }
            }
        }
    }

    private async insertGussettedTees(queryRunner: QueryRunner, mediumId: number): Promise<void> {
        console.log('  🔧 Adding Gussetted Tees...');
        
        const typeId = await this.getFittingTypeId(queryRunner, 'Gussetted Tee');
        
        const fittingResult = await queryRunner.query(`
            INSERT INTO fittings (steel_specification_id, fitting_type_id)
            VALUES (${mediumId}, ${typeId})
            RETURNING id
        `);
        const fittingId = fittingResult[0].id;

        const gussettedTees = [
            { nb: 80, od: 88.90, ctf: 150 },
            { nb: 90, od: 101.60, ctf: 170 },
            { nb: 100, od: 114.30, ctf: 180 },
            { nb: 125, od: 139.70, ctf: 200 },
            { nb: 150, od: 165.10, ctf: 230 }
        ];

        for (const tee of gussettedTees) {
            const nominalOdId = await this.getNominalOdId(queryRunner, tee.nb, tee.od);
            
            if (nominalOdId) {
                const variantResult = await queryRunner.query(`
                    INSERT INTO fitting_variants (fitting_id)
                    VALUES (${fittingId})
                    RETURNING id
                `);
                const variantId = variantResult[0].id;

                await queryRunner.query(`
                    INSERT INTO fitting_bores (bore_position, nominal_outside_diameter_id, fitting_variant_id)
                    VALUES 
                        ('inlet', ${nominalOdId}, ${variantId}),
                        ('outlet', ${nominalOdId}, ${variantId}),
                        ('branch', ${nominalOdId}, ${variantId})
                `);

                await queryRunner.query(`
                    INSERT INTO fitting_dimensions (dimension_name, dimension_value_mm, fitting_variant_id)
                    VALUES ('centre_to_face', ${tee.ctf}, ${variantId})
                `);
            }
        }
    }

    private async insertBullheadTees(queryRunner: QueryRunner, mediumId: number): Promise<void> {
        console.log('  🐂 Adding Bullhead Tees...');
        
        const typeId = await this.getFittingTypeId(queryRunner, 'Bullhead Tee');
        
        const fittingResult = await queryRunner.query(`
            INSERT INTO fittings (steel_specification_id, fitting_type_id)
            VALUES (${mediumId}, ${typeId})
            RETURNING id
        `);
        const fittingId = fittingResult[0].id;

        const bullheadTees = [
            { nb: 15, od: 21.43, ctf: 90 },
            { nb: 20, od: 26.99, ctf: 95 },
            { nb: 25, od: 34.13, ctf: 100 },
            { nb: 32, od: 42.86, ctf: 110 },
            { nb: 40, od: 48.42, ctf: 115 },
            { nb: 50, od: 60.32, ctf: 130 },
            { nb: 65, od: 76.20, ctf: 140 },
            { nb: 80, od: 88.90, ctf: 150 },
            { nb: 90, od: 101.60, ctf: 170 },
            { nb: 100, od: 114.30, ctf: 180 },
            { nb: 125, od: 139.70, ctf: 200 },
            { nb: 150, od: 165.10, ctf: 230 }
        ];

        for (const tee of bullheadTees) {
            const nominalOdId = await this.getNominalOdId(queryRunner, tee.nb, tee.od);
            
            if (nominalOdId) {
                const variantResult = await queryRunner.query(`
                    INSERT INTO fitting_variants (fitting_id)
                    VALUES (${fittingId})
                    RETURNING id
                `);
                const variantId = variantResult[0].id;

                await queryRunner.query(`
                    INSERT INTO fitting_bores (bore_position, nominal_outside_diameter_id, fitting_variant_id)
                    VALUES 
                        ('inlet', ${nominalOdId}, ${variantId}),
                        ('outlet', ${nominalOdId}, ${variantId})
                `);

                await queryRunner.query(`
                    INSERT INTO fitting_dimensions (dimension_name, dimension_value_mm, fitting_variant_id)
                    VALUES ('centre_to_face', ${tee.ctf}, ${variantId})
                `);
            }
        }
    }

    private async getFittingTypeId(queryRunner: QueryRunner, name: string): Promise<number> {
        const result = await queryRunner.query(`SELECT id FROM fitting_types WHERE name = '${name}'`);
        return result[0].id;
    }

    private async getNominalOdId(queryRunner: QueryRunner, nominalMm: number, odMm: number): Promise<number | null> {
        const result = await queryRunner.query(`
            SELECT id FROM nominal_outside_diameters 
            WHERE nominal_diameter_mm = ${nominalMm} AND outside_diameter_mm = ${odMm}
        `);
        return result.length > 0 ? result[0].id : null;
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove all SABS 62 fitting data
        const sabs62Medium = await queryRunner.query(`SELECT id FROM steel_specifications WHERE steel_spec_name = 'SABS 62 ERW Medium'`);
        const sabs62Heavy = await queryRunner.query(`SELECT id FROM steel_specifications WHERE steel_spec_name = 'SABS 62 ERW Heavy'`);

        if (sabs62Medium.length > 0) {
            await queryRunner.query(`DELETE FROM fittings WHERE steel_specification_id = ${sabs62Medium[0].id}`);
        }
        if (sabs62Heavy.length > 0) {
            await queryRunner.query(`DELETE FROM fittings WHERE steel_specification_id = ${sabs62Heavy[0].id}`);
        }
    }

}
