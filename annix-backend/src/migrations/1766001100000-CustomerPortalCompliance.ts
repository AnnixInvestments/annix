import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerPortalCompliance1766001100000
  implements MigrationInterface
{
  name = 'CustomerPortalCompliance1766001100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create new enums for customer portal
    await queryRunner.query(`
            CREATE TYPE "customer_role_enum" AS ENUM (
                'customer_admin',
                'customer_standard'
            )
        `);

    await queryRunner.query(`
            CREATE TYPE "customer_account_status_enum" AS ENUM (
                'pending',
                'active',
                'suspended',
                'deactivated'
            )
        `);

    await queryRunner.query(`
            CREATE TYPE "customer_onboarding_status_enum" AS ENUM (
                'draft',
                'submitted',
                'under_review',
                'approved',
                'rejected'
            )
        `);

    await queryRunner.query(`
            CREATE TYPE "customer_document_type_enum" AS ENUM (
                'registration_cert',
                'tax_clearance',
                'bee_cert',
                'insurance',
                'proof_of_address',
                'other'
            )
        `);

    await queryRunner.query(`
            CREATE TYPE "customer_document_validation_status_enum" AS ENUM (
                'pending',
                'valid',
                'invalid',
                'failed',
                'manual_review'
            )
        `);

    await queryRunner.query(`
            CREATE TYPE "supplier_invitation_status_enum" AS ENUM (
                'pending',
                'accepted',
                'expired',
                'cancelled'
            )
        `);

    // Create customer_companies table
    await queryRunner.query(`
            CREATE TABLE "customer_companies" (
                "id" SERIAL NOT NULL,
                "legal_name" character varying(255) NOT NULL,
                "trading_name" character varying(255),
                "registration_number" character varying(50) NOT NULL UNIQUE,
                "vat_number" character varying(50),
                "industry" character varying(100),
                "company_size" character varying(50),
                "street_address" text NOT NULL,
                "city" character varying(100) NOT NULL,
                "province_state" character varying(100) NOT NULL,
                "postal_code" character varying(20) NOT NULL,
                "country" character varying(100) NOT NULL DEFAULT 'South Africa',
                "primary_phone" character varying(30) NOT NULL,
                "fax_number" character varying(30),
                "general_email" character varying(255),
                "website" character varying(255),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_customer_companies" PRIMARY KEY ("id")
            )
        `);

    // Create customer_profiles table
    await queryRunner.query(`
            CREATE TABLE "customer_profiles" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL UNIQUE,
                "company_id" integer NOT NULL,
                "first_name" character varying(100) NOT NULL,
                "last_name" character varying(100) NOT NULL,
                "job_title" character varying(100),
                "direct_phone" character varying(30),
                "mobile_phone" character varying(30),
                "role" "customer_role_enum" NOT NULL DEFAULT 'customer_admin',
                "account_status" "customer_account_status_enum" NOT NULL DEFAULT 'pending',
                "email_verified" boolean NOT NULL DEFAULT false,
                "email_verification_token" character varying(500),
                "email_verification_expires" TIMESTAMP,
                "suspension_reason" text,
                "suspended_at" TIMESTAMP,
                "suspended_by" integer,
                "terms_accepted_at" TIMESTAMP,
                "security_policy_accepted_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_customer_profiles" PRIMARY KEY ("id")
            )
        `);

    // Add foreign key for customer_profiles
    await queryRunner.query(`
            ALTER TABLE "customer_profiles"
            ADD CONSTRAINT "FK_customer_profiles_user"
            FOREIGN KEY ("user_id")
            REFERENCES "user"("id")
            ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "customer_profiles"
            ADD CONSTRAINT "FK_customer_profiles_company"
            FOREIGN KEY ("company_id")
            REFERENCES "customer_companies"("id")
            ON DELETE CASCADE
        `);

    // Create customer_onboarding table
    await queryRunner.query(`
            CREATE TABLE "customer_onboarding" (
                "id" SERIAL NOT NULL,
                "customer_id" integer NOT NULL UNIQUE,
                "status" "customer_onboarding_status_enum" NOT NULL DEFAULT 'draft',
                "company_details_complete" boolean NOT NULL DEFAULT false,
                "documents_complete" boolean NOT NULL DEFAULT false,
                "submitted_at" TIMESTAMP,
                "reviewed_at" TIMESTAMP,
                "reviewed_by_id" integer,
                "rejection_reason" text,
                "remediation_steps" text,
                "resubmission_count" integer NOT NULL DEFAULT 0,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_customer_onboarding" PRIMARY KEY ("id")
            )
        `);

    // Create customer_documents table
    await queryRunner.query(`
            CREATE TABLE "customer_documents" (
                "id" SERIAL NOT NULL,
                "customer_id" integer NOT NULL,
                "document_type" "customer_document_type_enum" NOT NULL,
                "file_name" character varying(255) NOT NULL,
                "file_path" character varying(500) NOT NULL,
                "file_size" integer NOT NULL,
                "mime_type" character varying(100) NOT NULL,
                "uploaded_at" TIMESTAMP NOT NULL DEFAULT now(),
                "validation_status" "customer_document_validation_status_enum" NOT NULL DEFAULT 'pending',
                "validation_notes" text,
                "reviewed_by_id" integer,
                "reviewed_at" TIMESTAMP,
                "expiry_date" DATE,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_customer_documents" PRIMARY KEY ("id")
            )
        `);

    // Create customer_preferred_suppliers table
    await queryRunner.query(`
            CREATE TABLE "customer_preferred_suppliers" (
                "id" SERIAL NOT NULL,
                "customer_company_id" integer NOT NULL,
                "supplier_profile_id" integer,
                "supplier_name" character varying(255),
                "supplier_email" character varying(255),
                "added_by_id" integer NOT NULL,
                "priority" integer NOT NULL DEFAULT 0,
                "notes" text,
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_customer_preferred_suppliers" PRIMARY KEY ("id")
            )
        `);

    // Create supplier_invitations table
    await queryRunner.query(`
            CREATE TABLE "supplier_invitations" (
                "id" SERIAL NOT NULL,
                "customer_company_id" integer NOT NULL,
                "invited_by_id" integer NOT NULL,
                "token" character varying(500) NOT NULL UNIQUE,
                "email" character varying(255) NOT NULL,
                "supplier_company_name" character varying(255),
                "status" "supplier_invitation_status_enum" NOT NULL DEFAULT 'pending',
                "expires_at" TIMESTAMP NOT NULL,
                "accepted_at" TIMESTAMP,
                "supplier_profile_id" integer,
                "message" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_supplier_invitations" PRIMARY KEY ("id")
            )
        `);

    // Add foreign key constraints
    await queryRunner.query(`
            ALTER TABLE "customer_onboarding"
            ADD CONSTRAINT "FK_customer_onboarding_customer"
            FOREIGN KEY ("customer_id")
            REFERENCES "customer_profiles"("id")
            ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "customer_onboarding"
            ADD CONSTRAINT "FK_customer_onboarding_reviewed_by"
            FOREIGN KEY ("reviewed_by_id")
            REFERENCES "user"("id")
            ON DELETE SET NULL
        `);

    await queryRunner.query(`
            ALTER TABLE "customer_documents"
            ADD CONSTRAINT "FK_customer_documents_customer"
            FOREIGN KEY ("customer_id")
            REFERENCES "customer_profiles"("id")
            ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "customer_documents"
            ADD CONSTRAINT "FK_customer_documents_reviewed_by"
            FOREIGN KEY ("reviewed_by_id")
            REFERENCES "user"("id")
            ON DELETE SET NULL
        `);

    await queryRunner.query(`
            ALTER TABLE "customer_preferred_suppliers"
            ADD CONSTRAINT "FK_preferred_suppliers_company"
            FOREIGN KEY ("customer_company_id")
            REFERENCES "customer_companies"("id")
            ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "customer_preferred_suppliers"
            ADD CONSTRAINT "FK_preferred_suppliers_supplier"
            FOREIGN KEY ("supplier_profile_id")
            REFERENCES "supplier_profiles"("id")
            ON DELETE SET NULL
        `);

    await queryRunner.query(`
            ALTER TABLE "customer_preferred_suppliers"
            ADD CONSTRAINT "FK_preferred_suppliers_added_by"
            FOREIGN KEY ("added_by_id")
            REFERENCES "customer_profiles"("id")
            ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "supplier_invitations"
            ADD CONSTRAINT "FK_invitations_company"
            FOREIGN KEY ("customer_company_id")
            REFERENCES "customer_companies"("id")
            ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "supplier_invitations"
            ADD CONSTRAINT "FK_invitations_invited_by"
            FOREIGN KEY ("invited_by_id")
            REFERENCES "customer_profiles"("id")
            ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "supplier_invitations"
            ADD CONSTRAINT "FK_invitations_supplier"
            FOREIGN KEY ("supplier_profile_id")
            REFERENCES "supplier_profiles"("id")
            ON DELETE SET NULL
        `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_profiles_role" ON "customer_profiles" ("role")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_profiles_email_verified" ON "customer_profiles" ("email_verified")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_onboarding_status" ON "customer_onboarding" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_onboarding_customer" ON "customer_onboarding" ("customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_documents_customer" ON "customer_documents" ("customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_documents_type" ON "customer_documents" ("document_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_documents_status" ON "customer_documents" ("validation_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_preferred_suppliers_company" ON "customer_preferred_suppliers" ("customer_company_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_preferred_suppliers_active" ON "customer_preferred_suppliers" ("customer_company_id", "is_active")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invitations_token" ON "supplier_invitations" ("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invitations_email_status" ON "supplier_invitations" ("email", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invitations_company" ON "supplier_invitations" ("customer_company_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invitations_company"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_invitations_email_status"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invitations_token"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_preferred_suppliers_active"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_preferred_suppliers_company"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_customer_documents_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_customer_documents_type"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_customer_documents_customer"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_customer_onboarding_customer"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_customer_onboarding_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_customer_profiles_email_verified"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_customer_profiles_role"`,
    );

    // Drop foreign keys and tables
    await queryRunner.query(
      `ALTER TABLE "supplier_invitations" DROP CONSTRAINT IF EXISTS "FK_invitations_supplier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invitations" DROP CONSTRAINT IF EXISTS "FK_invitations_invited_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invitations" DROP CONSTRAINT IF EXISTS "FK_invitations_company"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "supplier_invitations"`);

    await queryRunner.query(
      `ALTER TABLE "customer_preferred_suppliers" DROP CONSTRAINT IF EXISTS "FK_preferred_suppliers_added_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_preferred_suppliers" DROP CONSTRAINT IF EXISTS "FK_preferred_suppliers_supplier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_preferred_suppliers" DROP CONSTRAINT IF EXISTS "FK_preferred_suppliers_company"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "customer_preferred_suppliers"`,
    );

    await queryRunner.query(
      `ALTER TABLE "customer_documents" DROP CONSTRAINT IF EXISTS "FK_customer_documents_reviewed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_documents" DROP CONSTRAINT IF EXISTS "FK_customer_documents_customer"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_documents"`);

    await queryRunner.query(
      `ALTER TABLE "customer_onboarding" DROP CONSTRAINT IF EXISTS "FK_customer_onboarding_reviewed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_onboarding" DROP CONSTRAINT IF EXISTS "FK_customer_onboarding_customer"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_onboarding"`);

    // Drop customer_profiles table and its foreign keys
    await queryRunner.query(
      `ALTER TABLE "customer_profiles" DROP CONSTRAINT IF EXISTS "FK_customer_profiles_company"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_profiles" DROP CONSTRAINT IF EXISTS "FK_customer_profiles_user"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_profiles"`);

    // Drop customer_companies table
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_companies"`);

    // Drop enums
    await queryRunner.query(
      `DROP TYPE IF EXISTS "supplier_invitation_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "customer_document_validation_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "customer_document_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "customer_onboarding_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "customer_account_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "customer_role_enum"`);
  }
}
