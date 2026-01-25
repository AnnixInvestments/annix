import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRemoteAccessRequestsTable1770400000000 implements MigrationInterface {
  name = 'CreateRemoteAccessRequestsTable1770400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."remote_access_request_type_enum" AS ENUM('VIEW', 'EDIT')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."remote_access_document_type_enum" AS ENUM('RFQ', 'BOQ')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."remote_access_status_enum" AS ENUM('PENDING', 'APPROVED', 'DENIED', 'EXPIRED')
    `);

    await queryRunner.query(`
      CREATE TABLE "remote_access_requests" (
        "id" SERIAL NOT NULL,
        "request_type" "public"."remote_access_request_type_enum" NOT NULL,
        "document_type" "public"."remote_access_document_type_enum" NOT NULL,
        "document_id" integer NOT NULL,
        "requested_by_id" integer NOT NULL,
        "document_owner_id" integer NOT NULL,
        "status" "public"."remote_access_status_enum" NOT NULL DEFAULT 'PENDING',
        "requested_at" TIMESTAMP NOT NULL DEFAULT now(),
        "responded_at" TIMESTAMP,
        "expires_at" TIMESTAMP NOT NULL,
        "message" text,
        "denial_reason" text,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_remote_access_requests" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_remote_access_document" ON "remote_access_requests" ("document_type", "document_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_remote_access_status" ON "remote_access_requests" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_remote_access_expires" ON "remote_access_requests" ("expires_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "remote_access_requests"
      ADD CONSTRAINT "FK_remote_access_requested_by"
      FOREIGN KEY ("requested_by_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "remote_access_requests"
      ADD CONSTRAINT "FK_remote_access_document_owner"
      FOREIGN KEY ("document_owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "remote_access_requests" DROP CONSTRAINT "FK_remote_access_document_owner"
    `);

    await queryRunner.query(`
      ALTER TABLE "remote_access_requests" DROP CONSTRAINT "FK_remote_access_requested_by"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_remote_access_expires"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_remote_access_status"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_remote_access_document"
    `);

    await queryRunner.query(`
      DROP TABLE "remote_access_requests"
    `);

    await queryRunner.query(`
      DROP TYPE "public"."remote_access_status_enum"
    `);

    await queryRunner.query(`
      DROP TYPE "public"."remote_access_document_type_enum"
    `);

    await queryRunner.query(`
      DROP TYPE "public"."remote_access_request_type_enum"
    `);
  }
}
