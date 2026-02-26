import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncUsersAcrossEnvironments1799100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const users = [
      {
        email: "admin@annix.co.za",
        username: "System Administrator",
        password: null as string | null,
        salt: null as string | null,
      },
      {
        email: "nick.barrett36@me.com",
        username: "nick.barrett36@me.com",
        password: null as string | null,
        salt: null as string | null,
      },
      {
        email: "andy@auind.co.za",
        username: "andy@auind.co.za",
        password: null as string | null,
        salt: null as string | null,
      },
      {
        email: "nick.barrett36@ngx-ramblers.org.uk",
        username: "nick.barrett36@ngx-ramblers.org.uk",
        password: "$2b$10$yzqark.c0bGQPIIhm0XCbOr0y30YLDKbjuhZ5N8MmHRODKFvsLdui",
        salt: "$2b$10$yzqark.c0bGQPIIhm0XCbO",
      },
      {
        email: "charlesh@miningpressure.co.za",
        username: "charlesh@miningpressure.co.za",
        password: "$2b$10$bxpnEbD57rZpQGLdjf7Cmem188lRL13ZUROZ9GfN8j9M5Dl0pVA5i",
        salt: "$2b$10$bxpnEbD57rZpQGLdjf7Cme",
      },
      {
        email: "mike.lecki@gmail.com",
        username: "mike.lecki@gmail.com",
        password: "$2b$10$weLG1Ti5zzgLqLE2XiuiLex./1i1oTDm5HHvB8tD35p/xmaTXiW0a",
        salt: "$2b$10$weLG1Ti5zzgLqLE2XiuiLe",
      },
      {
        email: "heine@miningpressure.co.za",
        username: "heine@miningpressure.co.za",
        password: "$2b$10$jMGkS6asAbkxMG3Jc0gJoexMpc5K3mqsXnSXD.etOps3691zOBIZa",
        salt: "$2b$10$jMGkS6asAbkxMG3Jc0gJoe",
      },
    ];

    const customerRole = await queryRunner.query(
      `SELECT id FROM user_role WHERE name = 'customer'`,
    );
    const customerRoleId = customerRole.length > 0 ? customerRole[0].id : null;

    for (const user of users) {
      const existing = await queryRunner.query(`SELECT id FROM "user" WHERE email = $1`, [
        user.email,
      ]);

      if (existing.length === 0 && user.password !== null) {
        const result = await queryRunner.query(
          `INSERT INTO "user" (username, email, password, salt, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())
           RETURNING id`,
          [user.username, user.email, user.password, user.salt],
        );

        const newUserId = result[0].id;

        if (customerRoleId !== null) {
          await queryRunner.query(
            `INSERT INTO user_roles_user_role ("userId", "userRoleId")
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [newUserId, customerRoleId],
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const emailsToRemove = [
      "nick.barrett36@ngx-ramblers.org.uk",
      "charlesh@miningpressure.co.za",
      "mike.lecki@gmail.com",
      "heine@miningpressure.co.za",
    ];

    for (const email of emailsToRemove) {
      const user = await queryRunner.query(`SELECT id FROM "user" WHERE email = $1`, [email]);
      if (user.length > 0) {
        await queryRunner.query(`DELETE FROM user_roles_user_role WHERE "userId" = $1`, [
          user[0].id,
        ]);
        await queryRunner.query(`DELETE FROM "user" WHERE id = $1`, [user[0].id]);
      }
    }
  }
}
