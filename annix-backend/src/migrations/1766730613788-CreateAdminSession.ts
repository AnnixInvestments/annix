import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAdminSession1766730613788 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE admin_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                session_token VARCHAR(255) UNIQUE NOT NULL,
                client_ip VARCHAR(45) NOT NULL,
                user_agent TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                is_revoked BOOLEAN DEFAULT FALSE,
                revoked_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_admin_session_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
            )
        `);

        // Create indexes for performance
        await queryRunner.query(`
            CREATE INDEX idx_admin_session_token ON admin_sessions(session_token)
        `);

        await queryRunner.query(`
            CREATE INDEX idx_admin_session_user_id ON admin_sessions(user_id)
        `);

        await queryRunner.query(`
            CREATE INDEX idx_admin_session_expires_at ON admin_sessions(expires_at)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes first
        await queryRunner.query(`DROP INDEX IF EXISTS idx_admin_session_expires_at`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_admin_session_user_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_admin_session_token`);

        // Drop table
        await queryRunner.query(`DROP TABLE IF EXISTS admin_sessions`);
    }

}
