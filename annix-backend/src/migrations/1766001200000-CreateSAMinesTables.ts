import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSAMinesTables1766001200000 implements MigrationInterface {
    name = 'CreateSAMinesTables1766001200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enums
        await queryRunner.query(`
            CREATE TYPE "mine_type_enum" AS ENUM (
                'Underground',
                'Open Cast',
                'Both'
            )
        `);

        await queryRunner.query(`
            CREATE TYPE "operational_status_enum" AS ENUM (
                'Active',
                'Care and Maintenance',
                'Closed'
            )
        `);

        await queryRunner.query(`
            CREATE TYPE "risk_level_enum" AS ENUM (
                'Low',
                'Medium',
                'High',
                'Very High'
            )
        `);

        // Create commodities table
        await queryRunner.query(`
            CREATE TABLE "commodities" (
                "id" SERIAL NOT NULL,
                "commodity_name" character varying(100) NOT NULL UNIQUE,
                "typical_process_route" text,
                "application_notes" text,
                CONSTRAINT "PK_commodities" PRIMARY KEY ("id")
            )
        `);

        // Create sa_mines table
        await queryRunner.query(`
            CREATE TABLE "sa_mines" (
                "id" SERIAL NOT NULL,
                "mine_name" character varying(255) NOT NULL,
                "operating_company" character varying(255) NOT NULL,
                "commodity_id" integer NOT NULL,
                "province" character varying(100) NOT NULL,
                "district" character varying(255),
                "physical_address" text,
                "mine_type" "mine_type_enum" NOT NULL DEFAULT 'Underground',
                "operational_status" "operational_status_enum" NOT NULL DEFAULT 'Active',
                "latitude" decimal(10,7),
                "longitude" decimal(10,7),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_sa_mines" PRIMARY KEY ("id")
            )
        `);

        // Create slurry_profiles table
        await queryRunner.query(`
            CREATE TABLE "slurry_profiles" (
                "id" SERIAL NOT NULL,
                "commodity_id" integer NOT NULL,
                "profile_name" character varying(255),
                "typical_sg_min" decimal(5,3) NOT NULL,
                "typical_sg_max" decimal(5,3) NOT NULL,
                "solids_concentration_min" decimal(5,2) NOT NULL,
                "solids_concentration_max" decimal(5,2) NOT NULL,
                "ph_min" decimal(4,2) NOT NULL,
                "ph_max" decimal(4,2) NOT NULL,
                "temp_min" decimal(5,2) NOT NULL,
                "temp_max" decimal(5,2) NOT NULL,
                "abrasion_risk" "risk_level_enum" NOT NULL DEFAULT 'Medium',
                "corrosion_risk" "risk_level_enum" NOT NULL DEFAULT 'Medium',
                "primary_failure_mode" character varying(255),
                "notes" text,
                CONSTRAINT "PK_slurry_profiles" PRIMARY KEY ("id")
            )
        `);

        // Create lining_coating_rules table
        await queryRunner.query(`
            CREATE TABLE "lining_coating_rules" (
                "id" SERIAL NOT NULL,
                "abrasion_level" "risk_level_enum" NOT NULL,
                "corrosion_level" "risk_level_enum" NOT NULL,
                "recommended_lining" character varying(255) NOT NULL,
                "recommended_coating" character varying(255),
                "application_notes" text,
                "priority" integer NOT NULL DEFAULT 0,
                CONSTRAINT "PK_lining_coating_rules" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "sa_mines"
            ADD CONSTRAINT "FK_sa_mines_commodity"
            FOREIGN KEY ("commodity_id")
            REFERENCES "commodities"("id")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "slurry_profiles"
            ADD CONSTRAINT "FK_slurry_profiles_commodity"
            FOREIGN KEY ("commodity_id")
            REFERENCES "commodities"("id")
            ON DELETE CASCADE
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_sa_mines_province" ON "sa_mines" ("province")`);
        await queryRunner.query(`CREATE INDEX "IDX_sa_mines_status" ON "sa_mines" ("operational_status")`);
        await queryRunner.query(`CREATE INDEX "IDX_sa_mines_commodity" ON "sa_mines" ("commodity_id")`);

        // Seed commodities data
        await queryRunner.query(`
            INSERT INTO "commodities" ("commodity_name", "typical_process_route", "application_notes") VALUES
            ('Coal', 'Crushing → Screening → Dense Medium Separation → Flotation → Dewatering', 'Slurry typically contains fine coal particles with variable ash content'),
            ('Gold', 'Crushing → Milling → Gravity Concentration → CIL/CIP → Elution → Electrowinning', 'Highly abrasive with cyanide process requiring corrosion resistance'),
            ('PGM', 'Crushing → Milling → Flotation → Smelting → Converting → BMR', 'Platinum Group Metals - similar to gold with high abrasion'),
            ('Iron Ore', 'Crushing → Screening → Dense Medium Separation → Spiral Concentration → Dewatering', 'High density slurry with significant abrasion'),
            ('Copper/Base Metals', 'Crushing → Milling → Flotation → Thickening → Filtering', 'Acidic slurry in leaching operations'),
            ('Diamonds', 'Crushing → Scrubbing → DMS → X-Ray/Optical Sorting', 'Lower abrasion than metals, focus on particle recovery')
        `);

        // Seed slurry profiles data
        await queryRunner.query(`
            INSERT INTO "slurry_profiles" (
                "commodity_id", "profile_name", "typical_sg_min", "typical_sg_max",
                "solids_concentration_min", "solids_concentration_max",
                "ph_min", "ph_max", "temp_min", "temp_max",
                "abrasion_risk", "corrosion_risk", "primary_failure_mode", "notes"
            ) VALUES
            ((SELECT id FROM commodities WHERE commodity_name = 'Coal'), 'Standard Coal Slurry', 1.10, 1.35, 20.00, 45.00, 6.50, 8.50, 15.00, 45.00, 'Medium', 'Low', 'Abrasion', 'Coal fines can be mildly abrasive. DMS circuits use magnetite.'),
            ((SELECT id FROM commodities WHERE commodity_name = 'Gold'), 'CIL/CIP Gold Slurry', 1.30, 1.50, 40.00, 55.00, 10.00, 11.50, 20.00, 60.00, 'Very High', 'High', 'Abrasion', 'Cyanide process requires high pH. Silica content causes severe abrasion.'),
            ((SELECT id FROM commodities WHERE commodity_name = 'PGM'), 'PGM Flotation Slurry', 1.25, 1.45, 35.00, 50.00, 8.00, 10.00, 20.00, 55.00, 'Very High', 'Medium', 'Abrasion', 'Hard chromite and silicate minerals. MF2 grade common.'),
            ((SELECT id FROM commodities WHERE commodity_name = 'Iron Ore'), 'Iron Ore Slurry', 1.50, 2.00, 50.00, 70.00, 6.50, 8.00, 15.00, 40.00, 'Very High', 'Low', 'Abrasion', 'Very high density slurry. Significant wear on pipe walls.'),
            ((SELECT id FROM commodities WHERE commodity_name = 'Copper/Base Metals'), 'Copper Leach Slurry', 1.20, 1.40, 25.00, 45.00, 1.50, 4.00, 25.00, 65.00, 'High', 'Very High', 'Corrosion', 'Acid leaching causes severe corrosion. H2SO4 common.'),
            ((SELECT id FROM commodities WHERE commodity_name = 'Diamonds'), 'Diamond DMS Slurry', 1.40, 1.80, 30.00, 50.00, 6.50, 8.00, 15.00, 35.00, 'Medium', 'Low', 'Abrasion', 'Ferrosilicon medium. Moderate abrasion from kimberlite.')
        `);

        // Seed lining/coating rules
        await queryRunner.query(`
            INSERT INTO "lining_coating_rules" ("abrasion_level", "corrosion_level", "recommended_lining", "recommended_coating", "application_notes", "priority") VALUES
            ('Low', 'Low', 'Standard Steel', 'Epoxy Paint', 'General purpose - standard carbon steel sufficient', 1),
            ('Low', 'Medium', 'Standard Steel', 'Epoxy Coating', 'Light corrosion protection required', 1),
            ('Low', 'High', 'FRP/GRP Lining', 'High-Build Epoxy', 'Consider FRP or rubber lining for corrosion', 2),
            ('Low', 'Very High', 'Rubber Lining (Soft)', 'Chemical Resistant Coating', 'Soft rubber or HDPE lining for acid resistance', 3),
            ('Medium', 'Low', 'Ceramic Tile Lining', 'None', 'Ceramic tiles for moderate wear areas', 2),
            ('Medium', 'Medium', 'Rubber Lining (Hard)', 'Epoxy Coating', 'Hard rubber provides abrasion and corrosion resistance', 2),
            ('Medium', 'High', 'Rubber Lining (Acid Resistant)', 'Chemical Resistant', 'Natural rubber with high chemical resistance', 3),
            ('Medium', 'Very High', 'HDPE/UHMWPE Lining', 'N/A - Self Protecting', 'HDPE or UHMWPE for combined resistance', 3),
            ('High', 'Low', 'Ceramic Tile Lining', 'None', 'High-alumina ceramic tiles for severe wear', 3),
            ('High', 'Medium', 'Basalt Lining', 'Epoxy Undercoat', 'Basalt tiles with epoxy bonding', 3),
            ('High', 'High', 'Rubber + Ceramic Composite', 'Rubber Backed Ceramic', 'Ceramic face with rubber backing', 4),
            ('High', 'Very High', 'Hastelloy/Exotic Alloy', 'N/A', 'Specialty alloys for extreme conditions', 5),
            ('Very High', 'Low', 'Ceramic Tile (95% Al2O3)', 'None', 'High-purity alumina tiles for extreme abrasion', 4),
            ('Very High', 'Medium', 'Ceramic + Rubber Composite', 'Rubber Backing', 'Dual protection system', 4),
            ('Very High', 'High', 'Ni-Hard Cast Sections', 'Sacrificial Coating', 'Replaceable wear sections', 5),
            ('Very High', 'Very High', 'Tungsten Carbide Overlay', 'Specialty Coating', 'Hardfacing with corrosion resistant substrate', 5)
        `);

        // Seed SA mines data - representative major mines
        await queryRunner.query(`
            INSERT INTO "sa_mines" (
                "mine_name", "operating_company", "commodity_id", "province", "district",
                "physical_address", "mine_type", "operational_status", "latitude", "longitude"
            ) VALUES
            -- Coal Mines (Mpumalanga)
            ('Isibonelo Colliery', 'Anglo American', (SELECT id FROM commodities WHERE commodity_name = 'Coal'), 'Mpumalanga', 'Nkangala', 'Ogies, Mpumalanga', 'Open Cast', 'Active', -26.0167, 29.0500),
            ('Khwezela Colliery', 'Anglo American', (SELECT id FROM commodities WHERE commodity_name = 'Coal'), 'Mpumalanga', 'Nkangala', 'Emalahleni, Mpumalanga', 'Both', 'Active', -25.8700, 29.2100),
            ('Goedehoop Colliery', 'Anglo American', (SELECT id FROM commodities WHERE commodity_name = 'Coal'), 'Mpumalanga', 'Nkangala', 'Middelburg, Mpumalanga', 'Underground', 'Active', -25.7700, 29.4700),
            ('Greenside Colliery', 'Anglo American', (SELECT id FROM commodities WHERE commodity_name = 'Coal'), 'Mpumalanga', 'Nkangala', 'Witbank, Mpumalanga', 'Underground', 'Active', -25.8900, 29.1600),
            ('Mafube Colliery', 'Exxaro', (SELECT id FROM commodities WHERE commodity_name = 'Coal'), 'Mpumalanga', 'Nkangala', 'Belfast, Mpumalanga', 'Open Cast', 'Active', -25.6800, 30.0400),
            ('Grootegeluk Mine', 'Exxaro', (SELECT id FROM commodities WHERE commodity_name = 'Coal'), 'Limpopo', 'Waterberg', 'Lephalale, Limpopo', 'Open Cast', 'Active', -23.6500, 27.7000),
            ('Matla Colliery', 'Eskom', (SELECT id FROM commodities WHERE commodity_name = 'Coal'), 'Mpumalanga', 'Nkangala', 'Kriel, Mpumalanga', 'Underground', 'Active', -26.2500, 29.2500),
            ('New Denmark Colliery', 'Eskom', (SELECT id FROM commodities WHERE commodity_name = 'Coal'), 'Mpumalanga', 'Gert Sibande', 'Standerton, Mpumalanga', 'Open Cast', 'Active', -26.9300, 29.2400),

            -- Gold Mines (Various)
            ('South Deep Mine', 'Gold Fields', (SELECT id FROM commodities WHERE commodity_name = 'Gold'), 'Gauteng', 'West Rand', 'Westonaria, Gauteng', 'Underground', 'Active', -26.4167, 27.6667),
            ('Mponeng Mine', 'Harmony Gold', (SELECT id FROM commodities WHERE commodity_name = 'Gold'), 'Gauteng', 'West Rand', 'Carletonville, Gauteng', 'Underground', 'Active', -26.4000, 27.3833),
            ('Moab Khotsong Mine', 'Harmony Gold', (SELECT id FROM commodities WHERE commodity_name = 'Gold'), 'North West', 'Dr Kenneth Kaunda', 'Orkney, North West', 'Underground', 'Active', -26.9833, 26.6667),
            ('Kusasalethu Mine', 'Harmony Gold', (SELECT id FROM commodities WHERE commodity_name = 'Gold'), 'Gauteng', 'West Rand', 'Carletonville, Gauteng', 'Underground', 'Active', -26.3667, 27.3833),
            ('Target Mine', 'Harmony Gold', (SELECT id FROM commodities WHERE commodity_name = 'Gold'), 'Free State', 'Lejweleputswa', 'Allanridge, Free State', 'Underground', 'Active', -27.7667, 26.6333),
            ('Beatrix Mine', 'Sibanye-Stillwater', (SELECT id FROM commodities WHERE commodity_name = 'Gold'), 'Free State', 'Lejweleputswa', 'Welkom, Free State', 'Underground', 'Active', -28.0000, 26.7500),
            ('Driefontein Mine', 'Sibanye-Stillwater', (SELECT id FROM commodities WHERE commodity_name = 'Gold'), 'Gauteng', 'West Rand', 'Carletonville, Gauteng', 'Underground', 'Active', -26.3833, 27.5167),
            ('Kloof Mine', 'Sibanye-Stillwater', (SELECT id FROM commodities WHERE commodity_name = 'Gold'), 'Gauteng', 'West Rand', 'Westonaria, Gauteng', 'Underground', 'Active', -26.4000, 27.5833),

            -- PGM Mines (North West & Limpopo)
            ('Mogalakwena Mine', 'Anglo American Platinum', (SELECT id FROM commodities WHERE commodity_name = 'PGM'), 'Limpopo', 'Waterberg', 'Mokopane, Limpopo', 'Open Cast', 'Active', -23.9333, 28.7667),
            ('Amandelbult Mine', 'Anglo American Platinum', (SELECT id FROM commodities WHERE commodity_name = 'PGM'), 'Limpopo', 'Waterberg', 'Thabazimbi, Limpopo', 'Underground', 'Active', -24.8167, 27.3667),
            ('Unki Mine', 'Anglo American Platinum', (SELECT id FROM commodities WHERE commodity_name = 'PGM'), 'Limpopo', 'Capricorn', 'Polokwane, Limpopo', 'Underground', 'Active', -23.9000, 29.4500),
            ('Impala Rustenburg', 'Impala Platinum', (SELECT id FROM commodities WHERE commodity_name = 'PGM'), 'North West', 'Bojanala', 'Rustenburg, North West', 'Underground', 'Active', -25.6667, 27.2500),
            ('Marula Mine', 'Impala Platinum', (SELECT id FROM commodities WHERE commodity_name = 'PGM'), 'Limpopo', 'Sekhukhune', 'Burgersfort, Limpopo', 'Underground', 'Active', -24.5000, 30.1500),
            ('Two Rivers Mine', 'Impala Platinum', (SELECT id FROM commodities WHERE commodity_name = 'PGM'), 'Limpopo', 'Sekhukhune', 'Steelpoort, Limpopo', 'Underground', 'Active', -24.6833, 30.1000),
            ('Bathopele Mine', 'Anglo American Platinum', (SELECT id FROM commodities WHERE commodity_name = 'PGM'), 'North West', 'Bojanala', 'Rustenburg, North West', 'Underground', 'Active', -25.6333, 27.3000),
            ('Kroondal Mine', 'Sibanye-Stillwater', (SELECT id FROM commodities WHERE commodity_name = 'PGM'), 'North West', 'Bojanala', 'Rustenburg, North West', 'Underground', 'Active', -25.6500, 27.3167),
            ('Marikana Mine', 'Sibanye-Stillwater', (SELECT id FROM commodities WHERE commodity_name = 'PGM'), 'North West', 'Bojanala', 'Marikana, North West', 'Underground', 'Active', -25.7000, 27.4833),

            -- Iron Ore Mines (Northern Cape)
            ('Sishen Mine', 'Kumba Iron Ore', (SELECT id FROM commodities WHERE commodity_name = 'Iron Ore'), 'Northern Cape', 'John Taolo Gaetsewe', 'Kathu, Northern Cape', 'Open Cast', 'Active', -27.2000, 23.0000),
            ('Kolomela Mine', 'Kumba Iron Ore', (SELECT id FROM commodities WHERE commodity_name = 'Iron Ore'), 'Northern Cape', 'Siyanda', 'Postmasburg, Northern Cape', 'Open Cast', 'Active', -28.3333, 23.0833),
            ('Thabazimbi Mine', 'Kumba Iron Ore', (SELECT id FROM commodities WHERE commodity_name = 'Iron Ore'), 'Limpopo', 'Waterberg', 'Thabazimbi, Limpopo', 'Both', 'Care and Maintenance', -24.5833, 27.4000),
            ('Beeshoek Mine', 'Assmang', (SELECT id FROM commodities WHERE commodity_name = 'Iron Ore'), 'Northern Cape', 'Siyanda', 'Postmasburg, Northern Cape', 'Open Cast', 'Active', -28.4333, 23.1500),
            ('Khumani Mine', 'Assmang', (SELECT id FROM commodities WHERE commodity_name = 'Iron Ore'), 'Northern Cape', 'John Taolo Gaetsewe', 'Kathu, Northern Cape', 'Open Cast', 'Active', -27.2167, 22.9500),

            -- Copper/Base Metals (Various)
            ('Palabora Mining Company', 'Palabora Mining Company', (SELECT id FROM commodities WHERE commodity_name = 'Copper/Base Metals'), 'Limpopo', 'Mopani', 'Phalaborwa, Limpopo', 'Underground', 'Active', -23.9667, 31.1333),
            ('Black Mountain Mine', 'Vedanta Zinc', (SELECT id FROM commodities WHERE commodity_name = 'Copper/Base Metals'), 'Northern Cape', 'Namakwa', 'Aggeneys, Northern Cape', 'Underground', 'Active', -29.2333, 18.8167),
            ('Gamsberg Mine', 'Vedanta Zinc', (SELECT id FROM commodities WHERE commodity_name = 'Copper/Base Metals'), 'Northern Cape', 'Namakwa', 'Aggeneys, Northern Cape', 'Open Cast', 'Active', -29.2500, 18.9333),
            ('Prieska Zinc-Copper', 'Orion Minerals', (SELECT id FROM commodities WHERE commodity_name = 'Copper/Base Metals'), 'Northern Cape', 'Siyanda', 'Prieska, Northern Cape', 'Underground', 'Care and Maintenance', -29.6667, 22.7500),

            -- Diamond Mines (Various)
            ('Venetia Mine', 'De Beers', (SELECT id FROM commodities WHERE commodity_name = 'Diamonds'), 'Limpopo', 'Vhembe', 'Musina, Limpopo', 'Underground', 'Active', -22.4500, 29.3167),
            ('Voorspoed Mine', 'De Beers', (SELECT id FROM commodities WHERE commodity_name = 'Diamonds'), 'Free State', 'Lejweleputswa', 'Kroonstad, Free State', 'Open Cast', 'Active', -27.7667, 27.2333),
            ('Finsch Mine', 'Petra Diamonds', (SELECT id FROM commodities WHERE commodity_name = 'Diamonds'), 'Northern Cape', 'Frances Baard', 'Lime Acres, Northern Cape', 'Underground', 'Active', -28.3833, 23.4500),
            ('Cullinan Mine', 'Petra Diamonds', (SELECT id FROM commodities WHERE commodity_name = 'Diamonds'), 'Gauteng', 'Tshwane', 'Cullinan, Gauteng', 'Underground', 'Active', -25.6833, 28.5167),
            ('Koffiefontein Mine', 'Petra Diamonds', (SELECT id FROM commodities WHERE commodity_name = 'Diamonds'), 'Free State', 'Xhariep', 'Koffiefontein, Free State', 'Underground', 'Active', -29.4167, 25.0000),
            ('Williamson Mine', 'Petra Diamonds', (SELECT id FROM commodities WHERE commodity_name = 'Diamonds'), 'Free State', 'Xhariep', 'Jagersfontein, Free State', 'Open Cast', 'Care and Maintenance', -29.7667, 25.4333)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sa_mines_commodity"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sa_mines_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sa_mines_province"`);

        // Drop foreign keys and tables
        await queryRunner.query(`ALTER TABLE "slurry_profiles" DROP CONSTRAINT IF EXISTS "FK_slurry_profiles_commodity"`);
        await queryRunner.query(`ALTER TABLE "sa_mines" DROP CONSTRAINT IF EXISTS "FK_sa_mines_commodity"`);

        await queryRunner.query(`DROP TABLE IF EXISTS "lining_coating_rules"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "slurry_profiles"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "sa_mines"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "commodities"`);

        // Drop enums
        await queryRunner.query(`DROP TYPE IF EXISTS "risk_level_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "operational_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "mine_type_enum"`);
    }
}
