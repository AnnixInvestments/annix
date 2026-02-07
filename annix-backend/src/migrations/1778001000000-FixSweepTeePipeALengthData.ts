import { MigrationInterface, QueryRunner } from "typeorm";

export class FixSweepTeePipeALengthData1778001000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const correctMediumRadiusData = [
      { nb: 200, bendRadius: 405, pipeALength: 610 },
      { nb: 250, bendRadius: 510, pipeALength: 760 },
      { nb: 300, bendRadius: 610, pipeALength: 915 },
      { nb: 350, bendRadius: 710, pipeALength: 1070 },
      { nb: 400, bendRadius: 815, pipeALength: 1215 },
      { nb: 450, bendRadius: 915, pipeALength: 1380 },
      { nb: 500, bendRadius: 1020, pipeALength: 1530 },
      { nb: 550, bendRadius: 1120, pipeALength: 1680 },
      { nb: 600, bendRadius: 1220, pipeALength: 1830 },
      { nb: 650, bendRadius: 1320, pipeALength: 1980 },
      { nb: 700, bendRadius: 1420, pipeALength: 2130 },
      { nb: 750, bendRadius: 1520, pipeALength: 2280 },
      { nb: 800, bendRadius: 1630, pipeALength: 2445 },
      { nb: 850, bendRadius: 1730, pipeALength: 2595 },
      { nb: 900, bendRadius: 1830, pipeALength: 2745 },
    ];

    for (const row of correctMediumRadiusData) {
      const exists = await queryRunner.query(
        `SELECT id FROM sweep_tee_dimensions WHERE "nominalBoreMm" = $1 AND "radiusType" = 'medium_radius'`,
        [row.nb],
      );

      if (exists.length > 0) {
        await queryRunner.query(
          `UPDATE sweep_tee_dimensions SET "bendRadiusMm" = $1, "pipeALengthMm" = $2 WHERE "nominalBoreMm" = $3 AND "radiusType" = 'medium_radius'`,
          [row.bendRadius, row.pipeALength, row.nb],
        );
      } else {
        const od =
          row.nb === 200
            ? 219.1
            : row.nb === 250
              ? 273.1
              : row.nb === 300
                ? 323.9
                : row.nb === 350
                  ? 355.6
                  : row.nb === 400
                    ? 406.4
                    : row.nb === 450
                      ? 457
                      : row.nb === 500
                        ? 508
                        : row.nb === 550
                          ? 559
                          : row.nb === 600
                            ? 610
                            : row.nb === 650
                              ? 660
                              : row.nb === 700
                                ? 711
                                : row.nb === 750
                                  ? 762
                                  : row.nb === 800
                                    ? 813
                                    : row.nb === 850
                                      ? 864
                                      : 914;
        await queryRunner.query(
          `INSERT INTO sweep_tee_dimensions ("nominalBoreMm", "outsideDiameterMm", "radiusType", "bendRadiusMm", "pipeALengthMm", "elbowEMm") VALUES ($1, $2, 'medium_radius', $3, $4, NULL)`,
          [row.nb, od, row.bendRadius, row.pipeALength],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const originalMediumRadiusData = [
      { nb: 200, bendRadius: 405, pipeALength: 610 },
      { nb: 250, bendRadius: 610, pipeALength: 915 },
      { nb: 300, bendRadius: 815, pipeALength: 1215 },
      { nb: 350, bendRadius: 1020, pipeALength: 1530 },
      { nb: 400, bendRadius: 1220, pipeALength: 1830 },
      { nb: 450, bendRadius: 1420, pipeALength: 2130 },
      { nb: 500, bendRadius: 1630, pipeALength: 2445 },
      { nb: 550, bendRadius: 1830, pipeALength: 2745 },
    ];

    for (const row of originalMediumRadiusData) {
      await queryRunner.query(
        `UPDATE sweep_tee_dimensions SET "bendRadiusMm" = $1, "pipeALengthMm" = $2 WHERE "nominalBoreMm" = $3 AND "radiusType" = 'medium_radius'`,
        [row.bendRadius, row.pipeALength, row.nb],
      );
    }

    await queryRunner.query(
      `DELETE FROM sweep_tee_dimensions WHERE "nominalBoreMm" IN (600, 650, 700, 750, 800, 850, 900) AND "radiusType" = 'medium_radius'`,
    );
  }
}
