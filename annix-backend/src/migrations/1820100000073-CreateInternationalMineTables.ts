import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Issue #264 follow-up. Adds country-specific mine reference tables for
 * Botswana, Namibia, Zimbabwe, Zambia, Mozambique — same shape as
 * sa_mines but with environmental + logistics fields the RFQ pricing
 * tools also need.
 *
 * Each table is seeded with a foundational set of well-known active /
 * recent-care-and-maintenance mines per country. The list isn't
 * exhaustive — every app's "create new mine" flow can extend.
 *
 * Langer Heinrich was previously inserted into sa_mines (a stop-gap
 * because no namibia_mines table existed). This migration moves it
 * into namibia_mines and removes the sa_mines stub.
 */
export class CreateInternationalMineTables1820100000073 implements MigrationInterface {
  name = "CreateInternationalMineTables1820100000073";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "country_mine_type_enum" AS ENUM ('Underground', 'Open Cast', 'Both');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "country_mine_operational_status_enum" AS ENUM ('Active', 'Care and Maintenance', 'Closed', 'Proposed');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "country_mine_climate_zone_enum" AS ENUM ('Arid', 'Semi-arid', 'Tropical', 'Subtropical', 'Temperate', 'Highveld');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "country_mine_road_access_quality_enum" AS ENUM ('Good', 'Fair', 'Poor', 'Difficult');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    const countries: Array<{ table: string; rows: SeedRow[] }> = [
      { table: "botswana_mines", rows: BOTSWANA_SEED },
      { table: "namibia_mines", rows: NAMIBIA_SEED },
      { table: "zimbabwe_mines", rows: ZIMBABWE_SEED },
      { table: "zambia_mines", rows: ZAMBIA_SEED },
      { table: "mozambique_mines", rows: MOZAMBIQUE_SEED },
    ];

