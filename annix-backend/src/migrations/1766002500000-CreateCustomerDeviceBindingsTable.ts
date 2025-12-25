import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomerDeviceBindingsTable1766002500000
  implements MigrationInterface
{
  name = 'CreateCustomerDeviceBindingsTable1766002500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create customer_device_bindings table
    await queryRunner.query(`
            CREATE TABLE "customer_device_bindings" (
                "id" SERIAL NOT NULL,
                "customer_profile_id" integer NOT NULL,
                "device_fingerprint" character varying(500) NOT NULL,
                "is_primary" boolean NOT NULL DEFAULT true,
                "is_active" boolean NOT NULL DEFAULT true,
                "browser_info" jsonb,
                "registered_ip" character varying(45) NOT NULL,
                "ip_country" character varying(100),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deactivated_at" TIMESTAMP,
                "deactivated_by" integer,
                "deactivation_reason" character varying(255),
                CONSTRAINT "PK_customer_device_bindings" PRIMARY KEY ("id")
            )
        `);

    // Add foreign key constraint
    await queryRunner.query(`
            ALTER TABLE "customer_device_bindings"
            ADD CONSTRAINT "FK_customer_device_bindings_customer_profile"
            FOREIGN KEY ("customer_profile_id")
            REFERENCES "customer_profiles"("id")
            ON DELETE CASCADE
        `);

    // Add index for faster lookups
    await queryRunner.query(`
            CREATE INDEX "IDX_customer_device_bindings_customer_profile"
            ON "customer_device_bindings"("customer_profile_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_customer_device_bindings_device_fingerprint"
            ON "customer_device_bindings"("device_fingerprint")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_customer_device_bindings_device_fingerprint"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_customer_device_bindings_customer_profile"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_device_bindings" DROP CONSTRAINT "FK_customer_device_bindings_customer_profile"`,
    );
    await queryRunner.query(`DROP TABLE "customer_device_bindings"`);
  }
}
