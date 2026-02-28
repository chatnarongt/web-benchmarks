import { t } from 'elysia';

export const deleteOneParams = t.Object({
  id: t.Number({ description: 'The ID of the temp record to delete' }),
});

export type DeleteOneParams = typeof deleteOneParams.static;
