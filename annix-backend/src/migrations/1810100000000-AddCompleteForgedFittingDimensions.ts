import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompleteForgedFittingDimensions1810100000000 implements MigrationInterface {
  name = "AddCompleteForgedFittingDimensions1810100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addSchemaColumns(queryRunner);
    await this.addSeries9000(queryRunner);
    await this.seedElbow90Data(queryRunner);
    await this.seedElbow45Data(queryRunner);
    await this.seedTeeAndCrossData(queryRunner);
    await this.seedCouplingData(queryRunner);
    await this.seedCapData(queryRunner);
    await this.seedUnionData(queryRunner);
    await this.updateSocketDepthAndWall(queryRunner);
    await this.seedElbow90MassData(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "DELETE FROM forged_fitting_dimensions WHERE series_id IN (SELECT id FROM forged_fitting_series WHERE pressure_class = 9000)",
    );
    await queryRunner.query(
      `DELETE FROM forged_fitting_series WHERE pressure_class = 9000 AND connection_type = 'SW'`,
    );
    await queryRunner.query(
      "ALTER TABLE forged_fitting_dimensions DROP COLUMN IF EXISTS socket_depth_mm",
    );
    await queryRunner.query(
      "ALTER TABLE forged_fitting_dimensions DROP COLUMN IF EXISTS min_wall_thickness_mm",
    );
  }

  private async addSchemaColumns(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE forged_fitting_dimensions ADD COLUMN IF NOT EXISTS socket_depth_mm decimal(10,2)",
    );
    await queryRunner.query(
      "ALTER TABLE forged_fitting_dimensions ADD COLUMN IF NOT EXISTS min_wall_thickness_mm decimal(10,2)",
    );
  }

  private async addSeries9000(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
			INSERT INTO forged_fitting_series (pressure_class, connection_type, standard_code, description)
			VALUES (9000, 'SW', 'ASME B16.11', '9000 lb Socket Weld')
			ON CONFLICT DO NOTHING
		`);
  }

  private async lookupSeriesId(
    queryRunner: QueryRunner,
    pressureClass: number,
    connectionType: string,
  ): Promise<number | null> {
    const result = await queryRunner.query(
      `SELECT id FROM forged_fitting_series WHERE pressure_class = ${pressureClass} AND connection_type = '${connectionType}'`,
    );
    if (result.length > 0) {
      return result[0].id;
    }
    return null;
  }

  private async lookupFittingTypeId(
    queryRunner: QueryRunner,
    code: string,
  ): Promise<number | null> {
    const result = await queryRunner.query(
      `SELECT id FROM forged_fitting_types WHERE code = '${code}'`,
    );
    if (result.length > 0) {
      return result[0].id;
    }
    return null;
  }

  private async insertDimensionRows(
    queryRunner: QueryRunner,
    seriesId: number,
    fittingTypeId: number,
    rows: Array<{
      nbMm: number;
      aMm?: number | null;
      cMm?: number | null;
      massKg?: number | null;
    }>,
  ): Promise<void> {
    const values = rows
      .map((row) => {
        const aMm = row.aMm != null ? `${row.aMm}` : "NULL";
        const cMm = row.cMm != null ? `${row.cMm}` : "NULL";
        const massKg = row.massKg != null ? `${row.massKg}` : "NULL";
        return `(${seriesId}, ${fittingTypeId}, ${row.nbMm}, ${aMm}, ${cMm}, ${massKg})`;
      })
      .join(",\n");

    await queryRunner.query(`
			INSERT INTO forged_fitting_dimensions
				(series_id, fitting_type_id, nominal_bore_mm, dimension_a_mm, dimension_c_mm, mass_kg)
			VALUES ${values}
			ON CONFLICT DO NOTHING
		`);
  }

  private async seedElbow90Data(queryRunner: QueryRunner): Promise<void> {
    const series2000SwId = await this.lookupSeriesId(queryRunner, 2000, "SW");
    const series3000SwId = await this.lookupSeriesId(queryRunner, 3000, "SW");
    const series6000SwId = await this.lookupSeriesId(queryRunner, 6000, "SW");
    const series9000SwId = await this.lookupSeriesId(queryRunner, 9000, "SW");
    const elbow90Id = await this.lookupFittingTypeId(queryRunner, "ELBOW_90");

    if (!elbow90Id) {
      return;
    }

    const elbow90AData: Array<{
      nbMm: number;
      c2000: number;
      c3000: number;
      c6000: number;
      c9000: number | null;
    }> = [
      { nbMm: 6, c2000: 21, c3000: 21, c6000: 25, c9000: 25 },
      { nbMm: 8, c2000: 21, c3000: 25, c6000: 28, c9000: 28 },
      { nbMm: 10, c2000: 25, c3000: 28, c6000: 33, c9000: 33 },
      { nbMm: 15, c2000: 28, c3000: 33, c6000: 38, c9000: 44 },
      { nbMm: 20, c2000: 33, c3000: 38, c6000: 44, c9000: 51 },
      { nbMm: 25, c2000: 38, c3000: 44, c6000: 51, c9000: 60 },
      { nbMm: 32, c2000: 44, c3000: 51, c6000: 60, c9000: 64 },
      { nbMm: 40, c2000: 51, c3000: 60, c6000: 64, c9000: 76 },
      { nbMm: 50, c2000: 60, c3000: 64, c6000: 83, c9000: 95 },
      { nbMm: 65, c2000: 76, c3000: 83, c6000: 95, c9000: null },
      { nbMm: 80, c2000: 86, c3000: 95, c6000: 106, c9000: null },
      { nbMm: 100, c2000: 106, c3000: 114, c6000: 114, c9000: null },
    ];

    const classConfigs: Array<{
      seriesId: number | null;
      key: "c2000" | "c3000" | "c6000" | "c9000";
    }> = [
      { seriesId: series2000SwId, key: "c2000" },
      { seriesId: series3000SwId, key: "c3000" },
      { seriesId: series6000SwId, key: "c6000" },
      { seriesId: series9000SwId, key: "c9000" },
    ];

    await classConfigs.reduce(async (prev, config) => {
      await prev;
      if (!config.seriesId) {
        return;
      }
      const rows = elbow90AData
        .filter((row) => row[config.key] != null)
        .map((row) => ({
          nbMm: row.nbMm,
          aMm: row[config.key],
        }));
      await this.insertDimensionRows(queryRunner, config.seriesId, elbow90Id, rows);
    }, Promise.resolve());
  }

  private async seedElbow45Data(queryRunner: QueryRunner): Promise<void> {
    const series2000SwId = await this.lookupSeriesId(queryRunner, 2000, "SW");
    const series3000SwId = await this.lookupSeriesId(queryRunner, 3000, "SW");
    const series6000SwId = await this.lookupSeriesId(queryRunner, 6000, "SW");
    const series9000SwId = await this.lookupSeriesId(queryRunner, 9000, "SW");
    const elbow45Id = await this.lookupFittingTypeId(queryRunner, "ELBOW_45");

    if (!elbow45Id) {
      return;
    }

    const elbow45CData: Array<{
      nbMm: number;
      c2000: number;
      c3000: number;
      c6000: number;
      c9000: number | null;
    }> = [
      { nbMm: 6, c2000: 17, c3000: 17, c6000: 19, c9000: 19 },
      { nbMm: 8, c2000: 17, c3000: 19, c6000: 22, c9000: 22 },
      { nbMm: 10, c2000: 19, c3000: 22, c6000: 25, c9000: 25 },
      { nbMm: 15, c2000: 22, c3000: 25, c6000: 28, c9000: 33 },
      { nbMm: 20, c2000: 25, c3000: 28, c6000: 33, c9000: 35 },
      { nbMm: 25, c2000: 28, c3000: 33, c6000: 35, c9000: 43 },
      { nbMm: 32, c2000: 33, c3000: 35, c6000: 43, c9000: 44 },
      { nbMm: 40, c2000: 35, c3000: 43, c6000: 44, c9000: 52 },
      { nbMm: 50, c2000: 43, c3000: 44, c6000: 52, c9000: 64 },
      { nbMm: 65, c2000: 52, c3000: 52, c6000: 64, c9000: null },
      { nbMm: 80, c2000: 64, c3000: 64, c6000: 79, c9000: null },
      { nbMm: 100, c2000: 79, c3000: 79, c6000: 79, c9000: null },
    ];

    const classConfigs: Array<{
      seriesId: number | null;
      key: "c2000" | "c3000" | "c6000" | "c9000";
    }> = [
      { seriesId: series2000SwId, key: "c2000" },
      { seriesId: series3000SwId, key: "c3000" },
      { seriesId: series6000SwId, key: "c6000" },
      { seriesId: series9000SwId, key: "c9000" },
    ];

    await classConfigs.reduce(async (prev, config) => {
      await prev;
      if (!config.seriesId) {
        return;
      }
      const rows = elbow45CData
        .filter((row) => row[config.key] != null)
        .map((row) => ({
          nbMm: row.nbMm,
          cMm: row[config.key],
        }));
      await this.insertDimensionRows(queryRunner, config.seriesId, elbow45Id, rows);
    }, Promise.resolve());
  }

  private async seedTeeAndCrossData(queryRunner: QueryRunner): Promise<void> {
    const series2000SwId = await this.lookupSeriesId(queryRunner, 2000, "SW");
    const series3000SwId = await this.lookupSeriesId(queryRunner, 3000, "SW");
    const series6000SwId = await this.lookupSeriesId(queryRunner, 6000, "SW");
    const series9000SwId = await this.lookupSeriesId(queryRunner, 9000, "SW");
    const teeId = await this.lookupFittingTypeId(queryRunner, "TEE");
    const crossId = await this.lookupFittingTypeId(queryRunner, "CROSS");

    const teeAData: Array<{
      nbMm: number;
      c2000: number;
      c3000: number;
      c6000: number;
      c9000: number | null;
    }> = [
      { nbMm: 6, c2000: 21, c3000: 21, c6000: 25, c9000: 25 },
      { nbMm: 8, c2000: 21, c3000: 25, c6000: 28, c9000: 28 },
      { nbMm: 10, c2000: 25, c3000: 28, c6000: 33, c9000: 33 },
      { nbMm: 15, c2000: 28, c3000: 33, c6000: 38, c9000: 44 },
      { nbMm: 20, c2000: 33, c3000: 38, c6000: 44, c9000: 51 },
      { nbMm: 25, c2000: 38, c3000: 44, c6000: 51, c9000: 60 },
      { nbMm: 32, c2000: 44, c3000: 51, c6000: 60, c9000: 64 },
      { nbMm: 40, c2000: 51, c3000: 60, c6000: 64, c9000: 76 },
      { nbMm: 50, c2000: 60, c3000: 64, c6000: 83, c9000: 95 },
      { nbMm: 65, c2000: 76, c3000: 83, c6000: 95, c9000: null },
      { nbMm: 80, c2000: 86, c3000: 95, c6000: 106, c9000: null },
      { nbMm: 100, c2000: 106, c3000: 114, c6000: 114, c9000: null },
    ];

    const classConfigs: Array<{
      seriesId: number | null;
      key: "c2000" | "c3000" | "c6000" | "c9000";
    }> = [
      { seriesId: series2000SwId, key: "c2000" },
      { seriesId: series3000SwId, key: "c3000" },
      { seriesId: series6000SwId, key: "c6000" },
      { seriesId: series9000SwId, key: "c9000" },
    ];

    const fittingTypeIds = [teeId, crossId].filter((id): id is number => id != null);

    await fittingTypeIds.reduce(async (prevType, typeId) => {
      await prevType;
      await classConfigs.reduce(async (prev, config) => {
        await prev;
        if (!config.seriesId) {
          return;
        }
        const rows = teeAData
          .filter((row) => row[config.key] != null)
          .map((row) => ({
            nbMm: row.nbMm,
            aMm: row[config.key],
          }));
        await this.insertDimensionRows(queryRunner, config.seriesId, typeId, rows);
      }, Promise.resolve());
    }, Promise.resolve());
  }

  private async seedCouplingData(queryRunner: QueryRunner): Promise<void> {
    const series3000SwId = await this.lookupSeriesId(queryRunner, 3000, "SW");
    const series6000SwId = await this.lookupSeriesId(queryRunner, 6000, "SW");
    const couplingId = await this.lookupFittingTypeId(queryRunner, "COUPLING");

    if (!couplingId) {
      return;
    }

    const couplingData: Array<{ nbMm: number; w3000: number; w6000: number }> = [
      { nbMm: 6, w3000: 38, w6000: 44 },
      { nbMm: 8, w3000: 38, w6000: 44 },
      { nbMm: 10, w3000: 41, w6000: 48 },
      { nbMm: 15, w3000: 48, w6000: 54 },
      { nbMm: 20, w3000: 51, w6000: 57 },
      { nbMm: 25, w3000: 54, w6000: 64 },
      { nbMm: 32, w3000: 60, w6000: 70 },
      { nbMm: 40, w3000: 64, w6000: 73 },
      { nbMm: 50, w3000: 73, w6000: 83 },
      { nbMm: 65, w3000: 79, w6000: 89 },
      { nbMm: 80, w3000: 86, w6000: 95 },
      { nbMm: 100, w3000: 95, w6000: 105 },
    ];

    const seriesConfigs: Array<{ seriesId: number | null; key: "w3000" | "w6000" }> = [
      { seriesId: series3000SwId, key: "w3000" },
      { seriesId: series6000SwId, key: "w6000" },
    ];

    await seriesConfigs.reduce(async (prev, config) => {
      await prev;
      if (!config.seriesId) {
        return;
      }
      const rows = couplingData.map((row) => ({
        nbMm: row.nbMm,
        aMm: row[config.key],
      }));
      await this.insertDimensionRows(queryRunner, config.seriesId, couplingId, rows);
    }, Promise.resolve());
  }

  private async seedCapData(queryRunner: QueryRunner): Promise<void> {
    const series3000SwId = await this.lookupSeriesId(queryRunner, 3000, "SW");
    const series6000SwId = await this.lookupSeriesId(queryRunner, 6000, "SW");
    const capId = await this.lookupFittingTypeId(queryRunner, "CAP");

    if (!capId) {
      return;
    }

    const capData: Array<{ nbMm: number; p3000: number; p6000: number }> = [
      { nbMm: 6, p3000: 25, p6000: 32 },
      { nbMm: 8, p3000: 25, p6000: 32 },
      { nbMm: 10, p3000: 29, p6000: 35 },
      { nbMm: 15, p3000: 32, p6000: 38 },
      { nbMm: 20, p3000: 35, p6000: 41 },
      { nbMm: 25, p3000: 38, p6000: 48 },
      { nbMm: 32, p3000: 43, p6000: 51 },
      { nbMm: 40, p3000: 48, p6000: 54 },
      { nbMm: 50, p3000: 51, p6000: 64 },
      { nbMm: 65, p3000: 57, p6000: 70 },
      { nbMm: 80, p3000: 64, p6000: 76 },
      { nbMm: 100, p3000: 73, p6000: 86 },
    ];

    const seriesConfigs: Array<{ seriesId: number | null; key: "p3000" | "p6000" }> = [
      { seriesId: series3000SwId, key: "p3000" },
      { seriesId: series6000SwId, key: "p6000" },
    ];

    await seriesConfigs.reduce(async (prev, config) => {
      await prev;
      if (!config.seriesId) {
        return;
      }
      const rows = capData.map((row) => ({
        nbMm: row.nbMm,
        aMm: row[config.key],
      }));
      await this.insertDimensionRows(queryRunner, config.seriesId, capId, rows);
    }, Promise.resolve());
  }

  private async seedUnionData(queryRunner: QueryRunner): Promise<void> {
    const series3000SwId = await this.lookupSeriesId(queryRunner, 3000, "SW");
    const series6000SwId = await this.lookupSeriesId(queryRunner, 6000, "SW");
    const unionId = await this.lookupFittingTypeId(queryRunner, "UNION");

    if (!unionId) {
      return;
    }

    const unionData: Array<{ nbMm: number; a3000: number; a6000: number }> = [
      { nbMm: 6, a3000: 51, a6000: 60 },
      { nbMm: 8, a3000: 51, a6000: 60 },
      { nbMm: 10, a3000: 54, a6000: 64 },
      { nbMm: 15, a3000: 57, a6000: 67 },
      { nbMm: 20, a3000: 64, a6000: 73 },
      { nbMm: 25, a3000: 70, a6000: 79 },
      { nbMm: 32, a3000: 79, a6000: 89 },
      { nbMm: 40, a3000: 86, a6000: 95 },
      { nbMm: 50, a3000: 92, a6000: 105 },
    ];

    const seriesConfigs: Array<{ seriesId: number | null; key: "a3000" | "a6000" }> = [
      { seriesId: series3000SwId, key: "a3000" },
      { seriesId: series6000SwId, key: "a6000" },
    ];

    await seriesConfigs.reduce(async (prev, config) => {
      await prev;
      if (!config.seriesId) {
        return;
      }
      const rows = unionData.map((row) => ({
        nbMm: row.nbMm,
        aMm: row[config.key],
      }));
      await this.insertDimensionRows(queryRunner, config.seriesId, unionId, rows);
    }, Promise.resolve());
  }

  private async updateSocketDepthAndWall(queryRunner: QueryRunner): Promise<void> {
    const series2000SwId = await this.lookupSeriesId(queryRunner, 2000, "SW");
    const series3000SwId = await this.lookupSeriesId(queryRunner, 3000, "SW");
    const series6000SwId = await this.lookupSeriesId(queryRunner, 6000, "SW");
    const series9000SwId = await this.lookupSeriesId(queryRunner, 9000, "SW");

    const socketDepthByNb: Array<{ nbMm: number; jMm: number }> = [
      { nbMm: 6, jMm: 6.4 },
      { nbMm: 8, jMm: 6.4 },
      { nbMm: 10, jMm: 7.9 },
      { nbMm: 15, jMm: 9.5 },
      { nbMm: 20, jMm: 9.5 },
      { nbMm: 25, jMm: 11.2 },
      { nbMm: 32, jMm: 12.7 },
      { nbMm: 40, jMm: 12.7 },
      { nbMm: 50, jMm: 14.3 },
      { nbMm: 65, jMm: 15.9 },
      { nbMm: 80, jMm: 17.5 },
      { nbMm: 100, jMm: 19.1 },
    ];

    const allSwSeriesIds = [series2000SwId, series3000SwId, series6000SwId, series9000SwId].filter(
      (id): id is number => id != null,
    );

    await socketDepthByNb.reduce(async (prev, row) => {
      await prev;
      const seriesIdList = allSwSeriesIds.join(",");
      await queryRunner.query(`
				UPDATE forged_fitting_dimensions
				SET socket_depth_mm = ${row.jMm}
				WHERE series_id IN (${seriesIdList})
				AND nominal_bore_mm = ${row.nbMm}
			`);
    }, Promise.resolve());

    const minWallData: Array<{
      nbMm: number;
      g2000: number;
      g3000: number;
      g6000: number;
      g9000: number | null;
    }> = [
      { nbMm: 6, g2000: 3.18, g3000: 3.18, g6000: 6.35, g9000: 6.35 },
      { nbMm: 8, g2000: 3.18, g3000: 3.18, g6000: 6.6, g9000: 6.6 },
      { nbMm: 10, g2000: 3.18, g3000: 3.18, g6000: 6.98, g9000: 6.98 },
      { nbMm: 15, g2000: 3.18, g3000: 4.78, g6000: 8.15, g9000: 10.16 },
      { nbMm: 20, g2000: 3.18, g3000: 5.08, g6000: 8.53, g9000: 11.07 },
      { nbMm: 25, g2000: 3.68, g3000: 6.35, g6000: 9.93, g9000: 13.49 },
      { nbMm: 32, g2000: 3.89, g3000: 6.35, g6000: 10.59, g9000: 13.49 },
      { nbMm: 40, g2000: 4.01, g3000: 7.14, g6000: 11.07, g9000: 15.24 },
      { nbMm: 50, g2000: 4.27, g3000: 8.74, g6000: 12.09, g9000: 17.12 },
      { nbMm: 65, g2000: 5.61, g3000: 9.53, g6000: 15.29, g9000: null },
      { nbMm: 80, g2000: 5.99, g3000: 11.13, g6000: 16.64, g9000: null },
      { nbMm: 100, g2000: 6.55, g3000: 13.49, g6000: 18.67, g9000: null },
    ];

    const wallClassConfigs: Array<{
      seriesId: number | null;
      key: "g2000" | "g3000" | "g6000" | "g9000";
    }> = [
      { seriesId: series2000SwId, key: "g2000" },
      { seriesId: series3000SwId, key: "g3000" },
      { seriesId: series6000SwId, key: "g6000" },
      { seriesId: series9000SwId, key: "g9000" },
    ];

    await wallClassConfigs.reduce(async (prev, config) => {
      await prev;
      if (!config.seriesId) {
        return;
      }
      await minWallData
        .filter((row) => row[config.key] != null)
        .reduce(async (innerPrev, row) => {
          await innerPrev;
          await queryRunner.query(`
						UPDATE forged_fitting_dimensions
						SET min_wall_thickness_mm = ${row[config.key]}
						WHERE series_id = ${config.seriesId}
						AND nominal_bore_mm = ${row.nbMm}
					`);
        }, Promise.resolve());
    }, Promise.resolve());
  }

  private async seedElbow90MassData(queryRunner: QueryRunner): Promise<void> {
    const series3000SwId = await this.lookupSeriesId(queryRunner, 3000, "SW");
    const series3000ThdId = await this.lookupSeriesId(queryRunner, 3000, "THD");
    const series6000SwId = await this.lookupSeriesId(queryRunner, 6000, "SW");
    const elbow90Id = await this.lookupFittingTypeId(queryRunner, "ELBOW_90");

    if (!elbow90Id) {
      return;
    }

    const massData: Array<{
      nbMm: number;
      sw3000: number;
      thd3000: number;
      sw6000: number;
    }> = [
      { nbMm: 6, sw3000: 0.05, thd3000: 0.04, sw6000: 0.09 },
      { nbMm: 8, sw3000: 0.07, thd3000: 0.06, sw6000: 0.14 },
      { nbMm: 10, sw3000: 0.1, thd3000: 0.08, sw6000: 0.2 },
      { nbMm: 15, sw3000: 0.16, thd3000: 0.14, sw6000: 0.36 },
      { nbMm: 20, sw3000: 0.25, thd3000: 0.22, sw6000: 0.57 },
      { nbMm: 25, sw3000: 0.39, thd3000: 0.34, sw6000: 0.91 },
      { nbMm: 32, sw3000: 0.68, thd3000: 0.59, sw6000: 1.5 },
      { nbMm: 40, sw3000: 0.95, thd3000: 0.82, sw6000: 1.91 },
      { nbMm: 50, sw3000: 1.59, thd3000: 1.36, sw6000: 3.18 },
      { nbMm: 65, sw3000: 2.72, thd3000: 2.36, sw6000: 5.44 },
      { nbMm: 80, sw3000: 4.08, thd3000: 3.54, sw6000: 7.71 },
      { nbMm: 100, sw3000: 7.26, thd3000: 6.35, sw6000: 12.25 },
    ];

    const massConfigs: Array<{
      seriesId: number | null;
      key: "sw3000" | "thd3000" | "sw6000";
    }> = [
      { seriesId: series3000SwId, key: "sw3000" },
      { seriesId: series3000ThdId, key: "thd3000" },
      { seriesId: series6000SwId, key: "sw6000" },
    ];

    await massConfigs.reduce(async (prev, config) => {
      await prev;
      if (!config.seriesId) {
        return;
      }
      await massData.reduce(async (innerPrev, row) => {
        await innerPrev;
        await queryRunner.query(`
					UPDATE forged_fitting_dimensions
					SET mass_kg = ${row[config.key]}
					WHERE series_id = ${config.seriesId}
					AND fitting_type_id = ${elbow90Id}
					AND nominal_bore_mm = ${row.nbMm}
				`);
      }, Promise.resolve());
    }, Promise.resolve());
  }
}
