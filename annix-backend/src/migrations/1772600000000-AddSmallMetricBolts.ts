import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSmallMetricBolts1772600000000 implements MigrationInterface {
  name = "AddSmallMetricBolts1772600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding small metric bolts M6 and M8...");

    const smallBolts = [
      {
        designation: "M6",
        grade: "8.8",
        material: "Carbon Steel",
        headStyle: "hex",
        threadType: "coarse",
        threadPitchMm: 1.0,
      },
      {
        designation: "M8",
        grade: "8.8",
        material: "Carbon Steel",
        headStyle: "hex",
        threadType: "coarse",
        threadPitchMm: 1.25,
      },
      {
        designation: "M6 10.9",
        grade: "10.9",
        material: "Carbon Steel",
        headStyle: "hex",
        threadType: "coarse",
        threadPitchMm: 1.0,
      },
      {
        designation: "M8 10.9",
        grade: "10.9",
        material: "Carbon Steel",
        headStyle: "hex",
        threadType: "coarse",
        threadPitchMm: 1.25,
      },
      {
        designation: "M6 A4",
        grade: "A4-70",
        material: "Stainless Steel 316",
        headStyle: "hex",
        threadType: "coarse",
        threadPitchMm: 1.0,
      },
      {
        designation: "M8 A4",
        grade: "A4-70",
        material: "Stainless Steel 316",
        headStyle: "hex",
        threadType: "coarse",
        threadPitchMm: 1.25,
      },
    ];

    for (const bolt of smallBolts) {
      await queryRunner.query(
        `
        INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (designation) DO UPDATE SET
          grade = COALESCE(EXCLUDED.grade, bolts.grade),
          material = COALESCE(EXCLUDED.material, bolts.material),
          head_style = COALESCE(EXCLUDED.head_style, bolts.head_style),
          thread_type = COALESCE(EXCLUDED.thread_type, bolts.thread_type),
          thread_pitch_mm = COALESCE(EXCLUDED.thread_pitch_mm, bolts.thread_pitch_mm)
      `,
        [
          bolt.designation,
          bolt.grade,
          bolt.material,
          bolt.headStyle,
          bolt.threadType,
          bolt.threadPitchMm,
        ],
      );
    }

    const m6MassData: Record<number, number> = {
      12: 0.003,
      16: 0.004,
      20: 0.005,
      25: 0.006,
      30: 0.008,
      35: 0.009,
      40: 0.011,
      45: 0.012,
      50: 0.014,
      55: 0.015,
      60: 0.017,
    };

    const m8MassData: Record<number, number> = {
      16: 0.007,
      20: 0.009,
      25: 0.011,
      30: 0.013,
      35: 0.015,
      40: 0.018,
      45: 0.02,
      50: 0.023,
      55: 0.025,
      60: 0.027,
      65: 0.03,
      70: 0.032,
      80: 0.037,
    };

    const m6Bolts = ["M6", "M6 10.9", "M6 A4"];
    const m8Bolts = ["M8", "M8 10.9", "M8 A4"];

    for (const designation of m6Bolts) {
      const boltResult = await queryRunner.query("SELECT id FROM bolts WHERE designation = $1", [
        designation,
      ]);
      if (boltResult.length === 0) continue;
      const boltId = boltResult[0].id;

      for (const [lengthMm, massKg] of Object.entries(m6MassData)) {
        await queryRunner.query(
          `
          INSERT INTO bolt_masses ("boltId", length_mm, mass_kg)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `,
          [boltId, parseInt(lengthMm, 10), massKg],
        );
      }
    }

    for (const designation of m8Bolts) {
      const boltResult = await queryRunner.query("SELECT id FROM bolts WHERE designation = $1", [
        designation,
      ]);
      if (boltResult.length === 0) continue;
      const boltId = boltResult[0].id;

      for (const [lengthMm, massKg] of Object.entries(m8MassData)) {
        await queryRunner.query(
          `
          INSERT INTO bolt_masses ("boltId", length_mm, mass_kg)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `,
          [boltId, parseInt(lengthMm, 10), massKg],
        );
      }
    }

    const nutMassData: Record<string, number> = {
      M6: 0.003,
      M8: 0.006,
    };

    for (const designation of [...m6Bolts, ...m8Bolts]) {
      const boltResult = await queryRunner.query("SELECT id FROM bolts WHERE designation = $1", [
        designation,
      ]);
      if (boltResult.length === 0) continue;
      const boltId = boltResult[0].id;

      const baseSize = designation.startsWith("M6") ? "M6" : "M8";
      const massKg = nutMassData[baseSize];
      const grade = designation.includes("A4") ? "A4-70" : "Grade 8";

      await queryRunner.query(
        `
        INSERT INTO nut_masses (bolt_id, mass_kg, grade, type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `,
        [boltId, massKg, grade, "hex"],
      );
    }

    console.warn("Small metric bolts M6 and M8 added successfully.");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const designations = ["M6", "M8", "M6 10.9", "M8 10.9", "M6 A4", "M8 A4"];
    for (const designation of designations) {
      await queryRunner.query("DELETE FROM bolts WHERE designation = $1", [designation]);
    }
  }
}
