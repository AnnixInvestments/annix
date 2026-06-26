import * as path from "node:path";
import { Logger } from "@nestjs/common";

interface MigrateMongoConfigApi {
  set: (config: unknown) => void;
}

interface MigrateMongoDatabaseApi {
  connect: () => Promise<{ db: unknown; client: { close: () => Promise<void> } }>;
}

type MigrateMongoUp = (db: unknown, client: unknown) => Promise<string[]>;

// Auto-migration is a developer convenience and must never touch a shared
// environment. This name list is a backstop behind the explicit opt-in gate in
// runMongoMigrationsOnBoot (ALLOW_BOOT_MIGRATIONS / NODE_ENV=development): even
// when boot migrations are enabled, these databases migrate only through the
// deploy release command, even if a local .env happens to point at them.
const CORE_PROTECTED_DATABASES = new Set(["annix_production", "annix_staging"]);
const ORBIT_PROTECTED_DATABASES = new Set(["orbit_production", "orbit_staging"]);

interface ClusterMigrationTarget {
  label: string;
  configFileName: string;
  targetDatabase: string;
  protectedDatabases: Set<string>;
}

async function applyMigrationsForCluster(
  logger: Logger,
  migrateMongo: Record<string, Promise<unknown>>,
  target: ClusterMigrationTarget,
): Promise<void> {
  if (target.protectedDatabases.has(target.targetDatabase)) {
    logger.warn(
      `Skipping ${target.label} auto-migration — refusing to migrate protected database ` +
        `"${target.targetDatabase}". Point your local .env at a dev database; ` +
        "production/staging migrate via deploy only.",
    );
    return;
  }

  let client: { close: () => Promise<void> } | null = null;
  try {
    const config = (await migrateMongo.config) as MigrateMongoConfigApi;
    const database = (await migrateMongo.database) as MigrateMongoDatabaseApi;
    const up = (await migrateMongo.up) as MigrateMongoUp;

    const configPath = path.resolve(process.cwd(), target.configFileName);
    const loadedConfig = require(configPath) as { migrationsDir: string } & Record<string, unknown>;
    config.set({
      ...loadedConfig,
      migrationsDir: path.resolve(process.cwd(), loadedConfig.migrationsDir),
    });

    const connection = await database.connect();
    client = connection.client;
    const migrated = await up(connection.db, connection.client);
    if (migrated.length > 0) {
      logger.log(
        `[${target.label}] Applied ${migrated.length} migration(s): ${migrated.join(", ")}`,
      );
    } else {
      logger.log(`[${target.label}] Mongo schema up to date — no migrations to apply`);
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.warn(`[${target.label}] Auto-migration failed (dev boot continues): ${reason}`);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * Applies pending migrate-mongo migrations on local/dev boot so the local
 * databases stay in step with production without a manual `pnpm migrate:up`.
 * Covers BOTH clusters — the core ERP cluster (migrate-mongo-config.ts) and the
 * dedicated Annix Orbit cluster (migrate-mongo-orbit-config.ts) — each against
 * its own connection, so Orbit seed data (dismiss reasons, tier capabilities,
 * etc.) lands locally just like it does on deploy.
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

  const bootMigrationsAllowed =
    process.env.ALLOW_BOOT_MIGRATIONS === "true" || process.env.NODE_ENV === "development";
  if (!bootMigrationsAllowed) {
    logger.warn(
      "Skipping auto-migration — boot migrations are opt-in. Set NODE_ENV=development or " +
        "ALLOW_BOOT_MIGRATIONS=true on a dev machine, or run `pnpm migrate:up` manually. " +
        "Shared environments migrate via the deploy release command only.",
    );
    return;
  }
  if (!process.env.MONGODB_URI && !process.env.ORBIT_MONGODB_URI) {
    logger.warn("Skipping auto-migration — neither MONGODB_URI nor ORBIT_MONGODB_URI is set");
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

  if (process.env.MONGODB_URI) {
    await applyMigrationsForCluster(logger, migrateMongo, {
      label: "core",
      configFileName: "migrate-mongo-config.ts",
      targetDatabase: process.env.MONGO_DATABASE ?? "",
      protectedDatabases: CORE_PROTECTED_DATABASES,
    });
  }

  if (process.env.ORBIT_MONGODB_URI) {
    await applyMigrationsForCluster(logger, migrateMongo, {
      label: "orbit",
      configFileName: "migrate-mongo-orbit-config.ts",
      targetDatabase: process.env.ORBIT_MONGO_DATABASE ?? "",
      protectedDatabases: ORBIT_PROTECTED_DATABASES,
    });
  }
}
