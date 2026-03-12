import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateComplySaSageConnectionsTable1807000000016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "comply_sa_sage_connections" (
        "id" SERIAL PRIMARY KEY,
        "company_id" integer NOT NULL,
        "access_token_encrypted" text NOT NULL,
        "refresh_token_encrypted" text NOT NULL,
        "token_expires_at" timestamp NOT NULL,
        "sage_resource_owner_id" varchar(255),
        "last_sync_at" timestamp,
        "connected_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_comply_sa_sage_connections_company_id" UNIQUE ("company_id"),
        CONSTRAINT "FK_comply_sa_sage_connections_company" FOREIGN KEY ("company_id")
          REFERENCES "comply_sa_companies"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "comply_sa_sage_connections"`);
  }
}
