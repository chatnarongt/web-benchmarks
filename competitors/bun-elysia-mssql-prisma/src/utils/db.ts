import { env } from '@constants/env';
import { PrismaClient } from '@generated/prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';

const adapter = new PrismaMssql({
  server: env.DATABASE_HOST,
  port: 1433,
  user: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
  pool: {
    min: env.DATABASE_MIN_POOL_SIZE,
    max: env.DATABASE_MAX_POOL_SIZE,
    idleTimeoutMillis: env.DATABASE_IDLE_TIMEOUT,
  },
  options: {
    encrypt: env.DATABASE_ENCRYPT,
    trustServerCertificate: env.DATABASE_TRUST_SERVER_CERTIFICATE,
  },
});

export const db = new PrismaClient({ adapter });
