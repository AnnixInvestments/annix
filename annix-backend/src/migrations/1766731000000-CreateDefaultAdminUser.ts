import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class CreateDefaultAdminUser1766731000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create default admin user
    // Email: admin@annix.co.za
    // Password: REDACTED_SECRET

    const password = 'REDACTED_SECRET';
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    await queryRunner.query(`
      INSERT INTO "user" (email, username, password, salt)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['admin@annix.co.za', 'System Administrator', hashedPassword, salt]);

    // Get the user ID
    const result = await queryRunner.query(`
      SELECT id FROM "user" WHERE email = $1
    `, ['admin@annix.co.za']);

    if (result && result.length > 0) {
      const userId = result[0].id;

      // Get or create 'admin' role
      const roleResult = await queryRunner.query(`
        SELECT id FROM user_role WHERE name = 'admin'
      `);

      let adminRoleId;
      if (roleResult && roleResult.length > 0) {
        adminRoleId = roleResult[0].id;
      } else {
        // Create admin role if it doesn't exist
        const newRoleResult = await queryRunner.query(`
          INSERT INTO user_role (name) VALUES ('admin') RETURNING id
        `);
        adminRoleId = newRoleResult[0].id;
      }

      // Assign admin role to user
      await queryRunner.query(`
        INSERT INTO user_roles_user_role ("userId", "userRoleId")
        VALUES ($1, $2)
      `, [userId, adminRoleId]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove default admin user
    await queryRunner.query(`
      DELETE FROM "user" WHERE email = 'admin@annix.co.za'
    `);
  }
}
