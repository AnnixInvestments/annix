import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBs4504AndSabs1123FlangeTypes1799400000000 implements MigrationInterface {
  name = "AddBs4504AndSabs1123FlangeTypes1799400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding flange types for BS 4504 and SABS 1123...");

    // First, drop the old unique constraint on just 'code' and create a composite unique constraint
    // This allows the same code to exist for different standards (e.g., "01" for both BS 4504 and SABS 1123)
    const constraintExists = await queryRunner.query(
      `SELECT 1 FROM information_schema.table_constraints
       WHERE constraint_name = 'flange_types_code_key' AND table_name = 'flange_types'`,
    );
    if (constraintExists.length > 0) {
      await queryRunner.query("ALTER TABLE flange_types DROP CONSTRAINT flange_types_code_key");
      await queryRunner.query(
        "ALTER TABLE flange_types ADD CONSTRAINT flange_types_code_standard_key UNIQUE (code, standard_reference)",
      );
      console.warn("Updated unique constraint to (code, standard_reference)");
    }

    // BS 4504 and SABS 1123 use the same type nomenclature
    // Type codes: /01, /03, /05, /06, /11, etc.
    const bs4504Types = [
      {
        code: "01",
        name: "Plate Flange",
        abbreviation: "PF",
        description: "Flat plate flange for slip-on connection",
        standardReference: "BS 4504",
      },
      {
        code: "03",
        name: "Slip-On Hubbed",
        abbreviation: "SOH",
        description: "Slip-on flange with welding hub. Most common type.",
        standardReference: "BS 4504",
      },
      {
        code: "05",
        name: "Weld Neck",
        abbreviation: "WN",
        description: "Long tapered hub for butt welding to pipe.",
        standardReference: "BS 4504",
      },
      {
        code: "06",
        name: "Blank/Blind",
        abbreviation: "BL",
        description: "Solid flange used to blank off piping.",
        standardReference: "BS 4504",
      },
      {
        code: "11",
        name: "Loose Plate",
        abbreviation: "LP",
        description: "Loose plate flange used with stub end.",
        standardReference: "BS 4504",
      },
      {
        code: "13",
        name: "Loose Hubbed",
        abbreviation: "LH",
        description: "Loose hubbed flange used with stub end.",
        standardReference: "BS 4504",
      },
    ];

    // Insert BS 4504 flange types
    for (const type of bs4504Types) {
      const existing = await queryRunner.query(
        "SELECT id FROM flange_types WHERE code = $1 AND standard_reference = $2",
        [type.code, type.standardReference],
      );
      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO flange_types (code, name, abbreviation, description, standard_reference)
           VALUES ($1, $2, $3, $4, $5)`,
          [type.code, type.name, type.abbreviation, type.description, type.standardReference],
        );
        console.warn(`Added BS 4504 flange type: ${type.code} - ${type.name}`);
      }
    }

    // SABS 1123 uses the same type codes as BS 4504
    const sabs1123Types = bs4504Types.map((t) => ({
      ...t,
      standardReference: "SABS 1123",
    }));

    for (const type of sabs1123Types) {
      const existing = await queryRunner.query(
        "SELECT id FROM flange_types WHERE code = $1 AND standard_reference = $2",
        [type.code, type.standardReference],
      );
      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO flange_types (code, name, abbreviation, description, standard_reference)
           VALUES ($1, $2, $3, $4, $5)`,
          [type.code, type.name, type.abbreviation, type.description, type.standardReference],
        );
        console.warn(`Added SABS 1123 flange type: ${type.code} - ${type.name}`);
      }
    }

    console.warn("BS 4504 and SABS 1123 flange types added successfully.");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM flange_types WHERE standard_reference IN ('BS 4504', 'SABS 1123')`,
    );

    // Revert the unique constraint if we changed it
    const newConstraintExists = await queryRunner.query(
      `SELECT 1 FROM information_schema.table_constraints
       WHERE constraint_name = 'flange_types_code_standard_key' AND table_name = 'flange_types'`,
    );
    if (newConstraintExists.length > 0) {
      await queryRunner.query(
        "ALTER TABLE flange_types DROP CONSTRAINT flange_types_code_standard_key",
      );
      await queryRunner.query(
        "ALTER TABLE flange_types ADD CONSTRAINT flange_types_code_key UNIQUE (code)",
      );
    }
  }
}
