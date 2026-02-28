import { t } from 'elysia';

export const updateManyBody = t.Object({
  items: t.Array(
    t.Object({
      id: t.Number({ description: 'The ID of the world record to update' }),
      randomNumber: t.Number({
        description: 'The new random number value',
        minimum: 1,
        maximum: 10000,
      }),
    }),
    { description: 'An array of records to update', minItems: 1, maxItems: 100 },
  ),
});

export type UpdateManyBody = typeof updateManyBody.static;
