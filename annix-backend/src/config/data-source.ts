import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

dotenvConfig({ path: '.env' });

const srcDirectory = path.resolve(process.cwd(), 'src');

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [path.join(srcDirectory, '**/*.entity{.ts,.js}')],
  migrations: [path.join(srcDirectory, 'migrations/*{.ts,.js}')],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  extra: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
});
