import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSupplierTables1766001000000 implements MigrationInterface {
    name = 'CreateSupplierTables1766001000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enums
        await queryRunner.query(`
            CREATE TYPE "supplier_account_status_enum" AS ENUM (
                'pending',
                'active',
                'suspended',
                'deactivated'
            )
        `);

        await queryRunner.query(`
            CREATE TYPE "supplier_onboarding_status_enum" AS ENUM (
                'draft',
                'submitted',
                'under_review',
                'approved',
                'rejected'
            )
        `);

        await queryRunner.query(`
            CREATE TYPE "supplier_document_type_enum" AS ENUM (
                'registration_cert',
                'tax_clearance',
                'bee_cert',
                'iso_cert',
                'insurance',
                'other'
            )
        `);

        await queryRunner.query(`
            CREATE TYPE "supplier_document_validation_status_enum" AS ENUM (
                'pending',
                'valid',
                'invalid',
                'failed',
                'manual_review'
            )
        `);

        await queryRunner.query(`
            CREATE TYPE "supplier_session_invalidation_reason_enum" AS ENUM (
                'logout',
                'new_login',
                'expired',
                'admin_reset',
                'device_reset',
                'account_suspended'
            )
        `);

        await queryRunner.query(`
            CREATE TYPE "supplier_login_failure_reason_enum" AS ENUM (
                'invalid_credentials',
                'device_mismatch',
                'account_suspended',
                'account_pending',
                'account_deactivated',
                'too_many_attempts',
                'email_not_verified'
            )
        `);

        // Create supplier_companies table
        await queryRunner.query(`
            CREATE TABLE "supplier_companies" (
                "id" SERIAL NOT NULL,
                "legal_name" character varying(255) NOT NULL,
                "trading_name" character varying(255),
                "registration_number" character varying(50) NOT NULL UNIQUE,
                "tax_number" character varying(50),
                "vat_number" character varying(50),
                "street_address" text NOT NULL,
                "address_line_2" text,
                "city" character varying(100) NOT NULL,
                "province_state" character varying(100) NOT NULL,
                "postal_code" character varying(20) NOT NULL,
                "country" character varying(100) NOT NULL DEFAULT 'South Africa',
                "primary_contact_name" character varying(200) NOT NULL,
                "primary_contact_email" character varying(255) NOT NULL,
                "primary_contact_phone" character varying(30) NOT NULL,
                "primary_phone" character varying(30),
                "fax_number" character varying(30),
                "general_email" character varying(255),
                "website" character varying(255),
                "operational_regions" jsonb DEFAULT '[]',
                "industry_type" character varying(100),
                "company_size" character varying(50),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_supplier_companies" PRIMARY KEY ("id")
            )
        `);

        // Create supplier_profiles table
        await queryRunner.query(`
            CREATE TABLE "supplier_profiles" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL UNIQUE,
                "company_id" integer,
                "first_name" character varying(100),
                "last_name" character varying(100),
                "job_title" character varying(100),
                "direct_phone" character varying(30),
                "mobile_phone" character varying(30),
                "account_status" "supplier_account_status_enum" NOT NULL DEFAULT 'pending',
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
                CONSTRAINT "PK_supplier_profiles" PRIMARY KEY ("id")
            )
        `);

        // Create supplier_onboarding table
        await queryRunner.query(`
            CREATE TABLE "supplier_onboarding" (
                "id" SERIAL NOT NULL,
                "supplier_id" integer NOT NULL UNIQUE,
                "status" "supplier_onboarding_status_enum" NOT NULL DEFAULT 'draft',
                "company_details_complete" boolean NOT NULL DEFAULT false,
                "documents_complete" boolean NOT NULL DEFAULT false,
                "submitted_at" TIMESTAMP,
                "reviewed_at" TIMESTAMP,
                "reviewed_by" integer,
                "rejection_reason" text,
                "remediation_steps" text,
                "resubmission_count" integer NOT NULL DEFAULT 0,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_supplier_onboarding" PRIMARY KEY ("id")
            )
        `);

        // Create supplier_documents table
        await queryRunner.query(`
            CREATE TABLE "supplier_documents" (
                "id" SERIAL NOT NULL,
                "supplier_id" integer NOT NULL,
                "document_type" "supplier_document_type_enum" NOT NULL,
                "file_name" character varying(255) NOT NULL,
                "file_path" character varying(500) NOT NULL,
                "file_size" integer NOT NULL,
                "mime_type" character varying(100) NOT NULL,
                "uploaded_at" TIMESTAMP NOT NULL DEFAULT now(),
                "validation_status" "supplier_document_validation_status_enum" NOT NULL DEFAULT 'pending',
                "validation_notes" text,
                "reviewed_by" integer,
                "reviewed_at" TIMESTAMP,
                "expiry_date" DATE,
                "is_required" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_supplier_documents" PRIMARY KEY ("id")
            )
        `);

        // Create supplier_device_bindings table
        await queryRunner.query(`
            CREATE TABLE "supplier_device_bindings" (
                "id" SERIAL NOT NULL,
                "supplier_profile_id" integer NOT NULL,
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
                CONSTRAINT "PK_supplier_device_bindings" PRIMARY KEY ("id")
            )
        `);

        // Create supplier_sessions table
        await queryRunner.query(`
            CREATE TABLE "supplier_sessions" (
                "id" SERIAL NOT NULL,
                "supplier_profile_id" integer NOT NULL,
                "session_token" character varying(500) NOT NULL UNIQUE,
                "refresh_token" character varying(500),
                "device_fingerprint" character varying(500) NOT NULL,
                "ip_address" character varying(45) NOT NULL,
                "user_agent" text,
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "expires_at" TIMESTAMP NOT NULL,
                "last_activity" TIMESTAMP NOT NULL,
                "invalidated_at" TIMESTAMP,
                "invalidation_reason" "supplier_session_invalidation_reason_enum",
                CONSTRAINT "PK_supplier_sessions" PRIMARY KEY ("id")
            )
        `);

        // Create supplier_login_attempts table
        await queryRunner.query(`
            CREATE TABLE "supplier_login_attempts" (
                "id" SERIAL NOT NULL,
                "supplier_profile_id" integer,
                "email" character varying(255) NOT NULL,
                "success" boolean NOT NULL DEFAULT false,
                "failure_reason" "supplier_login_failure_reason_enum",
                "device_fingerprint" character varying(500),
                "ip_address" character varying(45) NOT NULL,
                "user_agent" text,
                "ip_mismatch_warning" boolean NOT NULL DEFAULT false,
                "attempt_time" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_supplier_login_attempts" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "supplier_profiles"
            ADD CONSTRAINT "FK_supplier_profiles_user"
            FOREIGN KEY ("user_id")
            REFERENCES "user"("id")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "supplier_profiles"
            ADD CONSTRAINT "FK_supplier_profiles_company"
            FOREIGN KEY ("company_id")
            REFERENCES "supplier_companies"("id")
            ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "supplier_onboarding"
            ADD CONSTRAINT "FK_supplier_onboarding_supplier"
            FOREIGN KEY ("supplier_id")
            REFERENCES "supplier_profiles"("id")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "supplier_onboarding"
            ADD CONSTRAINT "FK_supplier_onboarding_reviewed_by"
            FOREIGN KEY ("reviewed_by")
            REFERENCES "user"("id")
            ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "supplier_documents"
            ADD CONSTRAINT "FK_supplier_documents_supplier"
            FOREIGN KEY ("supplier_id")
            REFERENCES "supplier_profiles"("id")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "supplier_documents"
            ADD CONSTRAINT "FK_supplier_documents_reviewed_by"
            FOREIGN KEY ("reviewed_by")
            REFERENCES "user"("id")
            ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "supplier_device_bindings"
            ADD CONSTRAINT "FK_supplier_device_bindings_profile"
            FOREIGN KEY ("supplier_profile_id")
            REFERENCES "supplier_profiles"("id")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "supplier_sessions"
            ADD CONSTRAINT "FK_supplier_sessions_profile"
            FOREIGN KEY ("supplier_profile_id")
            REFERENCES "supplier_profiles"("id")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "supplier_login_attempts"
            ADD CONSTRAINT "FK_supplier_login_attempts_profile"
            FOREIGN KEY ("supplier_profile_id")
            REFERENCES "supplier_profiles"("id")
            ON DELETE SET NULL
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_supplier_profiles_user" ON "supplier_profiles" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_supplier_profiles_company" ON "supplier_profiles" ("company_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_supplier_profiles_status" ON "supplier_profiles" ("account_status")`);
        await queryRunner.query(`CREATE INDEX "IDX_supplier_onboarding_status" ON "supplier_onboarding" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_supplier_documents_supplier" ON "supplier_documents" ("supplier_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_supplier_documents_type" ON "supplier_documents" ("document_type")`);
        await queryRunner.query(`CREATE INDEX "IDX_supplier_sessions_token" ON "supplier_sessions" ("session_token")`);
        await queryRunner.query(`CREATE INDEX "IDX_supplier_sessions_active" ON "supplier_sessions" ("supplier_profile_id", "is_active")`);
        await queryRunner.query(`CREATE INDEX "IDX_supplier_login_attempts_email" ON "supplier_login_attempts" ("email", "attempt_time")`);
        await queryRunner.query(`CREATE INDEX "IDX_supplier_login_attempts_profile" ON "supplier_login_attempts" ("supplier_profile_id", "attempt_time")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_supplier_login_attempts_profile"`);
        await queryRunner.query(`DROP INDEX "IDX_supplier_login_attempts_email"`);
        await queryRunner.query(`DROP INDEX "IDX_supplier_sessions_active"`);
        await queryRunner.query(`DROP INDEX "IDX_supplier_sessions_token"`);
        await queryRunner.query(`DROP INDEX "IDX_supplier_documents_type"`);
        await queryRunner.query(`DROP INDEX "IDX_supplier_documents_supplier"`);
        await queryRunner.query(`DROP INDEX "IDX_supplier_onboarding_status"`);
        await queryRunner.query(`DROP INDEX "IDX_supplier_profiles_status"`);
        await queryRunner.query(`DROP INDEX "IDX_supplier_profiles_company"`);
        await queryRunner.query(`DROP INDEX "IDX_supplier_profiles_user"`);

        // Drop foreign keys and tables
        await queryRunner.query(`ALTER TABLE "supplier_login_attempts" DROP CONSTRAINT "FK_supplier_login_attempts_profile"`);
        await queryRunner.query(`DROP TABLE "supplier_login_attempts"`);

        await queryRunner.query(`ALTER TABLE "supplier_sessions" DROP CONSTRAINT "FK_supplier_sessions_profile"`);
        await queryRunner.query(`DROP TABLE "supplier_sessions"`);

        await queryRunner.query(`ALTER TABLE "supplier_device_bindings" DROP CONSTRAINT "FK_supplier_device_bindings_profile"`);
        await queryRunner.query(`DROP TABLE "supplier_device_bindings"`);

        await queryRunner.query(`ALTER TABLE "supplier_documents" DROP CONSTRAINT "FK_supplier_documents_reviewed_by"`);
        await queryRunner.query(`ALTER TABLE "supplier_documents" DROP CONSTRAINT "FK_supplier_documents_supplier"`);
        await queryRunner.query(`DROP TABLE "supplier_documents"`);

        await queryRunner.query(`ALTER TABLE "supplier_onboarding" DROP CONSTRAINT "FK_supplier_onboarding_reviewed_by"`);
        await queryRunner.query(`ALTER TABLE "supplier_onboarding" DROP CONSTRAINT "FK_supplier_onboarding_supplier"`);
        await queryRunner.query(`DROP TABLE "supplier_onboarding"`);

        await queryRunner.query(`ALTER TABLE "supplier_profiles" DROP CONSTRAINT "FK_supplier_profiles_company"`);
        await queryRunner.query(`ALTER TABLE "supplier_profiles" DROP CONSTRAINT "FK_supplier_profiles_user"`);
        await queryRunner.query(`DROP TABLE "supplier_profiles"`);

        await queryRunner.query(`DROP TABLE "supplier_companies"`);

        // Drop enums
        await queryRunner.query(`DROP TYPE "supplier_login_failure_reason_enum"`);
        await queryRunner.query(`DROP TYPE "supplier_session_invalidation_reason_enum"`);
        await queryRunner.query(`DROP TYPE "supplier_document_validation_status_enum"`);
        await queryRunner.query(`DROP TYPE "supplier_document_type_enum"`);
        await queryRunner.query(`DROP TYPE "supplier_onboarding_status_enum"`);
        await queryRunner.query(`DROP TYPE "supplier_account_status_enum"`);
    }
}
