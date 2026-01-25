import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriority1FittingData1776900000000 implements MigrationInterface {
  name = 'AddPriority1FittingData1776900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding Priority 1 fitting data from MPS manual...');

    await this.populateAnsiB169Tees(queryRunner);
    await this.populateForgedFittingMissingTypes(queryRunner);
    await this.populateAnsiB169XsElbows(queryRunner);

    console.warn('Priority 1 fitting data migration complete.');
  }

  private async populateAnsiB169Tees(queryRunner: QueryRunner): Promise<void> {
    console.warn('Populating ANSI B16.9 tee data...');

    const straightTeeResult = await queryRunner.query(
      `SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'TEE_STRAIGHT'`,
    );
    const straightTeeId = straightTeeResult[0]?.id;

    const reducingTeeResult = await queryRunner.query(
      `SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'TEE_REDUCING'`,
    );
    const reducingTeeId = reducingTeeResult[0]?.id;

    if (!straightTeeId || !reducingTeeId) {
      console.warn('Tee fitting types not found, skipping tee data');
      return;
    }

    const teeData = [
      {
        runNps: '1/2',
        runOdMm: 21.3,
        branchNps: '1/2',
        branchOdMm: 21.3,
        cMm: 25.4,
        mMm: 25.4,
        stdWallMm: 2.8,
        xsWallMm: 3.7,
        stdWeightKg: 0.072,
        xsWeightKg: 0.093,
      },
      {
        runNps: '1/2',
        runOdMm: 21.3,
        branchNps: '3/8',
        branchOdMm: 17.1,
        cMm: 25.4,
        mMm: 25.4,
        stdWallMm: 2.3,
        xsWallMm: 3.2,
        stdWeightKg: 0.051,
        xsWeightKg: 0.058,
      },
      {
        runNps: '3/4',
        runOdMm: 26.7,
        branchNps: '3/4',
        branchOdMm: 26.7,
        cMm: 28.58,
        mMm: 28.58,
        stdWallMm: 2.9,
        xsWallMm: 3.9,
        stdWeightKg: 0.093,
        xsWeightKg: 0.123,
      },
      {
        runNps: '3/4',
        runOdMm: 26.7,
        branchNps: '1/2',
        branchOdMm: 21.3,
        cMm: 28.58,
        mMm: 28.58,
        stdWallMm: 2.8,
        xsWallMm: 3.7,
        stdWeightKg: 0.103,
        xsWeightKg: 0.103,
      },
      {
        runNps: '1',
        runOdMm: 33.4,
        branchNps: '1',
        branchOdMm: 33.4,
        cMm: 38.1,
        mMm: 38.1,
        stdWallMm: 3.4,
        xsWallMm: 4.5,
        stdWeightKg: 0.13,
        xsWeightKg: 0.161,
      },
      {
        runNps: '1',
        runOdMm: 33.4,
        branchNps: '3/4',
        branchOdMm: 26.7,
        cMm: 38.1,
        mMm: 38.1,
        stdWallMm: 2.9,
        xsWallMm: 3.9,
        stdWeightKg: 0.119,
        xsWeightKg: 0.15,
      },
      {
        runNps: '1',
        runOdMm: 33.4,
        branchNps: '1/2',
        branchOdMm: 21.3,
        cMm: 38.1,
        mMm: 38.1,
        stdWallMm: 2.8,
        xsWallMm: 3.7,
        stdWeightKg: 0.117,
        xsWeightKg: 0.151,
      },
      {
        runNps: '1-1/4',
        runOdMm: 42.2,
        branchNps: '1-1/4',
        branchOdMm: 42.2,
        cMm: 47.62,
        mMm: 47.62,
        stdWallMm: 3.6,
        xsWallMm: 4.9,
        stdWeightKg: 0.239,
        xsWeightKg: 0.296,
      },
      {
        runNps: '1-1/4',
        runOdMm: 42.2,
        branchNps: '1',
        branchOdMm: 33.4,
        cMm: 47.62,
        mMm: 47.62,
        stdWallMm: 3.4,
        xsWallMm: 4.5,
        stdWeightKg: 0.22,
        xsWeightKg: 0.274,
      },
      {
        runNps: '1-1/4',
        runOdMm: 42.2,
        branchNps: '3/4',
        branchOdMm: 26.7,
        cMm: 47.62,
        mMm: 47.62,
        stdWallMm: 2.9,
        xsWallMm: 3.9,
        stdWeightKg: 0.216,
        xsWeightKg: 0.268,
      },
      {
        runNps: '1-1/4',
        runOdMm: 42.2,
        branchNps: '1/2',
        branchOdMm: 21.3,
        cMm: 47.62,
        mMm: 47.62,
        stdWallMm: 2.8,
        xsWallMm: 3.7,
        stdWeightKg: 0.212,
        xsWeightKg: 0.261,
      },
      {
        runNps: '1-1/2',
        runOdMm: 48.3,
        branchNps: '1-1/2',
        branchOdMm: 48.3,
        cMm: 57.15,
        mMm: 57.15,
        stdWallMm: 3.7,
        xsWallMm: 5.1,
        stdWeightKg: 0.35,
        xsWeightKg: 0.437,
      },
      {
        runNps: '1-1/2',
        runOdMm: 48.3,
        branchNps: '1-1/4',
        branchOdMm: 42.2,
        cMm: 57.15,
        mMm: 57.15,
        stdWallMm: 3.6,
        xsWallMm: 4.9,
        stdWeightKg: 0.323,
        xsWeightKg: 0.412,
      },
      {
        runNps: '1-1/2',
        runOdMm: 48.3,
        branchNps: '1',
        branchOdMm: 33.4,
        cMm: 57.15,
        mMm: 57.15,
        stdWallMm: 3.4,
        xsWallMm: 4.5,
        stdWeightKg: 0.319,
        xsWeightKg: 0.397,
      },
      {
        runNps: '1-1/2',
        runOdMm: 48.3,
        branchNps: '3/4',
        branchOdMm: 26.7,
        cMm: 57.15,
        mMm: 57.15,
        stdWallMm: 2.9,
        xsWallMm: 3.9,
        stdWeightKg: 0.313,
        xsWeightKg: 0.397,
      },
      {
        runNps: '1-1/2',
        runOdMm: 48.3,
        branchNps: '1/2',
        branchOdMm: 21.3,
        cMm: 57.15,
        mMm: 57.15,
        stdWallMm: 2.8,
        xsWallMm: 3.7,
        stdWeightKg: 0.307,
        xsWeightKg: 0.383,
      },
      {
        runNps: '2',
        runOdMm: 60.3,
        branchNps: '2',
        branchOdMm: 60.3,
        cMm: 63.5,
        mMm: 63.5,
        stdWallMm: 3.9,
        xsWallMm: 5.5,
        stdWeightKg: 0.858,
        xsWeightKg: 0.849,
      },
      {
        runNps: '2',
        runOdMm: 60.3,
        branchNps: '1-1/2',
        branchOdMm: 48.3,
        cMm: 63.5,
        mMm: 60.32,
        stdWallMm: 3.7,
        xsWallMm: 5.1,
        stdWeightKg: 0.858,
        xsWeightKg: 0.849,
      },
      {
        runNps: '2',
        runOdMm: 60.3,
        branchNps: '1-1/4',
        branchOdMm: 42.2,
        cMm: 63.5,
        mMm: 57.15,
        stdWallMm: 3.6,
        xsWallMm: 4.9,
        stdWeightKg: 0.858,
        xsWeightKg: 0.849,
      },
      {
        runNps: '2',
        runOdMm: 60.3,
        branchNps: '1',
        branchOdMm: 33.4,
        cMm: 63.5,
        mMm: 50.8,
        stdWallMm: 3.4,
        xsWallMm: 4.5,
        stdWeightKg: 0.858,
        xsWeightKg: 0.849,
      },
      {
        runNps: '2',
        runOdMm: 60.3,
        branchNps: '3/4',
        branchOdMm: 26.7,
        cMm: 63.5,
        mMm: 44.45,
        stdWallMm: 2.9,
        xsWallMm: 3.9,
        stdWeightKg: 0.858,
        xsWeightKg: 0.849,
      },
      {
        runNps: '2-1/2',
        runOdMm: 73.0,
        branchNps: '2-1/2',
        branchOdMm: 73.0,
        cMm: 76.2,
        mMm: 76.2,
        stdWallMm: 5.2,
        xsWallMm: 7.0,
        stdWeightKg: 1.216,
        xsWeightKg: 1.397,
      },
      {
        runNps: '2-1/2',
        runOdMm: 73.0,
        branchNps: '2',
        branchOdMm: 60.3,
        cMm: 76.2,
        mMm: 69.85,
        stdWallMm: 3.9,
        xsWallMm: 5.5,
        stdWeightKg: 1.216,
        xsWeightKg: 1.397,
      },
      {
        runNps: '2-1/2',
        runOdMm: 73.0,
        branchNps: '1-1/2',
        branchOdMm: 48.3,
        cMm: 76.2,
        mMm: 66.68,
        stdWallMm: 3.7,
        xsWallMm: 5.1,
        stdWeightKg: 1.397,
        xsWeightKg: 1.397,
      },
      {
        runNps: '2-1/2',
        runOdMm: 73.0,
        branchNps: '1-1/4',
        branchOdMm: 42.2,
        cMm: 76.2,
        mMm: 63.5,
        stdWallMm: 3.6,
        xsWallMm: 4.9,
        stdWeightKg: 1.397,
        xsWeightKg: 1.397,
      },
      {
        runNps: '2-1/2',
        runOdMm: 73.0,
        branchNps: '1',
        branchOdMm: 33.4,
        cMm: 76.2,
        mMm: 57.15,
        stdWallMm: 3.4,
        xsWallMm: 4.5,
        stdWeightKg: 1.397,
        xsWeightKg: 1.397,
      },
      {
        runNps: '3',
        runOdMm: 88.9,
        branchNps: '3',
        branchOdMm: 88.9,
        cMm: 85.72,
        mMm: 85.72,
        stdWallMm: 5.5,
        xsWallMm: 7.6,
        stdWeightKg: 1.733,
        xsWeightKg: 2.041,
      },
      {
        runNps: '3',
        runOdMm: 88.9,
        branchNps: '2-1/2',
        branchOdMm: 73.0,
        cMm: 85.72,
        mMm: 82.55,
        stdWallMm: 5.2,
        xsWallMm: 7.0,
        stdWeightKg: 1.733,
        xsWeightKg: 2.041,
      },
      {
        runNps: '3',
        runOdMm: 88.9,
        branchNps: '2',
        branchOdMm: 60.3,
        cMm: 85.72,
        mMm: 76.2,
        stdWallMm: 3.9,
        xsWallMm: 5.5,
        stdWeightKg: 1.733,
        xsWeightKg: 2.041,
      },
      {
        runNps: '3',
        runOdMm: 88.9,
        branchNps: '1-1/2',
        branchOdMm: 48.3,
        cMm: 85.72,
        mMm: 73.02,
        stdWallMm: 3.7,
        xsWallMm: 5.1,
        stdWeightKg: 1.733,
        xsWeightKg: 2.041,
      },
      {
        runNps: '3',
        runOdMm: 88.9,
        branchNps: '1-1/4',
        branchOdMm: 42.2,
        cMm: 85.72,
        mMm: 69.85,
        stdWallMm: 3.6,
        xsWallMm: 4.9,
        stdWeightKg: 1.733,
        xsWeightKg: 2.041,
      },
      {
        runNps: '3',
        runOdMm: 88.9,
        branchNps: '1',
        branchOdMm: 33.4,
        cMm: 85.72,
        mMm: 66.68,
        stdWallMm: 3.4,
        xsWallMm: 4.5,
        stdWeightKg: 1.733,
        xsWeightKg: 2.041,
      },
      {
        runNps: '3-1/2',
        runOdMm: 101.6,
        branchNps: '3-1/2',
        branchOdMm: 101.6,
        cMm: 95.25,
        mMm: 95.25,
        stdWallMm: 5.7,
        xsWallMm: 8.1,
        stdWeightKg: 2.345,
        xsWeightKg: 2.799,
      },
      {
        runNps: '3-1/2',
        runOdMm: 101.6,
        branchNps: '3',
        branchOdMm: 88.9,
        cMm: 95.25,
        mMm: 92.08,
        stdWallMm: 5.5,
        xsWallMm: 7.6,
        stdWeightKg: 2.345,
        xsWeightKg: 2.799,
      },
      {
        runNps: '3-1/2',
        runOdMm: 101.6,
        branchNps: '2-1/2',
        branchOdMm: 73.0,
        cMm: 95.25,
        mMm: 88.9,
        stdWallMm: 5.2,
        xsWallMm: 7.0,
        stdWeightKg: 2.345,
        xsWeightKg: 2.799,
      },
      {
        runNps: '3-1/2',
        runOdMm: 101.6,
        branchNps: '2',
        branchOdMm: 60.3,
        cMm: 95.25,
        mMm: 82.55,
        stdWallMm: 3.9,
        xsWallMm: 5.5,
        stdWeightKg: 2.345,
        xsWeightKg: 2.799,
      },
      {
        runNps: '3-1/2',
        runOdMm: 101.6,
        branchNps: '1-1/2',
        branchOdMm: 48.3,
        cMm: 95.25,
        mMm: 79.38,
        stdWallMm: 3.7,
        xsWallMm: 5.1,
        stdWeightKg: 2.345,
        xsWeightKg: 2.799,
      },
      {
        runNps: '4',
        runOdMm: 114.3,
        branchNps: '4',
        branchOdMm: 114.3,
        cMm: 104.78,
        mMm: 104.78,
        stdWallMm: 6.0,
        xsWallMm: 8.6,
        stdWeightKg: 2.718,
        xsWeightKg: 3.829,
      },
      {
        runNps: '4',
        runOdMm: 114.3,
        branchNps: '3-1/2',
        branchOdMm: 101.6,
        cMm: 104.78,
        mMm: 101.6,
        stdWallMm: 5.7,
        xsWallMm: 8.1,
        stdWeightKg: 2.718,
        xsWeightKg: 3.829,
      },
      {
        runNps: '4',
        runOdMm: 114.3,
        branchNps: '3',
        branchOdMm: 88.9,
        cMm: 104.78,
        mMm: 98.42,
        stdWallMm: 5.5,
        xsWallMm: 7.6,
        stdWeightKg: 2.718,
        xsWeightKg: 3.829,
      },
      {
        runNps: '4',
        runOdMm: 114.3,
        branchNps: '2-1/2',
        branchOdMm: 73.0,
        cMm: 104.78,
        mMm: 95.25,
        stdWallMm: 5.2,
        xsWallMm: 7.0,
        stdWeightKg: 2.718,
        xsWeightKg: 3.829,
      },
      {
        runNps: '4',
        runOdMm: 114.3,
        branchNps: '2',
        branchOdMm: 60.3,
        cMm: 104.78,
        mMm: 88.9,
        stdWallMm: 3.9,
        xsWallMm: 5.5,
        stdWeightKg: 2.718,
        xsWeightKg: 3.806,
      },
      {
        runNps: '4',
        runOdMm: 114.3,
        branchNps: '1-1/2',
        branchOdMm: 48.3,
        cMm: 104.78,
        mMm: 85.72,
        stdWallMm: 3.7,
        xsWallMm: 5.1,
        stdWeightKg: 2.718,
        xsWeightKg: 3.806,
      },
      {
        runNps: '5',
        runOdMm: 141.3,
        branchNps: '5',
        branchOdMm: 141.3,
        cMm: 123.83,
        mMm: 123.83,
        stdWallMm: 6.6,
        xsWallMm: 9.5,
        stdWeightKg: 4.504,
        xsWeightKg: 5.851,
      },
      {
        runNps: '5',
        runOdMm: 141.3,
        branchNps: '4',
        branchOdMm: 114.3,
        cMm: 123.83,
        mMm: 117.48,
        stdWallMm: 6.0,
        xsWallMm: 8.6,
        stdWeightKg: 4.504,
        xsWeightKg: 5.851,
      },
      {
        runNps: '5',
        runOdMm: 141.3,
        branchNps: '3-1/2',
        branchOdMm: 101.6,
        cMm: 123.83,
        mMm: 114.3,
        stdWallMm: 5.7,
        xsWallMm: 8.1,
        stdWeightKg: 4.504,
        xsWeightKg: 5.851,
      },
      {
        runNps: '5',
        runOdMm: 141.3,
        branchNps: '3',
        branchOdMm: 88.9,
        cMm: 123.83,
        mMm: 111.13,
        stdWallMm: 5.5,
        xsWallMm: 7.6,
        stdWeightKg: 4.504,
        xsWeightKg: 5.851,
      },
      {
        runNps: '5',
        runOdMm: 141.3,
        branchNps: '2-1/2',
        branchOdMm: 73.0,
        cMm: 123.83,
        mMm: 107.95,
        stdWallMm: 5.2,
        xsWallMm: 7.0,
        stdWeightKg: 4.504,
        xsWeightKg: 5.851,
      },
      {
        runNps: '5',
        runOdMm: 141.3,
        branchNps: '2',
        branchOdMm: 60.3,
        cMm: 123.83,
        mMm: 104.78,
        stdWallMm: 3.9,
        xsWallMm: 5.5,
        stdWeightKg: 4.504,
        xsWeightKg: 5.851,
      },
      {
        runNps: '6',
        runOdMm: 168.3,
        branchNps: '6',
        branchOdMm: 168.3,
        cMm: 142.9,
        mMm: 142.9,
        stdWallMm: 7.1,
        xsWallMm: 11.0,
        stdWeightKg: 7.484,
        xsWeightKg: 8.754,
      },
      {
        runNps: '6',
        runOdMm: 168.3,
        branchNps: '5',
        branchOdMm: 141.3,
        cMm: 142.9,
        mMm: 136.5,
        stdWallMm: 6.6,
        xsWallMm: 9.5,
        stdWeightKg: 7.484,
        xsWeightKg: 8.754,
      },
      {
        runNps: '6',
        runOdMm: 168.3,
        branchNps: '4',
        branchOdMm: 114.3,
        cMm: 142.9,
        mMm: 130.2,
        stdWallMm: 6.0,
        xsWallMm: 8.6,
        stdWeightKg: 6.759,
        xsWeightKg: 8.754,
      },
      {
        runNps: '6',
        runOdMm: 168.3,
        branchNps: '3-1/2',
        branchOdMm: 101.6,
        cMm: 142.9,
        mMm: 127.0,
        stdWallMm: 5.7,
        xsWallMm: 8.1,
        stdWeightKg: 6.759,
        xsWeightKg: 8.754,
      },
      {
        runNps: '6',
        runOdMm: 168.3,
        branchNps: '3',
        branchOdMm: 88.9,
        cMm: 142.9,
        mMm: 123.83,
        stdWallMm: 5.5,
        xsWallMm: 7.6,
        stdWeightKg: 6.759,
        xsWeightKg: 8.754,
      },
      {
        runNps: '6',
        runOdMm: 168.3,
        branchNps: '2-1/2',
        branchOdMm: 73.0,
        cMm: 142.9,
        mMm: 120.65,
        stdWallMm: 5.2,
        xsWallMm: 7.0,
        stdWeightKg: 6.759,
        xsWeightKg: 8.754,
      },
      {
        runNps: '8',
        runOdMm: 219.1,
        branchNps: '8',
        branchOdMm: 219.1,
        cMm: 177.8,
        mMm: 177.8,
        stdWallMm: 8.2,
        xsWallMm: 12.7,
        stdWeightKg: 12.564,
        xsWeightKg: 15.649,
      },
      {
        runNps: '8',
        runOdMm: 219.1,
        branchNps: '6',
        branchOdMm: 168.3,
        cMm: 177.8,
        mMm: 168.3,
        stdWallMm: 7.1,
        xsWallMm: 11.0,
        stdWeightKg: 12.564,
        xsWeightKg: 15.649,
      },
      {
        runNps: '8',
        runOdMm: 219.1,
        branchNps: '5',
        branchOdMm: 141.3,
        cMm: 177.8,
        mMm: 161.9,
        stdWallMm: 6.6,
        xsWallMm: 9.5,
        stdWeightKg: 12.564,
        xsWeightKg: 15.649,
      },
      {
        runNps: '8',
        runOdMm: 219.1,
        branchNps: '4',
        branchOdMm: 114.3,
        cMm: 177.8,
        mMm: 155.6,
        stdWallMm: 6.0,
        xsWallMm: 8.6,
        stdWeightKg: 12.564,
        xsWeightKg: 15.649,
      },
      {
        runNps: '8',
        runOdMm: 219.1,
        branchNps: '3-1/2',
        branchOdMm: 101.6,
        cMm: 177.8,
        mMm: 152.4,
        stdWallMm: 5.7,
        xsWallMm: 8.1,
        stdWeightKg: 12.564,
        xsWeightKg: 15.649,
      },
      {
        runNps: '8',
        runOdMm: 219.1,
        branchNps: '3',
        branchOdMm: 88.9,
        cMm: 177.8,
        mMm: 152.4,
        stdWallMm: 5.5,
        xsWallMm: 7.6,
        stdWeightKg: 12.564,
        xsWeightKg: 15.649,
      },
      {
        runNps: '10',
        runOdMm: 273.0,
        branchNps: '10',
        branchOdMm: 273.0,
        cMm: 215.9,
        mMm: 215.9,
        stdWallMm: 9.3,
        xsWallMm: 12.7,
        stdWeightKg: 18.734,
        xsWeightKg: 26.535,
      },
      {
        runNps: '10',
        runOdMm: 273.0,
        branchNps: '8',
        branchOdMm: 219.1,
        cMm: 215.9,
        mMm: 203.2,
        stdWallMm: 8.2,
        xsWallMm: 12.7,
        stdWeightKg: 18.098,
        xsWeightKg: 23.859,
      },
      {
        runNps: '10',
        runOdMm: 273.0,
        branchNps: '6',
        branchOdMm: 168.3,
        cMm: 215.9,
        mMm: 193.7,
        stdWallMm: 7.1,
        xsWallMm: 11.0,
        stdWeightKg: 18.098,
        xsWeightKg: 23.859,
      },
      {
        runNps: '10',
        runOdMm: 273.0,
        branchNps: '5',
        branchOdMm: 141.3,
        cMm: 215.9,
        mMm: 190.5,
        stdWallMm: 6.6,
        xsWallMm: 9.5,
        stdWeightKg: 18.098,
        xsWeightKg: 23.859,
      },
      {
        runNps: '10',
        runOdMm: 273.0,
        branchNps: '4',
        branchOdMm: 114.3,
        cMm: 215.9,
        mMm: 184.2,
        stdWallMm: 6.0,
        xsWallMm: 8.6,
        stdWeightKg: 18.098,
        xsWeightKg: 23.859,
      },
      {
        runNps: '12',
        runOdMm: 323.9,
        branchNps: '12',
        branchOdMm: 323.9,
        cMm: 254.0,
        mMm: 254.0,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 30.253,
        xsWeightKg: 38.465,
      },
      {
        runNps: '12',
        runOdMm: 323.9,
        branchNps: '10',
        branchOdMm: 273.0,
        cMm: 254.0,
        mMm: 241.3,
        stdWallMm: 9.3,
        xsWallMm: 12.7,
        stdWeightKg: 30.253,
        xsWeightKg: 38.465,
      },
      {
        runNps: '12',
        runOdMm: 323.9,
        branchNps: '8',
        branchOdMm: 219.1,
        cMm: 254.0,
        mMm: 228.6,
        stdWallMm: 8.2,
        xsWallMm: 12.7,
        stdWeightKg: 29.438,
        xsWeightKg: 37.013,
      },
      {
        runNps: '12',
        runOdMm: 323.9,
        branchNps: '6',
        branchOdMm: 168.3,
        cMm: 254.0,
        mMm: 219.1,
        stdWallMm: 7.1,
        xsWallMm: 11.0,
        stdWeightKg: 29.438,
        xsWeightKg: 37.013,
      },
      {
        runNps: '12',
        runOdMm: 323.9,
        branchNps: '5',
        branchOdMm: 141.3,
        cMm: 254.0,
        mMm: 215.9,
        stdWallMm: 6.6,
        xsWallMm: 9.5,
        stdWeightKg: 29.438,
        xsWeightKg: 37.013,
      },
      {
        runNps: '14',
        runOdMm: 355.6,
        branchNps: '14',
        branchOdMm: 355.6,
        cMm: 279.4,
        mMm: 279.4,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 46.266,
        xsWeightKg: 57.606,
      },
      {
        runNps: '14',
        runOdMm: 355.6,
        branchNps: '12',
        branchOdMm: 323.9,
        cMm: 279.4,
        mMm: 269.9,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 46.266,
        xsWeightKg: 57.606,
      },
      {
        runNps: '14',
        runOdMm: 355.6,
        branchNps: '10',
        branchOdMm: 273.0,
        cMm: 279.4,
        mMm: 257.2,
        stdWallMm: 9.3,
        xsWallMm: 12.7,
        stdWeightKg: 44.633,
        xsWeightKg: 55.337,
      },
      {
        runNps: '14',
        runOdMm: 355.6,
        branchNps: '8',
        branchOdMm: 219.1,
        cMm: 279.4,
        mMm: 247.6,
        stdWallMm: 8.2,
        xsWallMm: 12.7,
        stdWeightKg: 44.633,
        xsWeightKg: 55.337,
      },
      {
        runNps: '14',
        runOdMm: 355.6,
        branchNps: '6',
        branchOdMm: 168.3,
        cMm: 279.4,
        mMm: 238.1,
        stdWallMm: 7.1,
        xsWallMm: 11.0,
        stdWeightKg: 44.633,
        xsWeightKg: 55.337,
      },
      {
        runNps: '16',
        runOdMm: 406.4,
        branchNps: '16',
        branchOdMm: 406.4,
        cMm: 304.8,
        mMm: 304.8,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 49.895,
        xsWeightKg: 75.75,
      },
      {
        runNps: '16',
        runOdMm: 406.4,
        branchNps: '14',
        branchOdMm: 355.6,
        cMm: 304.8,
        mMm: 304.8,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 49.895,
        xsWeightKg: 75.75,
      },
      {
        runNps: '16',
        runOdMm: 406.4,
        branchNps: '12',
        branchOdMm: 323.9,
        cMm: 304.8,
        mMm: 295.3,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 49.895,
        xsWeightKg: 73.482,
      },
      {
        runNps: '16',
        runOdMm: 406.4,
        branchNps: '10',
        branchOdMm: 273.0,
        cMm: 304.8,
        mMm: 282.6,
        stdWallMm: 9.3,
        xsWallMm: 12.7,
        stdWeightKg: 48.081,
        xsWeightKg: 72.575,
      },
      {
        runNps: '16',
        runOdMm: 406.4,
        branchNps: '8',
        branchOdMm: 219.1,
        cMm: 304.8,
        mMm: 273.0,
        stdWallMm: 8.2,
        xsWallMm: 12.7,
        stdWeightKg: 48.081,
        xsWeightKg: 72.575,
      },
      {
        runNps: '16',
        runOdMm: 406.4,
        branchNps: '6',
        branchOdMm: 168.3,
        cMm: 304.8,
        mMm: 263.5,
        stdWallMm: 7.1,
        xsWallMm: 11.0,
        stdWeightKg: 48.081,
        xsWeightKg: 72.575,
      },
      {
        runNps: '18',
        runOdMm: 457.2,
        branchNps: '18',
        branchOdMm: 457.2,
        cMm: 342.9,
        mMm: 342.9,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 68.493,
        xsWeightKg: 87.544,
      },
      {
        runNps: '18',
        runOdMm: 457.2,
        branchNps: '16',
        branchOdMm: 406.4,
        cMm: 342.9,
        mMm: 330.2,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 68.493,
        xsWeightKg: 87.544,
      },
      {
        runNps: '18',
        runOdMm: 457.2,
        branchNps: '14',
        branchOdMm: 355.6,
        cMm: 342.9,
        mMm: 330.2,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 68.493,
        xsWeightKg: 87.544,
      },
      {
        runNps: '18',
        runOdMm: 457.2,
        branchNps: '12',
        branchOdMm: 323.9,
        cMm: 342.9,
        mMm: 320.7,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 68.493,
        xsWeightKg: 69.854,
      },
      {
        runNps: '18',
        runOdMm: 457.2,
        branchNps: '10',
        branchOdMm: 273.0,
        cMm: 342.9,
        mMm: 308.0,
        stdWallMm: 9.3,
        xsWallMm: 12.7,
        stdWeightKg: 65.771,
        xsWeightKg: 66.224,
      },
      {
        runNps: '18',
        runOdMm: 457.2,
        branchNps: '8',
        branchOdMm: 219.1,
        cMm: 342.9,
        mMm: 298.5,
        stdWallMm: 8.2,
        xsWallMm: 12.7,
        stdWeightKg: 65.771,
        xsWeightKg: 66.224,
      },
      {
        runNps: '20',
        runOdMm: 508.0,
        branchNps: '20',
        branchOdMm: 508.0,
        cMm: 381.0,
        mMm: 381.0,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 103.42,
        xsWeightKg: 119.749,
      },
      {
        runNps: '20',
        runOdMm: 508.0,
        branchNps: '18',
        branchOdMm: 457.2,
        cMm: 381.0,
        mMm: 368.3,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 103.42,
        xsWeightKg: 103.42,
      },
      {
        runNps: '20',
        runOdMm: 508.0,
        branchNps: '16',
        branchOdMm: 406.4,
        cMm: 381.0,
        mMm: 355.6,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 103.42,
        xsWeightKg: 103.42,
      },
      {
        runNps: '20',
        runOdMm: 508.0,
        branchNps: '14',
        branchOdMm: 355.6,
        cMm: 381.0,
        mMm: 355.6,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 101.606,
        xsWeightKg: 101.606,
      },
      {
        runNps: '20',
        runOdMm: 508.0,
        branchNps: '12',
        branchOdMm: 323.9,
        cMm: 381.0,
        mMm: 346.1,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 101.606,
        xsWeightKg: 101.606,
      },
      {
        runNps: '20',
        runOdMm: 508.0,
        branchNps: '10',
        branchOdMm: 273.0,
        cMm: 381.0,
        mMm: 333.4,
        stdWallMm: 9.3,
        xsWallMm: 12.7,
        stdWeightKg: 99.338,
        xsWeightKg: 99.338,
      },
      {
        runNps: '20',
        runOdMm: 508.0,
        branchNps: '8',
        branchOdMm: 219.1,
        cMm: 381.0,
        mMm: 323.8,
        stdWallMm: 8.2,
        xsWallMm: 12.7,
        stdWeightKg: 99.338,
        xsWeightKg: 99.338,
      },
      {
        runNps: '22',
        runOdMm: 558.8,
        branchNps: '22',
        branchOdMm: 558.8,
        cMm: 419.1,
        mMm: 419.1,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 114.305,
        xsWeightKg: 166.921,
      },
      {
        runNps: '22',
        runOdMm: 558.8,
        branchNps: '20',
        branchOdMm: 508.0,
        cMm: 419.1,
        mMm: 406.4,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 114.305,
        xsWeightKg: 166.921,
      },
      {
        runNps: '22',
        runOdMm: 558.8,
        branchNps: '18',
        branchOdMm: 457.2,
        cMm: 419.1,
        mMm: 393.7,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 108.408,
        xsWeightKg: 137.893,
      },
      {
        runNps: '22',
        runOdMm: 558.8,
        branchNps: '16',
        branchOdMm: 406.4,
        cMm: 419.1,
        mMm: 381.0,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 108.408,
        xsWeightKg: 137.893,
      },
      {
        runNps: '22',
        runOdMm: 558.8,
        branchNps: '14',
        branchOdMm: 355.6,
        cMm: 419.1,
        mMm: 381.0,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 91.626,
        xsWeightKg: 106.141,
      },
      {
        runNps: '22',
        runOdMm: 558.8,
        branchNps: '12',
        branchOdMm: 323.9,
        cMm: 419.1,
        mMm: 371.5,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 91.626,
        xsWeightKg: 106.141,
      },
      {
        runNps: '22',
        runOdMm: 558.8,
        branchNps: '10',
        branchOdMm: 273.0,
        cMm: 419.1,
        mMm: 358.8,
        stdWallMm: 9.3,
        xsWallMm: 12.7,
        stdWeightKg: 91.626,
        xsWeightKg: 106.141,
      },
      {
        runNps: '24',
        runOdMm: 609.6,
        branchNps: '24',
        branchOdMm: 609.6,
        cMm: 431.8,
        mMm: 431.8,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 157.398,
        xsWeightKg: 191.874,
      },
      {
        runNps: '24',
        runOdMm: 609.6,
        branchNps: '20',
        branchOdMm: 508.0,
        cMm: 431.8,
        mMm: 431.8,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 123.377,
        xsWeightKg: 140.161,
      },
      {
        runNps: '24',
        runOdMm: 609.6,
        branchNps: '18',
        branchOdMm: 457.2,
        cMm: 431.8,
        mMm: 419.1,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 123.377,
        xsWeightKg: 140.161,
      },
      {
        runNps: '24',
        runOdMm: 609.6,
        branchNps: '16',
        branchOdMm: 406.4,
        cMm: 431.8,
        mMm: 406.4,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 103.873,
        xsWeightKg: 104.78,
      },
      {
        runNps: '24',
        runOdMm: 609.6,
        branchNps: '14',
        branchOdMm: 355.6,
        cMm: 431.8,
        mMm: 406.4,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 103.873,
        xsWeightKg: 104.78,
      },
      {
        runNps: '24',
        runOdMm: 609.6,
        branchNps: '12',
        branchOdMm: 323.9,
        cMm: 431.8,
        mMm: 396.9,
        stdWallMm: 9.5,
        xsWallMm: 12.7,
        stdWeightKg: 103.873,
        xsWeightKg: 104.78,
      },
      {
        runNps: '24',
        runOdMm: 609.6,
        branchNps: '10',
        branchOdMm: 273.0,
        cMm: 431.8,
        mMm: 384.2,
        stdWallMm: 9.3,
        xsWallMm: 12.7,
        stdWeightKg: 87.09,
        xsWeightKg: 104.78,
      },
    ];

    for (const t of teeData) {
      const isEqual = t.runNps === t.branchNps;
      const fittingTypeId = isEqual ? straightTeeId : reducingTeeId;
      const branchNpsVal = isEqual ? 'NULL' : `'${t.branchNps}'`;
      const branchOdVal = isEqual ? 'NULL' : t.branchOdMm;

      await queryRunner.query(`
        INSERT INTO ansi_b16_9_fitting_dimensions
          (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, branch_nps, branch_od_mm, center_to_end_c_mm, center_to_end_m_mm, weight_kg)
        VALUES
          (${fittingTypeId}, '${t.runNps}', ${this.npsToNbMm(t.runNps)}, ${t.runOdMm}, 'STD', ${t.stdWallMm}, ${branchNpsVal}, ${branchOdVal}, ${t.cMm}, ${t.mMm}, ${t.stdWeightKg})
        ON CONFLICT DO NOTHING
      `);

      await queryRunner.query(`
        INSERT INTO ansi_b16_9_fitting_dimensions
          (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, branch_nps, branch_od_mm, center_to_end_c_mm, center_to_end_m_mm, weight_kg)
        VALUES
          (${fittingTypeId}, '${t.runNps}', ${this.npsToNbMm(t.runNps)}, ${t.runOdMm}, 'XS', ${t.xsWallMm}, ${branchNpsVal}, ${branchOdVal}, ${t.cMm}, ${t.mMm}, ${t.xsWeightKg})
        ON CONFLICT DO NOTHING
      `);
    }

    console.warn('ANSI B16.9 tee data populated.');
  }

  private async populateForgedFittingMissingTypes(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn('Populating forged fitting missing types...');

    const newFittingTypes = [
      {
        code: 'ELBOW_45',
        name: '45° Elbow',
        description: 'Forged steel 45 degree elbow',
      },
      {
        code: 'HALF_COUPLING',
        name: 'Half Coupling',
        description: 'Forged steel half coupling',
      },
      {
        code: 'UNION',
        name: 'Union',
        description: 'Forged steel union with nut',
      },
      { code: 'CAP', name: 'Cap', description: 'Forged steel cap' },
      {
        code: 'PLUG',
        name: 'Hexagonal Head Plug',
        description: 'Forged steel hexagonal head plug',
      },
      {
        code: 'CROSS',
        name: 'Cross',
        description: 'Forged steel cross fitting',
      },
    ];

    for (const ft of newFittingTypes) {
      await queryRunner.query(`
        INSERT INTO forged_fitting_types (code, name, description)
        VALUES ('${ft.code}', '${ft.name}', '${ft.description}')
        ON CONFLICT (code) DO NOTHING
      `);
    }

    const series3000SwResult = await queryRunner.query(
      `SELECT id FROM forged_fitting_series WHERE pressure_class = 3000 AND connection_type = 'SW'`,
    );
    const series3000SwId = series3000SwResult[0]?.id;

    const series3000ThdResult = await queryRunner.query(
      `SELECT id FROM forged_fitting_series WHERE pressure_class = 3000 AND connection_type = 'THD'`,
    );
    const series3000ThdId = series3000ThdResult[0]?.id;

    const series6000ThdResult = await queryRunner.query(
      `SELECT id FROM forged_fitting_series WHERE pressure_class = 6000 AND connection_type = 'THD'`,
    );
    let series6000ThdId = series6000ThdResult[0]?.id;

    if (!series6000ThdId) {
      await queryRunner.query(`
        INSERT INTO forged_fitting_series (pressure_class, connection_type, standard_code, description)
        VALUES (6000, 'THD', 'ASME B16.11', '6000 lb threaded fittings')
        ON CONFLICT DO NOTHING
      `);
      const newResult = await queryRunner.query(
        `SELECT id FROM forged_fitting_series WHERE pressure_class = 6000 AND connection_type = 'THD'`,
      );
      series6000ThdId = newResult[0]?.id;
    }

    const elbow45Result = await queryRunner.query(
      `SELECT id FROM forged_fitting_types WHERE code = 'ELBOW_45'`,
    );
    const elbow45Id = elbow45Result[0]?.id;

    const unionResult = await queryRunner.query(
      `SELECT id FROM forged_fitting_types WHERE code = 'UNION'`,
    );
    const unionId = unionResult[0]?.id;

    const capResult = await queryRunner.query(
      `SELECT id FROM forged_fitting_types WHERE code = 'CAP'`,
    );
    const capId = capResult[0]?.id;

    const plugResult = await queryRunner.query(
      `SELECT id FROM forged_fitting_types WHERE code = 'PLUG'`,
    );
    const plugId = plugResult[0]?.id;

    const halfCouplingResult = await queryRunner.query(
      `SELECT id FROM forged_fitting_types WHERE code = 'HALF_COUPLING'`,
    );
    const halfCouplingId = halfCouplingResult[0]?.id;

    const couplingResult = await queryRunner.query(
      `SELECT id FROM forged_fitting_types WHERE code = 'COUPLING'`,
    );
    const couplingId = couplingResult[0]?.id;

    if (elbow45Id && series3000SwId) {
      const elbow45SwData = [
        { nbMm: 8, bMm: 25.5, cMm: 19.0, massKg: 0.115 },
        { nbMm: 10, bMm: 38.0, cMm: 25.5, massKg: 0.365 },
        { nbMm: 15, bMm: 38.0, cMm: 25.5, massKg: 0.34 },
        { nbMm: 20, bMm: 46.0, cMm: 28.5, massKg: 0.535 },
        { nbMm: 25, bMm: 55.5, cMm: 33.5, massKg: 0.92 },
        { nbMm: 32, bMm: 62.0, cMm: 35.0, massKg: 0.965 },
        { nbMm: 40, bMm: 75.5, cMm: 43.0, massKg: 1.835 },
        { nbMm: 50, bMm: 84.0, cMm: 43.5, massKg: 1.93 },
      ];

      for (const e of elbow45SwData) {
        await queryRunner.query(`
          INSERT INTO forged_fitting_dimensions (series_id, fitting_type_id, nominal_bore_mm, dimension_a_mm, dimension_b_mm, mass_kg)
          VALUES (${series3000SwId}, ${elbow45Id}, ${e.nbMm}, ${e.cMm}, ${e.bMm}, ${e.massKg})
          ON CONFLICT DO NOTHING
        `);
      }
    }

    if (elbow45Id && series3000ThdId) {
      const elbow45ThdData = [
        { nbMm: 8, bMm: 25.5, cMm: 19.0, dMm: 14.0, gMm: 9.5, massKg: 0.095 },
        { nbMm: 10, bMm: 25.5, cMm: 19.0, dMm: 17.5, gMm: 11.0, massKg: 0.09 },
        { nbMm: 15, bMm: 38.0, cMm: 25.5, dMm: 21.7, gMm: 11.0, massKg: 0.26 },
        { nbMm: 20, bMm: 38.0, cMm: 25.5, dMm: 27.1, gMm: 12.5, massKg: 0.25 },
        { nbMm: 25, bMm: 46.0, cMm: 28.5, dMm: 33.8, gMm: 14.5, massKg: 0.381 },
        { nbMm: 32, bMm: 55.5, cMm: 33.5, dMm: 42.6, gMm: 16.0, massKg: 0.608 },
        { nbMm: 40, bMm: 62.0, cMm: 35.0, dMm: 48.7, gMm: 16.0, massKg: 0.708 },
        { nbMm: 50, bMm: 75.5, cMm: 43.0, dMm: 61.1, gMm: 17.5, massKg: 1.135 },
      ];

      for (const e of elbow45ThdData) {
        await queryRunner.query(`
          INSERT INTO forged_fitting_dimensions (series_id, fitting_type_id, nominal_bore_mm, dimension_a_mm, dimension_b_mm, dimension_d_mm, dimension_e_mm, mass_kg)
          VALUES (${series3000ThdId}, ${elbow45Id}, ${e.nbMm}, ${e.cMm}, ${e.bMm}, ${e.dMm}, ${e.gMm}, ${e.massKg})
          ON CONFLICT DO NOTHING
        `);
      }
    }

    if (unionId && series3000SwId) {
      const unionSwData = [
        { nbMm: 8, aMm: 44.5, bMm: 22.0, massKg: 0.14 },
        { nbMm: 10, aMm: 47.5, bMm: 25.5, massKg: 0.2 },
        { nbMm: 15, aMm: 54.0, bMm: 32.0, massKg: 0.35 },
        { nbMm: 20, aMm: 58.5, bMm: 38.0, massKg: 0.425 },
        { nbMm: 25, aMm: 63.5, bMm: 44.5, massKg: 0.65 },
        { nbMm: 32, aMm: 71.5, bMm: 57.0, massKg: 0.975 },
        { nbMm: 40, aMm: 79.5, bMm: 63.5, massKg: 1.255 },
        { nbMm: 50, aMm: 92.0, bMm: 76.0, massKg: 2.01 },
      ];

      for (const u of unionSwData) {
        await queryRunner.query(`
          INSERT INTO forged_fitting_dimensions (series_id, fitting_type_id, nominal_bore_mm, dimension_a_mm, dimension_b_mm, mass_kg)
          VALUES (${series3000SwId}, ${unionId}, ${u.nbMm}, ${u.aMm}, ${u.bMm}, ${u.massKg})
          ON CONFLICT DO NOTHING
        `);
      }
    }

    if (unionId && series3000ThdId) {
      const unionThdData = [
        { nbMm: 8, aMm: 44.5, bMm: 22.0, dMm: 14.0, eMm: 9.5, massKg: 0.255 },
        { nbMm: 10, aMm: 47.5, bMm: 25.5, dMm: 17.5, eMm: 11.0, massKg: 0.34 },
        { nbMm: 15, aMm: 54.0, bMm: 32.0, dMm: 21.7, eMm: 12.5, massKg: 0.39 },
        { nbMm: 20, aMm: 58.5, bMm: 38.0, dMm: 27.1, eMm: 14.5, massKg: 0.48 },
        { nbMm: 25, aMm: 63.5, bMm: 44.5, dMm: 33.8, eMm: 16.0, massKg: 0.66 },
        { nbMm: 32, aMm: 71.5, bMm: 57.0, dMm: 42.6, eMm: 17.5, massKg: 1.15 },
        { nbMm: 40, aMm: 79.5, bMm: 63.5, dMm: 48.7, eMm: 19.0, massKg: 1.42 },
        { nbMm: 50, aMm: 92.0, bMm: 76.0, dMm: 61.1, eMm: 22.0, massKg: 2.45 },
      ];

      for (const u of unionThdData) {
        await queryRunner.query(`
          INSERT INTO forged_fitting_dimensions (series_id, fitting_type_id, nominal_bore_mm, dimension_a_mm, dimension_b_mm, dimension_d_mm, dimension_e_mm, mass_kg)
          VALUES (${series3000ThdId}, ${unionId}, ${u.nbMm}, ${u.aMm}, ${u.bMm}, ${u.dMm}, ${u.eMm}, ${u.massKg})
          ON CONFLICT DO NOTHING
        `);
      }
    }

    if (capId && series3000SwId) {
      const capSwData = [
        { nbMm: 8, dMm: 25.5, bMm: 19.0, massKg: 0.041 },
        { nbMm: 10, dMm: 25.5, bMm: 22.0, massKg: 0.05 },
        { nbMm: 15, dMm: 32.0, bMm: 29.0, massKg: 0.109 },
        { nbMm: 20, dMm: 36.5, bMm: 35.0, massKg: 0.177 },
        { nbMm: 25, dMm: 41.5, bMm: 44.5, massKg: 0.327 },
        { nbMm: 32, dMm: 44.5, bMm: 57.0, massKg: 0.599 },
        { nbMm: 40, dMm: 44.5, bMm: 63.5, massKg: 0.698 },
        { nbMm: 50, dMm: 47.5, bMm: 76.0, massKg: 1.06 },
      ];

      for (const c of capSwData) {
        await queryRunner.query(`
          INSERT INTO forged_fitting_dimensions (series_id, fitting_type_id, nominal_bore_mm, dimension_a_mm, dimension_b_mm, mass_kg)
          VALUES (${series3000SwId}, ${capId}, ${c.nbMm}, ${c.dMm}, ${c.bMm}, ${c.massKg})
          ON CONFLICT DO NOTHING
        `);
      }
    }

    if (capId && series3000ThdId) {
      const capThdData = [
        { nbMm: 8, cMm: 17.5, bMm: 22.0, dMm: 14.0, eMm: 9.5, massKg: 0.041 },
        { nbMm: 10, cMm: 19.0, bMm: 25.5, dMm: 17.5, eMm: 11.0, massKg: 0.054 },
        { nbMm: 15, cMm: 22.0, bMm: 31.5, dMm: 21.7, eMm: 12.5, massKg: 0.1 },
        { nbMm: 20, cMm: 25.5, bMm: 38.0, dMm: 27.1, eMm: 14.5, massKg: 0.163 },
        { nbMm: 25, cMm: 27.0, bMm: 44.5, dMm: 33.8, eMm: 16.0, massKg: 0.218 },
        { nbMm: 32, cMm: 30.0, bMm: 57.0, dMm: 42.6, eMm: 17.5, massKg: 0.413 },
        { nbMm: 40, cMm: 32.0, bMm: 63.5, dMm: 48.7, eMm: 19.0, massKg: 0.508 },
        { nbMm: 50, cMm: 38.0, bMm: 76.0, dMm: 61.1, eMm: 22.0, massKg: 0.854 },
      ];

      for (const c of capThdData) {
        await queryRunner.query(`
          INSERT INTO forged_fitting_dimensions (series_id, fitting_type_id, nominal_bore_mm, dimension_a_mm, dimension_b_mm, dimension_c_mm, dimension_d_mm, dimension_e_mm, mass_kg)
          VALUES (${series3000ThdId}, ${capId}, ${c.nbMm}, ${c.cMm}, ${c.bMm}, ${c.cMm}, ${c.dMm}, ${c.eMm}, ${c.massKg})
          ON CONFLICT DO NOTHING
        `);
      }
    }

    if (plugId && series6000ThdId) {
      const plugData = [
        { nbMm: 8, aMm: 16.0, bMm: 6.5, cMm: 16.0, massKg: 0.026 },
        { nbMm: 10, aMm: 17.5, bMm: 8.0, cMm: 17.5, massKg: 0.048 },
        { nbMm: 15, aMm: 19.0, bMm: 8.0, cMm: 22.0, massKg: 0.073 },
        { nbMm: 20, aMm: 24.0, bMm: 9.5, cMm: 27.0, massKg: 0.179 },
        { nbMm: 25, aMm: 25.5, bMm: 9.5, cMm: 36.5, massKg: 0.247 },
        { nbMm: 32, aMm: 25.5, bMm: 14.5, cMm: 46.5, massKg: 0.445 },
        { nbMm: 40, aMm: 25.5, bMm: 16.0, cMm: 51.0, massKg: 0.595 },
        { nbMm: 50, aMm: 27.0, bMm: 17.5, cMm: 63.5, massKg: 1.158 },
      ];

      for (const p of plugData) {
        await queryRunner.query(`
          INSERT INTO forged_fitting_dimensions (series_id, fitting_type_id, nominal_bore_mm, dimension_a_mm, dimension_b_mm, dimension_c_mm, mass_kg)
          VALUES (${series6000ThdId}, ${plugId}, ${p.nbMm}, ${p.aMm}, ${p.bMm}, ${p.cMm}, ${p.massKg})
          ON CONFLICT DO NOTHING
        `);
      }
    }

    if (halfCouplingId && series3000SwId && couplingId) {
      const existingCouplings = await queryRunner.query(
        `SELECT nominal_bore_mm, dimension_a_mm, dimension_b_mm FROM forged_fitting_dimensions
         WHERE series_id = ${series3000SwId} AND fitting_type_id = ${couplingId}`,
      );

      for (const c of existingCouplings) {
        await queryRunner.query(`
          INSERT INTO forged_fitting_dimensions (series_id, fitting_type_id, nominal_bore_mm, dimension_a_mm, dimension_b_mm, mass_kg)
          VALUES (${series3000SwId}, ${halfCouplingId}, ${c.nominal_bore_mm}, ${parseFloat(c.dimension_a_mm) / 2}, ${c.dimension_b_mm},
            (SELECT mass_kg / 2 FROM forged_fitting_dimensions WHERE series_id = ${series3000SwId} AND fitting_type_id = ${couplingId} AND nominal_bore_mm = ${c.nominal_bore_mm}))
          ON CONFLICT DO NOTHING
        `);
      }
    }

    console.warn('Forged fitting missing types populated.');
  }

  private async populateAnsiB169XsElbows(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn('Populating ANSI B16.9 XS schedule elbows...');

    const elbow90Result = await queryRunner.query(
      `SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'ELBOW_90_LR'`,
    );
    const elbow90Id = elbow90Result[0]?.id;

    const elbow45Result = await queryRunner.query(
      `SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'ELBOW_45_LR'`,
    );
    const elbow45Id = elbow45Result[0]?.id;

    const return180Result = await queryRunner.query(
      `SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'RETURN_180_LR'`,
    );
    const return180Id = return180Result[0]?.id;

    if (!elbow90Id || !elbow45Id || !return180Id) {
      console.warn('Elbow fitting types not found, skipping XS elbow data');
      return;
    }

    const xs90ElbowData = [
      {
        nps: '3/4',
        nbMm: 20,
        odMm: 26.67,
        wallMm: 3.91,
        aMm: 28.6,
        weightKg: 0.045,
      },
      {
        nps: '1',
        nbMm: 25,
        odMm: 33.4,
        wallMm: 4.55,
        aMm: 38.1,
        weightKg: 0.091,
      },
      {
        nps: '1-1/4',
        nbMm: 32,
        odMm: 42.16,
        wallMm: 4.85,
        aMm: 47.6,
        weightKg: 0.159,
      },
      {
        nps: '1-1/2',
        nbMm: 40,
        odMm: 48.26,
        wallMm: 5.08,
        aMm: 57.3,
        weightKg: 0.231,
      },
      {
        nps: '2',
        nbMm: 50,
        odMm: 60.32,
        wallMm: 5.54,
        aMm: 76.2,
        weightKg: 0.426,
      },
      {
        nps: '2-1/2',
        nbMm: 65,
        odMm: 73.02,
        wallMm: 7.01,
        aMm: 95.2,
        weightKg: 0.812,
      },
      {
        nps: '3',
        nbMm: 80,
        odMm: 88.9,
        wallMm: 7.62,
        aMm: 114.3,
        weightKg: 1.302,
      },
      {
        nps: '3-1/2',
        nbMm: 90,
        odMm: 101.6,
        wallMm: 8.08,
        aMm: 133.4,
        weightKg: 1.86,
      },
      {
        nps: '4',
        nbMm: 100,
        odMm: 114.3,
        wallMm: 8.56,
        aMm: 152.4,
        weightKg: 2.549,
      },
      {
        nps: '5',
        nbMm: 125,
        odMm: 141.3,
        wallMm: 9.52,
        aMm: 190.5,
        weightKg: 4.313,
      },
      {
        nps: '6',
        nbMm: 150,
        odMm: 168.3,
        wallMm: 10.97,
        aMm: 228.6,
        weightKg: 7.257,
      },
      {
        nps: '8',
        nbMm: 200,
        odMm: 219.1,
        wallMm: 12.7,
        aMm: 304.8,
        weightKg: 14.605,
      },
      {
        nps: '10',
        nbMm: 250,
        odMm: 273.0,
        wallMm: 12.7,
        aMm: 381.0,
        weightKg: 23.042,
      },
      {
        nps: '12',
        nbMm: 300,
        odMm: 323.8,
        wallMm: 12.7,
        aMm: 457.2,
        weightKg: 33.339,
      },
      {
        nps: '14',
        nbMm: 350,
        odMm: 355.6,
        wallMm: 12.7,
        aMm: 533.4,
        weightKg: 42.638,
      },
      {
        nps: '16',
        nbMm: 400,
        odMm: 406.4,
        wallMm: 12.7,
        aMm: 609.6,
        weightKg: 56.245,
      },
      {
        nps: '18',
        nbMm: 450,
        odMm: 457.2,
        wallMm: 12.7,
        aMm: 685.8,
        weightKg: 71.213,
      },
      {
        nps: '20',
        nbMm: 500,
        odMm: 508.0,
        wallMm: 12.7,
        aMm: 762.0,
        weightKg: 88.0,
      },
      {
        nps: '24',
        nbMm: 600,
        odMm: 609.6,
        wallMm: 12.7,
        aMm: 914.4,
        weightKg: 127.913,
      },
    ];

    const xs45ElbowData = [
      {
        nps: '3/4',
        nbMm: 20,
        odMm: 26.67,
        wallMm: 3.91,
        bMm: 14.3,
        weightKg: 0.023,
      },
      {
        nps: '1',
        nbMm: 25,
        odMm: 33.4,
        wallMm: 4.55,
        bMm: 22.2,
        weightKg: 0.045,
      },
      {
        nps: '1-1/4',
        nbMm: 32,
        odMm: 42.16,
        wallMm: 4.85,
        bMm: 25.4,
        weightKg: 0.082,
      },
      {
        nps: '1-1/2',
        nbMm: 40,
        odMm: 48.26,
        wallMm: 5.08,
        bMm: 28.6,
        weightKg: 0.113,
      },
      {
        nps: '2',
        nbMm: 50,
        odMm: 60.32,
        wallMm: 5.54,
        bMm: 34.9,
        weightKg: 0.213,
      },
      {
        nps: '2-1/2',
        nbMm: 65,
        odMm: 73.02,
        wallMm: 7.01,
        bMm: 44.4,
        weightKg: 0.408,
      },
      {
        nps: '3',
        nbMm: 80,
        odMm: 88.9,
        wallMm: 7.62,
        bMm: 50.8,
        weightKg: 0.653,
      },
      {
        nps: '3-1/2',
        nbMm: 90,
        odMm: 101.6,
        wallMm: 8.08,
        bMm: 57.2,
        weightKg: 0.93,
      },
      {
        nps: '4',
        nbMm: 100,
        odMm: 114.3,
        wallMm: 8.56,
        bMm: 63.5,
        weightKg: 1.274,
      },
      {
        nps: '5',
        nbMm: 125,
        odMm: 141.3,
        wallMm: 9.52,
        bMm: 79.4,
        weightKg: 2.2,
      },
      {
        nps: '6',
        nbMm: 150,
        odMm: 168.3,
        wallMm: 10.97,
        bMm: 95.2,
        weightKg: 3.642,
      },
      {
        nps: '8',
        nbMm: 200,
        odMm: 219.1,
        wallMm: 12.7,
        bMm: 127.0,
        weightKg: 7.348,
      },
      {
        nps: '10',
        nbMm: 250,
        odMm: 273.0,
        wallMm: 12.7,
        bMm: 158.8,
        weightKg: 11.521,
      },
      {
        nps: '12',
        nbMm: 300,
        odMm: 323.8,
        wallMm: 12.7,
        bMm: 190.5,
        weightKg: 16.647,
      },
      {
        nps: '14',
        nbMm: 350,
        odMm: 355.6,
        wallMm: 12.7,
        bMm: 222.2,
        weightKg: 21.319,
      },
      {
        nps: '16',
        nbMm: 400,
        odMm: 406.4,
        wallMm: 12.7,
        bMm: 254.0,
        weightKg: 28.168,
      },
      {
        nps: '18',
        nbMm: 450,
        odMm: 457.2,
        wallMm: 12.7,
        bMm: 285.8,
        weightKg: 35.789,
      },
      {
        nps: '20',
        nbMm: 500,
        odMm: 508.0,
        wallMm: 12.7,
        bMm: 317.5,
        weightKg: 44.045,
      },
      {
        nps: '24',
        nbMm: 600,
        odMm: 609.6,
        wallMm: 12.7,
        bMm: 381.0,
        weightKg: 63.957,
      },
    ];

    const xs180ReturnData = [
      {
        nps: '3/4',
        nbMm: 20,
        odMm: 26.67,
        wallMm: 3.91,
        oMm: 57.2,
        kMm: 42.9,
        weightKg: 0.073,
      },
      {
        nps: '1',
        nbMm: 25,
        odMm: 33.4,
        wallMm: 4.55,
        oMm: 76.2,
        kMm: 55.6,
        weightKg: 0.141,
      },
      {
        nps: '1-1/4',
        nbMm: 32,
        odMm: 42.16,
        wallMm: 4.85,
        oMm: 95.2,
        kMm: 69.8,
        weightKg: 0.24,
      },
      {
        nps: '1-1/2',
        nbMm: 40,
        odMm: 48.26,
        wallMm: 5.08,
        oMm: 114.3,
        kMm: 82.6,
        weightKg: 0.345,
      },
      {
        nps: '2',
        nbMm: 50,
        odMm: 60.32,
        wallMm: 5.54,
        oMm: 152.4,
        kMm: 106.4,
        weightKg: 0.617,
      },
      {
        nps: '2-1/2',
        nbMm: 65,
        odMm: 73.02,
        wallMm: 7.01,
        oMm: 190.5,
        kMm: 131.8,
        weightKg: 1.224,
      },
      {
        nps: '3',
        nbMm: 80,
        odMm: 88.9,
        wallMm: 7.62,
        oMm: 228.4,
        kMm: 158.8,
        weightKg: 1.928,
      },
      {
        nps: '3-1/2',
        nbMm: 90,
        odMm: 101.6,
        wallMm: 8.08,
        oMm: 266.7,
        kMm: 184.2,
        weightKg: 2.695,
      },
      {
        nps: '4',
        nbMm: 100,
        odMm: 114.3,
        wallMm: 8.56,
        oMm: 304.8,
        kMm: 209.6,
        weightKg: 3.66,
      },
      {
        nps: '5',
        nbMm: 125,
        odMm: 141.3,
        wallMm: 9.52,
        oMm: 381.0,
        kMm: 261.9,
        weightKg: 6.214,
      },
      {
        nps: '6',
        nbMm: 150,
        odMm: 168.3,
        wallMm: 10.97,
        oMm: 457.2,
        kMm: 312.7,
        weightKg: 9.661,
      },
      {
        nps: '8',
        nbMm: 200,
        odMm: 219.1,
        wallMm: 12.7,
        oMm: 609.6,
        kMm: 414.3,
        weightKg: 19.323,
      },
      {
        nps: '10',
        nbMm: 250,
        odMm: 273.0,
        wallMm: 12.7,
        oMm: 762.0,
        kMm: 517.5,
        weightKg: 34.383,
      },
      {
        nps: '12',
        nbMm: 300,
        odMm: 323.8,
        wallMm: 12.7,
        oMm: 914.4,
        kMm: 619.1,
        weightKg: 50.802,
      },
      {
        nps: '14',
        nbMm: 350,
        odMm: 355.6,
        wallMm: 12.7,
        oMm: 1067.0,
        kMm: 711.2,
        weightKg: 64.864,
      },
      {
        nps: '16',
        nbMm: 400,
        odMm: 406.4,
        wallMm: 12.7,
        oMm: 1219.0,
        kMm: 812.8,
        weightKg: 85.275,
      },
      {
        nps: '18',
        nbMm: 450,
        odMm: 457.2,
        wallMm: 12.7,
        oMm: 1372.0,
        kMm: 914.4,
        weightKg: 108.408,
      },
      {
        nps: '20',
        nbMm: 500,
        odMm: 508.0,
        wallMm: 12.7,
        oMm: 1524.0,
        kMm: 1016.0,
        weightKg: 132.905,
      },
      {
        nps: '24',
        nbMm: 600,
        odMm: 609.6,
        wallMm: 12.7,
        oMm: 1829.0,
        kMm: 1219.0,
        weightKg: 192.781,
      },
    ];

    for (const e of xs90ElbowData) {
      await queryRunner.query(`
        INSERT INTO ansi_b16_9_fitting_dimensions
          (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, center_to_face_a_mm, weight_kg)
        VALUES
          (${elbow90Id}, '${e.nps}', ${e.nbMm}, ${e.odMm}, 'XS', ${e.wallMm}, ${e.aMm}, ${e.weightKg})
        ON CONFLICT DO NOTHING
      `);
    }

    for (const e of xs45ElbowData) {
      await queryRunner.query(`
        INSERT INTO ansi_b16_9_fitting_dimensions
          (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, center_to_face_b_mm, weight_kg)
        VALUES
          (${elbow45Id}, '${e.nps}', ${e.nbMm}, ${e.odMm}, 'XS', ${e.wallMm}, ${e.bMm}, ${e.weightKg})
        ON CONFLICT DO NOTHING
      `);
    }

    for (const r of xs180ReturnData) {
      await queryRunner.query(`
        INSERT INTO ansi_b16_9_fitting_dimensions
          (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, center_to_center_o_mm, back_to_face_k_mm, weight_kg)
        VALUES
          (${return180Id}, '${r.nps}', ${r.nbMm}, ${r.odMm}, 'XS', ${r.wallMm}, ${r.oMm}, ${r.kMm}, ${r.weightKg})
        ON CONFLICT DO NOTHING
      `);
    }

    console.warn('ANSI B16.9 XS schedule elbows populated.');
  }

  private npsToNbMm(nps: string): number {
    const npsMap: Record<string, number> = {
      '1/2': 15,
      '3/4': 20,
      '1': 25,
      '1-1/4': 32,
      '1-1/2': 40,
      '2': 50,
      '2-1/2': 65,
      '3': 80,
      '3-1/2': 90,
      '4': 100,
      '5': 125,
      '6': 150,
      '8': 200,
      '10': 250,
      '12': 300,
      '14': 350,
      '16': 400,
      '18': 450,
      '20': 500,
      '22': 550,
      '24': 600,
    };
    return npsMap[nps] || 0;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('Reverting Priority 1 fitting data...');

    await queryRunner.query(`
      DELETE FROM ansi_b16_9_fitting_dimensions
      WHERE fitting_type_id IN (
        SELECT id FROM ansi_b16_9_fitting_types WHERE code IN ('TEE_STRAIGHT', 'TEE_REDUCING')
      )
    `);

    await queryRunner.query(`
      DELETE FROM ansi_b16_9_fitting_dimensions
      WHERE schedule = 'XS' AND fitting_type_id IN (
        SELECT id FROM ansi_b16_9_fitting_types WHERE code IN ('ELBOW_90_LR', 'ELBOW_45_LR', 'RETURN_180_LR')
      )
    `);

    await queryRunner.query(`
      DELETE FROM forged_fitting_dimensions
      WHERE fitting_type_id IN (
        SELECT id FROM forged_fitting_types WHERE code IN ('ELBOW_45', 'HALF_COUPLING', 'UNION', 'CAP', 'PLUG', 'CROSS')
      )
    `);

    await queryRunner.query(`
      DELETE FROM forged_fitting_types
      WHERE code IN ('ELBOW_45', 'HALF_COUPLING', 'UNION', 'CAP', 'PLUG', 'CROSS')
    `);

    await queryRunner.query(`
      DELETE FROM forged_fitting_series WHERE pressure_class = 6000 AND connection_type = 'THD'
    `);

    console.warn('Priority 1 fitting data reverted.');
  }
}
