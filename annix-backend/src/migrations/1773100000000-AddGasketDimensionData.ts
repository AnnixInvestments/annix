import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGasketDimensionData1773100000000 implements MigrationInterface {
  name = "AddGasketDimensionData1773100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding gasket dimension data...");

    await queryRunner.query(`
      ALTER TABLE gasket_weights
      ADD COLUMN IF NOT EXISTS "inner_diameter_mm" float,
      ADD COLUMN IF NOT EXISTS "outer_diameter_mm" float,
      ADD COLUMN IF NOT EXISTS "thickness_mm" float,
      ADD COLUMN IF NOT EXISTS "flange_standard" varchar(50),
      ADD COLUMN IF NOT EXISTS "pressure_class" varchar(50),
      ADD COLUMN IF NOT EXISTS "material" varchar(100)
    `);

    const asmeB165Gaskets = [
      { nb: 15, class: "150", id: 21.3, od: 34.9, t: 1.5 },
      { nb: 20, class: "150", id: 26.9, od: 42.9, t: 1.5 },
      { nb: 25, class: "150", id: 33.4, od: 50.8, t: 1.5 },
      { nb: 32, class: "150", id: 42.2, od: 63.5, t: 1.5 },
      { nb: 40, class: "150", id: 48.3, od: 73.0, t: 1.5 },
      { nb: 50, class: "150", id: 60.3, od: 92.1, t: 1.5 },
      { nb: 65, class: "150", id: 73.0, od: 104.8, t: 1.5 },
      { nb: 80, class: "150", id: 88.9, od: 127.0, t: 1.5 },
      { nb: 100, class: "150", id: 114.3, od: 157.2, t: 1.5 },
      { nb: 125, class: "150", id: 141.3, od: 185.7, t: 3.2 },
      { nb: 150, class: "150", id: 168.3, od: 215.9, t: 3.2 },
      { nb: 200, class: "150", id: 219.1, od: 269.9, t: 3.2 },
      { nb: 250, class: "150", id: 273.1, od: 323.8, t: 3.2 },
      { nb: 300, class: "150", id: 323.9, od: 381.0, t: 3.2 },
      { nb: 350, class: "150", id: 355.6, od: 412.8, t: 3.2 },
      { nb: 400, class: "150", id: 406.4, od: 469.9, t: 3.2 },
      { nb: 450, class: "150", id: 457.2, od: 533.4, t: 3.2 },
      { nb: 500, class: "150", id: 508.0, od: 584.2, t: 3.2 },
      { nb: 600, class: "150", id: 609.6, od: 692.2, t: 3.2 },
      { nb: 15, class: "300", id: 21.3, od: 38.1, t: 1.5 },
      { nb: 20, class: "300", id: 26.9, od: 47.6, t: 1.5 },
      { nb: 25, class: "300", id: 33.4, od: 54.0, t: 1.5 },
      { nb: 32, class: "300", id: 42.2, od: 63.5, t: 1.5 },
      { nb: 40, class: "300", id: 48.3, od: 73.0, t: 1.5 },
      { nb: 50, class: "300", id: 60.3, od: 92.1, t: 1.5 },
      { nb: 65, class: "300", id: 73.0, od: 104.8, t: 1.5 },
      { nb: 80, class: "300", id: 88.9, od: 127.0, t: 1.5 },
      { nb: 100, class: "300", id: 114.3, od: 157.2, t: 3.2 },
      { nb: 125, class: "300", id: 141.3, od: 185.7, t: 3.2 },
      { nb: 150, class: "300", id: 168.3, od: 215.9, t: 3.2 },
      { nb: 200, class: "300", id: 219.1, od: 269.9, t: 3.2 },
      { nb: 250, class: "300", id: 273.1, od: 330.2, t: 3.2 },
      { nb: 300, class: "300", id: 323.9, od: 387.4, t: 3.2 },
      { nb: 350, class: "300", id: 355.6, od: 431.8, t: 3.2 },
      { nb: 400, class: "300", id: 406.4, od: 482.6, t: 3.2 },
      { nb: 450, class: "300", id: 457.2, od: 546.1, t: 3.2 },
      { nb: 500, class: "300", id: 508.0, od: 596.9, t: 3.2 },
      { nb: 600, class: "300", id: 609.6, od: 711.2, t: 3.2 },
      { nb: 15, class: "600", id: 21.3, od: 38.1, t: 1.5 },
      { nb: 20, class: "600", id: 26.9, od: 47.6, t: 1.5 },
      { nb: 25, class: "600", id: 33.4, od: 54.0, t: 1.5 },
      { nb: 32, class: "600", id: 42.2, od: 63.5, t: 1.5 },
      { nb: 40, class: "600", id: 48.3, od: 73.0, t: 1.5 },
      { nb: 50, class: "600", id: 60.3, od: 92.1, t: 1.5 },
      { nb: 65, class: "600", id: 73.0, od: 108.0, t: 1.5 },
      { nb: 80, class: "600", id: 88.9, od: 130.2, t: 1.5 },
      { nb: 100, class: "600", id: 114.3, od: 162.0, t: 3.2 },
      { nb: 125, class: "600", id: 141.3, od: 190.5, t: 3.2 },
      { nb: 150, class: "600", id: 168.3, od: 222.3, t: 3.2 },
      { nb: 200, class: "600", id: 219.1, od: 282.6, t: 3.2 },
      { nb: 250, class: "600", id: 273.1, od: 344.4, t: 3.2 },
      { nb: 300, class: "600", id: 323.9, od: 400.1, t: 3.2 },
      { nb: 350, class: "600", id: 355.6, od: 444.5, t: 3.2 },
      { nb: 400, class: "600", id: 406.4, od: 508.0, t: 3.2 },
      { nb: 450, class: "600", id: 457.2, od: 558.8, t: 3.2 },
      { nb: 500, class: "600", id: 508.0, od: 622.3, t: 3.2 },
      { nb: 600, class: "600", id: 609.6, od: 749.3, t: 3.2 },
    ];

    const gasketTypes = [
      { type: "SPIRAL_WOUND", material: "SS316/Graphite", density: 4.0 },
      { type: "RING_JOINT", material: "SS316", density: 7.9 },
      { type: "PTFE", material: "PTFE", density: 2.2 },
      { type: "GRAPHITE", material: "Flexible Graphite", density: 1.7 },
      { type: "CAF", material: "Compressed Asbestos Free", density: 1.8 },
      { type: "RUBBER", material: "Neoprene", density: 1.3 },
    ];

    for (const gasket of asmeB165Gaskets) {
      for (const gt of gasketTypes) {
        const area = (Math.PI * ((gasket.od / 2) ** 2 - (gasket.id / 2) ** 2)) / 1000000;
        const volume = area * (gasket.t / 1000);
        const weightKg = volume * gt.density * 1000;

        await queryRunner.query(
          `
          INSERT INTO gasket_weights (
            gasket_type, nominal_bore_mm, weight_kg,
            inner_diameter_mm, outer_diameter_mm, thickness_mm,
            flange_standard, pressure_class, material
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT DO NOTHING
        `,
          [
            gt.type,
            gasket.nb,
            Math.round(weightKg * 1000) / 1000,
            gasket.id,
            gasket.od,
            gasket.t,
            "ASME B16.5",
            gasket.class,
            gt.material,
          ],
        );
      }
    }

    const bs4504Gaskets = [
      { nb: 15, class: "PN16", id: 21.3, od: 40.0, t: 2.0 },
      { nb: 20, class: "PN16", id: 26.9, od: 50.0, t: 2.0 },
      { nb: 25, class: "PN16", id: 33.7, od: 60.0, t: 2.0 },
      { nb: 32, class: "PN16", id: 42.4, od: 70.0, t: 2.0 },
      { nb: 40, class: "PN16", id: 48.3, od: 80.0, t: 2.0 },
      { nb: 50, class: "PN16", id: 60.3, od: 90.0, t: 2.0 },
      { nb: 65, class: "PN16", id: 76.1, od: 110.0, t: 2.0 },
      { nb: 80, class: "PN16", id: 88.9, od: 128.0, t: 2.0 },
      { nb: 100, class: "PN16", id: 114.3, od: 158.0, t: 2.0 },
      { nb: 125, class: "PN16", id: 139.7, od: 188.0, t: 3.0 },
      { nb: 150, class: "PN16", id: 168.3, od: 212.0, t: 3.0 },
      { nb: 200, class: "PN16", id: 219.1, od: 268.0, t: 3.0 },
      { nb: 250, class: "PN16", id: 273.0, od: 320.0, t: 3.0 },
      { nb: 300, class: "PN16", id: 323.9, od: 370.0, t: 3.0 },
      { nb: 350, class: "PN16", id: 355.6, od: 430.0, t: 3.0 },
      { nb: 400, class: "PN16", id: 406.4, od: 482.0, t: 3.0 },
      { nb: 450, class: "PN16", id: 457.0, od: 532.0, t: 3.0 },
      { nb: 500, class: "PN16", id: 508.0, od: 585.0, t: 3.0 },
      { nb: 600, class: "PN16", id: 610.0, od: 685.0, t: 3.0 },
    ];

    for (const gasket of bs4504Gaskets) {
      for (const gt of gasketTypes) {
        const area = (Math.PI * ((gasket.od / 2) ** 2 - (gasket.id / 2) ** 2)) / 1000000;
        const volume = area * (gasket.t / 1000);
        const weightKg = volume * gt.density * 1000;

        await queryRunner.query(
          `
          INSERT INTO gasket_weights (
            gasket_type, nominal_bore_mm, weight_kg,
            inner_diameter_mm, outer_diameter_mm, thickness_mm,
            flange_standard, pressure_class, material
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT DO NOTHING
        `,
          [
            gt.type,
            gasket.nb,
            Math.round(weightKg * 1000) / 1000,
            gasket.id,
            gasket.od,
            gasket.t,
            "BS 4504",
            gasket.class,
            gt.material,
          ],
        );
      }
    }

    console.warn("Gasket dimension data added successfully.");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM gasket_weights WHERE flange_standard IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE gasket_weights
      DROP COLUMN IF EXISTS "inner_diameter_mm",
      DROP COLUMN IF EXISTS "outer_diameter_mm",
      DROP COLUMN IF EXISTS "thickness_mm",
      DROP COLUMN IF EXISTS "flange_standard",
      DROP COLUMN IF EXISTS "pressure_class",
      DROP COLUMN IF EXISTS "material"
    `);
  }
}
