import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoatingSpecificationTables1766001800000 implements MigrationInterface {
  name = 'CreateCoatingSpecificationTables1766001800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create coating_standards table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "coating_standards" (
        "id" SERIAL PRIMARY KEY,
        "code" VARCHAR NOT NULL UNIQUE,
        "description" TEXT NOT NULL,
        "general_surface_preparation" TEXT NOT NULL,
        "notes" TEXT
      )
    `);

    // Create coating_environments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "coating_environments" (
        "id" SERIAL PRIMARY KEY,
        "standard_id" INTEGER NOT NULL,
        "category" VARCHAR NOT NULL,
        "description" TEXT NOT NULL,
        "surface_preparation" TEXT NOT NULL,
        CONSTRAINT "UQ_coating_env_standard_category" UNIQUE ("standard_id", "category"),
        CONSTRAINT "FK_coating_env_standard" FOREIGN KEY ("standard_id") REFERENCES "coating_standards"("id") ON DELETE CASCADE
      )
    `);

    // Create coating_specifications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "coating_specifications" (
        "id" SERIAL PRIMARY KEY,
        "environment_id" INTEGER NOT NULL,
        "coating_type" VARCHAR NOT NULL,
        "lifespan" VARCHAR NOT NULL,
        "system" TEXT NOT NULL,
        "coats" VARCHAR NOT NULL,
        "total_dft_um_range" VARCHAR NOT NULL,
        "applications" TEXT NOT NULL,
        CONSTRAINT "FK_coating_spec_env" FOREIGN KEY ("environment_id") REFERENCES "coating_environments"("id") ON DELETE CASCADE
      )
    `);

    // Insert ISO 12944 standard
    await queryRunner.query(`
      INSERT INTO "coating_standards" ("code", "description", "general_surface_preparation", "notes")
      VALUES (
        'ISO 12944',
        'International standard for protective paint systems on steel structures. Defines corrosivity categories (C1 to C5, CX) and immersion (Im1-Im4). Durability ranges: Low (L: 2-7 years), Medium (M: 7-15 years), High (H: 15-25 years), Very High (VH: >25 years).',
        'Sa 2½ (very thorough blast cleaning) per ISO 8501-1 for most systems. For immersion (Im), Sa 2½ mandatory. Edges, welds, and corners to be rounded and stripe-coated.',
        'The app should map location/environment to corrosivity category, then recommend system and DFT range based on selected lifespan. Higher end of DFT range for harsher sub-conditions or longer expected life. Always specify surface preparation. Consult paint manufacturer for qualified products and exact NDFT requirements.'
      )
    `);

    // Insert NORSOK M-501 standard
    await queryRunner.query(`
      INSERT INTO "coating_standards" ("code", "description", "general_surface_preparation", "notes")
      VALUES (
        'NORSOK M-501',
        'Strict Norwegian standard for offshore environments. Systems 1-8 designed primarily for >20 year life in extreme marine conditions.',
        'Sa 2½ per ISO 8501-1, angular profile 50-100 µm. Welds ground smooth, sharp edges rounded to R≥2 mm.',
        NULL
      )
    `);

    // Get standard IDs
    const iso12944 = await queryRunner.query(`SELECT id FROM "coating_standards" WHERE code = 'ISO 12944'`);
    const norsok = await queryRunner.query(`SELECT id FROM "coating_standards" WHERE code = 'NORSOK M-501'`);
    const isoId = iso12944[0].id;
    const norsokId = norsok[0].id;

    // Insert ISO 12944 environments
    const environments = [
      { category: 'C1', description: 'Very low corrosivity - heated buildings with clean atmospheres', surfacePrep: 'Sa 2½ or St 3 (manual cleaning often sufficient)' },
      { category: 'C2', description: 'Low corrosivity - rural or unheated buildings with low pollution', surfacePrep: 'Sa 2½' },
      { category: 'C3', description: 'Medium corrosivity - urban/industrial or coastal with low salinity', surfacePrep: 'Sa 2½' },
      { category: 'C4', description: 'High corrosivity - industrial areas or coastal with moderate salinity', surfacePrep: 'Sa 2½' },
      { category: 'C5', description: 'Very high corrosivity - aggressive industrial or high-salinity coastal', surfacePrep: 'Sa 2½ (profile 50-85 µm)' },
      { category: 'CX', description: 'Extreme corrosivity - offshore, extreme humidity, aggressive atmospheres', surfacePrep: 'Sa 2½ (profile 75-100 µm)' },
      { category: 'Im1-Im3', description: 'Immersion in fresh, brackish or seawater', surfacePrep: 'Sa 2½ mandatory (profile 50-100 µm), sweep blast if needed' },
    ];

    for (const env of environments) {
      await queryRunner.query(`
        INSERT INTO "coating_environments" ("standard_id", "category", "description", "surface_preparation")
        VALUES ($1, $2, $3, $4)
      `, [isoId, env.category, env.description, env.surfacePrep]);
    }

    // Insert NORSOK environment
    await queryRunner.query(`
      INSERT INTO "coating_environments" ("standard_id", "category", "description", "surface_preparation")
      VALUES ($1, 'Offshore Atmospheric / Splash Zone / Immersion', 'Extreme marine environment', 'Sa 2½ (typically 75-100 µm profile)')
    `, [norsokId]);

    // Get environment IDs
    const envIds: { [key: string]: number } = {};
    const allEnvs = await queryRunner.query(`SELECT id, category FROM "coating_environments"`);
    for (const env of allEnvs) {
      envIds[env.category] = env.id;
    }

    // C1 External Specs
    await queryRunner.query(`
      INSERT INTO "coating_specifications" ("environment_id", "coating_type", "lifespan", "system", "coats", "total_dft_um_range", "applications")
      VALUES
        ($1, 'external', 'Low', 'Alkyd primer + Alkyd finish', '2', '80-100', 'External piping, chutes, tanks in controlled indoor environments'),
        ($1, 'external', 'Medium', 'Alkyd primer + Alkyd or polyurethane finish', '2', '100-120', 'External piping, chutes, tanks in controlled indoor environments'),
        ($1, 'external', 'High', 'Alkyd primer + Alkyd or single-component polyurethane finish', '2', '120-160', 'External piping, chutes, tanks in controlled indoor environments'),
        ($1, 'external', 'Very High', 'Epoxy primer + Polyurethane finish', '2', '160-200', 'External piping, chutes, tanks in controlled indoor environments')
    `, [envIds['C1']]);

    // C1 Internal Specs
    await queryRunner.query(`
      INSERT INTO "coating_specifications" ("environment_id", "coating_type", "lifespan", "system", "coats", "total_dft_um_range", "applications")
      VALUES
        ($1, 'internal', 'Medium', 'Single-pack epoxy lining', '1-2', '80-120', 'Internal tanks for dry or neutral contents'),
        ($1, 'internal', 'High', 'Single-pack epoxy or polyurethane lining', '2', '120-160', 'Internal tanks for dry or neutral contents'),
        ($1, 'internal', 'Very High', 'Two-pack epoxy lining', '2', '160-200', 'Internal tanks for dry or neutral contents')
    `, [envIds['C1']]);

    // C2 External Specs
    await queryRunner.query(`
      INSERT INTO "coating_specifications" ("environment_id", "coating_type", "lifespan", "system", "coats", "total_dft_um_range", "applications")
      VALUES
        ($1, 'external', 'Low', 'Epoxy zinc phosphate primer + Alkyd finish', '2', '100-120', 'External piping, chutes, tanks'),
        ($1, 'external', 'Medium', 'Epoxy zinc phosphate primer + Polyurethane topcoat', '2', '140-180', 'External piping, chutes, tanks'),
        ($1, 'external', 'High', 'Epoxy zinc phosphate primer + Epoxy intermediate + Polyurethane topcoat', '3', '180-240', 'External piping, chutes, tanks'),
        ($1, 'external', 'Very High', 'Zinc-rich primer + Epoxy intermediate + Polyurethane topcoat', '3', '240-300', 'External piping, chutes, tanks')
    `, [envIds['C2']]);

    // C2 Internal Specs
    await queryRunner.query(`
      INSERT INTO "coating_specifications" ("environment_id", "coating_type", "lifespan", "system", "coats", "total_dft_um_range", "applications")
      VALUES
        ($1, 'internal', 'Medium', 'High-build epoxy lining', '2', '150-200', 'Internal tanks or chutes for non-aggressive contents'),
        ($1, 'internal', 'High', 'High-build epoxy lining', '2', '200-250', 'Internal tanks or chutes for non-aggressive contents'),
        ($1, 'internal', 'Very High', 'High-build epoxy lining', '2-3', '250-350', 'Internal tanks or chutes for non-aggressive contents')
    `, [envIds['C2']]);

    // C3 External Specs
    await queryRunner.query(`
      INSERT INTO "coating_specifications" ("environment_id", "coating_type", "lifespan", "system", "coats", "total_dft_um_range", "applications")
      VALUES
        ($1, 'external', 'Low', 'Epoxy zinc phosphate primer + Polyurethane topcoat', '2', '160-200', 'External piping, chutes, tanks'),
        ($1, 'external', 'Medium', 'Epoxy zinc phosphate primer + Epoxy MIO + Polyurethane topcoat', '3', '200-240', 'External piping, chutes, tanks'),
        ($1, 'external', 'High', 'Zinc-rich epoxy primer + Epoxy MIO intermediate + Polyurethane topcoat', '3', '240-300', 'External piping, chutes, tanks'),
        ($1, 'external', 'Very High', 'Zinc-rich epoxy primer + Multiple epoxy MIO + Polyurethane topcoat', '4', '300-380', 'External piping, chutes, tanks')
    `, [envIds['C3']]);

    // C3 Internal Specs
    await queryRunner.query(`
      INSERT INTO "coating_specifications" ("environment_id", "coating_type", "lifespan", "system", "coats", "total_dft_um_range", "applications")
      VALUES
        ($1, 'internal', 'Medium', 'Epoxy phenolic lining', '2', '200-250', 'Internal tanks for water or mild chemicals'),
        ($1, 'internal', 'High', 'High-build epoxy phenolic lining', '2', '250-350', 'Internal tanks for water or mild chemicals'),
        ($1, 'internal', 'Very High', 'High-build epoxy phenolic lining', '3', '350-450', 'Internal tanks for water or mild chemicals')
    `, [envIds['C3']]);

    // C4 External Specs
    await queryRunner.query(`
      INSERT INTO "coating_specifications" ("environment_id", "coating_type", "lifespan", "system", "coats", "total_dft_um_range", "applications")
      VALUES
        ($1, 'external', 'Low', 'Zinc-rich epoxy primer + Epoxy intermediate + Polyurethane topcoat', '3', '200-240', 'External piping, chutes, tanks'),
        ($1, 'external', 'Medium', 'Zinc-rich epoxy primer + High-build epoxy MIO + Polyurethane topcoat', '3', '240-300', 'External piping, chutes, tanks'),
        ($1, 'external', 'High', 'Zinc-rich epoxy primer + Multiple high-build epoxy MIO + Polyurethane topcoat', '3-4', '300-380', 'External piping, chutes, tanks'),
        ($1, 'external', 'Very High', 'Zinc-rich primer + Multiple high-build epoxy layers + Polyurethane topcoat', '4', '380-480', 'External piping, chutes, tanks')
    `, [envIds['C4']]);

    // C4 Internal Specs
    await queryRunner.query(`
      INSERT INTO "coating_specifications" ("environment_id", "coating_type", "lifespan", "system", "coats", "total_dft_um_range", "applications")
      VALUES
        ($1, 'internal', 'Medium', 'Solvent-free high-build epoxy lining', '2', '300-400', 'Internal tanks for corrosive fluids'),
        ($1, 'internal', 'High', 'Solvent-free high-build epoxy or novolac lining', '2', '400-500', 'Internal tanks for corrosive fluids'),
        ($1, 'internal', 'Very High', 'Epoxy novolac or glass-flake epoxy lining', '2-3', '500-700', 'Internal tanks for corrosive fluids')
    `, [envIds['C4']]);

    // C5 External Specs
    await queryRunner.query(`
      INSERT INTO "coating_specifications" ("environment_id", "coating_type", "lifespan", "system", "coats", "total_dft_um_range", "applications")
      VALUES
        ($1, 'external', 'Low', 'Zinc-rich epoxy primer + Epoxy MIO + Polyurethane topcoat', '3', '240-280', 'External piping, chutes, tanks'),
        ($1, 'external', 'Medium', 'Zinc-rich epoxy primer + High-build epoxy MIO + Polyurethane topcoat', '3', '280-340', 'External piping, chutes, tanks'),
        ($1, 'external', 'High', 'Zinc-rich epoxy primer + Multiple high-build epoxy MIO + Polyurethane topcoat', '4', '340-420', 'External piping, chutes, tanks'),
        ($1, 'external', 'Very High', 'Zinc-rich primer + Multiple high-build epoxy MIO layers + Polysiloxane topcoat', '4', '420-520', 'External piping, chutes, tanks')
    `, [envIds['C5']]);

    // C5 Internal Specs
    await queryRunner.query(`
      INSERT INTO "coating_specifications" ("environment_id", "coating_type", "lifespan", "system", "coats", "total_dft_um_range", "applications")
      VALUES
        ($1, 'internal', 'Medium', 'Epoxy novolac lining', '2', '400-500', 'Internal tanks for aggressive chemicals'),
        ($1, 'internal', 'High', 'Glass-flake epoxy novolac lining', '2', '500-700', 'Internal tanks for aggressive chemicals'),
        ($1, 'internal', 'Very High', 'Glass-flake vinyl ester or reinforced novolac lining', '2-3', '700-1000', 'Internal tanks for aggressive chemicals')
    `, [envIds['C5']]);

    // CX External Specs
    await queryRunner.query(`
      INSERT INTO "coating_specifications" ("environment_id", "coating_type", "lifespan", "system", "coats", "total_dft_um_range", "applications")
      VALUES
        ($1, 'external', 'Low', 'Zinc-rich epoxy + Epoxy MIO + Polysiloxane topcoat', '3', '300-400', 'External piping, tanks in offshore/extreme conditions'),
        ($1, 'external', 'Medium', 'Zinc-rich epoxy + Multiple epoxy MIO + Polysiloxane topcoat', '4', '400-500', 'External piping, tanks in offshore/extreme conditions'),
        ($1, 'external', 'High', 'Zinc-rich epoxy + Multiple high-build epoxy + Polysiloxane topcoat', '4', '500-650', 'External piping, tanks in offshore/extreme conditions'),
        ($1, 'external', 'Very High', 'Thermally sprayed aluminium (TSA) with sealer or glass-flake epoxy', '1-3', '200-1000', 'External piping, tanks in extreme offshore conditions')
    `, [envIds['CX']]);

    // CX Internal Specs
    await queryRunner.query(`
      INSERT INTO "coating_specifications" ("environment_id", "coating_type", "lifespan", "system", "coats", "total_dft_um_range", "applications")
      VALUES
        ($1, 'internal', 'Medium', 'Glass-flake epoxy lining', '2', '600-800', 'Internal tanks in aggressive zones'),
        ($1, 'internal', 'High', 'Glass-flake reinforced vinyl ester lining', '2', '800-1000', 'Internal tanks in aggressive zones'),
        ($1, 'internal', 'Very High', 'Multiple-layer glass-flake vinyl ester lining', '3', '1000-1500', 'Internal tanks in aggressive zones')
    `, [envIds['CX']]);

    // Im1-Im3 Internal Specs (no external specs for immersion)
    await queryRunner.query(`
      INSERT INTO "coating_specifications" ("environment_id", "coating_type", "lifespan", "system", "coats", "total_dft_um_range", "applications")
      VALUES
        ($1, 'internal', 'Low', 'High-build epoxy lining', '2', '250-350', 'Internal tanks/piping for water'),
        ($1, 'internal', 'Medium', 'Solvent-free high-build epoxy lining', '2', '350-450', 'Internal tanks/piping for water'),
        ($1, 'internal', 'High', 'Solvent-free high-build epoxy (with cathodic protection recommended)', '2', '450-600', 'Internal tanks/piping for seawater'),
        ($1, 'internal', 'Very High', 'Glass-flake epoxy or vinyl ester lining', '2-3', '600-1000', 'Internal tanks/piping for aggressive immersion')
    `, [envIds['Im1-Im3']]);

    // NORSOK External Specs
    await queryRunner.query(`
      INSERT INTO "coating_specifications" ("environment_id", "coating_type", "lifespan", "system", "coats", "total_dft_um_range", "applications")
      VALUES
        ($1, 'external', 'High (>20 years)', 'System 1: Zinc-rich epoxy primer + Epoxy tie coat + Acrylic polyurethane topcoat', '3', '275-350', 'External structural steel, piping, tanks <120°C'),
        ($1, 'external', 'High (>20 years)', 'System 2: Thermally sprayed aluminium (TSA) + sealer', '1-2', '200-250', 'High temperature external piping/tanks'),
        ($1, 'external', 'High (>20 years)', 'System 7: Glass-flake polyester or vinyl ester', '2', '800-1200', 'Splash zone external piping/tanks')
    `, [envIds['Offshore Atmospheric / Splash Zone / Immersion']]);

    // NORSOK Internal Specs
    await queryRunner.query(`
      INSERT INTO "coating_specifications" ("environment_id", "coating_type", "lifespan", "system", "coats", "total_dft_um_range", "applications")
      VALUES
        ($1, 'internal', 'High (>20 years)', 'System 3B/3C: Solvent-free epoxy lining', '2', '350-450', 'Internal tanks for seawater or hydrocarbons'),
        ($1, 'internal', 'High (>20 years)', 'System 3F: Epoxy novolac tank lining', '2', '400-500', 'Internal process vessels <130°C')
    `, [envIds['Offshore Atmospheric / Splash Zone / Immersion']]);

    console.log('Coating specification tables created and populated successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "coating_specifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coating_environments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coating_standards"`);
  }
}
