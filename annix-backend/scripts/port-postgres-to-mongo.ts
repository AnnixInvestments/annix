import { config as dotenvConfig } from "dotenv";
import mongoose from "mongoose";
import { Client, types } from "pg";
import type { EntityMetadata } from "typeorm";
import { AppDataSource } from "../src/config/data-source";

dotenvConfig({ path: ".env" });

types.setTypeParser(1700, (value) => (value === null ? null : Number.parseFloat(value)));

const SKIP_TABLES = new Set(["migrations", "typeorm_metadata"]);
const READ_BATCH = 500;

type ColumnPropertyMap = Map<string, string>;

function columnMapFor(metadata: EntityMetadata): ColumnPropertyMap {
  return metadata.columns.reduce((columns, column) => {
    columns.set(column.databaseName, column.propertyName);
    return columns;
  }, new Map<string, string>());
}

async function columnPropertyMaps(): Promise<Map<string, ColumnPropertyMap>> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource.entityMetadatas.reduce((maps, metadata) => {
    maps.set(metadata.tableName, columnMapFor(metadata));
    metadata.manyToManyRelations.forEach((relation) => {
      const junction = relation.junctionEntityMetadata;
      if (junction && !maps.has(junction.tableName)) {
        maps.set(junction.tableName, columnMapFor(junction));
      }
    });
    return maps;
  }, new Map<string, ColumnPropertyMap>());
}

interface TableReport {
  table: string;
  sourceRows: number;
  documentCount: number;
}

async function listTables(client: Client): Promise<string[]> {
  const result = await client.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
  );
  return result.rows.map((row) => row.table_name).filter((name) => !SKIP_TABLES.has(name));
}

function applyColumnMap(
  row: Record<string, unknown>,
  columnMap: ColumnPropertyMap | null,
): Record<string, unknown> {
  if (!columnMap) {
    return row;
  }
  return Object.entries(row).reduce<Record<string, unknown>>((mapped, [key, value]) => {
    const propertyName = columnMap.get(key) ?? key;
    mapped[propertyName] = value;
    return mapped;
  }, {});
}

function toDocument(
  row: Record<string, unknown>,
  columnMap: ColumnPropertyMap | null,
): Record<string, unknown> {
  const mapped = applyColumnMap(row, columnMap);
  if (mapped.id === undefined || mapped.id === null) {
    return mapped;
  }
  const { id, ...rest } = mapped;
  return { _id: id, ...rest };
}

async function portTable(
  client: Client,
  connection: mongoose.Connection,
  table: string,
  columnMap: ColumnPropertyMap | null,
): Promise<TableReport> {
  const collection = connection.collection(table);
  await collection.deleteMany({});

  const countResult = await client.query<{ count: string }>(`SELECT count(*) FROM "${table}"`);
  const sourceRows = Number.parseInt(countResult.rows[0].count, 10);

  let offset = 0;
  while (offset < sourceRows) {
    const batch = await client.query<Record<string, unknown>>(
      `SELECT * FROM "${table}" ORDER BY ctid LIMIT ${READ_BATCH} OFFSET ${offset}`,
    );
    if (batch.rows.length === 0) {
      break;
    }
    await collection.insertMany(
      batch.rows.map((row) => toDocument(row, columnMap)),
      { ordered: false },
    );
    offset += batch.rows.length;
  }

  const documentCount = await collection.countDocuments();
  return { table, sourceRows, documentCount };
}

function sourceClient(): Client {
  const url = process.env.PORT_SOURCE_DATABASE_URL;
  if (url) {
    return new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  }
  const host = process.env.DATABASE_HOST;
  if (!host) {
    console.error("Set PORT_SOURCE_DATABASE_URL, or DATABASE_* in annix-backend/.env");
    process.exit(1);
  }
  return new Client({
    host,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  });
}

async function main(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  const targetDatabase =
    process.env.PORT_TARGET_DATABASE ?? process.env.MONGO_DATABASE ?? "annix_staging";

  if (!mongoUri) {
    console.error("MONGODB_URI is not set in annix-backend/.env");
    process.exit(1);
  }

  const client = sourceClient();
  await client.connect();
  const connection = await mongoose
    .createConnection(mongoUri, { dbName: targetDatabase })
    .asPromise();

  const maps = await columnPropertyMaps();

  const reports: TableReport[] = [];
  try {
    const allTables = await listTables(client);
    const tables = allTables.filter((name) => maps.has(name));
    const skipped = allTables.filter((name) => !maps.has(name));
    console.log(
      `Found ${allTables.length} Postgres base tables; porting ${tables.length} entity-backed tables into "${targetDatabase}", skipping ${skipped.length} unmapped/legacy tables.`,
    );
    if (skipped.length > 0) {
      console.log(`Skipped (no entity metadata): ${skipped.join(", ")}`);
    }
    for (const table of tables) {
      const columnMap = maps.get(table) ?? null;
      const report = await portTable(client, connection, table, columnMap);
      const matched = report.sourceRows === report.documentCount;
      console.log(
        `  ${table}: ${report.documentCount}/${report.sourceRows} ${matched ? "ok" : "MISMATCH"}`,
      );
      reports.push(report);
    }
  } finally {
    await client.end();
    await connection.close();
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }

  const mismatches = reports.filter((report) => report.sourceRows !== report.documentCount);
  if (mismatches.length > 0) {
    console.error(
      `Port finished with ${mismatches.length} count mismatch(es) - see MISMATCH above.`,
    );
    process.exit(1);
  }
  console.log(`Port complete: ${reports.length} tables, every row count matched.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Port failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
