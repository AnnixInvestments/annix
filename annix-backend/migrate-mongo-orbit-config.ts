import type { mongo } from "mongoose";

interface MigrateMongoConfig {
  mongodb: {
    url: string;
    databaseName: string;
    options: mongo.MongoClientOptions;
  };
  migrationsDir: string;
  changelogCollectionName: string;
  lockCollectionName: string;
  lockTtl: number;
  migrationFileExtension: string;
  useFileHash: boolean;
  moduleSystem: "commonjs" | "esm";
}

function hostOf(uri: string): string {
  const withoutScheme = uri.replace(/^mongodb(\+srv)?:\/\//i, "");
  const withoutCredentials = withoutScheme.includes("@")
    ? withoutScheme.slice(withoutScheme.indexOf("@") + 1)
    : withoutScheme;
  return withoutCredentials.split(/[/?]/)[0];
}

function resolveOrbitTarget(): { url: string; databaseName: string } {
  const isProduction = process.env.NODE_ENV === "production";
  const explicitUri = process.env.ORBIT_MONGODB_URI;
  const explicitDbName = process.env.ORBIT_MONGO_DATABASE;
  if (isProduction && (!explicitUri || !explicitDbName)) {
    throw new Error(
      "ORBIT_MONGODB_URI and ORBIT_MONGO_DATABASE are required to run Orbit migrations in production — refusing to silently fall back to the core cluster, which would run Orbit migrations against the core production database",
    );
  }
  const url = explicitUri ?? process.env.MONGODB_URI ?? "";
  const databaseName = explicitDbName ?? process.env.MONGO_DATABASE ?? "";
  if (!url || !databaseName) {
    throw new Error("ORBIT_MONGODB_URI / ORBIT_MONGO_DATABASE is required to run Orbit migrations");
  }
  const coreUri = process.env.MONGODB_URI;
  const sharesCoreCluster = coreUri != null && coreUri !== "" && hostOf(url) === hostOf(coreUri);
  if (sharesCoreCluster && isProduction) {
    throw new Error(
      `ORBIT_MONGODB_URI resolves to the same cluster host (${hostOf(url)}) as the core database — refusing to run Orbit migrations against the core production cluster`,
    );
  }
  return { url, databaseName };
}

const orbitTarget = resolveOrbitTarget();

const config: MigrateMongoConfig = {
  mongodb: {
    url: orbitTarget.url,
    databaseName: orbitTarget.databaseName,
    options: {},
  },
  migrationsDir: "migrations-mongo-orbit",
  changelogCollectionName: "_migrations",
  lockCollectionName: "_migrations_lock",
  lockTtl: 0,
  migrationFileExtension: ".ts",
  useFileHash: false,
  moduleSystem: "commonjs",
};

export = config;
