import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddThreadPitchToBolts1771500000000 implements MigrationInterface {
  name = 'AddThreadPitchToBolts1771500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding thread_pitch_mm column to bolts table...');

    await queryRunner.query(`
      ALTER TABLE bolts ADD COLUMN IF NOT EXISTS thread_pitch_mm FLOAT NULL
    `);

    const ISO_COARSE_PITCHES: Record<number, number> = {
      6: 1.0,
      8: 1.25,
      10: 1.5,
      12: 1.75,
      14: 2.0,
      16: 2.0,
      18: 2.5,
      20: 2.5,
      22: 2.5,
      24: 3.0,
      27: 3.0,
      30: 3.5,
      33: 3.5,
      36: 4.0,
      39: 4.0,
      42: 4.5,
      45: 4.5,
      48: 5.0,
      52: 5.0,
      56: 5.5,
      60: 5.5,
      64: 6.0,
    };

    const bolts = await queryRunner.query(`SELECT id, designation FROM bolts`);

    for (const bolt of bolts) {
      const match = bolt.designation.match(/M(\d+)/i);
      if (match) {
        const diameter = parseInt(match[1], 10);
        const pitch = ISO_COARSE_PITCHES[diameter];
        if (pitch) {
          await queryRunner.query(
            `UPDATE bolts SET thread_pitch_mm = ${pitch} WHERE id = ${bolt.id}`,
          );
        }
      }
    }

    console.warn('Thread pitch values populated for all bolts.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE bolts DROP COLUMN IF EXISTS thread_pitch_mm`,
    );
  }
}
