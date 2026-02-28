import { t } from 'elysia';

export const worldAnnotated = t.Object({
  id: t.Number({ description: 'The unique identifier for the world' }),
  randomNumber: t.Number({ description: 'A random number associated with the world' }),
});

export type WorldAnnotated = typeof worldAnnotated.static;
