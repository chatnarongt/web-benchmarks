import { world } from '@models/world.model';
import { t } from 'elysia';

export const readOneQuery = t.Object({
  id: t.Number({ description: 'The ID of the world to retrieve', minimum: 1, maximum: 10000 }),
});

export type ReadOneQuery = typeof readOneQuery.static;

export const readOneResponse = world;

export type ReadOneResponse = typeof readOneResponse.static;
