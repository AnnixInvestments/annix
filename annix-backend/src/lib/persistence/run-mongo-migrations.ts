import * as path from "node:path";
import { Logger } from "@nestjs/common";
import { isMongoDriver } from "./database-driver";

interface MigrateMongoConfigApi {
  set: (config: unknown) => void;
}

interface MigrateMongoDatabaseApi {
  connect: () => Promise<{ db: unknown; client: { close: () => Promise<void> } }>;
}

type MigrateMongoUp = (db: unknown, client: unknown) => Promise<string[]>;

// Auto-migration is a developer convenience and must never touch a shared
// environment. Migrations on these databases run only through the deploy
// release command, even if a local .env happens to point at them.
const PROTECTED_DATABASES = new Set(["annix_production", "annix_staging"]);

/**
 * Applies pending migrate-mongo migrations on local/dev boot so the local
 * database stays in step with production without a manual `pnpm migrate:up`.
 *
 * Runs in-process (not as a child) so it inherits the DNS override applied in
 * main.ts for mongodb+srv lookups, and the existing transpile-only ts-node hook
 * for the TypeScript migration files. Production applies migrations through the
 * Fly release command instead, so this is a no-op there. Any failure is logged
 * and swallowed so a developer machine still boots.
 */
export async function runMongoMigrationsOnBoot(): Promise<void> {
  const logger = new Logger("MongoMigrations");

  if (process.env.NODE_ENV === "production") {
    return;
  }
  if (!isMongoDriver()) {
    return;
  }
  if (!process.env.MONGODB_URI) {
    logger.warn("Skipping auto-migration — MONGODB_URI is not set");
    return;
  }

  const targetDatabase = process.env.MONGO_DATABASE ?? "";
  if (PROTECTED_DATABASES.has(targetDatabase)) {
    logger.warn(
      `Skipping auto-migration — refusing to migrate protected database "${targetDatabase}". ` +
        "Point your local .env at a dev database; production/staging migrate via deploy only.",
    );
    return;
  }

  // migrate-mongo v14 is ESM; its CommonJS wrapper exposes each export as a
  // proxied promise, so `await m.<name>` yields the real function/object.
  let migrateMongo: Record<string, Promise<unknown>>;
  try {
    require("ts-node").register({ transpileOnly: true });
    migrateMongo = require("migrate-mongo") as Record<string, Promise<unknown>>;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.warn(
      `Skipping auto-migration — migrate-mongo/ts-node not available (run pnpm install): ${reason}`,
    );
    return;
  }

  let client: { close: () => Promise<void> } | null = null;
  try {
    const config = (await migrateMongo.config) as MigrateMongoConfigApi;
    const database = (await migrateMongo.database) as MigrateMongoDatabaseApi;
    const up = (await migrateMongo.up) as MigrateMongoUp;

    const configPath = path.resolve(process.cwd(), "migrate-mongo-config.ts");
    const loadedConfig = require(configPath) as { migrationsDir: string } & Record<string, unknown>;
    config.set({
      ...loadedConfig,
      migrationsDir: path.resolve(process.cwd(), loadedConfig.migrationsDir),
    });

    const connection = await database.connect();
    client = connection.client;
    const migrated = await up(connection.db, connection.client);
    if (migrated.length > 0) {
      logger.log(`Applied ${migrated.length} Mongo migration(s): ${migrated.join(", ")}`);
    } else {
      logger.log("Mongo schema up to date — no migrations to apply");
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.warn(`Auto-migration failed (dev boot continues): ${reason}`);
  } finally {
    if (client) {
      await client.close();
    }
  }
}
