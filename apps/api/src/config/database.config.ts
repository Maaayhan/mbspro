import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const isProd = process.env.NODE_ENV === 'production';

// Supabase specific SSL configuration
const sslMode = (process.env.PGSSLMODE || 'require').toLowerCase();
const sslEnabled = sslMode === 'require' || sslMode === 'verify-full';

// Validate required environment variables
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Supabase optimized configuration
export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: databaseUrl,
  autoLoadEntities: true,
  // Disable synchronize in production, enable in development for convenience
  synchronize: !isProd,
  // Enable detailed logging in development
  logging: !isProd ? ['error', 'warn', 'info', 'log'] : ['error'],
  // Supabase specific connection configuration
  ssl: sslEnabled,
  // Make connection more robust for Supabase
  retryAttempts: 3,
  retryDelay: 1000,
  extra: {
    // Supabase SSL configuration - most permissive for compatibility
    ssl: sslEnabled ? {
      rejectUnauthorized: false, // Accept all certificates
      ca: undefined,
      checkServerIdentity: false,
      // Alternative SSL configuration
      secureProtocol: 'TLSv1_2_method',
      ciphers: 'HIGH:!aNULL:!MD5:!SSLv3:!TLSv1',
      // Additional options for Supabase compatibility
      servername: undefined,
    } : false,
    // Connection pool settings optimized for Supabase
    max: 10, // Reduced for development
    min: 1,  // Minimum connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000, // Reduced timeout
    acquireTimeoutMillis: 30000,
    // Additional connection options
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
  },
  // Entity scanning configuration
  entities: ['dist/**/*.entity{.ts,.js}'],
  // Migration configuration (when ready for production)
  migrations: ['dist/migrations/*{.ts,.js}'],
  migrationsRun: false, // Set to true to run migrations automatically
};
