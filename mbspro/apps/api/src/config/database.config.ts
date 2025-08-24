import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'mbspro',
  password: process.env.DB_PASSWORD || 'mbspro',
  database: process.env.DB_DATABASE || 'mbspro',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true, // Set to false in production
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};
