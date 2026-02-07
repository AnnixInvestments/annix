import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHigherClassSpectacleBlinds1771100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const class900Data: [
      string,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ][] = [
      ["1/2", 80, 16, 6.4, 4.8, 38, 6.4, 160, 50, 0.27],
      ["3/4", 90, 21, 6.4, 4.8, 41, 6.4, 180, 55, 0.34],
      ["1", 100, 27, 6.4, 4.8, 57, 6.4, 214, 60, 0.43],
      ["1-1/4", 115, 35, 7.9, 6.4, 57, 7.9, 230, 65, 0.68],
      ["1-1/2", 125, 41, 9.7, 7.9, 57, 9.7, 250, 70, 1.02],
      ["2", 165, 55, 12.7, 9.7, 57, 12.7, 330, 75, 2.88],
      ["2-1/2", 190, 64, 14.3, 11.2, 64, 14.3, 380, 80, 4.34],
      ["3", 210, 78, 15.7, 12.7, 70, 15.7, 420, 85, 5.9],
      ["4", 235, 108, 19.1, 15.7, 76, 19.1, 470, 90, 8.48],
      ["5", 265, 135, 22.4, 17.5, 83, 22.4, 530, 95, 13.0],
      ["6", 320, 162, 25.4, 19.1, 86, 25.4, 640, 100, 21.9],
      ["8", 390, 213, 31.8, 25.4, 95, 31.8, 780, 110, 43.5],
      ["10", 460, 267, 38.1, 31.8, 102, 38.1, 920, 120, 72.6],
      ["12", 535, 315, 47.8, 38.1, 105, 47.8, 1070, 130, 117.31],
      ["14", 585, 349, 53.8, 44.5, 114, 53.8, 1170, 140, 159.0],
      ["16", 650, 391, 60.5, 50.8, 127, 60.5, 1300, 150, 218.0],
      ["18", 720, 438, 66.5, 53.8, 133, 66.5, 1440, 160, 288.0],
      ["20", 795, 489, 73.2, 60.5, 140, 73.2, 1590, 170, 378.0],
      ["24", 900, 597, 88.9, 73.2, 152, 88.9, 1800, 190, 579.52],
    ];

    const class1500Data: [
      string,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ][] = [
      ["1/2", 80, 16, 6.4, 4.8, 38, 6.4, 160, 50, 0.28],
      ["3/4", 95, 21, 7.9, 6.4, 44, 7.9, 190, 55, 0.52],
      ["1", 110, 27, 9.7, 7.9, 57, 9.7, 220, 60, 0.86],
      ["1-1/4", 125, 35, 11.2, 9.7, 57, 11.2, 250, 65, 1.22],
      ["1-1/2", 140, 41, 12.7, 9.7, 64, 12.7, 280, 70, 1.72],
      ["2", 165, 53, 12.7, 9.7, 70, 12.7, 330, 75, 2.9],
      ["2-1/2", 190, 64, 17.5, 14.3, 76, 17.5, 380, 80, 5.26],
      ["3", 230, 78, 19.1, 15.7, 76, 19.1, 460, 85, 8.39],
      ["4", 240, 102, 22.4, 17.5, 89, 22.4, 480, 90, 10.47],
      ["5", 290, 127, 28.4, 22.4, 89, 28.4, 580, 95, 19.05],
      ["6", 320, 154, 35.1, 28.4, 89, 35.1, 640, 100, 29.08],
      ["8", 410, 200, 44.5, 35.1, 102, 44.5, 820, 110, 60.78],
      ["10", 495, 248, 53.8, 44.5, 114, 53.8, 990, 120, 108.86],
      ["12", 570, 303, 60.5, 50.8, 114, 60.5, 1140, 130, 169.01],
      ["14", 640, 330, 68.3, 57.2, 127, 68.3, 1280, 140, 243.0],
      ["16", 715, 368, 76.2, 63.5, 133, 76.2, 1430, 150, 331.0],
      ["18", 785, 419, 84.1, 69.9, 140, 84.1, 1570, 160, 441.0],
      ["20", 865, 470, 92.1, 76.2, 152, 92.1, 1730, 170, 571.0],
      ["24", 1015, 559, 107.9, 88.9, 165, 107.9, 2030, 190, 871.0],
    ];

    const class2500Data: [
      string,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ][] = [
      ["1/2", 90, 16, 9.7, 7.9, 38, 9.7, 180, 50, 0.53],
      ["3/4", 105, 21, 11.2, 9.7, 44, 11.2, 210, 55, 0.86],
      ["1", 120, 27, 14.3, 11.2, 57, 14.3, 240, 60, 1.4],
      ["1-1/4", 135, 35, 15.7, 12.7, 64, 15.7, 270, 65, 1.93],
      ["1-1/2", 150, 41, 17.5, 14.3, 70, 17.5, 300, 70, 2.68],
      ["2", 170, 53, 15.7, 12.7, 70, 15.7, 340, 75, 3.75],
      ["2-1/2", 205, 64, 22.4, 17.5, 76, 22.4, 410, 80, 6.89],
      ["3", 240, 78, 28.4, 22.4, 83, 28.4, 480, 85, 12.61],
      ["4", 275, 102, 28.4, 22.4, 89, 28.4, 550, 90, 17.34],
      ["5", 330, 127, 38.1, 31.8, 95, 38.1, 660, 95, 35.38],
      ["6", 380, 154, 47.8, 38.1, 102, 47.8, 760, 100, 59.42],
      ["8", 440, 198, 53.8, 44.5, 102, 53.8, 880, 110, 86.39],
      ["10", 535, 248, 66.5, 53.8, 114, 66.5, 1070, 120, 158.0],
      ["12", 620, 289, 79.2, 63.5, 114, 79.2, 1240, 130, 255.01],
    ];

    const insertSpectacleBlind = async (
      nps: string,
      pressureClass: string,
      odBlind: number,
      odSpacer: number,
      thicknessBlind: number,
      thicknessSpacer: number,
      barWidth: number,
      barThickness: number,
      overallLength: number,
      handleLength: number,
      weightKg: number,
    ) => {
      const existing = await queryRunner.query(
        `SELECT id FROM spectacle_blinds WHERE nps = '${nps}' AND pressure_class = '${pressureClass}'`,
      );
      if (existing.length === 0) {
        await queryRunner.query(`
          INSERT INTO spectacle_blinds (nps, pressure_class, od_blind, od_spacer, thickness_blind, thickness_spacer, bar_width, bar_thickness, overall_length, handle_length, weight_kg)
          VALUES ('${nps}', '${pressureClass}', ${odBlind}, ${odSpacer}, ${thicknessBlind}, ${thicknessSpacer}, ${barWidth}, ${barThickness}, ${overallLength}, ${handleLength}, ${weightKg})
        `);
      }
    };

    for (const [
      nps,
      odBlind,
      bore,
      thicknessBlind,
      thicknessSpacer,
      barWidth,
      barThickness,
      overallLength,
      handleLength,
      weightKg,
    ] of class900Data) {
      await insertSpectacleBlind(
        nps,
        "900",
        odBlind,
        bore,
        thicknessBlind,
        thicknessSpacer,
        barWidth,
        barThickness,
        overallLength,
        handleLength,
        weightKg,
      );
    }

    for (const [
      nps,
      odBlind,
      bore,
      thicknessBlind,
      thicknessSpacer,
      barWidth,
      barThickness,
      overallLength,
      handleLength,
      weightKg,
    ] of class1500Data) {
      await insertSpectacleBlind(
        nps,
        "1500",
        odBlind,
        bore,
        thicknessBlind,
        thicknessSpacer,
        barWidth,
        barThickness,
        overallLength,
        handleLength,
        weightKg,
      );
    }

    for (const [
      nps,
      odBlind,
      bore,
      thicknessBlind,
      thicknessSpacer,
      barWidth,
      barThickness,
      overallLength,
      handleLength,
      weightKg,
    ] of class2500Data) {
      await insertSpectacleBlind(
        nps,
        "2500",
        odBlind,
        bore,
        thicknessBlind,
        thicknessSpacer,
        barWidth,
        barThickness,
        overallLength,
        handleLength,
        weightKg,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM spectacle_blinds WHERE pressure_class IN ('900', '1500', '2500')`,
    );
  }
}
