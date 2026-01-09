import { MigrationInterface, QueryRunner } from 'typeorm';

export class PopulateSabs719FittingDimension1762340000000 implements MigrationInterface {
  name = 'PopulateSabs719FittingDimension1762340000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Populating SABS 719 fitting dimension table...');

    // Clear existing data to avoid duplicates
    await queryRunner.query(`DELETE FROM sabs719_fitting_dimension`);

    // Short Tee dimensions - C/F (center-to-face) values from SABS 719 table
    // For Short Tee: Pipe Length A = C/F × 2 (run), Pipe Length B = C/F (branch)
    // We store the calculated pipe lengths directly:
    // [nb, od, cf] -> dimensionAMm = cf × 2, dimensionBMm = cf
    const shortTeeData = [
      [200, 219.1, 230.0],
      [250, 273.1, 280.0],
      [300, 323.9, 305.0],
      [350, 355.6, 355.0],
      [400, 406.4, 405.0],
      [450, 457.0, 460.0],
      [500, 508.0, 510.0], // C/F = 510, so Pipe A = 1020, Pipe B = 510
      [550, 559.0, 560.0],
      [600, 610.0, 610.0],
      [650, 660.0, 660.0],
      [700, 711.0, 710.0],
      [750, 762.0, 760.0],
      [800, 813.0, 815.0],
      [850, 864.0, 865.0],
      [900, 914.0, 915.0],
    ];

    for (const [nb, od, cf] of shortTeeData) {
      const pipeLengthA = cf * 2; // Run pipe length = C/F × 2
      const pipeLengthB = cf; // Branch pipe length = C/F
      await queryRunner.query(`
        INSERT INTO sabs719_fitting_dimension (
          fitting_type, nominal_diameter_mm, outside_diameter_mm,
          dimension_a_mm, dimension_b_mm
        ) VALUES (
          'SHORT_TEE', ${nb}, ${od}, ${pipeLengthA}, ${pipeLengthB}
        )
      `);
    }
    console.log(`✅ Inserted ${shortTeeData.length} Short Tee dimensions`);

    // Gusset Tee dimensions - C/F values from SABS 719 table
    // For Gusset Tee: Pipe Length A = C/F × 2 (run), Pipe Length B = C/F (branch)
    // [nb, od, cf]
    const gussetTeeCfData = [
      [200, 219.1, 355.0],
      [250, 273.1, 405.0],
      [300, 323.9, 460.0],
      [350, 355.6, 510.0],
      [400, 406.4, 560.0],
      [450, 457.0, 610.0],
      [500, 508.0, 660.0], // C/F = 660, so Pipe A = 1320, Pipe B = 660
      [550, 559.0, 710.0],
      [600, 610.0, 760.0],
      [650, 660.0, 815.0],
      [700, 711.0, 865.0],
      [750, 762.0, 915.0],
      [800, 813.0, 970.0],
      [850, 864.0, 1020.0],
      [900, 914.0, 1070.0],
    ];

    for (const [nb, od, cf] of gussetTeeCfData) {
      const pipeLengthA = cf * 2; // Run pipe length = C/F × 2
      const pipeLengthB = cf; // Branch pipe length = C/F
      await queryRunner.query(`
        INSERT INTO sabs719_fitting_dimension (
          fitting_type, nominal_diameter_mm, outside_diameter_mm,
          dimension_a_mm, dimension_b_mm
        ) VALUES (
          'GUSSET_TEE', ${nb}, ${od}, ${pipeLengthA}, ${pipeLengthB}
        )
      `);
    }
    console.log(`✅ Inserted ${gussetTeeCfData.length} Gusset Tee dimensions`);

    // Long Radius Elbow dimensions [nb, od, A (90°), A (45°)]
    const longRadiusElbowData = [
      [200, 219.1, 610.0, 405.0],
      [250, 273.1, 760.0, 510.0],
      [300, 323.9, 915.0, 610.0],
      [350, 355.6, 1070.0, 710.0],
      [400, 406.4, 1215.0, 815.0],
      [450, 457.0, 1380.0, 915.0],
      [500, 508.0, 1530.0, 1020.0],
      [550, 559.0, 1680.0, 1120.0],
      [600, 610.0, 1830.0, 1220.0],
      [650, 660.0, 1980.0, 1320.0],
      [700, 711.0, 2130.0, 1420.0],
      [750, 762.0, 2280.0, 1520.0],
      [800, 813.0, 2445.0, 1630.0],
      [850, 864.0, 2595.0, 1730.0],
      [900, 914.0, 2745.0, 1830.0],
    ];

    for (const [nb, od, a90, a45] of longRadiusElbowData) {
      await queryRunner.query(`
        INSERT INTO sabs719_fitting_dimension (
          fitting_type, nominal_diameter_mm, outside_diameter_mm,
          dimension_a_mm, dimension_b_mm
        ) VALUES (
          'LONG_RADIUS_BEND', ${nb}, ${od}, ${a90}, ${a45}
        )
      `);
    }
    console.log(
      `✅ Inserted ${longRadiusElbowData.length} Long Radius Elbow dimensions`,
    );

    // Medium Radius Elbow dimensions
    const mediumRadiusElbowData = [
      [200, 219.1, 405.0, 205.0],
      [250, 273.1, 510.0, 255.0],
      [300, 323.9, 610.0, 305.0],
      [350, 355.6, 710.0, 355.0],
      [400, 406.4, 815.0, 405.0],
      [450, 457.0, 915.0, 460.0],
      [500, 508.0, 1020.0, 510.0],
      [550, 559.0, 1120.0, 560.0],
      [600, 610.0, 1220.0, 610.0],
      [650, 660.0, 1320.0, 660.0],
      [700, 711.0, 1420.0, 710.0],
      [750, 762.0, 1520.0, 760.0],
      [800, 813.0, 1630.0, 815.0],
      [850, 864.0, 1730.0, 865.0],
      [900, 914.0, 1830.0, 915.0],
    ];

    for (const [nb, od, a90, a45] of mediumRadiusElbowData) {
      await queryRunner.query(`
        INSERT INTO sabs719_fitting_dimension (
          fitting_type, nominal_diameter_mm, outside_diameter_mm,
          dimension_a_mm, dimension_b_mm
        ) VALUES (
          'MEDIUM_RADIUS_BEND', ${nb}, ${od}, ${a90}, ${a45}
        )
      `);
    }
    console.log(
      `✅ Inserted ${mediumRadiusElbowData.length} Medium Radius Elbow dimensions`,
    );

    // Short Radius Elbow / Elbow dimensions
    const shortRadiusElbowData = [
      [200, 219.1, 230.0, 155.0],
      [250, 273.1, 280.0, 180.0],
      [300, 323.9, 305.0, 205.0],
      [350, 355.6, 355.0, 230.0],
      [400, 406.4, 405.0, 255.0],
      [450, 457.0, 460.0, 280.0],
      [500, 508.0, 510.0, 305.0],
      [550, 559.0, 560.0, 330.0],
      [600, 610.0, 610.0, 355.0],
      [650, 660.0, 660.0, 380.0],
      [700, 711.0, 710.0, 405.0],
      [750, 762.0, 760.0, 430.0],
      [800, 813.0, 815.0, 460.0],
      [850, 864.0, 865.0, 485.0],
      [900, 914.0, 915.0, 510.0],
    ];

    for (const [nb, od, a90, a45] of shortRadiusElbowData) {
      await queryRunner.query(`
        INSERT INTO sabs719_fitting_dimension (
          fitting_type, nominal_diameter_mm, outside_diameter_mm,
          dimension_a_mm, dimension_b_mm
        ) VALUES (
          'ELBOW', ${nb}, ${od}, ${a90}, ${a45}
        )
      `);
    }
    console.log(
      `✅ Inserted ${shortRadiusElbowData.length} Short Radius Elbow dimensions`,
    );

    // Lateral dimensions - similar to Short Tee: Pipe A = CF × 2, Pipe B = CF
    for (const [nb, od, cf] of shortTeeData) {
      const pipeLengthA = cf * 2;
      const pipeLengthB = cf;
      await queryRunner.query(`
        INSERT INTO sabs719_fitting_dimension (
          fitting_type, nominal_diameter_mm, outside_diameter_mm,
          dimension_a_mm, dimension_b_mm
        ) VALUES (
          'LATERAL', ${nb}, ${od}, ${pipeLengthA}, ${pipeLengthB}
        )
      `);
    }
    console.log(`✅ Inserted ${shortTeeData.length} Lateral dimensions`);

    // Reducer dimensions [nb, od, length]
    const reducerData = [
      [200, 219.1, 180.0],
      [250, 273.1, 205.0],
      [300, 323.9, 230.0],
      [350, 355.6, 255.0],
      [400, 406.4, 280.0],
      [450, 457.0, 305.0],
      [500, 508.0, 330.0],
      [550, 559.0, 355.0],
      [600, 610.0, 380.0],
      [650, 660.0, 405.0],
      [700, 711.0, 430.0],
      [750, 762.0, 460.0],
      [800, 813.0, 485.0],
      [850, 864.0, 510.0],
      [900, 914.0, 535.0],
    ];

    for (const [nb, od, length] of reducerData) {
      // Concentric reducer
      await queryRunner.query(`
        INSERT INTO sabs719_fitting_dimension (
          fitting_type, nominal_diameter_mm, outside_diameter_mm,
          dimension_a_mm, dimension_b_mm
        ) VALUES (
          'CON_REDUCER', ${nb}, ${od}, ${length}, ${length}
        )
      `);
      // Eccentric reducer
      await queryRunner.query(`
        INSERT INTO sabs719_fitting_dimension (
          fitting_type, nominal_diameter_mm, outside_diameter_mm,
          dimension_a_mm, dimension_b_mm
        ) VALUES (
          'ECCENTRIC_REDUCER', ${nb}, ${od}, ${length}, ${length}
        )
      `);
    }
    console.log(`✅ Inserted ${reducerData.length * 2} Reducer dimensions`);

    // Sweep Tee types (using gusset tee CF dimensions, apply × 2 for run)
    for (const [nb, od, cf] of gussetTeeCfData) {
      const pipeLengthA = cf * 2;
      const pipeLengthB = cf;
      await queryRunner.query(`
        INSERT INTO sabs719_fitting_dimension (
          fitting_type, nominal_diameter_mm, outside_diameter_mm,
          dimension_a_mm, dimension_b_mm
        ) VALUES (
          'SWEEP_LONG_RADIUS', ${nb}, ${od}, ${pipeLengthA}, ${pipeLengthB}
        )
      `);
      await queryRunner.query(`
        INSERT INTO sabs719_fitting_dimension (
          fitting_type, nominal_diameter_mm, outside_diameter_mm,
          dimension_a_mm, dimension_b_mm
        ) VALUES (
          'SWEEP_MEDIUM_RADIUS', ${nb}, ${od}, ${pipeLengthA * 0.75}, ${pipeLengthB * 0.75}
        )
      `);
      await queryRunner.query(`
        INSERT INTO sabs719_fitting_dimension (
          fitting_type, nominal_diameter_mm, outside_diameter_mm,
          dimension_a_mm, dimension_b_mm
        ) VALUES (
          'SWEEP_ELBOW', ${nb}, ${od}, ${pipeLengthA * 0.6}, ${pipeLengthB * 0.6}
        )
      `);
    }
    console.log(`✅ Inserted ${gussetTeeCfData.length * 3} Sweep dimensions`);

    // Duckfoot types - using Short Tee formula
    for (const [nb, od, cf] of shortTeeData) {
      const pipeLengthA = cf * 2;
      const pipeLengthB = cf;
      await queryRunner.query(`
        INSERT INTO sabs719_fitting_dimension (
          fitting_type, nominal_diameter_mm, outside_diameter_mm,
          dimension_a_mm, dimension_b_mm
        ) VALUES (
          'DUCKFOOT_SHORT', ${nb}, ${od}, ${pipeLengthA}, ${pipeLengthB}
        )
      `);
    }
    // Duckfoot Gussetted - using Gusset Tee formula
    for (const [nb, od, cf] of gussetTeeCfData) {
      const pipeLengthA = cf * 2;
      const pipeLengthB = cf;
      await queryRunner.query(`
        INSERT INTO sabs719_fitting_dimension (
          fitting_type, nominal_diameter_mm, outside_diameter_mm,
          dimension_a_mm, dimension_b_mm
        ) VALUES (
          'DUCKFOOT_GUSSETTED', ${nb}, ${od}, ${pipeLengthA}, ${pipeLengthB}
        )
      `);
    }
    console.log(`✅ Inserted Duckfoot dimensions`);

    // Unequal tee variants (using gusset CF dimensions)
    for (const [nb, od, cf] of gussetTeeCfData) {
      const pipeLengthA = cf * 2;
      const pipeLengthB = cf;
      await queryRunner.query(`
        INSERT INTO sabs719_fitting_dimension (
          fitting_type, nominal_diameter_mm, outside_diameter_mm,
          dimension_a_mm, dimension_b_mm
        ) VALUES (
          'UNEQUAL_SHORT_TEE', ${nb}, ${od}, ${pipeLengthA}, ${pipeLengthB}
        )
      `);
      await queryRunner.query(`
        INSERT INTO sabs719_fitting_dimension (
          fitting_type, nominal_diameter_mm, outside_diameter_mm,
          dimension_a_mm, dimension_b_mm
        ) VALUES (
          'UNEQUAL_GUSSET_TEE', ${nb}, ${od}, ${pipeLengthA * 1.2}, ${pipeLengthB * 1.2}
        )
      `);
    }
    console.log(`✅ Inserted Unequal Tee dimensions`);

    console.log('🎉 SABS 719 fitting dimension table populated successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM sabs719_fitting_dimension`);
    console.log('🗑️ Cleared SABS 719 fitting dimension table');
  }
}
