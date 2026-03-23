import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillJcNumberFromReference1807000000067 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE job_cards
      SET jc_number = UPPER(
        COALESCE(
          (regexp_match(source_file_name, '^(JC\d+)', 'i'))[1],
          (regexp_match(reference, '^(JC\d+)', 'i'))[1]
        )
      )
      WHERE (jc_number IS NULL OR jc_number = jt_dn_number)
        AND (
          source_file_name ~* '^JC\d+'
          OR reference ~* '^JC\d+'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE job_cards
      SET jc_number = NULL
      WHERE jc_number ~* '^JC\d+'
    `);
  }
}
