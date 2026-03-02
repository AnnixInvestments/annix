/**
 * Migration Script: Rename Rubber Document Paths in S3
 *
 * This script migrates rubber documents from the old path structure to the new one:
 *   Old: rubber-lining/cocs/*, rubber-lining/delivery-notes/*, rubber-lining/graphs/*
 *   New: au-rubber/cocs/*, au-rubber/delivery-notes/*, au-rubber/graphs/*
 *
 * It processes:
 * - rubber_supplier_cocs (document_path and graph_pdf_path columns)
 * - rubber_delivery_notes (document_path column)
 *
 * Usage:
 *   pnpm migrate:rubber-paths [--dry-run]
 *
 * Options:
 *   --dry-run    Preview changes without actually modifying S3 or database
 *
 * Prerequisites:
 * - AWS credentials must be configured in environment variables
 * - STORAGE_TYPE should be 's3'
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

const OLD_PREFIX = "rubber-lining/";
const NEW_PREFIX = "au-rubber/";

const logger = new Logger("RubberPathMigration");

function convertPath(oldPath: string): string {
  if (oldPath.startsWith(OLD_PREFIX)) {
    return NEW_PREFIX + oldPath.slice(OLD_PREFIX.length);
  }
  return oldPath;
}

async function migrateRubberPaths() {
  const isDryRun = process.argv.includes("--dry-run");

  if (isDryRun) {
    logger.log("=".repeat(60));
    logger.log("DRY RUN MODE - No actual changes will be made");
    logger.log("=".repeat(60));
  }

  logger.log("Starting Rubber Path Migration...");
  logger.log(`Converting paths from '${OLD_PREFIX}' to '${NEW_PREFIX}'`);
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

  const migrations = [
    {
      tableName: "rubber_supplier_cocs",
      columns: ["document_path", "graph_pdf_path"],
    },
    {
      tableName: "rubber_delivery_notes",
      columns: ["document_path"],
    },
  ];

  const results: MigrationResult[] = [];

  for (const migration of migrations) {
    for (const column of migration.columns) {
      logger.log(`\nProcessing ${migration.tableName}.${column}...`);
      logger.log("-".repeat(50));

      const result: MigrationResult = {
        tableName: migration.tableName,
        column,
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

        const records: PathRecord[] = await dataSource.query(`
          SELECT id, ${column} as path
          FROM ${migration.tableName}
          WHERE ${column} IS NOT NULL
            AND ${column} LIKE '${OLD_PREFIX}%'
          ORDER BY id
        `);

        result.total = records.length;
        logger.log(`  Found ${records.length} records with old path prefix`);

        for (const record of records) {
          try {
            const oldPath = record.path;
            const newPath = convertPath(oldPath);

            if (oldPath === newPath) {
              logger.log(`  [SKIP] Path unchanged: ${oldPath}`);
              result.skipped++;
              continue;
            }

            const oldKey = oldPath.replace(/\\/g, "/").replace(/^\//, "");
            const newKey = newPath.replace(/\\/g, "/").replace(/^\//, "");

            if (!isDryRun) {
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

              await dataSource.query(
                `UPDATE ${migration.tableName} SET ${column} = $1 WHERE id = $2`,
                [newPath, record.id],
              );
              logger.log(`  [DB] Updated record ${record.id}: ${oldPath} -> ${newPath}`);
            } else {
              logger.log(`  [DRY-RUN] Would migrate record ${record.id}:`);
              logger.log(`           S3: ${oldKey} -> ${newKey}`);
              logger.log(`           DB: ${column} = '${newPath}'`);
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
          `  Error processing ${migration.tableName}.${column}: ${err.message || "Unknown error"}`,
        );
        result.errors.push(err.message || "Unknown error");
      }

      results.push(result);
    }
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

migrateRubberPaths().catch((error) => {
  logger.error(`Migration failed: ${error.message}`);
  process.exit(1);
});
