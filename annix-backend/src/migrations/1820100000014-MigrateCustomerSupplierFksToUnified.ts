import type { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateCustomerSupplierFksToUnified1820100000014 implements MigrationInterface {
  private async dropFkConstraints(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<void> {
    const constraints: { constraint_name: string }[] = await queryRunner.query(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name = '${table}'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = '${column}'
    `);

    for (const row of constraints) {
      await queryRunner.query(
        `ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`,
      );
    }
  }

  private async migrateTable(
    queryRunner: QueryRunner,
    table: string,
    column: string,
    legacyColumn: "legacy_customer_company_id" | "legacy_supplier_company_id",
    onDelete: "CASCADE" | "SET NULL",
  ): Promise<void> {
    await this.dropFkConstraints(queryRunner, table, column);

    await queryRunner.query(`
      UPDATE ${table} t
      SET ${column} = c.id
      FROM companies c
      WHERE c.${legacyColumn} = t.${column}
    `);

    await queryRunner.query(`
      DELETE FROM ${table}
      WHERE ${column} IS NOT NULL
        AND ${column} NOT IN (SELECT id FROM companies)
    `);

    await queryRunner.query(`
      ALTER TABLE ${table}
        ADD CONSTRAINT "FK_${table}_${column.replace(/_id$/, "")}"
        FOREIGN KEY (${column}) REFERENCES companies(id) ON DELETE ${onDelete}
    `);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.migrateTable(
      queryRunner,
      "customer_profiles",
      "company_id",
      "legacy_customer_company_id",
      "CASCADE",
    );
    await this.migrateTable(
      queryRunner,
      "customer_blocked_suppliers",
      "customer_company_id",
      "legacy_customer_company_id",
      "CASCADE",
    );
    await this.migrateTable(
      queryRunner,
      "customer_preferred_suppliers",
      "customer_company_id",
      "legacy_customer_company_id",
      "CASCADE",
    );
    await this.migrateTable(
      queryRunner,
      "supplier_invitations",
      "customer_company_id",
      "legacy_customer_company_id",
      "CASCADE",
    );
    await this.migrateTable(
      queryRunner,
      "supplier_profiles",
      "company_id",
      "legacy_supplier_company_id",
      "SET NULL",
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Down migration not supported — legacy company IDs are not recoverable
    // after the swap. Restore from backup if rollback is needed.
  }
}
