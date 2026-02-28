import { world } from '@models/world.model';
import { t } from 'elysia';

export const createManyBody = t.Object({
  items: t.Array(
    t.Object({
      randomNumber: t.Number({
        description: 'A random number to store in the database',
        minimum: 1,
        maximum: 10000,
      }),
    }),
    { description: 'An array of items to create in the database', minItems: 1, maxItems: 100 },
  ),
});

export type CreateManyBody = typeof createManyBody.static;

export const createManyResponse = t.Array(world);

export type CreateManyResponse = typeof createManyResponse.static;
