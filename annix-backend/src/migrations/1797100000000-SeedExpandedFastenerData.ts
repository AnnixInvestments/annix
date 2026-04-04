import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedExpandedFastenerData1797100000000 implements MigrationInterface {
  name = "SeedExpandedFastenerData1797100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.updateExistingHexBoltsWithStandards(queryRunner);
    await this.addFinishVariantsForExistingHexBolts(queryRunner);
    await this.seedSocketProducts(queryRunner);
    await this.seedStructuralBolts(queryRunner);
    await this.seedSpecialBolts(queryRunner);
    await this.seedSetScrews(queryRunner);
    await this.seedMachineScrews(queryRunner);
    await this.seedNewNutTypes(queryRunner);
    await this.seedNewWasherTypes(queryRunner);
    await this.seedThreadedInserts(queryRunner);
    await this.seedSmallSizeCoverage(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DELETE FROM threaded_inserts");
    await queryRunner.query(
      "DELETE FROM bolts WHERE category IN ('socket', 'structural', 'special', 'set_screw', 'machine_screw')",
    );
    await queryRunner.query(
      "DELETE FROM nut_masses WHERE type IN ('nyloc', 'wing', 'acorn', 'coupling', 'weld_3proj', 'weld_round', 'weld_tab', 't_nut', 'clinch', 'keps', 'heavy_hex', 'heavy_hex_jam', 'square', 'flex_loc', 'side_lock', 'stamped_wing')",
    );
    await queryRunner.query(
      "DELETE FROM washers WHERE type IN ('fender', 'bevel_taper', 'finishing', 'copper', 'neoprene_bonded', 'malleable', 'wedge_lock')",
    );
  }

  private async updateExistingHexBoltsWithStandards(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE bolts SET standard = 'DIN 931', category = 'hex_bolt'
      WHERE head_style = 'hex' AND thread_type = 'coarse' AND standard IS NULL
        AND designation ~ '^M[0-9]' AND category IS NULL
    `);

    await queryRunner.query(`
      UPDATE bolts SET category = 'stud'
      WHERE head_style = 'stud' AND category IS NULL
    `);
  }

  private async addFinishVariantsForExistingHexBolts(queryRunner: QueryRunner): Promise<void> {
    const sizes = [
      "M6",
      "M8",
      "M10",
      "M12",
      "M14",
      "M16",
      "M18",
      "M20",
      "M22",
      "M24",
      "M27",
      "M30",
      "M33",
      "M36",
    ];
    const finishes = ["zinc", "black oxide"];

    const insertValues = sizes.flatMap((size) =>
      finishes.map(
        (finish) =>
          `('${size}-${finish}', '8.8', 'Carbon Steel', 'hex', 'coarse', NULL, '${finish}', 'DIN 933', 'hex_bolt', NULL, NULL)`,
      ),
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${insertValues.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);
  }

  private async seedSocketProducts(queryRunner: QueryRunner): Promise<void> {
    const socketCapSizes = [
      { size: "M3", pitch: 0.5 },
      { size: "M4", pitch: 0.7 },
      { size: "M5", pitch: 0.8 },
      { size: "M6", pitch: 1.0 },
      { size: "M8", pitch: 1.25 },
      { size: "M10", pitch: 1.5 },
      { size: "M12", pitch: 1.75 },
      { size: "M14", pitch: 2.0 },
      { size: "M16", pitch: 2.0 },
      { size: "M18", pitch: 2.5 },
      { size: "M20", pitch: 2.5 },
      { size: "M22", pitch: 2.5 },
      { size: "M24", pitch: 3.0 },
      { size: "M27", pitch: 3.0 },
      { size: "M30", pitch: 3.5 },
    ];

    const socketCapValues = socketCapSizes.map(
      (s) =>
        `('${s.size}-SCS', '12.9', 'Alloy Steel', 'socket_cap', 'coarse', ${s.pitch}, 'plain', 'DIN 912', 'socket', 'allen', NULL)`,
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${socketCapValues.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);

    const buttonSocketSizes = socketCapSizes.filter((s) => {
      const num = parseInt(s.size.replace("M", ""), 10);
      return num >= 3 && num <= 16;
    });

    const buttonSocketValues = buttonSocketSizes.map(
      (s) =>
        `('${s.size}-BSC', '10.9', 'Alloy Steel', 'button_socket', 'coarse', ${s.pitch}, 'plain', 'DIN 7380', 'socket', 'allen', NULL)`,
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${buttonSocketValues.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);

    const flatSocketSizes = socketCapSizes.filter((s) => {
      const num = parseInt(s.size.replace("M", ""), 10);
      return num >= 3 && num <= 20;
    });

    const flatSocketValues = flatSocketSizes.map(
      (s) =>
        `('${s.size}-FSC', '10.9', 'Alloy Steel', 'flat_socket', 'coarse', ${s.pitch}, 'plain', 'DIN 7991', 'socket', 'allen', NULL)`,
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${flatSocketValues.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);

    const shoulderSizes = ["M6", "M8", "M10", "M12", "M16", "M20"];
    const shoulderValues = shoulderSizes.map(
      (s) =>
        `('${s}-SHS', '12.9', 'Alloy Steel', 'shoulder', 'coarse', NULL, 'plain', 'ISO 7379', 'socket', 'allen', NULL)`,
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${shoulderValues.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);

    await this.seedSocketCapMassData(queryRunner);
  }

  private async seedSocketCapMassData(queryRunner: QueryRunner): Promise<void> {
    const massData: Array<{ designation: string; lengths: Array<{ mm: number; kg: number }> }> = [
      {
        designation: "M3-SCS",
        lengths: [
          { mm: 8, kg: 0.001 },
          { mm: 10, kg: 0.0012 },
          { mm: 12, kg: 0.0015 },
          { mm: 16, kg: 0.0019 },
          { mm: 20, kg: 0.0024 },
        ],
      },
      {
        designation: "M4-SCS",
        lengths: [
          { mm: 10, kg: 0.0025 },
          { mm: 12, kg: 0.003 },
          { mm: 16, kg: 0.0038 },
          { mm: 20, kg: 0.0047 },
          { mm: 25, kg: 0.0058 },
        ],
      },
      {
        designation: "M5-SCS",
        lengths: [
          { mm: 10, kg: 0.004 },
          { mm: 12, kg: 0.0048 },
          { mm: 16, kg: 0.006 },
          { mm: 20, kg: 0.0076 },
          { mm: 25, kg: 0.0094 },
          { mm: 30, kg: 0.0112 },
        ],
      },
      {
        designation: "M6-SCS",
        lengths: [
          { mm: 12, kg: 0.007 },
          { mm: 16, kg: 0.009 },
          { mm: 20, kg: 0.011 },
          { mm: 25, kg: 0.014 },
          { mm: 30, kg: 0.016 },
          { mm: 35, kg: 0.019 },
          { mm: 40, kg: 0.021 },
        ],
      },
      {
        designation: "M8-SCS",
        lengths: [
          { mm: 16, kg: 0.017 },
          { mm: 20, kg: 0.021 },
          { mm: 25, kg: 0.026 },
          { mm: 30, kg: 0.031 },
          { mm: 35, kg: 0.036 },
          { mm: 40, kg: 0.04 },
          { mm: 50, kg: 0.05 },
        ],
      },
      {
        designation: "M10-SCS",
        lengths: [
          { mm: 20, kg: 0.035 },
          { mm: 25, kg: 0.042 },
          { mm: 30, kg: 0.049 },
          { mm: 35, kg: 0.056 },
          { mm: 40, kg: 0.063 },
          { mm: 50, kg: 0.078 },
          { mm: 60, kg: 0.092 },
        ],
      },
      {
        designation: "M12-SCS",
        lengths: [
          { mm: 25, kg: 0.063 },
          { mm: 30, kg: 0.073 },
          { mm: 35, kg: 0.083 },
          { mm: 40, kg: 0.093 },
          { mm: 50, kg: 0.114 },
          { mm: 60, kg: 0.134 },
          { mm: 70, kg: 0.155 },
          { mm: 80, kg: 0.175 },
        ],
      },
      {
        designation: "M16-SCS",
        lengths: [
          { mm: 30, kg: 0.145 },
          { mm: 40, kg: 0.18 },
          { mm: 50, kg: 0.22 },
          { mm: 60, kg: 0.255 },
          { mm: 70, kg: 0.295 },
          { mm: 80, kg: 0.33 },
          { mm: 100, kg: 0.405 },
        ],
      },
      {
        designation: "M20-SCS",
        lengths: [
          { mm: 40, kg: 0.31 },
          { mm: 50, kg: 0.375 },
          { mm: 60, kg: 0.44 },
          { mm: 70, kg: 0.505 },
          { mm: 80, kg: 0.57 },
          { mm: 100, kg: 0.7 },
          { mm: 120, kg: 0.83 },
        ],
      },
      {
        designation: "M24-SCS",
        lengths: [
          { mm: 50, kg: 0.59 },
          { mm: 60, kg: 0.69 },
          { mm: 70, kg: 0.79 },
          { mm: 80, kg: 0.89 },
          { mm: 100, kg: 1.09 },
          { mm: 120, kg: 1.29 },
          { mm: 150, kg: 1.6 },
        ],
      },
      {
        designation: "M30-SCS",
        lengths: [
          { mm: 60, kg: 1.18 },
          { mm: 70, kg: 1.35 },
          { mm: 80, kg: 1.52 },
          { mm: 100, kg: 1.86 },
          { mm: 120, kg: 2.2 },
          { mm: 150, kg: 2.72 },
        ],
      },
    ];

    for (const bolt of massData) {
      for (const l of bolt.lengths) {
        await queryRunner.query(`
          INSERT INTO bolt_masses ("boltId", length_mm, mass_kg)
          SELECT id, ${l.mm}, ${l.kg} FROM bolts WHERE designation = '${bolt.designation}'
          ON CONFLICT DO NOTHING
        `);
      }
    }
  }

  private async seedStructuralBolts(queryRunner: QueryRunner): Promise<void> {
    const structuralSizes = ["M12", "M16", "M20", "M22", "M24", "M27", "M30", "M36"];
    const grades = ["8.8", "10.9"];

    const values = structuralSizes.flatMap((size) =>
      grades.map(
        (grade) =>
          `('${size}-HSFG-${grade}', '${grade}', 'High Strength Steel', 'hex', 'coarse', NULL, 'plain', 'SANS 1700', 'structural', 'hex', NULL)`,
      ),
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${values.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);

    const tcSizes = ["M12", "M16", "M20", "M22", "M24", "M27", "M30"];
    const tcValues = tcSizes.flatMap((size) =>
      grades.map(
        (grade) =>
          `('${size}-TC-${grade}', '${grade}', 'High Strength Steel', 'tension_control', 'coarse', NULL, 'plain', 'ASTM F3125', 'structural', 'hex', NULL)`,
      ),
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${tcValues.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);
  }

  private async seedSpecialBolts(queryRunner: QueryRunner): Promise<void> {
    const carriageSizes = ["M6", "M8", "M10", "M12", "M14", "M16", "M20"];
    const carriageValues = carriageSizes.flatMap((size) =>
      ["4.8", "8.8"].map(
        (grade) =>
          `('${size}-CARR-${grade}', '${grade}', 'Carbon Steel', 'carriage', 'coarse', NULL, 'zinc', 'DIN 603', 'special', NULL, NULL)`,
      ),
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${carriageValues.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);

    const coachSizes = ["M6", "M8", "M10", "M12", "M14", "M16", "M20"];
    const coachValues = coachSizes.map(
      (size) =>
        `('${size}-LAG', '4.8', 'Carbon Steel', 'lag', 'coarse', NULL, 'zinc', 'DIN 571', 'special', 'hex', NULL)`,
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${coachValues.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);

    const eyeSizes = ["M6", "M8", "M10", "M12", "M16", "M20", "M24"];
    const eyeValues = eyeSizes.flatMap((size) =>
      ["4.6", "8.8"].map(
        (grade) =>
          `('${size}-EYE-${grade}', '${grade}', 'Carbon Steel', 'eye', 'coarse', NULL, 'plain', 'DIN 580', 'special', NULL, NULL)`,
      ),
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${eyeValues.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);

    const anchorSizes = ["M10", "M12", "M16", "M20", "M24", "M27", "M30"];
    const anchorValues = anchorSizes.map(
      (size) =>
        `('${size}-ANCHOR', '4.8', 'Carbon Steel', 'anchor', 'coarse', NULL, 'HDG', NULL, 'special', NULL, NULL)`,
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${anchorValues.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);

    const flangeBoltSizes = ["M6", "M8", "M10", "M12", "M14", "M16"];
    const flangeBoltValues = flangeBoltSizes.flatMap((size) =>
      ["8.8", "10.9"].map(
        (grade) =>
          `('${size}-FLB-${grade}', '${grade}', 'Carbon Steel', 'flange', 'coarse', NULL, 'zinc', 'DIN 6921', 'special', 'hex', NULL)`,
      ),
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${flangeBoltValues.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);

    const elevatorSizes = ["M6", "M8", "M10", "M12"];
    const elevatorValues = elevatorSizes.map(
      (size) =>
        `('${size}-ELEV', '4.8', 'Mild Steel', 'elevator', 'coarse', NULL, 'zinc', NULL, 'special', NULL, NULL)`,
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${elevatorValues.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);

    const plowSizes = ["M10", "M12", "M14", "M16", "M20"];
    const plowValues = plowSizes.map(
      (size) =>
        `('${size}-PLOW', '8.8', 'Carbon Steel', 'plow', 'coarse', NULL, 'plain', NULL, 'special', NULL, NULL)`,
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${plowValues.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);

    const stepSizes = ["M12", "M14", "M16", "M20"];
    const stepValues = stepSizes.flatMap((size) =>
      ["4.8", "8.8"].map(
        (grade) =>
          `('${size}-STEP-${grade}', '${grade}', 'Carbon Steel', 'step', 'coarse', NULL, 'HDG', NULL, 'special', NULL, NULL)`,
      ),
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${stepValues.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);

    const twelvePtSizes = ["M6", "M8", "M10", "M12", "M14", "M16", "M20", "M24"];
    const twelvePtValues = twelvePtSizes.flatMap((size) =>
      ["10.9", "12.9"].map(
        (grade) =>
          `('${size}-12PT-${grade}', '${grade}', 'Alloy Steel', '12_point', 'coarse', NULL, 'plain', NULL, 'special', '12_point', NULL)`,
      ),
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${twelvePtValues.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);
  }

  private async seedSetScrews(queryRunner: QueryRunner): Promise<void> {
    const sizes = ["M3", "M4", "M5", "M6", "M8", "M10", "M12", "M14", "M16", "M20", "M24"];
    const pointTypes: Array<{ type: string; din: string }> = [
      { type: "flat", din: "DIN 551" },
      { type: "cup", din: "DIN 916" },
      { type: "cone", din: "DIN 553" },
      { type: "knurled", din: "DIN 551" },
      { type: "dog", din: "DIN 561" },
    ];

    const values = sizes.flatMap((size) =>
      pointTypes.flatMap((pt) =>
        ["10.9", "12.9"].map(
          (grade) =>
            `('${size}-SS-${pt.type}-${grade}', '${grade}', 'Alloy Steel', 'socket_cap', 'coarse', NULL, 'plain', '${pt.din}', 'set_screw', 'allen', '${pt.type}')`,
        ),
      ),
    );

    const chunks = this.chunkArray(values, 50);
    for (const chunk of chunks) {
      await queryRunner.query(`
        INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
        VALUES ${chunk.join(",\n")}
        ON CONFLICT (designation) DO NOTHING
      `);
    }
  }

  private async seedMachineScrews(queryRunner: QueryRunner): Promise<void> {
    const smallSizes = ["M2", "M2.5", "M3", "M4", "M5", "M6", "M8", "M10"];

    const screwTypes: Array<{ suffix: string; drive: string; head: string; din: string }> = [
      { suffix: "PPH", drive: "phillips", head: "socket_cap", din: "DIN 7985" },
      { suffix: "PFH", drive: "phillips", head: "flat_socket", din: "DIN 965" },
      { suffix: "SPH", drive: "slotted", head: "socket_cap", din: "DIN 85" },
      { suffix: "SFH", drive: "slotted", head: "flat_socket", din: "DIN 963" },
    ];

    const values = smallSizes.flatMap((size) =>
      screwTypes.map(
        (st) =>
          `('${size}-MS-${st.suffix}', '4.8', 'Carbon Steel', '${st.head}', 'coarse', NULL, 'zinc', '${st.din}', 'machine_screw', '${st.drive}', NULL)`,
      ),
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${values.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);

    const hexMachineSizes = ["M3", "M4", "M5", "M6", "M8"];
    const hexMachineValues = hexMachineSizes.map(
      (size) =>
        `('${size}-MS-HEX', '4.8', 'Carbon Steel', 'hex', 'coarse', NULL, 'zinc', NULL, 'machine_screw', 'hex', NULL)`,
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${hexMachineValues.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);

    const trussSizes = ["M3", "M4", "M5", "M6"];
    const trussValues = trussSizes.map(
      (size) =>
        `('${size}-MS-TRUSS', '4.8', 'Carbon Steel', 'socket_cap', 'coarse', NULL, 'zinc', NULL, 'machine_screw', 'phillips', NULL)`,
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${trussValues.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);

    const stainlessValues = smallSizes.flatMap((size) =>
      screwTypes.flatMap((st) =>
        ["A2-304", "A4-316"].map(
          (mat) =>
            `('${size}-MS-${st.suffix}-${mat}', '70', '${mat}', '${st.head}', 'coarse', NULL, 'plain', '${st.din}', 'machine_screw', '${st.drive}', NULL)`,
        ),
      ),
    );

    const chunks = this.chunkArray(stainlessValues, 50);
    for (const chunk of chunks) {
      await queryRunner.query(`
        INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
        VALUES ${chunk.join(",\n")}
        ON CONFLICT (designation) DO NOTHING
      `);
    }
  }

  private async seedNewNutTypes(queryRunner: QueryRunner): Promise<void> {
    const nutData: Array<{
      type: string;
      standard: string | null;
      sizes: Array<{ designation: string; massKg: number; grade: string }>;
    }> = [
      {
        type: "nyloc",
        standard: "DIN 985",
        sizes: [
          { designation: "M3", massKg: 0.002, grade: "8" },
          { designation: "M4", massKg: 0.004, grade: "8" },
          { designation: "M5", massKg: 0.006, grade: "8" },
          { designation: "M6", massKg: 0.01, grade: "8" },
          { designation: "M8", massKg: 0.02, grade: "8" },
          { designation: "M10", massKg: 0.035, grade: "8" },
          { designation: "M12", massKg: 0.055, grade: "8" },
          { designation: "M14", massKg: 0.082, grade: "8" },
          { designation: "M16", massKg: 0.11, grade: "8" },
          { designation: "M18", massKg: 0.16, grade: "8" },
          { designation: "M20", massKg: 0.2, grade: "8" },
          { designation: "M22", massKg: 0.27, grade: "8" },
          { designation: "M24", massKg: 0.33, grade: "8" },
          { designation: "M27", massKg: 0.48, grade: "8" },
          { designation: "M30", massKg: 0.62, grade: "8" },
          { designation: "M33", massKg: 0.82, grade: "8" },
          { designation: "M36", massKg: 1.02, grade: "8" },
          { designation: "M39", massKg: 1.28, grade: "8" },
          { designation: "M42", massKg: 1.55, grade: "8" },
          { designation: "M45", massKg: 1.85, grade: "8" },
          { designation: "M48", massKg: 2.2, grade: "8" },
        ],
      },
      {
        type: "wing",
        standard: "DIN 315",
        sizes: [
          { designation: "M4", massKg: 0.006, grade: "4.8" },
          { designation: "M5", massKg: 0.009, grade: "4.8" },
          { designation: "M6", massKg: 0.014, grade: "4.8" },
          { designation: "M8", massKg: 0.028, grade: "4.8" },
          { designation: "M10", massKg: 0.047, grade: "4.8" },
          { designation: "M12", massKg: 0.073, grade: "4.8" },
          { designation: "M16", massKg: 0.14, grade: "4.8" },
        ],
      },
      {
        type: "acorn",
        standard: "DIN 1587",
        sizes: [
          { designation: "M4", massKg: 0.005, grade: "6" },
          { designation: "M5", massKg: 0.008, grade: "6" },
          { designation: "M6", massKg: 0.012, grade: "6" },
          { designation: "M8", massKg: 0.024, grade: "6" },
          { designation: "M10", massKg: 0.042, grade: "6" },
          { designation: "M12", massKg: 0.065, grade: "6" },
          { designation: "M16", massKg: 0.13, grade: "6" },
          { designation: "M20", massKg: 0.22, grade: "6" },
        ],
      },
      {
        type: "coupling",
        standard: null,
        sizes: [
          { designation: "M6", massKg: 0.018, grade: "4.8" },
          { designation: "M8", massKg: 0.038, grade: "4.8" },
          { designation: "M10", massKg: 0.068, grade: "4.8" },
          { designation: "M12", massKg: 0.11, grade: "4.8" },
          { designation: "M16", massKg: 0.24, grade: "4.8" },
          { designation: "M20", massKg: 0.44, grade: "4.8" },
          { designation: "M24", massKg: 0.72, grade: "4.8" },
        ],
      },
      {
        type: "weld_3proj",
        standard: "DIN 929",
        sizes: [
          { designation: "M4", massKg: 0.003, grade: "4.8" },
          { designation: "M5", massKg: 0.005, grade: "4.8" },
          { designation: "M6", massKg: 0.008, grade: "4.8" },
          { designation: "M8", massKg: 0.016, grade: "4.8" },
          { designation: "M10", massKg: 0.028, grade: "4.8" },
          { designation: "M12", massKg: 0.045, grade: "4.8" },
          { designation: "M16", massKg: 0.09, grade: "4.8" },
        ],
      },
      {
        type: "weld_round",
        standard: null,
        sizes: [
          { designation: "M5", massKg: 0.006, grade: "4.8" },
          { designation: "M6", massKg: 0.01, grade: "4.8" },
          { designation: "M8", massKg: 0.02, grade: "4.8" },
          { designation: "M10", massKg: 0.035, grade: "4.8" },
          { designation: "M12", massKg: 0.055, grade: "4.8" },
        ],
      },
      {
        type: "weld_tab",
        standard: null,
        sizes: [
          { designation: "M6", massKg: 0.012, grade: "4.8" },
          { designation: "M8", massKg: 0.022, grade: "4.8" },
          { designation: "M10", massKg: 0.038, grade: "4.8" },
          { designation: "M12", massKg: 0.06, grade: "4.8" },
        ],
      },
      {
        type: "t_nut",
        standard: null,
        sizes: [
          { designation: "M4", massKg: 0.004, grade: "4.8" },
          { designation: "M5", massKg: 0.006, grade: "4.8" },
          { designation: "M6", massKg: 0.01, grade: "4.8" },
          { designation: "M8", massKg: 0.018, grade: "4.8" },
          { designation: "M10", massKg: 0.03, grade: "4.8" },
        ],
      },
      {
        type: "clinch",
        standard: null,
        sizes: [
          { designation: "M3", massKg: 0.002, grade: "4.8" },
          { designation: "M4", massKg: 0.003, grade: "4.8" },
          { designation: "M5", massKg: 0.005, grade: "4.8" },
          { designation: "M6", massKg: 0.008, grade: "4.8" },
          { designation: "M8", massKg: 0.015, grade: "4.8" },
          { designation: "M10", massKg: 0.025, grade: "4.8" },
        ],
      },
      {
        type: "keps",
        standard: null,
        sizes: [
          { designation: "M4", massKg: 0.004, grade: "4.8" },
          { designation: "M5", massKg: 0.007, grade: "4.8" },
          { designation: "M6", massKg: 0.01, grade: "4.8" },
          { designation: "M8", massKg: 0.02, grade: "4.8" },
          { designation: "M10", massKg: 0.035, grade: "4.8" },
          { designation: "M12", massKg: 0.055, grade: "4.8" },
        ],
      },
      {
        type: "heavy_hex",
        standard: "ASTM A194",
        sizes: [
          { designation: "M12", massKg: 0.045, grade: "2H" },
          { designation: "M16", massKg: 0.1, grade: "2H" },
          { designation: "M20", massKg: 0.18, grade: "2H" },
          { designation: "M22", massKg: 0.24, grade: "2H" },
          { designation: "M24", massKg: 0.3, grade: "2H" },
          { designation: "M27", massKg: 0.43, grade: "2H" },
          { designation: "M30", massKg: 0.56, grade: "2H" },
          { designation: "M33", massKg: 0.74, grade: "2H" },
          { designation: "M36", massKg: 0.94, grade: "2H" },
        ],
      },
      {
        type: "heavy_hex_jam",
        standard: "ASTM A194",
        sizes: [
          { designation: "M12", massKg: 0.028, grade: "2H" },
          { designation: "M16", massKg: 0.062, grade: "2H" },
          { designation: "M20", massKg: 0.11, grade: "2H" },
          { designation: "M24", massKg: 0.18, grade: "2H" },
          { designation: "M27", massKg: 0.26, grade: "2H" },
          { designation: "M30", massKg: 0.34, grade: "2H" },
          { designation: "M36", massKg: 0.56, grade: "2H" },
        ],
      },
      {
        type: "square",
        standard: "DIN 557",
        sizes: [
          { designation: "M6", massKg: 0.009, grade: "4.8" },
          { designation: "M8", massKg: 0.019, grade: "4.8" },
          { designation: "M10", massKg: 0.035, grade: "4.8" },
          { designation: "M12", massKg: 0.055, grade: "4.8" },
          { designation: "M16", massKg: 0.12, grade: "4.8" },
          { designation: "M20", massKg: 0.2, grade: "4.8" },
        ],
      },
      {
        type: "flex_loc",
        standard: null,
        sizes: [
          { designation: "M6", massKg: 0.009, grade: "8" },
          { designation: "M8", massKg: 0.019, grade: "8" },
          { designation: "M10", massKg: 0.033, grade: "8" },
          { designation: "M12", massKg: 0.052, grade: "8" },
          { designation: "M16", massKg: 0.11, grade: "8" },
          { designation: "M20", massKg: 0.19, grade: "8" },
          { designation: "M24", massKg: 0.3, grade: "8" },
        ],
      },
      {
        type: "side_lock",
        standard: null,
        sizes: [
          { designation: "M6", massKg: 0.01, grade: "8" },
          { designation: "M8", massKg: 0.02, grade: "8" },
          { designation: "M10", massKg: 0.036, grade: "8" },
          { designation: "M12", massKg: 0.056, grade: "8" },
          { designation: "M16", massKg: 0.12, grade: "8" },
          { designation: "M20", massKg: 0.2, grade: "8" },
        ],
      },
      {
        type: "stamped_wing",
        standard: null,
        sizes: [
          { designation: "M4", massKg: 0.005, grade: "4.8" },
          { designation: "M5", massKg: 0.007, grade: "4.8" },
          { designation: "M6", massKg: 0.01, grade: "4.8" },
          { designation: "M8", massKg: 0.02, grade: "4.8" },
          { designation: "M10", massKg: 0.035, grade: "4.8" },
        ],
      },
    ];

    for (const nut of nutData) {
      for (const s of nut.sizes) {
        await queryRunner.query(`
          INSERT INTO nut_masses (bolt_id, mass_kg, grade, type, standard)
          SELECT id, ${s.massKg}, 'Grade ${s.grade}', '${nut.type}', ${nut.standard ? `'${nut.standard}'` : "NULL"}
          FROM bolts WHERE designation = '${s.designation}'
          ON CONFLICT DO NOTHING
        `);
      }
    }
  }

  private async seedNewWasherTypes(queryRunner: QueryRunner): Promise<void> {
    const washerData: Array<{
      type: string;
      standard: string | null;
      sizes: Array<{
        designation: string;
        odMm: number;
        idMm: number;
        thickMm: number;
        massKg: number;
      }>;
    }> = [
      {
        type: "fender",
        standard: "DIN 9021",
        sizes: [
          { designation: "M4", odMm: 12, idMm: 4.3, thickMm: 1.0, massKg: 0.003 },
          { designation: "M5", odMm: 15, idMm: 5.3, thickMm: 1.2, massKg: 0.005 },
          { designation: "M6", odMm: 18, idMm: 6.4, thickMm: 1.6, massKg: 0.009 },
          { designation: "M8", odMm: 24, idMm: 8.4, thickMm: 2.0, massKg: 0.018 },
          { designation: "M10", odMm: 30, idMm: 10.5, thickMm: 2.5, massKg: 0.033 },
          { designation: "M12", odMm: 37, idMm: 13, thickMm: 3.0, massKg: 0.058 },
          { designation: "M16", odMm: 50, idMm: 17, thickMm: 3.0, massKg: 0.1 },
          { designation: "M20", odMm: 60, idMm: 21, thickMm: 3.0, massKg: 0.14 },
        ],
      },
      {
        type: "bevel_taper",
        standard: "DIN 434",
        sizes: [
          { designation: "M12", odMm: 30, idMm: 14, thickMm: 5.0, massKg: 0.025 },
          { designation: "M16", odMm: 37, idMm: 18, thickMm: 6.0, massKg: 0.042 },
          { designation: "M20", odMm: 44, idMm: 22, thickMm: 8.0, massKg: 0.072 },
          { designation: "M22", odMm: 50, idMm: 24, thickMm: 8.0, massKg: 0.092 },
          { designation: "M24", odMm: 56, idMm: 26, thickMm: 8.0, massKg: 0.112 },
          { designation: "M27", odMm: 60, idMm: 30, thickMm: 10.0, massKg: 0.15 },
          { designation: "M30", odMm: 68, idMm: 33, thickMm: 10.0, massKg: 0.19 },
        ],
      },
      {
        type: "finishing",
        standard: null,
        sizes: [
          { designation: "M3", odMm: 8, idMm: 3.2, thickMm: 1.0, massKg: 0.001 },
          { designation: "M4", odMm: 10, idMm: 4.3, thickMm: 1.0, massKg: 0.002 },
          { designation: "M5", odMm: 12, idMm: 5.3, thickMm: 1.2, massKg: 0.003 },
          { designation: "M6", odMm: 14, idMm: 6.4, thickMm: 1.5, massKg: 0.004 },
          { designation: "M8", odMm: 18, idMm: 8.4, thickMm: 2.0, massKg: 0.007 },
          { designation: "M10", odMm: 22, idMm: 10.5, thickMm: 2.5, massKg: 0.012 },
        ],
      },
      {
        type: "copper",
        standard: "DIN 7603",
        sizes: [
          { designation: "M6", odMm: 10, idMm: 6.2, thickMm: 1.0, massKg: 0.002 },
          { designation: "M8", odMm: 12, idMm: 8.2, thickMm: 1.0, massKg: 0.003 },
          { designation: "M10", odMm: 14, idMm: 10.2, thickMm: 1.0, massKg: 0.004 },
          { designation: "M12", odMm: 16, idMm: 12.2, thickMm: 1.5, massKg: 0.006 },
          { designation: "M14", odMm: 18, idMm: 14.2, thickMm: 1.5, massKg: 0.007 },
          { designation: "M16", odMm: 20, idMm: 16.2, thickMm: 1.5, massKg: 0.009 },
          { designation: "M18", odMm: 22, idMm: 18.2, thickMm: 1.5, massKg: 0.01 },
          { designation: "M20", odMm: 24, idMm: 20.2, thickMm: 1.5, massKg: 0.012 },
          { designation: "M24", odMm: 30, idMm: 24.2, thickMm: 2.0, massKg: 0.02 },
          { designation: "M30", odMm: 36, idMm: 30.2, thickMm: 2.0, massKg: 0.028 },
        ],
      },
      {
        type: "neoprene_bonded",
        standard: null,
        sizes: [
          { designation: "M6", odMm: 16, idMm: 6.5, thickMm: 3.0, massKg: 0.004 },
          { designation: "M8", odMm: 19, idMm: 8.5, thickMm: 3.0, massKg: 0.006 },
          { designation: "M10", odMm: 22, idMm: 10.5, thickMm: 3.0, massKg: 0.008 },
          { designation: "M12", odMm: 25, idMm: 13, thickMm: 3.0, massKg: 0.011 },
          { designation: "M14", odMm: 28, idMm: 15, thickMm: 3.0, massKg: 0.014 },
          { designation: "M16", odMm: 32, idMm: 17, thickMm: 3.0, massKg: 0.018 },
        ],
      },
      {
        type: "malleable",
        standard: null,
        sizes: [
          { designation: "M10", odMm: 28, idMm: 11, thickMm: 4.0, massKg: 0.018 },
          { designation: "M12", odMm: 32, idMm: 13, thickMm: 5.0, massKg: 0.028 },
          { designation: "M16", odMm: 40, idMm: 17, thickMm: 6.0, massKg: 0.048 },
          { designation: "M20", odMm: 50, idMm: 21, thickMm: 6.0, massKg: 0.072 },
          { designation: "M24", odMm: 56, idMm: 25, thickMm: 8.0, massKg: 0.11 },
          { designation: "M30", odMm: 68, idMm: 33, thickMm: 8.0, massKg: 0.16 },
        ],
      },
      {
        type: "wedge_lock",
        standard: null,
        sizes: [
          { designation: "M6", odMm: 13.5, idMm: 6.5, thickMm: 3.4, massKg: 0.004 },
          { designation: "M8", odMm: 16.6, idMm: 8.7, thickMm: 4.0, massKg: 0.007 },
          { designation: "M10", odMm: 19.5, idMm: 10.7, thickMm: 4.6, massKg: 0.01 },
          { designation: "M12", odMm: 23.0, idMm: 13, thickMm: 5.0, massKg: 0.016 },
          { designation: "M14", odMm: 25.4, idMm: 15, thickMm: 5.4, massKg: 0.02 },
          { designation: "M16", odMm: 28.4, idMm: 17, thickMm: 5.8, massKg: 0.026 },
          { designation: "M20", odMm: 35.0, idMm: 21, thickMm: 6.6, massKg: 0.042 },
          { designation: "M24", odMm: 40.0, idMm: 25, thickMm: 7.4, massKg: 0.06 },
          { designation: "M27", odMm: 44.0, idMm: 28, thickMm: 8.0, massKg: 0.076 },
          { designation: "M30", odMm: 49.0, idMm: 31, thickMm: 8.6, massKg: 0.096 },
          { designation: "M36", odMm: 58.0, idMm: 37, thickMm: 9.8, massKg: 0.14 },
        ],
      },
    ];

    for (const washer of washerData) {
      for (const s of washer.sizes) {
        await queryRunner.query(`
          INSERT INTO washers (bolt_id, type, material, "massKg", od_mm, id_mm, thickness_mm, standard)
          SELECT id, '${washer.type}', 'Carbon Steel', ${s.massKg}, ${s.odMm}, ${s.idMm}, ${s.thickMm}, ${washer.standard ? `'${washer.standard}'` : "NULL"}
          FROM bolts WHERE designation = '${s.designation}'
          ON CONFLICT DO NOTHING
        `);
      }
    }
  }

  private async seedThreadedInserts(queryRunner: QueryRunner): Promise<void> {
    const insertData: Array<{
      insertType: string;
      standard: string | null;
      materials: string[];
      sizes: Array<{ designation: string; outerDia: number; length: number; massKg: number }>;
    }> = [
      {
        insertType: "helical_coil",
        standard: "DIN 8140",
        materials: ["steel", "stainless"],
        sizes: [
          { designation: "M3", outerDia: 4.6, length: 4.5, massKg: 0.0003 },
          { designation: "M4", outerDia: 5.8, length: 6.0, massKg: 0.0007 },
          { designation: "M5", outerDia: 7.2, length: 7.5, massKg: 0.0012 },
          { designation: "M6", outerDia: 8.6, length: 9.0, massKg: 0.002 },
          { designation: "M8", outerDia: 11.2, length: 12.0, massKg: 0.004 },
          { designation: "M10", outerDia: 13.8, length: 15.0, massKg: 0.007 },
          { designation: "M12", outerDia: 16.4, length: 18.0, massKg: 0.012 },
          { designation: "M14", outerDia: 19.0, length: 21.0, massKg: 0.018 },
          { designation: "M16", outerDia: 21.6, length: 24.0, massKg: 0.025 },
        ],
      },
      {
        insertType: "self_tapping",
        standard: null,
        materials: ["steel", "stainless"],
        sizes: [
          { designation: "M3", outerDia: 5.4, length: 7.0, massKg: 0.001 },
          { designation: "M4", outerDia: 6.6, length: 9.5, massKg: 0.002 },
          { designation: "M5", outerDia: 8.0, length: 12.0, massKg: 0.004 },
          { designation: "M6", outerDia: 9.6, length: 14.0, massKg: 0.006 },
          { designation: "M8", outerDia: 12.4, length: 18.0, massKg: 0.012 },
          { designation: "M10", outerDia: 15.2, length: 22.0, massKg: 0.02 },
          { designation: "M12", outerDia: 18.0, length: 25.0, massKg: 0.03 },
        ],
      },
      {
        insertType: "press_in",
        standard: null,
        materials: ["steel"],
        sizes: [
          { designation: "M3", outerDia: 5.0, length: 4.0, massKg: 0.001 },
          { designation: "M4", outerDia: 6.4, length: 5.0, massKg: 0.002 },
          { designation: "M5", outerDia: 7.8, length: 6.5, massKg: 0.003 },
          { designation: "M6", outerDia: 9.5, length: 8.0, massKg: 0.005 },
          { designation: "M8", outerDia: 12.0, length: 10.0, massKg: 0.009 },
          { designation: "M10", outerDia: 14.5, length: 12.0, massKg: 0.014 },
        ],
      },
      {
        insertType: "knurled",
        standard: null,
        materials: ["brass", "steel"],
        sizes: [
          { designation: "M3", outerDia: 4.8, length: 6.0, massKg: 0.001 },
          { designation: "M4", outerDia: 6.0, length: 8.0, massKg: 0.003 },
          { designation: "M5", outerDia: 7.5, length: 10.0, massKg: 0.005 },
          { designation: "M6", outerDia: 9.0, length: 12.0, massKg: 0.008 },
          { designation: "M8", outerDia: 11.5, length: 14.0, massKg: 0.014 },
          { designation: "M10", outerDia: 14.0, length: 16.0, massKg: 0.022 },
        ],
      },
    ];

    for (const insert of insertData) {
      const values = insert.sizes.flatMap((s) =>
        insert.materials.map(
          (mat) =>
            `('${s.designation}', '${insert.insertType}', '${mat}', ${insert.standard ? `'${insert.standard}'` : "NULL"}, ${s.outerDia}, ${s.length}, ${s.massKg})`,
        ),
      );

      await queryRunner.query(`
        INSERT INTO threaded_inserts (designation, insert_type, material, standard, outer_diameter_mm, length_mm, mass_kg)
        VALUES ${values.join(",\n")}
        ON CONFLICT DO NOTHING
      `);
    }
  }

  private async seedSmallSizeCoverage(queryRunner: QueryRunner): Promise<void> {
    const smallBolts = [
      { designation: "M3", grade: "8.8", pitch: 0.5, headStyle: "hex", standard: "DIN 933" },
      { designation: "M4", grade: "8.8", pitch: 0.7, headStyle: "hex", standard: "DIN 933" },
      { designation: "M5", grade: "8.8", pitch: 0.8, headStyle: "hex", standard: "DIN 933" },
    ];

    const smallBoltValues = smallBolts.map(
      (b) =>
        `('${b.designation}', '${b.grade}', 'Carbon Steel', '${b.headStyle}', 'coarse', ${b.pitch}, 'plain', '${b.standard}', 'hex_bolt', 'hex', NULL)`,
    );

    await queryRunner.query(`
      INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish, standard, category, drive_type, point_type)
      VALUES ${smallBoltValues.join(",\n")}
      ON CONFLICT (designation) DO NOTHING
    `);

    const smallBoltMasses: Array<{
      designation: string;
      lengths: Array<{ mm: number; kg: number }>;
    }> = [
      {
        designation: "M3",
        lengths: [
          { mm: 8, kg: 0.0007 },
          { mm: 10, kg: 0.001 },
          { mm: 12, kg: 0.0012 },
          { mm: 16, kg: 0.0016 },
          { mm: 20, kg: 0.002 },
          { mm: 25, kg: 0.0025 },
        ],
      },
      {
        designation: "M4",
        lengths: [
          { mm: 8, kg: 0.0015 },
          { mm: 10, kg: 0.002 },
          { mm: 12, kg: 0.0024 },
          { mm: 16, kg: 0.0032 },
          { mm: 20, kg: 0.004 },
          { mm: 25, kg: 0.005 },
          { mm: 30, kg: 0.006 },
        ],
      },
      {
        designation: "M5",
        lengths: [
          { mm: 10, kg: 0.0035 },
          { mm: 12, kg: 0.004 },
          { mm: 16, kg: 0.005 },
          { mm: 20, kg: 0.006 },
          { mm: 25, kg: 0.0078 },
          { mm: 30, kg: 0.0092 },
          { mm: 35, kg: 0.011 },
        ],
      },
    ];

    for (const bolt of smallBoltMasses) {
      for (const l of bolt.lengths) {
        await queryRunner.query(`
          INSERT INTO bolt_masses ("boltId", length_mm, mass_kg)
          SELECT id, ${l.mm}, ${l.kg} FROM bolts WHERE designation = '${bolt.designation}'
          ON CONFLICT DO NOTHING
        `);
      }
    }

    const smallNuts = [
      { designation: "M3", type: "hex", massKg: 0.0013, grade: "Grade 8", standard: "DIN 934" },
      { designation: "M4", type: "hex", massKg: 0.003, grade: "Grade 8", standard: "DIN 934" },
      { designation: "M5", type: "hex", massKg: 0.005, grade: "Grade 8", standard: "DIN 934" },
    ];

    for (const n of smallNuts) {
      await queryRunner.query(`
        INSERT INTO nut_masses (bolt_id, mass_kg, grade, type, standard)
        SELECT id, ${n.massKg}, '${n.grade}', '${n.type}', '${n.standard}'
        FROM bolts WHERE designation = '${n.designation}'
        ON CONFLICT DO NOTHING
      `);
    }

    const smallWashers = [
      {
        designation: "M3",
        type: "flat",
        odMm: 7.0,
        idMm: 3.2,
        thickMm: 0.5,
        massKg: 0.0005,
        standard: "DIN 125",
      },
      {
        designation: "M4",
        type: "flat",
        odMm: 9.0,
        idMm: 4.3,
        thickMm: 0.8,
        massKg: 0.0012,
        standard: "DIN 125",
      },
      {
        designation: "M5",
        type: "flat",
        odMm: 10.0,
        idMm: 5.3,
        thickMm: 1.0,
        massKg: 0.002,
        standard: "DIN 125",
      },
      {
        designation: "M3",
        type: "split",
        odMm: 6.2,
        idMm: 3.1,
        thickMm: 1.0,
        massKg: 0.0004,
        standard: "DIN 127",
      },
      {
        designation: "M4",
        type: "split",
        odMm: 7.6,
        idMm: 4.1,
        thickMm: 1.2,
        massKg: 0.0008,
        standard: "DIN 127",
      },
      {
        designation: "M5",
        type: "split",
        odMm: 9.2,
        idMm: 5.1,
        thickMm: 1.2,
        massKg: 0.0012,
        standard: "DIN 127",
      },
    ];

    for (const w of smallWashers) {
      await queryRunner.query(`
        INSERT INTO washers (bolt_id, type, material, "massKg", od_mm, id_mm, thickness_mm, standard)
        SELECT id, '${w.type}', 'Carbon Steel', ${w.massKg}, ${w.odMm}, ${w.idMm}, ${w.thickMm}, '${w.standard}'
        FROM bolts WHERE designation = '${w.designation}'
        ON CONFLICT DO NOTHING
      `);
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    let i = 0;
    while (i < array.length) {
      result.push(array.slice(i, i + size));
      i += size;
    }
    return result;
  }
}
