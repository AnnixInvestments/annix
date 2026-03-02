/**
 * Migration Script: Migrate FieldFlow Recordings from Local to S3
 *
 * This script migrates meeting recordings from local filesystem to S3:
 *   Old: uploads/recordings/{meetingId}/*
 *   New: fieldflow/recordings/{meetingId}/*
 *
 * It processes:
 * - meeting_recordings (storage_path column)
 *
 * Usage:
 *   pnpm migrate:fieldflow-recordings [--dry-run]
 *
 * Options:
 *   --dry-run    Preview changes without actually uploading to S3 or modifying database
 *
 * Prerequisites:
 * - AWS credentials must be configured in environment variables
 * - Local uploads directory must be accessible
 * - Ensure a database backup has been taken before running
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { lookup } from "mime-types";
import { DataSource } from "typeorm";

import { AppModule } from "../src/app.module";

interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

interface RecordingRecord {
  id: number;
  storage_path: string;
  meeting_id: number;
}

const logger = new Logger("FieldFlowRecordingMigration");

async function migrateFieldFlowRecordings() {
  const isDryRun = process.argv.includes("--dry-run");

  if (isDryRun) {
    logger.log("=".repeat(60));
    logger.log("DRY RUN MODE - No actual changes will be made");
    logger.log("=".repeat(60));
  }

  logger.log("Starting FieldFlow Recording Migration...");
  logger.log("Migrating from local uploads/ to S3 fieldflow/recordings/");
  logger.log("=".repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  const configService = app.get(ConfigService);
  const dataSource = app.get(DataSource);

  const awsRegion = configService.get<string>("AWS_REGION");
  const awsBucket = configService.get<string>("AWS_S3_BUCKET");
  const awsAccessKeyId = configService.get<string>("AWS_ACCESS_KEY_ID");
  const awsSecretAccessKey = configService.get<string>("AWS_SECRET_ACCESS_KEY");
  const uploadDir = configService.get<string>("UPLOAD_DIR") ?? "./uploads";

  if (!awsRegion || !awsBucket || !awsAccessKeyId || !awsSecretAccessKey) {
    logger.error(
      "Missing AWS configuration. Please ensure the following environment variables are set:",
    );
    logger.error("  - AWS_REGION");
    logger.error("  - AWS_S3_BUCKET");
    logger.error("  - AWS_ACCESS_KEY_ID");
    logger.error("  - AWS_SECRET_ACCESS_KEY");
    await app.close();
    process.exit(1);
  }

  logger.log(`S3 Bucket: ${awsBucket}`);
  logger.log(`AWS Region: ${awsRegion}`);
  logger.log(`Local Upload Dir: ${uploadDir}`);
  logger.log("");

  const s3Client = new S3Client({
    region: awsRegion,
    credentials: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
    },
  });

  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  try {
    const tableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'meeting_recordings'
      );
    `);

    if (!tableExists[0].exists) {
      logger.log("Table meeting_recordings does not exist. Nothing to migrate.");
      await app.close();
      process.exit(0);
    }

    const records: RecordingRecord[] = await dataSource.query(`
      SELECT id, storage_path, meeting_id
      FROM meeting_recordings
      WHERE storage_path IS NOT NULL
        AND storage_path NOT LIKE 'fieldflow/%'
        AND storage_bucket = 'local'
      ORDER BY id
    `);

    result.total = records.length;
    logger.log(`Found ${records.length} local recordings to migrate`);
    logger.log("-".repeat(50));

    for (const record of records) {
      try {
        const oldPath = record.storage_path;
        const localFilePath = path.join(uploadDir, oldPath);

        if (!fs.existsSync(localFilePath)) {
          logger.log(`  [SKIP] Local file not found: ${localFilePath}`);
          result.skipped++;
          continue;
        }

        const filename = path.basename(oldPath);
        const newS3Path = `fieldflow/recordings/${record.meeting_id}/${filename}`;

        if (!isDryRun) {
          const fileContent = fs.readFileSync(localFilePath);
          const mimeType = lookup(filename) || "application/octet-stream";

          await s3Client.send(
            new PutObjectCommand({
              Bucket: awsBucket,
              Key: newS3Path,
              Body: fileContent,
              ContentType: mimeType,
            }),
          );
          logger.log(`  [UPLOAD] ${localFilePath} -> s3://${awsBucket}/${newS3Path}`);

          await dataSource.query(
            `UPDATE meeting_recordings SET storage_path = $1, storage_bucket = 's3' WHERE id = $2`,
            [newS3Path, record.id],
          );
          logger.log(`  [DB] Updated record ${record.id}: storage_path = '${newS3Path}'`);
        } else {
          logger.log(`  [DRY-RUN] Would migrate record ${record.id}:`);
          logger.log(`           Local: ${localFilePath}`);
          logger.log(`           S3: ${newS3Path}`);
        }

        result.migrated++;
      } catch (error: unknown) {
        const err = error as { message?: string };
        const errorMsg = `Failed to migrate record ${record.id}: ${err.message || "Unknown error"}`;
        logger.error(`  [ERROR] ${errorMsg}`);
        result.errors.push(errorMsg);
        result.failed++;
      }
    }
  } catch (error: unknown) {
    const err = error as { message?: string };
    logger.error(`Error during migration: ${err.message || "Unknown error"}`);
    result.errors.push(err.message || "Unknown error");
  }

  logger.log(`\n${"=".repeat(60)}`);
  logger.log("MIGRATION SUMMARY");
  logger.log("=".repeat(60));
  logger.log(`Total:    ${result.total}`);
  logger.log(`Migrated: ${result.migrated}`);
  logger.log(`Skipped:  ${result.skipped}`);
  logger.log(`Failed:   ${result.failed}`);

  if (result.errors.length > 0) {
    logger.log("\nErrors:");
    result.errors.forEach((e) => logger.log(`  - ${e}`));
  }

  if (isDryRun) {
    logger.log("\nThis was a DRY RUN. No changes were made.");
    logger.log("Run without --dry-run to apply changes.");
  } else if (result.migrated > 0) {
    logger.log("\nNote: Local files have NOT been deleted.");
    logger.log("After verifying the migration, you can manually remove:");
    logger.log(`  ${path.join(uploadDir, "recordings")}`);
  }

  logger.log("=".repeat(60));

  await app.close();
  process.exit(result.failed > 0 ? 1 : 0);
}

migrateFieldFlowRecordings().catch((error) => {
  logger.error(`Migration failed: ${error.message}`);
  process.exit(1);
});
