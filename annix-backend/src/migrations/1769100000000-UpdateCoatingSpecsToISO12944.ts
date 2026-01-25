import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCoatingSpecsToISO129441769100000000 implements MigrationInterface {
  name = 'UpdateCoatingSpecsToISO129441769100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to coating_specifications
    await queryRunner.query(`
      ALTER TABLE "coating_specifications"
      ADD COLUMN IF NOT EXISTS "system_code" VARCHAR,
      ADD COLUMN IF NOT EXISTS "binder_type" VARCHAR,
      ADD COLUMN IF NOT EXISTS "primer_type" VARCHAR,
      ADD COLUMN IF NOT EXISTS "primer_ndft_um" VARCHAR,
      ADD COLUMN IF NOT EXISTS "subsequent_binder" VARCHAR,
      ADD COLUMN IF NOT EXISTS "supported_durabilities" VARCHAR,
      ADD COLUMN IF NOT EXISTS "is_recommended" BOOLEAN DEFAULT false
    `);

    // Get environment IDs for ISO 12944 categories
    const environments = await queryRunner.query(`
      SELECT ce.id, ce.category
      FROM coating_environments ce
      JOIN coating_standards cs ON ce.standard_id = cs.id
      WHERE cs.code = 'ISO 12944'
    `);

    const envMap: { [key: string]: number } = {};
    for (const env of environments) {
      envMap[env.category] = env.id;
    }

    // Delete old external specs for C1-C5 (keep internal specs)
    for (const category of ['C1', 'C2', 'C3', 'C4', 'C5']) {
      if (envMap[category]) {
        await queryRunner.query(
          `DELETE FROM coating_specifications WHERE environment_id = $1 AND coating_type = 'external'`,
          [envMap[category]],
        );
      }
    }

    // C1: Any system for higher category may be used, but we'll add a reference entry
    if (envMap['C1']) {
      await queryRunner.query(
        `
        INSERT INTO coating_specifications
        (environment_id, coating_type, lifespan, system, coats, total_dft_um_range, applications, system_code, binder_type, primer_type, primer_ndft_um, subsequent_binder, supported_durabilities, is_recommended)
        VALUES
        ($1, 'external', 'All', 'For C1, any system used for a higher corrosivity category (preferably C2) may be used', '1-2', '80-200', 'Heated buildings with clean atmospheres, offices, schools, hotels', 'C1.ref', 'Any', 'Any', 'Per C2', 'Per C2', 'L,M,H,VH', true)
      `,
        [envMap['C1']],
      );
    }

    // C2 Paint Systems - ISO 12944-5:2018(E) Table C.2
    if (envMap['C2']) {
      const c2Systems = [
        // system_code, binder_type, primer_type, primer_ndft, subsequent_binder, coats, total_ndft, durabilities, is_recommended, system_desc
        [
          'C2.01',
          'AK, AY',
          'Misc.',
          '40-80',
          'AK, AY',
          '1-2',
          '80',
          'L',
          false,
          'Alkyd/Acrylic primer + Alkyd/Acrylic finish',
        ],
        [
          'C2.02',
          'AK, AY',
          'Misc.',
          '40-100',
          'AK, AY',
          '1-2',
          '100',
          'L,M',
          false,
          'Alkyd/Acrylic primer + Alkyd/Acrylic finish',
        ],
        [
          'C2.03',
          'AK, AY',
          'Misc.',
          '60-160',
          'AK, AY',
          '1-2',
          '160',
          'L,M,H',
          false,
          'Alkyd/Acrylic primer + Alkyd/Acrylic finish',
        ],
        [
          'C2.04',
          'AK, AY',
          'Misc.',
          '60-80',
          'AK, AY',
          '2-3',
          '200',
          'L,M,H,VH',
          true,
          'Alkyd/Acrylic primer + Alkyd/Acrylic intermediate + finish',
        ],
        [
          'C2.05',
          'EP, PUR, ESI',
          'Misc.',
          '60-120',
          'EP, PUR, AY',
          '1-2',
          '120',
          'L,M,H',
          false,
          'Epoxy/PUR/ESI primer + Epoxy/PUR/Acrylic finish',
        ],
        [
          'C2.06',
          'EP, PUR, ESI',
          'Misc.',
          '80-100',
          'EP, PUR, AY',
          '2',
          '180',
          'L,M,H,VH',
          false,
          'Epoxy/PUR/ESI primer + Epoxy/PUR/Acrylic finish',
        ],
        [
          'C2.07',
          'EP, PUR, ESI',
          'Zn (R)',
          '60',
          '—',
          '1',
          '60',
          'L,M,H',
          false,
          'Zinc-rich primer only (no topcoat)',
        ],
        [
          'C2.08',
          'EP, PUR, ESI',
          'Zn (R)',
          '60-80',
          'EP, PUR, AY',
          '2',
          '160',
          'L,M,H,VH',
          false,
          'Zinc-rich primer + Epoxy/PUR/Acrylic topcoat',
        ],
      ];

      for (const sys of c2Systems) {
        await queryRunner.query(
          `
          INSERT INTO coating_specifications
          (environment_id, coating_type, lifespan, system, coats, total_dft_um_range, applications, system_code, binder_type, primer_type, primer_ndft_um, subsequent_binder, supported_durabilities, is_recommended)
          VALUES ($1, 'external', 'Per system', $2, $3, $4, 'Rural areas, unheated buildings with low pollution', $5, $6, $7, $8, $9, $10, $11)
        `,
          [
            envMap['C2'],
            sys[9],
            sys[5],
            sys[6],
            sys[0],
            sys[1],
            sys[2],
            sys[3],
            sys[4],
            sys[7],
            sys[8],
          ],
        );
      }
    }

    // C3 Paint Systems - ISO 12944-5:2018(E) Table C.3
    if (envMap['C3']) {
      const c3Systems = [
        [
          'C3.01',
          'AK, AY',
          'Misc.',
          '80-100',
          'AK, AY',
          '1-2',
          '100',
          'L',
          false,
          'Alkyd/Acrylic primer + Alkyd/Acrylic finish',
        ],
        [
          'C3.02',
          'AK, AY',
          'Misc.',
          '60-160',
          'AK, AY',
          '1-2',
          '160',
          'L,M',
          false,
          'Alkyd/Acrylic primer + Alkyd/Acrylic finish',
        ],
        [
          'C3.03',
          'AK, AY',
          'Misc.',
          '60-80',
          'AK, AY',
          '2-3',
          '200',
          'L,M,H',
          false,
          'Alkyd/Acrylic primer + Alkyd/Acrylic intermediate + finish',
        ],
        [
          'C3.04',
          'AK, AY',
          'Misc.',
          '60-80',
          'AK, AY',
          '2-4',
          '260',
          'L,M,H,VH',
          false,
          'Alkyd/Acrylic primer + multiple Alkyd/Acrylic coats',
        ],
        [
          'C3.05',
          'EP, PUR, ESI',
          'Misc.',
          '80-120',
          'EP, PUR, AY',
          '1-2',
          '120',
          'L,M',
          false,
          'Epoxy/PUR/ESI primer + Epoxy/PUR/Acrylic finish',
        ],
        [
          'C3.06',
          'EP, PUR, ESI',
          'Misc.',
          '80-160',
          'EP, PUR, AY',
          '2',
          '180',
          'L,M,H',
          false,
          'Epoxy/PUR/ESI primer + Epoxy/PUR/Acrylic finish',
        ],
        [
          'C3.07',
          'EP, PUR, ESI',
          'Misc.',
          '80-160',
          'EP, PUR, AY',
          '2-3',
          '240',
          'L,M,H,VH',
          true,
          'Epoxy/PUR/ESI primer + Epoxy/PUR/Acrylic intermediate + finish',
        ],
        [
          'C3.08',
          'EP, PUR, ESI',
          'Zn (R)',
          '60',
          '—',
          '1',
          '60',
          'L,M',
          false,
          'Zinc-rich primer only (no topcoat)',
        ],
        [
          'C3.09',
          'EP, PUR, ESI',
          'Zn (R)',
          '60-80',
          'EP, PUR, AY',
          '2',
          '160',
          'L,M,H',
          false,
          'Zinc-rich primer + Epoxy/PUR/Acrylic topcoat',
        ],
        [
          'C3.10',
          'EP, PUR, ESI',
          'Zn (R)',
          '60-80',
          'EP, PUR, AY',
          '2-3',
          '200',
          'L,M,H,VH',
          false,
          'Zinc-rich primer + Epoxy/PUR/Acrylic intermediate + finish',
        ],
      ];

      for (const sys of c3Systems) {
        await queryRunner.query(
          `
          INSERT INTO coating_specifications
          (environment_id, coating_type, lifespan, system, coats, total_dft_um_range, applications, system_code, binder_type, primer_type, primer_ndft_um, subsequent_binder, supported_durabilities, is_recommended)
          VALUES ($1, 'external', 'Per system', $2, $3, $4, 'Urban/industrial areas, coastal with low salinity', $5, $6, $7, $8, $9, $10, $11)
        `,
          [
            envMap['C3'],
            sys[9],
            sys[5],
            sys[6],
            sys[0],
            sys[1],
            sys[2],
            sys[3],
            sys[4],
            sys[7],
            sys[8],
          ],
        );
      }
    }

    // C4 Paint Systems - ISO 12944-5:2018(E) Table C.4
    if (envMap['C4']) {
      const c4Systems = [
        [
          'C4.01',
          'AK, AY',
          'Misc.',
          '60-160',
          'AK, AY',
          '1-2',
          '160',
          'L',
          false,
          'Alkyd/Acrylic primer + Alkyd/Acrylic finish',
        ],
        [
          'C4.02',
          'AK, AY',
          'Misc.',
          '60-80',
          'AK, AY',
          '2-3',
          '200',
          'L,M',
          false,
          'Alkyd/Acrylic primer + Alkyd/Acrylic intermediate + finish',
        ],
        [
          'C4.03',
          'AK, AY',
          'Misc.',
          '60-80',
          'AK, AY',
          '2-4',
          '260',
          'L,M,H',
          false,
          'Alkyd/Acrylic primer + multiple Alkyd/Acrylic coats',
        ],
        [
          'C4.04',
          'EP, PUR, ESI',
          'Misc.',
          '80-120',
          'EP, PUR, AY',
          '1-2',
          '120',
          'L',
          false,
          'Epoxy/PUR/ESI primer + Epoxy/PUR/Acrylic finish',
        ],
        [
          'C4.05',
          'EP, PUR, ESI',
          'Misc.',
          '80-160',
          'EP, PUR, AY',
          '2',
          '180',
          'L,M',
          false,
          'Epoxy/PUR/ESI primer + Epoxy/PUR/Acrylic finish',
        ],
        [
          'C4.06',
          'EP, PUR, ESI',
          'Misc.',
          '80-160',
          'EP, PUR, AY',
          '2-3',
          '240',
          'L,M,H',
          false,
          'Epoxy/PUR/ESI primer + Epoxy/PUR/Acrylic intermediate + finish',
        ],
        [
          'C4.07',
          'EP, PUR, ESI',
          'Misc.',
          '80-240',
          'EP, PUR, AY',
          '2-4',
          '300',
          'L,M,H,VH',
          true,
          'Epoxy/PUR/ESI primer + multiple Epoxy/PUR/Acrylic coats',
        ],
        [
          'C4.08',
          'EP, PUR, ESI',
          'Zn (R)',
          '60',
          '—',
          '1',
          '60',
          'L',
          false,
          'Zinc-rich primer only (no topcoat)',
        ],
        [
          'C4.09',
          'EP, PUR, ESI',
          'Zn (R)',
          '60-80',
          'EP, PUR, AY',
          '2',
          '160',
          'L,M',
          false,
          'Zinc-rich primer + Epoxy/PUR/Acrylic topcoat',
        ],
        [
          'C4.10',
          'EP, PUR, ESI',
          'Zn (R)',
          '60-80',
          'EP, PUR, AY',
          '2-3',
          '200',
          'L,M,H',
          false,
          'Zinc-rich primer + Epoxy/PUR/Acrylic intermediate + finish',
        ],
        [
          'C4.11',
          'EP, PUR, ESI',
          'Zn (R)',
          '60-80',
          'EP, PUR, AY',
          '3-4',
          '260',
          'L,M,H,VH',
          false,
          'Zinc-rich primer + multiple Epoxy/PUR/Acrylic coats',
        ],
      ];

      for (const sys of c4Systems) {
        await queryRunner.query(
          `
          INSERT INTO coating_specifications
          (environment_id, coating_type, lifespan, system, coats, total_dft_um_range, applications, system_code, binder_type, primer_type, primer_ndft_um, subsequent_binder, supported_durabilities, is_recommended)
          VALUES ($1, 'external', 'Per system', $2, $3, $4, 'Industrial areas, coastal with moderate salinity', $5, $6, $7, $8, $9, $10, $11)
        `,
          [
            envMap['C4'],
            sys[9],
            sys[5],
            sys[6],
            sys[0],
            sys[1],
            sys[2],
            sys[3],
            sys[4],
            sys[7],
            sys[8],
          ],
        );
      }
    }

    // C5 Paint Systems - ISO 12944-5:2018(E) Table C.5
    if (envMap['C5']) {
      const c5Systems = [
        [
          'C5.01',
          'EP, PUR, ESI',
          'Misc.',
          '80-160',
          'EP, PUR, AY',
          '2',
          '180',
          'L',
          false,
          'Epoxy/PUR/ESI primer + Epoxy/PUR/Acrylic finish',
        ],
        [
          'C5.02',
          'EP, PUR, ESI',
          'Misc.',
          '80-160',
          'EP, PUR, AY',
          '2-3',
          '240',
          'L,M',
          false,
          'Epoxy/PUR/ESI primer + Epoxy/PUR/Acrylic intermediate + finish',
        ],
        [
          'C5.03',
          'EP, PUR, ESI',
          'Misc.',
          '80-240',
          'EP, PUR, AY',
          '2-4',
          '300',
          'L,M,H',
          false,
          'Epoxy/PUR/ESI primer + multiple Epoxy/PUR/Acrylic coats',
        ],
        [
          'C5.04',
          'EP, PUR, ESI',
          'Misc.',
          '80-200',
          'EP, PUR, AY',
          '3-4',
          '360',
          'L,M,H,VH',
          true,
          'Epoxy/PUR/ESI primer + multiple Epoxy/PUR/Acrylic coats',
        ],
        [
          'C5.05',
          'EP, PUR, ESI',
          'Zn (R)',
          '60-80',
          'EP, PUR, AY',
          '2',
          '160',
          'L',
          false,
          'Zinc-rich primer + Epoxy/PUR/Acrylic topcoat',
        ],
        [
          'C5.06',
          'EP, PUR, ESI',
          'Zn (R)',
          '60-80',
          'EP, PUR, AY',
          '2-3',
          '200',
          'L,M',
          false,
          'Zinc-rich primer + Epoxy/PUR/Acrylic intermediate + finish',
        ],
        [
          'C5.07',
          'EP, PUR, ESI',
          'Zn (R)',
          '60-80',
          'EP, PUR, AY',
          '3-4',
          '260',
          'L,M,H',
          false,
          'Zinc-rich primer + multiple Epoxy/PUR/Acrylic coats',
        ],
        [
          'C5.08',
          'EP, PUR, ESI',
          'Zn (R)',
          '60-80',
          'EP, PUR, AY',
          '3-4',
          '320',
          'L,M,H,VH',
          false,
          'Zinc-rich primer + multiple Epoxy/PUR/Acrylic coats',
        ],
      ];

      for (const sys of c5Systems) {
        await queryRunner.query(
          `
          INSERT INTO coating_specifications
          (environment_id, coating_type, lifespan, system, coats, total_dft_um_range, applications, system_code, binder_type, primer_type, primer_ndft_um, subsequent_binder, supported_durabilities, is_recommended)
          VALUES ($1, 'external', 'Per system', $2, $3, $4, 'Aggressive industrial, high-salinity coastal', $5, $6, $7, $8, $9, $10, $11)
        `,
          [
            envMap['C5'],
            sys[9],
            sys[5],
            sys[6],
            sys[0],
            sys[1],
            sys[2],
            sys[3],
            sys[4],
            sys[7],
            sys[8],
          ],
        );
      }
    }

    // Update Im1-Im3 to use new structure (keep existing but add system codes)
    if (envMap['Im1-Im3']) {
      // Delete old immersion specs and add new ones
      await queryRunner.query(
        `DELETE FROM coating_specifications WHERE environment_id = $1`,
        [envMap['Im1-Im3']],
      );

      const imSystems = [
        [
          'I.01',
          'EP, PUR, ESI',
          'Zn (R)',
          '60-80',
          'EP, PUR',
          '2-4',
          '360',
          'L,M,H',
          false,
          'Zinc-rich primer + Epoxy/PUR lining',
        ],
        [
          'I.02',
          'EP, PUR, ESI',
          'Zn (R)',
          '60-80',
          'EP, PUR',
          '2-5',
          '500',
          'L,M,H,VH',
          true,
          'Zinc-rich primer + multiple Epoxy/PUR coats',
        ],
        [
          'I.03',
          'EP, PUR, ESI',
          'Misc.',
          '80',
          'EP, PUR',
          '2-4',
          '380',
          'L,M,H',
          false,
          'Epoxy/PUR/ESI primer + Epoxy/PUR lining',
        ],
        [
          'I.04',
          'EP, PUR, ESI',
          'Misc.',
          '80',
          'EP, PUR',
          '2-4',
          '540',
          'L,M,H,VH',
          false,
          'Epoxy/PUR/ESI primer + multiple Epoxy/PUR coats',
        ],
        [
          'I.05',
          '—',
          '—',
          '—',
          'EP, PUR',
          '1-3',
          '400',
          'L,M,H',
          false,
          'Direct Epoxy/PUR lining (no primer)',
        ],
        [
          'I.06',
          '—',
          '—',
          '—',
          'EP, PUR',
          '1-3',
          '600',
          'L,M,H,VH',
          false,
          'Direct multiple Epoxy/PUR coats (no primer)',
        ],
      ];

      for (const sys of imSystems) {
        await queryRunner.query(
          `
          INSERT INTO coating_specifications
          (environment_id, coating_type, lifespan, system, coats, total_dft_um_range, applications, system_code, binder_type, primer_type, primer_ndft_um, subsequent_binder, supported_durabilities, is_recommended)
          VALUES ($1, 'internal', 'Per system', $2, $3, $4, 'Immersion in fresh, brackish or seawater', $5, $6, $7, $8, $9, $10, $11)
        `,
          [
            envMap['Im1-Im3'],
            sys[9],
            sys[5],
            sys[6],
            sys[0],
            sys[1],
            sys[2],
            sys[3],
            sys[4],
            sys[7],
            sys[8],
          ],
        );
      }
    }

    console.warn(
      'ISO 12944-5:2018(E) coating specifications updated successfully',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove new columns
    await queryRunner.query(`
      ALTER TABLE "coating_specifications"
      DROP COLUMN IF EXISTS "system_code",
      DROP COLUMN IF EXISTS "binder_type",
      DROP COLUMN IF EXISTS "primer_type",
      DROP COLUMN IF EXISTS "primer_ndft_um",
      DROP COLUMN IF EXISTS "subsequent_binder",
      DROP COLUMN IF EXISTS "supported_durabilities",
      DROP COLUMN IF EXISTS "is_recommended"
    `);
  }
}
