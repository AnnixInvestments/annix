import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhase3UserExperienceData1776600000000
  implements MigrationInterface
{
  name = 'AddPhase3UserExperienceData1776600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Phase 3: Adding user experience enhancement data...');

    await this.createHdpeChemicalResistanceTable(queryRunner);
    await this.createFlowCoefficientsTable(queryRunner);
    await this.createRubberChemicalCompatibilityTable(queryRunner);
    await this.populateHdpeChemicalResistanceData(queryRunner);
    await this.populateFlowCoefficientsData(queryRunner);
    await this.populateRubberChemicalCompatibilityData(queryRunner);

    console.warn('Phase 3 migration complete.');
  }

  private async createHdpeChemicalResistanceTable(queryRunner: QueryRunner): Promise<void> {
    console.warn('Creating HDPE chemical resistance table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hdpe_chemical_resistance (
        id SERIAL PRIMARY KEY,
        substance VARCHAR(100) NOT NULL,
        concentration VARCHAR(50),
        temperature_c INT NOT NULL,
        hdpe_rating VARCHAR(5) NOT NULL,
        pp_rating VARCHAR(5),
        fcr_factor DECIMAL(4,2),
        fcrt_factor DECIMAL(4,2),
        notes VARCHAR(255),
        UNIQUE(substance, concentration, temperature_c)
      )
    `);
  }

  private async createFlowCoefficientsTable(queryRunner: QueryRunner): Promise<void> {
    console.warn('Creating flow coefficients table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS flow_coefficients (
        id SERIAL PRIMARY KEY,
        material VARCHAR(50) NOT NULL,
        condition VARCHAR(50) NOT NULL,
        hazen_williams_c INT NOT NULL,
        manning_n DECIMAL(5,4),
        absolute_roughness_mm DECIMAL(6,4),
        notes VARCHAR(255),
        UNIQUE(material, condition)
      )
    `);
  }

  private async createRubberChemicalCompatibilityTable(queryRunner: QueryRunner): Promise<void> {
    console.warn('Creating rubber chemical compatibility table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rubber_chemical_compatibility (
        id SERIAL PRIMARY KEY,
        rubber_type_id INT NOT NULL REFERENCES rubber_types(id),
        chemical VARCHAR(100) NOT NULL,
        concentration VARCHAR(50),
        temperature_c INT NOT NULL,
        rating VARCHAR(2) NOT NULL,
        iso_tr_7620_ref VARCHAR(50),
        notes VARCHAR(255),
        UNIQUE(rubber_type_id, chemical, concentration, temperature_c)
      )
    `);
  }

  private async populateHdpeChemicalResistanceData(queryRunner: QueryRunner): Promise<void> {
    const existing = await queryRunner.query(`SELECT COUNT(*) as count FROM hdpe_chemical_resistance`);
    if (parseInt(existing[0]?.count) > 0) {
      console.warn('HDPE chemical resistance data already exists, skipping...');
      return;
    }
    console.warn('Populating HDPE chemical resistance data...');

    const chemicalData = [
      { substance: 'Acetaldehyde', concentration: '40%', temps: { 20: '+', 60: '/' } },
      { substance: 'Acetic acid', concentration: '10%', temps: { 20: '+', 60: '+' } },
      { substance: 'Acetic acid', concentration: '50%', temps: { 20: '+', 60: '/' } },
      { substance: 'Acetic acid', concentration: '100% (glacial)', temps: { 20: '+', 60: '/' } },
      { substance: 'Acetic acid anhydride', concentration: '100%', temps: { 20: '+', 60: '-' } },
      { substance: 'Acetone', concentration: '100%', temps: { 20: '+', 60: '-' } },
      { substance: 'Aluminium chloride', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Aluminium fluoride', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Aluminium hydroxide', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Aluminium nitrate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Aluminium sulphate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Ammonia', concentration: '10%', temps: { 20: '+', 60: '+' } },
      { substance: 'Ammonia', concentration: 'liquid 100%', temps: { 20: '-', 60: '-' } },
      { substance: 'Ammonium chloride', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Ammonium fluoride', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Ammonium hydroxide', concentration: '30%', temps: { 20: '+', 60: '+' } },
      { substance: 'Ammonium nitrate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Ammonium sulphate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Barium chloride', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Barium hydroxide', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Benzene', concentration: '100%', temps: { 20: '/', 60: '-' } },
      { substance: 'Boric acid', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Bromine', concentration: 'liquid', temps: { 20: '-', 60: '-' } },
      { substance: 'Butanol', concentration: '100%', temps: { 20: '+', 60: '+' } },
      { substance: 'Calcium chloride', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Calcium hydroxide', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Calcium hypochlorite', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Carbon dioxide', concentration: 'wet', temps: { 20: '+', 60: '+' } },
      { substance: 'Carbon tetrachloride', concentration: '100%', temps: { 20: '/', 60: '-' } },
      { substance: 'Chlorine', concentration: '10% in water', temps: { 20: '+', 60: '+' } },
      { substance: 'Chlorine', concentration: 'gas dry', temps: { 20: '+', 60: '/' } },
      { substance: 'Chlorine', concentration: 'gas wet', temps: { 20: '+', 60: '/' } },
      { substance: 'Chromic acid', concentration: '10%', temps: { 20: '+', 60: '+' } },
      { substance: 'Chromic acid', concentration: '50%', temps: { 20: '+', 60: '/' } },
      { substance: 'Citric acid', concentration: '10%', temps: { 20: '+', 60: '+' } },
      { substance: 'Citric acid', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Copper chloride', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Copper sulphate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Cyclohexane', concentration: '100%', temps: { 20: '/', 60: '-' } },
      { substance: 'Ethanol', concentration: '96%', temps: { 20: '+', 60: '+' } },
      { substance: 'Ethyl acetate', concentration: '100%', temps: { 20: '/', 60: '-' } },
      { substance: 'Ethylene glycol', concentration: '100%', temps: { 20: '+', 60: '+' } },
      { substance: 'Ferric chloride', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Ferric sulphate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Ferrous chloride', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Ferrous sulphate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Fluorine', concentration: 'gas', temps: { 20: '-', 60: '-' } },
      { substance: 'Formaldehyde', concentration: '40%', temps: { 20: '+', 60: '+' } },
      { substance: 'Formic acid', concentration: '10%', temps: { 20: '+', 60: '+' } },
      { substance: 'Formic acid', concentration: '98%', temps: { 20: '+', 60: '/' } },
      { substance: 'Glycerol', concentration: '100%', temps: { 20: '+', 60: '+' } },
      { substance: 'Hydrochloric acid', concentration: '10%', temps: { 20: '+', 60: '+' } },
      { substance: 'Hydrochloric acid', concentration: '36%', temps: { 20: '+', 60: '+' } },
      { substance: 'Hydrofluoric acid', concentration: '40%', temps: { 20: '+', 60: '+' } },
      { substance: 'Hydrofluoric acid', concentration: '70%', temps: { 20: '+', 60: '/' } },
      { substance: 'Hydrogen peroxide', concentration: '10%', temps: { 20: '+', 60: '+' } },
      { substance: 'Hydrogen peroxide', concentration: '30%', temps: { 20: '+', 60: '+' } },
      { substance: 'Hydrogen peroxide', concentration: '90%', temps: { 20: '/', 60: '-' } },
      { substance: 'Hydrogen sulphide', concentration: 'wet', temps: { 20: '+', 60: '+' } },
      { substance: 'Lactic acid', concentration: '10%', temps: { 20: '+', 60: '+' } },
      { substance: 'Lactic acid', concentration: '90%', temps: { 20: '+', 60: '+' } },
      { substance: 'Lead acetate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Magnesium chloride', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Magnesium hydroxide', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Magnesium sulphate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Methanol', concentration: '100%', temps: { 20: '+', 60: '+' } },
      { substance: 'Methylene chloride', concentration: '100%', temps: { 20: '-', 60: '-' } },
      { substance: 'Nitric acid', concentration: '10%', temps: { 20: '+', 60: '+' } },
      { substance: 'Nitric acid', concentration: '50%', temps: { 20: '+', 60: '/' } },
      { substance: 'Nitric acid', concentration: '70%', temps: { 20: '/', 60: '-' } },
      { substance: 'Nitric acid', concentration: 'fuming', temps: { 20: '-', 60: '-' } },
      { substance: 'Oxalic acid', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Ozone', concentration: 'in air', temps: { 20: '+', 60: '+' } },
      { substance: 'Phosphoric acid', concentration: '25%', temps: { 20: '+', 60: '+' } },
      { substance: 'Phosphoric acid', concentration: '85%', temps: { 20: '+', 60: '+' } },
      { substance: 'Potassium carbonate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Potassium chloride', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Potassium hydroxide', concentration: '50%', temps: { 20: '+', 60: '+' } },
      { substance: 'Potassium nitrate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Potassium permanganate', concentration: '20%', temps: { 20: '+', 60: '+' } },
      { substance: 'Sea water', concentration: null, temps: { 20: '+', 60: '+' } },
      { substance: 'Silicone oil', concentration: null, temps: { 20: '+', 60: '+' } },
      { substance: 'Silver nitrate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Sodium bicarbonate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Sodium bisulphite', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Sodium carbonate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Sodium chloride', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Sodium hydroxide', concentration: '10%', temps: { 20: '+', 60: '+' } },
      { substance: 'Sodium hydroxide', concentration: '50%', temps: { 20: '+', 60: '+' } },
      { substance: 'Sodium hypochlorite', concentration: '15%', temps: { 20: '+', 60: '+' } },
      { substance: 'Sodium nitrate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Sodium silicate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Sodium sulphate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Sodium sulphide', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Sodium thiosulphate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Sulphur dioxide', concentration: 'dry', temps: { 20: '+', 60: '+' } },
      { substance: 'Sulphur dioxide', concentration: 'wet', temps: { 20: '+', 60: '+' } },
      { substance: 'Sulphuric acid', concentration: '10%', temps: { 20: '+', 60: '+' } },
      { substance: 'Sulphuric acid', concentration: '50%', temps: { 20: '+', 60: '+' } },
      { substance: 'Sulphuric acid', concentration: '70%', temps: { 20: '+', 60: '/' } },
      { substance: 'Sulphuric acid', concentration: '96%', temps: { 20: '/', 60: '-' } },
      { substance: 'Sulphuric acid', concentration: 'fuming', temps: { 20: '-', 60: '-' } },
      { substance: 'Toluene', concentration: '100%', temps: { 20: '/', 60: '-' } },
      { substance: 'Trichloroethylene', concentration: '100%', temps: { 20: '-', 60: '-' } },
      { substance: 'Urea', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Water', concentration: 'distilled', temps: { 20: '+', 60: '+' } },
      { substance: 'Xylene', concentration: '100%', temps: { 20: '/', 60: '-' } },
      { substance: 'Zinc chloride', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
      { substance: 'Zinc sulphate', concentration: 'saturated', temps: { 20: '+', 60: '+' } },
    ];

    const values: string[] = [];
    for (const chemical of chemicalData) {
      for (const [temp, rating] of Object.entries(chemical.temps)) {
        const concentration = chemical.concentration
          ? `'${chemical.concentration.replace(/'/g, "''")}'`
          : 'NULL';
        values.push(`('${chemical.substance}', ${concentration}, ${temp}, '${rating}')`);
      }
    }

    await queryRunner.query(`
      INSERT INTO hdpe_chemical_resistance (substance, concentration, temperature_c, hdpe_rating)
      VALUES ${values.join(',\n')}
      ON CONFLICT (substance, concentration, temperature_c) DO NOTHING
    `);

    console.warn(`Added ${values.length} HDPE chemical resistance entries.`);
  }

  private async populateFlowCoefficientsData(queryRunner: QueryRunner): Promise<void> {
    const existing = await queryRunner.query(`SELECT COUNT(*) as count FROM flow_coefficients`);
    if (parseInt(existing[0]?.count) > 0) {
      console.warn('Flow coefficients data already exists, skipping...');
      return;
    }
    console.warn('Populating flow coefficients data...');

    const flowData = [
      { material: 'HDPE', condition: 'New', hazenWilliamsC: 150, manningN: 0.009, absoluteRoughnessMm: 0.0015 },
      { material: 'HDPE', condition: '10 years service', hazenWilliamsC: 145, manningN: 0.0095, absoluteRoughnessMm: 0.003 },
      { material: 'HDPE', condition: '25 years service', hazenWilliamsC: 140, manningN: 0.01, absoluteRoughnessMm: 0.005 },
      { material: 'HDPE', condition: '50 years service', hazenWilliamsC: 130, manningN: 0.011, absoluteRoughnessMm: 0.01 },
      { material: 'PP', condition: 'New', hazenWilliamsC: 150, manningN: 0.009, absoluteRoughnessMm: 0.0015 },
      { material: 'PP', condition: '50 years service', hazenWilliamsC: 130, manningN: 0.011, absoluteRoughnessMm: 0.01 },
      { material: 'PVC', condition: 'New', hazenWilliamsC: 150, manningN: 0.009, absoluteRoughnessMm: 0.0015 },
      { material: 'PVC', condition: '50 years service', hazenWilliamsC: 140, manningN: 0.01, absoluteRoughnessMm: 0.005 },
      { material: 'Steel', condition: 'New', hazenWilliamsC: 150, manningN: 0.012, absoluteRoughnessMm: 0.045 },
      { material: 'Steel', condition: 'Light rust', hazenWilliamsC: 130, manningN: 0.015, absoluteRoughnessMm: 0.3 },
      { material: 'Steel', condition: 'Moderately corroded', hazenWilliamsC: 100, manningN: 0.02, absoluteRoughnessMm: 1.0 },
      { material: 'Steel', condition: 'Badly corroded', hazenWilliamsC: 60, manningN: 0.035, absoluteRoughnessMm: 3.0 },
      { material: 'Cast iron', condition: 'New', hazenWilliamsC: 130, manningN: 0.013, absoluteRoughnessMm: 0.25 },
      { material: 'Cast iron', condition: 'Moderately corroded', hazenWilliamsC: 100, manningN: 0.02, absoluteRoughnessMm: 1.0 },
      { material: 'Cast iron', condition: 'Badly corroded', hazenWilliamsC: 50, manningN: 0.04, absoluteRoughnessMm: 5.0 },
      { material: 'Ductile iron', condition: 'Cement lined', hazenWilliamsC: 140, manningN: 0.011, absoluteRoughnessMm: 0.025 },
      { material: 'Ductile iron', condition: 'Bitumen lined', hazenWilliamsC: 145, manningN: 0.01, absoluteRoughnessMm: 0.015 },
      { material: 'Concrete', condition: 'Smooth finish', hazenWilliamsC: 140, manningN: 0.012, absoluteRoughnessMm: 0.3 },
      { material: 'Concrete', condition: 'Average finish', hazenWilliamsC: 120, manningN: 0.015, absoluteRoughnessMm: 1.0 },
      { material: 'Concrete', condition: 'Rough finish', hazenWilliamsC: 100, manningN: 0.02, absoluteRoughnessMm: 3.0 },
      { material: 'Copper', condition: 'New', hazenWilliamsC: 140, manningN: 0.011, absoluteRoughnessMm: 0.0015 },
      { material: 'GRP/FRP', condition: 'New', hazenWilliamsC: 150, manningN: 0.009, absoluteRoughnessMm: 0.003 },
      { material: 'Stainless steel', condition: 'New', hazenWilliamsC: 150, manningN: 0.01, absoluteRoughnessMm: 0.015 },
      { material: 'Rubber lined', condition: 'New', hazenWilliamsC: 145, manningN: 0.01, absoluteRoughnessMm: 0.025 },
    ];

    const values = flowData.map(flow =>
      `('${flow.material}', '${flow.condition}', ${flow.hazenWilliamsC}, ${flow.manningN}, ${flow.absoluteRoughnessMm})`
    );

    await queryRunner.query(`
      INSERT INTO flow_coefficients (material, condition, hazen_williams_c, manning_n, absolute_roughness_mm)
      VALUES ${values.join(',\n')}
      ON CONFLICT (material, condition) DO NOTHING
    `);

    console.warn(`Added ${values.length} flow coefficients entries.`);
  }

  private async populateRubberChemicalCompatibilityData(queryRunner: QueryRunner): Promise<void> {
    const existing = await queryRunner.query(`SELECT COUNT(*) as count FROM rubber_chemical_compatibility`);
    if (parseInt(existing[0]?.count) > 0) {
      console.warn('Rubber chemical compatibility data already exists, skipping...');
      return;
    }
    console.warn('Populating rubber chemical compatibility data (ISO/TR 7620)...');

    const rubberTypeIds: { [key: string]: number | null } = {
      'NR/SBR': null,
      'Butyl': null,
      'EPDM': null,
      'NBR': null,
      'CSM': null,
    };

    const typeResult = await queryRunner.query(`
      SELECT id, polymer_codes FROM rubber_types
    `);

    for (const row of typeResult) {
      const codes = row.polymer_codes?.toUpperCase() || '';
      if (codes.includes('NR') || codes.includes('SBR')) {
        rubberTypeIds['NR/SBR'] = row.id;
      }
      if (codes.includes('IIR') || codes.includes('BUTYL')) {
        rubberTypeIds['Butyl'] = row.id;
      }
      if (codes.includes('EPDM')) {
        rubberTypeIds['EPDM'] = row.id;
      }
      if (codes.includes('NBR')) {
        rubberTypeIds['NBR'] = row.id;
      }
      if (codes.includes('CSM')) {
        rubberTypeIds['CSM'] = row.id;
      }
    }

    const compatibilityData = [
      { chemical: 'Sulphuric acid', concentration: '10-50%', temp: 60, ratings: { 'NR/SBR': 'A', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'B', 'CSM': 'A' } },
      { chemical: 'Sulphuric acid', concentration: '50-70%', temp: 60, ratings: { 'NR/SBR': 'C', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'C', 'CSM': 'A' } },
      { chemical: 'Sulphuric acid', concentration: '70-96%', temp: 60, ratings: { 'NR/SBR': 'C', 'Butyl': 'B', 'EPDM': 'C', 'NBR': 'C', 'CSM': 'B' } },
      { chemical: 'Hydrochloric acid', concentration: 'all conc', temp: 60, ratings: { 'NR/SBR': 'A', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'B', 'CSM': 'A' } },
      { chemical: 'Nitric acid', concentration: '10%', temp: 60, ratings: { 'NR/SBR': 'C', 'Butyl': 'B', 'EPDM': 'B', 'NBR': 'C', 'CSM': 'A' } },
      { chemical: 'Nitric acid', concentration: '50%', temp: 60, ratings: { 'NR/SBR': 'C', 'Butyl': 'C', 'EPDM': 'C', 'NBR': 'C', 'CSM': 'B' } },
      { chemical: 'Phosphoric acid', concentration: 'all conc', temp: 60, ratings: { 'NR/SBR': 'A', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'B', 'CSM': 'A' } },
      { chemical: 'Acetic acid', concentration: '10%', temp: 60, ratings: { 'NR/SBR': 'A', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'B', 'CSM': 'A' } },
      { chemical: 'Acetic acid', concentration: '100%', temp: 60, ratings: { 'NR/SBR': 'C', 'Butyl': 'C', 'EPDM': 'C', 'NBR': 'C', 'CSM': 'C' } },
      { chemical: 'Chromic acid', concentration: '10%', temp: 60, ratings: { 'NR/SBR': 'C', 'Butyl': 'C', 'EPDM': 'C', 'NBR': 'C', 'CSM': 'A' } },
      { chemical: 'Sodium hydroxide', concentration: '10-50%', temp: 60, ratings: { 'NR/SBR': 'A', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'A', 'CSM': 'A' } },
      { chemical: 'Ammonia', concentration: 'aqueous', temp: 60, ratings: { 'NR/SBR': 'A', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'B', 'CSM': 'C' } },
      { chemical: 'Sodium hypochlorite', concentration: '15%', temp: 60, ratings: { 'NR/SBR': 'C', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'C', 'CSM': 'A' } },
      { chemical: 'Chlorine', concentration: 'wet gas', temp: 20, ratings: { 'NR/SBR': 'C', 'Butyl': 'A', 'EPDM': 'C', 'NBR': 'C', 'CSM': 'A' } },
      { chemical: 'Mineral oils', concentration: null, temp: 60, ratings: { 'NR/SBR': 'C', 'Butyl': 'C', 'EPDM': 'C', 'NBR': 'A', 'CSM': 'B' } },
      { chemical: 'Diesel fuel', concentration: null, temp: 60, ratings: { 'NR/SBR': 'C', 'Butyl': 'C', 'EPDM': 'C', 'NBR': 'A', 'CSM': 'B' } },
      { chemical: 'Petrol/Gasoline', concentration: null, temp: 20, ratings: { 'NR/SBR': 'C', 'Butyl': 'C', 'EPDM': 'C', 'NBR': 'A', 'CSM': 'C' } },
      { chemical: 'Kerosene', concentration: null, temp: 60, ratings: { 'NR/SBR': 'C', 'Butyl': 'C', 'EPDM': 'C', 'NBR': 'A', 'CSM': 'B' } },
      { chemical: 'Benzene', concentration: null, temp: 20, ratings: { 'NR/SBR': 'C', 'Butyl': 'C', 'EPDM': 'C', 'NBR': 'B', 'CSM': 'C' } },
      { chemical: 'Toluene', concentration: null, temp: 20, ratings: { 'NR/SBR': 'C', 'Butyl': 'C', 'EPDM': 'C', 'NBR': 'B', 'CSM': 'C' } },
      { chemical: 'Xylene', concentration: null, temp: 20, ratings: { 'NR/SBR': 'C', 'Butyl': 'C', 'EPDM': 'C', 'NBR': 'B', 'CSM': 'C' } },
      { chemical: 'Acetone', concentration: null, temp: 20, ratings: { 'NR/SBR': 'A', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'C', 'CSM': 'A' } },
      { chemical: 'Methanol', concentration: '100%', temp: 20, ratings: { 'NR/SBR': 'A', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'A', 'CSM': 'A' } },
      { chemical: 'Ethanol', concentration: '96%', temp: 20, ratings: { 'NR/SBR': 'A', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'A', 'CSM': 'A' } },
      { chemical: 'Ethylene glycol', concentration: null, temp: 60, ratings: { 'NR/SBR': 'A', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'A', 'CSM': 'A' } },
      { chemical: 'Sea water', concentration: null, temp: 60, ratings: { 'NR/SBR': 'A', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'A', 'CSM': 'A' } },
      { chemical: 'Ozone', concentration: null, temp: 20, ratings: { 'NR/SBR': 'C', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'C', 'CSM': 'A' } },
      { chemical: 'Ferric chloride', concentration: 'saturated', temp: 60, ratings: { 'NR/SBR': 'B', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'B', 'CSM': 'A' } },
      { chemical: 'Ferrous sulphate', concentration: 'saturated', temp: 60, ratings: { 'NR/SBR': 'A', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'A', 'CSM': 'A' } },
      { chemical: 'Copper sulphate', concentration: 'saturated', temp: 60, ratings: { 'NR/SBR': 'A', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'A', 'CSM': 'A' } },
      { chemical: 'Zinc chloride', concentration: 'saturated', temp: 60, ratings: { 'NR/SBR': 'A', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'B', 'CSM': 'A' } },
      { chemical: 'Aluminium sulphate', concentration: 'saturated', temp: 60, ratings: { 'NR/SBR': 'A', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'A', 'CSM': 'A' } },
      { chemical: 'Hydrogen peroxide', concentration: '30%', temp: 20, ratings: { 'NR/SBR': 'C', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'C', 'CSM': 'B' } },
      { chemical: 'Formaldehyde', concentration: '40%', temp: 60, ratings: { 'NR/SBR': 'A', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'A', 'CSM': 'A' } },
      { chemical: 'Urea', concentration: 'solution', temp: 60, ratings: { 'NR/SBR': 'A', 'Butyl': 'A', 'EPDM': 'A', 'NBR': 'A', 'CSM': 'A' } },
    ];

    const values: string[] = [];
    for (const compat of compatibilityData) {
      for (const [rubberType, rating] of Object.entries(compat.ratings)) {
        const rubberTypeId = rubberTypeIds[rubberType];
        if (rubberTypeId) {
          const concentration = compat.concentration
            ? `'${compat.concentration.replace(/'/g, "''")}'`
            : 'NULL';
          values.push(`(${rubberTypeId}, '${compat.chemical}', ${concentration}, ${compat.temp}, '${rating}', 'ISO/TR 7620')`);
        }
      }
    }

    if (values.length > 0) {
      await queryRunner.query(`
        INSERT INTO rubber_chemical_compatibility (rubber_type_id, chemical, concentration, temperature_c, rating, iso_tr_7620_ref)
        VALUES ${values.join(',\n')}
        ON CONFLICT (rubber_type_id, chemical, concentration, temperature_c) DO NOTHING
      `);
    }

    console.warn(`Added ${values.length} rubber chemical compatibility entries.`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS rubber_chemical_compatibility`);
    await queryRunner.query(`DROP TABLE IF EXISTS flow_coefficients`);
    await queryRunner.query(`DROP TABLE IF EXISTS hdpe_chemical_resistance`);
  }
}
