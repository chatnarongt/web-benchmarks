import { AssertError, Value } from '@sinclair/typebox/value';
import { t } from 'elysia';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

const envSchema = t.Object({
  APP_ENV: t.Enum(Environment),
  APP_PORT: t.Number(),
  DOCS_ENABLED: t.Optional(t.Boolean()),
  DOCS_PATH: t.Optional(t.String()),
  DATABASE_URL: t.String(),
  DATABASE_HOST: t.String(),
  DATABASE_NAME: t.String(),
  DATABASE_USER: t.String(),
  DATABASE_PASSWORD: t.String(),
  DATABASE_MIN_POOL_SIZE: t.Optional(t.Number({ default: 0 })),
  DATABASE_MAX_POOL_SIZE: t.Optional(t.Number({ default: 10 })),
  DATABASE_IDLE_TIMEOUT: t.Optional(t.Number({ default: 30000 })),
  DATABASE_ENCRYPT: t.Optional(t.Boolean({ default: false })),
  DATABASE_TRUST_SERVER_CERTIFICATE: t.Optional(t.Boolean({ default: false })),
});

export type AppEnv = typeof envSchema.static;

const getEnv = () => {
  try {
    return Value.Parse(envSchema, Bun.env);
  } catch (error) {
    if (error instanceof AssertError) {
      console.error('Environment variable validation failed:', error.error);
    } else if (error instanceof Error) {
      console.error('Failed to parse environment variables:', error.message);
    }
    process.exit(1);
  }
};

export const env = getEnv();
