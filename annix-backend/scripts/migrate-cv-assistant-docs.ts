/**
 * Migration Script: Migrate CV Assistant Documents from Local to S3
 *
 * This script migrates candidate CVs from local filesystem to S3:
 *   Old: uploads/cv-assistant/{companyId}/*  or  uploads/cv-assistant/manual/*
 *   New: cv-assistant/candidates/{companyId}/*
 *
 * It processes:
 * - candidates (cv_file_path column)
 *
 * Usage:
 *   pnpm migrate:cv-assistant-docs [--dry-run]
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

interface CandidateRecord {
  id: number;
  cv_file_path: string;
  job_posting_id: number;
}

interface JobPostingInfo {
  company_id: number;
}

const logger = new Logger("CvAssistantDocMigration");

async function migrateCvAssistantDocs() {
  const isDryRun = process.argv.includes("--dry-run");

  if (isDryRun) {
    logger.log("=".repeat(60));
    logger.log("DRY RUN MODE - No actual changes will be made");
    logger.log("=".repeat(60));
  }

  logger.log("Starting CV Assistant Document Migration...");
  logger.log("Migrating from local uploads/ to S3 cv-assistant/candidates/");
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
        WHERE table_name = 'candidates'
      );
    `);

    if (!tableExists[0].exists) {
      logger.log("Table candidates does not exist. Nothing to migrate.");
      await app.close();
      process.exit(0);
    }

    const records: CandidateRecord[] = await dataSource.query(`
      SELECT id, cv_file_path, job_posting_id
      FROM candidates
      WHERE cv_file_path IS NOT NULL
        AND cv_file_path NOT LIKE 'cv-assistant/%'
      ORDER BY id
    `);

    result.total = records.length;
    logger.log(`Found ${records.length} local CV files to migrate`);
    logger.log("-".repeat(50));

    const companyCache = new Map<number, number>();

    for (const record of records) {
      try {
        const oldPath = record.cv_file_path;

        if (!fs.existsSync(oldPath)) {
          logger.log(`  [SKIP] Local file not found: ${oldPath}`);
          result.skipped++;
          continue;
        }

        let companyId = companyCache.get(record.job_posting_id);
        if (companyId === undefined) {
          const jobInfo: JobPostingInfo[] = await dataSource.query(
            "SELECT company_id FROM job_postings WHERE id = $1",
            [record.job_posting_id],
          );
          if (jobInfo.length === 0) {
            logger.log(
              `  [SKIP] Job posting ${record.job_posting_id} not found for candidate ${record.id}`,
            );
            result.skipped++;
            continue;
          }
          companyId = jobInfo[0].company_id;
          companyCache.set(record.job_posting_id, companyId);
        }

        const filename = path.basename(oldPath);
        const newS3Path = `cv-assistant/candidates/${companyId}/${filename}`;

        if (!isDryRun) {
          const fileContent = fs.readFileSync(oldPath);
          const mimeType = lookup(filename) || "application/pdf";

          await s3Client.send(
            new PutObjectCommand({
              Bucket: awsBucket,
              Key: newS3Path,
              Body: fileContent,
              ContentType: mimeType,
            }),
          );
          logger.log(`  [UPLOAD] ${oldPath} -> s3://${awsBucket}/${newS3Path}`);

          await dataSource.query("UPDATE candidates SET cv_file_path = $1 WHERE id = $2", [
            newS3Path,
            record.id,
          ]);
          logger.log(`  [DB] Updated candidate ${record.id}: cv_file_path = '${newS3Path}'`);
        } else {
          logger.log(`  [DRY-RUN] Would migrate candidate ${record.id}:`);
          logger.log(`           Local: ${oldPath}`);
          logger.log(`           S3: ${newS3Path}`);
        }

        result.migrated++;
      } catch (error: unknown) {
        const err = error as { message?: string };
        const errorMsg = `Failed to migrate candidate ${record.id}: ${err.message || "Unknown error"}`;
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
    logger.log("  uploads/cv-assistant/");
  }

  logger.log("=".repeat(60));

  await app.close();
  process.exit(result.failed > 0 ? 1 : 0);
}

migrateCvAssistantDocs().catch((error) => {
  logger.error(`Migration failed: ${error.message}`);
  process.exit(1);
});
