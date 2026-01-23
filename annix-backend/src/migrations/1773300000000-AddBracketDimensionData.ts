import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBracketDimensionData1773300000000 implements MigrationInterface {
  name = 'AddBracketDimensionData1773300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding comprehensive bracket dimension data...');

    const weldedBracketBySize = [
      { nps: '1/2"', nb: 15, length: 100, brace: 50, thickness: 5, weight: 0.4, load: 500 },
      { nps: '3/4"', nb: 20, length: 100, brace: 50, thickness: 5, weight: 0.45, load: 550 },
      { nps: '1"', nb: 25, length: 125, brace: 65, thickness: 6, weight: 0.6, load: 700 },
      { nps: '1-1/4"', nb: 32, length: 125, brace: 65, thickness: 6, weight: 0.7, load: 800 },
      { nps: '1-1/2"', nb: 40, length: 150, brace: 75, thickness: 6, weight: 0.85, load: 950 },
      { nps: '2"', nb: 50, length: 150, brace: 75, thickness: 8, weight: 1.1, load: 1200 },
      { nps: '2-1/2"', nb: 65, length: 175, brace: 90, thickness: 8, weight: 1.4, load: 1500 },
      { nps: '3"', nb: 80, length: 200, brace: 100, thickness: 8, weight: 1.7, load: 1800 },
      { nps: '4"', nb: 100, length: 225, brace: 115, thickness: 10, weight: 2.3, load: 2400 },
      { nps: '5"', nb: 125, length: 250, brace: 125, thickness: 10, weight: 2.9, load: 3000 },
      { nps: '6"', nb: 150, length: 275, brace: 140, thickness: 10, weight: 3.5, load: 3600 },
      { nps: '8"', nb: 200, length: 325, brace: 165, thickness: 12, weight: 5.0, load: 5000 },
      { nps: '10"', nb: 250, length: 375, brace: 190, thickness: 12, weight: 6.8, load: 6500 },
      { nps: '12"', nb: 300, length: 425, brace: 215, thickness: 14, weight: 9.0, load: 8500 },
      { nps: '14"', nb: 350, length: 475, brace: 240, thickness: 14, weight: 11.0, load: 10000 },
      { nps: '16"', nb: 400, length: 525, brace: 265, thickness: 16, weight: 14.0, load: 12000 },
      { nps: '18"', nb: 450, length: 575, brace: 290, thickness: 16, weight: 17.0, load: 14000 },
      { nps: '20"', nb: 500, length: 625, brace: 315, thickness: 18, weight: 21.0, load: 16500 },
      { nps: '24"', nb: 600, length: 725, brace: 365, thickness: 20, weight: 28.0, load: 20000 },
    ];

    for (const dim of weldedBracketBySize) {
      await queryRunner.query(`
        INSERT INTO bracket_dimensions_by_size (
          bracket_type_code, nps, nb_mm, dimension_a_mm, dimension_b_mm,
          rod_diameter_mm, unit_weight_kg, max_load_kg
        )
        VALUES ('WELDED_BRACKET', $1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (bracket_type_code, nb_mm) DO UPDATE SET
          dimension_a_mm = EXCLUDED.dimension_a_mm,
          dimension_b_mm = EXCLUDED.dimension_b_mm,
          rod_diameter_mm = EXCLUDED.rod_diameter_mm,
          unit_weight_kg = EXCLUDED.unit_weight_kg,
          max_load_kg = EXCLUDED.max_load_kg
      `, [dim.nps, dim.nb, dim.length, dim.brace, dim.thickness, dim.weight, dim.load]);
    }
    console.warn('Added WELDED_BRACKET dimensions for 19 sizes');

    const rollerSupportBySize = [
      { nps: '2"', nb: 50, baseW: 100, baseL: 150, height: 80, rollerDia: 40, weight: 2.5, load: 1500 },
      { nps: '2-1/2"', nb: 65, baseW: 115, baseL: 165, height: 90, rollerDia: 45, weight: 3.0, load: 1800 },
      { nps: '3"', nb: 80, baseW: 130, baseL: 180, height: 100, rollerDia: 50, weight: 3.6, load: 2200 },
      { nps: '4"', nb: 100, baseW: 150, baseL: 200, height: 115, rollerDia: 60, weight: 4.5, load: 2800 },
      { nps: '5"', nb: 125, baseW: 170, baseL: 220, height: 130, rollerDia: 70, weight: 5.5, load: 3500 },
      { nps: '6"', nb: 150, baseW: 190, baseL: 250, height: 145, rollerDia: 80, weight: 6.8, load: 4200 },
      { nps: '8"', nb: 200, baseW: 230, baseL: 300, height: 175, rollerDia: 100, weight: 9.5, load: 5800 },
      { nps: '10"', nb: 250, baseW: 270, baseL: 350, height: 205, rollerDia: 120, weight: 13.0, load: 7500 },
      { nps: '12"', nb: 300, baseW: 310, baseL: 400, height: 235, rollerDia: 140, weight: 17.0, load: 9500 },
      { nps: '14"', nb: 350, baseW: 350, baseL: 450, height: 265, rollerDia: 160, weight: 22.0, load: 11500 },
      { nps: '16"', nb: 400, baseW: 390, baseL: 500, height: 295, rollerDia: 180, weight: 28.0, load: 14000 },
      { nps: '18"', nb: 450, baseW: 430, baseL: 550, height: 325, rollerDia: 200, weight: 35.0, load: 16500 },
      { nps: '20"', nb: 500, baseW: 470, baseL: 600, height: 355, rollerDia: 220, weight: 42.0, load: 19500 },
      { nps: '24"', nb: 600, baseW: 550, baseL: 700, height: 415, rollerDia: 260, weight: 58.0, load: 25000 },
      { nps: '30"', nb: 750, baseW: 670, baseL: 850, height: 505, rollerDia: 320, weight: 85.0, load: 35000 },
      { nps: '36"', nb: 900, baseW: 790, baseL: 1000, height: 595, rollerDia: 380, weight: 120.0, load: 45000 },
    ];

    for (const dim of rollerSupportBySize) {
      await queryRunner.query(`
        INSERT INTO bracket_dimensions_by_size (
          bracket_type_code, nps, nb_mm, dimension_a_mm, dimension_b_mm,
          rod_diameter_mm, unit_weight_kg, max_load_kg
        )
        VALUES ('ROLLER_SUPPORT', $1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (bracket_type_code, nb_mm) DO UPDATE SET
          dimension_a_mm = EXCLUDED.dimension_a_mm,
          dimension_b_mm = EXCLUDED.dimension_b_mm,
          rod_diameter_mm = EXCLUDED.rod_diameter_mm,
          unit_weight_kg = EXCLUDED.unit_weight_kg,
          max_load_kg = EXCLUDED.max_load_kg
      `, [dim.nps, dim.nb, dim.baseW, dim.baseL, dim.rollerDia, dim.weight, dim.load]);
    }
    console.warn('Added ROLLER_SUPPORT dimensions for 16 sizes');

    const slidePlateBySize = [
      { nps: '8"', nb: 200, baseW: 250, baseL: 350, thickness: 10, ptfeThick: 3, weight: 6.5, load: 5000 },
      { nps: '10"', nb: 250, baseW: 300, baseL: 400, thickness: 12, ptfeThick: 3, weight: 9.0, load: 6500 },
      { nps: '12"', nb: 300, baseW: 350, baseL: 450, thickness: 12, ptfeThick: 4, weight: 12.0, load: 8500 },
      { nps: '14"', nb: 350, baseW: 400, baseL: 500, thickness: 14, ptfeThick: 4, weight: 16.0, load: 10500 },
      { nps: '16"', nb: 400, baseW: 450, baseL: 550, thickness: 14, ptfeThick: 5, weight: 20.0, load: 13000 },
      { nps: '18"', nb: 450, baseW: 500, baseL: 600, thickness: 16, ptfeThick: 5, weight: 25.0, load: 15500 },
      { nps: '20"', nb: 500, baseW: 550, baseL: 650, thickness: 16, ptfeThick: 6, weight: 31.0, load: 18500 },
      { nps: '24"', nb: 600, baseW: 650, baseL: 750, thickness: 18, ptfeThick: 6, weight: 42.0, load: 24000 },
      { nps: '30"', nb: 750, baseW: 800, baseL: 900, thickness: 20, ptfeThick: 8, weight: 62.0, load: 32000 },
      { nps: '36"', nb: 900, baseW: 950, baseL: 1050, thickness: 22, ptfeThick: 8, weight: 85.0, load: 42000 },
    ];

    for (const dim of slidePlateBySize) {
      await queryRunner.query(`
        INSERT INTO bracket_dimensions_by_size (
          bracket_type_code, nps, nb_mm, dimension_a_mm, dimension_b_mm,
          rod_diameter_mm, unit_weight_kg, max_load_kg
        )
        VALUES ('SLIDE_PLATE', $1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (bracket_type_code, nb_mm) DO UPDATE SET
          dimension_a_mm = EXCLUDED.dimension_a_mm,
          dimension_b_mm = EXCLUDED.dimension_b_mm,
          rod_diameter_mm = EXCLUDED.rod_diameter_mm,
          unit_weight_kg = EXCLUDED.unit_weight_kg,
          max_load_kg = EXCLUDED.max_load_kg
      `, [dim.nps, dim.nb, dim.baseW, dim.baseL, dim.thickness, dim.weight, dim.load]);
    }
    console.warn('Added SLIDE_PLATE dimensions for 10 sizes');

    const bandHangerBySize = [
      { nps: '1/2"', nb: 15, bandWidth: 20, thickness: 1.5, weight: 0.05, load: 100 },
      { nps: '3/4"', nb: 20, bandWidth: 20, thickness: 1.5, weight: 0.06, load: 120 },
      { nps: '1"', nb: 25, bandWidth: 25, thickness: 2.0, weight: 0.08, load: 150 },
      { nps: '1-1/4"', nb: 32, bandWidth: 25, thickness: 2.0, weight: 0.10, load: 180 },
      { nps: '1-1/2"', nb: 40, bandWidth: 25, thickness: 2.0, weight: 0.12, load: 220 },
      { nps: '2"', nb: 50, bandWidth: 30, thickness: 2.5, weight: 0.16, load: 280 },
      { nps: '2-1/2"', nb: 65, bandWidth: 30, thickness: 2.5, weight: 0.20, load: 350 },
      { nps: '3"', nb: 80, bandWidth: 35, thickness: 3.0, weight: 0.26, load: 450 },
      { nps: '4"', nb: 100, bandWidth: 40, thickness: 3.0, weight: 0.35, load: 600 },
    ];

    for (const dim of bandHangerBySize) {
      await queryRunner.query(`
        INSERT INTO bracket_dimensions_by_size (
          bracket_type_code, nps, nb_mm, dimension_a_mm, dimension_b_mm,
          rod_diameter_mm, unit_weight_kg, max_load_kg
        )
        VALUES ('BAND_HANGER', $1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (bracket_type_code, nb_mm) DO UPDATE SET
          dimension_a_mm = EXCLUDED.dimension_a_mm,
          dimension_b_mm = EXCLUDED.dimension_b_mm,
          rod_diameter_mm = EXCLUDED.rod_diameter_mm,
          unit_weight_kg = EXCLUDED.unit_weight_kg,
          max_load_kg = EXCLUDED.max_load_kg
      `, [dim.nps, dim.nb, dim.bandWidth, dim.thickness, dim.thickness, dim.weight, dim.load]);
    }
    console.warn('Added BAND_HANGER dimensions for 9 sizes');

    const newBracketTypes = [
      {
        typeCode: 'SPRING_HANGER',
        displayName: 'Spring Hanger',
        description: 'Variable spring support for thermal movement compensation',
        minNb: 50,
        maxNb: 600,
        weightFactor: 4.0,
        baseCost: 850,
        insulatedSuitable: true,
        allowsExpansion: true,
        isAnchorType: false,
      },
      {
        typeCode: 'CONSTANT_SUPPORT',
        displayName: 'Constant Support Hanger',
        description: 'Maintains constant load through full travel range',
        minNb: 100,
        maxNb: 900,
        weightFactor: 6.0,
        baseCost: 2500,
        insulatedSuitable: true,
        allowsExpansion: true,
        isAnchorType: false,
      },
      {
        typeCode: 'RISER_CLAMP',
        displayName: 'Riser Clamp',
        description: 'Support for vertical pipe runs with load transfer to structure',
        minNb: 25,
        maxNb: 600,
        weightFactor: 2.0,
        baseCost: 320,
        insulatedSuitable: true,
        allowsExpansion: false,
        isAnchorType: true,
      },
    ];

    for (const bracket of newBracketTypes) {
      await queryRunner.query(`
        INSERT INTO bracket_types (
          type_code, display_name, description, min_nb_mm, max_nb_mm,
          weight_factor, base_cost_per_unit, insulated_suitable, allows_expansion, is_anchor_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (type_code) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          min_nb_mm = EXCLUDED.min_nb_mm,
          max_nb_mm = EXCLUDED.max_nb_mm,
          weight_factor = EXCLUDED.weight_factor,
          base_cost_per_unit = EXCLUDED.base_cost_per_unit,
          insulated_suitable = EXCLUDED.insulated_suitable,
          allows_expansion = EXCLUDED.allows_expansion,
          is_anchor_type = EXCLUDED.is_anchor_type
      `, [
        bracket.typeCode, bracket.displayName, bracket.description,
        bracket.minNb, bracket.maxNb, bracket.weightFactor, bracket.baseCost,
        bracket.insulatedSuitable, bracket.allowsExpansion, bracket.isAnchorType,
      ]);
    }
    console.warn('Added 3 new bracket types: SPRING_HANGER, CONSTANT_SUPPORT, RISER_CLAMP');

    const springHangerBySize = [
      { nps: '2"', nb: 50, travel: 50, springRate: 15, weight: 3.5, load: 1000 },
      { nps: '3"', nb: 80, travel: 75, springRate: 20, weight: 4.8, load: 1500 },
      { nps: '4"', nb: 100, travel: 100, springRate: 25, weight: 6.5, load: 2200 },
      { nps: '6"', nb: 150, travel: 125, springRate: 35, weight: 10.0, load: 3500 },
      { nps: '8"', nb: 200, travel: 150, springRate: 50, weight: 15.0, load: 5000 },
      { nps: '10"', nb: 250, travel: 175, springRate: 70, weight: 22.0, load: 7000 },
      { nps: '12"', nb: 300, travel: 200, springRate: 90, weight: 30.0, load: 9500 },
      { nps: '14"', nb: 350, travel: 225, springRate: 110, weight: 40.0, load: 12000 },
      { nps: '16"', nb: 400, travel: 250, springRate: 130, weight: 52.0, load: 15000 },
      { nps: '20"', nb: 500, travel: 300, springRate: 170, weight: 75.0, load: 20000 },
      { nps: '24"', nb: 600, travel: 350, springRate: 210, weight: 100.0, load: 26000 },
    ];

    for (const dim of springHangerBySize) {
      await queryRunner.query(`
        INSERT INTO bracket_dimensions_by_size (
          bracket_type_code, nps, nb_mm, dimension_a_mm, dimension_b_mm,
          rod_diameter_mm, unit_weight_kg, max_load_kg
        )
        VALUES ('SPRING_HANGER', $1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (bracket_type_code, nb_mm) DO UPDATE SET
          dimension_a_mm = EXCLUDED.dimension_a_mm,
          dimension_b_mm = EXCLUDED.dimension_b_mm,
          rod_diameter_mm = EXCLUDED.rod_diameter_mm,
          unit_weight_kg = EXCLUDED.unit_weight_kg,
          max_load_kg = EXCLUDED.max_load_kg
      `, [dim.nps, dim.nb, dim.travel, dim.springRate, dim.springRate, dim.weight, dim.load]);
    }
    console.warn('Added SPRING_HANGER dimensions for 11 sizes');

    const riserClampBySize = [
      { nps: '1"', nb: 25, clampOD: 45, height: 60, weight: 0.4, load: 400 },
      { nps: '1-1/2"', nb: 40, clampOD: 65, height: 75, weight: 0.6, load: 600 },
      { nps: '2"', nb: 50, clampOD: 80, height: 90, weight: 0.9, load: 850 },
      { nps: '3"', nb: 80, clampOD: 110, height: 115, weight: 1.4, load: 1300 },
      { nps: '4"', nb: 100, clampOD: 135, height: 140, weight: 2.0, load: 1900 },
      { nps: '6"', nb: 150, clampOD: 190, height: 180, weight: 3.5, load: 3200 },
      { nps: '8"', nb: 200, clampOD: 245, height: 220, weight: 5.5, load: 5000 },
      { nps: '10"', nb: 250, clampOD: 300, height: 260, weight: 8.0, load: 7200 },
      { nps: '12"', nb: 300, clampOD: 355, height: 300, weight: 11.0, load: 9800 },
      { nps: '14"', nb: 350, clampOD: 390, height: 340, weight: 14.5, load: 12500 },
      { nps: '16"', nb: 400, clampOD: 445, height: 380, weight: 19.0, load: 16000 },
      { nps: '20"', nb: 500, clampOD: 555, height: 460, weight: 28.0, load: 22000 },
      { nps: '24"', nb: 600, clampOD: 665, height: 540, weight: 40.0, load: 30000 },
    ];

    for (const dim of riserClampBySize) {
      await queryRunner.query(`
        INSERT INTO bracket_dimensions_by_size (
          bracket_type_code, nps, nb_mm, dimension_a_mm, dimension_b_mm,
          rod_diameter_mm, unit_weight_kg, max_load_kg
        )
        VALUES ('RISER_CLAMP', $1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (bracket_type_code, nb_mm) DO UPDATE SET
          dimension_a_mm = EXCLUDED.dimension_a_mm,
          dimension_b_mm = EXCLUDED.dimension_b_mm,
          rod_diameter_mm = EXCLUDED.rod_diameter_mm,
          unit_weight_kg = EXCLUDED.unit_weight_kg,
          max_load_kg = EXCLUDED.max_load_kg
      `, [dim.nps, dim.nb, dim.clampOD, dim.height, dim.height, dim.weight, dim.load]);
    }
    console.warn('Added RISER_CLAMP dimensions for 13 sizes');

    console.warn('Bracket dimension data migration completed successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const typesToRemove = ['WELDED_BRACKET', 'ROLLER_SUPPORT', 'SLIDE_PLATE', 'BAND_HANGER', 'SPRING_HANGER', 'RISER_CLAMP'];

    for (const typeCode of typesToRemove) {
      await queryRunner.query(
        `DELETE FROM bracket_dimensions_by_size WHERE bracket_type_code = $1`,
        [typeCode]
      );
    }

    await queryRunner.query(`DELETE FROM bracket_types WHERE type_code IN ('SPRING_HANGER', 'CONSTANT_SUPPORT', 'RISER_CLAMP')`);
  }
}
