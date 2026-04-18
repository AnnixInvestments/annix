import type { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateCustomerSupplierFksToUnified1820100000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Customer profiles: swap company_id from customer_companies to companies ---
    await queryRunner.query(`
      UPDATE customer_profiles cp
      SET company_id = c.id
      FROM companies c
      WHERE c.legacy_customer_company_id = cp.company_id
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE customer_profiles
          DROP CONSTRAINT IF EXISTS "FK_customer_profiles_company";
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      ALTER TABLE customer_profiles
        ADD CONSTRAINT "FK_customer_profiles_company"
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    `);

    // --- Customer blocked suppliers ---
    await queryRunner.query(`
      UPDATE customer_blocked_suppliers cbs
      SET customer_company_id = c.id
      FROM companies c
      WHERE c.legacy_customer_company_id = cbs.customer_company_id
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE customer_blocked_suppliers
          DROP CONSTRAINT IF EXISTS "FK_customer_blocked_suppliers_company";
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      ALTER TABLE customer_blocked_suppliers
        ADD CONSTRAINT "FK_customer_blocked_suppliers_company"
        FOREIGN KEY (customer_company_id) REFERENCES companies(id) ON DELETE CASCADE
    `);

    // --- Customer preferred suppliers ---
    await queryRunner.query(`
      UPDATE customer_preferred_suppliers cps
      SET customer_company_id = c.id
      FROM companies c
      WHERE c.legacy_customer_company_id = cps.customer_company_id
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE customer_preferred_suppliers
          DROP CONSTRAINT IF EXISTS "FK_customer_preferred_suppliers_company";
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      ALTER TABLE customer_preferred_suppliers
        ADD CONSTRAINT "FK_customer_preferred_suppliers_company"
        FOREIGN KEY (customer_company_id) REFERENCES companies(id) ON DELETE CASCADE
    `);

    // --- Supplier invitations ---
    await queryRunner.query(`
      UPDATE supplier_invitations si
      SET customer_company_id = c.id
      FROM companies c
      WHERE c.legacy_customer_company_id = si.customer_company_id
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE supplier_invitations
          DROP CONSTRAINT IF EXISTS "FK_supplier_invitations_company";
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      ALTER TABLE supplier_invitations
        ADD CONSTRAINT "FK_supplier_invitations_company"
        FOREIGN KEY (customer_company_id) REFERENCES companies(id) ON DELETE CASCADE
    `);

    // --- Supplier profiles: swap company_id from supplier_companies to companies ---
    await queryRunner.query(`
      UPDATE supplier_profiles sp
      SET company_id = c.id
      FROM companies c
      WHERE c.legacy_supplier_company_id = sp.company_id
        AND sp.company_id IS NOT NULL
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE supplier_profiles
          DROP CONSTRAINT IF EXISTS "FK_supplier_profiles_company";
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      ALTER TABLE supplier_profiles
        ADD CONSTRAINT "FK_supplier_profiles_company"
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Down migration not supported — legacy company IDs are not recoverable
    // after the swap. Restore from backup if rollback is needed.
  }
}
