/**
 * Audit Script: Find AU Rubber DB rows whose S3 file is missing
 *
 * Sweeps every AU Rubber table that stores a document path (tax invoices,
 * supplier delivery notes, supplier CoCs, statement reconciliations) and
 * HeadObject's each path against S3. Anything that comes back as missing is
 * written to a CSV report (and printed to stdout) so we can decide whether
 * to re-upload the original file or clear the path on the DB row.
 *
 * Connects to Postgres + S3 directly (no Nest AppModule) so it stays runnable
 * even when an unrelated module in the app graph is broken.
 *
 * Usage:
 *   pnpm audit:rubber-missing-files
 *
 * Output:
 *   - Per-table summary printed to stdout
 *   - Detailed CSV at scripts-output/audit-rubber-missing-files-<ts>.csv
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";

loadEnv();

interface MissingRow {
  tableName: string;
  column: string;
  id: number;
  path: string;
  companyName: string | null;
  identifier: string | null;
  extraStatus: string | null;
}

interface TableSpec {
  tableName: string;
  column: string;
  // Identity hint columns to surface in the report so we don't need to
  // round-trip back through psql for each row.
  hintCols: [string, string?, string?];
  // Optional join + extra hint (e.g. company name) — keeps the SELECT
  // template simple without dragging the whole entity in.
  join?: { sql: string; hintCol: string };
}

const TABLES: TableSpec[] = [
  {
    tableName: "rubber_tax_invoices",
    column: "document_path",
    hintCols: ["invoice_number", "invoice_type", "status"],
    join: {
      sql: "LEFT JOIN rubber_company c ON c.id = t.company_id",
      hintCol: "c.name",
    },
  },
  {
    tableName: "rubber_delivery_notes",
    column: "document_path",
    hintCols: ["delivery_note_number", "version_status", "status"],
    join: {
      sql: "LEFT JOIN rubber_company c ON c.id = t.supplier_company_id",
      hintCol: "c.name",
    },
  },
  {
    tableName: "rubber_supplier_cocs",
    column: "document_path",
    hintCols: ["coc_number", "version_status", "processing_status"],
    join: {
      sql: "LEFT JOIN rubber_company c ON c.id = t.supplier_company_id",
      hintCol: "c.name",
    },
  },
  {
    tableName: "rubber_supplier_cocs",
    column: "graph_pdf_path",
    hintCols: ["coc_number", "version_status", "processing_status"],
    join: {
      sql: "LEFT JOIN rubber_company c ON c.id = t.supplier_company_id",
      hintCol: "c.name",
    },
  },
  {
    tableName: "rubber_statement_reconciliations",
    column: "statement_path",
    hintCols: ["original_filename", "status"],
    join: {
      sql: "LEFT JOIN rubber_company c ON c.id = t.company_id",
      hintCol: "c.name",
    },
  },
];

async function headExists(s3Client: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error: unknown) {
    const rawError = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    const status = rawError.$metadata ? rawError.$metadata.httpStatusCode : undefined;
    if (rawError.name === "NotFound" || status === 404) {
      return false;
    }
    if (rawError.name === "Forbidden" || status === 403) {
      // Treat as present-but-permission-blocked so we don't misreport these
      // as "gone" when they're actually just hidden behind IAM.
      throw new Error(`Forbidden (403) for ${key} — IAM cannot HeadObject`);
    }
    throw error;
  }
}

function buildSelect(spec: TableSpec): string {
  const joinedHintSelect = spec.join ? `, ${spec.join.hintCol} AS hint_extra` : "";
  const joinSql = spec.join ? spec.join.sql : "";
  const hintSelects = spec.hintCols
    .filter((col): col is string => typeof col === "string")
    .map((col, idx) => `t.${col} AS hint_${idx + 1}`)
    .join(", ");
  return `
    SELECT t.id AS id, t.${spec.column} AS path, ${hintSelects}${joinedHintSelect}
    FROM ${spec.tableName} t
    ${joinSql}
    WHERE t.${spec.column} IS NOT NULL AND t.${spec.column} <> ''
    ORDER BY t.id
  `;
}

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function logLine(line: string): void {
  process.stdout.write(`${line}\n`);
}

async function main(): Promise<void> {
  logLine("Starting AU Rubber missing-file audit...");

  const awsRegion = process.env.AWS_REGION;
  const awsBucket = process.env.AWS_S3_BUCKET;
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!awsRegion || !awsBucket || !awsAccessKeyId || !awsSecretAccessKey) {
    logLine(
      "AWS env vars not set (AWS_REGION / AWS_S3_BUCKET / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)",
    );
    process.exit(1);
  }

  const dbHost = process.env.DATABASE_HOST;
  const dbPort = process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 5432;
  const dbUser = process.env.DATABASE_USERNAME;
  const dbPass = process.env.DATABASE_PASSWORD;
  const dbName = process.env.DATABASE_NAME;
  const dbSsl = process.env.DATABASE_SSL === "true";
  if (!dbHost || !dbUser || !dbPass || !dbName) {
    logLine(
      "DB env vars not set (DATABASE_HOST / DATABASE_USERNAME / DATABASE_PASSWORD / DATABASE_NAME)",
    );
    process.exit(1);
  }

  logLine(`S3 bucket: ${awsBucket} (${awsRegion})`);
  logLine(`DB: ${dbName} @ ${dbHost}`);

  const pgClient = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPass,
    database: dbName,
    ssl: dbSsl ? { rejectUnauthorized: false } : false,
  });
  await pgClient.connect();

  const s3Client = new S3Client({
    region: awsRegion,
    credentials: { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey },
  });

  const allMissing: MissingRow[] = [];
  const summaryLines: string[] = [];

  for (const spec of TABLES) {
    logLine(`\nScanning ${spec.tableName}.${spec.column}...`);
    const result = await pgClient.query<{
      id: number;
      path: string;
      hint_1: string | null;
      hint_2: string | null;
      hint_3: string | null;
      hint_extra: string | null;
    }>(buildSelect(spec));
    const rows = result.rows;
    logLine(`  ${rows.length} rows have a stored path`);

    let missing = 0;
    let present = 0;
    let forbidden = 0;
    let checked = 0;
    for (const row of rows) {
      try {
        const exists = await headExists(s3Client, awsBucket, row.path);
        if (exists) {
          present++;
        } else {
          missing++;
          const extraStatusParts: string[] = [];
          if (row.hint_2) extraStatusParts.push(String(row.hint_2));
          if (row.hint_3) extraStatusParts.push(String(row.hint_3));
          allMissing.push({
            tableName: spec.tableName,
            column: spec.column,
            id: row.id,
            path: row.path,
            companyName: row.hint_extra,
            identifier: row.hint_1,
            extraStatus: extraStatusParts.length > 0 ? extraStatusParts.join(" / ") : null,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("Forbidden")) {
          forbidden++;
        } else {
          logLine(`  HEAD failed for ${row.path}: ${message}`);
        }
      }
      checked++;
      if (checked % 50 === 0) {
        logLine(`  …${checked}/${rows.length} (missing so far: ${missing})`);
      }
    }

    const summary = `${spec.tableName}.${spec.column}: ${rows.length} total, ${present} present, ${missing} MISSING, ${forbidden} forbidden`;
    summaryLines.push(summary);
    logLine(`  ${summary}`);
  }

  await pgClient.end();

  const outDir = join(process.cwd(), "scripts-output");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `audit-rubber-missing-files-${stamp}.csv`);
  const header = "table,column,id,company,identifier,extra_status,path\n";
  const body = allMissing
    .map((row) =>
      [
        csvEscape(row.tableName),
        csvEscape(row.column),
        csvEscape(row.id),
        csvEscape(row.companyName),
        csvEscape(row.identifier),
        csvEscape(row.extraStatus),
        csvEscape(row.path),
      ].join(","),
    )
    .join("\n");
  writeFileSync(outPath, header + body + (body.length > 0 ? "\n" : ""), "utf8");

  logLine(`\n${"=".repeat(60)}`);
  logLine("Summary");
  logLine("=".repeat(60));
  for (const line of summaryLines) {
    logLine(`  ${line}`);
  }
  logLine(`\nTotal missing: ${allMissing.length}`);
  logLine(`Detailed CSV written to: ${outPath}`);
}

void main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack || err.message : String(err)}\n`);
  process.exit(1);
});
