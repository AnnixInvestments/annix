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

const config: MigrateMongoConfig = {
  mongodb: {
    url: process.env.ORBIT_MONGODB_URI ?? process.env.MONGODB_URI ?? "",
    databaseName: process.env.ORBIT_MONGO_DATABASE ?? process.env.MONGO_DATABASE ?? "",
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
