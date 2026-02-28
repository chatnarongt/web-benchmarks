import { env } from '@constants/env';
import { openapi } from '@elysiajs/openapi';
import { benchmarkController } from '@modules/benchmark/benchmark.controller';
import { Elysia } from 'elysia';

const { APP_PORT, DOCS_ENABLED, DOCS_PATH } = env;

const app = new Elysia()
  .use(
    openapi({
      enabled: DOCS_ENABLED,
      path: DOCS_PATH,
      documentation: {
        info: {
          title: 'Web Benchmarks API',
          version: '1.0.0',
          description: 'API for benchmarking various web server performance metrics.',
        },
      },
      provider: 'scalar',
    }),
  )
  .use(benchmarkController)
  .listen(APP_PORT, ({ hostname, port }) => {
    console.info(`Server is running on http://${hostname}:${port}`);
  });

export type ElysiaApp = typeof app;
