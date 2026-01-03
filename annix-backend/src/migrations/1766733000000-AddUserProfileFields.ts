import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserProfileFields1766733000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add firstName column
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'firstName',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Add lastName column
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'lastName',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Add status column
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'status',
        type: 'varchar',
        isNullable: true,
        default: "'active'",
      }),
    );

    // Add lastLoginAt column
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'lastLoginAt',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user', 'lastLoginAt');
    await queryRunner.dropColumn('user', 'status');
    await queryRunner.dropColumn('user', 'lastName');
    await queryRunner.dropColumn('user', 'firstName');
  }
}
