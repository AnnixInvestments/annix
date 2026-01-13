import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddReminderFieldsToBoqSupplierAccess1767850000000 implements MigrationInterface {
  name = 'AddReminderFieldsToBoqSupplierAccess1767850000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'boq_supplier_access',
      new TableColumn({
        name: 'reminder_days',
        type: 'int',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'boq_supplier_access',
      new TableColumn({
        name: 'reminder_sent',
        type: 'boolean',
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('boq_supplier_access', 'reminder_sent');
    await queryRunner.dropColumn('boq_supplier_access', 'reminder_days');
  }
}