    for (const { table } of countries) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "${table}" (
          id SERIAL PRIMARY KEY,
          mine_name varchar(255) NOT NULL,
          operating_company varchar(255) NOT NULL,
          commodity_id int NULL,
          region varchar(100) NULL,
          district varchar(255) NULL,
          nearest_town varchar(100) NULL,
          physical_address text NULL,
          latitude decimal(10, 7) NULL,
          longitude decimal(10, 7) NULL,
          elevation_m int NULL,
          mine_type "country_mine_type_enum" NOT NULL DEFAULT 'Underground',
          operational_status "country_mine_operational_status_enum" NOT NULL DEFAULT 'Active',
          climate_zone "country_mine_climate_zone_enum" NULL,
          annual_rainfall_mm int NULL,
          mean_temp_min_c decimal(4, 1) NULL,
          mean_temp_max_c decimal(4, 1) NULL,
          humidity_avg_percent decimal(4, 1) NULL,
          terrain_type varchar(100) NULL,
          distance_to_nearest_port_km int NULL,
          nearest_port varchar(100) NULL,
          distance_to_capital_km int NULL,
          road_access_quality "country_mine_road_access_quality_enum" NULL,
          primary_water_source varchar(100) NULL,
          primary_power_source varchar(100) NULL,
          environmental_concerns text NULL,
          notes text NULL,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_${table}_region" ON "${table}" ("region")`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_${table}_status" ON "${table}" ("operational_status")`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_${table}_company" ON "${table}" ("operating_company")`,
      );
    }

    for (const { table, rows } of countries) {
      for (const r of rows) {
        await queryRunner.query(
          `
          INSERT INTO "${table}" (
            mine_name, operating_company, region, district, nearest_town,
            physical_address, latitude, longitude, elevation_m,
            mine_type, operational_status, climate_zone, annual_rainfall_mm,
            mean_temp_min_c, mean_temp_max_c, humidity_avg_percent,
            terrain_type, distance_to_nearest_port_km, nearest_port,
            distance_to_capital_km, road_access_quality,
            primary_water_source, primary_power_source,
            environmental_concerns, notes
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9,
            $10, $11, $12, $13,
            $14, $15, $16,
            $17, $18, $19,
            $20, $21,
            $22, $23,
            $24, $25
          )
          ON CONFLICT DO NOTHING
        `,
          [
            r.mineName,
            r.operatingCompany,
            r.region ?? null,
            r.district ?? null,
            r.nearestTown ?? null,
            r.physicalAddress ?? null,
            r.latitude ?? null,
            r.longitude ?? null,
            r.elevationM ?? null,
            r.mineType ?? "Open Cast",
            r.operationalStatus ?? "Active",
            r.climateZone ?? null,
            r.annualRainfallMm ?? null,
            r.meanTempMinC ?? null,
            r.meanTempMaxC ?? null,
            r.humidityAvgPercent ?? null,
            r.terrainType ?? null,
            r.distanceToNearestPortKm ?? null,
            r.nearestPort ?? null,
            r.distanceToCapitalKm ?? null,
            r.roadAccessQuality ?? null,
            r.primaryWaterSource ?? null,
            r.primaryPowerSource ?? null,
            r.environmentalConcerns ?? null,
            r.notes ?? null,
          ],
        );
      }
    }

    // Remove the Langer Heinrich stop-gap row from sa_mines (it was inserted
    // before namibia_mines existed).
    await queryRunner.query(`DELETE FROM sa_mines WHERE LOWER(mine_name) LIKE '%langer heinrich%'`);

    // Drop the FK from nix_extractions.mine_id to sa_mines — mine_id can now
    // reference any country's mine table, so the constraint is wrong. Add
    // mine_country to disambiguate.
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "nix_extractions" DROP CONSTRAINT IF EXISTS "FK_nix_extractions_mine";
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "nix_extractions"
        ADD COLUMN IF NOT EXISTS "mine_country" varchar(64)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_nix_extractions_mine_country"
        ON "nix_extractions" ("mine_country", "mine_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_nix_extractions_mine_country"`);
    await queryRunner.query(`ALTER TABLE "nix_extractions" DROP COLUMN IF EXISTS "mine_country"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "botswana_mines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "namibia_mines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "zimbabwe_mines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "zambia_mines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mozambique_mines"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "country_mine_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "country_mine_operational_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "country_mine_climate_zone_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "country_mine_road_access_quality_enum"`);
  }
}

interface SeedRow {
  mineName: string;
  operatingCompany: string;
  region?: string;
  district?: string;
  nearestTown?: string;
  physicalAddress?: string;
  latitude?: number;
  longitude?: number;
  elevationM?: number;
  mineType?: "Underground" | "Open Cast" | "Both";
  operationalStatus?: "Active" | "Care and Maintenance" | "Closed" | "Proposed";
  climateZone?: "Arid" | "Semi-arid" | "Tropical" | "Subtropical" | "Temperate" | "Highveld";
  annualRainfallMm?: number;
  meanTempMinC?: number;
  meanTempMaxC?: number;
  humidityAvgPercent?: number;
  terrainType?: string;
  distanceToNearestPortKm?: number;
  nearestPort?: string;
  distanceToCapitalKm?: number;
  roadAccessQuality?: "Good" | "Fair" | "Poor" | "Difficult";
  primaryWaterSource?: string;
  primaryPowerSource?: string;
  environmentalConcerns?: string;
  notes?: string;
}

const BOTSWANA_SEED: SeedRow[] = [
  {
    mineName: "Jwaneng Diamond Mine",
    operatingCompany: "Debswana Diamond Company (De Beers / Botswana Govt)",
    region: "Southern District",
    nearestTown: "Jwaneng",
    physicalAddress: "Jwaneng, Southern District, Botswana",
    latitude: -24.6022,
    longitude: 24.7233,
    elevationM: 1200,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Semi-arid",
    annualRainfallMm: 380,
    meanTempMinC: 5,
    meanTempMaxC: 33,
    humidityAvgPercent: 35,
    terrainType: "Kalahari sandveld",
    distanceToNearestPortKm: 1100,
    nearestPort: "Walvis Bay (NA) / Durban (ZA)",
    distanceToCapitalKm: 170,
    roadAccessQuality: "Good",
    primaryWaterSource: "Boreholes / treated effluent recycle",
    primaryPowerSource: "BPC grid (coal-fired backbone)",
    environmentalConcerns: "Water scarcity; Kalahari habitat sensitivity",
    notes: "World's richest diamond mine by value. Cut-9 expansion deepens pit through 2034.",
  },
  {
    mineName: "Orapa Diamond Mine",
    operatingCompany: "Debswana Diamond Company",
    region: "Central District",
    district: "Boteti",
    nearestTown: "Orapa",
    latitude: -21.3,
    longitude: 25.3667,
    elevationM: 920,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Semi-arid",
    annualRainfallMm: 460,
    meanTempMinC: 7,
    meanTempMaxC: 34,
    distanceToNearestPortKm: 1500,
    nearestPort: "Walvis Bay (NA)",
    distanceToCapitalKm: 240,
    roadAccessQuality: "Good",
    primaryWaterSource: "Mopipi Dam (surface)",
    primaryPowerSource: "BPC grid",
    notes: "Largest diamond mine by area in the world.",
  },
  {
    mineName: "Letlhakane Diamond Mine",
    operatingCompany: "Debswana Diamond Company",
    region: "Central District",
    district: "Boteti",
    nearestTown: "Letlhakane",
    latitude: -21.4167,
    longitude: 25.6,
    mineType: "Open Cast",
    operationalStatus: "Care and Maintenance",
    climateZone: "Semi-arid",
    annualRainfallMm: 460,
    distanceToCapitalKm: 290,
    notes: "Moved to tailings retreatment after 2017.",
  },
  {
    mineName: "Karowe Diamond Mine",
    operatingCompany: "Lucara Diamond Corp",
    region: "Central District",
    district: "Boteti",
    nearestTown: "Letlhakane",
    latitude: -21.5081,
    longitude: 25.4794,
    mineType: "Both",
    operationalStatus: "Active",
    climateZone: "Semi-arid",
    annualRainfallMm: 460,
    distanceToCapitalKm: 300,
    roadAccessQuality: "Good",
    primaryPowerSource: "BPC grid",
    notes:
      "Source of Lesedi La Rona and other Type IIa large stones. Underground expansion underway.",
  },
  {
    mineName: "Damtshaa Diamond Mine",
    operatingCompany: "Debswana Diamond Company",
    region: "Central District",
    district: "Boteti",
    latitude: -21.3,
    longitude: 25.4167,
    mineType: "Open Cast",
    operationalStatus: "Care and Maintenance",
    climateZone: "Semi-arid",
  },
  {
    mineName: "Khoemacau Copper Mine",
    operatingCompany: "Khoemacau Copper Mining (MMG)",
    region: "North-West District",
    nearestTown: "Toteng",
    latitude: -20.667,
    longitude: 22.833,
    mineType: "Underground",
    operationalStatus: "Active",
    climateZone: "Semi-arid",
    annualRainfallMm: 470,
    meanTempMinC: 8,
    meanTempMaxC: 33,
    distanceToCapitalKm: 850,
    primaryPowerSource: "Solar + BPC grid",
    notes: "Kalahari Copper Belt. Acquired by MMG 2024.",
  },
  {
    mineName: "Mowana Copper Mine",
    operatingCompany: "Cradle Arc / Premium Nickel (acquired)",
    region: "Central District",
    district: "Bobirwa",
    nearestTown: "Bobonong",
    mineType: "Open Cast",
    operationalStatus: "Care and Maintenance",
    climateZone: "Semi-arid",
    annualRainfallMm: 380,
  },
  {
    mineName: "Selebi Phikwe Mines (BCL)",
    operatingCompany: "Premium Nickel Resources (acquired BCL)",
    region: "Central District",
    nearestTown: "Selebi Phikwe",
    mineType: "Underground",
    operationalStatus: "Care and Maintenance",
    climateZone: "Semi-arid",
    notes: "Historic copper-nickel; under restart study by Premium Nickel.",
  },
  {
    mineName: "Morupule Coal Mine",
    operatingCompany: "Minergy / Morupule Coal Mine Ltd",
    region: "Central District",
    nearestTown: "Palapye",
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Semi-arid",
    annualRainfallMm: 420,
    primaryPowerSource: "Self-generation (mine-mouth power station adjacent)",
    notes: "Feeds Morupule A & B power stations.",
  },
  {
    mineName: "Mmamabula Coal & Power",
    operatingCompany: "Minergy",
    region: "Central District",
    nearestTown: "Mahalapye",
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Semi-arid",
    notes: "Independent power producer feeding regional grid.",
  },
  {
    mineName: "Boseto Copper",
    operatingCompany: "Cupric Canyon Capital (defunct) / various",
    region: "North-West District",
    mineType: "Open Cast",
    operationalStatus: "Care and Maintenance",
    climateZone: "Semi-arid",
  },
];

const NAMIBIA_SEED: SeedRow[] = [
  {
    mineName: "Rössing Uranium Mine",
    operatingCompany: "China National Uranium Corporation (CNUC) — formerly Rio Tinto",
    region: "Erongo",
    nearestTown: "Arandis",
    physicalAddress: "Arandis, Erongo Region, Namibia",
    latitude: -22.4839,
    longitude: 15.0414,
    elevationM: 470,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Arid",
    annualRainfallMm: 25,
    meanTempMinC: 8,
    meanTempMaxC: 32,
    humidityAvgPercent: 35,
    terrainType: "Namib Desert gravel plains",
    distanceToNearestPortKm: 70,
    nearestPort: "Walvis Bay",
    distanceToCapitalKm: 350,
    roadAccessQuality: "Good",
    primaryWaterSource: "NamWater pipeline (Atlantic desalination + Omdel aquifer)",
    primaryPowerSource: "NamPower grid (mostly imported from Eskom)",
    environmentalConcerns: "Coastal fog corrosion; uranium tailings management; water scarcity",
    notes:
      "World's longest-running open-pit uranium mine (since 1976). Life of mine extended to 2036.",
  },
  {
    mineName: "Langer Heinrich Uranium Mine",
    operatingCompany: "Paladin Energy",
    region: "Erongo",
    nearestTown: "Swakopmund",
    physicalAddress: "Erongo Region, Namibia (80 km east of Swakopmund)",
    latitude: -22.8244,
    longitude: 15.3236,
    elevationM: 480,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Arid",
    annualRainfallMm: 20,
    meanTempMinC: 9,
    meanTempMaxC: 33,
    humidityAvgPercent: 30,
    terrainType: "Namib Desert calcrete plateau",
    distanceToNearestPortKm: 80,
    nearestPort: "Walvis Bay",
    distanceToCapitalKm: 380,
    roadAccessQuality: "Good",
    primaryWaterSource: "NamWater pipeline (Erongo desalination plant)",
    primaryPowerSource: "NamPower grid",
    environmentalConcerns:
      "High coastal salinity / fog corrosion on coatings; arid dust loads on mechanical seals",
    notes:
      "Uranium calcrete deposit; care-and-maintenance 2018, restarted production 2024 under Paladin.",
  },
  {
    mineName: "Husab Uranium Mine",
    operatingCompany: "Swakop Uranium (CGN — China General Nuclear)",
    region: "Erongo",
    nearestTown: "Arandis",
    latitude: -22.5744,
    longitude: 14.9728,
    elevationM: 600,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Arid",
    annualRainfallMm: 25,
    distanceToNearestPortKm: 60,
    nearestPort: "Walvis Bay",
    distanceToCapitalKm: 340,
    roadAccessQuality: "Good",
    primaryWaterSource: "Erongo desalination pipeline",
    primaryPowerSource: "NamPower grid",
    notes: "World's third-largest uranium mine.",
  },
  {
    mineName: "Trekkopje Uranium Mine",
    operatingCompany: "Orano (formerly Areva)",
    region: "Erongo",
    nearestTown: "Arandis",
    mineType: "Open Cast",
    operationalStatus: "Care and Maintenance",
    climateZone: "Arid",
    annualRainfallMm: 25,
    distanceToNearestPortKm: 50,
    nearestPort: "Walvis Bay",
    notes:
      "Built but never reached commercial production; on care and maintenance since 2012. Site hosts the Erongo desalination plant supplying other Erongo mines.",
  },
  {
    mineName: "Otjikoto Gold Mine",
    operatingCompany: "B2Gold",
    region: "Otjozondjupa",
    nearestTown: "Otavi",
    latitude: -19.7333,
    longitude: 17.2167,
    elevationM: 1400,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Semi-arid",
    annualRainfallMm: 530,
    meanTempMinC: 5,
    meanTempMaxC: 32,
    distanceToNearestPortKm: 700,
    nearestPort: "Walvis Bay",
    distanceToCapitalKm: 400,
    roadAccessQuality: "Good",
    primaryPowerSource: "On-site solar PV + NamPower grid",
    notes: "Includes the Wolfshag underground extension.",
  },
  {
    mineName: "Navachab Gold Mine",
    operatingCompany: "QKR Corporation",
    region: "Erongo",
    nearestTown: "Karibib",
    latitude: -21.9667,
    longitude: 15.85,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Arid",
    annualRainfallMm: 200,
    distanceToCapitalKm: 200,
  },
  {
    mineName: "Tsumeb Smelter",
    operatingCompany: "Dundee Precious Metals",
    region: "Oshikoto",
    nearestTown: "Tsumeb",
    latitude: -19.2333,
    longitude: 17.7167,
    mineType: "Underground",
    operationalStatus: "Active",
    climateZone: "Semi-arid",
    annualRainfallMm: 530,
    notes:
      "Custom copper smelter (treats concentrate from third-party mines, complex chemistry capable).",
  },
  {
    mineName: "Skorpion Zinc Mine",
    operatingCompany: "Vedanta Resources",
    region: "ǁKaras",
    nearestTown: "Rosh Pinah",
    latitude: -27.95,
    longitude: 16.6333,
    mineType: "Open Cast",
    operationalStatus: "Care and Maintenance",
    climateZone: "Arid",
    annualRainfallMm: 50,
    distanceToNearestPortKm: 380,
    nearestPort: "Lüderitz",
    notes: "Pit-wall failure 2020; care and maintenance pending refinancing.",
  },
  {
    mineName: "Rosh Pinah Zinc Mine",
    operatingCompany: "Trevali Mining (acquired Glencore stake)",
    region: "ǁKaras",
    nearestTown: "Rosh Pinah",
    latitude: -27.95,
    longitude: 16.7,
    mineType: "Underground",
    operationalStatus: "Active",
    climateZone: "Arid",
    annualRainfallMm: 60,
    distanceToNearestPortKm: 350,
    nearestPort: "Lüderitz",
  },
  {
    mineName: "Uis Tin & Lithium Mine",
    operatingCompany: "Andrada Mining (formerly AfriTin)",
    region: "Erongo",
    nearestTown: "Uis",
    latitude: -21.2,
    longitude: 14.8667,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Arid",
    annualRainfallMm: 100,
    notes: "Tin restart 2019, lithium expansion underway.",
  },
  {
    mineName: "Kombat Copper Mine",
    operatingCompany: "Trigon Metals",
    region: "Otjozondjupa",
    nearestTown: "Kombat",
    latitude: -19.7,
    longitude: 17.7333,
    mineType: "Underground",
    operationalStatus: "Active",
    climateZone: "Semi-arid",
    notes: "Restarted 2022 after 2008 closure.",
  },
  {
    mineName: "Otjihase Copper Mine",
    operatingCompany: "Dundee Precious Metals (Tsumeb feeder)",
    region: "Khomas",
    nearestTown: "Windhoek",
    latitude: -22.4167,
    longitude: 17.3333,
    mineType: "Underground",
    operationalStatus: "Care and Maintenance",
    climateZone: "Semi-arid",
  },
  {
    mineName: "Daures Green Hydrogen Hub",
    operatingCompany: "Hyphen Hydrogen Energy / GH2 consortium",
    region: "Erongo / ǁKaras",
    mineType: "Open Cast",
    operationalStatus: "Proposed",
    climateZone: "Arid",
    notes: "Not strictly a mine; included for fab-quote relevance (large piping demand).",
  },
];

const ZIMBABWE_SEED: SeedRow[] = [
  {
    mineName: "Zimplats Mine (Ngezi / Selous)",
    operatingCompany: "Zimplats Holdings (Implats)",
    region: "Mashonaland West",
    nearestTown: "Mhondoro-Ngezi",
    latitude: -18.05,
    longitude: 30.2167,
    elevationM: 1280,
    mineType: "Underground",
    operationalStatus: "Active",
    climateZone: "Subtropical",
    annualRainfallMm: 750,
    meanTempMinC: 8,
    meanTempMaxC: 28,
    humidityAvgPercent: 60,
    distanceToNearestPortKm: 600,
    nearestPort: "Beira (MZ)",
    distanceToCapitalKm: 150,
    roadAccessQuality: "Fair",
    primaryPowerSource: "ZESA grid + on-site backup",
    notes: "Largest platinum producer in Zimbabwe. Includes Mupani / Bimha shafts.",
  },
  {
    mineName: "Mimosa Platinum Mine",
    operatingCompany: "Mimosa Mining (Implats / Sibanye-Stillwater JV)",
    region: "Midlands",
    nearestTown: "Zvishavane",
    latitude: -20.3333,
    longitude: 30.05,
    mineType: "Underground",
    operationalStatus: "Active",
    climateZone: "Subtropical",
    annualRainfallMm: 600,
    distanceToCapitalKm: 350,
  },
  {
    mineName: "Unki Platinum Mine",
    operatingCompany: "Anglo American Platinum",
    region: "Midlands",
    nearestTown: "Shurugwi",
    latitude: -19.6833,
    longitude: 30.0167,
    mineType: "Underground",
    operationalStatus: "Active",
    climateZone: "Subtropical",
    annualRainfallMm: 700,
  },
  {
    mineName: "Bindura Nickel (Trojan + Shangani)",
    operatingCompany: "Bindura Nickel Corporation (Sotic)",
    region: "Mashonaland Central",
    nearestTown: "Bindura",
    latitude: -17.3,
    longitude: 31.3333,
    mineType: "Underground",
    operationalStatus: "Active",
    climateZone: "Subtropical",
    annualRainfallMm: 850,
  },
  {
    mineName: "Hwange Colliery",
    operatingCompany: "Hwange Colliery Company",
    region: "Matabeleland North",
    nearestTown: "Hwange",
    latitude: -18.3667,
    longitude: 26.5,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Subtropical",
    annualRainfallMm: 600,
    notes: "Coking + thermal coal, supplies Hwange Power Station.",
  },
  {
    mineName: "Murowa Diamond Mine",
    operatingCompany: "RZ Murowa (Riozim)",
    region: "Midlands",
    nearestTown: "Zvishavane",
    latitude: -20.7833,
    longitude: 30.2333,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Subtropical",
    annualRainfallMm: 550,
  },
  {
    mineName: "Marange Diamond Fields",
    operatingCompany: "Zimbabwe Consolidated Diamond Company (ZCDC)",
    region: "Manicaland",
    nearestTown: "Mutare",
    latitude: -19.0833,
    longitude: 32.5333,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Subtropical",
    annualRainfallMm: 800,
  },
  {
    mineName: "Freda Rebecca Gold Mine",
    operatingCompany: "Mwana Africa / Asa Resources",
    region: "Mashonaland Central",
    nearestTown: "Bindura",
    latitude: -17.3167,
    longitude: 31.4,
    mineType: "Underground",
    operationalStatus: "Active",
    climateZone: "Subtropical",
    annualRainfallMm: 850,
  },
  {
    mineName: "How Mine",
    operatingCompany: "Caledonia Mining (Bilboes)",
    region: "Matabeleland South",
    nearestTown: "Bulawayo",
    mineType: "Underground",
    operationalStatus: "Active",
    climateZone: "Subtropical",
    annualRainfallMm: 580,
  },
  {
    mineName: "Renco Gold Mine",
    operatingCompany: "RioZim",
    region: "Masvingo",
    nearestTown: "Mwenezi",
    mineType: "Underground",
    operationalStatus: "Active",
    climateZone: "Subtropical",
    annualRainfallMm: 500,
  },
  {
    mineName: "Bilboes Gold Project",
    operatingCompany: "Caledonia Mining",
    region: "Matabeleland North",
    nearestTown: "Inyathi",
    mineType: "Open Cast",
    operationalStatus: "Proposed",
    climateZone: "Subtropical",
  },
  {
    mineName: "Sandawana Mine",
    operatingCompany: "Kuvimba Mining House",
    region: "Masvingo",
    nearestTown: "Mberengwa",
    mineType: "Underground",
    operationalStatus: "Active",
    climateZone: "Subtropical",
    notes: "Emeralds and lithium. Recent restart.",
  },
];

const ZAMBIA_SEED: SeedRow[] = [
  {
    mineName: "Konkola Copper Mines (KCM)",
    operatingCompany: "Vedanta Resources / ZCCM-IH",
    region: "Copperbelt Province",
    nearestTown: "Chingola",
    latitude: -12.5333,
    longitude: 27.85,
    elevationM: 1300,
    mineType: "Underground",
    operationalStatus: "Active",
    climateZone: "Tropical",
    annualRainfallMm: 1200,
    meanTempMinC: 10,
    meanTempMaxC: 28,
    humidityAvgPercent: 65,
    terrainType: "Miombo woodland",
    distanceToNearestPortKm: 2400,
    nearestPort: "Dar es Salaam (TZ) / Walvis Bay (NA)",
    distanceToCapitalKm: 420,
    roadAccessQuality: "Fair",
    primaryWaterSource: "Kafue River + boreholes",
    primaryPowerSource: "ZESCO grid (Kariba hydro)",
    environmentalConcerns: "Acid mine drainage; high humidity coating wear",
    notes: "Includes Konkola Deep, Nchanga, Nkana.",
  },
  {
    mineName: "Mopani Copper Mines",
    operatingCompany: "ZCCM-IH (acquired from Glencore 2021) / IRH stake",
    region: "Copperbelt Province",
    nearestTown: "Mufulira / Kitwe",
    latitude: -12.55,
    longitude: 28.2333,
    mineType: "Both",
    operationalStatus: "Active",
    climateZone: "Tropical",
    annualRainfallMm: 1250,
    notes: "Mufulira and Nkana operations.",
  },
  {
    mineName: "Kansanshi Copper Mine",
    operatingCompany: "First Quantum Minerals (FQM)",
    region: "North-Western Province",
    nearestTown: "Solwezi",
    latitude: -12.0833,
    longitude: 26.4,
    elevationM: 1380,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Tropical",
    annualRainfallMm: 1400,
    distanceToCapitalKm: 800,
    notes: "Africa's 8th-largest copper mine; S3 expansion underway to 2025.",
  },
  {
    mineName: "Sentinel Copper Mine (Trident)",
    operatingCompany: "First Quantum Minerals (FQM)",
    region: "North-Western Province",
    nearestTown: "Kalumbila",
    latitude: -12.18,
    longitude: 25.32,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Tropical",
    annualRainfallMm: 1400,
    notes: "FQM also operates the adjacent Enterprise nickel mine on the same Trident lease.",
  },
  {
    mineName: "Lumwana Copper Mine",
    operatingCompany: "Barrick Gold",
    region: "North-Western Province",
    nearestTown: "Solwezi",
    latitude: -12.1167,
    longitude: 25.8167,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Tropical",
    annualRainfallMm: 1400,
    notes: "Super-pit expansion announced 2024, doubling output by 2028.",
  },
  {
    mineName: "Lubambe Copper Mine",
    operatingCompany: "EMR Capital / ZCCM-IH",
    region: "Copperbelt Province",
    nearestTown: "Chililabombwe",
    mineType: "Underground",
    operationalStatus: "Active",
    climateZone: "Tropical",
    annualRainfallMm: 1250,
  },
  {
    mineName: "Chibuluma Copper Mine",
    operatingCompany: "JCHX Mining (China Nonferrous)",
    region: "Copperbelt Province",
    nearestTown: "Kalulushi",
    mineType: "Underground",
    operationalStatus: "Active",
    climateZone: "Tropical",
    annualRainfallMm: 1250,
  },
  {
    mineName: "Chambishi Copper Mine",
    operatingCompany: "China Nonferrous Mining Corporation (CNMC)",
    region: "Copperbelt Province",
    nearestTown: "Kalulushi",
    mineType: "Underground",
    operationalStatus: "Active",
    climateZone: "Tropical",
    annualRainfallMm: 1250,
  },
  {
    mineName: "Roan Antelope (Luanshya) Copper Mine",
    operatingCompany: "China Nonferrous Mining Corporation (CNMC) — Luanshya Copper Mines",
    region: "Copperbelt Province",
    nearestTown: "Luanshya",
    mineType: "Underground",
    operationalStatus: "Active",
    climateZone: "Tropical",
    annualRainfallMm: 1200,
  },
  {
    mineName: "Munali Nickel Mine",
    operatingCompany: "Mabiza Resources (Consolidated Nickel Mines)",
    region: "Southern Province",
    nearestTown: "Mazabuka",
    latitude: -16.0,
    longitude: 27.7167,
    mineType: "Underground",
    operationalStatus: "Care and Maintenance",
    climateZone: "Tropical",
  },
  {
    mineName: "Maamba Collieries",
    operatingCompany: "Nava Bharat Singapore (Singapore-listed)",
    region: "Southern Province",
    nearestTown: "Maamba",
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Tropical",
    annualRainfallMm: 800,
    notes: "Largest coal producer; mine-mouth power station feeds ZESCO grid.",
  },
  {
    mineName: "Kagem Emerald Mine",
    operatingCompany: "Gemfields plc",
    region: "Copperbelt Province",
    nearestTown: "Kitwe",
    latitude: -13.0833,
    longitude: 28.0,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Tropical",
    annualRainfallMm: 1250,
    notes: "World's largest emerald producer.",
  },
  {
    mineName: "Kabwe Mine",
    operatingCompany: "Government of Zambia (rehabilitation)",
    region: "Central Province",
    nearestTown: "Kabwe",
    mineType: "Underground",
    operationalStatus: "Closed",
    climateZone: "Tropical",
    notes: "Historic lead/zinc; closed 1994. Subject to remediation.",
  },
];

const MOZAMBIQUE_SEED: SeedRow[] = [
  {
    mineName: "Moatize Coal Mine",
    operatingCompany: "Vulcan Resources (Indian Jindal subsidiary; acquired from Vale 2022)",
    region: "Tete Province",
    nearestTown: "Moatize",
    latitude: -16.1167,
    longitude: 33.7333,
    elevationM: 220,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Tropical",
    annualRainfallMm: 700,
    meanTempMinC: 16,
    meanTempMaxC: 33,
    humidityAvgPercent: 55,
    distanceToNearestPortKm: 600,
    nearestPort: "Beira / Nacala",
    distanceToCapitalKm: 1500,
    roadAccessQuality: "Fair",
    primaryWaterSource: "Zambezi River",
    primaryPowerSource: "EDM grid (Cahora Bassa hydro)",
    environmentalConcerns: "Heavy rains; tropical humidity coating wear",
    notes: "Largest coal mine in Mozambique. Coking + thermal coal exports via Nacala rail.",
  },
  {
    mineName: "Benga Coal Mine",
    operatingCompany: "ICVL (state-owned Indian consortium)",
    region: "Tete Province",
    nearestTown: "Moatize",
    mineType: "Open Cast",
    operationalStatus: "Care and Maintenance",
    climateZone: "Tropical",
    annualRainfallMm: 700,
  },
  {
    mineName: "Kenmare Moma Heavy Minerals",
    operatingCompany: "Kenmare Resources",
    region: "Nampula Province",
    nearestTown: "Topuito / Pebane",
    latitude: -16.4,
    longitude: 39.7,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Tropical",
    annualRainfallMm: 1200,
    meanTempMinC: 18,
    meanTempMaxC: 32,
    humidityAvgPercent: 75,
    terrainType: "Coastal dunes",
    distanceToNearestPortKm: 0,
    nearestPort: "On-site jetty (Topuito)",
    primaryPowerSource: "EDM grid + diesel backup",
    environmentalConcerns: "Coastal salt corrosion; cyclone exposure",
    notes:
      "World's largest titanium minerals (ilmenite / rutile / zircon) producer outside China/Australia.",
  },
  {
    mineName: "Balama Graphite Mine",
    operatingCompany: "Syrah Resources",
    region: "Cabo Delgado Province",
    nearestTown: "Balama",
    latitude: -13.3,
    longitude: 38.5667,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Tropical",
    annualRainfallMm: 1100,
    distanceToNearestPortKm: 240,
    nearestPort: "Pemba / Nacala",
    notes: "World's largest natural graphite mine.",
  },
  {
    mineName: "Montepuez Ruby Mine",
    operatingCompany: "Montepuez Ruby Mining (Gemfields 75%)",
    region: "Cabo Delgado Province",
    nearestTown: "Montepuez",
    latitude: -13.1167,
    longitude: 38.9833,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Tropical",
    annualRainfallMm: 1000,
    notes: "Largest ruby deposit in the world.",
  },
  {
    mineName: "Manica Gold Mine",
    operatingCompany: "Pan African Resources / Xtract Resources",
    region: "Manica Province",
    nearestTown: "Manica",
    latitude: -18.95,
    longitude: 32.85,
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Tropical",
    annualRainfallMm: 950,
  },
  {
    mineName: "Capitanas Gold Project",
    operatingCompany: "Mutapa Mining",
    region: "Manica Province",
    mineType: "Open Cast",
    operationalStatus: "Proposed",
    climateZone: "Tropical",
  },
  {
    mineName: "Nyota Graphite",
    operatingCompany: "Triton Minerals",
    region: "Cabo Delgado Province",
    nearestTown: "Ancuabe",
    mineType: "Open Cast",
    operationalStatus: "Proposed",
    climateZone: "Tropical",
  },
  {
    mineName: "Pebane Heavy Minerals",
    operatingCompany: "Various exploration",
    region: "Zambezia Province",
    mineType: "Open Cast",
    operationalStatus: "Proposed",
    climateZone: "Tropical",
    annualRainfallMm: 1300,
  },
  {
    mineName: "Chibuto Heavy Minerals",
    operatingCompany: "Dingsheng Minerals (Chinese)",
    region: "Gaza Province",
    nearestTown: "Chibuto",
    mineType: "Open Cast",
    operationalStatus: "Care and Maintenance",
    climateZone: "Tropical",
    annualRainfallMm: 700,
  },
  {
    mineName: "Revue Gold Project",
    operatingCompany: "Various small-scale operators",
    region: "Manica Province",
    mineType: "Open Cast",
    operationalStatus: "Active",
    climateZone: "Tropical",
    annualRainfallMm: 1000,
  },
];
