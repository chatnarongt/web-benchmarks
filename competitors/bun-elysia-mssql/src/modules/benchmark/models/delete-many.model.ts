import { t } from 'elysia';

export const deleteManyBody = t.Object({
  ids: t.Array(t.Number({ description: 'A record ID to delete' }), {
    description: 'An array of IDs to delete from the Temp table',
    minItems: 1,
  }),
});

export type DeleteManyBody = typeof deleteManyBody.static;
