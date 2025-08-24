import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const isProd = process.env.NODE_ENV === 'production';
const sslMode = (process.env.PGSSLMODE || 'require').toLowerCase();

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: databaseUrl,
  autoLoadEntities: true,
  synchronize: true, // Set to false in production
  logging: process.env.NODE_ENV === 'development',
  ssl: sslMode === 'require' || sslMode === 'verify-full' ? { rejectUnauthorized: false } : false,
};
