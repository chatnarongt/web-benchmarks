import { worldAnnotated } from '@models/world-annotated.model';
import { t } from 'elysia';

export const readManyQuery = t.Object({
  limit: t.Optional(
    t.Number({
      description: 'The maximum number of worlds to retrieve',
      minimum: 1,
      maximum: 20,
      default: 20,
    }),
  ),
  offset: t.Optional(
    t.Number({
      description: 'The number of worlds to skip',
      minimum: 0,
      maximum: 9980,
      default: 0,
    }),
  ),
});

export type ReadManyQuery = typeof readManyQuery.static;

export const readManyResponse = t.Array(worldAnnotated);

export type ReadManyResponse = typeof readManyResponse.static;
