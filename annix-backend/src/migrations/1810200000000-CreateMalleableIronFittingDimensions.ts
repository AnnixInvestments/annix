import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMalleableIronFittingDimensions1810200000000 implements MigrationInterface {
  name = "CreateMalleableIronFittingDimensions1810200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createTable(queryRunner);
    await this.seedClass150Primary(queryRunner);
    await this.seedClass150Secondary(queryRunner);
    await this.seedClass300(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS malleable_iron_fitting_dimensions");
  }

  private async createTable(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS malleable_iron_fitting_dimensions (
				id SERIAL PRIMARY KEY,
				fitting_type VARCHAR(50) NOT NULL,
				nominal_bore_mm DECIMAL(10,2) NOT NULL,
				pressure_class INT NOT NULL,
				center_to_face_mm DECIMAL(10,2),
				thread_length_mm DECIMAL(10,2),
				weight_kg DECIMAL(10,3),
				standard VARCHAR(50) NOT NULL DEFAULT 'BS 143',
				UNIQUE (fitting_type, nominal_bore_mm, pressure_class)
			)
		`);
  }

  private async seedClass150Primary(queryRunner: QueryRunner): Promise<void> {
    const nbSizes = [6, 8, 10, 15, 20, 25, 32, 40, 50, 65, 80, 100];
    const threadLengths = [6.5, 8.0, 8.5, 10.0, 11.0, 12.0, 13.5, 14.0, 15.5, 17.5, 19.0, 21.0];

    const elbow90CtF = [18, 21, 24, 27, 32, 38, 44, 48, 57, 67, 76, 95];
    const elbow90Wt = [0.04, 0.06, 0.09, 0.14, 0.22, 0.36, 0.59, 0.82, 1.36, 2.27, 3.18, 5.9];

    const elbow45CtF = [14, 16, 19, 22, 25, 29, 35, 38, 44, 51, 57, 70];
    const elbow45Wt = [0.03, 0.05, 0.07, 0.1, 0.16, 0.26, 0.42, 0.59, 0.95, 1.59, 2.22, 4.08];

    const teeCtF = [21, 24, 27, 33, 38, 44, 48, 54, 64, 76, 86, 105];
    const teeWt = [0.05, 0.08, 0.12, 0.18, 0.3, 0.5, 0.77, 1.09, 1.77, 3.04, 4.31, 7.71];

    const crossCtF = [21, 24, 27, 33, 38, 44, 48, 54, 64, 76, 86, 105];
    const crossWt = [0.06, 0.1, 0.15, 0.23, 0.38, 0.64, 1.0, 1.41, 2.27, 3.9, 5.53, 9.98];

    const capLen = [16, 19, 22, 25, 29, 32, 38, 41, 48, 54, 60, 73];
    const capWt = [0.02, 0.03, 0.05, 0.07, 0.11, 0.18, 0.27, 0.36, 0.59, 0.91, 1.27, 2.27];

    const couplingLen = [27, 29, 32, 35, 38, 44, 48, 51, 57, 64, 70, 83];
    const couplingWt = [0.03, 0.05, 0.07, 0.1, 0.16, 0.25, 0.36, 0.5, 0.77, 1.18, 1.59, 2.72];

    const values = nbSizes.flatMap((nb, i) => [
      `('ELBOW_90', ${nb}, 150, ${elbow90CtF[i]}, ${threadLengths[i]}, ${elbow90Wt[i]}, 'BS 143')`,
      `('ELBOW_45', ${nb}, 150, ${elbow45CtF[i]}, ${threadLengths[i]}, ${elbow45Wt[i]}, 'BS 143')`,
      `('TEE_EQUAL', ${nb}, 150, ${teeCtF[i]}, ${threadLengths[i]}, ${teeWt[i]}, 'BS 143')`,
      `('CROSS', ${nb}, 150, ${crossCtF[i]}, ${threadLengths[i]}, ${crossWt[i]}, 'BS 143')`,
      `('CAP', ${nb}, 150, ${capLen[i]}, ${threadLengths[i]}, ${capWt[i]}, 'BS 143')`,
      `('COUPLING', ${nb}, 150, ${couplingLen[i]}, ${threadLengths[i]}, ${couplingWt[i]}, 'BS 143')`,
    ]);

    await queryRunner.query(`
			INSERT INTO malleable_iron_fitting_dimensions
				(fitting_type, nominal_bore_mm, pressure_class, center_to_face_mm, thread_length_mm, weight_kg, standard)
			VALUES ${values.join(",\n")}
			ON CONFLICT (fitting_type, nominal_bore_mm, pressure_class) DO NOTHING
		`);
  }

  private async seedClass150Secondary(queryRunner: QueryRunner): Promise<void> {
    const nbSizes = [6, 8, 10, 15, 20, 25, 32, 40, 50, 65, 80, 100];
    const threadLengths = [6.5, 8.0, 8.5, 10.0, 11.0, 12.0, 13.5, 14.0, 15.5, 17.5, 19.0, 21.0];

    const teeCtF = [21, 24, 27, 33, 38, 44, 48, 54, 64, 76, 86, 105];
    const elbow90CtF = [18, 21, 24, 27, 32, 38, 44, 48, 57, 67, 76, 95];
    const elbow45CtF = [14, 16, 19, 22, 25, 29, 35, 38, 44, 51, 57, 70];

    const couplingWt = [0.03, 0.05, 0.07, 0.1, 0.16, 0.25, 0.36, 0.5, 0.77, 1.18, 1.59, 2.72];
    const capWt = [0.02, 0.03, 0.05, 0.07, 0.11, 0.18, 0.27, 0.36, 0.59, 0.91, 1.27, 2.27];
    const elbow90Wt = [0.04, 0.06, 0.09, 0.14, 0.22, 0.36, 0.59, 0.82, 1.36, 2.27, 3.18, 5.9];
    const elbow45Wt = [0.03, 0.05, 0.07, 0.1, 0.16, 0.26, 0.42, 0.59, 0.95, 1.59, 2.22, 4.08];

    const values = nbSizes.flatMap((nb, i) => {
      const unionCtF = teeCtF[i];
      const unionWt = Math.round(couplingWt[i] * 1.3 * 1000) / 1000;
      const nippleCtF = Math.round(threadLengths[i] * 2 + 5);
      const nippleWt = Math.round(couplingWt[i] * 0.6 * 1000) / 1000;
      const plugWt = Math.round(capWt[i] * 0.8 * 1000) / 1000;
      const bushingWt = Math.round(couplingWt[i] * 0.5 * 1000) / 1000;
      const streetElbow90Wt = Math.round(elbow90Wt[i] * 1.1 * 1000) / 1000;
      const streetElbow45Wt = Math.round(elbow45Wt[i] * 1.1 * 1000) / 1000;

      return [
        `('UNION', ${nb}, 150, ${unionCtF}, ${threadLengths[i]}, ${unionWt}, 'BS 143')`,
        `('NIPPLE', ${nb}, 150, ${nippleCtF}, ${threadLengths[i]}, ${nippleWt}, 'BS 143')`,
        `('PLUG', ${nb}, 150, NULL, ${threadLengths[i]}, ${plugWt}, 'BS 143')`,
        `('BUSHING', ${nb}, 150, NULL, ${threadLengths[i]}, ${bushingWt}, 'BS 143')`,
        `('STREET_ELBOW_90', ${nb}, 150, ${elbow90CtF[i]}, ${threadLengths[i]}, ${streetElbow90Wt}, 'BS 143')`,
        `('STREET_ELBOW_45', ${nb}, 150, ${elbow45CtF[i]}, ${threadLengths[i]}, ${streetElbow45Wt}, 'BS 143')`,
      ];
    });

    await queryRunner.query(`
			INSERT INTO malleable_iron_fitting_dimensions
				(fitting_type, nominal_bore_mm, pressure_class, center_to_face_mm, thread_length_mm, weight_kg, standard)
			VALUES ${values.join(",\n")}
			ON CONFLICT (fitting_type, nominal_bore_mm, pressure_class) DO NOTHING
		`);
  }

  private async seedClass300(queryRunner: QueryRunner): Promise<void> {
    const nbSizes = [6, 8, 10, 15, 20, 25, 32, 40, 50, 65, 80, 100];
    const threadLengths = [6.5, 8.0, 8.5, 10.0, 11.0, 12.0, 13.5, 14.0, 15.5, 17.5, 19.0, 21.0];

    const elbow90CtF = [18, 21, 24, 27, 32, 38, 44, 48, 57, 67, 76, 95];
    const elbow45CtF = [14, 16, 19, 22, 25, 29, 35, 38, 44, 51, 57, 70];
    const teeCtF = [21, 24, 27, 33, 38, 44, 48, 54, 64, 76, 86, 105];
    const crossCtF = [21, 24, 27, 33, 38, 44, 48, 54, 64, 76, 86, 105];
    const capLen = [16, 19, 22, 25, 29, 32, 38, 41, 48, 54, 60, 73];
    const couplingLen = [27, 29, 32, 35, 38, 44, 48, 51, 57, 64, 70, 83];

    const elbow90Wt300 = [0.05, 0.07, 0.11, 0.17, 0.26, 0.43, 0.71, 0.98, 1.63, 2.72, 3.81, 7.08];
    const elbow45Wt150 = [0.03, 0.05, 0.07, 0.1, 0.16, 0.26, 0.42, 0.59, 0.95, 1.59, 2.22, 4.08];
    const teeWt300 = [0.06, 0.1, 0.15, 0.22, 0.36, 0.6, 0.92, 1.31, 2.13, 3.63, 5.17, 9.25];
    const crossWt300 = [0.07, 0.12, 0.18, 0.27, 0.45, 0.77, 1.2, 1.69, 2.72, 4.67, 6.62, 11.97];
    const capWt300 = [0.02, 0.04, 0.06, 0.08, 0.13, 0.22, 0.32, 0.43, 0.71, 1.09, 1.52, 2.72];
    const couplingWt300 = [0.04, 0.06, 0.08, 0.12, 0.19, 0.3, 0.43, 0.6, 0.92, 1.41, 1.91, 3.27];

    const values = nbSizes.flatMap((nb, i) => {
      const elbow45Wt300 = Math.round(elbow45Wt150[i] * 1.2 * 1000) / 1000;

      return [
        `('ELBOW_90', ${nb}, 300, ${elbow90CtF[i]}, ${threadLengths[i]}, ${elbow90Wt300[i]}, 'BS 143')`,
        `('ELBOW_45', ${nb}, 300, ${elbow45CtF[i]}, ${threadLengths[i]}, ${elbow45Wt300}, 'BS 143')`,
        `('TEE_EQUAL', ${nb}, 300, ${teeCtF[i]}, ${threadLengths[i]}, ${teeWt300[i]}, 'BS 143')`,
        `('CROSS', ${nb}, 300, ${crossCtF[i]}, ${threadLengths[i]}, ${crossWt300[i]}, 'BS 143')`,
        `('CAP', ${nb}, 300, ${capLen[i]}, ${threadLengths[i]}, ${capWt300[i]}, 'BS 143')`,
        `('COUPLING', ${nb}, 300, ${couplingLen[i]}, ${threadLengths[i]}, ${couplingWt300[i]}, 'BS 143')`,
      ];
    });

    await queryRunner.query(`
			INSERT INTO malleable_iron_fitting_dimensions
				(fitting_type, nominal_bore_mm, pressure_class, center_to_face_mm, thread_length_mm, weight_kg, standard)
			VALUES ${values.join(",\n")}
			ON CONFLICT (fitting_type, nominal_bore_mm, pressure_class) DO NOTHING
		`);
  }
}
