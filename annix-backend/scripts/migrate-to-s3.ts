/**
 * Migration Script: Local Storage to AWS S3
 *
 * This script migrates all files from local filesystem storage to AWS S3.
 * It processes the following document types:
 * - Drawings (from drawing_versions table)
 * - RFQ Documents (from rfq_documents table)
 * - Customer Documents (from customer_documents table)
 * - Supplier Documents (from supplier_documents table)
 *
 * Usage:
 *   pnpm migrate:s3 [--dry-run]
 *
 * Options:
 *   --dry-run    Preview changes without actually uploading to S3
 *
 * Prerequisites:
 * - AWS credentials must be configured in environment variables
 * - STORAGE_TYPE should still be 'local' before running this script
 * - Ensure a database backup has been taken before running
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";

// Import the app module - adjust path as needed
import { AppModule } from "../src/app.module";

interface MigrationResult {
  type: string;
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

interface FileRecord {
  id: number;
  filePath: string;
  tableName: string;
}

const logger = new Logger("S3Migration");

async function migrateToS3() {
  const isDryRun = process.argv.includes("--dry-run");

  if (isDryRun) {
    logger.log("=".repeat(60));
    logger.log("DRY RUN MODE - No actual changes will be made");
    logger.log("=".repeat(60));
  }

  logger.log("Starting S3 Migration...");
  logger.log("=".repeat(60));

  // Create NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  const configService = app.get(ConfigService);
  const dataSource = app.get(DataSource);

  // Validate configuration
  const uploadDir = configService.get<string>("UPLOAD_DIR") || "./uploads";
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

  // Verify upload directory exists
  const absoluteUploadDir = path.resolve(uploadDir);
  if (!fs.existsSync(absoluteUploadDir)) {
    logger.error(`Upload directory not found: ${absoluteUploadDir}`);
    await app.close();
    process.exit(1);
  }

  logger.log(`Source directory: ${absoluteUploadDir}`);
  logger.log(`Target S3 bucket: ${awsBucket}`);
  logger.log(`AWS Region: ${awsRegion}`);
  logger.log("");

  // Initialize S3 client
  const s3Client = new S3Client({
    region: awsRegion,
    credentials: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
    },
  });

  // Define document types to migrate
  const documentTypes = [
    {
      name: "Drawing Versions",
      tableName: "drawing_versions",
      pathColumn: "file_path",
    },
    {
      name: "RFQ Documents",
      tableName: "rfq_documents",
      pathColumn: "file_path",
    },
    {
      name: "Customer Documents",
      tableName: "customer_documents",
      pathColumn: "file_path",
    },
    {
      name: "Supplier Documents",
      tableName: "supplier_documents",
      pathColumn: "file_path",
    },
  ];

  const results: MigrationResult[] = [];

  for (const docType of documentTypes) {
    logger.log(`\nProcessing ${docType.name}...`);
    logger.log("-".repeat(40));

    const result: MigrationResult = {
      type: docType.name,
      total: 0,
      migrated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Check if table exists
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

      // Get all file records
      const records: FileRecord[] = await dataSource.query(`
        SELECT id, ${docType.pathColumn} as "filePath"
        FROM ${docType.tableName}
        WHERE ${docType.pathColumn} IS NOT NULL
        ORDER BY id
      `);

      result.total = records.length;
      logger.log(`  Found ${records.length} records to migrate`);

      for (const record of records) {
        try {
          const localPath = path.join(absoluteUploadDir, record.filePath);

          // Check if local file exists
          if (!fs.existsSync(localPath)) {
            logger.warn(`  [SKIP] File not found: ${record.filePath}`);
            result.skipped++;
            continue;
          }

          // Normalize S3 key (remove leading slashes, use forward slashes)
          const s3Key = record.filePath.replace(/\\/g, "/").replace(/^\//, "");

          if (!isDryRun) {
            // Check if already exists in S3
            try {
              await s3Client.send(
                new HeadObjectCommand({
                  Bucket: awsBucket,
                  Key: s3Key,
                }),
              );
              logger.log(`  [SKIP] Already in S3: ${s3Key}`);
              result.skipped++;
              continue;
            } catch (error: any) {
              // File doesn't exist in S3, proceed with upload
              if (error.name !== "NotFound" && error.$metadata?.httpStatusCode !== 404) {
                throw error;
              }
            }

            // Read file and upload to S3
            const fileBuffer = fs.readFileSync(localPath);
            const mimeType = getMimeType(localPath);

            await s3Client.send(
              new PutObjectCommand({
                Bucket: awsBucket,
                Key: s3Key,
                Body: fileBuffer,
                ContentType: mimeType,
                Metadata: {
                  originalPath: record.filePath,
                  migratedAt: new Date().toISOString(),
                },
              }),
            );

            logger.log(`  [OK] Migrated: ${s3Key}`);
          } else {
            logger.log(
              `  [DRY-RUN] Would migrate: ${record.filePath} -> s3://${awsBucket}/${s3Key}`,
            );
          }

          result.migrated++;
        } catch (error: any) {
          const errorMsg = `Failed to migrate record ${record.id}: ${error.message}`;
          logger.error(`  [ERROR] ${errorMsg}`);
          result.errors.push(errorMsg);
          result.failed++;
        }
      }
    } catch (error: any) {
      logger.error(`  Error processing ${docType.name}: ${error.message}`);
      result.errors.push(error.message);
    }

    results.push(result);
  }

  // Print summary
  logger.log(`\n${"=".repeat(60)}`);
  logger.log("MIGRATION SUMMARY");
  logger.log("=".repeat(60));

  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const result of results) {
    logger.log(`\n${result.type}:`);
    logger.log(`  Total: ${result.total}`);
    logger.log(`  Migrated: ${result.migrated}`);
    logger.log(`  Skipped: ${result.skipped}`);
    logger.log(`  Failed: ${result.failed}`);

    totalMigrated += result.migrated;
    totalSkipped += result.skipped;
    totalFailed += result.failed;

    if (result.errors.length > 0) {
      logger.log("  Errors:");
      result.errors.forEach((err) => logger.log(`    - ${err}`));
    }
  }

  logger.log(`\n${"-".repeat(40)}`);
  logger.log(`Total migrated: ${totalMigrated}`);
  logger.log(`Total skipped: ${totalSkipped}`);
  logger.log(`Total failed: ${totalFailed}`);
  logger.log("=".repeat(60));

  if (isDryRun) {
    logger.log("\nDRY RUN COMPLETE - No changes were made");
    logger.log("Run without --dry-run to perform actual migration");
  } else if (totalMigrated > 0) {
    logger.log("\nMigration complete!");
    logger.log("\nNext steps:");
    logger.log("  1. Verify files are accessible in S3");
    logger.log("  2. Update STORAGE_TYPE=s3 in your .env file");
    logger.log("  3. Restart your application");
    logger.log("  4. Test file upload/download functionality");
    logger.log("  5. Once verified, you can safely remove local files");
  }

  await app.close();
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".dwg": "application/acad",
    ".dxf": "application/dxf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

// Run the migration
migrateToS3()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Migration failed with error:", error);
    process.exit(1);
  });
