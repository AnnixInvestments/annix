import path from "node:path";
import { config as dotenvConfig } from "dotenv";
import { DataSource } from "typeorm";

dotenvConfig({ path: ".env" });

const srcDirectory = path.resolve(process.cwd(), "src");

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [path.join(srcDirectory, "**/*.entity{.ts,.js}")],
  migrations: [path.join(srcDirectory, "migrations/*{.ts,.js}")],
  synchronize: false,
  migrationsTransactionMode: "each",
  logging: process.env.TYPEORM_LOGGING === "true",
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  extra: {
    max: 5,
    min: 0,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
  },
});
