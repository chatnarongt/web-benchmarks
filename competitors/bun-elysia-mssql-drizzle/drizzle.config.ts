import { defineConfig } from 'drizzle-kit';
import { env } from './src/constants/env';

export default defineConfig({
  dialect: 'mssql',
  dbCredentials: {
    server: env.DATABASE_HOST,
    port: 1433,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    options: {
      encrypt: env.DATABASE_ENCRYPT,
      trustServerCertificate: env.DATABASE_TRUST_SERVER_CERTIFICATE,
    },
  },
  out: './src/generated/drizzle',
});
