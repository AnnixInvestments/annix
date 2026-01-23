import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRemainingSystemEnhancements1775000000000
  implements MigrationInterface
{
  name = 'AddRemainingSystemEnhancements1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding remaining system enhancements (Pass 5)...');

    // ============================================================
    // PART 1: NPS to DN Mapping Table
    // ============================================================
    console.warn('Adding NPS to DN mapping table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS nps_dn_mapping (
        id SERIAL PRIMARY KEY,
        nps_inch VARCHAR(10) NOT NULL,
        nps_decimal DECIMAL(8,4) NOT NULL,
        dn_mm INTEGER NOT NULL,
        outside_diameter_mm DECIMAL(10,2) NOT NULL,
        outside_diameter_inch DECIMAL(10,4) NOT NULL,
        notes VARCHAR(200),
        UNIQUE(nps_inch)
      )
    `);

    const npsDnMappings = [
      { nps: '1/8', npsDecimal: 0.125, dn: 6, odMm: 10.3, odInch: 0.405 },
      { nps: '1/4', npsDecimal: 0.25, dn: 8, odMm: 13.7, odInch: 0.54 },
      { nps: '3/8', npsDecimal: 0.375, dn: 10, odMm: 17.1, odInch: 0.675 },
      { nps: '1/2', npsDecimal: 0.5, dn: 15, odMm: 21.3, odInch: 0.84 },
      { nps: '3/4', npsDecimal: 0.75, dn: 20, odMm: 26.7, odInch: 1.05 },
      { nps: '1', npsDecimal: 1.0, dn: 25, odMm: 33.4, odInch: 1.315 },
      { nps: '1-1/4', npsDecimal: 1.25, dn: 32, odMm: 42.2, odInch: 1.66 },
      { nps: '1-1/2', npsDecimal: 1.5, dn: 40, odMm: 48.3, odInch: 1.9 },
      { nps: '2', npsDecimal: 2.0, dn: 50, odMm: 60.3, odInch: 2.375 },
      { nps: '2-1/2', npsDecimal: 2.5, dn: 65, odMm: 73.0, odInch: 2.875 },
      { nps: '3', npsDecimal: 3.0, dn: 80, odMm: 88.9, odInch: 3.5 },
      { nps: '3-1/2', npsDecimal: 3.5, dn: 90, odMm: 101.6, odInch: 4.0 },
      { nps: '4', npsDecimal: 4.0, dn: 100, odMm: 114.3, odInch: 4.5 },
      { nps: '5', npsDecimal: 5.0, dn: 125, odMm: 141.3, odInch: 5.563 },
      { nps: '6', npsDecimal: 6.0, dn: 150, odMm: 168.3, odInch: 6.625 },
      { nps: '8', npsDecimal: 8.0, dn: 200, odMm: 219.1, odInch: 8.625 },
      { nps: '10', npsDecimal: 10.0, dn: 250, odMm: 273.0, odInch: 10.75 },
      { nps: '12', npsDecimal: 12.0, dn: 300, odMm: 323.9, odInch: 12.75 },
      { nps: '14', npsDecimal: 14.0, dn: 350, odMm: 355.6, odInch: 14.0 },
      { nps: '16', npsDecimal: 16.0, dn: 400, odMm: 406.4, odInch: 16.0 },
      { nps: '18', npsDecimal: 18.0, dn: 450, odMm: 457.2, odInch: 18.0 },
      { nps: '20', npsDecimal: 20.0, dn: 500, odMm: 508.0, odInch: 20.0 },
      { nps: '22', npsDecimal: 22.0, dn: 550, odMm: 558.8, odInch: 22.0 },
      { nps: '24', npsDecimal: 24.0, dn: 600, odMm: 609.6, odInch: 24.0 },
      { nps: '26', npsDecimal: 26.0, dn: 650, odMm: 660.4, odInch: 26.0 },
      { nps: '28', npsDecimal: 28.0, dn: 700, odMm: 711.2, odInch: 28.0 },
      { nps: '30', npsDecimal: 30.0, dn: 750, odMm: 762.0, odInch: 30.0 },
      { nps: '32', npsDecimal: 32.0, dn: 800, odMm: 812.8, odInch: 32.0 },
      { nps: '34', npsDecimal: 34.0, dn: 850, odMm: 863.6, odInch: 34.0 },
      { nps: '36', npsDecimal: 36.0, dn: 900, odMm: 914.4, odInch: 36.0 },
      { nps: '42', npsDecimal: 42.0, dn: 1050, odMm: 1066.8, odInch: 42.0 },
      { nps: '48', npsDecimal: 48.0, dn: 1200, odMm: 1219.2, odInch: 48.0 },
      { nps: '54', npsDecimal: 54.0, dn: 1350, odMm: 1371.6, odInch: 54.0 },
      { nps: '60', npsDecimal: 60.0, dn: 1500, odMm: 1524.0, odInch: 60.0 },
    ];

    for (const m of npsDnMappings) {
      await queryRunner.query(
        `
        INSERT INTO nps_dn_mapping (nps_inch, nps_decimal, dn_mm, outside_diameter_mm, outside_diameter_inch)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (nps_inch) DO UPDATE SET
          nps_decimal = EXCLUDED.nps_decimal,
          dn_mm = EXCLUDED.dn_mm,
          outside_diameter_mm = EXCLUDED.outside_diameter_mm,
          outside_diameter_inch = EXCLUDED.outside_diameter_inch
      `,
        [m.nps, m.npsDecimal, m.dn, m.odMm, m.odInch]
      );
    }

    // ============================================================
    // PART 2: Galvanic Corrosion Compatibility Matrix
    // ============================================================
    console.warn('Adding galvanic corrosion compatibility matrix...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS galvanic_series (
        id SERIAL PRIMARY KEY,
        material_name VARCHAR(100) NOT NULL,
        material_category VARCHAR(50),
        potential_range_mv_low INTEGER NOT NULL,
        potential_range_mv_high INTEGER NOT NULL,
        seawater_rank INTEGER,
        notes TEXT,
        UNIQUE(material_name)
      )
    `);

    const galvanicSeries = [
      { name: 'Magnesium', cat: 'Active Metal', low: -1600, high: -1500, rank: 1 },
      { name: 'Zinc', cat: 'Active Metal', low: -1100, high: -1000, rank: 2 },
      { name: 'Aluminum 1100', cat: 'Aluminum', low: -900, high: -850, rank: 3 },
      { name: 'Aluminum 2024-T4', cat: 'Aluminum', low: -850, high: -750, rank: 4 },
      { name: 'Cadmium', cat: 'Active Metal', low: -800, high: -700, rank: 5 },
      { name: 'Carbon Steel', cat: 'Carbon Steel', low: -700, high: -600, rank: 6 },
      { name: 'Cast Iron', cat: 'Carbon Steel', low: -700, high: -600, rank: 7 },
      { name: 'Low Alloy Steel', cat: 'Alloy Steel', low: -650, high: -550, rank: 8 },
      { name: 'Type 410 SS (active)', cat: 'Stainless Steel', low: -600, high: -500, rank: 9 },
      { name: 'Type 430 SS (active)', cat: 'Stainless Steel', low: -600, high: -500, rank: 10 },
      { name: 'Lead', cat: 'Soft Metal', low: -550, high: -450, rank: 11 },
      { name: 'Tin', cat: 'Soft Metal', low: -500, high: -400, rank: 12 },
      { name: 'Naval Brass', cat: 'Copper Alloy', low: -400, high: -300, rank: 13 },
      { name: 'Yellow Brass', cat: 'Copper Alloy', low: -400, high: -300, rank: 14 },
      { name: 'Admiralty Brass', cat: 'Copper Alloy', low: -350, high: -250, rank: 15 },
      { name: 'Copper', cat: 'Copper Alloy', low: -350, high: -200, rank: 16 },
      { name: 'Bronze (G/M)', cat: 'Copper Alloy', low: -350, high: -200, rank: 17 },
      { name: '90-10 Cu-Ni', cat: 'Copper Alloy', low: -300, high: -200, rank: 18 },
      { name: '70-30 Cu-Ni', cat: 'Copper Alloy', low: -250, high: -150, rank: 19 },
      { name: 'Nickel 200', cat: 'Nickel Alloy', low: -200, high: -100, rank: 20 },
      { name: 'Monel 400', cat: 'Nickel Alloy', low: -150, high: -50, rank: 21 },
      { name: 'Type 304 SS (passive)', cat: 'Stainless Steel', low: -100, high: 0, rank: 22 },
      { name: 'Type 316 SS (passive)', cat: 'Stainless Steel', low: -50, high: 50, rank: 23 },
      { name: 'Type 317 SS (passive)', cat: 'Stainless Steel', low: -50, high: 50, rank: 24 },
      { name: 'Alloy 20', cat: 'Nickel Alloy', low: 0, high: 100, rank: 25 },
      { name: 'Duplex 2205', cat: 'Stainless Steel', low: 0, high: 100, rank: 26 },
      { name: 'Super Duplex 2507', cat: 'Stainless Steel', low: 50, high: 150, rank: 27 },
      { name: 'Inconel 625', cat: 'Nickel Alloy', low: 50, high: 150, rank: 28 },
      { name: 'Hastelloy C-276', cat: 'Nickel Alloy', low: 100, high: 200, rank: 29 },
      { name: 'Titanium', cat: 'Reactive Metal', low: 100, high: 250, rank: 30 },
      { name: 'Graphite', cat: 'Noble', low: 200, high: 350, rank: 31 },
      { name: 'Platinum', cat: 'Noble', low: 300, high: 400, rank: 32 },
    ];

    for (const g of galvanicSeries) {
      await queryRunner.query(
        `
        INSERT INTO galvanic_series (material_name, material_category, potential_range_mv_low, potential_range_mv_high, seawater_rank)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (material_name) DO UPDATE SET
          material_category = EXCLUDED.material_category,
          potential_range_mv_low = EXCLUDED.potential_range_mv_low,
          potential_range_mv_high = EXCLUDED.potential_range_mv_high,
          seawater_rank = EXCLUDED.seawater_rank
      `,
        [g.name, g.cat, g.low, g.high, g.rank]
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS galvanic_compatibility (
        id SERIAL PRIMARY KEY,
        material_1 VARCHAR(100) NOT NULL,
        material_2 VARCHAR(100) NOT NULL,
        compatibility VARCHAR(20) NOT NULL,
        potential_difference_mv INTEGER,
        notes TEXT,
        UNIQUE(material_1, material_2)
      )
    `);

    const compatibilityRules = [
      { m1: 'Carbon Steel', m2: 'Type 304 SS (passive)', compat: 'Caution', diff: 550 },
      { m1: 'Carbon Steel', m2: 'Type 316 SS (passive)', compat: 'Caution', diff: 600 },
      { m1: 'Carbon Steel', m2: 'Copper', compat: 'Avoid', diff: 400 },
      { m1: 'Carbon Steel', m2: 'Bronze (G/M)', compat: 'Avoid', diff: 400 },
      { m1: 'Carbon Steel', m2: 'Monel 400', compat: 'Avoid', diff: 550 },
      { m1: 'Carbon Steel', m2: 'Inconel 625', compat: 'Avoid', diff: 750 },
      { m1: 'Carbon Steel', m2: 'Titanium', compat: 'Avoid', diff: 800 },
      { m1: 'Carbon Steel', m2: 'Zinc', compat: 'Compatible', diff: 350, notes: 'Zinc sacrificial anode' },
      { m1: 'Type 304 SS (passive)', m2: 'Type 316 SS (passive)', compat: 'Compatible', diff: 50 },
      { m1: 'Type 304 SS (passive)', m2: 'Monel 400', compat: 'Compatible', diff: 50 },
      { m1: 'Type 316 SS (passive)', m2: 'Duplex 2205', compat: 'Compatible', diff: 50 },
      { m1: 'Type 316 SS (passive)', m2: 'Inconel 625', compat: 'Compatible', diff: 100 },
      { m1: 'Duplex 2205', m2: 'Super Duplex 2507', compat: 'Compatible', diff: 50 },
      { m1: 'Inconel 625', m2: 'Hastelloy C-276', compat: 'Compatible', diff: 50 },
      { m1: 'Inconel 625', m2: 'Titanium', compat: 'Compatible', diff: 50 },
      { m1: 'Copper', m2: '90-10 Cu-Ni', compat: 'Compatible', diff: 50 },
      { m1: 'Copper', m2: '70-30 Cu-Ni', compat: 'Compatible', diff: 100 },
      { m1: 'Aluminum 1100', m2: 'Carbon Steel', compat: 'Avoid', diff: 200 },
      { m1: 'Aluminum 1100', m2: 'Copper', compat: 'Avoid', diff: 550 },
      { m1: 'Aluminum 1100', m2: 'Type 304 SS (passive)', compat: 'Avoid', diff: 800 },
    ];

    for (const c of compatibilityRules) {
      await queryRunner.query(
        `
        INSERT INTO galvanic_compatibility (material_1, material_2, compatibility, potential_difference_mv, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (material_1, material_2) DO UPDATE SET
          compatibility = EXCLUDED.compatibility,
          potential_difference_mv = EXCLUDED.potential_difference_mv,
          notes = EXCLUDED.notes
      `,
        [c.m1, c.m2, c.compat, c.diff, c.notes || null]
      );
    }

    // ============================================================
    // PART 3: Environmental Cracking Susceptibility Data
    // ============================================================
    console.warn('Adding environmental cracking susceptibility data...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS environmental_cracking_susceptibility (
        id SERIAL PRIMARY KEY,
        material_code VARCHAR(50) NOT NULL,
        cracking_mechanism VARCHAR(50) NOT NULL,
        susceptibility VARCHAR(20) NOT NULL,
        conditions TEXT,
        mitigation TEXT,
        reference_standard VARCHAR(100),
        UNIQUE(material_code, cracking_mechanism)
      )
    `);

    const crackingData = [
      { mat: 'A106 Grade B', mech: 'H2S (SSC)', susc: 'Susceptible', cond: 'pH < 4, H2S > 50 ppm, hardness > 22 HRC', mit: 'Limit hardness to 22 HRC max, use NACE MR0175 compliant', ref: 'NACE MR0175/ISO 15156' },
      { mat: 'A106 Grade B', mech: 'Caustic SCC', susc: 'Susceptible', cond: 'NaOH > 5%, temp > 50C', mit: 'PWHT required, limit concentration/temperature', ref: 'API RP 571' },
      { mat: 'A106 Grade B', mech: 'Carbonate SCC', susc: 'Susceptible', cond: 'CO3/HCO3 solutions, temp > 70C', mit: 'PWHT required', ref: 'API RP 571' },
      { mat: 'A106 Grade B', mech: 'HIC/SOHIC', susc: 'Susceptible', cond: 'Wet H2S service, high sulfur steel', mit: 'Use HIC-resistant steel per NACE TM0284', ref: 'NACE TM0284' },
      { mat: 'A312 TP304', mech: 'Chloride SCC', susc: 'Susceptible', cond: 'Cl > 10 ppm, temp > 60C, tensile stress', mit: 'Use 316L, duplex, or Ni alloys', ref: 'API RP 571' },
      { mat: 'A312 TP304L', mech: 'Chloride SCC', susc: 'Susceptible', cond: 'Cl > 10 ppm, temp > 60C', mit: 'Use duplex or Ni alloys above 80C', ref: 'API RP 571' },
      { mat: 'A312 TP316', mech: 'Chloride SCC', susc: 'Moderate', cond: 'Cl > 100 ppm, temp > 60C', mit: 'Use duplex above 80C', ref: 'API RP 571' },
      { mat: 'A312 TP316L', mech: 'Chloride SCC', susc: 'Moderate', cond: 'Cl > 100 ppm, temp > 60C', mit: 'Use duplex above 100C', ref: 'API RP 571' },
      { mat: 'A312 TP304', mech: 'Polythionic Acid SCC', susc: 'Susceptible', cond: 'Sensitized material, sulfur compounds, moisture, air', mit: 'Use stabilized grades (321, 347) or L grades, soda ash wash', ref: 'NACE SP0170' },
      { mat: 'A312 TP321', mech: 'Polythionic Acid SCC', susc: 'Resistant', cond: 'Stabilized grade', mit: 'Solution anneal after welding', ref: 'NACE SP0170' },
      { mat: 'A312 TP347', mech: 'Polythionic Acid SCC', susc: 'Resistant', cond: 'Stabilized grade', mit: 'Solution anneal after welding', ref: 'NACE SP0170' },
      { mat: 'A790 S31803', mech: 'Chloride SCC', susc: 'Resistant', cond: 'Good resistance to 150C', mit: 'Verify ferrite/austenite balance', ref: 'API RP 571' },
      { mat: 'A790 S32205', mech: 'Chloride SCC', susc: 'Resistant', cond: 'Good resistance to 150C', mit: 'Verify ferrite/austenite balance', ref: 'API RP 571' },
      { mat: 'A790 S32750', mech: 'Chloride SCC', susc: 'Highly Resistant', cond: 'Good resistance to 200C', mit: 'Control intermetallic phases', ref: 'API RP 571' },
      { mat: 'A335 P5', mech: 'H2S (SSC)', susc: 'Moderate', cond: 'Tempered condition OK', mit: 'PWHT required, hardness < 22 HRC', ref: 'NACE MR0175' },
      { mat: 'A335 P11', mech: 'H2S (SSC)', susc: 'Moderate', cond: 'Tempered condition OK', mit: 'PWHT required, hardness < 22 HRC', ref: 'NACE MR0175' },
      { mat: 'A335 P22', mech: 'H2S (SSC)', susc: 'Moderate', cond: 'Tempered condition OK', mit: 'PWHT required, hardness < 22 HRC', ref: 'NACE MR0175' },
      { mat: 'A335 P91', mech: 'H2S (SSC)', susc: 'Moderate', cond: 'Tempered condition, hardness critical', mit: 'Strict PWHT, hardness < 250 HB', ref: 'NACE MR0175' },
      { mat: 'Monel 400', mech: 'H2S (SSC)', susc: 'Resistant', cond: 'Good H2S resistance', mit: 'Limit hardness for severe service', ref: 'NACE MR0175' },
      { mat: 'Inconel 625', mech: 'Chloride SCC', susc: 'Highly Resistant', cond: 'Excellent resistance', mit: 'Standard practice', ref: 'API RP 571' },
      { mat: 'Inconel 625', mech: 'H2S (SSC)', susc: 'Resistant', cond: 'Age-hardened condition may be susceptible', mit: 'Use solution annealed condition', ref: 'NACE MR0175' },
      { mat: 'Hastelloy C-276', mech: 'Chloride SCC', susc: 'Highly Resistant', cond: 'Excellent resistance', mit: 'Standard practice', ref: 'API RP 571' },
      { mat: 'Hastelloy C-276', mech: 'H2S (SSC)', susc: 'Resistant', cond: 'Good resistance', mit: 'Solution annealed condition', ref: 'NACE MR0175' },
    ];

    for (const c of crackingData) {
      await queryRunner.query(
        `
        INSERT INTO environmental_cracking_susceptibility (material_code, cracking_mechanism, susceptibility, conditions, mitigation, reference_standard)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (material_code, cracking_mechanism) DO UPDATE SET
          susceptibility = EXCLUDED.susceptibility,
          conditions = EXCLUDED.conditions,
          mitigation = EXCLUDED.mitigation,
          reference_standard = EXCLUDED.reference_standard
      `,
        [c.mat, c.mech, c.susc, c.cond, c.mit, c.ref]
      );
    }

    // ============================================================
    // PART 4: Coating/Lining Compatibility Data
    // ============================================================
    console.warn('Adding coating/lining compatibility data...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coating_lining_compatibility (
        id SERIAL PRIMARY KEY,
        coating_type VARCHAR(100) NOT NULL,
        coating_category VARCHAR(50),
        max_temp_c INTEGER,
        min_temp_c INTEGER,
        chemical_resistance TEXT,
        suitable_services TEXT,
        not_suitable_for TEXT,
        typical_dft_microns VARCHAR(50),
        UNIQUE(coating_type)
      )
    `);

    const coatingData = [
      { type: 'Fusion Bonded Epoxy (FBE)', cat: 'Thermosetting', maxT: 110, minT: -40, chem: 'Good acid/alkali resistance, moderate solvent resistance', suit: 'Water, crude oil, natural gas', notSuit: 'Strong solvents, aromatic hydrocarbons above 80C', dft: '300-500' },
      { type: 'Coal Tar Epoxy', cat: 'Thermosetting', maxT: 60, minT: -10, chem: 'Excellent water resistance, good chemical resistance', suit: 'Immersion service, marine, buried pipe', notSuit: 'High temperature, UV exposure', dft: '400-800' },
      { type: 'Polyurethane', cat: 'Thermosetting', maxT: 120, minT: -40, chem: 'Good chemical resistance, excellent abrasion resistance', suit: 'Abrasive slurries, chemical service', notSuit: 'Strong acids, ketones', dft: '250-500' },
      { type: 'Phenolic Epoxy', cat: 'Thermosetting', maxT: 150, minT: -20, chem: 'Excellent acid resistance, good solvent resistance', suit: 'Sour crude, H2S service, acids', notSuit: 'Strong alkalis above 50C', dft: '150-300' },
      { type: 'Novolac Epoxy', cat: 'Thermosetting', maxT: 180, minT: -20, chem: 'Excellent chemical/solvent resistance', suit: 'High-temp chemical service, solvents', notSuit: 'Very strong oxidizers', dft: '300-600' },
      { type: 'Glass Flake Epoxy', cat: 'Thermosetting', maxT: 100, minT: -20, chem: 'Excellent permeation resistance', suit: 'Immersion, chemical tanks', notSuit: 'Thermal cycling', dft: '800-1500' },
      { type: 'Glass Flake Vinyl Ester', cat: 'Thermosetting', maxT: 120, minT: -20, chem: 'Superior acid resistance', suit: 'Strong acids, bleach, chlorine', notSuit: 'Strong solvents', dft: '800-1500' },
      { type: 'Rubber Lining (Soft)', cat: 'Elastomer', maxT: 80, minT: -30, chem: 'Excellent acid/alkali resistance', suit: 'Acid service, slurries, abrasive media', notSuit: 'Oils, solvents, ozone', dft: '3000-6000' },
      { type: 'Rubber Lining (Hard)', cat: 'Elastomer', maxT: 90, minT: -20, chem: 'Good abrasion resistance', suit: 'Abrasive slurries, mineral acids', notSuit: 'Oils, solvents', dft: '4000-8000' },
      { type: 'PTFE Lining', cat: 'Fluoropolymer', maxT: 260, minT: -200, chem: 'Outstanding chemical resistance', suit: 'Strong acids/alkalis, solvents, cryogenic', notSuit: 'Molten alkali metals, fluorine', dft: '2000-4000' },
      { type: 'PFA Lining', cat: 'Fluoropolymer', maxT: 260, minT: -200, chem: 'Outstanding chemical resistance, better than PTFE', suit: 'Aggressive chemicals, pharmaceutical', notSuit: 'Molten alkali metals', dft: '1500-3000' },
      { type: 'PVDF Lining', cat: 'Fluoropolymer', maxT: 140, minT: -40, chem: 'Excellent chemical resistance', suit: 'Acids, chlorine, bromine, oxidizers', notSuit: 'Strong alkalis, ketones, amines', dft: '1500-3000' },
      { type: 'Polypropylene Lining', cat: 'Thermoplastic', maxT: 100, minT: 0, chem: 'Good acid/alkali resistance', suit: 'Dilute acids/alkalis, water treatment', notSuit: 'Organic solvents, oxidizing acids', dft: '3000-6000' },
      { type: 'HDPE Lining', cat: 'Thermoplastic', maxT: 80, minT: -50, chem: 'Good chemical resistance', suit: 'Water, dilute chemicals', notSuit: 'Hydrocarbons, chlorinated solvents', dft: '2000-4000' },
      { type: 'Ceramic Epoxy', cat: 'Composite', maxT: 200, minT: -20, chem: 'Good chemical/abrasion resistance', suit: 'Abrasive slurries, high-temp chemical', notSuit: 'Impact, thermal shock', dft: '500-1000' },
      { type: 'Cement Mortar Lining', cat: 'Cite', maxT: 70, minT: 0, chem: 'Good for potable water, soft water corrosion', suit: 'Potable water, aggressive water', notSuit: 'Acids, low pH water', dft: '6000-12000' },
      { type: 'Zinc Rich Primer', cat: 'Metallic', maxT: 400, minT: -50, chem: 'Cathodic protection for steel', suit: 'Atmospheric exposure, primer coat', notSuit: 'Immersion in acids/alkalis', dft: '50-100' },
      { type: 'Thermal Spray Aluminum', cat: 'Metallic', maxT: 540, minT: -200, chem: 'Cathodic protection, high temp', suit: 'Offshore, high temp, cryogenic', notSuit: 'Strong acids/alkalis', dft: '200-350' },
    ];

    for (const c of coatingData) {
      await queryRunner.query(
        `
        INSERT INTO coating_lining_compatibility (coating_type, coating_category, max_temp_c, min_temp_c, chemical_resistance, suitable_services, not_suitable_for, typical_dft_microns)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (coating_type) DO UPDATE SET
          coating_category = EXCLUDED.coating_category,
          max_temp_c = EXCLUDED.max_temp_c,
          min_temp_c = EXCLUDED.min_temp_c,
          chemical_resistance = EXCLUDED.chemical_resistance,
          suitable_services = EXCLUDED.suitable_services,
          not_suitable_for = EXCLUDED.not_suitable_for,
          typical_dft_microns = EXCLUDED.typical_dft_microns
      `,
        [c.type, c.cat, c.maxT, c.minT, c.chem, c.suit, c.notSuit, c.dft]
      );
    }

    // ============================================================
    // PART 5: Material Traceability Fields
    // ============================================================
    console.warn('Adding material traceability fields...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS material_traceability_requirements (
        id SERIAL PRIMARY KEY,
        material_category VARCHAR(50) NOT NULL,
        service_class VARCHAR(50) NOT NULL,
        mtr_required BOOLEAN DEFAULT true,
        pmi_required BOOLEAN DEFAULT false,
        heat_number_required BOOLEAN DEFAULT false,
        lot_tracking_required BOOLEAN DEFAULT false,
        witness_points TEXT,
        documentation_required TEXT,
        UNIQUE(material_category, service_class)
      )
    `);

    const traceabilityReqs = [
      { mat: 'Carbon Steel', svc: 'General', mtr: true, pmi: false, heat: false, lot: false, wit: 'None', doc: 'MTR' },
      { mat: 'Carbon Steel', svc: 'Sour Service', mtr: true, pmi: false, heat: true, lot: true, wit: 'HIC/SSC testing', doc: 'MTR, HIC test report, hardness survey' },
      { mat: 'Carbon Steel', svc: 'Low Temperature', mtr: true, pmi: false, heat: true, lot: false, wit: 'Impact testing', doc: 'MTR, Charpy test report' },
      { mat: 'Alloy Steel', svc: 'General', mtr: true, pmi: true, heat: true, lot: false, wit: 'PMI verification', doc: 'MTR, PMI report' },
      { mat: 'Alloy Steel', svc: 'High Temperature', mtr: true, pmi: true, heat: true, lot: true, wit: 'PMI, hardness check', doc: 'MTR, PMI, hardness report, PWHT chart' },
      { mat: 'Stainless Steel', svc: 'General', mtr: true, pmi: true, heat: true, lot: false, wit: 'PMI verification', doc: 'MTR, PMI report' },
      { mat: 'Stainless Steel', svc: 'Corrosive', mtr: true, pmi: true, heat: true, lot: true, wit: 'IGC test, ferrite check', doc: 'MTR, PMI, IGC report, ferrite report' },
      { mat: 'Duplex SS', svc: 'General', mtr: true, pmi: true, heat: true, lot: true, wit: 'Ferrite check, CPT test', doc: 'MTR, PMI, ferrite, CPT, microstructure' },
      { mat: 'Nickel Alloy', svc: 'General', mtr: true, pmi: true, heat: true, lot: true, wit: 'PMI, solution anneal verify', doc: 'MTR, PMI, heat treatment certificate' },
      { mat: 'Titanium', svc: 'General', mtr: true, pmi: true, heat: true, lot: true, wit: 'PMI, surface condition', doc: 'MTR, PMI, processing records' },
    ];

    for (const t of traceabilityReqs) {
      await queryRunner.query(
        `
        INSERT INTO material_traceability_requirements (material_category, service_class, mtr_required, pmi_required, heat_number_required, lot_tracking_required, witness_points, documentation_required)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (material_category, service_class) DO UPDATE SET
          mtr_required = EXCLUDED.mtr_required,
          pmi_required = EXCLUDED.pmi_required,
          heat_number_required = EXCLUDED.heat_number_required,
          lot_tracking_required = EXCLUDED.lot_tracking_required,
          witness_points = EXCLUDED.witness_points,
          documentation_required = EXCLUDED.documentation_required
      `,
        [t.mat, t.svc, t.mtr, t.pmi, t.heat, t.lot, t.wit, t.doc]
      );
    }

    console.warn('Remaining system enhancements complete.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS material_traceability_requirements`);
    await queryRunner.query(`DROP TABLE IF EXISTS coating_lining_compatibility`);
    await queryRunner.query(`DROP TABLE IF EXISTS environmental_cracking_susceptibility`);
    await queryRunner.query(`DROP TABLE IF EXISTS galvanic_compatibility`);
    await queryRunner.query(`DROP TABLE IF EXISTS galvanic_series`);
    await queryRunner.query(`DROP TABLE IF EXISTS nps_dn_mapping`);
  }
}
