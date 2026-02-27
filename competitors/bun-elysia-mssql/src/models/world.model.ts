import { t } from 'elysia';

export const world = t.Object({
  id: t.Number({ description: 'The unique identifier for the world' }),
  randomNumber: t.Number({ description: 'A random number associated with the world' }),
});

export type World = typeof world.static;
