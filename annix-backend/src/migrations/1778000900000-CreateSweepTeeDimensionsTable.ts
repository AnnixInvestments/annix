import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateSweepTeeDimensionsTable1778000900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "sweep_tee_dimensions",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "nominalBoreMm",
            type: "int",
            comment: "Nominal bore in millimeters",
          },
          {
            name: "outsideDiameterMm",
            type: "decimal",
            precision: 6,
            scale: 1,
            comment: "Outside diameter in millimeters",
          },
          {
            name: "radiusType",
            type: "varchar",
            length: "20",
            comment: "Radius type: long_radius, medium_radius, or elbow",
          },
          {
            name: "bendRadiusMm",
            type: "int",
            comment: "Bend radius dimension in mm",
          },
          {
            name: "pipeALengthMm",
            type: "int",
            comment: "Pipe A length dimension in mm",
          },
          {
            name: "elbowEMm",
            type: "int",
            isNullable: true,
            comment: "E dimension for elbows only, in mm",
          },
          {
            name: "createdAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updatedAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "sweep_tee_dimensions",
      new TableIndex({
        name: "IDX_sweep_tee_nb_radius_type",
        columnNames: ["nominalBoreMm", "radiusType"],
        isUnique: true,
      }),
    );

    const sweepTeeData = [
      {
        nb: 200,
        od: 219.1,
        radiusType: "long_radius",
        bendRadius: 610,
        pipeALength: 815,
        elbowE: null,
      },
      {
        nb: 200,
        od: 219.1,
        radiusType: "medium_radius",
        bendRadius: 405,
        pipeALength: 610,
        elbowE: null,
      },
      { nb: 200, od: 219.1, radiusType: "elbow", bendRadius: 205, pipeALength: 430, elbowE: 230 },
      {
        nb: 250,
        od: 273.1,
        radiusType: "long_radius",
        bendRadius: 760,
        pipeALength: 1020,
        elbowE: null,
      },
      {
        nb: 250,
        od: 273.1,
        radiusType: "medium_radius",
        bendRadius: 610,
        pipeALength: 915,
        elbowE: null,
      },
      { nb: 250, od: 273.1, radiusType: "elbow", bendRadius: 255, pipeALength: 535, elbowE: 280 },
      {
        nb: 300,
        od: 323.9,
        radiusType: "long_radius",
        bendRadius: 915,
        pipeALength: 1220,
        elbowE: null,
      },
      {
        nb: 300,
        od: 323.9,
        radiusType: "medium_radius",
        bendRadius: 815,
        pipeALength: 1215,
        elbowE: null,
      },
      { nb: 300, od: 323.9, radiusType: "elbow", bendRadius: 280, pipeALength: 610, elbowE: 305 },
      {
        nb: 350,
        od: 355.6,
        radiusType: "long_radius",
        bendRadius: 1070,
        pipeALength: 1420,
        elbowE: null,
      },
      {
        nb: 350,
        od: 355.6,
        radiusType: "medium_radius",
        bendRadius: 1020,
        pipeALength: 1530,
        elbowE: null,
      },
      { nb: 350, od: 355.6, radiusType: "elbow", bendRadius: 330, pipeALength: 710, elbowE: 355 },
      {
        nb: 400,
        od: 406.4,
        radiusType: "long_radius",
        bendRadius: 1215,
        pipeALength: 1630,
        elbowE: null,
      },
      {
        nb: 400,
        od: 406.4,
        radiusType: "medium_radius",
        bendRadius: 1220,
        pipeALength: 1830,
        elbowE: null,
      },
      { nb: 400, od: 406.4, radiusType: "elbow", bendRadius: 380, pipeALength: 810, elbowE: 405 },
      {
        nb: 450,
        od: 457.0,
        radiusType: "long_radius",
        bendRadius: 1380,
        pipeALength: 1830,
        elbowE: null,
      },
      {
        nb: 450,
        od: 457.0,
        radiusType: "medium_radius",
        bendRadius: 1420,
        pipeALength: 2130,
        elbowE: null,
      },
      { nb: 450, od: 457.0, radiusType: "elbow", bendRadius: 430, pipeALength: 920, elbowE: 460 },
      {
        nb: 500,
        od: 508.0,
        radiusType: "long_radius",
        bendRadius: 1530,
        pipeALength: 2040,
        elbowE: null,
      },
      {
        nb: 500,
        od: 508.0,
        radiusType: "medium_radius",
        bendRadius: 1630,
        pipeALength: 2445,
        elbowE: null,
      },
      { nb: 500, od: 508.0, radiusType: "elbow", bendRadius: 485, pipeALength: 1020, elbowE: 510 },
      {
        nb: 550,
        od: 559.0,
        radiusType: "long_radius",
        bendRadius: 1680,
        pipeALength: 2240,
        elbowE: null,
      },
      {
        nb: 550,
        od: 559.0,
        radiusType: "medium_radius",
        bendRadius: 1830,
        pipeALength: 2745,
        elbowE: null,
      },
      { nb: 550, od: 559.0, radiusType: "elbow", bendRadius: 535, pipeALength: 1120, elbowE: 560 },
      {
        nb: 600,
        od: 610.0,
        radiusType: "long_radius",
        bendRadius: 1830,
        pipeALength: 2440,
        elbowE: null,
      },
      { nb: 600, od: 610.0, radiusType: "elbow", bendRadius: 585, pipeALength: 1220, elbowE: 610 },
      {
        nb: 650,
        od: 660.0,
        radiusType: "long_radius",
        bendRadius: 1980,
        pipeALength: 2640,
        elbowE: null,
      },
      { nb: 650, od: 660.0, radiusType: "elbow", bendRadius: 635, pipeALength: 1320, elbowE: 660 },
      {
        nb: 700,
        od: 711.0,
        radiusType: "long_radius",
        bendRadius: 2130,
        pipeALength: 2840,
        elbowE: null,
      },
      { nb: 700, od: 711.0, radiusType: "elbow", bendRadius: 685, pipeALength: 1420, elbowE: 710 },
      {
        nb: 750,
        od: 762.0,
        radiusType: "long_radius",
        bendRadius: 2280,
        pipeALength: 3040,
        elbowE: null,
      },
      { nb: 750, od: 762.0, radiusType: "elbow", bendRadius: 740, pipeALength: 1520, elbowE: 760 },
      {
        nb: 800,
        od: 813.0,
        radiusType: "long_radius",
        bendRadius: 2445,
        pipeALength: 3260,
        elbowE: null,
      },
      { nb: 800, od: 813.0, radiusType: "elbow", bendRadius: 790, pipeALength: 1630, elbowE: 815 },
      {
        nb: 850,
        od: 864.0,
        radiusType: "long_radius",
        bendRadius: 2595,
        pipeALength: 3460,
        elbowE: null,
      },
      { nb: 850, od: 864.0, radiusType: "elbow", bendRadius: 840, pipeALength: 1730, elbowE: 865 },
      {
        nb: 900,
        od: 914.0,
        radiusType: "long_radius",
        bendRadius: 2745,
        pipeALength: 3660,
        elbowE: null,
      },
      { nb: 900, od: 914.0, radiusType: "elbow", bendRadius: 890, pipeALength: 1830, elbowE: 915 },
    ];

    for (const row of sweepTeeData) {
      await queryRunner.query(
        `INSERT INTO sweep_tee_dimensions ("nominalBoreMm", "outsideDiameterMm", "radiusType", "bendRadiusMm", "pipeALengthMm", "elbowEMm") VALUES ($1, $2, $3, $4, $5, $6)`,
        [row.nb, row.od, row.radiusType, row.bendRadius, row.pipeALength, row.elbowE],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("sweep_tee_dimensions", "IDX_sweep_tee_nb_radius_type");
    await queryRunner.dropTable("sweep_tee_dimensions");
  }
}
