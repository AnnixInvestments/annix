import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAdminSessionTable1766737000000 implements MigrationInterface {
  name = 'CreateAdminSessionTable1766737000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create admin_sessions table
    await queryRunner.createTable(
      new Table({
        name: 'admin_sessions',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'userId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'sessionToken',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'clientIp',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'isRevoked',
            type: 'boolean',
            default: false,
          },
          {
            name: 'revokedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'lastActiveAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'admin_sessions',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'CASCADE',
        name: 'fk_admin_session_user',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'admin_sessions',
      new TableIndex({
        name: 'idx_admin_session_token',
        columnNames: ['sessionToken'],
      }),
    );

    await queryRunner.createIndex(
      'admin_sessions',
      new TableIndex({
        name: 'idx_admin_session_user_id',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'admin_sessions',
      new TableIndex({
        name: 'idx_admin_session_expires_at',
        columnNames: ['expiresAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('admin_sessions');
  }
}
