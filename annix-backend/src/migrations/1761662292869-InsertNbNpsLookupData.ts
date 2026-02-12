import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertNbNpsLookupData1761662292869 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🔧 Inserting NB-NPS lookup data...');
        
        // First, check if data already exists
        const result = await queryRunner.query(`SELECT COUNT(*) FROM nb_nps_lookup`);
        const count = parseInt(result[0].count);
        
        if (count > 0) {
            console.log('✅ NB-NPS lookup data already exists, skipping...');
            return;
        }
        
        await queryRunner.query(`
            INSERT INTO nb_nps_lookup (nb_mm, nps_inch, outside_diameter_mm) VALUES
            -- Small Bore Pipes
            (6, 0.125, 10.3),      -- 1/8"
            (8, 0.25, 13.7),       -- 1/4"
            (10, 0.375, 17.1),     -- 3/8"
            (15, 0.5, 21.3),       -- 1/2"
            (20, 0.75, 26.7),      -- 3/4"
            (25, 1, 33.4),         -- 1"
            (32, 1.25, 42.2),      -- 1-1/4"
            (40, 1.5, 48.3),       -- 1-1/2"
            (50, 2, 60.3),         -- 2"
            (65, 2.5, 73.0),       -- 2-1/2"
            (80, 3, 88.9),         -- 3"
            (90, 3.5, 101.6),      -- 3-1/2"
            (100, 4, 114.3),       -- 4"
            (125, 5, 141.3),       -- 5"
            (150, 6, 168.3),       -- 6"
            (200, 8, 219.1),       -- 8"
            (250, 10, 273.0),      -- 10"
            (300, 12, 323.8),      -- 12"
            (350, 14, 355.6),      -- 14"
            (400, 16, 406.4),      -- 16"
            (450, 18, 457.2),      -- 18"
            (500, 20, 508.0),      -- 20"
            (550, 22, 558.8),      -- 22"
            (600, 24, 609.6),      -- 24"
            (650, 26, 660.4),      -- 26"
            (700, 28, 711.2),      -- 28"
            (750, 30, 762.0),      -- 30"
            (800, 32, 812.8),      -- 32"
            (850, 34, 863.6),      -- 34"
            (900, 36, 914.4),      -- 36"
            (950, 38, 965.2),      -- 38"
            (1000, 40, 1016.0),    -- 40"
            (1050, 42, 1066.8),    -- 42"
            (1100, 44, 1117.6),    -- 44"
            (1150, 46, 1168.4),    -- 46"
            (1200, 48, 1219.2),    -- 48"
            (1250, 50, 1270.0),    -- 50"
            (1300, 52, 1320.8),    -- 52"
            (1350, 54, 1371.6),    -- 54"
            (1400, 56, 1422.4),    -- 56"
            (1450, 58, 1473.2),    -- 58"
            (1500, 60, 1524.0),    -- 60"
            (1600, 64, 1625.6),    -- 64"
            (1800, 72, 1828.8),    -- 72"
            (1900, 76, 1930.4)     -- 76"
        `);
        
        console.log('✅ NB-NPS lookup data inserted successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('⏮️ Removing NB-NPS lookup data...');
        
        await queryRunner.query(`
            DELETE FROM nb_nps_lookup 
            WHERE nb_mm IN (6, 8, 10, 15, 20, 25, 32, 40, 50, 65, 80, 90, 100, 125, 150, 200, 
                           250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 
                           950, 1000, 1050, 1100, 1150, 1200, 1250, 1300, 1350, 1400, 1450, 1500, 
                           1600, 1800, 1900)
        `);
        
        console.log('✅ NB-NPS lookup data removed');
    }

}
