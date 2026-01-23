import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStructuralSteelAndWeldFillerData1774600000000 implements MigrationInterface {
  name = 'AddStructuralSteelAndWeldFillerData1774600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding additional structural steel grades and weld filler metal data...');

    const additionalStructuralGrades = [
      {
        code: 'A572-65',
        name: 'ASTM A572 Grade 65',
        standard: 'ASTM',
        yieldMpa: 450,
        tensileMpa: 550,
        types: ['angle_equal', 'angle_unequal', 'channel', 'beam_wf', 'beam_i', 'plate'],
        desc: 'High-strength low-alloy structural steel - Grade 65',
      },
      {
        code: 'SABS1431-300WA',
        name: 'SABS 1431 Grade 300WA',
        standard: 'SABS',
        yieldMpa: 300,
        tensileMpa: 400,
        types: ['angle_equal', 'angle_unequal', 'channel', 'beam_wf', 'beam_i', 'plate', 'bar_flat', 'bar_round', 'bar_square'],
        desc: 'South African standard structural steel',
      },
      {
        code: 'SABS1431-350WA',
        name: 'SABS 1431 Grade 350WA',
        standard: 'SABS',
        yieldMpa: 350,
        tensileMpa: 450,
        types: ['angle_equal', 'angle_unequal', 'channel', 'beam_wf', 'beam_i', 'plate', 'bar_flat', 'bar_round', 'bar_square'],
        desc: 'South African high-strength structural steel',
      },
    ];

    for (const grade of additionalStructuralGrades) {
      await queryRunner.query(`
        INSERT INTO structural_steel_grades (code, name, standard, yield_strength_mpa, tensile_strength_mpa, compatible_types, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          standard = EXCLUDED.standard,
          yield_strength_mpa = EXCLUDED.yield_strength_mpa,
          tensile_strength_mpa = EXCLUDED.tensile_strength_mpa,
          compatible_types = EXCLUDED.compatible_types,
          description = EXCLUDED.description
      `, [grade.code, grade.name, grade.standard, grade.yieldMpa, grade.tensileMpa, JSON.stringify(grade.types), grade.desc]);
    }

    console.warn('Additional structural steel grades added.');

    console.warn('Adding weld filler metal specifications...');

    const weldFillers = [
      {
        code: 'E7018',
        name: 'E7018 Low Hydrogen SMAW Electrode',
        process: 'SMAW',
        awsClass: 'A5.1',
        minTensileKsi: 70,
        baseMaterials: 'Carbon Steel, A36, A572',
        shieldingGas: null,
        notes: 'Low hydrogen, all position, AC/DC+',
      },
      {
        code: 'E6010',
        name: 'E6010 Cellulosic SMAW Electrode',
        process: 'SMAW',
        awsClass: 'A5.1',
        minTensileKsi: 60,
        baseMaterials: 'Carbon Steel, Root Pass',
        shieldingGas: null,
        notes: 'Deep penetration, DC+ only, all position',
      },
      {
        code: 'E6011',
        name: 'E6011 Cellulosic SMAW Electrode',
        process: 'SMAW',
        awsClass: 'A5.1',
        minTensileKsi: 60,
        baseMaterials: 'Carbon Steel, Root Pass',
        shieldingGas: null,
        notes: 'Deep penetration, AC/DC+, all position',
      },
      {
        code: 'ER70S-2',
        name: 'ER70S-2 Carbon Steel GTAW/GMAW Wire',
        process: 'GTAW/GMAW',
        awsClass: 'A5.18',
        minTensileKsi: 70,
        baseMaterials: 'Carbon Steel, A106, A53',
        shieldingGas: 'Ar, Ar/CO2',
        notes: 'Triple deoxidized, excellent for rusty/dirty base metal',
      },
      {
        code: 'ER70S-3',
        name: 'ER70S-3 Carbon Steel GTAW/GMAW Wire',
        process: 'GTAW/GMAW',
        awsClass: 'A5.18',
        minTensileKsi: 70,
        baseMaterials: 'Carbon Steel, A106, A53',
        shieldingGas: 'Ar, CO2, Ar/CO2',
        notes: 'General purpose, clean base metal',
      },
      {
        code: 'ER70S-6',
        name: 'ER70S-6 Carbon Steel GTAW/GMAW Wire',
        process: 'GTAW/GMAW',
        awsClass: 'A5.18',
        minTensileKsi: 70,
        baseMaterials: 'Carbon Steel, A106, A53',
        shieldingGas: 'CO2, Ar/CO2',
        notes: 'High silicon, excellent wetting, spray transfer',
      },
      {
        code: 'E308-16',
        name: 'E308-16 Stainless SMAW Electrode',
        process: 'SMAW',
        awsClass: 'A5.4',
        minTensileKsi: 80,
        baseMaterials: '304, 304L Stainless',
        shieldingGas: null,
        notes: 'AC/DC+, all position, rutile coating',
      },
      {
        code: 'E308L-16',
        name: 'E308L-16 Low Carbon Stainless SMAW Electrode',
        process: 'SMAW',
        awsClass: 'A5.4',
        minTensileKsi: 75,
        baseMaterials: '304L Stainless',
        shieldingGas: null,
        notes: 'Low carbon for corrosion resistance',
      },
      {
        code: 'ER308',
        name: 'ER308 Stainless GTAW Wire',
        process: 'GTAW',
        awsClass: 'A5.9',
        minTensileKsi: 80,
        baseMaterials: '304 Stainless',
        shieldingGas: 'Ar, Ar/He',
        notes: 'Standard 304 filler',
      },
      {
        code: 'ER308L',
        name: 'ER308L Low Carbon Stainless GTAW Wire',
        process: 'GTAW',
        awsClass: 'A5.9',
        minTensileKsi: 75,
        baseMaterials: '304L Stainless',
        shieldingGas: 'Ar, Ar/He',
        notes: 'Low carbon for corrosion resistance',
      },
      {
        code: 'E316-16',
        name: 'E316-16 Stainless SMAW Electrode',
        process: 'SMAW',
        awsClass: 'A5.4',
        minTensileKsi: 80,
        baseMaterials: '316, 316L Stainless',
        shieldingGas: null,
        notes: 'Molybdenum bearing, improved corrosion resistance',
      },
      {
        code: 'E316L-16',
        name: 'E316L-16 Low Carbon Stainless SMAW Electrode',
        process: 'SMAW',
        awsClass: 'A5.4',
        minTensileKsi: 75,
        baseMaterials: '316L Stainless',
        shieldingGas: null,
        notes: 'Low carbon, superior intergranular corrosion resistance',
      },
      {
        code: 'ER316',
        name: 'ER316 Stainless GTAW Wire',
        process: 'GTAW',
        awsClass: 'A5.9',
        minTensileKsi: 80,
        baseMaterials: '316 Stainless',
        shieldingGas: 'Ar, Ar/He',
        notes: 'Standard 316 filler',
      },
      {
        code: 'ER316L',
        name: 'ER316L Low Carbon Stainless GTAW Wire',
        process: 'GTAW',
        awsClass: 'A5.9',
        minTensileKsi: 75,
        baseMaterials: '316L Stainless',
        shieldingGas: 'Ar, Ar/He',
        notes: 'Low carbon for corrosion resistance',
      },
      {
        code: 'E309-16',
        name: 'E309-16 Stainless SMAW Electrode',
        process: 'SMAW',
        awsClass: 'A5.4',
        minTensileKsi: 80,
        baseMaterials: 'Dissimilar metals, 304 to Carbon Steel',
        shieldingGas: null,
        notes: 'Transition/buffer layer electrode',
      },
      {
        code: 'ER309',
        name: 'ER309 Stainless GTAW Wire',
        process: 'GTAW',
        awsClass: 'A5.9',
        minTensileKsi: 80,
        baseMaterials: 'Dissimilar metals, Stainless to Carbon Steel',
        shieldingGas: 'Ar, Ar/He',
        notes: 'Transition/buffer layer filler',
      },
      {
        code: 'ER309L',
        name: 'ER309L Low Carbon Stainless GTAW Wire',
        process: 'GTAW',
        awsClass: 'A5.9',
        minTensileKsi: 75,
        baseMaterials: 'Dissimilar metals, Stainless to Carbon Steel',
        shieldingGas: 'Ar, Ar/He',
        notes: 'Low carbon transition filler',
      },
      {
        code: 'E347-16',
        name: 'E347-16 Stainless SMAW Electrode',
        process: 'SMAW',
        awsClass: 'A5.4',
        minTensileKsi: 80,
        baseMaterials: '321, 347 Stainless',
        shieldingGas: null,
        notes: 'Nb stabilized for high temperature service',
      },
      {
        code: 'ER347',
        name: 'ER347 Stainless GTAW Wire',
        process: 'GTAW',
        awsClass: 'A5.9',
        minTensileKsi: 80,
        baseMaterials: '321, 347 Stainless',
        shieldingGas: 'Ar, Ar/He',
        notes: 'Nb stabilized filler',
      },
      {
        code: 'E2209-16',
        name: 'E2209-16 Duplex Stainless SMAW Electrode',
        process: 'SMAW',
        awsClass: 'A5.4',
        minTensileKsi: 100,
        baseMaterials: '2205 Duplex Stainless',
        shieldingGas: null,
        notes: '22Cr-9Ni-3Mo duplex filler',
      },
      {
        code: 'ER2209',
        name: 'ER2209 Duplex Stainless GTAW Wire',
        process: 'GTAW',
        awsClass: 'A5.9',
        minTensileKsi: 100,
        baseMaterials: '2205 Duplex Stainless',
        shieldingGas: 'Ar, Ar/N2',
        notes: '22Cr-9Ni-3Mo duplex filler, use N2 backing',
      },
      {
        code: 'ER2594',
        name: 'ER2594 Super Duplex GTAW Wire',
        process: 'GTAW',
        awsClass: 'A5.9',
        minTensileKsi: 116,
        baseMaterials: '2507 Super Duplex',
        shieldingGas: 'Ar, Ar/N2',
        notes: '25Cr-9Ni-4Mo super duplex filler',
      },
      {
        code: 'E8018-B2',
        name: 'E8018-B2 Chrome-Moly SMAW Electrode',
        process: 'SMAW',
        awsClass: 'A5.5',
        minTensileKsi: 80,
        baseMaterials: '1.25Cr-0.5Mo Steel (P11/T11)',
        shieldingGas: null,
        notes: 'Low hydrogen, PWHT required',
      },
      {
        code: 'ER80S-B2',
        name: 'ER80S-B2 Chrome-Moly GTAW Wire',
        process: 'GTAW',
        awsClass: 'A5.28',
        minTensileKsi: 80,
        baseMaterials: '1.25Cr-0.5Mo Steel (P11/T11)',
        shieldingGas: 'Ar',
        notes: 'PWHT required',
      },
      {
        code: 'E9018-B3',
        name: 'E9018-B3 Chrome-Moly SMAW Electrode',
        process: 'SMAW',
        awsClass: 'A5.5',
        minTensileKsi: 90,
        baseMaterials: '2.25Cr-1Mo Steel (P22/T22)',
        shieldingGas: null,
        notes: 'Low hydrogen, PWHT required',
      },
      {
        code: 'ER90S-B3',
        name: 'ER90S-B3 Chrome-Moly GTAW Wire',
        process: 'GTAW',
        awsClass: 'A5.28',
        minTensileKsi: 90,
        baseMaterials: '2.25Cr-1Mo Steel (P22/T22)',
        shieldingGas: 'Ar',
        notes: 'PWHT required',
      },
      {
        code: 'E9015-B9',
        name: 'E9015-B9 P91 SMAW Electrode',
        process: 'SMAW',
        awsClass: 'A5.5',
        minTensileKsi: 90,
        baseMaterials: '9Cr-1Mo-V Steel (P91)',
        shieldingGas: null,
        notes: 'Modified 9Cr-1Mo, strict preheat/PWHT required',
      },
      {
        code: 'ER90S-B9',
        name: 'ER90S-B9 P91 GTAW Wire',
        process: 'GTAW',
        awsClass: 'A5.28',
        minTensileKsi: 90,
        baseMaterials: '9Cr-1Mo-V Steel (P91)',
        shieldingGas: 'Ar',
        notes: 'Strict preheat/PWHT required',
      },
      {
        code: 'ENiCrFe-3',
        name: 'ENiCrFe-3 (Inconel 182) SMAW Electrode',
        process: 'SMAW',
        awsClass: 'A5.11',
        minTensileKsi: 80,
        baseMaterials: 'Inconel 600, Dissimilar metals',
        shieldingGas: null,
        notes: 'Ni-Cr-Fe alloy, excellent for dissimilar joints',
      },
      {
        code: 'ERNiCrFe-7',
        name: 'ERNiCrFe-7 (FM52) GTAW Wire',
        process: 'GTAW',
        awsClass: 'A5.14',
        minTensileKsi: 75,
        baseMaterials: 'Inconel 690, Nuclear applications',
        shieldingGas: 'Ar, Ar/He',
        notes: 'High Cr Ni-Cr-Fe alloy',
      },
      {
        code: 'ERNiCrMo-3',
        name: 'ERNiCrMo-3 (Inconel 625) GTAW Wire',
        process: 'GTAW',
        awsClass: 'A5.14',
        minTensileKsi: 100,
        baseMaterials: 'Inconel 625, Dissimilar metals',
        shieldingGas: 'Ar, Ar/He',
        notes: 'Universal high-performance filler',
      },
      {
        code: 'ERNiCrMo-4',
        name: 'ERNiCrMo-4 (Hastelloy C-276) GTAW Wire',
        process: 'GTAW',
        awsClass: 'A5.14',
        minTensileKsi: 100,
        baseMaterials: 'Hastelloy C-276, C-22',
        shieldingGas: 'Ar, Ar/He',
        notes: 'Excellent corrosion resistance',
      },
      {
        code: 'ERNiCu-7',
        name: 'ERNiCu-7 (Monel 60) GTAW Wire',
        process: 'GTAW',
        awsClass: 'A5.14',
        minTensileKsi: 70,
        baseMaterials: 'Monel 400, Cu-Ni alloys',
        shieldingGas: 'Ar',
        notes: 'Ni-Cu alloy filler',
      },
    ];

    const checkTableExists = async (tableName: string): Promise<boolean> => {
      const result = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = '${tableName}'
        )
      `);
      return result[0]?.exists === true;
    };

    const weldFillerTableExists = await checkTableExists('weld_filler_metals');

    if (!weldFillerTableExists) {
      console.warn('Creating weld_filler_metals table...');
      await queryRunner.query(`
        CREATE TABLE weld_filler_metals (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(200) NOT NULL,
          process VARCHAR(50),
          "awsClass" VARCHAR(20),
          "minTensileKsi" DECIMAL(10,2),
          "baseMaterials" TEXT,
          "shieldingGas" VARCHAR(100),
          notes TEXT,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    for (const filler of weldFillers) {
      const shieldingGasValue = filler.shieldingGas ? `'${filler.shieldingGas}'` : 'NULL';
      await queryRunner.query(`
        INSERT INTO weld_filler_metals (code, name, process, "awsClass", "minTensileKsi", "baseMaterials", "shieldingGas", notes)
        VALUES ('${filler.code}', '${filler.name}', '${filler.process}', '${filler.awsClass}', ${filler.minTensileKsi}, '${filler.baseMaterials}', ${shieldingGasValue}, '${filler.notes}')
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          process = EXCLUDED.process,
          "awsClass" = EXCLUDED."awsClass",
          "minTensileKsi" = EXCLUDED."minTensileKsi",
          "baseMaterials" = EXCLUDED."baseMaterials",
          "shieldingGas" = EXCLUDED."shieldingGas",
          notes = EXCLUDED.notes
      `);
    }

    console.warn('Weld filler metal specifications added.');

    console.warn('Creating material physical properties table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS material_physical_properties (
        id SERIAL PRIMARY KEY,
        material_code VARCHAR(100) NOT NULL UNIQUE,
        material_name VARCHAR(255),
        density_kg_m3 DECIMAL(10,2),
        thermal_expansion_coeff DECIMAL(10,4),
        thermal_conductivity_w_mk DECIMAL(10,2),
        specific_heat_j_kgk DECIMAL(10,2),
        elastic_modulus_gpa DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const materialProperties = [
      { code: 'CARBON_STEEL', name: 'Carbon Steel (General)', density: 7850, expansion: 11.7, conductivity: 51.9, heat: 486, modulus: 200 },
      { code: 'A106_GRB', name: 'ASTM A106 Grade B', density: 7850, expansion: 11.7, conductivity: 51.9, heat: 486, modulus: 200 },
      { code: 'A333_GR6', name: 'ASTM A333 Grade 6', density: 7850, expansion: 11.7, conductivity: 51.9, heat: 486, modulus: 200 },
      { code: 'A335_P11', name: 'ASTM A335 P11 (1.25Cr-0.5Mo)', density: 7750, expansion: 12.1, conductivity: 42.3, heat: 473, modulus: 207 },
      { code: 'A335_P22', name: 'ASTM A335 P22 (2.25Cr-1Mo)', density: 7750, expansion: 12.4, conductivity: 38.1, heat: 473, modulus: 207 },
      { code: 'A335_P91', name: 'ASTM A335 P91 (9Cr-1Mo-V)', density: 7770, expansion: 10.8, conductivity: 26.0, heat: 460, modulus: 218 },
      { code: 'SS304', name: 'Type 304 Stainless Steel', density: 8000, expansion: 17.3, conductivity: 16.2, heat: 500, modulus: 193 },
      { code: 'SS304L', name: 'Type 304L Stainless Steel', density: 8000, expansion: 17.3, conductivity: 16.2, heat: 500, modulus: 193 },
      { code: 'SS316', name: 'Type 316 Stainless Steel', density: 8000, expansion: 16.0, conductivity: 16.3, heat: 500, modulus: 193 },
      { code: 'SS316L', name: 'Type 316L Stainless Steel', density: 8000, expansion: 16.0, conductivity: 16.3, heat: 500, modulus: 193 },
      { code: 'SS321', name: 'Type 321 Stainless Steel', density: 8000, expansion: 16.6, conductivity: 16.1, heat: 500, modulus: 193 },
      { code: 'SS347', name: 'Type 347 Stainless Steel', density: 8000, expansion: 16.6, conductivity: 16.1, heat: 500, modulus: 193 },
      { code: 'DUPLEX_2205', name: 'Duplex 2205 (S31803/S32205)', density: 7800, expansion: 13.0, conductivity: 15.0, heat: 480, modulus: 200 },
      { code: 'SUPER_DUPLEX_2507', name: 'Super Duplex 2507 (S32750)', density: 7800, expansion: 13.0, conductivity: 14.0, heat: 480, modulus: 200 },
      { code: 'INCONEL_625', name: 'Inconel 625 (N06625)', density: 8440, expansion: 12.8, conductivity: 9.8, heat: 410, modulus: 208 },
      { code: 'INCOLOY_800H', name: 'Incoloy 800H (N08810)', density: 7940, expansion: 14.4, conductivity: 11.5, heat: 460, modulus: 196 },
      { code: 'MONEL_400', name: 'Monel 400 (N04400)', density: 8800, expansion: 13.9, conductivity: 21.8, heat: 427, modulus: 179 },
      { code: 'INCONEL_600', name: 'Inconel 600 (N06600)', density: 8470, expansion: 13.3, conductivity: 14.9, heat: 444, modulus: 214 },
      { code: 'HASTELLOY_C276', name: 'Hastelloy C-276 (N10276)', density: 8890, expansion: 11.2, conductivity: 10.2, heat: 427, modulus: 205 },
      { code: 'A36_STRUCTURAL', name: 'ASTM A36 Structural Steel', density: 7850, expansion: 11.7, conductivity: 51.9, heat: 486, modulus: 200 },
      { code: 'A572_50', name: 'ASTM A572 Grade 50', density: 7850, expansion: 11.7, conductivity: 51.9, heat: 486, modulus: 200 },
    ];

    for (const props of materialProperties) {
      await queryRunner.query(`
        INSERT INTO material_physical_properties (material_code, material_name, density_kg_m3, thermal_expansion_coeff, thermal_conductivity_w_mk, specific_heat_j_kgk, elastic_modulus_gpa)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (material_code) DO UPDATE SET
          material_name = EXCLUDED.material_name,
          density_kg_m3 = EXCLUDED.density_kg_m3,
          thermal_expansion_coeff = EXCLUDED.thermal_expansion_coeff,
          thermal_conductivity_w_mk = EXCLUDED.thermal_conductivity_w_mk,
          specific_heat_j_kgk = EXCLUDED.specific_heat_j_kgk,
          elastic_modulus_gpa = EXCLUDED.elastic_modulus_gpa
      `, [props.code, props.name, props.density, props.expansion, props.conductivity, props.heat, props.modulus]);
    }

    console.warn('Material physical properties added.');
    console.warn('Structural steel and weld filler data migration complete.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('Dropping weld_filler_metals and material_physical_properties tables...');
    await queryRunner.query(`DROP TABLE IF EXISTS weld_filler_metals`);
    await queryRunner.query(`DROP TABLE IF EXISTS material_physical_properties`);
    await queryRunner.query(`DELETE FROM structural_steel_grades WHERE code IN ('A572-65', 'SABS1431-300WA', 'SABS1431-350WA')`);
    console.warn('Rollback complete');
  }
}
