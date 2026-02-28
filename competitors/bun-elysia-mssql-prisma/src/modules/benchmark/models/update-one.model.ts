import { world } from '@models/world.model';
import { t } from 'elysia';

export const updateOneParams = t.Object({
  id: t.Number({ description: 'The ID of the world record to update' }),
});

export type UpdateOneParams = typeof updateOneParams.static;

export const updateOneBody = t.Object({
  randomNumber: t.Number({
    description: 'The new random number value',
    minimum: 1,
    maximum: 10000,
  }),
});

export type UpdateOneBody = typeof updateOneBody.static;

export const updateOneResponse = world;

export type UpdateOneResponse = typeof updateOneResponse.static;
