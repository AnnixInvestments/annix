/**
 * Migration Script: Add annix-app/ prefix to existing document paths
 *
 * This script migrates existing document paths to include the annix-app/ area prefix:
 *   Old: customers/{customerId}/documents/*
 *   New: annix-app/customers/{customerId}/documents/*
 *
 * It processes:
 * - customer_documents (file_path column)
 * - supplier_documents (file_path column)
 * - rfq_documents (file_path column)
 * - drawings (file_path column)
 *
 * Usage:
 *   pnpm migrate:annix-app-paths [--dry-run]
 *
 * Options:
 *   --dry-run    Preview changes without modifying S3 or database
 *
 * Prerequisites:
 * - AWS credentials must be configured
 * - Ensure a database backup has been taken before running
 */

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";

import { AppModule } from "../src/app.module";

interface MigrationResult {
  tableName: string;
  column: string;
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

interface PathRecord {
  id: number;
  path: string;
}

const NEW_PREFIX = "annix-app/";
const LEGACY_PREFIXES = ["customers/", "suppliers/", "rfq-documents/", "drawings/"];

const logger = new Logger("AnnixAppPathMigration");

function needsMigration(path: string): boolean {
  if (path.startsWith(NEW_PREFIX)) {
    return false;
  }
  return LEGACY_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function convertPath(oldPath: string): string {
  if (oldPath.startsWith(NEW_PREFIX)) {
    return oldPath;
  }
  return NEW_PREFIX + oldPath;
}

async function migrateAnnixAppPaths() {
  const isDryRun = process.argv.includes("--dry-run");

  if (isDryRun) {
    logger.log("=".repeat(60));
    logger.log("DRY RUN MODE - No actual changes will be made");
    logger.log("=".repeat(60));
  }

  logger.log("Starting Annix App Path Migration...");
  logger.log(`Adding '${NEW_PREFIX}' prefix to legacy paths`);
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
  const storageType = configService.get<string>("STORAGE_TYPE");

  if (storageType !== "s3") {
    logger.warn(
      `STORAGE_TYPE is '${storageType}', not 's3'. Proceeding with database-only migration.`,
    );
  }

  if (!awsRegion || !awsBucket || !awsAccessKeyId || !awsSecretAccessKey) {
    logger.error("Missing AWS configuration. Please set environment variables.");
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

  const migrations = [
    { tableName: "customer_documents", column: "file_path" },
    { tableName: "supplier_documents", column: "file_path" },
    { tableName: "rfq_documents", column: "file_path" },
    { tableName: "drawings", column: "file_path" },
  ];

  const results: MigrationResult[] = [];

  for (const migration of migrations) {
    logger.log(`\nProcessing ${migration.tableName}.${migration.column}...`);
    logger.log("-".repeat(50));

    const result: MigrationResult = {
      tableName: migration.tableName,
      column: migration.column,
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
          WHERE table_name = '${migration.tableName}'
        );
      `);

      if (!tableExists[0].exists) {
        logger.log(`  Table ${migration.tableName} does not exist. Skipping...`);
        results.push(result);
        continue;
      }

      const legacyConditions = LEGACY_PREFIXES.map(
        (prefix) => `${migration.column} LIKE '${prefix}%'`,
      ).join(" OR ");

      const records: PathRecord[] = await dataSource.query(`
        SELECT id, ${migration.column} as path
        FROM ${migration.tableName}
        WHERE ${migration.column} IS NOT NULL
          AND ${migration.column} NOT LIKE '${NEW_PREFIX}%'
          AND (${legacyConditions})
        ORDER BY id
      `);

      result.total = records.length;
      logger.log(`  Found ${records.length} records with legacy paths`);

      for (const record of records) {
        try {
          const oldPath = record.path;

          if (!needsMigration(oldPath)) {
            logger.log(`  [SKIP] Path already migrated or not applicable: ${oldPath}`);
            result.skipped++;
            continue;
          }

          const newPath = convertPath(oldPath);
          const oldKey = oldPath.replace(/\\/g, "/").replace(/^\//, "");
          const newKey = newPath.replace(/\\/g, "/").replace(/^\//, "");

          if (!isDryRun && storageType === "s3") {
            let sourceExists = false;
            try {
              await s3Client.send(
                new HeadObjectCommand({
                  Bucket: awsBucket,
                  Key: oldKey,
                }),
              );
              sourceExists = true;
            } catch (error: unknown) {
              const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
              if (err.name !== "NotFound" && err.$metadata?.httpStatusCode !== 404) {
                throw error;
              }
            }

            if (sourceExists) {
              let targetExists = false;
              try {
                await s3Client.send(
                  new HeadObjectCommand({
                    Bucket: awsBucket,
                    Key: newKey,
                  }),
                );
                targetExists = true;
              } catch (error: unknown) {
                const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
                if (err.name !== "NotFound" && err.$metadata?.httpStatusCode !== 404) {
                  throw error;
                }
              }

              if (!targetExists) {
                await s3Client.send(
                  new CopyObjectCommand({
                    Bucket: awsBucket,
                    CopySource: `${awsBucket}/${oldKey}`,
                    Key: newKey,
                  }),
                );
                logger.log(`  [COPY] ${oldKey} -> ${newKey}`);

                await s3Client.send(
                  new DeleteObjectCommand({
                    Bucket: awsBucket,
                    Key: oldKey,
                  }),
                );
                logger.log(`  [DELETE] ${oldKey}`);
              } else {
                logger.log(`  [S3-SKIP] Target already exists: ${newKey}`);
              }
            } else {
              logger.log(`  [S3-SKIP] Source not found in S3: ${oldKey}`);
            }
          }

          if (!isDryRun) {
            await dataSource.query(
              `UPDATE ${migration.tableName} SET ${migration.column} = $1 WHERE id = $2`,
              [newPath, record.id],
            );
            logger.log(`  [DB] Updated record ${record.id}: ${oldPath} -> ${newPath}`);
          } else {
            logger.log(`  [DRY-RUN] Would migrate record ${record.id}:`);
            logger.log(`           S3: ${oldKey} -> ${newKey}`);
            logger.log(`           DB: ${migration.column} = '${newPath}'`);
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
      logger.error(
        `  Error processing ${migration.tableName}.${migration.column}: ${err.message || "Unknown error"}`,
      );
      result.errors.push(err.message || "Unknown error");
    }

    results.push(result);
  }

  logger.log(`\n${"=".repeat(60)}`);
  logger.log("MIGRATION SUMMARY");
  logger.log("=".repeat(60));

  let totalRecords = 0;
  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const result of results) {
    logger.log(`\n${result.tableName}.${result.column}:`);
    logger.log(`  Total:    ${result.total}`);
    logger.log(`  Migrated: ${result.migrated}`);
    logger.log(`  Skipped:  ${result.skipped}`);
    logger.log(`  Failed:   ${result.failed}`);

    if (result.errors.length > 0) {
      logger.log("  Errors:");
      result.errors.forEach((e) => logger.log(`    - ${e}`));
    }

    totalRecords += result.total;
    totalMigrated += result.migrated;
    totalSkipped += result.skipped;
    totalFailed += result.failed;
  }

  logger.log(`\n${"-".repeat(60)}`);
  logger.log("TOTALS:");
  logger.log(`  Total Records:  ${totalRecords}`);
  logger.log(`  Migrated:       ${totalMigrated}`);
  logger.log(`  Skipped:        ${totalSkipped}`);
  logger.log(`  Failed:         ${totalFailed}`);
  logger.log("=".repeat(60));

  if (isDryRun) {
    logger.log("\nThis was a DRY RUN. No changes were made.");
    logger.log("Run without --dry-run to apply changes.");
  }

  await app.close();
  process.exit(totalFailed > 0 ? 1 : 0);
}

migrateAnnixAppPaths().catch((error) => {
  logger.error(`Migration failed: ${error.message}`);
  process.exit(1);
});
