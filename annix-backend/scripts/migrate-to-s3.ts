/**
 * Migration Script: Local Storage to AWS S3
 *
 * This script migrates all files from local filesystem storage to AWS S3.
 * It processes all document types across the application with proper area prefixes.
 *
 * Document Types:
 * - annix-app/: customers, suppliers, rfq-documents, drawings
 * - fieldflow/: meeting recordings
 * - cv-assistant/: candidate CVs
 * - stock-control/: job cards, invoices, deliveries, inventory, signatures, etc.
 * - secure-documents/: encrypted secure documents
 * - au-rubber/: rubber lining documents (CoCs, delivery notes, graphs)
 *
 * Usage:
 *   pnpm migrate:s3 [options]
 *
 * Options:
 *   --dry-run     Preview changes without uploading to S3
 *   --rollback    Download files from S3 back to local storage
 *   --type=X      Only migrate specific type (e.g., --type=fieldflow)
 *
 * Prerequisites:
 * - AWS credentials must be configured in environment variables
 * - Ensure a database backup has been taken before running
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { lookup } from "mime-types";
import { DataSource } from "typeorm";

import { AppModule } from "../src/app.module";

interface MigrationResult {
  type: string;
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

interface DocumentTypeConfig {
  name: string;
  tableName: string;
  pathColumn: string;
  areaPrefix: string;
  idColumn?: string;
  additionalColumns?: string[];
}

const logger = new Logger("S3Migration");

const DOCUMENT_TYPES: DocumentTypeConfig[] = [
  {
    name: "Customer Documents",
    tableName: "customer_documents",
    pathColumn: "file_path",
    areaPrefix: "annix-app/",
  },
  {
    name: "Supplier Documents",
    tableName: "supplier_documents",
    pathColumn: "file_path",
    areaPrefix: "annix-app/",
  },
  {
    name: "RFQ Documents",
    tableName: "rfq_documents",
    pathColumn: "file_path",
    areaPrefix: "annix-app/",
  },
  {
    name: "Drawings",
    tableName: "drawings",
    pathColumn: "file_path",
    areaPrefix: "annix-app/",
  },
  {
    name: "Drawing Versions",
    tableName: "drawing_versions",
    pathColumn: "file_path",
    areaPrefix: "annix-app/",
  },
  {
    name: "FieldFlow Recordings",
    tableName: "meeting_recordings",
    pathColumn: "storage_path",
    areaPrefix: "fieldflow/",
    additionalColumns: ["storage_bucket"],
  },
  {
    name: "CV Assistant Candidates",
    tableName: "candidates",
    pathColumn: "cv_file_path",
    areaPrefix: "cv-assistant/",
  },
  {
    name: "Rubber CoCs",
    tableName: "rubber_supplier_cocs",
    pathColumn: "document_path",
    areaPrefix: "au-rubber/",
    additionalColumns: ["graph_pdf_path"],
  },
  {
    name: "Rubber Delivery Notes",
    tableName: "rubber_delivery_notes",
    pathColumn: "document_path",
    areaPrefix: "au-rubber/",
  },
  {
    name: "Stock Control Job Cards",
    tableName: "sc_job_card_documents",
    pathColumn: "file_path",
    areaPrefix: "stock-control/",
  },
  {
    name: "Stock Control Invoices",
    tableName: "sc_invoices",
    pathColumn: "file_path",
    areaPrefix: "stock-control/",
  },
  {
    name: "Stock Control Deliveries",
    tableName: "sc_delivery_documents",
    pathColumn: "file_path",
    areaPrefix: "stock-control/",
  },
  {
    name: "Stock Control Inventory",
    tableName: "sc_inventory_items",
    pathColumn: "image_path",
    areaPrefix: "stock-control/",
  },
  {
    name: "Stock Control Signatures",
    tableName: "sc_signatures",
    pathColumn: "file_path",
    areaPrefix: "stock-control/",
  },
  {
    name: "Stock Control Staff Photos",
    tableName: "sc_staff",
    pathColumn: "photo_path",
    areaPrefix: "stock-control/",
  },
  {
    name: "Secure Documents",
    tableName: "secure_documents",
    pathColumn: "file_path",
    areaPrefix: "secure-documents/",
  },
];

function parseArgs(): { isDryRun: boolean; isRollback: boolean; typeFilter: string | null } {
  const isDryRun = process.argv.includes("--dry-run");
  const isRollback = process.argv.includes("--rollback");
  const typeArg = process.argv.find((arg) => arg.startsWith("--type="));
  const typeFilter = typeArg ? typeArg.split("=")[1] : null;
  return { isDryRun, isRollback, typeFilter };
}

function shouldAddPrefix(currentPath: string, areaPrefix: string): boolean {
  if (!currentPath) return false;
  if (currentPath.startsWith(areaPrefix)) return false;
  if (currentPath.startsWith("http")) return false;
  return true;
}

function addAreaPrefix(currentPath: string, areaPrefix: string): string {
  if (!shouldAddPrefix(currentPath, areaPrefix)) {
    return currentPath;
  }
  return areaPrefix + currentPath.replace(/^\//, "");
}

function getMimeType(filePath: string): string {
  return lookup(filePath) || "application/octet-stream";
}

async function migrateToS3() {
  const { isDryRun, isRollback, typeFilter } = parseArgs();

  logger.log("=".repeat(60));
  if (isDryRun) {
    logger.log("DRY RUN MODE - No actual changes will be made");
  }
  if (isRollback) {
    logger.log("ROLLBACK MODE - Downloading files from S3 to local");
  }
  if (typeFilter) {
    logger.log(`TYPE FILTER: Only processing '${typeFilter}'`);
  }
  logger.log("=".repeat(60));

  logger.log("Starting S3 Migration...");

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  const configService = app.get(ConfigService);
  const dataSource = app.get(DataSource);

  const uploadDir = configService.get<string>("UPLOAD_DIR") || "./uploads";
  const awsRegion = configService.get<string>("AWS_REGION");
  const awsBucket = configService.get<string>("AWS_S3_BUCKET");
  const awsAccessKeyId = configService.get<string>("AWS_ACCESS_KEY_ID");
  const awsSecretAccessKey = configService.get<string>("AWS_SECRET_ACCESS_KEY");

  if (!awsRegion || !awsBucket || !awsAccessKeyId || !awsSecretAccessKey) {
    logger.error("Missing AWS configuration. Required environment variables:");
    logger.error("  - AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY");
    await app.close();
    process.exit(1);
  }

  const absoluteUploadDir = path.resolve(uploadDir);
  logger.log(`Local directory: ${absoluteUploadDir}`);
  logger.log(`S3 bucket: ${awsBucket}`);
  logger.log(`AWS Region: ${awsRegion}`);
  logger.log("");

  const s3Client = new S3Client({
    region: awsRegion,
    credentials: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
    },
  });

  const filteredTypes = typeFilter
    ? DOCUMENT_TYPES.filter(
        (dt) =>
          dt.name.toLowerCase().includes(typeFilter.toLowerCase()) ||
          dt.areaPrefix.includes(typeFilter.toLowerCase()),
      )
    : DOCUMENT_TYPES;

  const results: MigrationResult[] = [];

  for (const docType of filteredTypes) {
    logger.log(`\nProcessing ${docType.name}...`);
    logger.log("-".repeat(50));

    const result: MigrationResult = {
      type: docType.name,
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
          WHERE table_name = '${docType.tableName}'
        );
      `);

      if (!tableExists[0].exists) {
        logger.log(`  Table ${docType.tableName} does not exist. Skipping...`);
        results.push(result);
        continue;
      }

      const additionalCols = docType.additionalColumns
        ? `, ${docType.additionalColumns.join(", ")}`
        : "";

      const records = await dataSource.query(`
        SELECT id, ${docType.pathColumn} as file_path ${additionalCols}
        FROM ${docType.tableName}
        WHERE ${docType.pathColumn} IS NOT NULL
        ORDER BY id
      `);

      result.total = records.length;
      logger.log(`  Found ${records.length} records`);

      for (const record of records) {
        try {
          const currentPath = record.file_path;
          if (!currentPath) {
            result.skipped++;
            continue;
          }

          if (isRollback) {
            await rollbackFile(
              s3Client,
              awsBucket,
              currentPath,
              absoluteUploadDir,
              isDryRun,
              result,
            );
          } else {
            await migrateFile(
              s3Client,
              awsBucket,
              currentPath,
              absoluteUploadDir,
              docType,
              record.id,
              dataSource,
              isDryRun,
              result,
            );
          }

          if (docType.additionalColumns) {
            for (const col of docType.additionalColumns) {
              if (col === "storage_bucket") continue;
              const additionalPath = record[col];
              if (additionalPath) {
                if (isRollback) {
                  await rollbackFile(
                    s3Client,
                    awsBucket,
                    additionalPath,
                    absoluteUploadDir,
                    isDryRun,
                    result,
                  );
                } else {
                  await migrateAdditionalColumn(
                    s3Client,
                    awsBucket,
                    additionalPath,
                    absoluteUploadDir,
                    docType,
                    record.id,
                    col,
                    dataSource,
                    isDryRun,
                    result,
                  );
                }
              }
            }
          }
        } catch (error: unknown) {
          const err = error as { message?: string };
          const errorMsg = `Record ${record.id}: ${err.message || "Unknown error"}`;
          logger.error(`  [ERROR] ${errorMsg}`);
          result.errors.push(errorMsg);
          result.failed++;
        }
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      logger.error(`  Error processing ${docType.name}: ${err.message || "Unknown error"}`);
      result.errors.push(err.message || "Unknown error");
    }

    results.push(result);
  }

  printSummary(results, isDryRun, isRollback);

  await app.close();
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  process.exit(totalFailed > 0 ? 1 : 0);
}

async function migrateFile(
  s3Client: S3Client,
  bucket: string,
  currentPath: string,
  uploadDir: string,
  docType: DocumentTypeConfig,
  recordId: number,
  dataSource: DataSource,
  isDryRun: boolean,
  result: MigrationResult,
): Promise<void> {
  const localPath = path.join(uploadDir, currentPath);
  const newS3Path = addAreaPrefix(currentPath, docType.areaPrefix);
  const s3Key = newS3Path.replace(/\\/g, "/").replace(/^\//, "");

  if (!shouldAddPrefix(currentPath, docType.areaPrefix) && !fs.existsSync(localPath)) {
    logger.log(`  [SKIP] Already in S3 format: ${currentPath}`);
    result.skipped++;
    return;
  }

  if (!fs.existsSync(localPath)) {
    logger.log(`  [SKIP] Local file not found: ${currentPath}`);
    result.skipped++;
    return;
  }

  if (!isDryRun) {
    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: s3Key }));
      logger.log(`  [SKIP] Already in S3: ${s3Key}`);
      result.skipped++;
      return;
    } catch (error: unknown) {
      const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (err.name !== "NotFound" && err.$metadata?.httpStatusCode !== 404) {
        throw error;
      }
    }

    const fileBuffer = fs.readFileSync(localPath);
    const mimeType = getMimeType(localPath);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: mimeType,
        Metadata: {
          originalPath: currentPath,
          migratedAt: new Date().toISOString(),
        },
      }),
    );

    if (newS3Path !== currentPath) {
      await dataSource.query(
        `UPDATE ${docType.tableName} SET ${docType.pathColumn} = $1 WHERE id = $2`,
        [newS3Path, recordId],
      );
    }

    logger.log(`  [OK] ${currentPath} -> ${s3Key}`);
  } else {
    logger.log(`  [DRY-RUN] Would migrate: ${currentPath} -> s3://${bucket}/${s3Key}`);
  }

  result.migrated++;
}

async function migrateAdditionalColumn(
  s3Client: S3Client,
  bucket: string,
  currentPath: string,
  uploadDir: string,
  docType: DocumentTypeConfig,
  recordId: number,
  columnName: string,
  dataSource: DataSource,
  isDryRun: boolean,
  result: MigrationResult,
): Promise<void> {
  const localPath = path.join(uploadDir, currentPath);
  const newS3Path = addAreaPrefix(currentPath, docType.areaPrefix);
  const s3Key = newS3Path.replace(/\\/g, "/").replace(/^\//, "");

  if (!fs.existsSync(localPath)) {
    return;
  }

  if (!isDryRun) {
    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: s3Key }));
      return;
    } catch (error: unknown) {
      const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (err.name !== "NotFound" && err.$metadata?.httpStatusCode !== 404) {
        throw error;
      }
    }

    const fileBuffer = fs.readFileSync(localPath);
    const mimeType = getMimeType(localPath);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: mimeType,
      }),
    );

    if (newS3Path !== currentPath) {
      await dataSource.query(
        `UPDATE ${docType.tableName} SET ${columnName} = $1 WHERE id = $2`,
        [newS3Path, recordId],
      );
    }

    logger.log(`  [OK] (${columnName}) ${currentPath} -> ${s3Key}`);
  }
}

async function rollbackFile(
  s3Client: S3Client,
  bucket: string,
  s3Path: string,
  uploadDir: string,
  isDryRun: boolean,
  result: MigrationResult,
): Promise<void> {
  const s3Key = s3Path.replace(/\\/g, "/").replace(/^\//, "");
  const localPath = path.join(uploadDir, s3Path);

  if (fs.existsSync(localPath)) {
    logger.log(`  [SKIP] Local file already exists: ${localPath}`);
    result.skipped++;
    return;
  }

  if (!isDryRun) {
    try {
      const response = await s3Client.send(
        new GetObjectCommand({ Bucket: bucket, Key: s3Key }),
      );

      const chunks: Uint8Array[] = [];
      const stream = response.Body as NodeJS.ReadableStream;
      for await (const chunk of stream) {
        chunks.push(chunk as Uint8Array);
      }
      const fileBuffer = Buffer.concat(chunks);

      const localDir = path.dirname(localPath);
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }

      fs.writeFileSync(localPath, fileBuffer);
      logger.log(`  [OK] Downloaded: ${s3Key} -> ${localPath}`);
      result.migrated++;
    } catch (error: unknown) {
      const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
        logger.log(`  [SKIP] Not in S3: ${s3Key}`);
        result.skipped++;
      } else {
        throw error;
      }
    }
  } else {
    logger.log(`  [DRY-RUN] Would download: s3://${bucket}/${s3Key} -> ${localPath}`);
    result.migrated++;
  }
}

function printSummary(
  results: MigrationResult[],
  isDryRun: boolean,
  isRollback: boolean,
): void {
  logger.log(`\n${"=".repeat(60)}`);
  logger.log(isRollback ? "ROLLBACK SUMMARY" : "MIGRATION SUMMARY");
  logger.log("=".repeat(60));

  let totalRecords = 0;
  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const result of results) {
    logger.log(`\n${result.type}:`);
    logger.log(`  Total:    ${result.total}`);
    logger.log(`  ${isRollback ? "Downloaded" : "Migrated"}: ${result.migrated}`);
    logger.log(`  Skipped:  ${result.skipped}`);
    logger.log(`  Failed:   ${result.failed}`);

    if (result.errors.length > 0) {
      logger.log("  Errors:");
      result.errors.slice(0, 5).forEach((e) => logger.log(`    - ${e}`));
      if (result.errors.length > 5) {
        logger.log(`    ... and ${result.errors.length - 5} more`);
      }
    }

    totalRecords += result.total;
    totalMigrated += result.migrated;
    totalSkipped += result.skipped;
    totalFailed += result.failed;
  }

  logger.log(`\n${"-".repeat(60)}`);
  logger.log("TOTALS:");
  logger.log(`  Total Records:  ${totalRecords}`);
  logger.log(`  ${isRollback ? "Downloaded" : "Migrated"}:       ${totalMigrated}`);
  logger.log(`  Skipped:        ${totalSkipped}`);
  logger.log(`  Failed:         ${totalFailed}`);
  logger.log("=".repeat(60));

  if (isDryRun) {
    logger.log("\nThis was a DRY RUN. No changes were made.");
    logger.log("Run without --dry-run to apply changes.");
  } else if (!isRollback && totalMigrated > 0) {
    logger.log("\nMigration complete! Next steps:");
    logger.log("  1. Verify files are accessible in S3");
    logger.log("  2. Update STORAGE_TYPE=s3 in .env");
    logger.log("  3. Restart your application");
    logger.log("  4. Test upload/download functionality");
    logger.log("  5. Once verified, remove local files");
  }
}

migrateToS3().catch((error) => {
  logger.error(`Migration failed: ${error.message}`);
  process.exit(1);
});
