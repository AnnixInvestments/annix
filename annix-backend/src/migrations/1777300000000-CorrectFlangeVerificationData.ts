import { MigrationInterface, QueryRunner } from 'typeorm';

export class CorrectFlangeVerificationData1777300000000 implements MigrationInterface {
  name = 'CorrectFlangeVerificationData1777300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      'Correcting flange verification data with proper join queries...',
    );

    await queryRunner.query(
      `DELETE FROM data_verification_logs WHERE category = 'Flanges'`,
    );

    const verificationChecks = [
      {
        category: 'Flanges',
        standard: 'BS 4504',
        checkType: 'PN6 Coverage',
        expectedMin: 15,
        standardCode: 'BS 4504',
        pressurePattern: '6/%',
      },
      {
        category: 'Flanges',
        standard: 'BS 4504',
        checkType: 'PN10 Coverage',
        expectedMin: 15,
        standardCode: 'BS 4504',
        pressurePattern: '10/%',
      },
      {
        category: 'Flanges',
        standard: 'BS 4504',
        checkType: 'PN16 Coverage',
        expectedMin: 15,
        standardCode: 'BS 4504',
        pressurePattern: '16/%',
      },
      {
        category: 'Flanges',
        standard: 'BS 4504',
        checkType: 'PN25 Coverage',
        expectedMin: 15,
        standardCode: 'BS 4504',
        pressurePattern: '25/%',
      },
      {
        category: 'Flanges',
        standard: 'BS 4504',
        checkType: 'PN40 Coverage',
        expectedMin: 15,
        standardCode: 'BS 4504',
        pressurePattern: '40/%',
      },
      {
        category: 'Flanges',
        standard: 'SABS 1123',
        checkType: 'T1000 Coverage',
        expectedMin: 15,
        standardCode: 'SABS 1123',
        pressurePattern: '1000/%',
      },
      {
        category: 'Flanges',
        standard: 'SABS 1123',
        checkType: 'T1600 Coverage',
        expectedMin: 15,
        standardCode: 'SABS 1123',
        pressurePattern: '1600/%',
      },
      {
        category: 'Flanges',
        standard: 'SABS 1123',
        checkType: 'T2500 Coverage',
        expectedMin: 15,
        standardCode: 'SABS 1123',
        pressurePattern: '2500/%',
      },
      {
        category: 'Flanges',
        standard: 'SABS 1123',
        checkType: 'T4000 Coverage',
        expectedMin: 15,
        standardCode: 'SABS 1123',
        pressurePattern: '4000/%',
      },
      {
        category: 'Flanges',
        standard: 'BS 10',
        checkType: 'Table D Coverage',
        expectedMin: 10,
        standardCode: 'BS 10',
        pressurePattern: 'T/D',
      },
      {
        category: 'Flanges',
        standard: 'BS 10',
        checkType: 'Table E Coverage',
        expectedMin: 10,
        standardCode: 'BS 10',
        pressurePattern: 'T/E',
      },
      {
        category: 'Flanges',
        standard: 'BS 10',
        checkType: 'Table F Coverage',
        expectedMin: 10,
        standardCode: 'BS 10',
        pressurePattern: 'T/F',
      },
      {
        category: 'Flanges',
        standard: 'ASME B16.5',
        checkType: 'Class 150 Coverage',
        expectedMin: 20,
        standardCode: 'ASME B16.5',
        pressurePattern: '150%',
      },
      {
        category: 'Flanges',
        standard: 'ASME B16.5',
        checkType: 'Class 300 Coverage',
        expectedMin: 20,
        standardCode: 'ASME B16.5',
        pressurePattern: '300%',
      },
      {
        category: 'Flanges',
        standard: 'ASME B16.5',
        checkType: 'Class 600 Coverage',
        expectedMin: 15,
        standardCode: 'ASME B16.5',
        pressurePattern: '600%',
      },
      {
        category: 'Flanges',
        standard: 'ASME B16.5',
        checkType: 'Class 900 Coverage',
        expectedMin: 10,
        standardCode: 'ASME B16.5',
        pressurePattern: '900%',
      },
      {
        category: 'Flanges',
        standard: 'ASME B16.5',
        checkType: 'Class 1500 Coverage',
        expectedMin: 10,
        standardCode: 'ASME B16.5',
        pressurePattern: '1500%',
      },
      {
        category: 'Flanges',
        standard: 'ASME B16.5',
        checkType: 'Class 2500 Coverage',
        expectedMin: 8,
        standardCode: 'ASME B16.5',
        pressurePattern: '2500%',
      },
    ];

    for (const check of verificationChecks) {
      const query = `
        SELECT COUNT(*) as count
        FROM flange_dimensions fd
        JOIN flange_standards fs ON fd."standardId" = fs.id
        JOIN flange_pressure_classes fpc ON fd."pressureClassId" = fpc.id
        WHERE fs.code = '${check.standardCode}' AND fpc.designation LIKE '${check.pressurePattern}'
      `;

      const result = await queryRunner.query(query);
      const actualCount = parseInt(result[0]?.count || '0', 10);
      const status = actualCount >= check.expectedMin ? 'PASS' : 'REVIEW';
      const details = `Found ${actualCount} records, expected minimum ${check.expectedMin}`;

      await queryRunner.query(`
        INSERT INTO data_verification_logs
          (category, standard, check_type, expected_count, actual_count, status, details, reference_source)
        VALUES
          ('${check.category}', '${check.standard}', '${check.checkType}', ${check.expectedMin}, ${actualCount}, '${status}', '${details}', 'MPS Technical Manual')
      `);
    }

    const summaryResult = await queryRunner.query(`
      SELECT status, COUNT(*) as count FROM data_verification_logs WHERE category = 'Flanges' GROUP BY status
    `);
    console.warn('Corrected flange verification summary:', summaryResult);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM data_verification_logs WHERE category = 'Flanges'`,
    );
  }
}
