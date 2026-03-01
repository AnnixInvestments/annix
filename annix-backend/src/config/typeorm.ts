import { registerAs } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { config as dotenvConfig } from "dotenv";
import { DataSource, DataSourceOptions } from "typeorm";

dotenvConfig({ path: ".env" });

const config: DataSourceOptions = {
  type: "postgres",
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
  synchronize: false,
  logging: process.env.NODE_ENV !== "production",
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: process.env.NODE_ENV === "production" }
      : false,
  extra: {
    max: 25,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    acquireTimeoutMillis: 30000,
  },
};

export default registerAs("typeorm", () => config as TypeOrmModuleOptions);
export const connectionSource = new DataSource(config);
