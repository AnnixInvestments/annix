import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRubberLiningTables1737052800000 implements MigrationInterface {
  name = 'CreateRubberLiningTables1737052800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "rubber_types" (
        "id" SERIAL NOT NULL,
        "type_number" integer NOT NULL UNIQUE,
        "type_name" character varying(100) NOT NULL,
        "polymer_codes" character varying(100) NOT NULL,
        "polymer_names" character varying(255) NOT NULL,
        "description" text NOT NULL,
        "temp_min_celsius" decimal(5,1) NOT NULL,
        "temp_max_celsius" decimal(5,1) NOT NULL,
        "ozone_resistance" character varying(50) NOT NULL,
        "oil_resistance" character varying(50) NOT NULL,
        "chemical_resistance_notes" text,
        "not_suitable_for" text,
        "typical_applications" text,
        CONSTRAINT "PK_rubber_types" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_specifications" (
        "id" SERIAL NOT NULL,
        "rubber_type_id" integer NOT NULL,
        "grade" character varying(10) NOT NULL,
        "hardness_class_irhd" integer NOT NULL,
        "tensile_strength_mpa_min" decimal(5,1) NOT NULL,
        "elongation_at_break_min" integer NOT NULL,
        "tensile_after_ageing_min_percent" integer NOT NULL,
        "tensile_after_ageing_max_percent" integer NOT NULL,
        "elongation_after_ageing_min_percent" integer NOT NULL,
        "elongation_after_ageing_max_percent" integer NOT NULL,
        "hardness_change_after_ageing_max" integer NOT NULL,
        "heat_resistance_80c_hardness_change_max" integer,
        "heat_resistance_100c_hardness_change_max" integer,
        "ozone_resistance" character varying(50),
        "chemical_resistance_hardness_change_max" integer,
        "water_resistance_max_percent" integer,
        "oil_resistance_max_percent" integer,
        "contaminant_release_max_percent" integer,
        "sans_standard" character varying(50) NOT NULL,
        CONSTRAINT "PK_rubber_specifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_specifications_type" FOREIGN KEY ("rubber_type_id") REFERENCES "rubber_types"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_application_ratings" (
        "id" SERIAL NOT NULL,
        "rubber_type_id" integer NOT NULL,
        "chemical_category" character varying(50) NOT NULL,
        "resistance_rating" character varying(50) NOT NULL,
        "max_temp_celsius" decimal(5,1),
        "max_concentration_percent" decimal(5,1),
        "notes" text,
        CONSTRAINT "PK_rubber_application_ratings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_application_ratings_type" FOREIGN KEY ("rubber_type_id") REFERENCES "rubber_types"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_thickness_recommendations" (
        "id" SERIAL NOT NULL,
        "nominal_thickness_mm" decimal(4,1) NOT NULL,
        "min_plies" integer NOT NULL,
        "max_ply_thickness_mm" decimal(3,1) NOT NULL,
        "application_notes" text,
        "suitable_for_complex_shapes" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_rubber_thickness_recommendations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_adhesion_requirements" (
        "id" SERIAL NOT NULL,
        "rubber_type_id" integer NOT NULL,
        "vulcanization_method" character varying(50) NOT NULL,
        "min_adhesion_n_per_mm" decimal(4,1) NOT NULL,
        "test_standard" character varying(50) NOT NULL,
        CONSTRAINT "PK_rubber_adhesion_requirements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_adhesion_requirements_type" FOREIGN KEY ("rubber_type_id") REFERENCES "rubber_types"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_rubber_specs_type" ON "rubber_specifications" ("rubber_type_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rubber_specs_grade" ON "rubber_specifications" ("grade")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rubber_app_ratings_type" ON "rubber_application_ratings" ("rubber_type_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rubber_app_ratings_category" ON "rubber_application_ratings" ("chemical_category")`,
    );

    await queryRunner.query(`
      INSERT INTO "rubber_types" ("type_number", "type_name", "polymer_codes", "polymer_names", "description", "temp_min_celsius", "temp_max_celsius", "ozone_resistance", "oil_resistance", "chemical_resistance_notes", "not_suitable_for", "typical_applications") VALUES
      (1, 'Natural/SBR Rubber', 'NR, SBR, BR, IR', 'Natural rubber, Styrene-butadiene, Butadiene, Synthetic isoprene', 'General purpose rubber with good elastic and mechanical properties. Resistant to most inorganic chemicals except strong oxidizing agents. Ebonites have higher chemical resistance especially to chlorine gas and aliphatic carboxylic acids.', -30.0, 80.0, 'not_recommended', 'not_suitable', 'Resistant to most inorganic chemicals, alcohols, and most esters. Good resistance to dilute acids and alkalis.', 'Aliphatic hydrocarbons, aromatic hydrocarbons, halogenated hydrocarbons, mineral oils, vegetable oils, strong oxidizing agents (chromic acid, nitric acid)', 'General mining slurry, water treatment, chemical storage tanks for compatible chemicals'),
      (2, 'Butyl Rubber', 'IIR, BIIR, CIIR', 'Butyl rubber, Bromobutyl, Chlorobutyl', 'Rubber with low permeability to air and water, and good ozone, weathering and chemical resistance. Greater resistance to heat and oxidizing agents than Type 1. Highly impermeable to gases.', -20.0, 100.0, 'excellent', 'not_suitable', 'Very low water absorption. Good resistance to ozone, weathering, and oxidizing chemicals. Excellent gas impermeability.', 'Free halogens, petroleum oils, halogenated hydrocarbons, aromatic hydrocarbons', 'Chemical storage, gas-tight applications, ozone-exposed environments'),
      (3, 'Nitrile Rubber', 'NBR', 'Nitrile butadiene rubber', 'Rubber with high resistance to hydrocarbon liquids, oils, and greases. Excellent resistance to swelling in mineral oils and fuels. Physical and mechanical properties equivalent to Type 1.', -20.0, 80.0, 'good', 'excellent', 'Excellent resistance to mineral oils, fuels, and greases. Good abrasion resistance.', 'Phenols, ketones, strong acetic acid, nitrogen derivatives, ozone (without additives)', 'Oil and fuel handling, hydraulic systems, petroleum industry'),
      (4, 'Chloroprene Rubber', 'CR', 'Chloroprene (Neoprene)', 'Rubber with medium resistance to hydrocarbon liquids, oils, and greases, and good ozone and weather resistance. Greater resistance to heat, ozone, oxidizing agents, and sunlight than Type 1.', -20.0, 110.0, 'excellent', 'medium', 'Medium resistance to mineral oils. Good resistance to ozone, weathering, and moderate chemicals.', 'Halogenated hydrocarbons, aromatic hydrocarbons, strong oxidizing agents', 'Outdoor applications, moderate oil exposure, refrigerant handling'),
      (5, 'Chlorosulfonated Polyethylene', 'CSM', 'Chlorosulfonated polyethylene (Hypalon)', 'Rubber with high resistance to hydrocarbons and acids. Excellent resistance to heat, ozone, and oxidizing chemicals. Outstanding resistance to sodium hypochlorite, sulfuric acid, and chlorine-saturated sulfuric acid.', -5.0, 120.0, 'excellent', 'good', 'Outstanding resistance to oxidizing chemicals, sulfuric acid, sodium hypochlorite. Good resistance to oils, lubricants, and aliphatic hydrocarbons.', 'Esters, ketones, chlorinated solvents', 'Aggressive chemical environments, bleach handling, sulfuric acid applications')
    `);

    await queryRunner.query(`
      INSERT INTO "rubber_specifications" ("rubber_type_id", "grade", "hardness_class_irhd", "tensile_strength_mpa_min", "elongation_at_break_min", "tensile_after_ageing_min_percent", "tensile_after_ageing_max_percent", "elongation_after_ageing_min_percent", "elongation_after_ageing_max_percent", "hardness_change_after_ageing_max", "heat_resistance_80c_hardness_change_max", "heat_resistance_100c_hardness_change_max", "ozone_resistance", "chemical_resistance_hardness_change_max", "water_resistance_max_percent", "oil_resistance_max_percent", "contaminant_release_max_percent", "sans_standard") VALUES
      -- Type 1 Grade A (Natural/SBR)
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'A', 40, 18.0, 600, 80, 120, 80, 120, 10, 10, NULL, 'not_recommended', 10, 2, NULL, 2, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'A', 50, 18.0, 500, 80, 120, 80, 120, 10, 10, NULL, 'not_recommended', 10, 2, NULL, 2, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'A', 60, 18.0, 400, 80, 120, 80, 120, 10, 10, NULL, 'not_recommended', 10, 2, NULL, 2, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'A', 70, 18.0, 350, 80, 120, 80, 120, 10, 10, NULL, 'not_recommended', 10, 2, NULL, 2, 'SANS 1198:2013'),
      -- Type 1 Grade B
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'B', 40, 14.0, 400, 75, 125, 70, 130, 10, 10, NULL, 'not_recommended', 10, 2, NULL, 3, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'B', 50, 14.0, 400, 75, 125, 70, 130, 10, 10, NULL, 'not_recommended', 10, 2, NULL, 3, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'B', 60, 14.0, 400, 75, 125, 70, 130, 10, 10, NULL, 'not_recommended', 10, 2, NULL, 3, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'B', 70, 14.0, 300, 75, 125, 70, 130, 10, 10, NULL, 'not_recommended', 10, 2, NULL, 3, 'SANS 1198:2013'),
      -- Type 1 Grade C
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'C', 40, 7.0, 400, 70, 130, 60, 140, 15, 15, NULL, 'not_recommended', 10, 3, NULL, 5, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'C', 50, 7.0, 400, 70, 130, 60, 140, 15, 15, NULL, 'not_recommended', 10, 3, NULL, 5, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'C', 60, 7.0, 300, 70, 130, 60, 140, 15, 15, NULL, 'not_recommended', 10, 3, NULL, 5, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'C', 70, 7.0, 200, 70, 130, 60, 140, 15, 15, NULL, 'not_recommended', 10, 3, NULL, 5, 'SANS 1198:2013'),
      -- Type 2 Grade B (Butyl)
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'B', 40, 14.0, 400, 75, 125, 70, 130, 10, 10, 10, 'no_cracks', 10, 2, NULL, 3, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'B', 50, 14.0, 400, 75, 125, 70, 130, 10, 10, 10, 'no_cracks', 10, 2, NULL, 3, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'B', 60, 14.0, 400, 75, 125, 70, 130, 10, 10, 10, 'no_cracks', 10, 2, NULL, 3, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'B', 70, 14.0, 300, 75, 125, 70, 130, 10, 10, 10, 'no_cracks', 10, 2, NULL, 3, 'SANS 1198:2013'),
      -- Type 2 Grade C
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'C', 40, 7.0, 300, 70, 130, 60, 140, 15, 15, 15, 'no_cracks', 10, 3, NULL, 5, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'C', 50, 7.0, 300, 70, 130, 60, 140, 15, 15, 15, 'no_cracks', 10, 3, NULL, 5, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'C', 60, 7.0, 300, 70, 130, 60, 140, 15, 15, 15, 'no_cracks', 10, 3, NULL, 5, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'C', 70, 7.0, 200, 70, 130, 60, 140, 15, 15, 15, 'no_cracks', 10, 3, NULL, 5, 'SANS 1198:2013'),
      -- Type 3 Grade B (Nitrile)
      ((SELECT id FROM rubber_types WHERE type_number = 3), 'B', 40, 14.0, 400, 75, 125, 70, 130, 10, 10, 10, 'no_cracks', 10, 2, 25, 3, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 3), 'B', 50, 14.0, 350, 75, 125, 70, 130, 10, 10, 10, 'no_cracks', 10, 2, 25, 3, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 3), 'B', 60, 14.0, 300, 75, 125, 70, 130, 10, 10, 10, 'no_cracks', 10, 2, 25, 3, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 3), 'B', 70, 14.0, 250, 75, 125, 70, 130, 10, 10, 10, 'no_cracks', 10, 2, 25, 3, 'SANS 1198:2013'),
      -- Type 3 Grade C
      ((SELECT id FROM rubber_types WHERE type_number = 3), 'C', 40, 7.0, 350, 70, 130, 60, 140, 15, 15, 15, 'no_cracks', 10, 3, 30, 5, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 3), 'C', 50, 7.0, 300, 70, 130, 60, 140, 15, 15, 15, 'no_cracks', 10, 3, 30, 5, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 3), 'C', 60, 7.0, 250, 70, 130, 60, 140, 15, 15, 15, 'no_cracks', 10, 3, 30, 5, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 3), 'C', 70, 7.0, 200, 70, 130, 60, 140, 15, 15, 15, 'no_cracks', 10, 3, 30, 5, 'SANS 1198:2013'),
      -- Type 4 Grade B (Chloroprene)
      ((SELECT id FROM rubber_types WHERE type_number = 4), 'B', 40, 14.0, 500, 75, 125, 70, 130, 10, 10, 10, 'no_cracks', 15, 5, 100, 3, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 4), 'B', 50, 14.0, 400, 75, 125, 70, 130, 10, 10, 10, 'no_cracks', 15, 5, 100, 3, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 4), 'B', 60, 14.0, 350, 75, 125, 70, 130, 10, 10, 10, 'no_cracks', 15, 5, 100, 3, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 4), 'B', 70, 14.0, 300, 75, 125, 70, 130, 10, 10, 10, 'no_cracks', 15, 5, 100, 3, 'SANS 1198:2013'),
      -- Type 4 Grade C
      ((SELECT id FROM rubber_types WHERE type_number = 4), 'C', 40, 7.0, 400, 70, 130, 60, 140, 15, 10, 15, 'no_cracks', 20, 8, 120, 5, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 4), 'C', 50, 7.0, 300, 70, 130, 60, 140, 15, 10, 15, 'no_cracks', 20, 8, 120, 5, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 4), 'C', 60, 7.0, 300, 70, 130, 60, 140, 15, 10, 15, 'no_cracks', 20, 8, 120, 5, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 4), 'C', 70, 7.0, 200, 70, 130, 60, 140, 15, 10, 15, 'no_cracks', 20, 8, 120, 5, 'SANS 1198:2013'),
      -- Type 5 Grade B (CSM)
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'B', 40, 14.0, 300, 75, 125, 70, 125, 10, 5, 10, 'no_cracks', 10, 5, 40, 3, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'B', 50, 14.0, 250, 75, 125, 70, 125, 10, 5, 10, 'no_cracks', 10, 5, 40, 3, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'B', 60, 14.0, 200, 75, 125, 70, 125, 10, 5, 10, 'no_cracks', 10, 5, 40, 3, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'B', 70, 14.0, 200, 75, 125, 70, 125, 10, 5, 10, 'no_cracks', 10, 5, 40, 3, 'SANS 1198:2013'),
      -- Type 5 Grade C
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'C', 40, 7.0, 250, 70, 130, 70, 130, 15, 10, 15, 'no_cracks', 15, 8, 60, 5, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'C', 50, 7.0, 200, 70, 130, 70, 130, 15, 10, 15, 'no_cracks', 15, 8, 60, 5, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'C', 60, 7.0, 200, 70, 130, 70, 130, 15, 10, 15, 'no_cracks', 15, 8, 60, 5, 'SANS 1198:2013'),
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'C', 70, 7.0, 150, 70, 130, 70, 130, 15, 10, 15, 'no_cracks', 15, 8, 60, 5, 'SANS 1198:2013')
    `);

    await queryRunner.query(`
      INSERT INTO "rubber_application_ratings" ("rubber_type_id", "chemical_category", "resistance_rating", "max_temp_celsius", "max_concentration_percent", "notes") VALUES
      -- Type 1 (Natural/SBR) ratings
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'acids_inorganic', 'good', 60.0, 50.0, 'Good for dilute inorganic acids. Not suitable for strong oxidizing acids like HNO3'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'acids_organic', 'good', 60.0, 50.0, 'Good for most organic acids'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'alkalis', 'excellent', 80.0, NULL, 'Excellent for dilute and moderate alkalis'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'alcohols', 'excellent', 60.0, NULL, 'Excellent resistance to alcohols'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'hydrocarbons', 'not_recommended', NULL, NULL, 'Poor resistance - causes swelling and degradation'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'oils_mineral', 'not_recommended', NULL, NULL, 'Not suitable for mineral oils'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'oils_vegetable', 'poor', NULL, NULL, 'Poor resistance to vegetable oils'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'chlorine_compounds', 'good', 60.0, 10.0, 'Ebonite grades have better chlorine resistance'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'oxidizing_agents', 'not_recommended', NULL, NULL, 'Not suitable for strong oxidizers'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'water', 'excellent', 80.0, NULL, 'Excellent water resistance'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'slurry_abrasive', 'excellent', 60.0, NULL, 'Excellent abrasion resistance for mining slurries'),
      -- Type 2 (Butyl) ratings
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'acids_inorganic', 'excellent', 100.0, 70.0, 'Excellent acid resistance including oxidizing acids'),
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'acids_organic', 'excellent', 100.0, NULL, 'Excellent organic acid resistance'),
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'alkalis', 'excellent', 100.0, NULL, 'Excellent alkali resistance'),
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'alcohols', 'good', 80.0, NULL, 'Good alcohol resistance'),
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'hydrocarbons', 'not_recommended', NULL, NULL, 'Poor resistance to aromatic hydrocarbons'),
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'oils_mineral', 'not_recommended', NULL, NULL, 'Not suitable for petroleum oils'),
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'chlorine_compounds', 'good', 80.0, 20.0, 'Good resistance but not for free chlorine'),
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'oxidizing_agents', 'excellent', 100.0, NULL, 'Excellent oxidizer resistance'),
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'water', 'excellent', 100.0, NULL, 'Very low water absorption'),
      -- Type 3 (Nitrile) ratings
      ((SELECT id FROM rubber_types WHERE type_number = 3), 'acids_inorganic', 'good', 60.0, 30.0, 'Good for dilute inorganic acids'),
      ((SELECT id FROM rubber_types WHERE type_number = 3), 'acids_organic', 'poor', NULL, NULL, 'Poor resistance to strong organic acids'),
      ((SELECT id FROM rubber_types WHERE type_number = 3), 'alkalis', 'good', 60.0, NULL, 'Good alkali resistance'),
      ((SELECT id FROM rubber_types WHERE type_number = 3), 'hydrocarbons', 'excellent', 80.0, NULL, 'Excellent resistance to aliphatic hydrocarbons'),
      ((SELECT id FROM rubber_types WHERE type_number = 3), 'oils_mineral', 'excellent', 80.0, NULL, 'Excellent resistance to mineral oils and fuels'),
      ((SELECT id FROM rubber_types WHERE type_number = 3), 'oils_vegetable', 'excellent', 60.0, NULL, 'Excellent vegetable oil resistance'),
      ((SELECT id FROM rubber_types WHERE type_number = 3), 'solvents', 'poor', NULL, NULL, 'Poor resistance to ketones and chlorinated solvents'),
      ((SELECT id FROM rubber_types WHERE type_number = 3), 'water', 'good', 80.0, NULL, 'Good water resistance'),
      -- Type 4 (Chloroprene) ratings
      ((SELECT id FROM rubber_types WHERE type_number = 4), 'acids_inorganic', 'good', 80.0, 30.0, 'Good for mild inorganic acids'),
      ((SELECT id FROM rubber_types WHERE type_number = 4), 'acids_organic', 'fair', 60.0, 20.0, 'Fair resistance to weak organic acids'),
      ((SELECT id FROM rubber_types WHERE type_number = 4), 'alkalis', 'good', 80.0, NULL, 'Good alkali resistance'),
      ((SELECT id FROM rubber_types WHERE type_number = 4), 'hydrocarbons', 'poor', NULL, NULL, 'Poor resistance to aromatic hydrocarbons'),
      ((SELECT id FROM rubber_types WHERE type_number = 4), 'oils_mineral', 'good', 80.0, NULL, 'Medium resistance to mineral oils'),
      ((SELECT id FROM rubber_types WHERE type_number = 4), 'oxidizing_agents', 'good', 80.0, NULL, 'Good ozone and oxidizer resistance'),
      ((SELECT id FROM rubber_types WHERE type_number = 4), 'water', 'good', 100.0, NULL, 'Good water resistance'),
      ((SELECT id FROM rubber_types WHERE type_number = 4), 'slurry_abrasive', 'good', 80.0, NULL, 'Good abrasion resistance'),
      -- Type 5 (CSM) ratings
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'acids_inorganic', 'excellent', 120.0, 98.0, 'Outstanding resistance to sulfuric acid including concentrated'),
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'acids_organic', 'good', 100.0, 50.0, 'Good organic acid resistance'),
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'alkalis', 'excellent', 120.0, NULL, 'Excellent alkali resistance'),
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'hydrocarbons', 'good', 100.0, NULL, 'Good resistance to aliphatic hydrocarbons'),
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'oils_mineral', 'good', 100.0, NULL, 'Good mineral oil resistance'),
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'chlorine_compounds', 'excellent', 120.0, NULL, 'Outstanding resistance to sodium hypochlorite and chlorine'),
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'oxidizing_agents', 'excellent', 120.0, NULL, 'Excellent oxidizer resistance'),
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'solvents', 'poor', NULL, NULL, 'Not suitable for esters and ketones'),
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'water', 'good', 120.0, NULL, 'Good water resistance')
    `);

    await queryRunner.query(`
      INSERT INTO "rubber_thickness_recommendations" ("nominal_thickness_mm", "min_plies", "max_ply_thickness_mm", "application_notes", "suitable_for_complex_shapes") VALUES
      (3.0, 2, 1.5, 'Minimum thickness for light duty applications', true),
      (4.0, 3, 1.5, 'General purpose thickness', true),
      (5.0, 3, 1.5, 'General purpose thickness', true),
      (6.0, 4, 1.5, 'Standard industrial thickness', true),
      (9.0, 6, 1.5, 'Heavy duty applications', true),
      (10.0, 7, 1.5, 'Heavy duty applications', false),
      (12.0, 8, 1.5, 'Severe service applications. Should be applied in at least two layers for thickness >12mm.', false)
    `);

    await queryRunner.query(`
      INSERT INTO "rubber_adhesion_requirements" ("rubber_type_id", "vulcanization_method", "min_adhesion_n_per_mm", "test_standard") VALUES
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'autoclave', 3.5, 'ISO 813'),
      ((SELECT id FROM rubber_types WHERE type_number = 1), 'other', 2.0, 'ISO 813'),
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'autoclave', 3.5, 'ISO 813'),
      ((SELECT id FROM rubber_types WHERE type_number = 2), 'other', 2.0, 'ISO 813'),
      ((SELECT id FROM rubber_types WHERE type_number = 3), 'autoclave', 3.5, 'ISO 813'),
      ((SELECT id FROM rubber_types WHERE type_number = 3), 'other', 2.0, 'ISO 813'),
      ((SELECT id FROM rubber_types WHERE type_number = 4), 'autoclave', 3.5, 'ISO 813'),
      ((SELECT id FROM rubber_types WHERE type_number = 4), 'other', 2.0, 'ISO 813'),
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'autoclave', 3.0, 'ISO 813'),
      ((SELECT id FROM rubber_types WHERE type_number = 5), 'other', 1.5, 'ISO 813')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_rubber_app_ratings_category"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_rubber_app_ratings_type"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_specs_grade"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_specs_type"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "rubber_adhesion_requirements"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "rubber_thickness_recommendations"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "rubber_application_ratings"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_specifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_types"`);
  }
}
