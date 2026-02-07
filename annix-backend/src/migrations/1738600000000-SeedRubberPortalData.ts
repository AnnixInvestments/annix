import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedRubberPortalData1738600000000 implements MigrationInterface {
  name = "SeedRubberPortalData1738600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Seed pricing tiers
    await queryRunner.query(
      `INSERT INTO rubber_pricing_tier (id, firebase_uid, name, pricing_factor, created_at, updated_at) VALUES (1, '4VZyHFlvVChegq1DKZ7Z', 'Tier 4', 166.00, '2021-06-09T00:12:56.999Z', '2021-06-09T01:00:30.059Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_pricing_tier (id, firebase_uid, name, pricing_factor, created_at, updated_at) VALUES (2, 'NYXymT8MOgZmcwB8EJwD', 'Tier 1', 100.00, '2021-06-09T00:12:56.996Z', '2021-06-09T01:00:30.059Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_pricing_tier (id, firebase_uid, name, pricing_factor, created_at, updated_at) VALUES (3, 'mlzpdwwUMO9s4qjrAZBN', 'Tier 2', 120.00, '2021-06-09T00:12:57.000Z', '2021-06-09T01:00:30.059Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_pricing_tier (id, firebase_uid, name, pricing_factor, created_at, updated_at) VALUES (4, 'yuuVo1cgEnJu9fDxcpfw', 'Tier 3', 138.00, '2021-06-09T00:12:56.999Z', '2021-06-09T01:00:30.059Z') ON CONFLICT (id) DO NOTHING`,
    );

    // Seed product codings
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (1, '2w08gBDmEiFuBbbcHCjM', 'HARDNESS', '40', '40 Shore', '2021-08-12T22:15:25.637Z', '2021-10-13T21:43:45.568Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (2, '40fMIqK2BrMZyHisO6ik', 'COMPOUND', 'IRHD', 'International Hardness Rubber Degrees', '2021-08-12T22:15:25.636Z', '2021-10-13T21:43:45.570Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (3, '4sy7QS0SLtbECD5qCUck', 'HARDNESS', '56', '50-60 Shore', '2021-08-12T22:15:25.637Z', '2021-10-13T21:43:45.568Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (4, '5HuaTJ6fVuJ7TXYB4ePI', 'CURING_METHOD', 'PC', 'Pre-cured', '2021-08-12T22:15:25.637Z', '2021-10-13T21:43:45.570Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (5, '8zbkB7AAIkisLGCrMIu4', 'COLOUR', 'R', 'Red', '2021-08-12T22:15:25.629Z', '2021-10-13T21:43:45.570Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (6, 'AebJ0uZZQ6mSCqU7Hoin', 'CURING_METHOD', 'CC', 'Chemically Cured', '2021-08-12T22:15:25.636Z', '2021-10-13T21:43:45.569Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (7, 'Ba7Leqgd7hpZzoHoExno', 'COMPOUND', 'NR', 'Natural Rubber', '2021-08-12T22:15:25.633Z', '2021-10-13T21:43:45.570Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (8, 'G5uYXa4AOie1O1P57RKd', 'GRADE', 'E', 'E', '2021-08-12T23:02:20.100Z', '2021-10-13T21:43:45.570Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (9, 'GkJfRRS1lbunGAT7hLJR', 'COMPOUND', 'BIIR', 'Bromobutyl Rubber', '2021-08-12T22:15:25.635Z', '2021-10-13T21:43:45.569Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (10, 'IMcduxnKzQG851DohJlL', 'COMPOUND', 'IIR', 'Butyl Rubber', '2021-08-12T22:15:25.633Z', '2021-10-13T21:43:45.570Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (11, 'KTsVVjDvSrAxyNPiPNrK', 'TYPE', '2', 'Type 2', '2021-08-15T12:06:40.729Z', '2021-10-13T21:43:45.568Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (12, 'LRGfdE4P4G1YhtKwLhh2', 'HARDNESS', '70', '70 Shore', '2021-08-12T22:15:25.637Z', '2021-10-13T21:43:45.568Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (13, 'OQQC5LHrwA1qqq7TNSOl', 'COLOUR', 'W', 'White', '2021-08-12T23:27:56.245Z', '2021-10-13T21:43:45.570Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (14, 'TQyPMzlbZKqPIywwBCAH', 'GRADE', 'B', 'B', '2021-08-12T23:01:30.520Z', '2021-10-13T21:43:45.569Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (15, 'VLMozlAREJ94bb5GVsXA', 'TYPE', '1', 'Type 1', '2021-08-15T12:06:32.099Z', '2021-10-13T21:43:45.568Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (16, 'VhSU4Hcp6IoaRw4cnAFu', 'COMPOUND', 'BR', 'Butadiene Rubber', '2021-08-12T22:15:25.634Z', '2021-10-13T21:43:45.569Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (17, 'cNEsROuWDiKS4Zp5hCGq', 'COMPOUND', 'CIIR', 'Chlorobutyl Rubber', '2021-08-12T22:15:25.635Z', '2021-10-13T21:43:45.569Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (18, 'e86WR5mpD8BM8lIax83z', 'COLOUR', 'B', 'Black', '2021-08-12T22:15:25.631Z', '2021-10-13T21:43:45.569Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (19, 'f1vYGe1gSlFasgobYXEP', 'HARDNESS', '50', '50 Shore', '2021-08-12T22:15:25.637Z', '2021-10-13T21:43:45.568Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (20, 'gK7jQxT3JW2xEcxdL2S4', 'COMPOUND', 'CSM', 'Chlorosulfonated Rubber', '2021-08-12T22:15:25.632Z', '2021-10-13T21:43:45.569Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (21, 'iQn7WPnxvSlR0YG1iD78', 'COLOUR', 'Y', 'Yellow', '2021-08-12T22:15:25.632Z', '2021-10-13T21:43:45.571Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (22, 'j8QTAkpzJaYjWPhdrZPg', 'GRADE', 'A', 'A', '2021-08-12T22:56:59.337Z', '2021-10-13T21:43:45.568Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (23, 'jaF9Vz8Og1OroTSLVPaB', 'COMPOUND', 'NBR', 'Nitrile Butadiene Rubber', '2021-08-12T22:15:25.636Z', '2021-10-13T21:43:45.570Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (24, 'mixSMU4pxzWTvd1Zg6bk', 'HARDNESS', '60', '60 Shore', '2021-08-12T22:15:25.637Z', '2021-10-13T21:43:45.568Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (25, 'muUikdJ3WLtOw2vBZlMg', 'COMPOUND', 'SBR', 'Styrene Butadiene Rubber', '2021-08-12T22:15:25.635Z', '2021-10-13T21:43:45.570Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (26, 'nQ6BElaaf3G7lXtAkG5b', 'CURING_METHOD', 'SC', 'Steam Cured', '2021-08-12T22:15:25.636Z', '2021-10-13T21:43:45.570Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (27, 'p3Aa0YCEjQb2mfIfDGqK', 'GRADE', 'NC', 'NC', '2021-08-12T23:02:33.479Z', '2021-10-13T21:43:45.570Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (28, 'rO1R0K8RwjdJQQ7vph9h', 'COLOUR', 'G', 'Green', '2021-08-12T22:15:25.631Z', '2021-10-13T21:43:45.570Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (29, 'ualBnU1qDNJY2glxTRFI', 'COMPOUND', 'IR', 'Synthetic Isoprene Rubber', '2021-08-12T22:15:25.633Z', '2021-10-13T21:43:45.570Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (30, 'uj2lxBzcwJCgmoJDyYmB', 'COMPOUND', 'CR', 'Chloroprene Rubber', '2021-08-12T22:15:25.634Z', '2021-10-13T21:43:45.569Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (31, 'uqxNBpl0XJ8hvCCDk093', 'GRADE', 'C', 'C', '2021-08-12T23:01:30.518Z', '2021-10-13T21:43:45.569Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product_coding (id, firebase_uid, coding_type, code, name, created_at, updated_at) VALUES (32, 'xk5kWExhoj9gc8fkKHdf', 'GRADE', 'D', 'D', '2021-08-12T23:02:06.341Z', '2021-10-13T21:43:45.569Z') ON CONFLICT (id) DO NOTHING`,
    );

    // Seed companies
    await queryRunner.query(
      `INSERT INTO rubber_company (id, firebase_uid, name, code, pricing_tier_id, pricing_tier_firebase_uid, available_products, is_compound_owner, vat_number, registration_number, address, notes, created_at, updated_at) VALUES (1, 'CGkRm6EcYuhs04iBBll7', 'Mining Pressure Systems (MPS)', 'MP', NULL, NULL, '[]', false, NULL, NULL, '{"city":"Boksburg","street":"Cnr Paul Smit and Skew Roads","suburb":"Boksburg North","country":"South Africa","building":"","postcode":"1508","province":"Boksburg"}', NULL, '2021-05-28T22:53:24.215Z', '2021-10-10T22:06:12.180Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_company (id, firebase_uid, name, code, pricing_tier_id, pricing_tier_firebase_uid, available_products, is_compound_owner, vat_number, registration_number, address, notes, created_at, updated_at) VALUES (2, 'FOJQG9W1tSqRG2tl3f3r', 'Sasol Limited', 'SL', NULL, NULL, '[]', false, NULL, NULL, '{"city":"Johannesburg","street":"2849 Fulton Street","suburb":"Sandton","country":"South Africa","building":"Sasol Place","postcode":"2196"}', NULL, '2021-05-29T23:39:28.533Z', '2021-10-10T22:06:51.977Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_company (id, firebase_uid, name, code, pricing_tier_id, pricing_tier_firebase_uid, available_products, is_compound_owner, vat_number, registration_number, address, notes, created_at, updated_at) VALUES (3, 'QkJUnET2lCkhNNUCWSWP', 'AU Industries', 'AU', 2, 'NYXymT8MOgZmcwB8EJwD', '["21klhVsGDZe3aPz6JSkp","2qLWGxGw8llXevngPtYb","5sZF1G2kDs9b1WErqUQh","7nDqUXEyIHSGb8XEjQQ2","TINkOcoP6tJs6M0y9hI1","el2OT0MNDWTaTSx2Lefa","fOjNJjTmoJuTC16tEbVg","pEhZUvZW7Z5dGV1JXcl6"]', true, '4650300389', '2020/803314/07', '{"city":"Johannesburg","street":"Cnr All Black & Tile Roads","suburb":"Boksburg","country":"South Africa","building":"ALAC Properties","postcode":"1458","province":"Gauteng"}', 'Products not allocated to a Manufacturer will have their compound owner associated with this company', '2021-08-07T22:12:27.279Z', '2026-01-17T21:25:43.651Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_company (id, firebase_uid, name, code, pricing_tier_id, pricing_tier_firebase_uid, available_products, is_compound_owner, vat_number, registration_number, address, notes, created_at, updated_at) VALUES (4, 'alBoJfVZnWOBukwnVHAN', 'Polymer Lining Systems (Pty) Ltd', 'PL', 2, 'NYXymT8MOgZmcwB8EJwD', '["Bpu0H2AUrH005cObs4gg","HjnqJyvFEqEMYSacm8k3","xsPc7dfZFaTXKVtpVOWq","t0wVWrJF2Ey2GSD0lywL","pzeWiV6Q9wvYNgh7mjZG","LdwpSyOsKA0FEcXn8DMT","BhcajfBqEpdZC5ATP0GB","DwHBuySCuDbQzJYbfjGd","JftharWGR9pgELtrk3sM","NhRlMPTxnTza95vJr6ha","Pmdm8iuuQiZY7ASjCvmS","RNJUEDMWaaJ3tZ3VUfKj","TwUQDldoWZFDxq350iXo","W9U481Divtt5aXSRSaNf","ZX595eV1UTBU4aSgyH4k","c5ACT7etmvxCvozUIvvB","cmezF1v82bADXfQU2NxA","kXAfcbuA6VxzmcMeRpc0","lNCpOSyykZl2eLdQZmfY","mS60QRiRNWNhVNx8VSCr"]', false, NULL, NULL, '{"city":"Johannesburg","street":"Cnr Main & Paul Smit Streets","suburb":"Boksburg North","country":"South Africa","postcode":"1508","province":"Gauteng"}', NULL, '2021-05-31T13:19:23.504Z', '2021-10-12T12:32:20.825Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_company (id, firebase_uid, name, code, pricing_tier_id, pricing_tier_firebase_uid, available_products, is_compound_owner, vat_number, registration_number, address, notes, created_at, updated_at) VALUES (5, 'jBzfdz7bZsEeaWcXaGRx', 'Weir Minerals', 'WE', 3, 'mlzpdwwUMO9s4qjrAZBN', '["DwHBuySCuDbQzJYbfjGd","cmezF1v82bADXfQU2NxA","W9U481Divtt5aXSRSaNf"]', false, NULL, NULL, '{"registrationNumber":"d"}', NULL, '2021-05-31T13:22:15.997Z', '2021-10-10T19:23:55.900Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_company (id, firebase_uid, name, code, pricing_tier_id, pricing_tier_firebase_uid, available_products, is_compound_owner, vat_number, registration_number, address, notes, created_at, updated_at) VALUES (6, 'wGsjXoF1cMUQrYwUxitc', 'Truco Rubber Company', 'TR', 4, 'yuuVo1cgEnJu9fDxcpfw', '["BhcajfBqEpdZC5ATP0GB","JftharWGR9pgELtrk3sM","NhRlMPTxnTza95vJr6ha","Pmdm8iuuQiZY7ASjCvmS","RNJUEDMWaaJ3tZ3VUfKj","TwUQDldoWZFDxq350iXo","ZX595eV1UTBU4aSgyH4k","c5ACT7etmvxCvozUIvvB","kXAfcbuA6VxzmcMeRpc0","lNCpOSyykZl2eLdQZmfY","mS60QRiRNWNhVNx8VSCr"]', true, NULL, NULL, NULL, NULL, '2021-05-31T13:22:29.685Z', '2024-01-08T21:20:36.744Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(`INSERT INTO rubber_company (id, firebase_uid, name, code, pricing_tier_id, pricing_tier_firebase_uid, available_products, is_compound_owner, vat_number, registration_number, address, notes, created_at, updated_at) VALUES (7, 'xBzOcLyrP1Pc8QgIgSI0', 'Sumitomo Rubber (PTY) Limited', 'SR', 3, 'mlzpdwwUMO9s4qjrAZBN', '[]', false, NULL, NULL, '{"city":"","street":"892 Umgeni Rd","suburb":"Sandton","country":"South Africa","building":"The Old Factory Building","postcode":"4001","province":"KwaZulu-Natal"}', 'You can just 

type in 

As much info as you 

want here....

and it will be saved with the company', '2021-05-29T09:24:15.587Z', '2021-10-10T22:06:59.964Z') ON CONFLICT (id) DO NOTHING`);

    // Seed products
    await queryRunner.query(
      `INSERT INTO rubber_product (id, firebase_uid, title, description, specific_gravity, compound_owner_firebase_uid, compound_firebase_uid, type_firebase_uid, cost_per_kg, colour_firebase_uid, hardness_firebase_uid, curing_method_firebase_uid, grade_firebase_uid, markup, created_at, updated_at) VALUES (1, '21klhVsGDZe3aPz6JSkp', NULL, NULL, 1.0500, 'QkJUnET2lCkhNNUCWSWP', 'Ba7Leqgd7hpZzoHoExno', 'VLMozlAREJ94bb5GVsXA', 65.68, 'e86WR5mpD8BM8lIax83z', '2w08gBDmEiFuBbbcHCjM', 'nQ6BElaaf3G7lXtAkG5b', 'j8QTAkpzJaYjWPhdrZPg', 138.37, '2024-10-17T12:46:21.571Z', '2024-10-17T13:36:31.691Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product (id, firebase_uid, title, description, specific_gravity, compound_owner_firebase_uid, compound_firebase_uid, type_firebase_uid, cost_per_kg, colour_firebase_uid, hardness_firebase_uid, curing_method_firebase_uid, grade_firebase_uid, markup, created_at, updated_at) VALUES (2, '2qLWGxGw8llXevngPtYb', NULL, NULL, 1.0500, 'QkJUnET2lCkhNNUCWSWP', 'Ba7Leqgd7hpZzoHoExno', 'VLMozlAREJ94bb5GVsXA', 68.59, '8zbkB7AAIkisLGCrMIu4', '2w08gBDmEiFuBbbcHCjM', 'nQ6BElaaf3G7lXtAkG5b', 'j8QTAkpzJaYjWPhdrZPg', 148.62, '2024-10-17T12:46:21.564Z', '2024-10-17T13:36:31.691Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product (id, firebase_uid, title, description, specific_gravity, compound_owner_firebase_uid, compound_firebase_uid, type_firebase_uid, cost_per_kg, colour_firebase_uid, hardness_firebase_uid, curing_method_firebase_uid, grade_firebase_uid, markup, created_at, updated_at) VALUES (3, '5sZF1G2kDs9b1WErqUQh', NULL, NULL, 1.1200, 'QkJUnET2lCkhNNUCWSWP', 'Ba7Leqgd7hpZzoHoExno', 'VLMozlAREJ94bb5GVsXA', 66.89, 'e86WR5mpD8BM8lIax83z', 'mixSMU4pxzWTvd1Zg6bk', 'nQ6BElaaf3G7lXtAkG5b', 'j8QTAkpzJaYjWPhdrZPg', 138.38, '2024-10-17T12:46:21.572Z', '2024-10-17T13:36:31.692Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product (id, firebase_uid, title, description, specific_gravity, compound_owner_firebase_uid, compound_firebase_uid, type_firebase_uid, cost_per_kg, colour_firebase_uid, hardness_firebase_uid, curing_method_firebase_uid, grade_firebase_uid, markup, created_at, updated_at) VALUES (4, '7nDqUXEyIHSGb8XEjQQ2', NULL, NULL, 1.1900, 'QkJUnET2lCkhNNUCWSWP', 'jaF9Vz8Og1OroTSLVPaB', 'VLMozlAREJ94bb5GVsXA', 73.86, 'e86WR5mpD8BM8lIax83z', 'mixSMU4pxzWTvd1Zg6bk', 'nQ6BElaaf3G7lXtAkG5b', 'uqxNBpl0XJ8hvCCDk093', 156.82, '2024-10-17T13:30:13.607Z', '2024-10-17T13:36:31.692Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product (id, firebase_uid, title, description, specific_gravity, compound_owner_firebase_uid, compound_firebase_uid, type_firebase_uid, cost_per_kg, colour_firebase_uid, hardness_firebase_uid, curing_method_firebase_uid, grade_firebase_uid, markup, created_at, updated_at) VALUES (5, 'TINkOcoP6tJs6M0y9hI1', NULL, NULL, 1.2100, 'QkJUnET2lCkhNNUCWSWP', 'Ba7Leqgd7hpZzoHoExno', 'VLMozlAREJ94bb5GVsXA', 88.60, 'e86WR5mpD8BM8lIax83z', 'mixSMU4pxzWTvd1Zg6bk', 'nQ6BElaaf3G7lXtAkG5b', 'uqxNBpl0XJ8hvCCDk093', 202.72, '2024-10-17T13:30:13.607Z', '2024-10-17T13:36:31.692Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product (id, firebase_uid, title, description, specific_gravity, compound_owner_firebase_uid, compound_firebase_uid, type_firebase_uid, cost_per_kg, colour_firebase_uid, hardness_firebase_uid, curing_method_firebase_uid, grade_firebase_uid, markup, created_at, updated_at) VALUES (6, 'el2OT0MNDWTaTSx2Lefa', NULL, NULL, 1.1600, 'QkJUnET2lCkhNNUCWSWP', 'GkJfRRS1lbunGAT7hLJR', 'VLMozlAREJ94bb5GVsXA', 73.86, 'e86WR5mpD8BM8lIax83z', 'f1vYGe1gSlFasgobYXEP', 'nQ6BElaaf3G7lXtAkG5b', 'uqxNBpl0XJ8hvCCDk093', 156.82, '2024-10-17T13:30:13.599Z', '2024-10-17T13:36:31.692Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product (id, firebase_uid, title, description, specific_gravity, compound_owner_firebase_uid, compound_firebase_uid, type_firebase_uid, cost_per_kg, colour_firebase_uid, hardness_firebase_uid, curing_method_firebase_uid, grade_firebase_uid, markup, created_at, updated_at) VALUES (7, 'fOjNJjTmoJuTC16tEbVg', NULL, NULL, 1.1400, 'QkJUnET2lCkhNNUCWSWP', 'Ba7Leqgd7hpZzoHoExno', 'VLMozlAREJ94bb5GVsXA', 75.67, '8zbkB7AAIkisLGCrMIu4', 'mixSMU4pxzWTvd1Zg6bk', 'nQ6BElaaf3G7lXtAkG5b', 'j8QTAkpzJaYjWPhdrZPg', 138.38, '2024-10-17T12:46:21.572Z', '2024-10-17T13:36:31.692Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_product (id, firebase_uid, title, description, specific_gravity, compound_owner_firebase_uid, compound_firebase_uid, type_firebase_uid, cost_per_kg, colour_firebase_uid, hardness_firebase_uid, curing_method_firebase_uid, grade_firebase_uid, markup, created_at, updated_at) VALUES (8, 'pEhZUvZW7Z5dGV1JXcl6', NULL, NULL, 1.1300, 'QkJUnET2lCkhNNUCWSWP', 'cNEsROuWDiKS4Zp5hCGq', 'VLMozlAREJ94bb5GVsXA', 90.85, 'e86WR5mpD8BM8lIax83z', 'f1vYGe1gSlFasgobYXEP', 'nQ6BElaaf3G7lXtAkG5b', 'uqxNBpl0XJ8hvCCDk093', 138.37, '2024-10-17T12:46:21.571Z', '2024-10-17T13:36:31.692Z') ON CONFLICT (id) DO NOTHING`,
    );

    // Seed orders
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (1, '0OsfaSCF5HpF7mVeXvQa', 'AU000010', 'PL5978', 1, 'QkJUnET2lCkhNNUCWSWP', 3, 'ifouym2hkeMBIoIB3WccWkzqOE63', 'ifouym2hkeMBIoIB3WccWkzqOE63', '2022-12-03T08:57:17.504Z', '2024-10-17T13:45:38.137Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (2, '3UfTZ0HZCssZXcRgEK6o', 'AU000007', 'NICK-07', 3, 'QkJUnET2lCkhNNUCWSWP', 3, 'U6qS0nQlsWR9GnwNjGbTeYbtfrR2', 'U6qS0nQlsWR9GnwNjGbTeYbtfrR2', '2021-11-08T15:09:43.217Z', '2021-11-08T17:32:34.767Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (3, '4zmrrzGPbYRBg2UjOCeS', '14', 'NICK-05', 3, 'wGsjXoF1cMUQrYwUxitc', 6, 'HUN8XwnPoFgAHzr5wD7SZTwd4br1', 'HUN8XwnPoFgAHzr5wD7SZTwd4br1', '2021-08-22T20:05:10.620Z', '2021-11-08T15:07:46.383Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (4, '8flZ22dmHErFZp9wHUl2', '16', NULL, 1, 'QkJUnET2lCkhNNUCWSWP', 3, 'ifouym2hkeMBIoIB3WccWkzqOE63', 'ifouym2hkeMBIoIB3WccWkzqOE63', '2021-08-23T06:59:33.967Z', '2024-10-17T13:45:42.528Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (5, 'D5LQbnhhPVNTZ1Jq4LCD', '9', NULL, 1, 'jBzfdz7bZsEeaWcXaGRx', 5, 'g5DrESlGKfR7AGW0vP3iz0JEVkG2', 'g5DrESlGKfR7AGW0vP3iz0JEVkG2', '2021-08-22T10:09:24.864Z', '2024-10-17T13:45:43.974Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (6, 'G5lKQ7SC6KYJlphR8fup', 'PL000001', NULL, 1, 'alBoJfVZnWOBukwnVHAN', 4, 'R4EORI0JkEbkygvVqnu2N1U7CFe2', 'R4EORI0JkEbkygvVqnu2N1U7CFe2', '2021-12-04T12:04:16.776Z', '2021-12-04T12:01:31.772Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (7, 'Gh1eKys8HI56Q6XJgA0V', '19', NULL, 1, 'QkJUnET2lCkhNNUCWSWP', 3, 'ifouym2hkeMBIoIB3WccWkzqOE63', 'ifouym2hkeMBIoIB3WccWkzqOE63', '2021-10-08T10:11:11.575Z', '2024-10-17T13:45:40.809Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (8, 'NOC1diKcPBspxL3ldgzW', 'AU000009', '1234', 1, 'QkJUnET2lCkhNNUCWSWP', 3, 'ifouym2hkeMBIoIB3WccWkzqOE63', 'ifouym2hkeMBIoIB3WccWkzqOE63', '2022-11-11T11:29:15.680Z', '2024-10-17T13:45:45.277Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (9, 'VtHhWVY9CJf1NEqRAFuN', '18', 'NICK-01', 3, 'QkJUnET2lCkhNNUCWSWP', 3, 'U6qS0nQlsWR9GnwNjGbTeYbtfrR2', 'U6qS0nQlsWR9GnwNjGbTeYbtfrR2', '2021-08-30T22:08:15.657Z', '2021-11-07T23:59:17.973Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (10, 'd60krce8LRngsagNMkib', '13', NULL, 1, 'wGsjXoF1cMUQrYwUxitc', 6, 'HUN8XwnPoFgAHzr5wD7SZTwd4br1', 'HUN8XwnPoFgAHzr5wD7SZTwd4br1', '2021-08-22T20:04:07.554Z', '2024-10-17T13:45:46.363Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (11, 'd7FsEmXz41iCzToh8ZPs', 'AU000006', 'NICK-DEMO', 1, 'QkJUnET2lCkhNNUCWSWP', 3, 'U6qS0nQlsWR9GnwNjGbTeYbtfrR2', 'U6qS0nQlsWR9GnwNjGbTeYbtfrR2', '2021-11-08T02:05:42.793Z', '2024-10-17T13:45:47.502Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (12, 'gO4Gm4zdJEpVeYo5QpmC', 'AU000004', 'NICK-02', 1, 'QkJUnET2lCkhNNUCWSWP', 3, 'U6qS0nQlsWR9GnwNjGbTeYbtfrR2', 'U6qS0nQlsWR9GnwNjGbTeYbtfrR2', '2021-10-10T22:36:24.119Z', '2024-10-17T13:45:48.555Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (13, 'iORywoP6PqzCvyyUihJG', '3', NULL, 1, 'wGsjXoF1cMUQrYwUxitc', 6, 'HUN8XwnPoFgAHzr5wD7SZTwd4br1', 'HUN8XwnPoFgAHzr5wD7SZTwd4br1', '2021-08-18T01:38:34.116Z', '2024-10-17T13:45:52.114Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (14, 'jO6j5ScdJJ1F4C97fb2h', '15', 'NICK-03', 3, 'wGsjXoF1cMUQrYwUxitc', 6, 'HUN8XwnPoFgAHzr5wD7SZTwd4br1', 'HUN8XwnPoFgAHzr5wD7SZTwd4br1', '2021-08-22T20:08:34.689Z', '2021-11-07T23:34:18.674Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (15, 'm2fovnGBlzgUkwF49Ti9', '12', NULL, 1, 'jBzfdz7bZsEeaWcXaGRx', 5, 'g5DrESlGKfR7AGW0vP3iz0JEVkG2', 'g5DrESlGKfR7AGW0vP3iz0JEVkG2', '2021-08-22T10:58:42.841Z', '2024-10-17T13:45:50.932Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (16, 'nNrKHzawdyJ0ATWdTgj0', 'AU000008', 'NICK-DEMO', 3, 'QkJUnET2lCkhNNUCWSWP', 3, 'U6qS0nQlsWR9GnwNjGbTeYbtfrR2', 'U6qS0nQlsWR9GnwNjGbTeYbtfrR2', '2022-09-02T00:25:23.992Z', '2022-09-02T00:27:26.346Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (17, 'stLoPVk9HYeuuhZEFcv6', 'AU000005', 'NICK-06', 3, 'QkJUnET2lCkhNNUCWSWP', 3, 'U6qS0nQlsWR9GnwNjGbTeYbtfrR2', 'U6qS0nQlsWR9GnwNjGbTeYbtfrR2', '2021-11-08T01:12:28.566Z', '2021-11-08T01:28:48.499Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (18, 'uo0eHoO5vKq86wLQhWWz', '6', NULL, 3, 'jBzfdz7bZsEeaWcXaGRx', 5, 'g5DrESlGKfR7AGW0vP3iz0JEVkG2', 'g5DrESlGKfR7AGW0vP3iz0JEVkG2', '2021-08-21T12:41:53.608Z', '2021-11-08T00:53:35.080Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order (id, firebase_uid, order_number, company_order_number, status, company_firebase_uid, company_id, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (19, 'pg_1770307666370_lygrrdrqop8', 'ORD-00019', 'asdsadasdlkajlksdjsa-1', 0, NULL, 6, NULL, NULL, '2026-02-05T16:07:46.371Z', '2026-02-05T16:07:46.371Z') ON CONFLICT (id) DO NOTHING`,
    );

    // Seed order items
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (1, 1, 'HjnqJyvFEqEMYSacm8k3', NULL, 6.00, 1570.00, 12.50, 10, '[{"events":[{"status":0,"timestamp":1670057826641}],"quantity":5,"quantityRemaining":5}]', 'ifouym2hkeMBIoIB3WccWkzqOE63', NULL, '2022-12-03T08:55:45.061Z', '2026-02-05T15:11:27.451Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (2, 2, 'LdwpSyOsKA0FEcXn8DMT', NULL, 12.00, 1400.00, 9.00, 10, '[{"events":[{"status":0,"timestamp":1636384176453}],"quantity":7,"quantityRemaining":3}]', 'U6qS0nQlsWR9GnwNjGbTeYbtfrR2', NULL, '2021-11-08T15:09:00.385Z', '2026-02-05T15:11:27.452Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (3, 3, 'BhcajfBqEpdZC5ATP0GB', NULL, 3.00, 600.00, 6.00, 10, '[{"events":[{"status":0,"timestamp":1636329986083}],"quantity":6,"quantityRemaining":4}]', 'HUN8XwnPoFgAHzr5wD7SZTwd4br1', NULL, '2021-08-22T20:04:57.450Z', '2026-02-05T15:11:27.453Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (4, 4, 'BhcajfBqEpdZC5ATP0GB', NULL, 6.00, 1200.00, 12.00, 2, '[]', 'ifouym2hkeMBIoIB3WccWkzqOE63', NULL, '2021-08-23T06:57:02.558Z', '2026-02-05T15:11:27.454Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (5, 4, 'Bpu0H2AUrH005cObs4gg', NULL, 10.00, 1100.00, 10.00, 1, '[]', 'ifouym2hkeMBIoIB3WccWkzqOE63', NULL, '2021-08-23T06:58:09.301Z', '2026-02-05T15:11:27.454Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (6, 4, 'HjnqJyvFEqEMYSacm8k3', NULL, 6.00, 850.00, 13.50, 3, '[]', 'ifouym2hkeMBIoIB3WccWkzqOE63', NULL, '2021-08-23T06:59:04.816Z', '2026-02-05T15:11:27.454Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (7, 5, 'DwHBuySCuDbQzJYbfjGd', NULL, 3.00, 600.00, 6.00, 1, '[]', 'g5DrESlGKfR7AGW0vP3iz0JEVkG2', NULL, '2021-08-22T10:09:24.864Z', '2026-02-05T15:11:27.455Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (8, 7, 'xsPc7dfZFaTXKVtpVOWq', NULL, 6.00, 1200.00, 12.00, 6, '[]', 'ifouym2hkeMBIoIB3WccWkzqOE63', NULL, '2021-10-08T10:08:50.613Z', '2026-02-05T15:11:27.457Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (9, 8, 'Bpu0H2AUrH005cObs4gg', NULL, 6.00, 1300.00, 12.50, 4, '[]', 'ifouym2hkeMBIoIB3WccWkzqOE63', NULL, '2022-11-11T11:27:11.650Z', '2026-02-05T15:11:27.458Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (10, 9, 'BhcajfBqEpdZC5ATP0GB', NULL, 3.00, 850.00, 7.50, 2, '[]', 'U6qS0nQlsWR9GnwNjGbTeYbtfrR2', NULL, '2021-08-30T22:07:57.012Z', '2026-02-05T15:11:27.459Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (11, 10, 'JftharWGR9pgELtrk3sM', NULL, 3.00, 1000.00, 9.50, 1, '[]', 'HUN8XwnPoFgAHzr5wD7SZTwd4br1', NULL, '2021-08-22T20:03:50.437Z', '2026-02-05T15:11:27.459Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (12, 11, 'BhcajfBqEpdZC5ATP0GB', NULL, 3.00, 900.00, 8.50, 200, '[{"events":[{"status":0,"timestamp":1636336970756}],"quantity":150,"quantityRemaining":50}]', 'U6qS0nQlsWR9GnwNjGbTeYbtfrR2', NULL, '2021-11-08T01:54:01.818Z', '2026-02-05T15:11:27.460Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (13, 12, 'BhcajfBqEpdZC5ATP0GB', NULL, 3.00, 950.00, 9.00, 200, '[{"events":[{"status":0,"timestamp":1635380875291}],"quantity":150,"allRemaining":false,"quantityRemaining":50},{"events":[{"status":0,"timestamp":1636308359330}],"quantity":24,"quantityRemaining":26}]', 'U6qS0nQlsWR9GnwNjGbTeYbtfrR2', NULL, '2021-10-10T22:33:11.328Z', '2026-02-05T15:11:27.461Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (14, 13, 'NhRlMPTxnTza95vJr6ha', NULL, 10.00, 1570.00, 14.50, 2, '[]', 'HUN8XwnPoFgAHzr5wD7SZTwd4br1', NULL, '2021-08-18T01:38:19.920Z', '2026-02-05T15:11:27.462Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (15, 13, 'JftharWGR9pgELtrk3sM', NULL, 4.00, 1200.00, 11.00, 2, '[]', 'HUN8XwnPoFgAHzr5wD7SZTwd4br1', NULL, '2021-08-22T19:17:34.228Z', '2026-02-05T15:11:27.462Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (16, 13, 'Pmdm8iuuQiZY7ASjCvmS', NULL, 6.00, 1300.00, 11.50, 1, '[]', 'HUN8XwnPoFgAHzr5wD7SZTwd4br1', NULL, '2021-08-22T19:17:51.022Z', '2026-02-05T15:11:27.462Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (17, 14, 'JftharWGR9pgELtrk3sM', NULL, 5.00, 900.00, 8.50, 2, '[]', 'HUN8XwnPoFgAHzr5wD7SZTwd4br1', NULL, '2021-08-22T20:07:54.512Z', '2026-02-05T15:11:27.463Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (18, 15, 'W9U481Divtt5aXSRSaNf', NULL, 8.00, 1100.00, 10.50, 3, '[]', 'g5DrESlGKfR7AGW0vP3iz0JEVkG2', NULL, '2021-08-22T10:57:58.211Z', '2026-02-05T15:11:27.464Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (19, 15, 'cmezF1v82bADXfQU2NxA', NULL, 9.00, 1100.00, 10.00, 1, '[]', 'g5DrESlGKfR7AGW0vP3iz0JEVkG2', NULL, '2021-08-22T10:58:09.912Z', '2026-02-05T15:11:27.465Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (20, 16, 'NhRlMPTxnTza95vJr6ha', NULL, 3.00, 900.00, 8.00, 10, '[{"events":[],"quantity":4,"quantityRemaining":6}]', 'U6qS0nQlsWR9GnwNjGbTeYbtfrR2', NULL, '2022-09-02T00:23:58.181Z', '2026-02-05T15:11:27.465Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (21, 17, 'Bpu0H2AUrH005cObs4gg', NULL, 3.00, 1050.00, 9.50, 11, '[{"events":[{"status":0,"timestamp":1636334924352}],"quantity":6,"quantityRemaining":5}]', 'U6qS0nQlsWR9GnwNjGbTeYbtfrR2', NULL, '2021-11-08T01:11:32.156Z', '2026-02-05T15:11:27.466Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (22, 18, 'W9U481Divtt5aXSRSaNf', NULL, 10.00, 1400.00, 11.00, 1, '[]', 'g5DrESlGKfR7AGW0vP3iz0JEVkG2', NULL, '2021-08-21T12:41:53.608Z', '2026-02-05T15:11:27.467Z') ON CONFLICT (id) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO rubber_order_item (id, order_id, product_firebase_uid, product_id, thickness, width, length, quantity, call_offs, created_by_firebase_uid, updated_by_firebase_uid, created_at, updated_at) VALUES (23, 18, 'cmezF1v82bADXfQU2NxA', NULL, 9.00, 1450.00, 13.50, 100, '[{"events":[{"status":0,"timestamp":1636332337354}],"quantity":60,"quantityRemaining":40}]', 'g5DrESlGKfR7AGW0vP3iz0JEVkG2', NULL, '2021-08-21T20:22:46.947Z', '2026-02-05T15:11:27.467Z') ON CONFLICT (id) DO NOTHING`,
    );

    // Update sequences
    await queryRunner.query(
      `SELECT setval('rubber_pricing_tier_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM rubber_pricing_tier), false)`,
    );
    await queryRunner.query(
      `SELECT setval('rubber_product_coding_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM rubber_product_coding), false)`,
    );
    await queryRunner.query(
      `SELECT setval('rubber_company_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM rubber_company), false)`,
    );
    await queryRunner.query(
      `SELECT setval('rubber_product_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM rubber_product), false)`,
    );
    await queryRunner.query(
      `SELECT setval('rubber_order_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM rubber_order), false)`,
    );
    await queryRunner.query(
      `SELECT setval('rubber_order_item_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM rubber_order_item), false)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DELETE FROM rubber_order_item");
    await queryRunner.query("DELETE FROM rubber_order");
    await queryRunner.query("DELETE FROM rubber_product");
    await queryRunner.query("DELETE FROM rubber_company");
    await queryRunner.query("DELETE FROM rubber_product_coding");
    await queryRunner.query("DELETE FROM rubber_pricing_tier");
  }
}
