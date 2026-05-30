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
    url: process.env.MONGODB_URI ?? "",
    databaseName: process.env.MONGO_DATABASE ?? "",
    options: {},
  },
  migrationsDir: "migrations-mongo",
  changelogCollectionName: "_migrations",
  lockCollectionName: "_migrations_lock",
  lockTtl: 0,
  migrationFileExtension: ".ts",
  useFileHash: false,
  moduleSystem: "commonjs",
};

export = config;
