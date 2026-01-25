import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComprehensivePTRatings1777700000000 implements MigrationInterface {
  name = 'AddComprehensivePTRatings1777700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      'Adding comprehensive P-T ratings for all flange standards...',
    );

    // Helper function to insert P-T rating
    const insertPtRating = async (
      classId: number,
      materialGroup: string,
      tempC: number,
      pressureBar: number,
    ) => {
      await queryRunner.query(
        `
        INSERT INTO flange_pt_ratings (pressure_class_id, material_group, temperature_celsius, max_pressure_bar)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (pressure_class_id, material_group, temperature_celsius)
        DO UPDATE SET max_pressure_bar = $4
      `,
        [classId, materialGroup, tempC, pressureBar],
      );
    };

    // ============================================================
    // PART 1: Add BS 4504 / EN 1092-1 P-T Ratings
    // ============================================================
    const bs4504Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 4504'`,
    );

    if (bs4504Result.length > 0) {
      const standardId = bs4504Result[0].id;
      console.warn('Adding BS 4504 P-T ratings...');

      // Get all BS 4504 pressure classes
      const bs4504Classes = await queryRunner.query(
        `
        SELECT id, designation FROM flange_pressure_classes
        WHERE "standardId" = $1
      `,
        [standardId],
      );

      // Map designations to base PN values
      const designationToPN: Record<string, number> = {};
      for (const cls of bs4504Classes) {
        const match = cls.designation.match(/^(\d+)/);
        if (match) {
          designationToPN[cls.id] = parseInt(match[1], 10);
        }
      }

      // Carbon Steel P-T data based on EN 1092-1 (Material Group 3E0 / 1.0460 / P250GH)
      // Derating factors at different temperatures (percentage of nominal)
      const carbonSteelDerating: [number, number][] = [
        [-29, 1.0],
        [20, 1.0],
        [50, 1.0],
        [100, 0.92],
        [150, 0.95],
        [200, 0.91],
        [250, 0.83],
        [300, 0.76],
        [350, 0.71],
        [400, 0.64],
      ];

      // Stainless Steel 304 (1.4301) P-T data - higher temp capability
      const ss304Derating: [number, number][] = [
        [-29, 1.0],
        [20, 1.0],
        [50, 1.0],
        [100, 1.0],
        [150, 0.97],
        [200, 0.93],
        [250, 0.88],
        [300, 0.84],
        [350, 0.8],
        [400, 0.76],
        [450, 0.69],
        [500, 0.6],
      ];

      // Stainless Steel 316 (1.4401) P-T data - similar to 304 but slightly better at high temp
      const ss316Derating: [number, number][] = [
        [-29, 1.0],
        [20, 1.0],
        [50, 1.0],
        [100, 1.0],
        [150, 0.98],
        [200, 0.94],
        [250, 0.9],
        [300, 0.86],
        [350, 0.82],
        [400, 0.78],
        [450, 0.72],
        [500, 0.64],
      ];

      // Insert P-T data for each class
      for (const cls of bs4504Classes) {
        const basePN = designationToPN[cls.id];
        if (!basePN) continue;

        // Carbon Steel
        for (const [temp, factor] of carbonSteelDerating) {
          await insertPtRating(
            cls.id,
            'Carbon Steel',
            temp,
            Math.round(basePN * factor * 10) / 10,
          );
        }

        // Carbon Steel A105 (Group 1.1) - same as Carbon Steel
        for (const [temp, factor] of carbonSteelDerating) {
          await insertPtRating(
            cls.id,
            'Carbon Steel A105 (Group 1.1)',
            temp,
            Math.round(basePN * factor * 10) / 10,
          );
        }

        // Stainless Steel 304
        for (const [temp, factor] of ss304Derating) {
          await insertPtRating(
            cls.id,
            'Stainless Steel 304 (Group 2.1)',
            temp,
            Math.round(basePN * factor * 10) / 10,
          );
        }

        // Stainless Steel 316
        for (const [temp, factor] of ss316Derating) {
          await insertPtRating(
            cls.id,
            'Stainless Steel 316 (Group 2.2)',
            temp,
            Math.round(basePN * factor * 10) / 10,
          );
        }
      }

      console.warn(
        `Added P-T ratings for ${bs4504Classes.length} BS 4504 pressure classes`,
      );
    }

    // ============================================================
    // PART 2: Copy P-T data for SABS 1123 flange type variants
    // ============================================================
    const sabs1123Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'SABS 1123'`,
    );

    if (sabs1123Result.length > 0) {
      const standardId = sabs1123Result[0].id;
      console.warn('Copying P-T data for SABS 1123 flange type variants...');

      // Get all SABS 1123 pressure classes
      const sabsClasses = await queryRunner.query(
        `
        SELECT id, designation FROM flange_pressure_classes
        WHERE "standardId" = $1
      `,
        [standardId],
      );

      // Group classes by base pressure (600, 1000, 1600, 2500, 4000)
      const classesByBase: Record<
        string,
        { id: number; designation: string }[]
      > = {};
      for (const cls of sabsClasses) {
        const match = cls.designation.match(/^(\d+)/);
        if (match) {
          const base = match[1];
          if (!classesByBase[base]) classesByBase[base] = [];
          classesByBase[base].push(cls);
        }
      }

      // For each base pressure, find a class that has P-T data and copy to others
      for (const [base, classes] of Object.entries(classesByBase)) {
        // Find a class with P-T data (usually /3)
        let sourceClassId: number | null = null;
        for (const cls of classes) {
          const hasData = await queryRunner.query(
            `
            SELECT COUNT(*) as count FROM flange_pt_ratings WHERE pressure_class_id = $1
          `,
            [cls.id],
          );
          if (parseInt(hasData[0].count, 10) > 0) {
            sourceClassId = cls.id;
            break;
          }
        }

        if (sourceClassId) {
          // Get all P-T data from source class
          const ptData = await queryRunner.query(
            `
            SELECT material_group, temperature_celsius, max_pressure_bar
            FROM flange_pt_ratings WHERE pressure_class_id = $1
          `,
            [sourceClassId],
          );

          // Copy to all other classes with same base pressure
          for (const cls of classes) {
            if (cls.id === sourceClassId) continue;
            for (const pt of ptData) {
              await insertPtRating(
                cls.id,
                pt.material_group,
                pt.temperature_celsius,
                pt.max_pressure_bar,
              );
            }
          }
          console.warn(
            `Copied P-T data from SABS ${base}/3 to ${classes.length - 1} variants`,
          );
        } else {
          // No source data - need to add base P-T data
          const basePressure = parseInt(base, 10) / 100; // 600 kPa = 6 bar, etc.
          const carbonSteelDerating: [number, number][] = [
            [-10, 1.0],
            [20, 1.0],
            [50, 1.0],
            [100, 1.0],
            [150, 0.93],
            [200, 0.85],
          ];

          for (const cls of classes) {
            for (const [temp, factor] of carbonSteelDerating) {
              await insertPtRating(
                cls.id,
                'Carbon Steel',
                temp,
                Math.round(basePressure * factor * 10) / 10,
              );
            }
          }
          console.warn(
            `Added base P-T data for SABS ${base} (${classes.length} classes)`,
          );
        }
      }
    }

    // ============================================================
    // PART 3: Copy P-T data for ASME B16.5 flange type variants
    // ============================================================
    const asmeB165Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.5'`,
    );

    if (asmeB165Result.length > 0) {
      const standardId = asmeB165Result[0].id;
      console.warn('Copying P-T data for ASME B16.5 flange type variants...');

      // Get all ASME B16.5 pressure classes
      const asmeClasses = await queryRunner.query(
        `
        SELECT id, designation FROM flange_pressure_classes
        WHERE "standardId" = $1
      `,
        [standardId],
      );

      // Group classes by base class (150, 300, 400, 600, 900, 1500, 2500)
      const classesByBase: Record<
        string,
        { id: number; designation: string }[]
      > = {};
      for (const cls of asmeClasses) {
        const match = cls.designation.match(/^(\d+)/);
        if (match) {
          const base = match[1];
          if (!classesByBase[base]) classesByBase[base] = [];
          classesByBase[base].push(cls);
        }
      }

      // For each base class, find a class that has P-T data and copy to others
      for (const [base, classes] of Object.entries(classesByBase)) {
        // Find a class with P-T data (usually the base without suffix)
        let sourceClassId: number | null = null;
        let sourceDesignation: string | null = null;

        // Prefer the base class without suffix
        const baseClass = classes.find((c) => c.designation === base);
        if (baseClass) {
          const hasData = await queryRunner.query(
            `
            SELECT COUNT(*) as count FROM flange_pt_ratings WHERE pressure_class_id = $1
          `,
            [baseClass.id],
          );
          if (parseInt(hasData[0].count, 10) > 0) {
            sourceClassId = baseClass.id;
            sourceDesignation = baseClass.designation;
          }
        }

        // If base class has no data, try others
        if (!sourceClassId) {
          for (const cls of classes) {
            const hasData = await queryRunner.query(
              `
              SELECT COUNT(*) as count FROM flange_pt_ratings WHERE pressure_class_id = $1
            `,
              [cls.id],
            );
            if (parseInt(hasData[0].count, 10) > 0) {
              sourceClassId = cls.id;
              sourceDesignation = cls.designation;
              break;
            }
          }
        }

        if (sourceClassId) {
          // Get all P-T data from source class
          const ptData = await queryRunner.query(
            `
            SELECT material_group, temperature_celsius, max_pressure_bar
            FROM flange_pt_ratings WHERE pressure_class_id = $1
          `,
            [sourceClassId],
          );

          // Copy to all other classes with same base
          let copiedCount = 0;
          for (const cls of classes) {
            if (cls.id === sourceClassId) continue;

            // Check if target already has data
            const hasData = await queryRunner.query(
              `
              SELECT COUNT(*) as count FROM flange_pt_ratings WHERE pressure_class_id = $1
            `,
              [cls.id],
            );

            if (parseInt(hasData[0].count, 10) === 0) {
              for (const pt of ptData) {
                await insertPtRating(
                  cls.id,
                  pt.material_group,
                  pt.temperature_celsius,
                  pt.max_pressure_bar,
                );
              }
              copiedCount++;
            }
          }
          if (copiedCount > 0) {
            console.warn(
              `Copied P-T data from ASME ${sourceDesignation} to ${copiedCount} variants`,
            );
          }
        }
      }
    }

    // ============================================================
    // PART 4: Add P-T data for ASME B16.47A and B16.47B if missing
    // ============================================================
    for (const stdCode of ['ASME B16.47A', 'ASME B16.47B']) {
      const stdResult = await queryRunner.query(
        `SELECT id FROM flange_standards WHERE code = $1`,
        [stdCode],
      );

      if (stdResult.length > 0) {
        const standardId = stdResult[0].id;

        // Get classes without P-T data
        const missingClasses = await queryRunner.query(
          `
          SELECT fpc.id, fpc.designation
          FROM flange_pressure_classes fpc
          WHERE fpc."standardId" = $1
          AND NOT EXISTS (
            SELECT 1 FROM flange_pt_ratings fpr WHERE fpr.pressure_class_id = fpc.id
          )
        `,
          [standardId],
        );

        if (missingClasses.length > 0) {
          console.warn(
            `Adding P-T data for ${missingClasses.length} ${stdCode} classes...`,
          );

          // Use ASME B16.5 derating factors
          const asmeDerating: Record<number, [number, number][]> = {
            150: [
              [-29, 19.6],
              [38, 19.6],
              [93, 18.0],
              [149, 15.8],
              [204, 13.8],
              [260, 12.1],
              [316, 10.2],
              [343, 8.8],
              [371, 7.4],
              [399, 6.1],
              [427, 4.9],
              [454, 3.9],
            ],
            300: [
              [-29, 51.1],
              [38, 51.1],
              [93, 47.6],
              [149, 45.1],
              [204, 42.1],
              [260, 37.2],
              [316, 32.7],
              [343, 28.1],
              [371, 23.8],
              [399, 19.6],
              [427, 15.7],
              [454, 12.4],
            ],
            600: [
              [-29, 102.1],
              [38, 102.1],
              [93, 95.1],
              [149, 90.2],
              [204, 84.1],
              [260, 74.5],
              [316, 65.5],
              [343, 56.2],
              [371, 47.6],
              [399, 39.3],
              [427, 31.4],
              [454, 24.8],
            ],
            900: [
              [-29, 153.2],
              [38, 153.2],
              [93, 142.7],
              [149, 135.4],
              [204, 126.2],
              [260, 111.7],
              [316, 98.2],
              [343, 84.3],
              [371, 71.4],
              [399, 58.9],
              [427, 47.1],
              [454, 37.2],
            ],
          };

          for (const cls of missingClasses) {
            const classNum = parseInt(cls.designation, 10);
            const data = asmeDerating[classNum];
            if (data) {
              for (const [temp, pressure] of data) {
                await insertPtRating(
                  cls.id,
                  'Carbon Steel A105 (Group 1.1)',
                  temp,
                  pressure,
                );
              }
            }
          }
        }
      }
    }

    console.warn('Comprehensive P-T rating update complete.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: This migration adds/updates P-T data. Reverting would require
    // tracking exactly what was added vs updated, which is complex.
    // For safety, we only remove BS 4504 data (which had 0 entries before).

    const bs4504Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 4504'`,
    );

    if (bs4504Result.length > 0) {
      const standardId = bs4504Result[0].id;
      await queryRunner.query(
        `
        DELETE FROM flange_pt_ratings
        WHERE pressure_class_id IN (
          SELECT id FROM flange_pressure_classes WHERE "standardId" = $1
        )
      `,
        [standardId],
      );
    }
  }
}
