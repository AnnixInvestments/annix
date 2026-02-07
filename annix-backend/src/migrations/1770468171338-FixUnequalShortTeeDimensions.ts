import { MigrationInterface, QueryRunner } from "typeorm";

export class FixUnequalShortTeeDimensions1770468171338 implements MigrationInterface {
  name = "FixUnequalShortTeeDimensions1770468171338";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("🔧 Fixing UNEQUAL_SHORT_TEE and UNEQUAL_GUSSET_TEE dimensions...");

    // Short Tee CF values - UNEQUAL_SHORT_TEE should use these (same as SHORT_TEE)
    const shortTeeData = [
      [200, 219.1, 230.0],
      [250, 273.1, 280.0],
      [300, 323.9, 305.0],
      [350, 355.6, 355.0],
      [400, 406.4, 405.0],
      [450, 457.0, 460.0],
      [500, 508.0, 510.0],
      [550, 559.0, 560.0],
      [600, 610.0, 610.0],
      [650, 660.0, 660.0],
      [700, 711.0, 710.0],
      [750, 762.0, 760.0],
      [800, 813.0, 815.0],
      [850, 864.0, 865.0],
      [900, 914.0, 915.0],
    ];

    // Gusset Tee CF values - UNEQUAL_GUSSET_TEE should use these (same as GUSSET_TEE)
    const gussetTeeCfData = [
      [200, 219.1, 355.0],
      [250, 273.1, 405.0],
      [300, 323.9, 460.0],
      [350, 355.6, 510.0],
      [400, 406.4, 560.0],
      [450, 457.0, 610.0],
      [500, 508.0, 660.0],
      [550, 559.0, 710.0],
      [600, 610.0, 760.0],
      [650, 660.0, 815.0],
      [700, 711.0, 865.0],
      [750, 762.0, 915.0],
      [800, 813.0, 970.0],
      [850, 864.0, 1020.0],
      [900, 914.0, 1070.0],
    ];

    // Delete existing incorrect data
    await queryRunner.query(
      `DELETE FROM sabs719_fitting_dimension WHERE fitting_type = 'UNEQUAL_SHORT_TEE'`,
    );
    await queryRunner.query(
      `DELETE FROM sabs719_fitting_dimension WHERE fitting_type = 'UNEQUAL_GUSSET_TEE'`,
    );

    // Insert corrected UNEQUAL_SHORT_TEE data using SHORT_TEE dimensions
    for (const [nb, od, cf] of shortTeeData) {
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
    }
    console.warn(`✅ Fixed ${shortTeeData.length} UNEQUAL_SHORT_TEE dimensions`);

    // Insert corrected UNEQUAL_GUSSET_TEE data using GUSSET_TEE dimensions
    for (const [nb, od, cf] of gussetTeeCfData) {
      const pipeLengthA = cf * 2;
      const pipeLengthB = cf;
      await queryRunner.query(`
        INSERT INTO sabs719_fitting_dimension (
          fitting_type, nominal_diameter_mm, outside_diameter_mm,
          dimension_a_mm, dimension_b_mm
        ) VALUES (
          'UNEQUAL_GUSSET_TEE', ${nb}, ${od}, ${pipeLengthA}, ${pipeLengthB}
        )
      `);
    }
    console.warn(`✅ Fixed ${gussetTeeCfData.length} UNEQUAL_GUSSET_TEE dimensions`);

    console.warn("🎉 Unequal tee dimensions fixed successfully!");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to the old (incorrect) values - gusset CF for both
    const gussetTeeCfData = [
      [200, 219.1, 355.0],
      [250, 273.1, 405.0],
      [300, 323.9, 460.0],
      [350, 355.6, 510.0],
      [400, 406.4, 560.0],
      [450, 457.0, 610.0],
      [500, 508.0, 660.0],
      [550, 559.0, 710.0],
      [600, 610.0, 760.0],
      [650, 660.0, 815.0],
      [700, 711.0, 865.0],
      [750, 762.0, 915.0],
      [800, 813.0, 970.0],
      [850, 864.0, 1020.0],
      [900, 914.0, 1070.0],
    ];

    await queryRunner.query(
      `DELETE FROM sabs719_fitting_dimension WHERE fitting_type = 'UNEQUAL_SHORT_TEE'`,
    );
    await queryRunner.query(
      `DELETE FROM sabs719_fitting_dimension WHERE fitting_type = 'UNEQUAL_GUSSET_TEE'`,
    );

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
  }
}
