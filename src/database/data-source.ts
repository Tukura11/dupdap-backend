/**
 * TypeORM CLI data-source.
 *
 * Runs OUTSIDE the NestJS DI context (migration:generate, migration:run, etc.).
 * dotenv is loaded here explicitly; process.env access is intentionally
 * isolated to this file only — never spread into application code.
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASS,
  DB_NAME,
} = process.env as Record<string, string>;

if (!DB_HOST || !DB_USER || !DB_PASS || !DB_NAME) {
  throw new Error(
    'Missing required database env vars: DB_HOST, DB_USER, DB_PASS, DB_NAME',
  );
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: DB_HOST,
  port: parseInt(DB_PORT ?? '5432', 10),
  username: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
