import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBoltNutWasherEnhancements1775300000000 implements MigrationInterface {
  name = 'AddBoltNutWasherEnhancements1775300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding bolt/nut/washer enhancements...');

    await this.addFinishColumnToBolts(queryRunner);
    await this.addMissingThreadPitches(queryRunner);
    await this.addGalvanizedBolts(queryRunner);
    await this.addLargeMetricStuds(queryRunner);
    await this.createBoltGradeAvailabilityTable(queryRunner);
    await this.createBoltThreadCompatibilityTable(queryRunner);

    console.warn('Bolt/nut/washer enhancements completed.');
  }

  private async addFinishColumnToBolts(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding finish column to bolts table...');

    const columnExists = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'bolts' AND column_name = 'finish'
    `);

    if (columnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE bolts ADD COLUMN finish VARCHAR(50) DEFAULT 'plain'
      `);
    }

    await queryRunner.query(`
      UPDATE bolts SET finish = 'plain' WHERE finish IS NULL
    `);
  }

  private async addMissingThreadPitches(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding missing thread pitches...');

    const missingMetricFine = [
      { designation: 'M8x1', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 1.0 },
      { designation: 'M52x4', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 4.0 },
      { designation: 'M56x4', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 4.0 },
      { designation: 'M64x4', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 4.0 },
      { designation: 'M68x4', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 4.0 },
      { designation: 'M72x4', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 4.0 },
      { designation: 'M76x4', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 4.0 },
      { designation: 'M80x4', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 4.0 },
      { designation: 'M85x4', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 4.0 },
      { designation: 'M90x4', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 4.0 },
      { designation: 'M95x4', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 4.0 },
      { designation: 'M100x4', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 4.0 },
    ];

    const missingMetricCoarse = [
      { designation: 'M68', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 6.0 },
      { designation: 'M72', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 6.0 },
      { designation: 'M76', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 6.0 },
      { designation: 'M80', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 6.0 },
      { designation: 'M85', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 6.0 },
      { designation: 'M90', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 6.0 },
      { designation: 'M95', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 6.0 },
      { designation: 'M100', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 6.0 },
    ];

    const smallImperialUNC = [
      { designation: '#8-32 UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 0.794 },
      { designation: '#10-24 UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 1.058 },
      { designation: '#12-24 UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 1.058 },
      { designation: '1/4"-20 UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 1.270 },
      { designation: '5/16"-18 UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 1.411 },
      { designation: '3/8"-16 UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 1.587 },
      { designation: '7/16"-14 UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 1.814 },
    ];

    const smallImperialUNF = [
      { designation: '#8-36 UNF', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 0.706 },
      { designation: '#10-32 UNF', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 0.794 },
      { designation: '#12-28 UNF', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 0.907 },
      { designation: '1/4"-28 UNF', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 0.907 },
      { designation: '5/16"-24 UNF', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 1.058 },
      { designation: '3/8"-24 UNF', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 1.058 },
      { designation: '7/16"-20 UNF', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 1.270 },
    ];

    const largeImperialUNF = [
      { designation: '1-5/8"-18 UNF', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 1.411 },
      { designation: '1-3/4"-16 UNF', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 1.587 },
      { designation: '2"-16 UNF', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitch: 1.587 },
    ];

    const allBolts = [
      ...missingMetricFine,
      ...missingMetricCoarse,
      ...smallImperialUNC,
      ...smallImperialUNF,
      ...largeImperialUNF,
    ];

    for (const bolt of allBolts) {
      await queryRunner.query(`
        INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish)
        VALUES ($1, $2, $3, $4, $5, $6, 'plain')
        ON CONFLICT (designation) DO UPDATE SET
          thread_pitch_mm = COALESCE(EXCLUDED.thread_pitch_mm, bolts.thread_pitch_mm)
      `, [bolt.designation, bolt.grade, bolt.material, bolt.headStyle, bolt.threadType, bolt.threadPitch]);
    }

    console.warn(`Added ${allBolts.length} missing thread pitch bolts`);
  }

  private async addGalvanizedBolts(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding hot-dip galvanized bolts...');

    const galvanizedBolts = [
      { designation: 'M10 HDG', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 1.5, finish: 'hot-dip galvanized' },
      { designation: 'M12 HDG', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 1.75, finish: 'hot-dip galvanized' },
      { designation: 'M16 HDG', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 2.0, finish: 'hot-dip galvanized' },
      { designation: 'M20 HDG', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 2.5, finish: 'hot-dip galvanized' },
      { designation: 'M24 HDG', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 3.0, finish: 'hot-dip galvanized' },
      { designation: 'M30 HDG', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 3.5, finish: 'hot-dip galvanized' },
      { designation: 'M36 HDG', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 4.0, finish: 'hot-dip galvanized' },
      { designation: 'M42 HDG', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 4.5, finish: 'hot-dip galvanized' },
      { designation: 'M48 HDG', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 5.0, finish: 'hot-dip galvanized' },

      { designation: 'M10 HDG Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitch: 1.5, finish: 'hot-dip galvanized' },
      { designation: 'M12 HDG Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitch: 1.75, finish: 'hot-dip galvanized' },
      { designation: 'M16 HDG Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitch: 2.0, finish: 'hot-dip galvanized' },
      { designation: 'M20 HDG Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitch: 2.5, finish: 'hot-dip galvanized' },
      { designation: 'M24 HDG Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitch: 3.0, finish: 'hot-dip galvanized' },
      { designation: 'M30 HDG Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitch: 3.5, finish: 'hot-dip galvanized' },
      { designation: 'M36 HDG Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitch: 4.0, finish: 'hot-dip galvanized' },
      { designation: 'M42 HDG Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitch: 4.5, finish: 'hot-dip galvanized' },
      { designation: 'M48 HDG Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitch: 5.0, finish: 'hot-dip galvanized' },

      { designation: '1/2" UNC HDG', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 1.954, finish: 'hot-dip galvanized' },
      { designation: '5/8" UNC HDG', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 2.309, finish: 'hot-dip galvanized' },
      { designation: '3/4" UNC HDG', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 2.540, finish: 'hot-dip galvanized' },
      { designation: '7/8" UNC HDG', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 2.822, finish: 'hot-dip galvanized' },
      { designation: '1" UNC HDG', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 3.175, finish: 'hot-dip galvanized' },
      { designation: '1-1/4" UNC HDG', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 3.629, finish: 'hot-dip galvanized' },
      { designation: '1-1/2" UNC HDG', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitch: 4.233, finish: 'hot-dip galvanized' },
    ];

    for (const bolt of galvanizedBolts) {
      await queryRunner.query(`
        INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (designation) DO UPDATE SET
          finish = EXCLUDED.finish
      `, [bolt.designation, bolt.grade, bolt.material, bolt.headStyle, bolt.threadType, bolt.threadPitch, bolt.finish]);
    }

    console.warn(`Added ${galvanizedBolts.length} hot-dip galvanized bolts`);
  }

  private async addLargeMetricStuds(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding large metric stud bolts M68-M100...');

    const largeStuds = [
      { designation: 'M68 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 6.0 },
      { designation: 'M72 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 6.0 },
      { designation: 'M76 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 6.0 },
      { designation: 'M80 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 6.0 },
      { designation: 'M85 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 6.0 },
      { designation: 'M90 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 6.0 },
      { designation: 'M95 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 6.0 },
      { designation: 'M100 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 6.0 },
    ];

    const studBoltIds: Record<string, number> = {};

    for (const stud of largeStuds) {
      const result = await queryRunner.query(`
        INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm, finish)
        VALUES ($1, $2, $3, 'stud', 'coarse', $4, 'plain')
        ON CONFLICT (designation) DO UPDATE SET
          thread_pitch_mm = EXCLUDED.thread_pitch_mm
        RETURNING id
      `, [stud.designation, stud.grade, stud.material, stud.threadPitch]);
      studBoltIds[stud.designation] = result[0].id;
    }

    const studBoltMassData: Array<{ designation: string; length: number; mass: number }> = [
      { designation: 'M68 Stud', length: 280, mass: 8.13 },
      { designation: 'M68 Stud', length: 320, mass: 9.29 },
      { designation: 'M68 Stud', length: 380, mass: 11.03 },
      { designation: 'M68 Stud', length: 450, mass: 13.07 },

      { designation: 'M72 Stud', length: 300, mass: 9.62 },
      { designation: 'M72 Stud', length: 350, mass: 11.22 },
      { designation: 'M72 Stud', length: 400, mass: 12.83 },
      { designation: 'M72 Stud', length: 450, mass: 14.44 },

      { designation: 'M76 Stud', length: 320, mass: 11.32 },
      { designation: 'M76 Stud', length: 380, mass: 13.45 },
      { designation: 'M76 Stud', length: 450, mass: 15.93 },
      { designation: 'M76 Stud', length: 500, mass: 17.70 },

      { designation: 'M80 Stud', length: 350, mass: 13.68 },
      { designation: 'M80 Stud', length: 400, mass: 15.62 },
      { designation: 'M80 Stud', length: 450, mass: 17.57 },
      { designation: 'M80 Stud', length: 500, mass: 19.51 },

      { designation: 'M85 Stud', length: 380, mass: 16.64 },
      { designation: 'M85 Stud', length: 450, mass: 19.69 },
      { designation: 'M85 Stud', length: 500, mass: 21.87 },
      { designation: 'M85 Stud', length: 550, mass: 24.05 },

      { designation: 'M90 Stud', length: 400, mass: 19.85 },
      { designation: 'M90 Stud', length: 450, mass: 22.33 },
      { designation: 'M90 Stud', length: 500, mass: 24.81 },
      { designation: 'M90 Stud', length: 600, mass: 29.77 },

      { designation: 'M95 Stud', length: 450, mass: 25.14 },
      { designation: 'M95 Stud', length: 500, mass: 27.93 },
      { designation: 'M95 Stud', length: 550, mass: 30.72 },
      { designation: 'M95 Stud', length: 600, mass: 33.52 },

      { designation: 'M100 Stud', length: 450, mass: 27.62 },
      { designation: 'M100 Stud', length: 500, mass: 30.69 },
      { designation: 'M100 Stud', length: 600, mass: 36.83 },
      { designation: 'M100 Stud', length: 700, mass: 42.97 },
    ];

    for (const item of studBoltMassData) {
      const boltId = studBoltIds[item.designation];
      if (!boltId) continue;

      await queryRunner.query(`
        INSERT INTO bolt_masses ("boltId", length_mm, mass_kg)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `, [boltId, item.length, item.mass]);
    }

    console.warn(`Added ${largeStuds.length} large metric stud bolts with mass data`);
  }

  private async createBoltGradeAvailabilityTable(queryRunner: QueryRunner): Promise<void> {
    console.warn('Creating bolt_grade_availability table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bolt_grade_availability (
        id SERIAL PRIMARY KEY,
        size_designation VARCHAR(30) NOT NULL,
        thread_type VARCHAR(20) NOT NULL,
        grade VARCHAR(20) NOT NULL,
        finishes TEXT[] NOT NULL DEFAULT '{}',
        min_length_mm NUMERIC(8,2),
        max_length_mm NUMERIC(8,2),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(size_designation, thread_type, grade)
      )
    `);

    const gradeAvailability = [
      { size: 'M8', thread: 'coarse', grade: '8.8', finishes: ['plain', 'zinc', 'hot-dip galvanized'], minLen: 16, maxLen: 100 },
      { size: 'M8', thread: 'coarse', grade: '10.9', finishes: ['plain', 'zinc'], minLen: 16, maxLen: 100 },
      { size: 'M8', thread: 'fine', grade: '8.8', finishes: ['plain', 'zinc'], minLen: 16, maxLen: 80 },
      { size: 'M10', thread: 'coarse', grade: '8.8', finishes: ['plain', 'zinc', 'hot-dip galvanized'], minLen: 20, maxLen: 150 },
      { size: 'M10', thread: 'coarse', grade: '10.9', finishes: ['plain', 'zinc'], minLen: 20, maxLen: 150 },
      { size: 'M10', thread: 'coarse', grade: '12.9', finishes: ['plain'], minLen: 25, maxLen: 120 },
      { size: 'M12', thread: 'coarse', grade: '8.8', finishes: ['plain', 'zinc', 'hot-dip galvanized'], minLen: 25, maxLen: 200 },
      { size: 'M12', thread: 'coarse', grade: '10.9', finishes: ['plain', 'zinc'], minLen: 25, maxLen: 200 },
      { size: 'M12', thread: 'coarse', grade: '12.9', finishes: ['plain'], minLen: 30, maxLen: 150 },
      { size: 'M16', thread: 'coarse', grade: '8.8', finishes: ['plain', 'zinc', 'hot-dip galvanized'], minLen: 35, maxLen: 300 },
      { size: 'M16', thread: 'coarse', grade: '10.9', finishes: ['plain', 'zinc'], minLen: 35, maxLen: 300 },
      { size: 'M16', thread: 'coarse', grade: '12.9', finishes: ['plain'], minLen: 40, maxLen: 200 },
      { size: 'M20', thread: 'coarse', grade: '8.8', finishes: ['plain', 'zinc', 'hot-dip galvanized'], minLen: 45, maxLen: 400 },
      { size: 'M20', thread: 'coarse', grade: '10.9', finishes: ['plain', 'zinc'], minLen: 45, maxLen: 400 },
      { size: 'M24', thread: 'coarse', grade: '8.8', finishes: ['plain', 'zinc', 'hot-dip galvanized'], minLen: 55, maxLen: 500 },
      { size: 'M24', thread: 'coarse', grade: '10.9', finishes: ['plain', 'zinc'], minLen: 55, maxLen: 500 },
      { size: 'M30', thread: 'coarse', grade: '8.8', finishes: ['plain', 'zinc', 'hot-dip galvanized'], minLen: 70, maxLen: 600 },
      { size: 'M30', thread: 'coarse', grade: '10.9', finishes: ['plain', 'zinc'], minLen: 70, maxLen: 600 },
      { size: 'M36', thread: 'coarse', grade: '8.8', finishes: ['plain', 'zinc', 'hot-dip galvanized'], minLen: 80, maxLen: 700 },
      { size: 'M36', thread: 'coarse', grade: '10.9', finishes: ['plain', 'zinc'], minLen: 80, maxLen: 700 },
      { size: 'M42', thread: 'coarse', grade: '8.8', finishes: ['plain', 'hot-dip galvanized'], minLen: 100, maxLen: 800 },
      { size: 'M48', thread: 'coarse', grade: '8.8', finishes: ['plain', 'hot-dip galvanized'], minLen: 120, maxLen: 900 },
      { size: 'M56', thread: 'coarse', grade: '8.8', finishes: ['plain'], minLen: 140, maxLen: 1000 },
      { size: 'M64', thread: 'coarse', grade: '8.8', finishes: ['plain'], minLen: 160, maxLen: 1000 },

      { size: '1/2"', thread: 'UNC', grade: '8.8', finishes: ['plain', 'zinc', 'hot-dip galvanized'], minLen: 25, maxLen: 150 },
      { size: '5/8"', thread: 'UNC', grade: '8.8', finishes: ['plain', 'zinc', 'hot-dip galvanized'], minLen: 30, maxLen: 200 },
      { size: '3/4"', thread: 'UNC', grade: '8.8', finishes: ['plain', 'zinc', 'hot-dip galvanized'], minLen: 40, maxLen: 250 },
      { size: '7/8"', thread: 'UNC', grade: '8.8', finishes: ['plain', 'zinc', 'hot-dip galvanized'], minLen: 50, maxLen: 300 },
      { size: '1"', thread: 'UNC', grade: '8.8', finishes: ['plain', 'zinc', 'hot-dip galvanized'], minLen: 60, maxLen: 400 },
      { size: '1-1/4"', thread: 'UNC', grade: '8.8', finishes: ['plain', 'hot-dip galvanized'], minLen: 75, maxLen: 500 },
      { size: '1-1/2"', thread: 'UNC', grade: '8.8', finishes: ['plain', 'hot-dip galvanized'], minLen: 90, maxLen: 600 },

      { size: 'M10', thread: 'stud', grade: 'B7', finishes: ['plain', 'hot-dip galvanized', 'PTFE'], minLen: 50, maxLen: 200 },
      { size: 'M12', thread: 'stud', grade: 'B7', finishes: ['plain', 'hot-dip galvanized', 'PTFE'], minLen: 50, maxLen: 250 },
      { size: 'M16', thread: 'stud', grade: 'B7', finishes: ['plain', 'hot-dip galvanized', 'PTFE'], minLen: 70, maxLen: 350 },
      { size: 'M20', thread: 'stud', grade: 'B7', finishes: ['plain', 'hot-dip galvanized', 'PTFE'], minLen: 80, maxLen: 450 },
      { size: 'M24', thread: 'stud', grade: 'B7', finishes: ['plain', 'hot-dip galvanized', 'PTFE'], minLen: 100, maxLen: 550 },
      { size: 'M30', thread: 'stud', grade: 'B7', finishes: ['plain', 'hot-dip galvanized'], minLen: 130, maxLen: 700 },
      { size: 'M36', thread: 'stud', grade: 'B7', finishes: ['plain', 'hot-dip galvanized'], minLen: 150, maxLen: 850 },
      { size: 'M42', thread: 'stud', grade: 'B7', finishes: ['plain'], minLen: 170, maxLen: 1000 },
      { size: 'M48', thread: 'stud', grade: 'B7', finishes: ['plain'], minLen: 190, maxLen: 1100 },
      { size: 'M56', thread: 'stud', grade: 'B7', finishes: ['plain'], minLen: 220, maxLen: 1200 },
      { size: 'M64', thread: 'stud', grade: 'B7', finishes: ['plain'], minLen: 250, maxLen: 1300 },
    ];

    for (const item of gradeAvailability) {
      await queryRunner.query(`
        INSERT INTO bolt_grade_availability (size_designation, thread_type, grade, finishes, min_length_mm, max_length_mm)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (size_designation, thread_type, grade) DO UPDATE SET
          finishes = EXCLUDED.finishes,
          min_length_mm = EXCLUDED.min_length_mm,
          max_length_mm = EXCLUDED.max_length_mm,
          updated_at = NOW()
      `, [item.size, item.thread, item.grade, item.finishes, item.minLen, item.maxLen]);
    }

    console.warn(`Added ${gradeAvailability.length} bolt grade availability records`);
  }

  private async createBoltThreadCompatibilityTable(queryRunner: QueryRunner): Promise<void> {
    console.warn('Creating bolt_thread_compatibility table for validation...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bolt_thread_compatibility (
        id SERIAL PRIMARY KEY,
        bolt_thread_type VARCHAR(20) NOT NULL,
        bolt_thread_pitch_mm NUMERIC(6,3) NOT NULL,
        nut_thread_type VARCHAR(20) NOT NULL,
        nut_thread_pitch_mm NUMERIC(6,3) NOT NULL,
        is_compatible BOOLEAN NOT NULL DEFAULT true,
        compatibility_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(bolt_thread_type, bolt_thread_pitch_mm, nut_thread_type, nut_thread_pitch_mm)
      )
    `);

    const compatibilityRules = [
      { boltType: 'coarse', boltPitch: 1.5, nutType: 'coarse', nutPitch: 1.5, compatible: true, notes: 'M10 coarse standard match' },
      { boltType: 'coarse', boltPitch: 1.5, nutType: 'fine', nutPitch: 1.25, compatible: false, notes: 'M10 coarse/fine mismatch - thread damage risk' },
      { boltType: 'fine', boltPitch: 1.25, nutType: 'coarse', nutPitch: 1.5, compatible: false, notes: 'M10 fine/coarse mismatch - thread damage risk' },
      { boltType: 'fine', boltPitch: 1.25, nutType: 'fine', nutPitch: 1.25, compatible: true, notes: 'M10 fine standard match' },

      { boltType: 'coarse', boltPitch: 1.75, nutType: 'coarse', nutPitch: 1.75, compatible: true, notes: 'M12 coarse standard match' },
      { boltType: 'coarse', boltPitch: 1.75, nutType: 'fine', nutPitch: 1.5, compatible: false, notes: 'M12 coarse/fine mismatch' },
      { boltType: 'fine', boltPitch: 1.5, nutType: 'coarse', nutPitch: 1.75, compatible: false, notes: 'M12 fine/coarse mismatch' },
      { boltType: 'fine', boltPitch: 1.5, nutType: 'fine', nutPitch: 1.5, compatible: true, notes: 'M12 fine standard match' },

      { boltType: 'coarse', boltPitch: 2.0, nutType: 'coarse', nutPitch: 2.0, compatible: true, notes: 'M16 coarse standard match' },
      { boltType: 'coarse', boltPitch: 2.0, nutType: 'fine', nutPitch: 1.5, compatible: false, notes: 'M16 coarse/fine mismatch' },
      { boltType: 'fine', boltPitch: 1.5, nutType: 'coarse', nutPitch: 2.0, compatible: false, notes: 'M16 fine/coarse mismatch' },

      { boltType: 'coarse', boltPitch: 2.5, nutType: 'coarse', nutPitch: 2.5, compatible: true, notes: 'M20 coarse standard match' },
      { boltType: 'coarse', boltPitch: 2.5, nutType: 'fine', nutPitch: 1.5, compatible: false, notes: 'M20 coarse/fine mismatch' },
      { boltType: 'fine', boltPitch: 1.5, nutType: 'coarse', nutPitch: 2.5, compatible: false, notes: 'M20 fine/coarse mismatch' },

      { boltType: 'coarse', boltPitch: 3.0, nutType: 'coarse', nutPitch: 3.0, compatible: true, notes: 'M24 coarse standard match' },
      { boltType: 'coarse', boltPitch: 3.0, nutType: 'fine', nutPitch: 2.0, compatible: false, notes: 'M24 coarse/fine mismatch' },

      { boltType: 'UNC', boltPitch: 1.954, nutType: 'UNC', nutPitch: 1.954, compatible: true, notes: '1/2" UNC standard match' },
      { boltType: 'UNC', boltPitch: 1.954, nutType: 'UNF', nutPitch: 1.270, compatible: false, notes: '1/2" UNC/UNF mismatch' },
      { boltType: 'UNF', boltPitch: 1.270, nutType: 'UNC', nutPitch: 1.954, compatible: false, notes: '1/2" UNF/UNC mismatch' },
      { boltType: 'UNF', boltPitch: 1.270, nutType: 'UNF', nutPitch: 1.270, compatible: true, notes: '1/2" UNF standard match' },

      { boltType: 'UNC', boltPitch: 2.540, nutType: 'UNC', nutPitch: 2.540, compatible: true, notes: '3/4" UNC standard match' },
      { boltType: 'UNC', boltPitch: 2.540, nutType: 'UNF', nutPitch: 1.587, compatible: false, notes: '3/4" UNC/UNF mismatch' },

      { boltType: 'UNC', boltPitch: 3.175, nutType: 'UNC', nutPitch: 3.175, compatible: true, notes: '1" UNC standard match' },
      { boltType: 'UNC', boltPitch: 3.175, nutType: 'UNF', nutPitch: 2.117, compatible: false, notes: '1" UNC/UNF mismatch' },

      { boltType: 'coarse', boltPitch: 1.5, nutType: 'UNC', nutPitch: 1.954, compatible: false, notes: 'M10 metric/imperial mismatch' },
      { boltType: 'UNC', boltPitch: 2.540, nutType: 'coarse', nutPitch: 2.5, compatible: false, notes: '3/4" imperial/M20 metric near-match but incompatible' },
    ];

    for (const rule of compatibilityRules) {
      await queryRunner.query(`
        INSERT INTO bolt_thread_compatibility (bolt_thread_type, bolt_thread_pitch_mm, nut_thread_type, nut_thread_pitch_mm, is_compatible, compatibility_notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (bolt_thread_type, bolt_thread_pitch_mm, nut_thread_type, nut_thread_pitch_mm) DO UPDATE SET
          is_compatible = EXCLUDED.is_compatible,
          compatibility_notes = EXCLUDED.compatibility_notes
      `, [rule.boltType, rule.boltPitch, rule.nutType, rule.nutPitch, rule.compatible, rule.notes]);
    }

    console.warn(`Added ${compatibilityRules.length} thread compatibility validation rules`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('Reverting bolt/nut/washer enhancements...');

    await queryRunner.query(`DROP TABLE IF EXISTS bolt_thread_compatibility`);
    await queryRunner.query(`DROP TABLE IF EXISTS bolt_grade_availability`);

    const galvanizedDesignations = [
      'M10 HDG', 'M12 HDG', 'M16 HDG', 'M20 HDG', 'M24 HDG', 'M30 HDG', 'M36 HDG', 'M42 HDG', 'M48 HDG',
      'M10 HDG Stud', 'M12 HDG Stud', 'M16 HDG Stud', 'M20 HDG Stud', 'M24 HDG Stud', 'M30 HDG Stud', 'M36 HDG Stud', 'M42 HDG Stud', 'M48 HDG Stud',
      '1/2" UNC HDG', '5/8" UNC HDG', '3/4" UNC HDG', '7/8" UNC HDG', '1" UNC HDG', '1-1/4" UNC HDG', '1-1/2" UNC HDG',
    ];

    for (const designation of galvanizedDesignations) {
      await queryRunner.query(`DELETE FROM bolts WHERE designation = $1`, [designation]);
    }

    const largeStudDesignations = [
      'M68 Stud', 'M72 Stud', 'M76 Stud', 'M80 Stud', 'M85 Stud', 'M90 Stud', 'M95 Stud', 'M100 Stud',
    ];

    for (const designation of largeStudDesignations) {
      const bolt = await queryRunner.query(`SELECT id FROM bolts WHERE designation = $1`, [designation]);
      if (bolt.length > 0) {
        await queryRunner.query(`DELETE FROM bolt_masses WHERE "boltId" = $1`, [bolt[0].id]);
        await queryRunner.query(`DELETE FROM bolts WHERE id = $1`, [bolt[0].id]);
      }
    }

    const newBoltDesignations = [
      'M8x1', 'M52x4', 'M56x4', 'M64x4', 'M68x4', 'M72x4', 'M76x4', 'M80x4', 'M85x4', 'M90x4', 'M95x4', 'M100x4',
      'M68', 'M72', 'M76', 'M80', 'M85', 'M90', 'M95', 'M100',
      '#8-32 UNC', '#10-24 UNC', '#12-24 UNC', '1/4"-20 UNC', '5/16"-18 UNC', '3/8"-16 UNC', '7/16"-14 UNC',
      '#8-36 UNF', '#10-32 UNF', '#12-28 UNF', '1/4"-28 UNF', '5/16"-24 UNF', '3/8"-24 UNF', '7/16"-20 UNF',
      '1-5/8"-18 UNF', '1-3/4"-16 UNF', '2"-16 UNF',
    ];

    for (const designation of newBoltDesignations) {
      await queryRunner.query(`DELETE FROM bolts WHERE designation = $1`, [designation]);
    }

    const columnExists = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'bolts' AND column_name = 'finish'
    `);

    if (columnExists.length > 0) {
      await queryRunner.query(`ALTER TABLE bolts DROP COLUMN finish`);
    }

    console.warn('Bolt/nut/washer enhancements reverted.');
  }
}
