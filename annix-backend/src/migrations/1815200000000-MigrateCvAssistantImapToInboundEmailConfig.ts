import * as crypto from "node:crypto";
import type { MigrationInterface, QueryRunner } from "typeorm";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

const encryptPassword = (plaintext: string, keyHex: string): Buffer => {
  const key = Buffer.from(keyHex, "hex");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
};

export class MigrateCvAssistantImapToInboundEmailConfig1815200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: Array<{
      id: number;
      imap_host: string | null;
      imap_port: number | null;
      imap_user: string | null;
      imap_password_encrypted: string | null;
      monitoring_enabled: boolean | null;
    }> = await queryRunner.query(
      `SELECT id, imap_host, imap_port, imap_user, imap_password_encrypted, monitoring_enabled
       FROM cv_assistant_companies
       WHERE imap_host IS NOT NULL`,
    );

    const key = process.env.DOCUMENT_ENCRYPTION_KEY ?? null;

    await Promise.all(
      rows.map(async (row) => {
        const existing: Array<{ id: number }> = await queryRunner.query(
          "SELECT id FROM inbound_email_configs WHERE app = $1 AND company_id = $2",
          ["cv-assistant", row.id],
        );

        if (existing.length > 0) {
          return;
        }

        const passPlaintext = row.imap_password_encrypted ?? "";
        const encryptedBuffer =
          passPlaintext && key ? encryptPassword(passPlaintext, key) : Buffer.alloc(0);

        await queryRunner.query(
          `INSERT INTO inbound_email_configs
           (app, company_id, email_host, email_port, email_user, email_pass_encrypted,
            tls_enabled, tls_server_name, enabled, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE, NULL, $7, NOW(), NOW())`,
          [
            "cv-assistant",
            row.id,
            row.imap_host,
            row.imap_port ?? 993,
            row.imap_user ?? "",
            encryptedBuffer,
            row.monitoring_enabled === true,
          ],
        );
      }),
    );

    await queryRunner.query("ALTER TABLE cv_assistant_companies DROP COLUMN IF EXISTS imap_host");
    await queryRunner.query("ALTER TABLE cv_assistant_companies DROP COLUMN IF EXISTS imap_port");
    await queryRunner.query("ALTER TABLE cv_assistant_companies DROP COLUMN IF EXISTS imap_user");
    await queryRunner.query(
      "ALTER TABLE cv_assistant_companies DROP COLUMN IF EXISTS imap_password_encrypted",
    );
    await queryRunner.query(
      "ALTER TABLE cv_assistant_companies DROP COLUMN IF EXISTS monitoring_enabled",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE cv_assistant_companies ADD COLUMN IF NOT EXISTS imap_host VARCHAR(255)",
    );
    await queryRunner.query(
      "ALTER TABLE cv_assistant_companies ADD COLUMN IF NOT EXISTS imap_port INT",
    );
    await queryRunner.query(
      "ALTER TABLE cv_assistant_companies ADD COLUMN IF NOT EXISTS imap_user VARCHAR(255)",
    );
    await queryRunner.query(
      "ALTER TABLE cv_assistant_companies ADD COLUMN IF NOT EXISTS imap_password_encrypted VARCHAR(500)",
    );
    await queryRunner.query(
      "ALTER TABLE cv_assistant_companies ADD COLUMN IF NOT EXISTS monitoring_enabled BOOLEAN NOT NULL DEFAULT FALSE",
    );

    await queryRunner.query(`DELETE FROM inbound_email_configs WHERE app = 'cv-assistant'`);
  }
}
