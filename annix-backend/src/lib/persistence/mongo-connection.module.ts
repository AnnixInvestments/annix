import { Logger, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ORBIT_CONNECTION } from "./mongo-connections";

const logger = new Logger("MongoConnection");

const sharedOptions = {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
  autoCreate: false,
  autoIndex: false,
};

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function hostOf(uri: string): string {
  const withoutScheme = uri.replace(/^mongodb(\+srv)?:\/\//i, "");
  const withoutCredentials = withoutScheme.includes("@")
    ? withoutScheme.slice(withoutScheme.indexOf("@") + 1)
    : withoutScheme;
  return withoutCredentials.split(/[/?]/)[0];
}

function coreConnectionOptions() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }
  const dbName = process.env.MONGO_DATABASE;
  if (!dbName) {
    throw new Error("MONGO_DATABASE is required");
  }
  logger.log(`Core cluster ${hostOf(uri)} / ${dbName}`);
  return { uri, dbName, ...sharedOptions };
}

function orbitConnectionOptions() {
  const explicitUri = process.env.ORBIT_MONGODB_URI;
  const explicitDbName = process.env.ORBIT_MONGO_DATABASE;
  if (isProduction() && (!explicitUri || !explicitDbName)) {
    throw new Error(
      "ORBIT_MONGODB_URI and ORBIT_MONGO_DATABASE are required in production — refusing to silently fall back to the core cluster",
    );
  }
  const uri = explicitUri ?? process.env.MONGODB_URI;
  const dbName = explicitDbName ?? process.env.MONGO_DATABASE;
  if (!uri || !dbName) {
    throw new Error("ORBIT_MONGODB_URI / ORBIT_MONGO_DATABASE is required");
  }
  const coreUri = process.env.MONGODB_URI;
  const sharesCoreCluster = coreUri != null && hostOf(uri) === hostOf(coreUri);
  if (sharesCoreCluster && isProduction()) {
    throw new Error(
      "ORBIT_MONGODB_URI resolves to the same cluster as the core database — refusing to colocate Orbit data on the core production cluster",
    );
  }
  if (sharesCoreCluster) {
    logger.warn(
      `Orbit connection shares the core cluster host (${hostOf(uri)}) — acceptable only in local development`,
    );
  }
  logger.log(`Orbit cluster ${hostOf(uri)} / ${dbName}`);
  return { uri, dbName, ...sharedOptions };
}

@Module({
  imports: [
    MongooseModule.forRootAsync({ useFactory: coreConnectionOptions }),
    MongooseModule.forRootAsync({
      connectionName: ORBIT_CONNECTION,
      useFactory: orbitConnectionOptions,
    }),
  ],
})
export class MongoConnectionModule {}
