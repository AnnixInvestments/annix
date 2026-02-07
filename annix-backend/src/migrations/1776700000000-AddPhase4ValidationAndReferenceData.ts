import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhase4ValidationAndReferenceData1776700000000 implements MigrationInterface {
  name = "AddPhase4ValidationAndReferenceData1776700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Phase 4: Adding validation and reference data...");

    await this.createBendSegmentRulesTable(queryRunner);
    await this.createDuckfootElbowDimensionsTable(queryRunner);
    await this.populateBendSegmentRules(queryRunner);
    await this.populateDuckfootElbowDimensions(queryRunner);
    await this.correctSabs719BendData(queryRunner);

    console.warn("Phase 4 migration complete.");
  }

  private async createBendSegmentRulesTable(queryRunner: QueryRunner): Promise<void> {
    console.warn("Creating bend segment rules table...");

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bend_segment_rules (
        id SERIAL PRIMARY KEY,
        bend_radius_type VARCHAR(20) NOT NULL,
        angle_range_min DECIMAL(5,2) NOT NULL,
        angle_range_max DECIMAL(5,2) NOT NULL,
        min_segments INT NOT NULL,
        max_segments INT NOT NULL,
        dimension_column VARCHAR(1) NOT NULL,
        description VARCHAR(255),
        UNIQUE(bend_radius_type, angle_range_min, angle_range_max)
      )
    `);
  }

  private async createDuckfootElbowDimensionsTable(queryRunner: QueryRunner): Promise<void> {
    console.warn("Creating duckfoot elbow dimensions table...");

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS duckfoot_elbow_dimensions (
        id SERIAL PRIMARY KEY,
        nominal_bore_mm INT NOT NULL UNIQUE,
        outside_diameter_mm DECIMAL(8,2) NOT NULL,
        base_plate_x_mm DECIMAL(8,2) NOT NULL,
        base_plate_y_mm DECIMAL(8,2) NOT NULL,
        rib_thickness_t2_mm DECIMAL(5,2) NOT NULL,
        plate_thickness_t1_mm DECIMAL(5,2) NOT NULL,
        notes VARCHAR(255)
      )
    `);
  }

  private async populateBendSegmentRules(queryRunner: QueryRunner): Promise<void> {
    console.warn("Populating bend segment rules from MPS manual...");

    const rules = [
      {
        type: "short",
        minAngle: 0,
        maxAngle: 22.5,
        minSeg: 2,
        maxSeg: 2,
        col: "C",
        desc: "Up to and including 22.5°",
      },
      {
        type: "short",
        minAngle: 22.5,
        maxAngle: 45,
        minSeg: 2,
        maxSeg: 3,
        col: "B",
        desc: "Over 22.5° up to and including 45°",
      },
      {
        type: "short",
        minAngle: 45,
        maxAngle: 90,
        minSeg: 3,
        maxSeg: 4,
        col: "A",
        desc: "Over 45° up to and including 90°",
      },

      {
        type: "medium",
        minAngle: 0,
        maxAngle: 22.5,
        minSeg: 2,
        maxSeg: 3,
        col: "C",
        desc: "Up to and including 22.5°",
      },
      {
        type: "medium",
        minAngle: 22.5,
        maxAngle: 45,
        minSeg: 3,
        maxSeg: 4,
        col: "B",
        desc: "Over 22.5° up to and including 45°",
      },
      {
        type: "medium",
        minAngle: 45,
        maxAngle: 90,
        minSeg: 4,
        maxSeg: 5,
        col: "A",
        desc: "Over 45° up to and including 90°",
      },

      {
        type: "long",
        minAngle: 0,
        maxAngle: 22.5,
        minSeg: 2,
        maxSeg: 3,
        col: "C",
        desc: "Up to and including 22.5°",
      },
      {
        type: "long",
        minAngle: 22.5,
        maxAngle: 45,
        minSeg: 3,
        maxSeg: 5,
        col: "B",
        desc: "Over 22.5° up to and including 45°",
      },
      {
        type: "long",
        minAngle: 45,
        maxAngle: 90,
        minSeg: 5,
        maxSeg: 7,
        col: "A",
        desc: "Over 45° up to and including 90°",
      },
    ];

    for (const rule of rules) {
      await queryRunner.query(`
        INSERT INTO bend_segment_rules (bend_radius_type, angle_range_min, angle_range_max, min_segments, max_segments, dimension_column, description)
        VALUES ('${rule.type}', ${rule.minAngle}, ${rule.maxAngle}, ${rule.minSeg}, ${rule.maxSeg}, '${rule.col}', '${rule.desc}')
        ON CONFLICT (bend_radius_type, angle_range_min, angle_range_max) DO NOTHING
      `);
    }

    console.warn("Bend segment rules populated.");
  }

  private async populateDuckfootElbowDimensions(queryRunner: QueryRunner): Promise<void> {
    console.warn("Populating duckfoot elbow dimensions from MPS manual page 30...");

    const duckfootData = [
      { nb: 200, od: 219.1, x: 355.0, y: 230.0, t2: 10.0, t1: 6.0 },
      { nb: 250, od: 273.1, x: 405.0, y: 280.0, t2: 10.0, t1: 6.0 },
      { nb: 300, od: 323.9, x: 460.0, y: 330.0, t2: 10.0, t1: 6.0 },
      { nb: 350, od: 355.6, x: 510.0, y: 380.0, t2: 12.0, t1: 8.0 },
      { nb: 400, od: 406.4, x: 560.0, y: 430.0, t2: 12.0, t1: 8.0 },
      { nb: 450, od: 457.0, x: 610.0, y: 485.0, t2: 12.0, t1: 8.0 },
      { nb: 500, od: 508.0, x: 660.0, y: 535.0, t2: 14.0, t1: 10.0 },
      { nb: 550, od: 559.0, x: 710.0, y: 585.0, t2: 14.0, t1: 10.0 },
      { nb: 600, od: 610.0, x: 760.0, y: 635.0, t2: 14.0, t1: 10.0 },
      { nb: 650, od: 660.0, x: 815.0, y: 693.0, t2: 16.0, t1: 12.0 },
      { nb: 700, od: 711.0, x: 865.0, y: 733.0, t2: 16.0, t1: 12.0 },
      { nb: 750, od: 762.0, x: 915.0, y: 793.0, t2: 16.0, t1: 12.0 },
      { nb: 800, od: 813.0, x: 970.0, y: 833.0, t2: 18.0, t1: 14.0 },
      { nb: 850, od: 864.0, x: 1020.0, y: 883.0, t2: 18.0, t1: 14.0 },
      { nb: 900, od: 914.0, x: 1070.0, y: 933.0, t2: 18.0, t1: 14.0 },
    ];

    for (const d of duckfootData) {
      await queryRunner.query(`
        INSERT INTO duckfoot_elbow_dimensions (nominal_bore_mm, outside_diameter_mm, base_plate_x_mm, base_plate_y_mm, rib_thickness_t2_mm, plate_thickness_t1_mm)
        VALUES (${d.nb}, ${d.od}, ${d.x}, ${d.y}, ${d.t2}, ${d.t1})
        ON CONFLICT (nominal_bore_mm) DO NOTHING
      `);
    }

    console.warn("Duckfoot elbow dimensions populated.");
  }

  private async correctSabs719BendData(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      "Correcting SABS 719 bend center-to-face data based on MPS manual cross-reference...",
    );

    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'sabs_719_bend_dimensions'
      )
    `);

    if (!tableExists[0]?.exists) {
      console.warn("Creating sabs_719_bend_dimensions table...");

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS sabs_719_bend_dimensions (
          id SERIAL PRIMARY KEY,
          bend_radius_type VARCHAR(20) NOT NULL,
          nominal_bore_mm INT NOT NULL,
          outside_diameter_mm DECIMAL(8,2) NOT NULL,
          center_to_face_a_mm DECIMAL(8,2) NOT NULL,
          center_to_face_b_mm DECIMAL(8,2) NOT NULL,
          center_to_face_c_mm DECIMAL(8,2) NOT NULL,
          radius_mm DECIMAL(8,2) NOT NULL,
          UNIQUE(bend_radius_type, nominal_bore_mm)
        )
      `);
    }

    const shortRadiusData = [
      { nb: 200, od: 219.1, a: 230, b: 155, c: 115, r: 230 },
      { nb: 250, od: 273.1, a: 280, b: 180, c: 140, r: 280 },
      { nb: 300, od: 323.9, a: 305, b: 205, c: 155, r: 305 },
      { nb: 350, od: 355.6, a: 355, b: 230, c: 180, r: 355 },
      { nb: 400, od: 406.4, a: 405, b: 255, c: 205, r: 405 },
      { nb: 450, od: 457.0, a: 460, b: 280, c: 230, r: 460 },
      { nb: 500, od: 508.0, a: 510, b: 305, c: 255, r: 510 },
      { nb: 550, od: 559.0, a: 560, b: 330, c: 280, r: 560 },
      { nb: 600, od: 610.0, a: 610, b: 355, c: 305, r: 610 },
      { nb: 650, od: 660.0, a: 660, b: 380, c: 330, r: 660 },
      { nb: 700, od: 711.0, a: 710, b: 405, c: 355, r: 710 },
      { nb: 750, od: 762.0, a: 760, b: 430, c: 380, r: 760 },
      { nb: 800, od: 813.0, a: 815, b: 460, c: 405, r: 815 },
      { nb: 850, od: 864.0, a: 865, b: 485, c: 430, r: 865 },
      { nb: 900, od: 914.0, a: 915, b: 510, c: 460, r: 915 },
    ];

    const mediumRadiusData = [
      { nb: 200, od: 219.1, a: 405, b: 205, c: 140, r: 405 },
      { nb: 250, od: 273.1, a: 510, b: 255, c: 180, r: 510 },
      { nb: 300, od: 323.9, a: 610, b: 305, c: 205, r: 610 },
      { nb: 350, od: 355.6, a: 710, b: 355, c: 240, r: 710 },
      { nb: 400, od: 406.4, a: 815, b: 405, c: 280, r: 815 },
      { nb: 450, od: 457.0, a: 915, b: 460, c: 305, r: 915 },
      { nb: 500, od: 508.0, a: 1020, b: 510, c: 345, r: 1020 },
      { nb: 550, od: 559.0, a: 1120, b: 560, c: 380, r: 1120 },
      { nb: 600, od: 610.0, a: 1220, b: 610, c: 405, r: 1220 },
      { nb: 650, od: 660.0, a: 1320, b: 660, c: 445, r: 1320 },
      { nb: 700, od: 711.0, a: 1420, b: 710, c: 485, r: 1420 },
      { nb: 750, od: 762.0, a: 1520, b: 760, c: 510, r: 1520 },
      { nb: 800, od: 813.0, a: 1630, b: 815, c: 545, r: 1630 },
      { nb: 850, od: 864.0, a: 1730, b: 865, c: 585, r: 1730 },
      { nb: 900, od: 914.0, a: 1830, b: 915, c: 610, r: 1830 },
    ];

    const longRadiusData = [
      { nb: 200, od: 219.1, a: 610, b: 405, c: 205, r: 610 },
      { nb: 250, od: 273.1, a: 760, b: 510, c: 255, r: 760 },
      { nb: 300, od: 323.9, a: 915, b: 610, c: 305, r: 915 },
      { nb: 350, od: 355.6, a: 1065, b: 710, c: 355, r: 1065 },
      { nb: 400, od: 406.4, a: 1215, b: 815, c: 405, r: 1215 },
      { nb: 450, od: 457.0, a: 1380, b: 915, c: 460, r: 1380 },
      { nb: 500, od: 508.0, a: 1530, b: 1020, c: 510, r: 1530 },
      { nb: 550, od: 559.0, a: 1680, b: 1120, c: 560, r: 1680 },
      { nb: 600, od: 610.0, a: 1830, b: 1220, c: 610, r: 1830 },
      { nb: 650, od: 660.0, a: 1980, b: 1320, c: 660, r: 1980 },
      { nb: 700, od: 711.0, a: 2130, b: 1420, c: 710, r: 2130 },
      { nb: 750, od: 762.0, a: 2280, b: 1520, c: 760, r: 2280 },
      { nb: 800, od: 813.0, a: 2445, b: 1630, c: 815, r: 2445 },
      { nb: 850, od: 864.0, a: 2595, b: 1730, c: 865, r: 2595 },
      { nb: 900, od: 914.0, a: 2745, b: 1830, c: 915, r: 2745 },
    ];

    for (const d of shortRadiusData) {
      await queryRunner.query(`
        INSERT INTO sabs_719_bend_dimensions (bend_radius_type, nominal_bore_mm, outside_diameter_mm, center_to_face_a_mm, center_to_face_b_mm, center_to_face_c_mm, radius_mm)
        VALUES ('short', ${d.nb}, ${d.od}, ${d.a}, ${d.b}, ${d.c}, ${d.r})
        ON CONFLICT (bend_radius_type, nominal_bore_mm) DO UPDATE SET
          center_to_face_a_mm = ${d.a},
          center_to_face_b_mm = ${d.b},
          center_to_face_c_mm = ${d.c},
          radius_mm = ${d.r}
      `);
    }

    for (const d of mediumRadiusData) {
      await queryRunner.query(`
        INSERT INTO sabs_719_bend_dimensions (bend_radius_type, nominal_bore_mm, outside_diameter_mm, center_to_face_a_mm, center_to_face_b_mm, center_to_face_c_mm, radius_mm)
        VALUES ('medium', ${d.nb}, ${d.od}, ${d.a}, ${d.b}, ${d.c}, ${d.r})
        ON CONFLICT (bend_radius_type, nominal_bore_mm) DO UPDATE SET
          center_to_face_a_mm = ${d.a},
          center_to_face_b_mm = ${d.b},
          center_to_face_c_mm = ${d.c},
          radius_mm = ${d.r}
      `);
    }

    for (const d of longRadiusData) {
      await queryRunner.query(`
        INSERT INTO sabs_719_bend_dimensions (bend_radius_type, nominal_bore_mm, outside_diameter_mm, center_to_face_a_mm, center_to_face_b_mm, center_to_face_c_mm, radius_mm)
        VALUES ('long', ${d.nb}, ${d.od}, ${d.a}, ${d.b}, ${d.c}, ${d.r})
        ON CONFLICT (bend_radius_type, nominal_bore_mm) DO UPDATE SET
          center_to_face_a_mm = ${d.a},
          center_to_face_b_mm = ${d.b},
          center_to_face_c_mm = ${d.c},
          radius_mm = ${d.r}
      `);
    }

    console.warn(
      "SABS 719 bend data corrected and extended with missing sizes (550, 650, 850 NB).",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS sabs_719_bend_dimensions");
    await queryRunner.query("DROP TABLE IF EXISTS duckfoot_elbow_dimensions");
    await queryRunner.query("DROP TABLE IF EXISTS bend_segment_rules");
  }
}
