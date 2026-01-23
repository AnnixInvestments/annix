import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhase2EnhancedTechnicalData1776500000000
  implements MigrationInterface
{
  name = 'AddPhase2EnhancedTechnicalData1776500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Phase 2: Adding enhanced technical data from MPS manual...');

    await this.createSabs719TestPressureTable(queryRunner);
    await this.createStainlessSteelGradesTable(queryRunner);
    await this.populateSabs719TestPressureData(queryRunner);
    await this.populateSabs719PipeMassData(queryRunner);
    await this.populateStainlessSteelGrades(queryRunner);

    console.warn('Phase 2 migration complete.');
  }

  private async createSabs719TestPressureTable(queryRunner: QueryRunner): Promise<void> {
    console.warn('Creating SABS 719 test pressure table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sabs_719_test_pressures (
        id SERIAL PRIMARY KEY,
        grade VARCHAR(10) NOT NULL,
        nominal_bore_mm INT NOT NULL,
        outside_diameter_mm DECIMAL(10,2) NOT NULL,
        wall_thickness_mm DECIMAL(8,2) NOT NULL,
        test_pressure_kpa INT NOT NULL,
        yield_stress_mpa INT NOT NULL,
        UNIQUE(grade, nominal_bore_mm, wall_thickness_mm)
      )
    `);
  }

  private async createStainlessSteelGradesTable(queryRunner: QueryRunner): Promise<void> {
    console.warn('Creating stainless steel grades table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stainless_steel_grades (
        id SERIAL PRIMARY KEY,
        grade_number VARCHAR(20) NOT NULL UNIQUE,
        uns_number VARCHAR(20),
        en_designation VARCHAR(50),
        en_number VARCHAR(20),
        family VARCHAR(30) NOT NULL,
        carbon_max_pct DECIMAL(6,4),
        chromium_min_pct DECIMAL(5,2),
        chromium_max_pct DECIMAL(5,2),
        nickel_min_pct DECIMAL(5,2),
        nickel_max_pct DECIMAL(5,2),
        molybdenum_min_pct DECIMAL(5,2),
        molybdenum_max_pct DECIMAL(5,2),
        nitrogen_max_pct DECIMAL(5,3),
        other_elements VARCHAR(255),
        description VARCHAR(500)
      )
    `);
  }

  private async populateSabs719TestPressureData(queryRunner: QueryRunner): Promise<void> {
    const existing = await queryRunner.query(`SELECT COUNT(*) as count FROM sabs_719_test_pressures`);
    if (parseInt(existing[0]?.count) > 0) {
      console.warn('SABS 719 test pressure data already exists, skipping...');
      return;
    }
    console.warn('Populating SABS 719 test pressure data...');

    const gradeBData = [
      { nb: 200, od: 219.1, wallPressures: [[4.0, 6600], [4.5, 7430], [5.0, 8250], [6.0, 9900], [8.0, 13200], [10.0, 16500], [12.0, 19800], [14.0, 23100]] },
      { nb: 250, od: 273.1, wallPressures: [[4.0, 5300], [4.5, 5960], [5.0, 6620], [6.0, 7950], [8.0, 10590], [10.0, 13240], [12.0, 15890], [14.0, 18540]] },
      { nb: 300, od: 323.9, wallPressures: [[4.0, 4460], [4.5, 5020], [5.0, 5580], [6.0, 6700], [8.0, 8930], [10.0, 11160], [12.0, 13390], [14.0, 15630]] },
      { nb: 350, od: 355.6, wallPressures: [[4.0, 4070], [4.5, 4580], [5.0, 5080], [6.0, 6100], [8.0, 8130], [10.0, 10170], [12.0, 12200], [14.0, 14230]] },
      { nb: 400, od: 406.4, wallPressures: [[4.0, 3560], [4.5, 4000], [5.0, 4450], [6.0, 5340], [8.0, 7120], [10.0, 8900], [12.0, 10670], [14.0, 12450]] },
      { nb: 450, od: 457, wallPressures: [[4.0, 3160], [4.5, 3560], [5.0, 3960], [6.0, 4750], [8.0, 6330], [10.0, 6910], [12.0, 9490], [14.0, 11070]] },
      { nb: 500, od: 508, wallPressures: [[4.0, 2850], [4.5, 3200], [5.0, 3560], [6.0, 4270], [8.0, 5690], [10.0, 7120], [12.0, 8540], [14.0, 9960]] },
      { nb: 550, od: 559, wallPressures: [[4.0, 2590], [4.5, 2910], [5.0, 3240], [6.0, 3880], [8.0, 5180], [10.0, 6470], [12.0, 7760], [14.0, 9060]] },
      { nb: 600, od: 610, wallPressures: [[4.0, 2370], [4.5, 2670], [5.0, 2970], [6.0, 3560], [8.0, 4740], [10.0, 5930], [12.0, 7120], [14.0, 8300]] },
      { nb: 650, od: 660, wallPressures: [[4.0, 2190], [4.5, 2460], [5.0, 2740], [6.0, 3290], [8.0, 4380], [10.0, 5480], [12.0, 6570], [14.0, 7670]] },
      { nb: 700, od: 711, wallPressures: [[4.0, 2030], [4.5, 2290], [5.0, 2540], [6.0, 3050], [8.0, 4070], [10.0, 5080], [12.0, 6100], [14.0, 7120]] },
      { nb: 750, od: 762, wallPressures: [[4.0, 1900], [4.5, 2140], [5.0, 2370], [6.0, 2850], [8.0, 3800], [10.0, 4740], [12.0, 5690], [14.0, 6640]] },
      { nb: 800, od: 813, wallPressures: [[4.0, 1780], [4.5, 2000], [5.0, 2220], [6.0, 2670], [8.0, 3560], [10.0, 4450], [12.0, 5340], [14.0, 6230]] },
      { nb: 850, od: 864, wallPressures: [[4.0, 1670], [4.5, 1880], [5.0, 2090], [6.0, 2510], [8.0, 3350], [10.0, 4190], [12.0, 5020], [14.0, 5860]] },
      { nb: 900, od: 914, wallPressures: [[4.0, 1580], [4.5, 1780], [5.0, 1980], [6.0, 2370], [8.0, 3160], [10.0, 3960], [12.0, 4750], [14.0, 5540]] },
      { nb: 950, od: 965, wallPressures: [[4.0, 1500], [4.5, 1690], [5.0, 1870], [6.0, 2250], [8.0, 3000], [10.0, 3750], [12.0, 4500], [14.0, 5240]] },
      { nb: 1000, od: 1016, wallPressures: [[4.0, 1420], [4.5, 1600], [5.0, 1780], [6.0, 2140], [8.0, 2850], [10.0, 3560], [12.0, 4270], [14.0, 4980]] },
    ];

    const gradeCData = [
      { nb: 200, od: 219.1, wallPressures: [[4.0, 7940], [4.5, 8930], [5.0, 9930], [6.0, 11910], [8.0, 15880], [10.0, 19850], [12.0, 23820], [14.0, 27800]] },
      { nb: 250, od: 273.1, wallPressures: [[4.0, 6370], [4.5, 7170], [5.0, 7970], [6.0, 9560], [8.0, 12750], [10.0, 15930], [12.0, 19120], [14.0, 22310]] },
      { nb: 300, od: 323.9, wallPressures: [[4.0, 5370], [4.5, 6040], [5.0, 6720], [6.0, 8060], [8.0, 10740], [10.0, 13430], [12.0, 16120], [14.0, 18800]] },
      { nb: 350, od: 355.6, wallPressures: [[4.0, 4890], [4.5, 5500], [5.0, 6120], [6.0, 7340], [8.0, 9790], [10.0, 12230], [12.0, 14680], [14.0, 17130]] },
      { nb: 400, od: 406.4, wallPressures: [[4.0, 4280], [4.5, 4820], [5.0, 5350], [6.0, 6420], [8.0, 8560], [10.0, 10700], [12.0, 12840], [14.0, 14990]] },
      { nb: 450, od: 457, wallPressures: [[4.0, 3810], [4.5, 4280], [5.0, 4760], [6.0, 5710], [8.0, 7610], [10.0, 9520], [12.0, 11420], [14.0, 13330]] },
      { nb: 500, od: 508, wallPressures: [[4.0, 3430], [4.5, 3850], [5.0, 4280], [6.0, 5140], [8.0, 6850], [10.0, 8560], [12.0, 10280], [14.0, 11990]] },
      { nb: 550, od: 559, wallPressures: [[4.0, 3110], [4.5, 3500], [5.0, 3890], [6.0, 4670], [8.0, 6230], [10.0, 7780], [12.0, 9340], [14.0, 10900]] },
      { nb: 600, od: 610, wallPressures: [[4.0, 2850], [4.5, 3210], [5.0, 3570], [6.0, 4280], [8.0, 5710], [10.0, 7130], [12.0, 8560], [14.0, 9980]] },
      { nb: 650, od: 660, wallPressures: [[4.0, 2640], [4.5, 2970], [5.0, 3300], [6.0, 3950], [8.0, 5270], [10.0, 6590], [12.0, 7910], [14.0, 9230]] },
      { nb: 700, od: 711, wallPressures: [[4.0, 2450], [4.5, 2750], [5.0, 3060], [6.0, 3670], [8.0, 4890], [10.0, 6120], [12.0, 7340], [14.0, 8570]] },
      { nb: 750, od: 762, wallPressures: [[4.0, 2280], [4.5, 2570], [5.0, 2850], [6.0, 3430], [8.0, 4750], [10.0, 5710], [12.0, 6850], [14.0, 7990]] },
      { nb: 800, od: 813, wallPressures: [[4.0, 2140], [4.5, 2410], [5.0, 2680], [6.0, 3210], [8.0, 4280], [10.0, 5350], [12.0, 6420], [14.0, 7490]] },
      { nb: 850, od: 864, wallPressures: [[4.0, 2010], [4.5, 2270], [5.0, 2520], [6.0, 3020], [8.0, 4030], [10.0, 5040], [12.0, 6040], [14.0, 7050]] },
      { nb: 900, od: 914, wallPressures: [[4.0, 1900], [4.5, 2140], [5.0, 2380], [6.0, 2860], [8.0, 3810], [10.0, 4760], [12.0, 5710], [14.0, 6660]] },
      { nb: 950, od: 965, wallPressures: [[4.0, 1800], [4.5, 2030], [5.0, 2250], [6.0, 2700], [8.0, 3610], [10.0, 4510], [12.0, 5410], [14.0, 6310]] },
      { nb: 1000, od: 1016, wallPressures: [[4.0, 1710], [4.5, 1930], [5.0, 2140], [6.0, 2570], [8.0, 3430], [10.0, 4280], [12.0, 5140], [14.0, 5990]] },
    ];

    const values: string[] = [];
    for (const row of gradeBData) {
      for (const [wall, pressure] of row.wallPressures) {
        values.push(`('B', ${row.nb}, ${row.od}, ${wall}, ${pressure}, 241)`);
      }
    }
    for (const row of gradeCData) {
      for (const [wall, pressure] of row.wallPressures) {
        values.push(`('C', ${row.nb}, ${row.od}, ${wall}, ${pressure}, 290)`);
      }
    }

    await queryRunner.query(`
      INSERT INTO sabs_719_test_pressures (grade, nominal_bore_mm, outside_diameter_mm, wall_thickness_mm, test_pressure_kpa, yield_stress_mpa)
      VALUES ${values.join(',\n')}
      ON CONFLICT DO NOTHING
    `);

    console.warn(`Added ${values.length} SABS 719 test pressure entries`);
  }

  private async populateSabs719PipeMassData(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sabs_719_pipe_mass')
    `);
    if (tableExists[0]?.exists) {
      const existing = await queryRunner.query(`SELECT COUNT(*) as count FROM sabs_719_pipe_mass`);
      if (parseInt(existing[0]?.count) > 0) {
        console.warn('SABS 719 pipe mass data already exists, skipping...');
        return;
      }
    }
    console.warn('Populating SABS 719 pipe mass data...');

    const columnExists = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'pipe_dimensions' AND column_name = 'mass_kg_per_m'
    `);

    if (columnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE pipe_dimensions
        ADD COLUMN IF NOT EXISTS mass_kg_per_m DECIMAL(10,2)
      `);
    }

    const massData = [
      { nb: 200, od: 219.1, wallMass: [[4.5, 24.9], [6.0, 33.1], [8.0, 43.6], [10.0, 54.2], [12.0, 64.6]] },
      { nb: 300, od: 323.9, wallMass: [[4.5, 31.2], [6.0, 41.4], [8.0, 54.7], [10.0, 68.0], [12.0, 81.5], [14.0, 94], [16.0, 106]] },
      { nb: 400, od: 406.4, wallMass: [[4.5, 37.1], [6.0, 49.3], [8.0, 65.2], [10.0, 81.3], [12.0, 97.5], [14.0, 113], [16.0, 127], [20.0, 158]] },
      { nb: 500, od: 508, wallMass: [[4.5, 40.7], [6.0, 54.2], [8.0, 71.7], [10.0, 89.5], [12.0, 108], [14.0, 124], [16.0, 140], [20.0, 200]] },
      { nb: 600, od: 610, wallMass: [[4.5, 46.6], [6.0, 62.1], [8.0, 82.2], [10.0, 103], [12.0, 123], [14.0, 143], [16.0, 161], [20.0, 253]] },
      { nb: 700, od: 711, wallMass: [[4.5, 52.6], [6.0, 70.0], [8.0, 92.6], [10.0, 115], [12.0, 139], [14.0, 161], [16.0, 182], [20.0, 305]] },
      { nb: 800, od: 813, wallMass: [[4.5, 58.5], [6.0, 78.0], [8.0, 103], [10.0, 129], [12.0, 155], [14.0, 179], [16.0, 203], [20.0, 358]] },
      { nb: 900, od: 914, wallMass: [[4.5, 64.4], [6.0, 85.8], [8.0, 113], [10.0, 142], [12.0, 172], [14.0, 198], [16.0, 223], [20.0, 410], [22.0, 309]] },
      { nb: 1000, od: 1016, wallMass: [[4.5, 70.2], [6.0, 93.6], [8.0, 124], [10.0, 155], [12.0, 186], [14.0, 216], [16.0, 245], [20.0, 463], [22.0, 366]] },
      { nb: 1200, od: 1219, wallMass: [[4.5, 82.0], [6.0, 110], [8.0, 145], [10.0, 182], [12.0, 219], [14.0, 253], [16.0, 287], [20.0, 555], [22.0, 484]] },
    ];

    if (!tableExists[0]?.exists) {
      await queryRunner.query(`
        CREATE TABLE sabs_719_pipe_mass (
          id SERIAL PRIMARY KEY,
          nominal_bore_mm INT NOT NULL,
          outside_diameter_mm DECIMAL(10,2) NOT NULL,
          wall_thickness_mm DECIMAL(8,2) NOT NULL,
          mass_kg_per_m DECIMAL(10,2) NOT NULL,
          UNIQUE(nominal_bore_mm, wall_thickness_mm)
        )
      `);
    }

    const values: string[] = [];
    for (const row of massData) {
      for (const [wall, mass] of row.wallMass) {
        values.push(`(${row.nb}, ${row.od}, ${wall}, ${mass})`);
      }
    }

    await queryRunner.query(`
      INSERT INTO sabs_719_pipe_mass (nominal_bore_mm, outside_diameter_mm, wall_thickness_mm, mass_kg_per_m)
      VALUES ${values.join(',\n')}
      ON CONFLICT DO NOTHING
    `);

    console.warn(`Added ${values.length} SABS 719 pipe mass entries`);
  }

  private async populateStainlessSteelGrades(queryRunner: QueryRunner): Promise<void> {
    const existing = await queryRunner.query(`SELECT COUNT(*) as count FROM stainless_steel_grades`);
    if (parseInt(existing[0]?.count) > 0) {
      console.warn('Stainless steel grades already exist, skipping...');
      return;
    }
    console.warn('Populating stainless steel grades...');

    const grades = [
      { gradeNumber: '201', unsNumber: 'S20100', enNumber: '1.4372', enDesignation: 'X12CrMnNiN 17-7-5', family: 'Austenitic', carbonMaxPct: 0.15, chromiumMin: 16.0, chromiumMax: 18.0, nickelMin: 3.5, nickelMax: 5.5, nitrogenMax: 0.25, otherElements: '5.5-7.5% Mn' },
      { gradeNumber: '201L', unsNumber: 'S20103', enNumber: '1.4371', enDesignation: 'X2CrMnNiN 17-7-5', family: 'Austenitic', carbonMaxPct: 0.03, chromiumMin: 16.0, chromiumMax: 18.0, nickelMin: 3.5, nickelMax: 5.5, nitrogenMax: 0.25, otherElements: '5.5-7.5% Mn' },
      { gradeNumber: '202', unsNumber: 'S20200', enNumber: '1.4373', enDesignation: 'X12CrMnNiN 18-9-5', family: 'Austenitic', carbonMaxPct: 0.15, chromiumMin: 17.0, chromiumMax: 19.0, nickelMin: 4.0, nickelMax: 6.0, nitrogenMax: 0.25, otherElements: '7.5-10.0% Mn' },
      { gradeNumber: '301', unsNumber: 'S30100', enNumber: '1.4310', enDesignation: 'X10CrNi 18-8', family: 'Austenitic', carbonMaxPct: 0.15, chromiumMin: 16.0, chromiumMax: 18.0, nickelMin: 6.0, nickelMax: 8.0, nitrogenMax: 0.10, otherElements: null },
      { gradeNumber: '303', unsNumber: 'S30300', enNumber: '1.4305', enDesignation: 'X8CrNiS 18-9', family: 'Austenitic', carbonMaxPct: 0.15, chromiumMin: 17.0, chromiumMax: 19.0, nickelMin: 8.0, nickelMax: 10.0, nitrogenMax: null, otherElements: '>0.15% S (Free Machining)' },
      { gradeNumber: '304', unsNumber: 'S30400', enNumber: '1.4301', enDesignation: 'X5CrNi 18-10', family: 'Austenitic', carbonMaxPct: 0.08, chromiumMin: 18.0, chromiumMax: 20.0, nickelMin: 8.0, nickelMax: 10.5, nitrogenMax: 0.10, otherElements: null },
      { gradeNumber: '304L', unsNumber: 'S30403', enNumber: '1.4306', enDesignation: 'X2CrNi 19-11', family: 'Austenitic', carbonMaxPct: 0.03, chromiumMin: 18.0, chromiumMax: 20.0, nickelMin: 8.0, nickelMax: 12.0, nitrogenMax: 0.10, otherElements: null },
      { gradeNumber: '304H', unsNumber: 'S30409', enNumber: null, enDesignation: null, family: 'Austenitic', carbonMaxPct: 0.10, chromiumMin: 18.0, chromiumMax: 20.0, nickelMin: 8.0, nickelMax: 10.5, nitrogenMax: null, otherElements: 'High carbon for elevated temp' },
      { gradeNumber: '309', unsNumber: 'S30900', enNumber: '1.4828', enDesignation: 'X15CrNiSi 20-12', family: 'Austenitic', carbonMaxPct: 0.20, chromiumMin: 22.0, chromiumMax: 24.0, nickelMin: 12.0, nickelMax: 15.0, nitrogenMax: null, otherElements: null },
      { gradeNumber: '310', unsNumber: 'S31000', enNumber: '1.4845', enDesignation: 'X8CrNi 25-21', family: 'Austenitic', carbonMaxPct: 0.25, chromiumMin: 24.0, chromiumMax: 26.0, nickelMin: 19.0, nickelMax: 22.0, nitrogenMax: null, otherElements: null },
      { gradeNumber: '316', unsNumber: 'S31600', enNumber: '1.4401', enDesignation: 'X5CrNiMo 17-12-2', family: 'Austenitic', carbonMaxPct: 0.08, chromiumMin: 16.0, chromiumMax: 18.0, nickelMin: 10.0, nickelMax: 14.0, molybdenumMin: 2.0, molybdenumMax: 3.0, nitrogenMax: 0.10, otherElements: null },
      { gradeNumber: '316L', unsNumber: 'S31603', enNumber: '1.4404', enDesignation: 'X2CrNiMo 17-12-2', family: 'Austenitic', carbonMaxPct: 0.03, chromiumMin: 16.0, chromiumMax: 18.0, nickelMin: 10.0, nickelMax: 14.0, molybdenumMin: 2.0, molybdenumMax: 3.0, nitrogenMax: 0.10, otherElements: null },
      { gradeNumber: '316Ti', unsNumber: 'S31635', enNumber: '1.4571', enDesignation: 'X6CrNiMoTi 17-12-2', family: 'Austenitic', carbonMaxPct: 0.08, chromiumMin: 16.0, chromiumMax: 18.0, nickelMin: 10.0, nickelMax: 14.0, molybdenumMin: 2.0, molybdenumMax: 3.0, nitrogenMax: null, otherElements: 'Ti stabilized' },
      { gradeNumber: '317', unsNumber: 'S31700', enNumber: '1.4449', enDesignation: 'X3CrNiMo 18-12-3', family: 'Austenitic', carbonMaxPct: 0.08, chromiumMin: 18.0, chromiumMax: 20.0, nickelMin: 11.0, nickelMax: 15.0, molybdenumMin: 3.0, molybdenumMax: 4.0, nitrogenMax: null, otherElements: null },
      { gradeNumber: '321', unsNumber: 'S32100', enNumber: '1.4541', enDesignation: 'X6CrNiTi 18-10', family: 'Austenitic', carbonMaxPct: 0.08, chromiumMin: 17.0, chromiumMax: 19.0, nickelMin: 9.0, nickelMax: 12.0, nitrogenMax: 0.10, otherElements: 'Ti stabilized (5xC min)' },
      { gradeNumber: '347', unsNumber: 'S34700', enNumber: '1.4550', enDesignation: 'X6CrNiNb 18-10', family: 'Austenitic', carbonMaxPct: 0.08, chromiumMin: 17.0, chromiumMax: 19.0, nickelMin: 9.0, nickelMax: 13.0, nitrogenMax: null, otherElements: 'Nb stabilized (10xC min)' },
      { gradeNumber: '409', unsNumber: 'S40900', enNumber: '1.4512', enDesignation: 'X2CrTi 12', family: 'Ferritic', carbonMaxPct: 0.08, chromiumMin: 10.5, chromiumMax: 11.75, nickelMin: null, nickelMax: 0.5, nitrogenMax: null, otherElements: 'Ti stabilized' },
      { gradeNumber: '410', unsNumber: 'S41000', enNumber: '1.4006', enDesignation: 'X12Cr 13', family: 'Martensitic', carbonMaxPct: 0.15, chromiumMin: 11.5, chromiumMax: 13.5, nickelMin: null, nickelMax: 0.75, nitrogenMax: null, otherElements: null },
      { gradeNumber: '420', unsNumber: 'S42000', enNumber: '1.4021', enDesignation: 'X20Cr 13', family: 'Martensitic', carbonMaxPct: 0.35, chromiumMin: 12.0, chromiumMax: 14.0, nickelMin: null, nickelMax: null, nitrogenMax: null, otherElements: null },
      { gradeNumber: '430', unsNumber: 'S43000', enNumber: '1.4016', enDesignation: 'X6Cr 17', family: 'Ferritic', carbonMaxPct: 0.12, chromiumMin: 16.0, chromiumMax: 18.0, nickelMin: null, nickelMax: 0.75, nitrogenMax: null, otherElements: null },
      { gradeNumber: '431', unsNumber: 'S43100', enNumber: '1.4057', enDesignation: 'X17CrNi 16-2', family: 'Martensitic', carbonMaxPct: 0.20, chromiumMin: 15.0, chromiumMax: 17.0, nickelMin: 1.25, nickelMax: 2.5, nitrogenMax: null, otherElements: null },
      { gradeNumber: '440A', unsNumber: 'S44002', enNumber: '1.4109', enDesignation: 'X70CrMo 15', family: 'Martensitic', carbonMaxPct: 0.75, chromiumMin: 16.0, chromiumMax: 18.0, nickelMin: null, nickelMax: null, molybdenumMin: null, molybdenumMax: 0.75, nitrogenMax: null, otherElements: null },
      { gradeNumber: '440C', unsNumber: 'S44004', enNumber: '1.4125', enDesignation: 'X105CrMo 17', family: 'Martensitic', carbonMaxPct: 1.20, chromiumMin: 16.0, chromiumMax: 18.0, nickelMin: null, nickelMax: null, molybdenumMin: null, molybdenumMax: 0.75, nitrogenMax: null, otherElements: null },
      { gradeNumber: '2205', unsNumber: 'S32205', enNumber: '1.4462', enDesignation: 'X2CrNiMoN 22-5-3', family: 'Duplex', carbonMaxPct: 0.03, chromiumMin: 22.0, chromiumMax: 23.0, nickelMin: 4.5, nickelMax: 6.5, molybdenumMin: 3.0, molybdenumMax: 3.5, nitrogenMax: 0.20, otherElements: null },
      { gradeNumber: '2507', unsNumber: 'S32750', enNumber: '1.4410', enDesignation: 'X2CrNiMoN 25-7-4', family: 'Super Duplex', carbonMaxPct: 0.03, chromiumMin: 24.0, chromiumMax: 26.0, nickelMin: 6.0, nickelMax: 8.0, molybdenumMin: 3.0, molybdenumMax: 5.0, nitrogenMax: 0.30, otherElements: null },
      { gradeNumber: '3CR12', unsNumber: 'S41003', enNumber: '1.4003', enDesignation: 'X2CrNi 12', family: 'Ferritic/Martensitic', carbonMaxPct: 0.03, chromiumMin: 10.5, chromiumMax: 12.5, nickelMin: 0.3, nickelMax: 1.0, nitrogenMax: null, otherElements: 'SA proprietary grade' },
    ];

    const values: string[] = [];
    for (const g of grades) {
      const enDesig = g.enDesignation ? `'${g.enDesignation}'` : 'NULL';
      const enNum = g.enNumber ? `'${g.enNumber}'` : 'NULL';
      const uns = g.unsNumber ? `'${g.unsNumber}'` : 'NULL';
      const other = g.otherElements ? `'${g.otherElements.replace(/'/g, "''")}'` : 'NULL';
      const moMin = (g as any).molybdenumMin ?? 'NULL';
      const moMax = (g as any).molybdenumMax ?? 'NULL';
      const niMin = g.nickelMin ?? 'NULL';
      const niMax = g.nickelMax ?? 'NULL';
      const nMax = g.nitrogenMax ?? 'NULL';

      values.push(`('${g.gradeNumber}', ${uns}, ${enNum}, ${enDesig}, '${g.family}', ${g.carbonMaxPct}, ${g.chromiumMin}, ${g.chromiumMax}, ${niMin}, ${niMax}, ${moMin}, ${moMax}, ${nMax}, ${other})`);
    }

    await queryRunner.query(`
      INSERT INTO stainless_steel_grades
        (grade_number, uns_number, en_number, en_designation, family, carbon_max_pct, chromium_min_pct, chromium_max_pct, nickel_min_pct, nickel_max_pct, molybdenum_min_pct, molybdenum_max_pct, nitrogen_max_pct, other_elements)
      VALUES ${values.join(',\n')}
      ON CONFLICT (grade_number) DO NOTHING
    `);

    console.warn(`Added ${values.length} stainless steel grade entries`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('Reverting Phase 2 migration...');

    await queryRunner.query(`DROP TABLE IF EXISTS stainless_steel_grades`);
    await queryRunner.query(`DROP TABLE IF EXISTS sabs_719_pipe_mass`);
    await queryRunner.query(`DROP TABLE IF EXISTS sabs_719_test_pressures`);

    console.warn('Phase 2 migration reverted');
  }
}
